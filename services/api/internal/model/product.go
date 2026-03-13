package model

import (
	"time"

	"gorm.io/gorm"
)

// Category 商品分类模型
type Category struct {
	ID        uint64         `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:100;not null" json:"name"`
	ParentID  uint64         `gorm:"default:0;index" json:"parent_id"`
	Level     int            `gorm:"default:1" json:"level"`
	Sort      int            `gorm:"default:0" json:"sort"`
	Icon      string         `gorm:"size:500" json:"icon"`
	Status    string         `gorm:"size:50;default:active" json:"status"`
	Children  []Category     `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Category) TableName() string {
	return "categories"
}

// Brand 品牌模型
type Brand struct {
	ID          uint64         `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"size:100;not null;uniqueIndex" json:"name"`
	Logo        string         `gorm:"size:500" json:"logo"`
	Description string         `gorm:"size:1000" json:"description"`
	Sort        int            `gorm:"default:0" json:"sort"`
	Status      string         `gorm:"size:50;default:active" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Brand) TableName() string {
	return "brands"
}

// Product 商品模型
type Product struct {
	ID            uint64         `gorm:"primaryKey" json:"id"`
	Name          string         `gorm:"size:200;not null;index" json:"name"`
	CategoryID    uint64         `gorm:"not null;index" json:"category_id"`
	BrandID       uint64         `gorm:"index" json:"brand_id"`
	MainImage     string         `gorm:"size:500" json:"main_image"`
	Images        string         `gorm:"type:text" json:"images"`
	Price         int64          `gorm:"not null" json:"price"`
	OriginalPrice int64          `gorm:"default:0" json:"original_price"`
	Stock         int            `gorm:"default:0" json:"stock"`
	Sales         int            `gorm:"default:0" json:"sales"`
	Description   string         `gorm:"type:text" json:"description"`
	Detail        string         `gorm:"type:text" json:"detail"`
	Status        string         `gorm:"size:50;default:draft;index" json:"status"`
	Sort          int            `gorm:"default:0" json:"sort"`
	Category      *Category      `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Brand         *Brand         `gorm:"foreignKey:BrandID" json:"brand,omitempty"`
	Skus          []ProductSku   `gorm:"foreignKey:ProductID" json:"skus,omitempty"`
	Attrs         []ProductAttr  `gorm:"foreignKey:ProductID" json:"attrs,omitempty"`
	ProductImages []ProductImage `gorm:"foreignKey:ProductID" json:"product_images,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Product) TableName() string {
	return "products"
}

// ProductSku 商品SKU模型
type ProductSku struct {
	ID        uint64         `gorm:"primaryKey" json:"id"`
	ProductID uint64         `gorm:"not null;index" json:"product_id"`
	SkuCode   string         `gorm:"size:100;uniqueIndex" json:"sku_code"`
	Specs     string         `gorm:"type:text" json:"specs"`
	Price     int64          `gorm:"not null" json:"price"`
	Stock     int            `gorm:"default:0" json:"stock"`
	Image     string         `gorm:"size:500" json:"image"`
	Product   *Product       `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ProductSku) TableName() string {
	return "product_skus"
}

// ProductImage 商品图片模型
type ProductImage struct {
	ID        uint64         `gorm:"primaryKey" json:"id"`
	ProductID uint64         `gorm:"not null;index" json:"product_id"`
	URL       string         `gorm:"size:500;not null" json:"url"`
	Sort      int            `gorm:"default:0" json:"sort"`
	Product   *Product       `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ProductImage) TableName() string {
	return "product_images"
}

// ProductAttr 商品属性模型
type ProductAttr struct {
	ID        uint64         `gorm:"primaryKey" json:"id"`
	ProductID uint64         `gorm:"not null;index" json:"product_id"`
	Name      string         `gorm:"size:100;not null" json:"name"`
	Value     string         `gorm:"size:500;not null" json:"value"`
	Sort      int            `gorm:"default:0" json:"sort"`
	Product   *Product       `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ProductAttr) TableName() string {
	return "product_attrs"
}
