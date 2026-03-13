// Package model 定义数据库模型
package model

import (
	"time"

	"gorm.io/gorm"
)

// Admin 管理员模型
type Admin struct {
	ID           uint64         `gorm:"primaryKey" json:"id"`
	Username     string         `gorm:"uniqueIndex;size:100;not null" json:"username"`
	PasswordHash string         `gorm:"size:255;not null" json:"-"`
	Nickname     string         `gorm:"size:100" json:"nickname"`
	Role         string         `gorm:"size:50;not null" json:"role"`
	Status       string         `gorm:"size:50;default:active" json:"status"`
	LastLoginAt  *time.Time     `json:"last_login_at"`
	LastLoginIP  string         `gorm:"size:45" json:"last_login_ip"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (Admin) TableName() string {
	return "admins"
}
