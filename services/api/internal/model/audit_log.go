package model

import "time"

// AuditLog 审计日志模型，记录用户操作行为
type AuditLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `json:"user_id"`
	Action     string    `json:"action"`
	Resource   string    `json:"resource"`
	ResourceID uint      `json:"resource_id"`
	IP         string    `json:"ip"`
	UserAgent  string    `json:"user_agent"`
	RequestID  string    `json:"request_id"`
	Details    string    `json:"details"`
	CreatedAt  time.Time `json:"created_at"`
}

// TableName 指定表名
func (AuditLog) TableName() string {
	return "audit_logs"
}

// 审计操作类型常量
const (
	AuditActionLogin         = "login"
	AuditActionLogout        = "logout"
	AuditActionOrderCreate   = "order_create"
	AuditActionOrderPay      = "order_pay"
	AuditActionOrderCancel   = "order_cancel"
	AuditActionProductCreate = "product_create"
	AuditActionProductUpdate = "product_update"
	AuditActionProductDelete = "product_delete"
)

// 资源类型常量
const (
	AuditResourceUser    = "user"
	AuditResourceOrder   = "order"
	AuditResourceProduct = "product"
	AuditResourceCart    = "cart"
	AuditResourceCoupon  = "coupon"
)
