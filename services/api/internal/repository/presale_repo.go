package repository

import (
	"context"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

type PresaleRepo struct {
	db *gorm.DB
}

func NewPresaleRepo(db *gorm.DB) *PresaleRepo {
	return &PresaleRepo{db: db}
}

// Create 创建预售商品
func (r *PresaleRepo) Create(ctx context.Context, presale *model.Presale) error {
	return r.db.WithContext(ctx).Create(presale).Error
}

// Update 更新预售商品
func (r *PresaleRepo) Update(ctx context.Context, presale *model.Presale) error {
	return r.db.WithContext(ctx).Save(presale).Error
}

// GetByID 根据ID获取预售商品
func (r *PresaleRepo) GetByID(ctx context.Context, id uint64) (*model.Presale, error) {
	var presale model.Presale
	err := r.db.WithContext(ctx).First(&presale, id).Error
	if err != nil {
		return nil, err
	}
	return &presale, nil
}

// GetList 获取预售商品列表
func (r *PresaleRepo) GetList(ctx context.Context, status model.PresaleStatus, page, pageSize int) ([]model.Presale, int64, error) {
	var presales []model.Presale
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Presale{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&presales).Error
	if err != nil {
		return nil, 0, err
	}

	return presales, total, nil
}

// GetActiveList 获取当前可参与的预售列表
func (r *PresaleRepo) GetActiveList(ctx context.Context, page, pageSize int) ([]model.Presale, int64, error) {
	var presales []model.Presale
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Presale{}).
		Where("status IN ?", []model.PresaleStatus{model.PresaleStatusDeposit, model.PresaleStatusBalance})

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&presales).Error
	if err != nil {
		return nil, 0, err
	}

	return presales, total, nil
}

// IncrementSoldCount 增加已售数量
func (r *PresaleRepo) IncrementSoldCount(ctx context.Context, id uint64, count int) error {
	return r.db.WithContext(ctx).Model(&model.Presale{}).
		Where("id = ? AND total_stock - sold_count >= ?", id, count).
		Update("sold_count", gorm.Expr("sold_count + ?", count)).Error
}

// DecrementSoldCount 减少已售数量（取消订单时）
func (r *PresaleRepo) DecrementSoldCount(ctx context.Context, id uint64, count int) error {
	return r.db.WithContext(ctx).Model(&model.Presale{}).
		Where("id = ? AND sold_count >= ?", id, count).
		Update("sold_count", gorm.Expr("sold_count - ?", count)).Error
}

// CreateOrder 创建预售订单
func (r *PresaleRepo) CreateOrder(ctx context.Context, order *model.PresaleOrder) error {
	return r.db.WithContext(ctx).Create(order).Error
}

// UpdateOrder 更新预售订单
func (r *PresaleRepo) UpdateOrder(ctx context.Context, order *model.PresaleOrder) error {
	return r.db.WithContext(ctx).Save(order).Error
}

// GetOrderByID 根据ID获取预售订单
func (r *PresaleRepo) GetOrderByID(ctx context.Context, id uint64) (*model.PresaleOrder, error) {
	var order model.PresaleOrder
	err := r.db.WithContext(ctx).Preload("Presale").First(&order, id).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// GetOrderByUserPresale 根据用户ID和预售ID获取订单
func (r *PresaleRepo) GetOrderByUserPresale(ctx context.Context, userID, presaleID uint64) (*model.PresaleOrder, error) {
	var order model.PresaleOrder
	err := r.db.WithContext(ctx).Preload("Presale").
		Where("user_id = ? AND presale_id = ?", userID, presaleID).
		First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// GetUserOrderList 获取用户预售订单列表
func (r *PresaleRepo) GetUserOrderList(ctx context.Context, userID uint64, status model.PresaleOrderStatus, page, pageSize int) ([]model.PresaleOrder, int64, error) {
	var orders []model.PresaleOrder
	var total int64

	query := r.db.WithContext(ctx).Model(&model.PresaleOrder{}).Where("user_id = ?", userID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Preload("Presale").Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&orders).Error
	if err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

// GetDepositPaidOrders 获取已付定金但未付尾款的订单（用于尾款提醒）
func (r *PresaleRepo) GetDepositPaidOrders(ctx context.Context, presaleID uint64) ([]model.PresaleOrder, error) {
	var orders []model.PresaleOrder
	err := r.db.WithContext(ctx).
		Where("presale_id = ? AND status = ?", presaleID, model.PresaleOrderStatusDepositPaid).
		Find(&orders).Error
	if err != nil {
		return nil, err
	}
	return orders, nil
}
