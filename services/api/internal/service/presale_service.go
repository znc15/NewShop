package service

import (
	"context"
	"errors"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrPresaleNotFound       = errors.New("预售商品不存在")
	ErrPresaleNotActive      = errors.New("预售活动未开始或已结束")
	ErrPresaleOutOfStock     = errors.New("预售商品库存不足")
	ErrPresaleOrderExists    = errors.New("已参与该预售活动")
	ErrPresaleOrderNotFound  = errors.New("预售订单不存在")
	ErrDepositNotPaid        = errors.New("定金未支付")
	ErrDepositAlreadyPaid    = errors.New("定金已支付")
	ErrBalanceAlreadyPaid    = errors.New("尾款已支付")
	ErrDepositTimeNotValid   = errors.New("不在定金支付时间范围内")
	ErrBalanceTimeNotValid   = errors.New("不在尾款支付时间范围内")
)

type PresaleService struct {
	db   *gorm.DB
	repo *repository.PresaleRepo
}

func NewPresaleService(db *gorm.DB, repo *repository.PresaleRepo) *PresaleService {
	return &PresaleService{db: db, repo: repo}
}

// GetPresaleList 获取预售列表
func (s *PresaleService) GetPresaleList(ctx context.Context, status model.PresaleStatus, page, pageSize int) ([]model.Presale, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.GetList(ctx, status, page, pageSize)
}

// GetActivePresaleList 获取当前可参与的预售列表
func (s *PresaleService) GetActivePresaleList(ctx context.Context, page, pageSize int) ([]model.Presale, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.GetActiveList(ctx, page, pageSize)
}

// GetPresaleDetail 获取预售详情
func (s *PresaleService) GetPresaleDetail(ctx context.Context, id uint64) (*model.Presale, error) {
	presale, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPresaleNotFound
		}
		return nil, err
	}
	return presale, nil
}

// CreatePresaleOrder 创建预售订单
func (s *PresaleService) CreatePresaleOrder(ctx context.Context, userID, presaleID uint64) (*model.PresaleOrder, error) {
	// 检查是否已有订单
	existingOrder, err := s.repo.GetOrderByUserPresale(ctx, userID, presaleID)
	if err == nil && existingOrder != nil {
		return nil, ErrPresaleOrderExists
	}

	// 获取预售信息
	presale, err := s.repo.GetByID(ctx, presaleID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPresaleNotFound
		}
		return nil, err
	}

	// 检查预售状态和时间
	now := time.Now()
	if presale.Status != model.PresaleStatusDeposit && presale.Status != model.PresaleStatusPending {
		return nil, ErrPresaleNotActive
	}
	if now.Before(presale.DepositStartTime) || now.After(presale.DepositEndTime) {
		return nil, ErrDepositTimeNotValid
	}

	// 检查库存
	if presale.SoldCount >= presale.TotalStock {
		return nil, ErrPresaleOutOfStock
	}

	// 创建订单
	order := &model.PresaleOrder{
		PresaleID: presaleID,
		UserID:    userID,
		Status:    model.PresaleOrderStatusPendingDeposit,
	}

	// 使用事务
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// 创建订单
		if err := tx.Create(order).Error; err != nil {
			return err
		}
		// 增加已售数量
		if err := tx.Model(&model.Presale{}).
			Where("id = ? AND total_stock - sold_count >= 1", presaleID).
			Update("sold_count", gorm.Expr("sold_count + 1")).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return order, nil
}

// PayDeposit 支付定金
func (s *PresaleService) PayDeposit(ctx context.Context, orderID, userID uint64) (*model.PresaleOrder, error) {
	order, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPresaleOrderNotFound
		}
		return nil, err
	}

	// 验证用户
	if order.UserID != userID {
		return nil, ErrPresaleOrderNotFound
	}

	// 检查订单状态
	if order.Status != model.PresaleOrderStatusPendingDeposit {
		return nil, ErrOrderStatusInvalid
	}

	// 检查是否已支付
	if order.DepositPaid {
		return nil, ErrDepositAlreadyPaid
	}

	// 检查定金支付时间
	presale := order.Presale
	now := time.Now()
	if now.Before(presale.DepositStartTime) || now.After(presale.DepositEndTime) {
		return nil, ErrDepositTimeNotValid
	}

	// 更新订单状态
	order.DepositPaid = true
	nowTime := time.Now()
	order.DepositPaidAt = &nowTime
	order.Status = model.PresaleOrderStatusDepositPaid

	if err := s.repo.UpdateOrder(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
}

