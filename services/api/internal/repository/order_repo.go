package repository

import (
	"context"

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
