package repository

import (
	"context"
	"time"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

type OrderRepo struct {
	db *gorm.DB
}

func NewOrderRepo(db *gorm.DB) *OrderRepo {
	return &OrderRepo{db: db}
}

// Create 创建订单（包含订单商品）
func (r *OrderRepo) Create(ctx context.Context, order *model.Order) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 创建订单主表
		if err := tx.Create(order).Error; err != nil {
			return err
		}

		// 创建订单商品明细
		if len(order.Items) > 0 {
			for i := range order.Items {
				order.Items[i].OrderID = order.ID
			}
			if err := tx.Create(&order.Items).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// GetByID 根据ID获取订单
func (r *OrderRepo) GetByID(ctx context.Context, id uint64) (*model.Order, error) {
	var order model.Order
	err := r.db.WithContext(ctx).First(&order, id).Error
	return &order, err
}

// GetByIDWithItems 根据ID获取订单（包含商品明细）
func (r *OrderRepo) GetByIDWithItems(ctx context.Context, id uint64) (*model.Order, error) {
	var order model.Order
	err := r.db.WithContext(ctx).Preload("Items").First(&order, id).Error
	return &order, err
}

// GetByOrderNo 根据订单号获取订单
func (r *OrderRepo) GetByOrderNo(ctx context.Context, orderNo string) (*model.Order, error) {
	var order model.Order
	err := r.db.WithContext(ctx).Where("order_no = ?", orderNo).First(&order).Error
	return &order, err
}

// GetByOrderNoWithItems 根据订单号获取订单（包含商品明细）
func (r *OrderRepo) GetByOrderNoWithItems(ctx context.Context, orderNo string) (*model.Order, error) {
	var order model.Order
	err := r.db.WithContext(ctx).Preload("Items").Where("order_no = ?", orderNo).First(&order).Error
	return &order, err
}

// ListByUser 获取用户订单列表
func (r *OrderRepo) ListByUser(ctx context.Context, userID uint64, status string, page, pageSize int) ([]model.Order, int64, error) {
	var orders []model.Order
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Order{}).Where("user_id = ?", userID)

	// 按状态筛选
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (page - 1) * pageSize
	err := query.Order("id DESC").Offset(offset).Limit(pageSize).Find(&orders).Error

	return orders, total, err
}

// ListByUserWithItems 获取用户订单列表（包含商品明细）
func (r *OrderRepo) ListByUserWithItems(ctx context.Context, userID uint64, status string, page, pageSize int) ([]model.Order, int64, error) {
	var orders []model.Order
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Order{}).Where("user_id = ?", userID)

	// 按状态筛选
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (page - 1) * pageSize
	err := query.Preload("Items").Order("id DESC").Offset(offset).Limit(pageSize).Find(&orders).Error

	return orders, total, err
}

// UpdateStatus 更新订单状态
func (r *OrderRepo) UpdateStatus(ctx context.Context, id uint64, status string) error {
	return r.db.WithContext(ctx).Model(&model.Order{}).Where("id = ?", id).Update("status", status).Error
}

// UpdateStatusWithTime 更新订单状态及相关时间
func (r *OrderRepo) UpdateStatusWithTime(ctx context.Context, id uint64, status string, updates map[string]interface{}) error {
	updates["status"] = status
	return r.db.WithContext(ctx).Model(&model.Order{}).Where("id = ?", id).Updates(updates).Error
}

// Cancel 取消订单
func (r *OrderRepo) Cancel(ctx context.Context, id uint64, reason string) error {
	return r.db.WithContext(ctx).Model(&model.Order{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":        model.OrderStatusCancelled,
		"cancel_reason": reason,
	}).Error
}

// GetOrderItems 获取订单商品明细
func (r *OrderRepo) GetOrderItems(ctx context.Context, orderID uint64) ([]model.OrderItem, error) {
	var items []model.OrderItem
	err := r.db.WithContext(ctx).Where("order_id = ?", orderID).Find(&items).Error
	return items, err
}

// CreateLog 创建订单日志
func (r *OrderRepo) CreateLog(ctx context.Context, log *model.OrderLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// GetLogs 获取订单日志列表
func (r *OrderRepo) GetLogs(ctx context.Context, orderID uint64) ([]model.OrderLog, error) {
	var logs []model.OrderLog
	err := r.db.WithContext(ctx).Where("order_id = ?", orderID).Order("id DESC").Find(&logs).Error
	return logs, err
}

// GetByIDForUpdate 加锁获取订单（用于并发更新）
func (r *OrderRepo) GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id uint64) (*model.Order, error) {
	var order model.Order
	err := tx.WithContext(ctx).
		Set("gorm:query_option", "FOR UPDATE").
		First(&order, id).Error
	return &order, err
}

// OrderListFilter 订单列表筛选条件
type OrderListFilter struct {
	Status    string     // 状态筛选
	UserID    uint64     // 用户ID筛选
	OrderNo   string     // 订单号筛选
	StartTime *time.Time // 开始时间
	EndTime   *time.Time // 结束时间
	Page      int        // 页码
	PageSize  int        // 每页数量
}

