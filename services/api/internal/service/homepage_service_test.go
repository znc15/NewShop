package service

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupHomePageTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:homepage_service_%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("连接测试数据库失败: %v", err)
	}

	if err := db.AutoMigrate(&model.HomeBanner{}, &model.HomeReview{}, &model.NewsletterSubscription{}); err != nil {
		t.Fatalf("数据库迁移失败: %v", err)
	}

	return db
}

func TestHomePageServiceListBannersAndReviews(t *testing.T) {
	db := setupHomePageTestDB(t)
	repo := repository.NewHomePageRepo(db)
	svc := NewHomePageService(repo)

	banners := []model.HomeBanner{
		{Title: "Banner 1", Subtitle: "S1", Description: "D1", ImageURL: "img1", Link: "/a", ButtonText: "Go", Sort: 2, Status: model.HomeBannerStatusActive},
		{Title: "Banner 2", Subtitle: "S2", Description: "D2", ImageURL: "img2", Link: "/b", ButtonText: "Go", Sort: 1, Status: model.HomeBannerStatusActive},
		{Title: "Banner 3", Subtitle: "S3", Description: "D3", ImageURL: "img3", Link: "/c", ButtonText: "Go", Sort: 3, Status: model.HomeBannerStatusInactive},
	}
	for _, banner := range banners {
		if err := db.Create(&banner).Error; err != nil {
			t.Fatalf("创建 Banner 失败: %v", err)
		}
	}

	reviews := []model.HomeReview{
		{Author: "A", Handle: "@a", Avatar: "A", Content: "Review A", Rating: 5, Sort: 2, Status: model.HomeBannerStatusActive},
		{Author: "B", Handle: "@b", Avatar: "B", Content: "Review B", Rating: 4, Sort: 1, Status: model.HomeBannerStatusActive},
	}
	for _, review := range reviews {
		if err := db.Create(&review).Error; err != nil {
			t.Fatalf("创建 Review 失败: %v", err)
		}
	}

	t.Run("获取 Banner 列表", func(t *testing.T) {
		items, err := svc.ListBanners(context.Background(), 2)
		if err != nil {
			t.Fatalf("获取 Banner 失败: %v", err)
		}
		if len(items) != 2 {
			t.Fatalf("期望 2 条 Banner，实际 %d 条", len(items))
		}
		if items[0].Sort != 1 {
			t.Fatalf("期望按 sort 升序返回，实际第一条 sort=%d", items[0].Sort)
		}
	})

	t.Run("获取评价列表", func(t *testing.T) {
		items, err := svc.ListReviews(context.Background(), 2)
		if err != nil {
			t.Fatalf("获取评价失败: %v", err)
		}
		if len(items) != 2 {
			t.Fatalf("期望 2 条评价，实际 %d 条", len(items))
		}
		if items[0].Sort != 1 {
			t.Fatalf("期望按 sort 升序返回，实际第一条 sort=%d", items[0].Sort)
		}
	})
}

func TestHomePageServiceSubscribe(t *testing.T) {
	db := setupHomePageTestDB(t)
	repo := repository.NewHomePageRepo(db)
	svc := NewHomePageService(repo)

	t.Run("非法邮箱", func(t *testing.T) {
		_, _, err := svc.Subscribe(context.Background(), "invalid-email")
		if !errors.Is(err, ErrInvalidSubscriptionEmail) {
			t.Fatalf("期望返回邮箱格式错误，实际为: %v", err)
		}
	})

	t.Run("首次订阅", func(t *testing.T) {
		subscription, already, err := svc.Subscribe(context.Background(), "reader@example.com")
		if err != nil {
			t.Fatalf("首次订阅失败: %v", err)
		}
		if already {
			t.Fatal("首次订阅不应返回已订阅")
		}
		if subscription.Email != "reader@example.com" {
			t.Fatalf("订阅邮箱不匹配，实际为: %s", subscription.Email)
		}
	})

	t.Run("重复订阅", func(t *testing.T) {
		_, already, err := svc.Subscribe(context.Background(), "reader@example.com")
		if err != nil {
			t.Fatalf("重复订阅失败: %v", err)
		}
		if !already {
			t.Fatal("重复订阅应返回 already=true")
		}
	})
}
