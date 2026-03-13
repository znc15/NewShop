package model

import (
	"time"

	"gorm.io/gorm"
)

// PresaleStatus 预售状态
type PresaleStatus string

const (
	PresaleStatusDraft     PresaleStatus = "draft"     // 草稿
	PresaleStatusPending   PresaleStatus = "pending"   // 待开始
	PresaleStatusDeposit   PresaleStatus = "deposit"   // 定金阶段
	PresaleStatusBalance   PresaleStatus = "balance"   // 尾款阶段
	PresaleStatusFinished  PresaleStatus = "finished"  // 已结束
	PresaleStatusCancelled PresaleStatus = "cancelled" // 已取消
)

// Presale 预售商品模型
type Presale struct {
	ID               uint64        `gorm:"primaryKey" json:"id"`
	ProductID        uint64        `gorm:"not null;index" json:"product_id"`
	Title            string        `gorm:"size:255;not null" json:"title"`
	Description      string        `gorm:"type:text" json:"description"`
	DepositAmount    int64         `gorm:"not null" json:"deposit_amount"`     // 定金金额（分）
	BalanceAmount    int64         `gorm:"not null" json:"balance_amount"`     // 尾款金额（分）
	OriginalPrice    int64         `gorm:"not null" json:"original_price"`     // 原价（分）
	DepositStartTime time.Time     `gorm:"not null" json:"deposit_start_time"` // 定金开始时间
	DepositEndTime   time.Time     `gorm:"not null" json:"deposit_end_time"`   // 定金结束时间
	BalanceStartTime time.Time     `gorm:"not null" json:"balance_start_time"` // 尾款开始时间
	BalanceEndTime   time.Time     `gorm:"not null" json:"balance_end_time"`   // 尾款结束时间
	DeliverTime      time.Time     `gorm:"not null" json:"deliver_time"`       // 预计发货时间
	TotalStock       int           `gorm:"not null;default:0" json:"total_stock"` // 预售总库存
	SoldCount        int           `gorm:"not null;default:0" json:"sold_count"` // 已售数量
	Status           PresaleStatus `gorm:"size:50;not null;default:draft" json:"status"`
	CreatedAt        time.Time     `json:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (Presale) TableName() string {
	return "presales"
}

// PresaleOrderStatus 预售订单状态
type PresaleOrderStatus string

const (
	PresaleOrderStatusPendingDeposit  PresaleOrderStatus = "pending_deposit"  // 待付定金
	PresaleOrderStatusDepositPaid     PresaleOrderStatus = "deposit_paid"     // 已付定金
	PresaleOrderStatusPendingBalance  PresaleOrderStatus = "pending_balance"  // 待付尾款
	PresaleOrderStatusCompleted       PresaleOrderStatus = "completed"        // 已完成
	PresaleOrderStatusCancelled       PresaleOrderStatus = "cancelled"        // 已取消
	PresaleOrderStatusRefunded        PresaleOrderStatus = "refunded"         // 已退款
)

// PresaleOrder 预售订单模型
type PresaleOrder struct {
	ID            uint64             `gorm:"primaryKey" json:"id"`
	PresaleID     uint64             `gorm:"not null;index" json:"presale_id"`
	UserID        uint64             `gorm:"not null;index" json:"user_id"`
	OrderID       uint64             `gorm:"index" json:"order_id"`                  // 关联的主订单ID
	DepositPaid   bool               `gorm:"default:false" json:"deposit_paid"`      // 是否已付定金
	DepositPaidAt *time.Time         `json:"deposit_paid_at"`                        // 定金支付时间
	BalancePaid   bool               `gorm:"default:false" json:"balance_paid"`      // 是否已付尾款
	BalancePaidAt *time.Time         `json:"balance_paid_at"`                        // 尾款支付时间
	Status        PresaleOrderStatus `gorm:"size:50;not null;default:pending_deposit" json:"status"`
	CreatedAt     time.Time          `json:"created_at"`
	UpdatedAt     time.Time          `json:"updated_at"`
	DeletedAt     gorm.DeletedAt     `gorm:"index" json:"-"`

	// 关联
	Presale       *Presale           `gorm:"foreignKey:PresaleID" json:"presale,omitempty"`
}

// TableName 指定表名
func (PresaleOrder) TableName() string {
	return "presale_orders"
}
