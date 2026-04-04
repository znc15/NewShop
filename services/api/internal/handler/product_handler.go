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
// @Summary 获取商品列表
// @Tags 商品
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param category_id query int false "分类ID"
// @Param brand_id query int false "品牌ID"
// @Param status query string false "商品状态" Enums(on_sale, off_sale, sold_out)
// @Success 200 {object} ProductListResponse
// @Failure 500 {object} ErrorResponse
// @Router /products [get]
func (h *ProductHandler) GetProductList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	categoryID, _ := strconv.ParseUint(c.Query("category_id"), 10, 64)
	brandID, _ := strconv.ParseUint(c.Query("brand_id"), 10, 64)
	status := c.Query("status")
	sortBy := c.Query("sort_by")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	var minPrice *int64
	if minPriceRaw := c.Query("min_price"); minPriceRaw != "" {
		value, err := strconv.ParseInt(minPriceRaw, 10, 64)
		if err != nil || value < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "min_price 参数无效"})
			return
		}
		minPrice = &value
	}

	var maxPrice *int64
	if maxPriceRaw := c.Query("max_price"); maxPriceRaw != "" {
		value, err := strconv.ParseInt(maxPriceRaw, 10, 64)
		if err != nil || value < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "max_price 参数无效"})
			return
		}
		maxPrice = &value
	}

	if minPrice != nil && maxPrice != nil && *minPrice > *maxPrice {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "min_price 不能大于 max_price"})
		return
	}

	// 默认只显示在售商品（非管理端请求）
	if status == "" {
		status = "on_sale"
	}

	result, err := h.productService.GetProductListWithFilters(c.Request.Context(), &service.ProductListFilters{
		CategoryID: categoryID,
		BrandID:    brandID,
		Status:     status,
		MinPrice:   minPrice,
		MaxPrice:   maxPrice,
		SortBy:     sortBy,
		SortOrder:  sortOrder,
		Page:       page,
		PageSize:   pageSize,
	})
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
// @Summary 获取商品详情
// @Tags 商品
// @Param id path int true "商品ID"
// @Success 200 {object} ProductDetailResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /products/{id} [get]
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
// @Summary 按分类获取商品
// @Tags 分类
// @Param id path int true "分类ID"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Success 200 {object} ProductListResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /categories/{id}/products [get]
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
// @Summary 搜索商品
// @Tags 搜索
// @Param keyword query string true "搜索关键词"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Success 200 {object} ProductSearchResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /search [get]
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
// @Summary 获取分类列表
// @Tags 分类
// @Success 200 {object} CategoryListResponse
// @Failure 500 {object} ErrorResponse
// @Router /categories [get]
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
// @Summary 获取分类详情
// @Tags 分类
// @Param id path int true "分类ID"
// @Success 200 {object} CategoryDetailResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /categories/{id} [get]
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
// @Summary 获取品牌列表
// @Tags 品牌
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Success 200 {object} BrandListResponse
// @Failure 500 {object} ErrorResponse
// @Router /brands [get]
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
// @Summary 获取品牌详情
// @Tags 品牌
// @Param id path int true "品牌ID"
// @Success 200 {object} BrandDetailResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /brands/{id} [get]
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
// @Summary 按品牌获取商品
// @Tags 品牌
// @Param id path int true "品牌ID"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Success 200 {object} ProductListResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /brands/{id}/products [get]
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
// @Summary 获取热门商品
// @Tags 商品
// @Param limit query int false "数量限制" default(8)
// @Success 200 {object} HotProductsResponse
// @Failure 500 {object} ErrorResponse
// @Router /products/hot [get]
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
// @Summary 获取新品推荐
// @Tags 商品
// @Param limit query int false "数量限制" default(8)
// @Success 200 {object} NewProductsResponse
// @Failure 500 {object} ErrorResponse
// @Router /products/new [get]
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
		products.GET("/hot", h.GetHotProducts) // 热门商品
		products.GET("/new", h.GetNewProducts) // 新品推荐
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

// ProductListResponse 商品列表响应
type ProductListResponse struct {
	Code int `json:"code"`
	Data struct {
		Products interface{} `json:"products"`
		Total    int64       `json:"total"`
		Page     int         `json:"page"`
		PageSize int         `json:"page_size"`
	} `json:"data"`
}

// ProductDetailResponse 商品详情响应
type ProductDetailResponse struct {
	Code int         `json:"code"`
	Data interface{} `json:"data"`
}

// ProductSearchResponse 商品搜索响应
type ProductSearchResponse struct {
	Code int `json:"code"`
	Data struct {
		Products interface{} `json:"products"`
		Total    int64       `json:"total"`
		Page     int         `json:"page"`
		PageSize int         `json:"page_size"`
		Keyword  string      `json:"keyword"`
	} `json:"data"`
}

// CategoryListResponse 分类列表响应
type CategoryListResponse struct {
	Code int `json:"code"`
	Data struct {
		Categories interface{} `json:"categories"`
	} `json:"data"`
}

// CategoryDetailResponse 分类详情响应
type CategoryDetailResponse struct {
	Code int         `json:"code"`
	Data interface{} `json:"data"`
}

// BrandListResponse 品牌列表响应
type BrandListResponse struct {
	Code int `json:"code"`
	Data struct {
		Brands   interface{} `json:"brands"`
		Total    int64       `json:"total"`
		Page     int         `json:"page"`
		PageSize int         `json:"page_size"`
	} `json:"data"`
}

// BrandDetailResponse 品牌详情响应
type BrandDetailResponse struct {
	Code int         `json:"code"`
	Data interface{} `json:"data"`
}

// HotProductsResponse 热门商品响应
type HotProductsResponse struct {
	Code int `json:"code"`
	Data struct {
		Products interface{} `json:"products"`
	} `json:"data"`
}

// NewProductsResponse 新品推荐响应
type NewProductsResponse struct {
	Code int `json:"code"`
	Data struct {
		Products interface{} `json:"products"`
	} `json:"data"`
}
