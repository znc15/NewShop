package model

import (
	"time"
)

// PointsType 积分类型
type PointsType string

const (
	PointsTypeCheckIn       PointsType = "check_in"        // 签到
	PointsTypePurchase      PointsType = "purchase"        // 购物奖励
	PointsTypeConsume       PointsType = "consume"         // 消费扣减
	PointsTypeRefund        PointsType = "refund"          // 退款返还
	PointsTypeManualAdd     PointsType = "manual_add"      // 手动增加
	PointsTypeManualDeduct  PointsType = "manual_deduct"   // 手动扣减
	PointsTypeContinuousBonus PointsType = "continuous_bonus" // 连续签到奖励
)

// PointsRecord 积分记录
type PointsRecord struct {
	ID          uint64     `gorm:"primaryKey" json:"id"`
	UserID      uint64     `gorm:"index;not null" json:"user_id"`
	Points      int        `gorm:"not null" json:"points"`       // 积分变动（正为增加，负为扣减）
	Balance     int        `gorm:"not null" json:"balance"`      // 变动后余额
	Type        PointsType `gorm:"size:50;not null" json:"type"` // 积分类型
	Description string     `gorm:"size:255" json:"description"`  // 描述
	RelatedID   uint64     `gorm:"default:0" json:"related_id"`  // 关联ID（如订单ID）
	CreatedAt   time.Time  `json:"created_at"`
}

// TableName 指定表名
func (PointsRecord) TableName() string {
	return "points_records"
}

// CheckIn 签到记录
type CheckIn struct {
	ID             uint64    `gorm:"primaryKey" json:"id"`
	UserID         uint64    `gorm:"uniqueIndex:idx_user_date;not null" json:"user_id"`
	CheckDate      time.Time `gorm:"uniqueIndex:idx_user_date;type:date" json:"check_date"` // 签到日期
	ContinuousDays int       `gorm:"default:1" json:"continuous_days"`                       // 连续签到天数
	PointsEarned   int       `gorm:"not null" json:"points_earned"`                          // 获得积分
	CreatedAt      time.Time `json:"created_at"`
}

// TableName 指定表名
func (CheckIn) TableName() string {
	return "check_ins"
}

// 签到奖励配置
const (
	CheckInBasePoints    = 10 // 基础签到积分
	CheckIn7DaysBonus    = 20 // 连续7天额外奖励
	CheckIn15DaysBonus   = 50 // 连续15天额外奖励
	CheckIn30DaysBonus   = 100 // 连续30天额外奖励
)
