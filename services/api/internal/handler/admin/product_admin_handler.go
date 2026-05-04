package admin

import (
	"net/http"
	"strconv"
	"strings"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"
	"newshop/api/internal/service/admin"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ProductAdminHandler 商品管理后台 Handler
type ProductAdminHandler struct {
	productService *admin.ProductAdminService
	productRepo    *repository.ProductRepo
	logger         *zap.Logger
}

// NewProductAdminHandler 创建商品管理 Handler
func NewProductAdminHandler(productService *admin.ProductAdminService, productRepo *repository.ProductRepo, logger *zap.Logger) *ProductAdminHandler {
	return &ProductAdminHandler{
		productService: productService,
		productRepo:    productRepo,
		logger:         logger,
	}
}

// ProductListRequest 商品列表请求
type ProductListRequest struct {
	CategoryID uint64 `form:"category_id"`
	BrandID    uint64 `form:"brand_id"`
	Status     string `form:"status"`
	Keyword    string `form:"keyword"`
	Page       int    `form:"page"`
	PageSize   int    `form:"page_size"`
}

// ProductListResponse 商品列表响应
type ProductListResponse struct {
	Items      []ProductListItem `json:"items"`
	List       []ProductListItem `json:"list,omitempty"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	PageSize   int               `json:"page_size"`
	TotalPages int               `json:"total_pages"`
}

// ProductListItem 商品列表项
type ProductListItem struct {
	ID            uint64 `json:"id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	Detail        string `json:"detail"`
	DetailImages  string `json:"detail_images,omitempty"`
	CategoryID    uint64 `json:"category_id"`
	CategoryName  string `json:"category_name,omitempty"`
	BrandID       uint64 `json:"brand_id"`
	BrandName     string `json:"brand_name,omitempty"`
	MainImage     string `json:"main_image"`
	Images        string `json:"images,omitempty"`
	Price         int64  `json:"price"`
	OriginalPrice int64  `json:"original_price"`
	Stock         int    `json:"stock"`
	Sales         int    `json:"sales"`
	SalesCount    int    `json:"sales_count"`
	IsHot         bool   `json:"is_hot"`
	IsSale        bool   `json:"is_sale"`
	Status        string `json:"status"`
	Sort          int    `json:"sort"`
	CreatedAt     string `json:"created_at"`
}

// CreateProductRequest 创建商品请求
type CreateProductRequest struct {
	Name          string                 `json:"name" binding:"required,max=200"`
	CategoryID    uint64                 `json:"category_id" binding:"required"`
	BrandID       uint64                 `json:"brand_id"`
	MainImage     string                 `json:"main_image" binding:"max=500"`
	Images        []string               `json:"images"`
	DetailImages  []string               `json:"detail_images"`
	Price         int64                  `json:"price" binding:"required,gte=0"`
	OriginalPrice int64                  `json:"original_price"`
	Stock         int                    `json:"stock" binding:"gte=0"`
	Description   string                 `json:"description"`
	Detail        string                 `json:"detail"`
	IsHot          bool                   `json:"is_hot"`
	IsSale         bool                   `json:"is_sale"`
	SeoTitle       string                 `json:"seo_title" binding:"max=200"`
	SeoKeywords    string                 `json:"seo_keywords" binding:"max=500"`
	SeoDescription string                 `json:"seo_description" binding:"max=500"`
	Status         string                 `json:"status" binding:"oneof=draft active inactive"`
	Sort           int                    `json:"sort"`
	Skus           []CreateProductSkuReq  `json:"skus"`
	Attrs          []CreateProductAttrReq `json:"attrs"`
}

// CreateProductSkuReq 创建 SKU 请求
type CreateProductSkuReq struct {
	SkuCode string `json:"sku_code" binding:"required,max=100"`
	Specs   string `json:"specs"`
	Price   int64  `json:"price" binding:"required,gte=0"`
	Stock   int    `json:"stock" binding:"gte=0"`
	Image   string `json:"image" binding:"max=500"`
}

// CreateProductAttrReq 创建商品属性请求
type CreateProductAttrReq struct {
	Name  string `json:"name" binding:"required,max=100"`
	Value string `json:"value" binding:"required,max=500"`
	Sort  int    `json:"sort"`
}

// UpdateProductRequest 更新商品请求
type UpdateProductRequest struct {
	Name          string                 `json:"name" binding:"max=200"`
	CategoryID    uint64                 `json:"category_id"`
	BrandID       uint64                 `json:"brand_id"`
	MainImage     string                 `json:"main_image" binding:"max=500"`
	Images        []string               `json:"images"`
	DetailImages  []string               `json:"detail_images"`
	Price         int64                  `json:"price" binding:"gte=0"`
	OriginalPrice int64                  `json:"original_price"`
	Stock         int                    `json:"stock" binding:"gte=0"`
	Description   *string                `json:"description"`
	Detail        *string                `json:"detail"`
	IsHot          *bool                  `json:"is_hot"`
	IsSale         *bool                  `json:"is_sale"`
	SeoTitle       *string                `json:"seo_title" binding:"max=200"`
	SeoKeywords    *string                `json:"seo_keywords" binding:"max=500"`
	SeoDescription *string                `json:"seo_description" binding:"max=500"`
	Status         string                 `json:"status" binding:"oneof=draft active inactive"`
	Sort           int                    `json:"sort"`
	Skus           []UpdateProductSkuReq  `json:"skus"`
	Attrs          []UpdateProductAttrReq `json:"attrs"`
}

// UpdateProductSkuReq 更新 SKU 请求
type UpdateProductSkuReq struct {
	ID      uint64 `json:"id"`
	SkuCode string `json:"sku_code" binding:"max=100"`
	Specs   string `json:"specs"`
	Price   int64  `json:"price" binding:"gte=0"`
	Stock   int    `json:"stock" binding:"gte=0"`
	Image   string `json:"image" binding:"max=500"`
}

// UpdateProductAttrReq 更新商品属性请求
type UpdateProductAttrReq struct {
	ID    uint64 `json:"id"`
	Name  string `json:"name" binding:"max=100"`
	Value string `json:"value" binding:"max=500"`
	Sort  int    `json:"sort"`
}

// UpdateStatusRequest 更新状态请求
type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=draft active inactive"`
}

