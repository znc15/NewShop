package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ProductHandler struct {
	productService *service.ProductService
	logger         *zap.Logger
}

func NewProductHandler(productService *service.ProductService, logger *zap.Logger) *ProductHandler {
	return &ProductHandler{
		productService: productService,
		logger:         logger,
	}
}

// GetProductList 获取商品列表
// GET /products?page=1&page_size=20&category_id=1&brand_id=1&status=on_sale
func (h *ProductHandler) GetProductList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	categoryID, _ := strconv.ParseUint(c.Query("category_id"), 10, 64)
	brandID, _ := strconv.ParseUint(c.Query("brand_id"), 10, 64)
	status := c.Query("status")

	// 默认只显示在售商品（非管理端请求）
	if status == "" {
		status = "on_sale"
	}

	result, err := h.productService.GetProductList(c.Request.Context(), categoryID, brandID, status, page, pageSize)
	if err != nil {
		h.logger.Error("获取商品列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取商品列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"products":  result.Products,
			"total":     result.Total,
			"page":      result.Page,
			"page_size": result.PageSize,
		},
	})
}

// GetProductDetail 获取商品详情
// GET /products/:id
func (h *ProductHandler) GetProductDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的商品ID"})
		return
	}

	product, err := h.productService.GetProductDetail(c.Request.Context(), id)
	if err != nil {
		if err == service.ErrProductNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "商品不存在"})
			return
		}
		h.logger.Error("获取商品详情失败", zap.Error(err), zap.Uint64("product_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取商品详情失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": product,
	})
}

// GetProductsByCategory 按分类获取商品
// GET /categories/:id/products?page=1&page_size=20
func (h *ProductHandler) GetProductsByCategory(c *gin.Context) {
	categoryID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的分类ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	result, err := h.productService.GetProductsByCategory(c.Request.Context(), categoryID, page, pageSize)
	if err != nil {
		h.logger.Error("按分类获取商品失败", zap.Error(err), zap.Uint64("category_id", categoryID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取商品失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"products":  result.Products,
			"total":     result.Total,
			"page":      result.Page,
			"page_size": result.PageSize,
		},
	})
}

// SearchProducts 搜索商品
// GET /search?keyword=xxx&page=1&page_size=20
func (h *ProductHandler) SearchProducts(c *gin.Context) {
	keyword := c.Query("keyword")
	if keyword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "搜索关键词不能为空"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	result, err := h.productService.SearchProducts(c.Request.Context(), keyword, page, pageSize)
	if err != nil {
		h.logger.Error("搜索商品失败", zap.Error(err), zap.String("keyword", keyword))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "搜索失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"products":  result.Products,
			"total":     result.Total,
			"page":      result.Page,
			"page_size": result.PageSize,
			"keyword":   keyword,
		},
	})
}

// GetCategories 获取分类列表（树形结构）
// GET /categories
func (h *ProductHandler) GetCategories(c *gin.Context) {
	result, err := h.productService.GetCategories(c.Request.Context())
	if err != nil {
		h.logger.Error("获取分类列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取分类列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"categories": result.Categories,
		},
	})
}

// GetCategoryDetail 获取单个分类详情
// GET /categories/:id
func (h *ProductHandler) GetCategoryDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的分类ID"})
		return
	}

	category, err := h.productService.GetCategoryByID(c.Request.Context(), id)
	if err != nil {
		if err == service.ErrCategoryNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "分类不存在"})
			return
		}
		h.logger.Error("获取分类详情失败", zap.Error(err), zap.Uint64("category_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取分类详情失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": category,
	})
}

// GetBrands 获取品牌列表
// GET /brands?page=1&page_size=20
func (h *ProductHandler) GetBrands(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	result, err := h.productService.GetBrands(c.Request.Context(), page, pageSize)
	if err != nil {
		h.logger.Error("获取品牌列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取品牌列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"brands":    result.Brands,
			"total":     result.Total,
			"page":      result.Page,
			"page_size": result.PageSize,
		},
	})
}

// GetBrandDetail 获取单个品牌详情
// GET /brands/:id
func (h *ProductHandler) GetBrandDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的品牌ID"})
		return
	}

	brand, err := h.productService.GetBrandByID(c.Request.Context(), id)
	if err != nil {
		if err == service.ErrBrandNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "品牌不存在"})
			return
		}
		h.logger.Error("获取品牌详情失败", zap.Error(err), zap.Uint64("brand_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取品牌详情失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": brand,
	})
}

// GetProductsByBrand 按品牌获取商品
// GET /brands/:id/products?page=1&page_size=20
func (h *ProductHandler) GetProductsByBrand(c *gin.Context) {
	brandID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的品牌ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	result, err := h.productService.GetProductsByBrand(c.Request.Context(), brandID, page, pageSize)
	if err != nil {
		h.logger.Error("按品牌获取商品失败", zap.Error(err), zap.Uint64("brand_id", brandID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取商品失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"products":  result.Products,
			"total":     result.Total,
			"page":      result.Page,
			"page_size": result.PageSize,
		},
	})
}

// GetHotProducts 获取热门商品
// GET /products/hot?limit=8
func (h *ProductHandler) GetHotProducts(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "8"))
	if limit <= 0 || limit > 50 {
		limit = 8
	}

	products, err := h.productService.GetHotProducts(c.Request.Context(), limit)
	if err != nil {
		h.logger.Error("获取热门商品失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取热门商品失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"products": products,
		},
	})
}

// GetNewProducts 获取新品推荐
// GET /products/new?limit=8
func (h *ProductHandler) GetNewProducts(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "8"))
	if limit <= 0 || limit > 50 {
		limit = 8
	}

	products, err := h.productService.GetNewProducts(c.Request.Context(), limit)
	if err != nil {
		h.logger.Error("获取新品推荐失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取新品推荐失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"products": products,
		},
	})
}

// RegisterProductRoutes 注册商品相关路由
func RegisterProductRoutes(r *gin.RouterGroup, h *ProductHandler) {
	// 商品相关
	products := r.Group("/products")
	{
		// 注意：静态路由必须在动态路由（/:id）之前注册
		products.GET("", h.GetProductList)
		products.GET("/hot", h.GetHotProducts)    // 热门商品
		products.GET("/new", h.GetNewProducts)    // 新品推荐
		products.GET("/:id", h.GetProductDetail)
	}

	// 分类相关
	categories := r.Group("/categories")
	{
		// 注意：静态路由必须在动态路由（/:id）之前注册
		categories.GET("", h.GetCategories)
		categories.GET("/:id/products", h.GetProductsByCategory)
		categories.GET("/:id", h.GetCategoryDetail)
	}

	// 品牌相关
	brands := r.Group("/brands")
	{
		brands.GET("", h.GetBrands)
		brands.GET("/:id", h.GetBrandDetail)
		brands.GET("/:id/products", h.GetProductsByBrand)
	}

	// 搜索
	r.GET("/search", h.SearchProducts)
}
