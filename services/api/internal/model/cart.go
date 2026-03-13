package model

import "time"

// CartItem 购物车项模型
type CartItem struct {
	ID        uint64    `gorm:"primaryKey" json:"id"`
	UserID    uint64    `gorm:"not null;index" json:"user_id"`
	ProductID uint64    `gorm:"not null;index" json:"product_id"`
	SkuID     uint64    `gorm:"not null;index" json:"sku_id"`
	Quantity  int       `gorm:"not null;default:1" json:"quantity"`
	Selected  bool      `gorm:"default:true" json:"selected"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名
func (CartItem) TableName() string {
	return "cart_items"
}
