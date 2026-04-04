package service

import (
	"context"
	"sync"
	"testing"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupProductTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("连接测试数据库失败: %v", err)
	}

	err = db.AutoMigrate(&model.Product{}, &model.ProductSku{}, &model.ProductAttr{}, &model.Category{}, &model.Brand{})
	if err != nil {
		t.Fatalf("数据库迁移失败: %v", err)
	}

	return db
}

// TestGetProductList 测试商品列表查询
func TestGetProductList(t *testing.T) {
	db := setupProductTestDB(t)

	// 创建测试数据
	category := &model.Category{
		Name:  "测试分类",
		Level: 1,
		Sort:  1,
	}
	db.Create(category)

	brand := &model.Brand{
		Name: "测试品牌",
		Logo: "test.png",
		Sort: 1,
	}
	db.Create(brand)

	products := []model.Product{
		{
			Name:       "商品1",
			CategoryID: category.ID,
			BrandID:    brand.ID,
			Price:      100.00,
			Stock:      50,
			Status:     "on_sale",
			Sort:       1,
		},
		{
			Name:       "商品2",
			CategoryID: category.ID,
			BrandID:    brand.ID,
			Price:      200.00,
			Stock:      30,
			Status:     "on_sale",
			Sort:       2,
		},
		{
			Name:       "下架商品",
			CategoryID: category.ID,
			BrandID:    brand.ID,
			Price:      150.00,
			Stock:      10,
			Status:     "off_sale", // 已下架
			Sort:       3,
		},
	}
	for _, p := range products {
		db.Create(&p)
	}

	// 创建 ProductService
	repo := repository.NewProductRepo(db)
	svc := NewProductService(repo, db)

	// 测试分页查询
	t.Run("分页查询", func(t *testing.T) {
		result, err := svc.GetProductList(context.Background(), 0, 0, "on_sale", 1, 10)
		if err != nil {
			t.Errorf("查询失败: %v", err)
		}
		if result.Total != 2 { // 只返回上架商品
			t.Errorf("期望 2 条上架商品，实际 %d 条", result.Total)
		}
		if len(result.Products) != 2 {
			t.Errorf("期望返回 2 条记录，实际 %d 条", len(result.Products))
		}
	})

	// 测试分类过滤
	t.Run("分类过滤", func(t *testing.T) {
		result, err := svc.GetProductList(context.Background(), category.ID, 0, "on_sale", 1, 10)
		if err != nil {
			t.Errorf("查询失败: %v", err)
		}
		if result.Total != 2 {
			t.Errorf("期望 2 条记录，实际 %d 条", result.Total)
		}
		for _, p := range result.Products {
			if p.CategoryID != category.ID {
				t.Errorf("分类ID不匹配")
			}
		}
	})
}

// TestGetProductListStatusAlias 测试状态别名兼容（on_sale <-> active, off_sale <-> inactive）
func TestGetProductListStatusAlias(t *testing.T) {
	db := setupProductTestDB(t)

	category := &model.Category{
		Name:  "状态兼容分类",
		Level: 1,
		Sort:  1,
	}
	db.Create(category)

	brand := &model.Brand{
		Name: "状态兼容品牌",
		Logo: "test.png",
		Sort: 1,
	}
	db.Create(brand)

	products := []model.Product{
		{Name: "上架旧值", CategoryID: category.ID, BrandID: brand.ID, Price: 100, Stock: 10, Status: "on_sale", Sort: 1},
		{Name: "上架新值", CategoryID: category.ID, BrandID: brand.ID, Price: 120, Stock: 10, Status: "active", Sort: 2},
		{Name: "下架旧值", CategoryID: category.ID, BrandID: brand.ID, Price: 90, Stock: 10, Status: "off_sale", Sort: 3},
		{Name: "下架新值", CategoryID: category.ID, BrandID: brand.ID, Price: 80, Stock: 10, Status: "inactive", Sort: 4},
	}
	for _, p := range products {
		db.Create(&p)
	}

	repo := repository.NewProductRepo(db)
	svc := NewProductService(repo, db)

	t.Run("on_sale 查询兼容 active", func(t *testing.T) {
		result, err := svc.GetProductList(context.Background(), 0, 0, "on_sale", 1, 20)
		if err != nil {
			t.Fatalf("查询失败: %v", err)
		}
		if result.Total != 2 {
			t.Fatalf("期望 2 条上架商品，实际 %d 条", result.Total)
		}
	})

	t.Run("active 查询兼容 on_sale", func(t *testing.T) {
		result, err := svc.GetProductList(context.Background(), 0, 0, "active", 1, 20)
		if err != nil {
			t.Fatalf("查询失败: %v", err)
		}
		if result.Total != 2 {
			t.Fatalf("期望 2 条上架商品，实际 %d 条", result.Total)
		}
	})

	t.Run("inactive 查询兼容 off_sale", func(t *testing.T) {
		result, err := svc.GetProductList(context.Background(), 0, 0, "inactive", 1, 20)
		if err != nil {
			t.Fatalf("查询失败: %v", err)
		}
		if result.Total != 2 {
			t.Fatalf("期望 2 条下架商品，实际 %d 条", result.Total)
		}
	})
}

