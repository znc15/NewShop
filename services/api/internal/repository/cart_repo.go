package repository

import (
	"context"

	"newshop/api/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CartRepo struct {
	db *gorm.DB
}

func NewCartRepo(db *gorm.DB) *CartRepo {
	return &CartRepo{db: db}
}

// GetByUserID 获取用户购物车所有商品
func (r *CartRepo) GetByUserID(ctx context.Context, userID uint64) ([]model.CartItem, error) {
	var items []model.CartItem
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at desc").Find(&items).Error
	return items, err
}

// GetByID 根据 ID 获取购物车项
func (r *CartRepo) GetByID(ctx context.Context, id uint64) (*model.CartItem, error) {
	var item model.CartItem
	err := r.db.WithContext(ctx).First(&item, id).Error
	return &item, err
}

// GetByUserAndProduct 根据用户ID和商品ID获取购物车项
func (r *CartRepo) GetByUserAndProduct(ctx context.Context, userID, productID, skuID uint64) (*model.CartItem, error) {
	var item model.CartItem
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND product_id = ? AND sku_id = ?", userID, productID, skuID).
		First(&item).Error
	return &item, err
}

// AddItem 添加商品到购物车（存在则更新数量）
func (r *CartRepo) AddItem(ctx context.Context, item *model.CartItem) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing model.CartItem
		err := tx.Where("user_id = ? AND product_id = ? AND sku_id = ?",
			item.UserID, item.ProductID, item.SkuID).First(&existing).Error

		if err == gorm.ErrRecordNotFound {
			// 新商品，直接创建
			return tx.Create(item).Error
		} else if err != nil {
			return err
		}

		// 已存在，更新数量
		existing.Quantity += item.Quantity
		return tx.Save(&existing).Error
	})
}

// UpdateQuantity 更新购物车商品数量
func (r *CartRepo) UpdateQuantity(ctx context.Context, id, userID uint64, quantity int) error {
	result := r.db.WithContext(ctx).
		Model(&model.CartItem{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("quantity", quantity)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// UpdateSelected 更新购物车商品选中状态
func (r *CartRepo) UpdateSelected(ctx context.Context, id, userID uint64, selected bool) error {
	result := r.db.WithContext(ctx).
		Model(&model.CartItem{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("selected", selected)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// RemoveItem 删除购物车商品
func (r *CartRepo) RemoveItem(ctx context.Context, id, userID uint64) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		Delete(&model.CartItem{})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// Clear 清空用户购物车
func (r *CartRepo) Clear(ctx context.Context, userID uint64) error {
	return r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&model.CartItem{}).Error
}

// GetSelectedItems 获取用户选中的购物车商品
func (r *CartRepo) GetSelectedItems(ctx context.Context, userID uint64) ([]model.CartItem, error) {
	var items []model.CartItem
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND selected = ?", userID, true).
		Order("created_at desc").
		Find(&items).Error
	return items, err
}

// BatchRemove 批量删除购物车商品
func (r *CartRepo) BatchRemove(ctx context.Context, userID uint64, ids []uint64) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Where("id IN ? AND user_id = ?", ids, userID).
		Delete(&model.CartItem{}).Error
}

// Upsert 插入或更新购物车项（使用 ON CONFLICT）
func (r *CartRepo) Upsert(ctx context.Context, item *model.CartItem) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "product_id"}, {Name: "sku_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"quantity", "selected", "updated_at"}),
		}).
		Create(item).Error
}
