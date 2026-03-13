package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// MemberLevel 会员等级模型
type MemberLevel struct {
	ID        uint64    `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:50;not null" json:"name"`
	MinPoints int       `gorm:"not null" json:"min_points"`
	MaxPoints int       `gorm:"not null" json:"max_points"`
	Discount  float64   `gorm:"type:decimal(3,2);default:1.00" json:"discount"`
	Icon      string    `gorm:"size:255" json:"icon"`
	Rights    JSONArray `gorm:"type:jsonb" json:"rights"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名
func (MemberLevel) TableName() string {
	return "member_levels"
}

// MemberExperience 会员经验值模型
type MemberExperience struct {
	ID           uint64         `gorm:"primaryKey" json:"id"`
	UserID       uint64         `gorm:"uniqueIndex;not null" json:"user_id"`
	TotalPoints  int            `gorm:"default:0" json:"total_points"`
	CurrentLevel int            `gorm:"default:1" json:"current_level"`
	Experience   int            `gorm:"default:0" json:"experience"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (MemberExperience) TableName() string {
	return "member_experiences"
}

// JSONArray 类型，用于 PostgreSQL JSONB 字段存储数组
type JSONArray []string

// Value 实现 driver.Valuer 接口
func (j JSONArray) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan 实现 sql.Scanner 接口
func (j *JSONArray) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("无法扫描 JSONArray: %v", value)
	}
	return json.Unmarshal(bytes, j)
}

// ExperienceLog 经验值变动日志
type ExperienceLog struct {
	ID        uint64    `gorm:"primaryKey" json:"id"`
	UserID    uint64    `gorm:"not null;index" json:"user_id"`
	Points    int       `gorm:"not null" json:"points"`
	Type      string    `gorm:"size:50;not null" json:"type"`
	Remark    string    `gorm:"size:255" json:"remark"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName 指定表名
func (ExperienceLog) TableName() string {
	return "experience_logs"
}
