package model

import "time"

// UserAddress 用户地址模型
type UserAddress struct {
	ID        uint64    `gorm:"primaryKey" json:"id"`
	UserID    uint64    `gorm:"not null;index" json:"user_id"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	Phone     string    `gorm:"size:50;not null" json:"phone"`
	Province  string    `gorm:"size:50;not null" json:"province"`
	City      string    `gorm:"size:50;not null" json:"city"`
	District  string    `gorm:"size:50;not null" json:"district"`
	Address   string    `gorm:"size:255;not null" json:"address"`
	IsDefault bool      `gorm:"default:false" json:"is_default"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名
func (UserAddress) TableName() string {
	return "user_addresses"
}
