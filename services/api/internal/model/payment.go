package model

import (
	"time"

	"gorm.io/gorm"
)

// PaymentStatus 支付状态枚举
type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "pending"   // 待支付
	PaymentStatusPaid      PaymentStatus = "paid"      // 已支付
	PaymentStatusFailed    PaymentStatus = "failed"    // 支付失败
	PaymentStatusClosed    PaymentStatus = "closed"    // 已关闭
	PaymentStatusRefunded  PaymentStatus = "refunded"  // 已退款
	PaymentStatusRefunding PaymentStatus = "refunding" // 退款中
)

// PaymentMethod 支付方式枚举
type PaymentMethod string

const (
	PaymentMethodAlipayPage PaymentMethod = "alipay_page" // 支付宝电脑网站支付
	PaymentMethodAlipayWap  PaymentMethod = "alipay_wap"  // 支付宝手机网站支付
	PaymentMethodWechat     PaymentMethod = "wechat"      // 微信支付
	PaymentMethodBalance    PaymentMethod = "balance"     // 余额支付
)

// Payment 支付记录模型
type Payment struct {
	ID             uint64        `gorm:"primaryKey" json:"id"`
	OrderID        uint64        `gorm:"not null;index" json:"order_id"`                      // 关联订单ID
	OutTradeNo     string        `gorm:"uniqueIndex;size:64;not null" json:"out_trade_no"`    // 商户订单号
	TradeNo        string        `gorm:"size:64" json:"trade_no"`                             // 第三方交易号
	UserID         uint64        `gorm:"not null;index" json:"user_id"`                       // 用户ID
	PaymentMethod  PaymentMethod `gorm:"size:20;not null" json:"payment_method"`              // 支付方式
	TotalAmount    float64       `gorm:"type:decimal(10,2);not null" json:"total_amount"`     // 订单金额
	PaidAmount     float64       `gorm:"type:decimal(10,2);default:0" json:"paid_amount"`     // 实付金额
	RefundedAmount float64       `gorm:"type:decimal(10,2);default:0" json:"refunded_amount"` // 已退款金额
	Status         PaymentStatus `gorm:"size:20;default:pending;index" json:"status"`         // 支付状态
	Subject        string        `gorm:"size:200" json:"subject"`                             // 订单标题
	Body           string        `gorm:"size:500" json:"body"`                                // 订单描述
	Passback       string        `gorm:"size:500" json:"passback"`                            // 回传参数
	ExpireTime     *time.Time    `json:"expire_time"`                                         // 过期时间
	PaidAt         *time.Time    `json:"paid_at"`                                             // 支付时间
	RefundedAt     *time.Time    `json:"refunded_at"`                                         // 退款时间
	CreatedAt      time.Time     `json:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (Payment) TableName() string {
	return "payments"
}

// PaymentRefund 退款记录模型
type PaymentRefund struct {
	ID             uint64    `gorm:"primaryKey" json:"id"`
	PaymentID      uint64    `gorm:"not null;index" json:"payment_id"`                 // 关联支付记录ID
	OutRequestNo   string    `gorm:"uniqueIndex;size:64;not null" json:"out_request_no"` // 退款请求单号
	OutTradeNo     string    `gorm:"size:64;not null;index" json:"out_trade_no"`       // 商户订单号
	RefundAmount   float64   `gorm:"type:decimal(10,2);not null" json:"refund_amount"` // 退款金额
	RefundReason   string    `gorm:"size:500" json:"refund_reason"`                    // 退款原因
	Status         string    `gorm:"size:20;default:pending" json:"status"`            // 退款状态
	RefundTradeNo  string    `gorm:"size:64" json:"refund_trade_no"`                   // 第三方退款单号
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TableName 指定表名
func (PaymentRefund) TableName() string {
	return "payment_refunds"
}

// IsPaid 检查是否已支付
func (p *Payment) IsPaid() bool {
	return p.Status == PaymentStatusPaid
}

// IsRefundable 检查是否可退款
func (p *Payment) IsRefundable() bool {
	if p.Status != PaymentStatusPaid {
		return false
	}
	// 退款金额不能超过实付金额
	return p.RefundedAmount < p.PaidAmount
}

// CanRefund 计算可退款金额
func (p *Payment) CanRefund() float64 {
	if !p.IsRefundable() {
		return 0
	}
	return p.PaidAmount - p.RefundedAmount
}
