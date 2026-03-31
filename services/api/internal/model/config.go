package model

import (
	"time"

	"gorm.io/gorm"
)

// Config 系统配置模型
type Config struct {
	ID            uint64         `gorm:"primaryKey" json:"id"`
	Key           string         `gorm:"uniqueIndex;size:255;not null" json:"key"`
	Value         string         `gorm:"type:jsonb;not null" json:"value"`
	Type          string         `gorm:"size:50;not null" json:"type"`      // string, number, boolean, json, array
	Category      string         `gorm:"size:100;not null" json:"category"` // points, member, feature, etc.
	Description   string         `gorm:"type:text" json:"description"`
	IsPublic      bool           `gorm:"default:false" json:"is_public"` // 是否公开给前端
	Version       int            `gorm:"default:1" json:"version"`
	PreviousValue string         `gorm:"type:jsonb" json:"previous_value"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (Config) TableName() string {
	return "configs"
}

// ConfigHistory 配置变更历史
type ConfigHistory struct {
	ID           uint64    `gorm:"primaryKey" json:"id"`
	ConfigID     uint64    `gorm:"not null;index" json:"config_id"`
	OldValue     string    `gorm:"type:jsonb" json:"old_value"`
	NewValue     string    `gorm:"type:jsonb;not null" json:"new_value"`
	ChangedBy    uint64    `gorm:"not null" json:"changed_by"` // Admin ID
	ChangeReason string    `gorm:"type:text" json:"change_reason"`
	CreatedAt    time.Time `json:"created_at"`
}

// TableName 指定表名
func (ConfigHistory) TableName() string {
	return "config_histories"
}

// ConfigType 配置类型常量
const (
	ConfigTypeString  = "string"
	ConfigTypeNumber  = "number"
	ConfigTypeBoolean = "boolean"
	ConfigTypeJSON    = "json"
	ConfigTypeArray   = "array"
)

// ConfigCategory 配置分类常量
const (
	ConfigCategoryPoints  = "points"
	ConfigCategoryMember  = "member"
	ConfigCategoryFeature = "feature"
	ConfigCategoryOrder   = "order"
	ConfigCategoryPayment = "payment"
	ConfigCategoryEmail   = "email"
	ConfigCategorySystem  = "system"
	ConfigCategorySEO     = "seo"
)

// 预置配置键
const (
	// 积分配置
	ConfigKeyPointsCheckinDaily = "points.checkin_daily" // 每日签到基础积分
	ConfigKeyPointsStreakBonus  = "points.streak_bonus"  // 连续签到奖励配置
	ConfigKeyPointsPurchaseRate = "points.purchase_rate" // 购物积分返还比例

	// 会员配置
	ConfigKeyMemberTiers = "member.tiers" // 会员等级配置

	// 功能开关
	ConfigKeyFeaturePreorder = "feature.preorder" // 预售功能开关
	ConfigKeyFeatureCoupon   = "feature.coupon"   // 优惠券功能开关
	ConfigKeyFeaturePoints   = "feature.points"   // 积分功能开关

	// 订单配置
	ConfigKeyOrderTimeoutMinutes  = "order.timeout_minutes"   // 订单超时时间（分钟）
	ConfigKeyOrderAutoConfirmDays = "order.auto_confirm_days" // 自动确认收货天数

	// 支付配置
	ConfigKeyPaymentMethods = "payment.methods" // 可用支付方式

	// 邮件配置
	ConfigKeyEmailTemplates = "email.templates" // 邮件模板配置

	ConfigKeySEOSiteTitle       = "seo_site_title"
	ConfigKeySEOSiteDescription = "seo_site_description"
	ConfigKeySEOSiteKeywords    = "seo_site_keywords"
	ConfigKeySEOOGImage         = "seo_og_image"
	ConfigKeySEOGoogleVerify    = "seo_google_verify"

	ConfigKeyGitHubClientID     = "github_client_id"
	ConfigKeyGitHubClientSecret = "github_client_secret"
	ConfigKeyGitHubRedirectURI  = "github_redirect_uri"
)
