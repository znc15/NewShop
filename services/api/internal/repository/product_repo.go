package repository

import (
	"context"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

type ProductRepo struct {
	db *gorm.DB
}

func NewProductRepo(db *gorm.DB) *ProductRepo {
	return &ProductRepo{db: db}
}

// ========== Category 分类相关方法 ==========

func (r *ProductRepo) CreateCategory(ctx context.Context, category *model.Category) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *ProductRepo) GetCategoryByID(ctx context.Context, id uint64) (*model.Category, error) {
	var category model.Category
	err := r.db.WithContext(ctx).First(&category, id).Error
	return &category, err
}

func (r *ProductRepo) GetCategoryTree(ctx context.Context) ([]model.Category, error) {
	var categories []model.Category
	err := r.db.WithContext(ctx).
		Where("parent_id = 0 AND status = ?", "active").
		Order("sort ASC, id ASC").
		Find(&categories).Error
	if err != nil {
		return nil, err
	}
	for i := range categories {
		r.loadChildren(ctx, &categories[i])
	}
	return categories, nil
}

func (r *ProductRepo) loadChildren(ctx context.Context, category *model.Category) error {
	var children []model.Category
	err := r.db.WithContext(ctx).
		Where("parent_id = ? AND status = ?", category.ID, "active").
		Order("sort ASC, id ASC").
		Find(&children).Error
	if err != nil {
		return err
	}
	category.Children = children
	for i := range category.Children {
		r.loadChildren(ctx, &category.Children[i])
	}
	return nil
}

func (r *ProductRepo) UpdateCategory(ctx context.Context, category *model.Category) error {
	return r.db.WithContext(ctx).Save(category).Error
}

func (r *ProductRepo) DeleteCategory(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.Category{}, id).Error
}

// ========== Brand 品牌相关方法 ==========

func (r *ProductRepo) CreateBrand(ctx context.Context, brand *model.Brand) error {
	return r.db.WithContext(ctx).Create(brand).Error
}

func (r *ProductRepo) GetBrandByID(ctx context.Context, id uint64) (*model.Brand, error) {
	var brand model.Brand
	err := r.db.WithContext(ctx).First(&brand, id).Error
	return &brand, err
}

func (r *ProductRepo) ListBrands(ctx context.Context, page, pageSize int) ([]model.Brand, int64, error) {
	var brands []model.Brand
	var total int64

	db := r.db.WithContext(ctx).Model(&model.Brand{}).Where("status = ?", "active")
	db.Count(&total)

	offset := (page - 1) * pageSize
	err := db.Order("sort ASC, id ASC").Offset(offset).Limit(pageSize).Find(&brands).Error
	return brands, total, err
}

func (r *ProductRepo) UpdateBrand(ctx context.Context, brand *model.Brand) error {
	return r.db.WithContext(ctx).Save(brand).Error
}

func (r *ProductRepo) DeleteBrand(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.Brand{}, id).Error
}

// ========== Product 商品相关方法 ==========

func (r *ProductRepo) CreateProduct(ctx context.Context, product *model.Product) error {
	return r.db.WithContext(ctx).Create(product).Error
}

func (r *ProductRepo) GetProductByID(ctx context.Context, id uint64) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Brand").
		Preload("Skus").
		Preload("Attrs").
		Preload("ProductImages").
		First(&product, id).Error
	return &product, err
}

func (r *ProductRepo) ListProducts(ctx context.Context, query *ProductQuery) ([]model.Product, int64, error) {
	var products []model.Product
	var total int64

	db := r.db.WithContext(ctx).Model(&model.Product{})

	if query.CategoryID > 0 {
		db = db.Where("category_id = ?", query.CategoryID)
	}
	if query.BrandID > 0 {
		db = db.Where("brand_id = ?", query.BrandID)
	}
	if query.Status != "" {
		db = db.Where("status = ?", query.Status)
	}
	if query.Keyword != "" {
		db = db.Where("name LIKE ?", "%"+query.Keyword+"%")
	}

	db.Count(&total)

	offset := (query.Page - 1) * query.PageSize

	// 动态排序
	orderClause := "sort ASC, id DESC"
	if query.OrderBy != "" {
		orderDirection := "ASC"
		if query.OrderDesc {
			orderDirection = "DESC"
		}
		orderClause = query.OrderBy + " " + orderDirection
	}

	err := db.
		Preload("Category").
		Preload("Brand").
		Order(orderClause).
		Offset(offset).
		Limit(query.PageSize).
		Find(&products).Error
	return products, total, err
}

