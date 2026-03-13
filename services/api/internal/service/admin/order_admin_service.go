package admin

import (
	"context"
	"errors"
	"fmt"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

var (
	ErrOrderNotFound        = errors.New("订单不存在")
	ErrOrderStatusInvalid   = errors.New("订单状态无效")
	ErrOrderCannotShip      = errors.New("当前订单无法发货")
	ErrOrderCannotRefund    = errors.New("当前订单无法退款")
	ErrRefundAmountInvalid  = errors.New("退款金额无效")
)

// OrderAdminService 订单管理服务
type OrderAdminService struct {
	repo   *repository.OrderRepo
	db     *gorm.DB
	logger *zap.Logger
}

// NewOrderAdminService 创建订单管理服务
func NewOrderAdminService(repo *repository.OrderRepo, db *gorm.DB, logger *zap.Logger) *OrderAdminService {
	return &OrderAdminService{
		repo:   repo,
		db:     db,
		logger: logger,
	}
}

// OrderListResult 订单列表结果
type OrderListResult struct {
	Orders []model.Order `json:"orders"`
	Total  int64         `json:"total"`
	Page   int           `json:"page"`
}

// GetOrderList 获取订单列表
func (s *OrderAdminService) GetOrderList(ctx context.Context, filter repository.OrderListFilter) (*OrderListResult, error) {
	// 设置默认分页
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PageSize <= 0 || filter.PageSize > 100 {
		filter.PageSize = 20
	}

	orders, total, err := s.repo.ListForAdmin(ctx, filter)
	if err != nil {
		s.logger.Error("获取订单列表失败", zap.Error(err))
		return nil, err
	}

	return &OrderListResult{
		Orders: orders,
		Total:  total,
		Page:   filter.Page,
	}, nil
}

// GetOrderDetail 获取订单详情
func (s *OrderAdminService) GetOrderDetail(ctx context.Context, id uint64) (*model.Order, error) {
	order, err := s.repo.GetByIDWithItems(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrderNotFound
		}
		s.logger.Error("获取订单详情失败", zap.Error(err), zap.Uint64("order_id", id))
		return nil, err
	}

	return order, nil
}

// ShipOrderInput 发货输入
type ShipOrderInput struct {
	ExpressCompany string `json:"express_company" binding:"required"` // 物流公司
	ExpressNo      string `json:"express_no" binding:"required"`      // 物流单号
}

// ShipOrder 发货
func (s *OrderAdminService) ShipOrder(ctx context.Context, id uint64, adminID uint64, input ShipOrderInput) error {
	// 获取订单
	order, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrOrderNotFound
		}
		return err
	}

	// 检查订单状态是否可以发货
	if order.Status != model.OrderStatusPaid {
		return ErrOrderCannotShip
	}

	// 使用事务处理
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 更新订单状态和物流信息
		now := time.Now()
		order.Status = model.OrderStatusShipped
		order.ExpressCompany = input.ExpressCompany
		order.ExpressNo = input.ExpressNo
		order.ShipTime = &now

		if err := s.repo.UpdateWithTx(ctx, tx, order); err != nil {
			return err
		}

		// 创建状态变更记录
		transition := &model.OrderStatusTransition{
			OrderID:      id,
			FromStatus:   string(model.OrderStatusPaid),
			ToStatus:     string(model.OrderStatusShipped),
			OperatorID:   adminID,
			OperatorType: "admin",
			Remark:       "订单发货，物流公司：" + input.ExpressCompany + "，物流单号：" + input.ExpressNo,
		}
		if err := s.repo.CreateStatusTransition(ctx, transition); err != nil {
			s.logger.Error("创建状态变更记录失败", zap.Error(err))
		}

		// 创建订单日志
		log := &model.OrderLog{
			OrderID:  id,
			Action:   "ship",
			Content:  "订单发货，物流公司：" + input.ExpressCompany + "，物流单号：" + input.ExpressNo,
			Operator: "admin",
		}
		if err := s.repo.CreateLog(ctx, log); err != nil {
			s.logger.Error("创建订单日志失败", zap.Error(err))
		}

		return nil
	})

	if err != nil {
		s.logger.Error("发货失败", zap.Error(err), zap.Uint64("order_id", id))
		return err
	}

	s.logger.Info("订单发货成功",
		zap.Uint64("order_id", id),
		zap.String("express_company", input.ExpressCompany),
		zap.String("express_no", input.ExpressNo),
	)
	return nil
}

// RefundOrderInput 退款输入
type RefundOrderInput struct {
	RefundAmount float64 `json:"refund_amount" binding:"required,gt=0"` // 退款金额
	RefundReason string  `json:"refund_reason" binding:"required"`      // 退款原因
}

// RefundOrder 退款
func (s *OrderAdminService) RefundOrder(ctx context.Context, id uint64, adminID uint64, input RefundOrderInput) error {
	// 获取订单
	order, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrOrderNotFound
		}
		return err
	}

	// 检查订单状态是否可以退款
	if !order.CanTransitionTo(model.OrderStatusRefunded) {
		return ErrOrderCannotRefund
	}

	// 验证退款金额
	if input.RefundAmount <= 0 || input.RefundAmount > order.PayAmount {
		return ErrRefundAmountInvalid
	}

	// 使用事务处理
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 更新订单状态和退款信息
		now := time.Now()
		fromStatus := order.Status
		order.Status = model.OrderStatusRefunded
		order.RefundAmount = input.RefundAmount
		order.RefundReason = input.RefundReason
		order.RefundTime = &now

		if err := s.repo.UpdateWithTx(ctx, tx, order); err != nil {
			return err
		}

		// 创建状态变更记录
		transition := &model.OrderStatusTransition{
			OrderID:      id,
			FromStatus:   string(fromStatus),
			ToStatus:     string(model.OrderStatusRefunded),
			OperatorID:   adminID,
			OperatorType: "admin",
			Remark:       "订单退款，退款原因：" + input.RefundReason,
		}
		if err := s.repo.CreateStatusTransition(ctx, transition); err != nil {
			s.logger.Error("创建状态变更记录失败", zap.Error(err))
		}

		// 创建订单日志
		log := &model.OrderLog{
			OrderID:  id,
			Action:   "refund",
			Content:  "订单退款，退款金额：" + formatMoney(input.RefundAmount) + "，退款原因：" + input.RefundReason,
			Operator: "admin",
		}
		if err := s.repo.CreateLog(ctx, log); err != nil {
			s.logger.Error("创建订单日志失败", zap.Error(err))
		}

		// TODO: 调用支付服务进行实际退款

		return nil
	})

	if err != nil {
		s.logger.Error("退款失败", zap.Error(err), zap.Uint64("order_id", id))
		return err
	}

	s.logger.Info("订单退款成功",
		zap.Uint64("order_id", id),
		zap.Float64("refund_amount", input.RefundAmount),
		zap.String("refund_reason", input.RefundReason),
	)
	return nil
}

// GetOrderStatistics 获取订单统计
func (s *OrderAdminService) GetOrderStatistics(ctx context.Context, startTime, endTime *time.Time) (*repository.OrderStatistics, error) {
	stats, err := s.repo.GetStatistics(ctx, startTime, endTime)
	if err != nil {
		s.logger.Error("获取订单统计失败", zap.Error(err))
		return nil, err
	}

	return stats, nil
}

// formatMoney 格式化金额
func formatMoney(amount float64) string {
	return fmt.Sprintf("%.2f元", amount)
}
