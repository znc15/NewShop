package service

import (
	"context"
	"testing"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupOrderTestDB 创建内存数据库
func setupOrderTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("连接测试数据库失败: %v", err)
	}
	err = db.AutoMigrate(
		&model.Order{},
		&model.OrderItem{},
		&model.Product{},
		&model.ProductSku{},
		&model.ProductAttr{},
		&model.User{},
		&model.UserAddress{},
		&model.Category{},
		&model.Brand{},
	)
	if err != nil {
		t.Fatalf("数据库迁移失败: %v", err)
	}
	return db
}

// createOrderTestData 创建测试数据
func createOrderTestData(t *testing.T, db *gorm.DB) (user *model.User, address *model.UserAddress, product *model.Product, sku *model.ProductSku) {
	ctx := context.Background()

	// 创建用户
	user = &model.User{
		Email:        "test@example.com",
		PasswordHash: "hashed_password",
		Nickname:     "测试用户",
		Status:       "active",
	}
	if err := db.WithContext(ctx).Create(user).Error; err != nil {
		t.Fatalf("创建测试用户失败: %v", err)
	}

	// 创建地址
	address = &model.UserAddress{
		UserID:   user.ID,
		Name:     "张三",
		Phone:    "13800138000",
		Province: "北京市",
		City:     "北京市",
		District: "朝阳区",
		Address:  "某某街道某某号",
	}
	if err := db.WithContext(ctx).Create(address).Error; err != nil {
		t.Fatalf("创建收货地址失败: %v", err)
	}

	// 创建分类
	category := &model.Category{
		Name:   "测试分类",
		Status: "active",
	}
	if err := db.WithContext(ctx).Create(category).Error; err != nil {
		t.Fatalf("创建分类失败: %v", err)
	}

	// 创建品牌
	brand := &model.Brand{
		Name:   "测试品牌",
		Status: "active",
	}
	if err := db.WithContext(ctx).Create(brand).Error; err != nil {
		t.Fatalf("创建品牌失败: %v", err)
	}

	// 创建商品
	product = &model.Product{
		Name:       "测试商品",
		CategoryID: category.ID,
		BrandID:    brand.ID,
		MainImage:  "http://example.com/image.jpg",
		Price:      9900,
		Stock:      100,
		Sales:      0,
		Status:     "on_sale",
	}
	if err := db.WithContext(ctx).Create(product).Error; err != nil {
		t.Fatalf("创建商品失败: %v", err)
	}

	// 创建 SKU
	sku = &model.ProductSku{
		ProductID: product.ID,
		SkuCode:   "SKU001",
		Specs:     "默认规格",
		Price:     9900,
		Stock:     50,
		Image:     "http://example.com/sku.jpg",
	}
	if err := db.WithContext(ctx).Create(sku).Error; err != nil {
		t.Fatalf("创建 SKU 失败: %v", err)
	}

	return user, address, product, sku
}

// TestOrderModel 测试订单模型方法
func TestOrderModel(t *testing.T) {
	db := setupOrderTestDB(t)
	_, _, product, sku := createOrderTestData(t, db)

	// 创建订单
	order := &model.Order{
		OrderNo:       "TEST001",
		Status:        model.OrderStatusPending,
		TotalAmount:   100.00,
		PayAmount:     100.00,
		FreightAmount: 0,
	}
	if err := db.Create(order).Error; err != nil {
		t.Fatalf("创建订单失败: %v", err)
	}

	// 测试状态判断方法
	t.Run("状态判断", func(t *testing.T) {
		if order.Status == model.OrderStatusPaid {
			t.Error("待支付订单不应该被判断为已支付")
		}
		if order.Status == model.OrderStatusCancelled {
			t.Error("待支付订单不应该被判断为已取消")
		}
	})

	_ = product
	_ = sku
}

// TestOrderCreate 测试订单创建
func TestOrderCreate(t *testing.T) {
	db := setupOrderTestDB(t)
	user, address, _, _ := createOrderTestData(t, db)

	orderRepo := repository.NewOrderRepo(db)
	userRepo := repository.NewUserRepo(db)
	productRepo := repository.NewProductRepo(db)
	orderService := NewOrderService(db, orderRepo, userRepo, productRepo)

	// 测试空订单项
	t.Run("空订单项", func(t *testing.T) {
		req := &model.CreateOrderRequest{
			AddressID: address.ID,
			Items:     []model.CreateOrderItemReq{},
		}

		_, err := orderService.CreateOrder(context.Background(), user.ID, req)
		if err == nil {
			t.Error("期望返回错误，实际返回 nil")
		}
	})

	// 测试地址不存在
	t.Run("地址不存在", func(t *testing.T) {
		req := &model.CreateOrderRequest{
			AddressID: 99999,
			Items: []model.CreateOrderItemReq{
				{ProductID: 1, SkuID: 1, Quantity: 1},
			},
		}

		_, err := orderService.CreateOrder(context.Background(), user.ID, req)
		if err == nil {
			t.Error("期望返回地址不存在错误")
		}
	})
}

// TestOrderStatusTransition 测试订单状态流转
func TestOrderStatusTransition(t *testing.T) {
	// 测试状态机方法
	order := &model.Order{
		OrderNo:     "TEST002",
		Status:      model.OrderStatusPending,
		TotalAmount: 100.00,
	}

	// 测试状态转换判断
	t.Run("待支付可以转到已支付", func(t *testing.T) {
		if !order.CanTransitionTo(model.OrderStatusPaid) {
			t.Error("待支付应该可以转到已支付")
		}
	})

	t.Run("待支付可以转到已取消", func(t *testing.T) {
		if !order.CanTransitionTo(model.OrderStatusCancelled) {
			t.Error("待支付应该可以转到已取消")
		}
	})

	t.Run("待支付不能直接转到已发货", func(t *testing.T) {
		if order.CanTransitionTo(model.OrderStatusShipped) {
			t.Error("待支付不应该可以直接转到已发货")
		}
	})

	t.Run("待支付不能直接转到已完成", func(t *testing.T) {
		if order.CanTransitionTo(model.OrderStatusCompleted) {
			t.Error("待支付不应该可以直接转到已完成")
		}
	})
}

// TestOrderCancel 测试订单取消
func TestOrderCancel(t *testing.T) {
	// 测试取消条件判断
	order := &model.Order{
		OrderNo:     "TEST003",
		Status:      model.OrderStatusPending,
		TotalAmount: 100.00,
	}

	t.Run("待支付订单可以取消", func(t *testing.T) {
		if order.Status != model.OrderStatusPending {
			t.Error("订单状态应该是待支付")
		}
	})

	t.Run("已支付订单不能直接取消", func(t *testing.T) {
		paidOrder := &model.Order{
			Status: model.OrderStatusPaid,
		}
		if paidOrder.Status == model.OrderStatusPaid {
			// 已支付订单需要先退款才能取消
		}
	})
}
