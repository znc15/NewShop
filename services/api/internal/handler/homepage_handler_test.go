package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupHomePageHandlerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:homepage_handler?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("连接测试数据库失败: %v", err)
	}

	if err := db.AutoMigrate(&model.HomeBanner{}, &model.HomeReview{}, &model.NewsletterSubscription{}); err != nil {
		t.Fatalf("数据库迁移失败: %v", err)
	}

	return db
}

func TestHomePageHandlerEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupHomePageHandlerTestDB(t)
	repo := repository.NewHomePageRepo(db)
	svc := service.NewHomePageService(repo)
	handler := NewHomePageHandler(svc, zap.NewNop())

	if err := db.Create(&model.HomeBanner{Title: "Banner", Subtitle: "S", Description: "D", ImageURL: "img", Link: "/x", ButtonText: "Go", Sort: 1, Status: model.HomeBannerStatusActive}).Error; err != nil {
		t.Fatalf("创建 Banner 失败: %v", err)
	}
	if err := db.Create(&model.HomeReview{Author: "A", Handle: "@a", Avatar: "A", Content: "Review", Rating: 5, Sort: 1, Status: model.HomeBannerStatusActive}).Error; err != nil {
		t.Fatalf("创建 Review 失败: %v", err)
	}

	t.Run("获取 Banner", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/banners?limit=1", nil)
		rec := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(rec)
		ctx.Request = req

		handler.GetBanners(ctx)

		if rec.Code != http.StatusOK {
			t.Fatalf("期望状态码 200，实际为 %d", rec.Code)
		}
	})

	t.Run("获取评价", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/reviews/featured?limit=1", nil)
		rec := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(rec)
		ctx.Request = req

		handler.GetFeaturedReviews(ctx)

		if rec.Code != http.StatusOK {
			t.Fatalf("期望状态码 200，实际为 %d", rec.Code)
		}
	})

	t.Run("订阅邮箱", func(t *testing.T) {
		payload := map[string]string{"email": "test@example.com"}
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest(http.MethodPost, "/subscriptions", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(rec)
		ctx.Request = req

		handler.Subscribe(ctx)

		if rec.Code != http.StatusOK {
			t.Fatalf("期望状态码 200，实际为 %d", rec.Code)
		}
	})
}