func (r *ProductRepo) UpdateProduct(ctx context.Context, product *model.Product) error {
	return r.db.WithContext(ctx).Save(product).Error
}

func (r *ProductRepo) DeleteProduct(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.Product{}, id).Error
}

func (r *ProductRepo) UpdateProductStock(ctx context.Context, id uint64, delta int) error {
	return r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ?", id).
		UpdateColumn("stock", r.db.Raw("stock + ?", delta)).Error
}

func (r *ProductRepo) UpdateProductSales(ctx context.Context, id uint64, delta int) error {
	return r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ?", id).
		UpdateColumn("sales", r.db.Raw("sales + ?", delta)).Error
}

// ========== ProductSku SKU相关方法 ==========

func (r *ProductRepo) CreateSku(ctx context.Context, sku *model.ProductSku) error {
	return r.db.WithContext(ctx).Create(sku).Error
}

func (r *ProductRepo) GetSkuByID(ctx context.Context, id uint64) (*model.ProductSku, error) {
	var sku model.ProductSku
	err := r.db.WithContext(ctx).First(&sku, id).Error
	return &sku, err
}

func (r *ProductRepo) GetSkuByCode(ctx context.Context, skuCode string) (*model.ProductSku, error) {
	var sku model.ProductSku
	err := r.db.WithContext(ctx).Where("sku_code = ?", skuCode).First(&sku).Error
	return &sku, err
}

func (r *ProductRepo) ListSkusByProductID(ctx context.Context, productID uint64) ([]model.ProductSku, error) {
	var skus []model.ProductSku
	err := r.db.WithContext(ctx).
		Where("product_id = ?", productID).
		Order("id ASC").
		Find(&skus).Error
	return skus, err
}

func (r *ProductRepo) UpdateSku(ctx context.Context, sku *model.ProductSku) error {
	return r.db.WithContext(ctx).Save(sku).Error
}

func (r *ProductRepo) DeleteSku(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.ProductSku{}, id).Error
}

func (r *ProductRepo) UpdateSkuStock(ctx context.Context, id uint64, delta int) error {
	return r.db.WithContext(ctx).
		Model(&model.ProductSku{}).
		Where("id = ?", id).
		UpdateColumn("stock", r.db.Raw("stock + ?", delta)).Error
}

// ========== ProductImage 商品图片相关方法 ==========

func (r *ProductRepo) CreateProductImage(ctx context.Context, image *model.ProductImage) error {
	return r.db.WithContext(ctx).Create(image).Error
}

func (r *ProductRepo) ListImagesByProductID(ctx context.Context, productID uint64) ([]model.ProductImage, error) {
	var images []model.ProductImage
	err := r.db.WithContext(ctx).
		Where("product_id = ?", productID).
		Order("sort ASC, id ASC").
		Find(&images).Error
	return images, err
}

func (r *ProductRepo) DeleteProductImage(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.ProductImage{}, id).Error
}

// ========== ProductAttr 商品属性相关方法 ==========

func (r *ProductRepo) CreateProductAttr(ctx context.Context, attr *model.ProductAttr) error {
	return r.db.WithContext(ctx).Create(attr).Error
}

func (r *ProductRepo) ListAttrsByProductID(ctx context.Context, productID uint64) ([]model.ProductAttr, error) {
	var attrs []model.ProductAttr
	err := r.db.WithContext(ctx).
		Where("product_id = ?", productID).
		Order("sort ASC, id ASC").
		Find(&attrs).Error
	return attrs, err
}

func (r *ProductRepo) DeleteProductAttr(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.ProductAttr{}, id).Error
}

// ========== ProductQuery 商品查询参数 ==========

type ProductQuery struct {
	CategoryID uint64
	BrandID    uint64
	Status     string
	Keyword    string
	Page       int
	PageSize   int
	OrderBy    string
	OrderDesc  bool
}

func NewProductQuery() *ProductQuery {
	return &ProductQuery{
		Page:     1,
		PageSize: 20,
	}
}
