package repository

import (
	"context"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

type PageListQuery struct {
	Keyword  string
	Status   *int
	Page     int
	PageSize int
}

type PageRepository struct {
	db *gorm.DB
}

func NewPageRepository(db *gorm.DB) *PageRepository {
	return &PageRepository{db: db}
}

func (r *PageRepository) Create(ctx context.Context, page *model.Page) error {
	return r.db.WithContext(ctx).Create(page).Error
}

func (r *PageRepository) GetByID(ctx context.Context, id uint) (*model.Page, error) {
	var page model.Page
	err := r.db.WithContext(ctx).First(&page, id).Error
	return &page, err
}

func (r *PageRepository) GetBySlug(ctx context.Context, slug string) (*model.Page, error) {
	var page model.Page
	err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&page).Error
	return &page, err
}

func (r *PageRepository) GetPublishedBySlug(ctx context.Context, slug string) (*model.Page, error) {
	var page model.Page
	err := r.db.WithContext(ctx).
		Where("slug = ? AND status = ?", slug, model.PageStatusPublished).
		First(&page).Error
	return &page, err
}

func (r *PageRepository) List(ctx context.Context, query *PageListQuery) ([]model.Page, int64, error) {
	var (
		pages []model.Page
		total int64
	)

	db := r.db.WithContext(ctx).Model(&model.Page{})
	if query.Keyword != "" {
		keyword := "%" + query.Keyword + "%"
		db = db.Where("slug LIKE ? OR title LIKE ?", keyword, keyword)
	}
	if query.Status != nil {
		db = db.Where("status = ?", *query.Status)
	}

	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.PageSize
	err := db.Order("sort_order ASC, updated_at DESC, id DESC").Offset(offset).Limit(query.PageSize).Find(&pages).Error
	return pages, total, err
}

func (r *PageRepository) Update(ctx context.Context, page *model.Page) error {
	return r.db.WithContext(ctx).Save(page).Error
}

func (r *PageRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.Page{}, id).Error
}

func (r *PageRepository) SlugExists(ctx context.Context, slug string, excludeID uint) (bool, error) {
	var count int64
	db := r.db.WithContext(ctx).Model(&model.Page{}).Where("slug = ?", slug)
	if excludeID > 0 {
		db = db.Where("id <> ?", excludeID)
	}
	if err := db.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
