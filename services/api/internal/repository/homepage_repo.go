package repository

import (
	"context"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

type HomePageRepo struct {
	db *gorm.DB
}

func NewHomePageRepo(db *gorm.DB) *HomePageRepo {
	return &HomePageRepo{db: db}
}

func (r *HomePageRepo) ListActiveBanners(ctx context.Context, limit int) ([]model.HomeBanner, error) {
	if limit <= 0 {
		limit = 3
	}

	var banners []model.HomeBanner
	err := r.db.WithContext(ctx).
		Where("status = ?", model.HomeBannerStatusActive).
		Order("sort ASC, id DESC").
		Limit(limit).
		Find(&banners).Error
	if err != nil {
		return nil, err
	}
	return banners, nil
}

func (r *HomePageRepo) ListActiveReviews(ctx context.Context, limit int) ([]model.HomeReview, error) {
	if limit <= 0 {
		limit = 3
	}

	var reviews []model.HomeReview
	err := r.db.WithContext(ctx).
		Where("status = ?", model.HomeBannerStatusActive).
		Order("sort ASC, id DESC").
		Limit(limit).
		Find(&reviews).Error
	if err != nil {
		return nil, err
	}
	return reviews, nil
}

func (r *HomePageRepo) GetSubscriptionByEmail(ctx context.Context, email string) (*model.NewsletterSubscription, error) {
	var subscription model.NewsletterSubscription
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&subscription).Error
	if err != nil {
		return nil, err
	}
	return &subscription, nil
}

func (r *HomePageRepo) CreateSubscription(ctx context.Context, email string) (*model.NewsletterSubscription, error) {
	subscription := &model.NewsletterSubscription{Email: email, Status: model.HomeBannerStatusActive}
	if err := r.db.WithContext(ctx).Create(subscription).Error; err != nil {
		return nil, err
	}
	return subscription, nil
}

func (r *HomePageRepo) UpdateSubscriptionStatus(ctx context.Context, id uint64, status string) error {
	return r.db.WithContext(ctx).
		Model(&model.NewsletterSubscription{}).
		Where("id = ?", id).
		Update("status", status).Error
}
