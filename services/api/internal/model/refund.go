package model

import (
	"time"
)

// RefundStatus 退款状态
type RefundStatus string

const (
    RefundStatusPending   RefundStatus = "pending"   // 待处理
    RefundStatusProcessing RefundStatus = "processing" // 处理中
    RefundStatusCompleted RefundStatus = "completed" // 已完成
    RefundStatusFailed    RefundStatus = "failed"    // 失败
)

// Refund 退款记录
type Refund struct {
    ID              uint64    `gorm:"primaryKey"`
    OrderID       uint64    `gorm:"index" json:"order_id"`
    RefundNo      string    `gorm:"size:64;unique" json:"refund_no"`
    Amount        int64         `gorm:"not null" json:"amount"`          // 退款金额（分)
    Reason      string    `json:"reason"`                          // 退款原因
    Status      RefundStatus `gorm:"size:20;default:pending" json:"status"`
    CreatedAt      time.Time `json:"created_at"`
    UpdatedAt      time.Time `json:"updated_at"`
}

// TableName 指定表名
func (Refund) TableName() string {
    return "refunds"
}
