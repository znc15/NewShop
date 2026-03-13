package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// EmailTemplate 邮件模板
type EmailTemplate struct {
	ID        uint64    `gorm:"primaryKey" json:"id"`
	Code      string    `gorm:"uniqueIndex;size:100;not null" json:"code"`
	Name      string    `gorm:"size:255;not null" json:"name"`
	Subject   string    `gorm:"size:255;not null" json:"subject"`
	BodyHTML  string    `gorm:"type:text;not null" json:"body_html"`
	Variables JSONB     `gorm:"type:jsonb" json:"variables"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName 指定表名
func (EmailTemplate) TableName() string { return "email_templates" }

// EmailOutbox 邮件发送队列
type EmailOutbox struct {
	ID           uint64     `gorm:"primaryKey" json:"id"`
	ToEmail      string     `gorm:"size:255;not null" json:"to_email"`
	ToName       string     `gorm:"size:100" json:"to_name"`
	TemplateCode string     `gorm:"size:100" json:"template_code"`
	Params       JSONB      `gorm:"type:jsonb" json:"params"`
	Subject      string     `gorm:"size:255" json:"subject"`
	BodyHTML     string     `gorm:"type:text" json:"body_html"`
	Status       string     `gorm:"size:50;default:pending" json:"status"`
	RetryCount   int        `gorm:"default:0" json:"retry_count"`
	MaxRetry     int        `gorm:"default:3" json:"max_retry"`
	ErrorMessage string     `gorm:"type:text" json:"error_message"`
	MessageID    string     `gorm:"size:255" json:"message_id"`
	SentAt       *time.Time `json:"sent_at"`
	CreatedAt    time.Time  `json:"created_at"`
}

// TableName 指定表名
func (EmailOutbox) TableName() string { return "email_outbox" }

// JSONB 类型，用于 PostgreSQL JSONB 字段
type JSONB map[string]interface{}

// Value 实现 driver.Valuer 接口
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan 实现 sql.Scanner 接口
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("无法扫描 JSONB: %v", value)
	}
	return json.Unmarshal(bytes, j)
}