// PayBalance 支付尾款
func (s *PresaleService) PayBalance(ctx context.Context, orderID, userID uint64) (*model.PresaleOrder, error) {
	order, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPresaleOrderNotFound
		}
		return nil, err
	}

	// 验证用户
	if order.UserID != userID {
		return nil, ErrPresaleOrderNotFound
	}

	// 检查订单状态
	if order.Status != model.PresaleOrderStatusDepositPaid && order.Status != model.PresaleOrderStatusPendingBalance {
		return nil, ErrOrderStatusInvalid
	}

	// 检查定金是否已支付
	if !order.DepositPaid {
		return nil, ErrDepositNotPaid
	}

	// 检查尾款是否已支付
	if order.BalancePaid {
		return nil, ErrBalanceAlreadyPaid
	}

	// 检查尾款支付时间
	presale := order.Presale
	now := time.Now()
	if now.Before(presale.BalanceStartTime) || now.After(presale.BalanceEndTime) {
		return nil, ErrBalanceTimeNotValid
	}

	// 更新订单状态
	order.BalancePaid = true
	nowTime := time.Now()
	order.BalancePaidAt = &nowTime
	order.Status = model.PresaleOrderStatusCompleted

	if err := s.repo.UpdateOrder(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
}

// GetUserOrderList 获取用户预售订单列表
func (s *PresaleService) GetUserOrderList(ctx context.Context, userID uint64, status model.PresaleOrderStatus, page, pageSize int) ([]model.PresaleOrder, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.repo.GetUserOrderList(ctx, userID, status, page, pageSize)
}

// GetOrderDetail 获取订单详情
func (s *PresaleService) GetOrderDetail(ctx context.Context, orderID, userID uint64) (*model.PresaleOrder, error) {
	order, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPresaleOrderNotFound
		}
		return nil, err
	}

	// 验证用户
	if order.UserID != userID {
		return nil, ErrPresaleOrderNotFound
	}

	return order, nil
}

// CancelOrder 取消预售订单
func (s *PresaleService) CancelOrder(ctx context.Context, orderID, userID uint64) (*model.PresaleOrder, error) {
	order, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPresaleOrderNotFound
		}
		return nil, err
	}

	// 验证用户
	if order.UserID != userID {
		return nil, ErrPresaleOrderNotFound
	}

	// 只有待付定金状态可以取消
	if order.Status != model.PresaleOrderStatusPendingDeposit {
		return nil, ErrOrderStatusInvalid
	}

	// 使用事务取消订单并恢复库存
	err = s.db.Transaction(func(tx *gorm.DB) error {
		order.Status = model.PresaleOrderStatusCancelled
		if err := tx.Save(order).Error; err != nil {
			return err
		}
		// 恢复库存
		if err := tx.Model(&model.Presale{}).
			Where("id = ? AND sold_count >= 1", order.PresaleID).
			Update("sold_count", gorm.Expr("sold_count - 1")).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return order, nil
}

// UpdatePresaleStatus 更新预售状态（定时任务调用）
func (s *PresaleService) UpdatePresaleStatus(ctx context.Context, presaleID uint64, status model.PresaleStatus) error {
	presale, err := s.repo.GetByID(ctx, presaleID)
	if err != nil {
		return err
	}
	presale.Status = status
	return s.repo.Update(ctx, presale)
}

// CreatePresale 创建预售商品（管理后台）
func (s *PresaleService) CreatePresale(ctx context.Context, presale *model.Presale) error {
	// 根据时间自动设置状态
	now := time.Now()
	if now.Before(presale.DepositStartTime) {
		presale.Status = model.PresaleStatusPending
	} else if now.Before(presale.DepositEndTime) {
		presale.Status = model.PresaleStatusDeposit
	} else if now.Before(presale.BalanceEndTime) {
		presale.Status = model.PresaleStatusBalance
	} else {
		presale.Status = model.PresaleStatusFinished
	}
	return s.repo.Create(ctx, presale)
}
