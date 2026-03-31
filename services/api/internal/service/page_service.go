package service

import (
	"context"
	"errors"
	"strings"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrPageNotFound      = errors.New("页面不存在")
	ErrPageSlugExists    = errors.New("页面标识已存在")
	ErrInvalidPageStatus = errors.New("页面状态无效")
	ErrInvalidPageInput  = errors.New("页面参数无效")
)

type PageService struct {
	repo *repository.PageRepository
	db   *gorm.DB
}

type PageListResult struct {
	Pages    []model.Page `json:"pages"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
}

type CreatePageInput struct {
	Slug      string
	Title     string
	Content   string
	MetaTitle string
	MetaDesc  string
	Status    int
	SortOrder int
}

type UpdatePageInput struct {
	Slug      *string
	Title     *string
	Content   *string
	MetaTitle *string
	MetaDesc  *string
	Status    *int
	SortOrder *int
}

func NewPageService(repo *repository.PageRepository, db *gorm.DB) *PageService {
	return &PageService{repo: repo, db: db}
}

func (s *PageService) GetPublishedPageBySlug(ctx context.Context, slug string) (*model.Page, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, ErrPageNotFound
	}

	page, err := s.repo.GetPublishedBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPageNotFound
		}
		return nil, err
	}

	return page, nil
}

func (s *PageService) GetPageByID(ctx context.Context, id uint) (*model.Page, error) {
	page, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPageNotFound
		}
		return nil, err
	}
	return page, nil
}

func (s *PageService) ListPages(ctx context.Context, page, pageSize int, keyword string, status *int) (*PageListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	if status != nil && !isValidPageStatus(*status) {
		return nil, ErrInvalidPageStatus
	}

	pages, total, err := s.repo.List(ctx, &repository.PageListQuery{
		Keyword:  strings.TrimSpace(keyword),
		Status:   status,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, err
	}

	return &PageListResult{
		Pages:    pages,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func (s *PageService) CreatePage(ctx context.Context, input CreatePageInput) (*model.Page, error) {
	page := &model.Page{
		Slug:      strings.TrimSpace(input.Slug),
		Title:     strings.TrimSpace(input.Title),
		Content:   input.Content,
		MetaTitle: strings.TrimSpace(input.MetaTitle),
		MetaDesc:  strings.TrimSpace(input.MetaDesc),
		Status:    input.Status,
		SortOrder: input.SortOrder,
	}

	if err := s.validatePage(page); err != nil {
		return nil, err
	}

	exists, err := s.repo.SlugExists(ctx, page.Slug, 0)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrPageSlugExists
	}

	if err := s.repo.Create(ctx, page); err != nil {
		return nil, err
	}

	return page, nil
}

func (s *PageService) UpdatePage(ctx context.Context, id uint, input UpdatePageInput) (*model.Page, error) {
	page, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPageNotFound
		}
		return nil, err
	}

	if input.Slug != nil {
		page.Slug = strings.TrimSpace(*input.Slug)
	}
	if input.Title != nil {
		page.Title = strings.TrimSpace(*input.Title)
	}
	if input.Content != nil {
		page.Content = *input.Content
	}
	if input.MetaTitle != nil {
		page.MetaTitle = strings.TrimSpace(*input.MetaTitle)
	}
	if input.MetaDesc != nil {
		page.MetaDesc = strings.TrimSpace(*input.MetaDesc)
	}
	if input.Status != nil {
		page.Status = *input.Status
	}
	if input.SortOrder != nil {
		page.SortOrder = *input.SortOrder
	}

	if err := s.validatePage(page); err != nil {
		return nil, err
	}

	exists, err := s.repo.SlugExists(ctx, page.Slug, page.ID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrPageSlugExists
	}

	if err := s.repo.Update(ctx, page); err != nil {
		return nil, err
	}

	return page, nil
}

func (s *PageService) DeletePage(ctx context.Context, id uint) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPageNotFound
		}
		return err
	}

	return s.repo.Delete(ctx, id)
}

func (s *PageService) validatePage(page *model.Page) error {
	if page.Slug == "" || page.Title == "" {
		return ErrInvalidPageInput
	}
	if !isValidPageStatus(page.Status) {
		return ErrInvalidPageStatus
	}
	return nil
}

func isValidPageStatus(status int) bool {
	return status == model.PageStatusDraft || status == model.PageStatusPublished
}