// UpdateStockRequest 更新库存请求
type UpdateStockRequest struct {
	Stock int `json:"stock" binding:"required"`
}

// ProductDetailResponse 商品详情响应
type ProductDetailResponse struct {
	ID            uint64        `json:"id"`
	Name          string        `json:"name"`
	CategoryID    uint64        `json:"category_id"`
	Category      *CategoryInfo `json:"category,omitempty"`
	BrandID       uint64        `json:"brand_id"`
	Brand         *BrandInfo    `json:"brand,omitempty"`
	MainImage     string        `json:"main_image"`
	Images        []string      `json:"images"`
	DetailImages  []string      `json:"detail_images"`
	Price         int64         `json:"price"`
	OriginalPrice int64         `json:"original_price"`
	Stock         int           `json:"stock"`
	Sales         int           `json:"sales"`
	IsHot         bool          `json:"is_hot"`
	IsSale        bool          `json:"is_sale"`
	Description   string        `json:"description"`
	Detail        string        `json:"detail"`
	SeoTitle       string        `json:"seo_title"`
	SeoKeywords    string        `json:"seo_keywords"`
	SeoDescription string        `json:"seo_description"`
	Status        string        `json:"status"`
	Sort          int           `json:"sort"`
	Skus          []SkuInfo     `json:"skus"`
	Attrs         []AttrInfo    `json:"attrs"`
	CreatedAt     string        `json:"created_at"`
	UpdatedAt     string        `json:"updated_at"`
}

// CategoryInfo 分类信息
type CategoryInfo struct {
	ID   uint64 `json:"id"`
	Name string `json:"name"`
}

// BrandInfo 品牌信息
type BrandInfo struct {
	ID   uint64 `json:"id"`
	Name string `json:"name"`
}

// SkuInfo SKU 信息
type SkuInfo struct {
	ID      uint64 `json:"id"`
	SkuCode string `json:"sku_code"`
	Specs   string `json:"specs"`
	Price   int64  `json:"price"`
	Stock   int    `json:"stock"`
	Image   string `json:"image"`
}

// AttrInfo 属性信息
type AttrInfo struct {
	ID    uint64 `json:"id"`
	Name  string `json:"name"`
	Value string `json:"value"`
	Sort  int    `json:"sort"`
}

