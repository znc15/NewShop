// Package model 定义数据库模型
package model

import (
	"time"

	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID           uint64         `gorm:"primaryKey" json:"id"`
	Email        string         `gorm:"uniqueIndex;size:255" json:"email"`
	Phone        string         `gorm:"uniqueIndex;size:50" json:"phone"`
	PasswordHash string         `gorm:"size:255;not null" json:"-"`
	Nickname     string         `gorm:"size:100" json:"nickname"`
	Avatar       string         `gorm:"size:500" json:"avatar"`
	MemberLevel  int            `gorm:"default:1" json:"member_level"`
	Points       int            `gorm:"default:0" json:"points"`
	Status       string         `gorm:"size:50;default:active" json:"status"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}
