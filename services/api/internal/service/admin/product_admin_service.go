package admin

import (
	"context"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/gorm"
)

// ProductAdminService 商品管理后台服务
type ProductAdminService struct {
	productRepo *repository.ProductRepo
	db          *gorm.DB
}

// NewProductAdminService 创建商品管理服务
func NewProductAdminService(productRepo *repository.ProductRepo, db *gorm.DB) *ProductAdminService {
	return &ProductAdminService{
		productRepo: productRepo,
		db:          db,
	}
}

// ========== 商品相关方法 ==========

// ListProducts 获取商品列表
func (s *ProductAdminService) ListProducts(ctx context.Context, query *repository.ProductQuery) ([]model.Product, int64, error) {
	return s.productRepo.ListProducts(ctx, query)
}

// GetProductByID 根据 ID 获取商品
func (s *ProductAdminService) GetProductByID(ctx context.Context, id uint64) (*model.Product, error) {
	return s.productRepo.GetProductByID(ctx, id)
}

// CreateProduct 创建商品
func (s *ProductAdminService) CreateProduct(ctx context.Context, product *model.Product) error {
	return s.productRepo.CreateProduct(ctx, product)
}

// UpdateProduct 更新商品（含 SKU/属性替换，在同一事务中完成）
func (s *ProductAdminService) UpdateProduct(ctx context.Context, product *model.Product) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 硬删除旧 SKU（避免 soft delete 残留占用 sku_code 唯一索引）
		if err := tx.Unscoped().Where("product_id = ?", product.ID).Delete(&model.ProductSku{}).Error; err != nil {
			return err
		}
		// 硬删除旧属性
		if err := tx.Unscoped().Where("product_id = ?", product.ID).Delete(&model.ProductAttr{}).Error; err != nil {
			return err
		}
		// 保存商品主体（排除关联，防止 GORM Save 默认忽略关联导致数据丢失）
		if err := tx.Omit("Skus", "Attrs").Save(product).Error; err != nil {
			return err
		}
		// 创建新 SKU
		for i := range product.Skus {
			product.Skus[i].ID = 0
			product.Skus[i].ProductID = product.ID
			if err := tx.Create(&product.Skus[i]).Error; err != nil {
				return err
			}
		}
		// 创建新属性
		for i := range product.Attrs {
			product.Attrs[i].ID = 0
			product.Attrs[i].ProductID = product.ID
			if err := tx.Create(&product.Attrs[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// DeleteProduct 删除商品
func (s *ProductAdminService) DeleteProduct(ctx context.Context, id uint64) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 删除商品关联的 SKU
		if err := tx.Where("product_id = ?", id).Delete(&model.ProductSku{}).Error; err != nil {
			return err
		}
		// 删除商品关联的图片
		if err := tx.Where("product_id = ?", id).Delete(&model.ProductImage{}).Error; err != nil {
			return err
		}
		// 删除商品关联的属性
		if err := tx.Where("product_id = ?", id).Delete(&model.ProductAttr{}).Error; err != nil {
			return err
		}
		// 删除商品
		return s.productRepo.DeleteProduct(ctx, id)
	})
}

// UpdateProductStatus 更新商品状态
func (s *ProductAdminService) UpdateProductStatus(ctx context.Context, id uint64, status string) error {
	product, err := s.productRepo.GetProductByID(ctx, id)
	if err != nil {
		return err
	}
	product.Status = status
	return s.productRepo.UpdateProduct(ctx, product)
}

// UpdateProductStock 更新商品库存（设置为指定值）
func (s *ProductAdminService) UpdateProductStock(ctx context.Context, id uint64, stock int) error {
	return s.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ?", id).
		Update("stock", stock).Error
}

// ========== 分类相关方法 ==========

// GetCategoryTree 获取分类树
func (s *ProductAdminService) GetCategoryTree(ctx context.Context) ([]model.Category, error) {
	return s.productRepo.GetCategoryTree(ctx)
}

// GetCategoryByID 根据 ID 获取分类
func (s *ProductAdminService) GetCategoryByID(ctx context.Context, id uint64) (*model.Category, error) {
	category, err := s.productRepo.GetCategoryByID(ctx, id)
	if err != nil {
		return nil, err
	}
	// 加载子分类
	s.loadCategoryChildren(ctx, category)
	return category, nil
}