// TestGetProductListWithFilters 测试筛选参数（品牌、价格、排序）
func TestGetProductListWithFilters(t *testing.T) {
	db := setupProductTestDB(t)

	category := &model.Category{Name: "筛选分类", Level: 1, Sort: 1}
	db.Create(category)

	brandA := &model.Brand{Name: "品牌A", Logo: "a.png", Sort: 1}
	brandB := &model.Brand{Name: "品牌B", Logo: "b.png", Sort: 2}
	db.Create(brandA)
	db.Create(brandB)

	products := []model.Product{
		{Name: "A-低价", CategoryID: category.ID, BrandID: brandA.ID, Price: 100, Stock: 10, Status: "on_sale", Sales: 5, Sort: 1},
		{Name: "B-中价", CategoryID: category.ID, BrandID: brandB.ID, Price: 300, Stock: 10, Status: "active", Sales: 9, Sort: 2},
		{Name: "A-高价", CategoryID: category.ID, BrandID: brandA.ID, Price: 500, Stock: 10, Status: "on_sale", Sales: 3, Sort: 3},
	}
	for _, p := range products {
		db.Create(&p)
	}

	repo := repository.NewProductRepo(db)
	svc := NewProductService(repo, db)

	minPrice := int64(150)
	maxPrice := int64(600)

	t.Run("品牌+价格筛选", func(t *testing.T) {
		result, err := svc.GetProductListWithFilters(context.Background(), &ProductListFilters{
			BrandID:   brandA.ID,
			Status:    "on_sale",
			MinPrice:  &minPrice,
			MaxPrice:  &maxPrice,
			SortBy:    "price",
			SortOrder: "asc",
			Page:      1,
			PageSize:  20,
		})
		if err != nil {
			t.Fatalf("查询失败: %v", err)
		}
		if result.Total != 1 {
			t.Fatalf("期望 1 条记录，实际 %d 条", result.Total)
		}
		if len(result.Products) != 1 || result.Products[0].Name != "A-高价" {
			t.Fatalf("筛选结果不符合预期")
		}
	})

	t.Run("价格倒序排序", func(t *testing.T) {
		result, err := svc.GetProductListWithFilters(context.Background(), &ProductListFilters{
			Status:    "on_sale",
			SortBy:    "price",
			SortOrder: "desc",
			Page:      1,
			PageSize:  20,
		})
		if err != nil {
			t.Fatalf("查询失败: %v", err)
		}
		if len(result.Products) < 2 {
			t.Fatalf("数据不足，无法验证排序")
		}
		if result.Products[0].Price < result.Products[1].Price {
			t.Fatalf("价格排序未生效")
		}
	})
}

// TestGetProductDetail 测试商品详情
func TestGetProductDetail(t *testing.T) {
	db := setupProductTestDB(t)

	// 创建测试数据
	product := &model.Product{
		Name:   "测试商品",
		Price:  9999, // 99.99 元，以分为单位
		Stock:  100,
		Status: "on_sale",
		Sort:   1,
	}
	db.Create(product)

	repo := repository.NewProductRepo(db)
	svc := NewProductService(repo, db)

	// 测试正常查询
	t.Run("正常查询", func(t *testing.T) {
		detail, err := svc.GetProductDetail(context.Background(), product.ID)
		if err != nil {
			t.Errorf("查询失败: %v", err)
		}
		if detail.Name != product.Name {
			t.Errorf("商品名称不匹配")
		}
		if detail.Price != product.Price {
			t.Errorf("价格不匹配")
		}
	})

	// 测试不存在的商品
	t.Run("商品不存在", func(t *testing.T) {
		_, err := svc.GetProductDetail(context.Background(), 99999)
		if err == nil {
			t.Errorf("期望返回错误，实际返回 nil")
		}
	})
}