// List 获取商品列表
// @Summary 获取商品列表
// @Description 管理后台获取商品列表，支持按分类、品牌、状态、关键词筛选
// @Tags 管理后台-商品
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param category_id query int false "分类ID"
// @Param brand_id query int false "品牌ID"
// @Param status query string false "状态 (draft/active/inactive)"
// @Param keyword query string false "搜索关键词"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Success 200 {object} map[string]interface{} "code=0 表示成功，data 包含 list、total、page"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/products [get]
func (h *ProductAdminHandler) List(c *gin.Context) {
	var req ProductListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 || req.PageSize > 100 {
		req.PageSize = 20
	}

	query := &repository.ProductQuery{
		CategoryID: req.CategoryID,
		BrandID:    req.BrandID,
		Status:     req.Status,
		Keyword:    req.Keyword,
		Page:       req.Page,
		PageSize:   req.PageSize,
	}

	products, total, err := h.productService.ListProducts(c.Request.Context(), query)
	if err != nil {
		h.logger.Error("获取商品列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取商品列表失败"})
		return
	}

	list := make([]ProductListItem, 0, len(products))
	for _, p := range products {
		item := ProductListItem{
			ID:            p.ID,
			Name:          p.Name,
			Description:   p.Description,
			Detail:        p.Detail,
			DetailImages:  p.DetailImages,
			CategoryID:    p.CategoryID,
			BrandID:       p.BrandID,
			MainImage:     p.MainImage,
			Images:        p.Images,
			Price:         p.Price,
			OriginalPrice: p.OriginalPrice,
			Stock:         p.Stock,
			Sales:         p.Sales,
			SalesCount:    p.Sales,
			IsHot:         p.IsHot,
			IsSale:        p.IsSale,
			Status:        p.Status,
			Sort:          p.Sort,
			CreatedAt:     p.CreatedAt.Format("2006-01-02 15:04:05"),
		}
		if p.Category != nil {
			item.CategoryName = p.Category.Name
		}
		if p.Brand != nil {
			item.BrandName = p.Brand.Name
		}
		list = append(list, item)
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))
	if totalPages == 0 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": ProductListResponse{
			Items:      list,
			List:       list,
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	})
}

// Create 创建商品
// @Summary 创建商品
// @Description 管理后台创建新商品，支持SKU和属性配置
// @Tags 管理后台-商品
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param request body CreateProductRequest true "商品信息"
// @Success 201 {object} map[string]interface{} "code=0 表示成功，data.id 为新商品ID"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/products [post]
func (h *ProductAdminHandler) Create(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	// 验证分类是否存在
	if req.CategoryID > 0 {
		_, err := h.productRepo.GetCategoryByID(c.Request.Context(), req.CategoryID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "分类不存在"})
			return
		}
	}

	// 验证品牌是否存在
	if req.BrandID > 0 {
		_, err := h.productRepo.GetBrandByID(c.Request.Context(), req.BrandID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "品牌不存在"})
			return
		}
	}

	// 验证 SKU 编码唯一性
	skuCodes := make(map[string]bool)
	for _, sku := range req.Skus {
		if skuCodes[sku.SkuCode] {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40004, "message": "SKU 编码重复: " + sku.SkuCode})
			return
		}
		skuCodes[sku.SkuCode] = true

		existingSku, _ := h.productRepo.GetSkuByCode(c.Request.Context(), sku.SkuCode)
		if existingSku != nil {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40005, "message": "SKU 编码已存在: " + sku.SkuCode})
			return
		}
	}

	product := &model.Product{
		Name:           req.Name,
		CategoryID:     req.CategoryID,
		BrandID:        req.BrandID,
		MainImage:      req.MainImage,
		Price:          req.Price,
		OriginalPrice:  req.OriginalPrice,
		Stock:          req.Stock,
		IsHot:          req.IsHot,
		IsSale:         req.IsSale,
		Description:    req.Description,
		Detail:         req.Detail,
		SeoTitle:       req.SeoTitle,
		SeoKeywords:    req.SeoKeywords,
		SeoDescription: req.SeoDescription,
		Status:         req.Status,
		Sort:           req.Sort,
	}

	// 处理图片
	product.Images = joinImages(req.Images)
	product.DetailImages = joinImages(req.DetailImages)

	// 构建 SKU 列表
	for _, skuReq := range req.Skus {
		sku := model.ProductSku{
			SkuCode: skuReq.SkuCode,
			Specs:   skuReq.Specs,
			Price:   skuReq.Price,
			Stock:   skuReq.Stock,
			Image:   skuReq.Image,
		}
		product.Skus = append(product.Skus, sku)
	}

	// 构建属性列表
	for _, attrReq := range req.Attrs {
		attr := model.ProductAttr{
			Name:  attrReq.Name,
			Value: attrReq.Value,
			Sort:  attrReq.Sort,
		}
		product.Attrs = append(product.Attrs, attr)
	}

	if err := h.productService.CreateProduct(c.Request.Context(), product); err != nil {
		h.logger.Error("创建商品失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "创建商品失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 0,
		"data": gin.H{"id": product.ID},
	})
}

