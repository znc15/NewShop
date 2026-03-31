package service

import (
	"context"
	"fmt"
	"testing"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupPageTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:page_service_%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("连接测试数据库失败: %v", err)
	}

	if err := db.AutoMigrate(&model.Page{}); err != nil {
		t.Fatalf("数据库迁移失败: %v", err)
	}

	return db
}

func TestGetPublishedPageBySlug(t *testing.T) {
	db := setupPageTestDB(t)
	repo := repository.NewPageRepository(db)
	svc := NewPageService(repo, db)

	published := &model.Page{Slug: "about", Title: "关于我们", Status: model.PageStatusPublished}
	draft := &model.Page{Slug: "draft-page", Title: "草稿页面", Status: model.PageStatusDraft}
	if err := db.Create(published).Error; err != nil {
		t.Fatalf("创建已发布页面失败: %v", err)
	}
	if err := db.Create(draft).Error; err != nil {
		t.Fatalf("创建草稿页面失败: %v", err)
	}

	t.Run("获取已发布页面成功", func(t *testing.T) {
		page, err := svc.GetPublishedPageBySlug(context.Background(), "about")
		if err != nil {
			t.Fatalf("获取已发布页面失败: %v", err)
		}
		if page.Title != "关于我们" {
			t.Fatalf("页面标题不匹配，实际为: %s", page.Title)
		}
	})

	t.Run("草稿页面不可公开访问", func(t *testing.T) {
		_, err := svc.GetPublishedPageBySlug(context.Background(), "draft-page")
		if err != ErrPageNotFound {
			t.Fatalf("期望返回 ErrPageNotFound，实际为: %v", err)
		}
	})
}

func TestCreateAndUpdatePage(t *testing.T) {
	db := setupPageTestDB(t)
	repo := repository.NewPageRepository(db)
	svc := NewPageService(repo, db)

	page, err := svc.CreatePage(context.Background(), CreatePageInput{
		Slug:      "contact",
		Title:     "联系我们",
		Content:   "联系方式",
		Status:    model.PageStatusDraft,
		SortOrder: 10,
	})
	if err != nil {
		t.Fatalf("创建页面失败: %v", err)
	}

	if page.Slug != "contact" || page.SortOrder != 10 {
		t.Fatalf("创建页面结果不符合预期: %+v", page)
	}

	_, err = svc.CreatePage(context.Background(), CreatePageInput{
		Slug:   "contact",
		Title:  "重复页面",
		Status: model.PageStatusDraft,
	})
	if err != ErrPageSlugExists {
		t.Fatalf("期望重复 slug 返回 ErrPageSlugExists，实际为: %v", err)
	}

	newTitle := "联系我们-更新"
	publishedStatus := model.PageStatusPublished
	updated, err := svc.UpdatePage(context.Background(), page.ID, UpdatePageInput{
		Title:  &newTitle,
		Status: &publishedStatus,
	})
	if err != nil {
		t.Fatalf("更新页面失败: %v", err)
	}

	if updated.Title != newTitle || updated.Status != model.PageStatusPublished {
		t.Fatalf("更新页面结果不符合预期: %+v", updated)
	}
}

func TestListPages(t *testing.T) {
	db := setupPageTestDB(t)
	repo := repository.NewPageRepository(db)
	svc := NewPageService(repo, db)

	pages := []model.Page{
		{Slug: "home", Title: "首页", Status: model.PageStatusPublished, SortOrder: 1},
		{Slug: "faq", Title: "常见问题", Status: model.PageStatusPublished, SortOrder: 2},
		{Slug: "draft", Title: "草稿", Status: model.PageStatusDraft, SortOrder: 3},
	}
	for _, page := range pages {
		if err := db.Create(&page).Error; err != nil {
			t.Fatalf("创建测试页面失败: %v", err)
		}
	}

	status := model.PageStatusPublished
	result, err := svc.ListPages(context.Background(), 1, 10, "", &status)
	if err != nil {
		t.Fatalf("获取页面列表失败: %v", err)
	}

	if result.Total != 2 {
		t.Fatalf("期望 2 个已发布页面，实际为: %d", result.Total)
	}
	if len(result.Pages) != 2 {
		t.Fatalf("期望返回 2 条页面记录，实际为: %d", len(result.Pages))
	}
	if result.Pages[0].Slug != "home" {
		t.Fatalf("期望按排序返回首页，实际第一条为: %s", result.Pages[0].Slug)
	}

	if _, err := svc.ListPages(context.Background(), 1, 10, "", intPtr(3)); err != ErrInvalidPageStatus {
		t.Fatalf("期望非法状态返回 ErrInvalidPageStatus，实际为: %v", err)
	}
}

func intPtr(v int) *int {
	return &v
}