// TestCheckStock 测试库存检查
func TestCheckStock(t *testing.T) {
	db := setupProductTestDB(t)

	product := &model.Product{
		Name:   "库存测试商品",
		Price:  100,
		Stock:  10,
		Status: "on_sale",
		Sort:   1,
	}
	db.Create(product)

	repo := repository.NewProductRepo(db)
	svc := NewProductService(repo, db)

	// 测试库存充足
	t.Run("库存充足", func(t *testing.T) {
		available, err := svc.CheckStock(context.Background(), product.ID, 5)
		if err != nil {
			t.Errorf("检查失败: %v", err)
		}
		if !available {
			t.Errorf("库存应该充足")
		}
	})

	// 测试库存不足
	t.Run("库存不足", func(t *testing.T) {
		available, err := svc.CheckStock(context.Background(), product.ID, 20)
		if err != nil {
			t.Errorf("检查失败: %v", err)
		}
		if available {
			t.Errorf("库存应该不足")
		}
	})

	// 测试边界值
	t.Run("刚好等于库存", func(t *testing.T) {
		available, err := svc.CheckStock(context.Background(), product.ID, 10)
		if err != nil {
			t.Errorf("检查失败: %v", err)
		}
		if !available {
			t.Errorf("库存刚好足够")
		}
	})
}

// TestDecreaseStock 测试库存扣减
func TestDecreaseStock(t *testing.T) {
	db := setupProductTestDB(t)

	product := &model.Product{
		Name:   "扣减测试商品",
		Price:  100,
		Stock:  50,
		Status: "on_sale",
		Sort:   1,
	}
	db.Create(product)

	repo := repository.NewProductRepo(db)
	svc := NewProductService(repo, db)

	// 测试正常扣减
	t.Run("正常扣减", func(t *testing.T) {
		err := svc.DecreaseStock(context.Background(), product.ID, 10)
		if err != nil {
			t.Errorf("扣减失败: %v", err)
		}

		// 验证库存
		var p model.Product
		db.First(&p, product.ID)
		if p.Stock != 40 {
			t.Errorf("期望库存 40，实际 %d", p.Stock)
		}
	})

	// 测试库存不足
	t.Run("库存不足", func(t *testing.T) {
		err := svc.DecreaseStock(context.Background(), product.ID, 100)
		if err == nil {
			t.Errorf("期望返回库存不足错误")
		}
	})
}

// TestConcurrentStockUpdate 测试并发库存更新
func TestConcurrentStockUpdate(t *testing.T) {
	db := setupProductTestDB(t)

	product := &model.Product{
		Name:   "并发测试商品",
		Price:  100,
		Stock:  100,
		Status: "on_sale",
		Sort:   1,
	}
	db.Create(product)

	repo := repository.NewProductRepo(db)
	svc := NewProductService(repo, db)

	// 并发扣减库存
	concurrentCount := 10
	quantityPerRequest := 8
	var wg sync.WaitGroup
	errChan := make(chan error, concurrentCount)

	for i := 0; i < concurrentCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			err := svc.DecreaseStock(context.Background(), product.ID, quantityPerRequest)
			errChan <- err
		}()
	}

	wg.Wait()
	close(errChan)

	// 统计成功和失败次数
	successCount := 0
	failCount := 0
	for err := range errChan {
		if err == nil {
			successCount++
		} else {
			failCount++
		}
	}

	// 验证最终库存
	var p model.Product
	db.First(&p, product.ID)

	t.Logf("成功次数: %d, 失败次数: %d, 最终库存: %d", successCount, failCount, p.Stock)

	// 验证库存不会变成负数
	if p.Stock < 0 {
		t.Errorf("库存出现负数: %d", p.Stock)
	}

	// 验证扣减总量正确
	expectedStock := 100 - (successCount * quantityPerRequest)
	if p.Stock != expectedStock {
		t.Errorf("期望库存 %d，实际 %d", expectedStock, p.Stock)
	}
}
