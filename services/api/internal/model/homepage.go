package model

import (
	"time"

	"gorm.io/gorm"
)

const (
	HomeBannerStatusActive   = "active"
	HomeBannerStatusInactive = "inactive"
)

// HomeBanner 首页展示位。
type HomeBanner struct {
	ID          uint64         `gorm:"primaryKey" json:"id"`
	Title       string         `gorm:"size:120;not null" json:"title"`
	Subtitle    string         `gorm:"size:255" json:"subtitle"`
	Description string         `gorm:"type:text" json:"description"`
	ImageURL    string         `gorm:"size:500;not null" json:"image_url"`
	Link        string         `gorm:"size:500" json:"link"`
	ButtonText  string         `gorm:"size:60" json:"button_text"`
	Sort        int            `gorm:"default:0" json:"sort"`
	Status      string         `gorm:"size:20;default:active;index" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (HomeBanner) TableName() string {
	return "home_banners"
}

// HomeReview 首页评价。
type HomeReview struct {
	ID        uint64         `gorm:"primaryKey" json:"id"`
	ProductID uint64         `gorm:"default:0;index" json:"product_id"`
	Author    string         `gorm:"size:80;not null" json:"author"`
	Handle    string         `gorm:"size:120" json:"handle"`
	Avatar    string         `gorm:"size:10" json:"avatar"`
	Content   string         `gorm:"type:text;not null" json:"content"`
	Rating    int            `gorm:"default:5" json:"rating"`
	Sort      int            `gorm:"default:0" json:"sort"`
	Status    string         `gorm:"size:20;default:active;index" json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (HomeReview) TableName() string {
	return "home_reviews"
}

// NewsletterSubscription 首页订阅记录。
type NewsletterSubscription struct {
	ID        uint64         `gorm:"primaryKey" json:"id"`
	Email     string         `gorm:"size:180;not null;uniqueIndex" json:"email"`
	Status    string         `gorm:"size:20;default:active;index" json:"status"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (NewsletterSubscription) TableName() string {
	return "newsletter_subscriptions"
}