// Get 获取商品详情
// @Summary 获取商品详情
// @Description 管理后台获取商品详情，包含SKU、属性、分类、品牌信息
// @Tags 管理后台-商品
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param id path int true "商品ID"
// @Success 200 {object} map[string]interface{} "code=0 表示成功，data 为商品详情"
// @Failure 400 {object} map[string]interface{} "无效的商品ID"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 404 {object} map[string]interface{} "商品不存在"
// @Router /api/admin/products/{id} [get]
func (h *ProductAdminHandler) Get(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的商品 ID"})
		return
	}

	product, err := h.productService.GetProductByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "商品不存在"})
		return
	}

	// 解析图片
	images := []string{}
	if product.Images != "" {
		// 简单分割处理
		for _, img := range splitImages(product.Images) {
			images = append(images, img)
		}
	}
	detailImages := []string{}
	if product.DetailImages != "" {
		for _, img := range splitImages(product.DetailImages) {
			detailImages = append(detailImages, img)
		}
	}

	// 构建响应
	resp := ProductDetailResponse{
		ID:            product.ID,
		Name:          product.Name,
		CategoryID:    product.CategoryID,
		BrandID:       product.BrandID,
		MainImage:     product.MainImage,
		Images:        images,
		DetailImages:  detailImages,
		Price:         product.Price,
		OriginalPrice: product.OriginalPrice,
		Stock:         product.Stock,
		Sales:         product.Sales,
		IsHot:         product.IsHot,
		IsSale:        product.IsSale,
		Description:    product.Description,
		Detail:         product.Detail,
		SeoTitle:       product.SeoTitle,
		SeoKeywords:    product.SeoKeywords,
		SeoDescription: product.SeoDescription,
		Status:         product.Status,
		Sort:          product.Sort,
		CreatedAt:     product.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:     product.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	if product.Category != nil {
		resp.Category = &CategoryInfo{
			ID:   product.Category.ID,
			Name: product.Category.Name,
		}
	}

	if product.Brand != nil {
		resp.Brand = &BrandInfo{
			ID:   product.Brand.ID,
			Name: product.Brand.Name,
		}
	}

	for _, sku := range product.Skus {
		resp.Skus = append(resp.Skus, SkuInfo{
			ID:      sku.ID,
			SkuCode: sku.SkuCode,
			Specs:   sku.Specs,
			Price:   sku.Price,
			Stock:   sku.Stock,
			Image:   sku.Image,
		})
	}

	for _, attr := range product.Attrs {
		resp.Attrs = append(resp.Attrs, AttrInfo{
			ID:    attr.ID,
			Name:  attr.Name,
			Value: attr.Value,
			Sort:  attr.Sort,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": resp,
	})
}

// Update 更新商品
// @Summary 更新商品
// @Description 管理后台更新商品信息，支持更新SKU和属性
// @Tags 管理后台-商品
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param id path int true "商品ID"
// @Param request body UpdateProductRequest true "商品更新信息"
// @Success 200 {object} map[string]interface{} "code=0 表示成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 404 {object} map[string]interface{} "商品不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/products/{id} [put]
func (h *ProductAdminHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的商品 ID"})
		return
	}

	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	// 获取现有商品
	product, err := h.productService.GetProductByID(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("获取商品失败", zap.Uint64("product_id", id), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "商品不存在: " + err.Error()})
		return
	}

	// 更新字段
	if req.Name != "" {
		product.Name = req.Name
	}
	if req.CategoryID > 0 {
		_, err := h.productRepo.GetCategoryByID(c.Request.Context(), req.CategoryID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "分类不存在"})
			return
		}
		product.CategoryID = req.CategoryID
	}
	if req.BrandID > 0 {
		_, err := h.productRepo.GetBrandByID(c.Request.Context(), req.BrandID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "品牌不存在"})
			return
		}
		product.BrandID = req.BrandID
	}
	if req.MainImage != "" {
		product.MainImage = req.MainImage
	}
	if req.Price >= 0 {
		product.Price = req.Price
	}
	product.OriginalPrice = req.OriginalPrice
	if req.Stock >= 0 {
		product.Stock = req.Stock
	}
	if req.IsHot != nil {
		product.IsHot = *req.IsHot
	}
	if req.IsSale != nil {
		product.IsSale = *req.IsSale
	}
	if req.SeoTitle != nil {
		product.SeoTitle = *req.SeoTitle
	}
	if req.SeoKeywords != nil {
		product.SeoKeywords = *req.SeoKeywords
	}
	if req.SeoDescription != nil {
		product.SeoDescription = *req.SeoDescription
	}
	if req.Status != "" {
		product.Status = req.Status
	}
	if req.Description != nil {
		product.Description = *req.Description
	}
	if req.Detail != nil {
		product.Detail = *req.Detail
	}
	product.Sort = req.Sort

	// 处理图片
	if req.Images != nil {
		product.Images = joinImages(req.Images)
	}
	if req.DetailImages != nil {
		product.DetailImages = joinImages(req.DetailImages)
	}

	// 处理 SKU 更新
	if req.Skus != nil {
		product.Skus = nil
		for _, skuReq := range req.Skus {
			sku := model.ProductSku{
				ProductID: id,
				SkuCode:   skuReq.SkuCode,
				Specs:     skuReq.Specs,
				Price:     skuReq.Price,
				Stock:     skuReq.Stock,
				Image:     skuReq.Image,
			}
			product.Skus = append(product.Skus, sku)
		}
	}

	// 处理属性更新
	if req.Attrs != nil {
		product.Attrs = nil
		for _, attrReq := range req.Attrs {
			attr := model.ProductAttr{
				ProductID: id,
				Name:      attrReq.Name,
				Value:     attrReq.Value,
				Sort:      attrReq.Sort,
			}
			product.Attrs = append(product.Attrs, attr)
		}
	}

	if err := h.productService.UpdateProduct(c.Request.Context(), product); err != nil {
		h.logger.Error("更新商品失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新商品失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "更新成功",
	})
}

