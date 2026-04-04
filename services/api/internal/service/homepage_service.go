package service

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrInvalidSubscriptionEmail = errors.New("订阅邮箱格式不正确")
)

type HomePageService struct {
	repo *repository.HomePageRepo
}

func NewHomePageService(repo *repository.HomePageRepo) *HomePageService {
	return &HomePageService{repo: repo}
}

func (s *HomePageService) ListBanners(ctx context.Context, limit int) ([]model.HomeBanner, error) {
	return s.repo.ListActiveBanners(ctx, limit)
}

func (s *HomePageService) ListReviews(ctx context.Context, limit int) ([]model.HomeReview, error) {
	return s.repo.ListActiveReviews(ctx, limit)
}

func (s *HomePageService) ListProductReviews(ctx context.Context, productID uint64, limit int) ([]model.HomeReview, error) {
	return s.repo.ListActiveReviewsByProductID(ctx, productID, limit)
}

func (s *HomePageService) Subscribe(ctx context.Context, email string) (*model.NewsletterSubscription, bool, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	if !isValidEmail(normalizedEmail) {
		return nil, false, ErrInvalidSubscriptionEmail
	}

	existing, err := s.repo.GetSubscriptionByEmail(ctx, normalizedEmail)
	if err == nil {
		if existing.Status != model.HomeBannerStatusActive {
			if updateErr := s.repo.UpdateSubscriptionStatus(ctx, existing.ID, model.HomeBannerStatusActive); updateErr != nil {
				return nil, false, updateErr
			}
			existing.Status = model.HomeBannerStatusActive
			return existing, false, nil
		}
		return existing, true, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, err
	}

	created, createErr := s.repo.CreateSubscription(ctx, normalizedEmail)
	if createErr != nil {
		return nil, false, createErr
	}
	return created, false, nil
}

func isValidEmail(email string) bool {
	if email == "" {
		return false
	}
	emailRegex := regexp.MustCompile(`^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`)
	return emailRegex.MatchString(email)
}
