package service

import (
	"context"
	"errors"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrProductNotFound  = errors.New("商品不存在")
	ErrCategoryNotFound = errors.New("分类不存在")
	ErrBrandNotFound    = errors.New("品牌不存在")
	ErrInvalidPrice     = errors.New("价格无效")
	ErrOutOfStock       = errors.New("库存不足")
)

type ProductService struct {
	repo *repository.ProductRepo
	db   *gorm.DB
}

func NewProductService(repo *repository.ProductRepo, db *gorm.DB) *ProductService {
	return &ProductService{repo: repo, db: db}
}

// ProductListResult 商品列表结果
type ProductListResult struct {
	Products []model.Product `json:"products"`
	Total    int64           `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"page_size"`
}

// GetProductList 分页查询商品列表
func (s *ProductService) GetProductList(ctx context.Context, categoryID, brandID uint64, status string, page, pageSize int) (*ProductListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := repository.NewProductQuery()
	query.CategoryID = categoryID
	query.BrandID = brandID
	query.Status = status
	query.Page = page
	query.PageSize = pageSize

	products, total, err := s.repo.ListProducts(ctx, query)
	if err != nil {
		return nil, err
	}

	return &ProductListResult{
		Products: products,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetProductDetail 获取商品详情
func (s *ProductService) GetProductDetail(ctx context.Context, id uint64) (*model.Product, error) {
	product, err := s.repo.GetProductByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}
	return product, nil
}

// GetProductsByCategory 按分类查询商品
func (s *ProductService) GetProductsByCategory(ctx context.Context, categoryID uint64, page, pageSize int) (*ProductListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := repository.NewProductQuery()
	query.CategoryID = categoryID
	query.Status = "on_sale"
	query.Page = page
	query.PageSize = pageSize

	products, total, err := s.repo.ListProducts(ctx, query)
	if err != nil {
		return nil, err
	}

	return &ProductListResult{
		Products: products,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// SearchResult 搜索结果
type SearchResult struct {
	Products []model.Product `json:"products"`
	Total    int64           `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"page_size"`
}

// SearchProducts 商品搜索（后续集成 Meilisearch）
func (s *ProductService) SearchProducts(ctx context.Context, keyword string, page, pageSize int) (*SearchResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// 当前使用数据库 LIKE 查询，后续替换为 Meilisearch
	query := repository.NewProductQuery()
	query.Keyword = keyword
	query.Status = "on_sale"
	query.Page = page
	query.PageSize = pageSize

	products, total, err := s.repo.ListProducts(ctx, query)
	if err != nil {
		return nil, err
	}

	return &SearchResult{
		Products: products,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// CategoryTreeResult 分类树结果
type CategoryTreeResult struct {
	Categories []model.Category `json:"categories"`
}

// GetCategories 获取分类列表（树形结构）
func (s *ProductService) GetCategories(ctx context.Context) (*CategoryTreeResult, error) {
	categories, err := s.repo.GetCategoryTree(ctx)
	if err != nil {
		return nil, err
	}

	return &CategoryTreeResult{
		Categories: categories,
	}, nil
}

// GetCategoryByID 获取单个分类
func (s *ProductService) GetCategoryByID(ctx context.Context, id uint64) (*model.Category, error) {
	category, err := s.repo.GetCategoryByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrCategoryNotFound
		}
		return nil, err
	}
	return category, nil
}

// BrandListResult 品牌列表结果
type BrandListResult struct {
	Brands   []model.Brand `json:"brands"`
	Total    int64         `json:"total"`
	Page     int           `json:"page"`
	PageSize int           `json:"page_size"`
}

// GetBrands 获取品牌列表
func (s *ProductService) GetBrands(ctx context.Context, page, pageSize int) (*BrandListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	brands, total, err := s.repo.ListBrands(ctx, page, pageSize)
	if err != nil {
		return nil, err
	}

	return &BrandListResult{
		Brands:   brands,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetBrandByID 获取单个品牌
func (s *ProductService) GetBrandByID(ctx context.Context, id uint64) (*model.Brand, error) {
	brand, err := s.repo.GetBrandByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBrandNotFound
		}
		return nil, err
	}
	return brand, nil
}

// GetProductsByBrand 按品牌查询商品
func (s *ProductService) GetProductsByBrand(ctx context.Context, brandID uint64, page, pageSize int) (*ProductListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := repository.NewProductQuery()
	query.BrandID = brandID
	query.Status = "on_sale"
	query.Page = page
	query.PageSize = pageSize

	products, total, err := s.repo.ListProducts(ctx, query)
	if err != nil {
		return nil, err
	}

	return &ProductListResult{
		Products: products,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// CheckStock 检查库存
func (s *ProductService) CheckStock(ctx context.Context, productID uint64, quantity int) (bool, error) {
	product, err := s.repo.GetProductByID(ctx, productID)
	if err != nil {
		return false, err
	}
	return product.Stock >= quantity, nil
}

// DecreaseStock 扣减库存
func (s *ProductService) DecreaseStock(ctx context.Context, productID uint64, quantity int) error {
	ok, err := s.CheckStock(ctx, productID, quantity)
	if err != nil {
		return err
	}
	if !ok {
		return ErrOutOfStock
	}
	return s.repo.UpdateProductStock(ctx, productID, -quantity)
}

// IncreaseStock 增加库存（用于订单取消等场景）
func (s *ProductService) IncreaseStock(ctx context.Context, productID uint64, quantity int) error {
	return s.repo.UpdateProductStock(ctx, productID, quantity)
}

// IncreaseSales 增加销量
func (s *ProductService) IncreaseSales(ctx context.Context, productID uint64, quantity int) error {
	return s.repo.UpdateProductSales(ctx, productID, quantity)
}