// ListForAdmin 管理后台订单列表查询
func (r *OrderRepo) ListForAdmin(ctx context.Context, filter OrderListFilter) ([]model.Order, int64, error) {
	var orders []model.Order
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Order{})

	// 状态筛选
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	// 用户ID筛选
	if filter.UserID > 0 {
		query = query.Where("user_id = ?", filter.UserID)
	}

	// 订单号筛选
	if filter.OrderNo != "" {
		query = query.Where("order_no LIKE ?", "%"+filter.OrderNo+"%")
	}

	// 时间范围筛选
	if filter.StartTime != nil {
		query = query.Where("created_at >= ?", filter.StartTime)
	}
	if filter.EndTime != nil {
		query = query.Where("created_at <= ?", filter.EndTime)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (filter.Page - 1) * filter.PageSize
	err := query.Preload("Items").Order("id DESC").Offset(offset).Limit(filter.PageSize).Find(&orders).Error

	return orders, total, err
}

// Update 更新订单
func (r *OrderRepo) Update(ctx context.Context, order *model.Order) error {
	return r.db.WithContext(ctx).Save(order).Error
}

// UpdateWithTx 在事务中更新订单
func (r *OrderRepo) UpdateWithTx(ctx context.Context, tx *gorm.DB, order *model.Order) error {
	return tx.WithContext(ctx).Save(order).Error
}

// GetDB 获取数据库连接（用于事务）
func (r *OrderRepo) GetDB() *gorm.DB {
	return r.db
}

// CreateStatusTransition 创建订单状态变更记录
func (r *OrderRepo) CreateStatusTransition(ctx context.Context, transition *model.OrderStatusTransition) error {
	return r.db.WithContext(ctx).Create(transition).Error
}

// OrderStatistics 订单统计结果
type OrderStatistics struct {
	TotalOrders     int64   `json:"total_orders"`
	TotalAmount     float64 `json:"total_amount"`
	PendingOrders   int64   `json:"pending_orders"`
	PaidOrders      int64   `json:"paid_orders"`
	ShippedOrders   int64   `json:"shipped_orders"`
	CompletedOrders int64   `json:"completed_orders"`
	CancelledOrders int64   `json:"cancelled_orders"`
	RefundedOrders  int64   `json:"refunded_orders"`
	RefundAmount    float64 `json:"refund_amount"`
}

// GetStatistics 获取订单统计
func (r *OrderRepo) GetStatistics(ctx context.Context, startTime, endTime *time.Time) (*OrderStatistics, error) {
	stats := &OrderStatistics{}

	query := r.db.WithContext(ctx).Model(&model.Order{})

	// 时间范围筛选
	if startTime != nil {
		query = query.Where("created_at >= ?", startTime)
	}
	if endTime != nil {
		query = query.Where("created_at <= ?", endTime)
	}

	// 总订单数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}
	stats.TotalOrders = total

	// 总金额
	var totalAmount float64
	amountQuery := r.db.WithContext(ctx).Model(&model.Order{})
	if startTime != nil {
		amountQuery = amountQuery.Where("created_at >= ?", startTime)
	}
	if endTime != nil {
		amountQuery = amountQuery.Where("created_at <= ?", endTime)
	}
	amountQuery.Select("COALESCE(SUM(pay_amount), 0)").Scan(&totalAmount)
	stats.TotalAmount = totalAmount

	// 各状态订单数
	statusCounts := make(map[string]int64)
	statusQuery := r.db.WithContext(ctx).Model(&model.Order{}).Select("status, count(*) as count")
	if startTime != nil {
		statusQuery = statusQuery.Where("created_at >= ?", startTime)
	}
	if endTime != nil {
		statusQuery = statusQuery.Where("created_at <= ?", endTime)
	}
	statusQuery.Group("status").Scan(&statusCounts)

	stats.PendingOrders = statusCounts[string(model.OrderStatusPending)]
	stats.PaidOrders = statusCounts[string(model.OrderStatusPaid)]
	stats.ShippedOrders = statusCounts[string(model.OrderStatusShipped)]
	stats.CompletedOrders = statusCounts[string(model.OrderStatusDelivered)]
	stats.CancelledOrders = statusCounts[string(model.OrderStatusCancelled)]
	stats.RefundedOrders = statusCounts[string(model.OrderStatusRefunded)]

	// 退款金额
	var refundAmount float64
	refundQuery := r.db.WithContext(ctx).Model(&model.Order{}).Where("status = ?", model.OrderStatusRefunded)
	if startTime != nil {
		refundQuery = refundQuery.Where("created_at >= ?", startTime)
	}
	if endTime != nil {
		refundQuery = refundQuery.Where("created_at <= ?", endTime)
	}
	refundQuery.Select("COALESCE(SUM(refund_amount), 0)").Scan(&refundAmount)
	stats.RefundAmount = refundAmount

	return stats, nil
}
