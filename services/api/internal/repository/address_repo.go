package repository

import (
	"context"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

type AddressRepo struct {
	db *gorm.DB
}

func NewAddressRepo(db *gorm.DB) *AddressRepo {
	return &AddressRepo{db: db}
}

// List 获取用户地址列表
func (r *AddressRepo) List(ctx context.Context, userID uint64) ([]model.UserAddress, error) {
	var addresses []model.UserAddress
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("is_default DESC, id DESC").
		Find(&addresses).Error
	return addresses, err
}

// GetByID 根据ID获取地址
func (r *AddressRepo) GetByID(ctx context.Context, id, userID uint64) (*model.UserAddress, error) {
	var address model.UserAddress
	err := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		First(&address).Error
	return &address, err
}

// Create 创建地址
func (r *AddressRepo) Create(ctx context.Context, address *model.UserAddress) error {
	return r.db.WithContext(ctx).Create(address).Error
}

// Update 更新地址
func (r *AddressRepo) Update(ctx context.Context, address *model.UserAddress) error {
	return r.db.WithContext(ctx).Save(address).Error
}

// Delete 删除地址
func (r *AddressRepo) Delete(ctx context.Context, id, userID uint64) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		Delete(&model.UserAddress{}).Error
}

// SetDefault 设置默认地址
func (r *AddressRepo) SetDefault(ctx context.Context, id, userID uint64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 先清除其他默认地址
		if err := tx.Model(&model.UserAddress{}).
			Where("user_id = ? AND is_default = ?", userID, true).
			Update("is_default", false).Error; err != nil {
			return err
		}
		// 设置新的默认地址
		return tx.Model(&model.UserAddress{}).
			Where("id = ? AND user_id = ?", id, userID).
			Update("is_default", true).Error
	})
}

// ClearDefault 清除用户的默认地址
func (r *AddressRepo) ClearDefault(ctx context.Context, userID uint64) error {
	return r.db.WithContext(ctx).
		Model(&model.UserAddress{}).
		Where("user_id = ? AND is_default = ?", userID, true).
		Update("is_default", false).Error
}