// loadCategoryChildren 加载分类的子分类
func (s *ProductAdminService) loadCategoryChildren(ctx context.Context, category *model.Category) error {
	var children []model.Category
	err := s.db.WithContext(ctx).
		Where("parent_id = ?", category.ID).
		Order("sort ASC, id ASC").
		Find(&children).Error
	if err != nil {
		return err
	}
	category.Children = children
	for i := range category.Children {
		s.loadCategoryChildren(ctx, &category.Children[i])
	}
	return nil
}

// CreateCategory 创建分类
func (s *ProductAdminService) CreateCategory(ctx context.Context, category *model.Category) error {
	return s.productRepo.CreateCategory(ctx, category)
}

// UpdateCategory 更新分类
func (s *ProductAdminService) UpdateCategory(ctx context.Context, category *model.Category) error {
	return s.productRepo.UpdateCategory(ctx, category)
}

// DeleteCategory 删除分类
func (s *ProductAdminService) DeleteCategory(ctx context.Context, id uint64) error {
	return s.productRepo.DeleteCategory(ctx, id)
}

// HasProductsInCategory 检查分类下是否有商品
func (s *ProductAdminService) HasProductsInCategory(ctx context.Context, categoryID uint64) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("category_id = ?", categoryID).
		Count(&count).Error
	return count > 0, err
}

// ========== 品牌相关方法 ==========

// ListBrands 获取品牌列表
func (s *ProductAdminService) ListBrands(ctx context.Context, page, pageSize int, status string) ([]model.Brand, int64, error) {
	var brands []model.Brand
	var total int64

	db := s.db.WithContext(ctx).Model(&model.Brand{})
	if status != "" {
		db = db.Where("status = ?", status)
	}

	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := db.Order("sort ASC, id ASC").Offset(offset).Limit(pageSize).Find(&brands).Error
	return brands, total, err
}

// GetBrandByID 根据 ID 获取品牌
func (s *ProductAdminService) GetBrandByID(ctx context.Context, id uint64) (*model.Brand, error) {
	return s.productRepo.GetBrandByID(ctx, id)
}

// GetBrandByName 根据名称获取品牌
func (s *ProductAdminService) GetBrandByName(ctx context.Context, name string) (*model.Brand, error) {
	var brand model.Brand
	err := s.db.WithContext(ctx).Where("name = ?", name).First(&brand).Error
	if err != nil {
		return nil, err
	}
	return &brand, nil
}

// CreateBrand 创建品牌
func (s *ProductAdminService) CreateBrand(ctx context.Context, brand *model.Brand) error {
	return s.productRepo.CreateBrand(ctx, brand)
}

// UpdateBrand 更新品牌
func (s *ProductAdminService) UpdateBrand(ctx context.Context, brand *model.Brand) error {
	return s.productRepo.UpdateBrand(ctx, brand)
}

// DeleteBrand 删除品牌
func (s *ProductAdminService) DeleteBrand(ctx context.Context, id uint64) error {
	return s.productRepo.DeleteBrand(ctx, id)
}

// HasProductsInBrand 检查品牌下是否有商品
func (s *ProductAdminService) HasProductsInBrand(ctx context.Context, brandID uint64) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("brand_id = ?", brandID).
		Count(&count).Error
	return count > 0, err
}

// ========== SKU 相关方法 ==========

// GetSkuByID 根据 ID 获取 SKU
func (s *ProductAdminService) GetSkuByID(ctx context.Context, id uint64) (*model.ProductSku, error) {
	return s.productRepo.GetSkuByID(ctx, id)
}

// GetSkuByCode 根据编码获取 SKU
func (s *ProductAdminService) GetSkuByCode(ctx context.Context, skuCode string) (*model.ProductSku, error) {
	return s.productRepo.GetSkuByCode(ctx, skuCode)
}

// ListSkusByProductID 根据商品 ID 获取 SKU 列表
func (s *ProductAdminService) ListSkusByProductID(ctx context.Context, productID uint64) ([]model.ProductSku, error) {
	return s.productRepo.ListSkusByProductID(ctx, productID)
}
