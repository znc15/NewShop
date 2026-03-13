package service

import (
	"context"
	"errors"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrCartItemNotFound = errors.New("购物车商品不存在")
	ErrInvalidQuantity  = errors.New("商品数量无效")
)

type CartService struct {
	repo *repository.CartRepo
	db   *gorm.DB
}

func NewCartService(repo *repository.CartRepo, db *gorm.DB) *CartService {
	return &CartService{repo: repo, db: db}
}

// GetCart 获取用户购物车
func (s *CartService) GetCart(ctx context.Context, userID uint64) ([]model.CartItem, error) {
	return s.repo.GetByUserID(ctx, userID)
}

// AddItem 添加商品到购物车
func (s *CartService) AddItem(ctx context.Context, userID, productID, skuID uint64, quantity int) (*model.CartItem, error) {
	if quantity <= 0 {
		return nil, ErrInvalidQuantity
	}

	item := &model.CartItem{
		UserID:    userID,
		ProductID: productID,
		SkuID:     skuID,
		Quantity:  quantity,
		Selected:  true,
	}

	if err := s.repo.AddItem(ctx, item); err != nil {
		return nil, err
	}

	return item, nil
}

// UpdateQuantity 更新购物车商品数量
func (s *CartService) UpdateQuantity(ctx context.Context, id, userID uint64, quantity int) error {
	if quantity <= 0 {
		return ErrInvalidQuantity
	}
	return s.repo.UpdateQuantity(ctx, id, userID, quantity)
}

// UpdateSelected 更新购物车商品选中状态
func (s *CartService) UpdateSelected(ctx context.Context, id, userID uint64, selected bool) error {
	return s.repo.UpdateSelected(ctx, id, userID, selected)
}

// RemoveItem 删除购物车商品
func (s *CartService) RemoveItem(ctx context.Context, id, userID uint64) error {
	err := s.repo.RemoveItem(ctx, id, userID)
	if err == gorm.ErrRecordNotFound {
		return ErrCartItemNotFound
	}
	return err
}

// ClearCart 清空购物车
func (s *CartService) ClearCart(ctx context.Context, userID uint64) error {
	return s.repo.Clear(ctx, userID)
}

// GetSelectedItems 获取选中商品
func (s *CartService) GetSelectedItems(ctx context.Context, userID uint64) ([]model.CartItem, error) {
	return s.repo.GetSelectedItems(ctx, userID)
}

// BatchRemove 批量删除购物车商品
func (s *CartService) BatchRemove(ctx context.Context, userID uint64, ids []uint64) error {
	return s.repo.BatchRemove(ctx, userID, ids)
}

// GetCartItemCount 获取购物车商品数量
func (s *CartService) GetCartItemCount(ctx context.Context, userID uint64) (int64, error) {
	var count int64
	err := s.db.WithContext(ctx).Model(&model.CartItem{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}
