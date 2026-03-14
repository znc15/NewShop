package main

import (
	"fmt"
	"log"
	"time"

	"newshop/api/internal/config"
	"newshop/api/internal/model"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("加载配置失败:", err)
	}

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Name,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("连接数据库失败:", err)
	}

	// 创建测试商品
	products := []model.Product{
		{
			Name:          "Apple iPhone 15 Pro Max 256GB",
			CategoryID:    1, // 手机数码
			BrandID:       0,
			MainImage:     "https://picsum.photos/seed/iphone15/400/400",
			Price:         999900,  // 9999.00 元，单位分
			OriginalPrice: 1099900, // 10999.00 元
			Stock:         100,
			Sales:         1580,
			Description:   "Apple iPhone 15 Pro Max，A17 Pro芯片，钛金属设计，专业级摄像头系统",
			Detail:        "<h2>iPhone 15 Pro Max</h2><p>全新钛金属设计，更轻更强</p>",
			Status:        "on_sale",
			Sort:          100,
		},
		{
			Name:          "华为 Mate 60 Pro 512GB",
			CategoryID:    1,
			BrandID:       0,
			MainImage:     "https://picsum.photos/seed/mate60/400/400",
			Price:         699900,
			OriginalPrice: 799900,
			Stock:         200,
			Sales:         2300,
			Description:   "华为 Mate 60 Pro，麒麟9000S芯片，卫星通话功能",
			Detail:        "<h2>Mate 60 Pro</h2><p>先锋计划，卫星通话</p>",
			Status:        "on_sale",
			Sort:          99,
		},
		{
			Name:          "MacBook Pro 14英寸 M3 Pro",
			CategoryID:    2, // 电脑办公
			BrandID:       0,
			MainImage:     "https://picsum.photos/seed/macbook14/400/400",
			Price:         1699900,
			OriginalPrice: 1899900,
			Stock:         50,
			Sales:         890,
			Description:   "Apple MacBook Pro 14英寸，M3 Pro芯片，18GB统一内存，512GB固态硬盘",
			Detail:        "<h2>MacBook Pro 14</h2><p>M3 Pro芯片，性能怪兽</p>",
			Status:        "on_sale",
			Sort:          98,
		},
		{
			Name:          "戴尔 XPS 15 9530",
			CategoryID:    2,
			BrandID:       0,
			MainImage:     "https://picsum.photos/seed/xps15/400/400",
			Price:         1299900,
			OriginalPrice: 1499900,
			Stock:         80,
			Sales:         560,
			Description:   "戴尔 XPS 15，Intel i7-13700H，32GB内存，1TB SSD，OLED 3.5K显示屏",
			Detail:        "<h2>XPS 15</h2><p>OLED屏幕，创作利器</p>",
			Status:        "on_sale",
			Sort:          97,
		},
		{
			Name:          "戴森 V15 Detect 无线吸尘器",
			CategoryID:    3, // 家用电器
			BrandID:       0,
			MainImage:     "https://picsum.photos/seed/dysonv15/400/400",
			Price:         499000,
			OriginalPrice: 599000,
			Stock:         150,
			Sales:         1200,
			Description:   "戴森 V15 Detect，激光探测灰尘，智能感应清洁",
			Detail:        "<h2>戴森 V15</h2><p>激光探测，智能清洁</p>",
			Status:        "on_sale",
			Sort:          96,
		},
		{
			Name:          "小米智能空气净化器 4 Pro",
			CategoryID:    3,
			BrandID:       0,
			MainImage:     "https://picsum.photos/seed/miair4pro/400/400",
			Price:         129900,
			OriginalPrice: 159900,
			Stock:         300,
			Sales:         3500,
			Description:   "小米智能空气净化器 4 Pro，去除99.99% PM2.5，智能互联",
			Detail:        "<h2>小米空气净化器 4 Pro</h2><p>高效净化，智能控制</p>",
			Status:        "on_sale",
			Sort:          95,
		},
		{
			Name:          "Sony WH-1000XM5 无线降噪耳机",
			CategoryID:    1,
			BrandID:       0,
			MainImage:     "https://picsum.photos/seed/sonyxm5/400/400",
			Price:         269900,
			OriginalPrice: 299900,
			Stock:         200,
			Sales:         1800,
			Description:   "Sony WH-1000XM5，业界领先降噪，30小时续航",
			Detail:        "<h2>WH-1000XM5</h2><p>顶级降噪，极致音质</p>",
			Status:        "on_sale",
			Sort:          94,
		},
		{
			Name:          "iPad Pro 12.9英寸 M2",
			CategoryID:    2,
			BrandID:       0,
			MainImage:     "https://picsum.photos/seed/ipadpro/400/400",
			Price:         899900,
			OriginalPrice: 999900,
			Stock:         120,
			Sales:         920,
			Description:   "Apple iPad Pro 12.9英寸，M2芯片，Liquid Retina XDR显示屏",
			Detail:        "<h2>iPad Pro 12.9</h2><p>M2芯片，专业创作</p>",
			Status:        "on_sale",
			Sort:          93,
		},
	}

	// 设置创建时间
	now := time.Now()
	for i := range products {
		products[i].CreatedAt = now
		products[i].UpdatedAt = now
	}

	// 插入商品
	for _, product := range products {
		result := db.Create(&product)
		if result.Error != nil {
			log.Printf("插入商品失败 %s: %v", product.Name, result.Error)
		} else {
			log.Printf("插入商品成功: %s (ID: %d)", product.Name, product.ID)

			// 创建 SKU
			skus := []model.ProductSku{
				{
					ProductID: product.ID,
					SkuCode:   fmt.Sprintf("SKU-%d-BLACK", product.ID),
					Specs:     `{"颜色": "黑色"}`,
					Price:     product.Price,
					Stock:     product.Stock / 2,
					Image:     product.MainImage,
				},
				{
					ProductID: product.ID,
					SkuCode:   fmt.Sprintf("SKU-%d-WHITE", product.ID),
					Specs:     `{"颜色": "白色"}`,
					Price:     product.Price,
					Stock:     product.Stock / 2,
					Image:     product.MainImage,
				},
			}
			for j := range skus {
				skus[j].CreatedAt = now
				skus[j].UpdatedAt = now
			}
			db.Create(&skus)
		}
	}

	log.Println("测试数据创建完成！")
}