// Delete 删除商品
// @Summary 删除商品
// @Description 管理后台删除商品
// @Tags 管理后台-商品
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param id path int true "商品ID"
// @Success 200 {object} map[string]interface{} "code=0 表示成功"
// @Failure 400 {object} map[string]interface{} "无效的商品ID"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 404 {object} map[string]interface{} "商品不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/products/{id} [delete]
func (h *ProductAdminHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的商品 ID"})
		return
	}

	// 检查商品是否存在
	_, err = h.productService.GetProductByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "商品不存在"})
		return
	}

	if err := h.productService.DeleteProduct(c.Request.Context(), id); err != nil {
		h.logger.Error("删除商品失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "删除商品失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

// UpdateStatus 更新商品状态（上下架）
// @Summary 更新商品状态
// @Description 管理后台更新商品状态（draft草稿/active上架/inactive下架）
// @Tags 管理后台-商品
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param id path int true "商品ID"
// @Param request body UpdateStatusRequest true "状态信息"
// @Success 200 {object} map[string]interface{} "code=0 表示成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/products/{id}/status [put]
func (h *ProductAdminHandler) UpdateStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的商品 ID"})
		return
	}

	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	if err := h.productService.UpdateProductStatus(c.Request.Context(), id, req.Status); err != nil {
		h.logger.Error("更新商品状态失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新商品状态失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "状态更新成功",
	})
}

// UpdateStock 更新商品库存
// @Summary 更新商品库存
// @Description 管理后台更新商品库存数量
// @Tags 管理后台-商品
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param id path int true "商品ID"
// @Param request body UpdateStockRequest true "库存信息"
// @Success 200 {object} map[string]interface{} "code=0 表示成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/products/{id}/stock [put]
func (h *ProductAdminHandler) UpdateStock(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的商品 ID"})
		return
	}

	var req UpdateStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	if err := h.productService.UpdateProductStock(c.Request.Context(), id, req.Stock); err != nil {
		h.logger.Error("更新商品库存失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新商品库存失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "库存更新成功",
	})
}

// splitImages 分割图片字符串
func splitImages(images string) []string {
	if images == "" {
		return []string{}
	}
	// 简单按逗号分割，实际可能需要 JSON 解析
	result := []string{}
	start := 0
	for i := 0; i < len(images); i++ {
		if images[i] == ',' {
			if i > start {
				result = append(result, images[start:i])
			}
			start = i + 1
		}
	}
	if start < len(images) {
		result = append(result, images[start:])
	}
	return result
}

func joinImages(images []string) string {
	if len(images) == 0 {
		return ""
	}
	result := make([]string, 0, len(images))
	for _, img := range images {
		trimmed := strings.TrimSpace(img)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}
	if len(result) == 0 {
		return ""
	}
	joined := result[0]
	for i := 1; i < len(result); i++ {
		joined += "," + result[i]
	}
	return joined
}
