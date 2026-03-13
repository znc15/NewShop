package model

import (
	"time"

	"gorm.io/gorm"
)

// 优惠券类型常量
const (
	CouponTypeFixed       = 1 // 满减券
	CouponTypePercent     = 2 // 折扣券
	CouponTypeNoThreshold = 3 // 无门槛券
)

// 优惠券状态常量
const (
	CouponStatusNotStarted = 1 // 未开始
	CouponStatusActive     = 2 // 进行中
	CouponStatusEnded      = 3 // 已结束
)

// 用户优惠券状态常量
const (
	UserCouponStatusUnused  = 1 // 未使用
	UserCouponStatusUsed    = 2 // 已使用
	UserCouponStatusExpired = 3 // 已过期
)

// Coupon 优惠券模板模型
type Coupon struct {
	ID         uint64         `gorm:"primaryKey" json:"id"`
	Name       string         `gorm:"size:100;not null" json:"name"`
	Type       int            `gorm:"not null;comment:1-满减 2-折扣 3-无门槛" json:"type"`
	Amount     float64        `gorm:"type:decimal(10,2);comment:优惠金额" json:"amount"`
	MinAmount  float64        `gorm:"type:decimal(10,2);default:0;comment:最低消费金额" json:"min_amount"`
	Discount   float64        `gorm:"type:decimal(3,2);comment:折扣率(0.8表示8折)" json:"discount"`
	TotalCount int            `gorm:"not null;default:0;comment:发放总量" json:"total_count"`
	UsedCount  int            `gorm:"not null;default:0;comment:已领取数量" json:"used_count"`
	PerLimit   int            `gorm:"not null;default:1;comment:每人限领数量" json:"per_limit"`
	StartTime  time.Time      `gorm:"not null;comment:生效开始时间" json:"start_time"`
	EndTime    time.Time      `gorm:"not null;comment:生效结束时间" json:"end_time"`
	Status     int            `gorm:"not null;default:2;comment:1-未开始 2-进行中 3-已结束" json:"status"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (Coupon) TableName() string {
	return "coupons"
}

// UserCoupon 用户优惠券模型
type UserCoupon struct {
	ID        uint64     `gorm:"primaryKey" json:"id"`
	UserID    uint64     `gorm:"not null;index:idx_user_coupon" json:"user_id"`
	CouponID  uint64     `gorm:"not null;index:idx_user_coupon" json:"coupon_id"`
	Status    int        `gorm:"not null;default:1;comment:1-未使用 2-已使用 3-已过期" json:"status"`
	UsedTime  *time.Time `json:"used_time"`
	OrderID   uint64     `gorm:"default:0;comment:使用的订单ID" json:"order_id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// TableName 指定表名
func (UserCoupon) TableName() string {
	return "user_coupons"
}

// CouponDetail 优惠券详情（用于返回给前端，包含关联信息）
type CouponDetail struct {
	*UserCoupon
	Coupon *Coupon `json:"coupon"`
}
