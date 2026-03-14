package main

import (
	"fmt"
	"log"

	"newshop/api/internal/config"

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

	// 添加缺失的列
	migrations := []string{
		"ALTER TABLE products ADD COLUMN IF NOT EXISTS detail TEXT;",
		"ALTER TABLE products ALTER COLUMN images TYPE TEXT USING images::text;",
		"ALTER TABLE products DROP CONSTRAINT IF EXISTS products_brand_id_fkey;",
		"ALTER TABLE products ALTER COLUMN brand_id DROP NOT NULL;",
	}

	for _, sql := range migrations {
		if err := db.Exec(sql).Error; err != nil {
			log.Printf("执行失败: %s, 错误: %v", sql, err)
		} else {
			log.Printf("执行成功: %s", sql)
		}
	}

	log.Println("迁移完成！")
}