package admin

import (
	"net/http"
	"strconv"

	"newshop/api/internal/model"
	"newshop/api/internal/service/admin"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// BrandAdminHandler 品牌管理后台 Handler
type BrandAdminHandler struct {
	brandService *admin.ProductAdminService
	logger       *zap.Logger
}

// NewBrandAdminHandler 创建品牌管理 Handler
func NewBrandAdminHandler(brandService *admin.ProductAdminService, logger *zap.Logger) *BrandAdminHandler {
	return &BrandAdminHandler{
		brandService: brandService,
		logger:       logger,
	}
}

// BrandListRequest 品牌列表请求
type BrandListRequest struct {
	Page     int    `form:"page"`
	PageSize int    `form:"page_size"`
	Status   string `form:"status"`
}

// BrandListResponse 品牌列表响应
type BrandListResponse struct {
	List  []BrandListItem `json:"list"`
	Total int64           `json:"total"`
	Page  int             `json:"page"`
}

// BrandListItem 品牌列表项
type BrandListItem struct {
	ID          uint64 `json:"id"`
	Name        string `json:"name"`
	Logo        string `json:"logo"`
	Description string `json:"description"`
	Sort        int    `json:"sort"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
}

// CreateBrandRequest 创建品牌请求
type CreateBrandRequest struct {
	Name        string `json:"name" binding:"required,max=100"`
	Logo        string `json:"logo" binding:"max=500"`
	Description string `json:"description" binding:"max=1000"`
	Sort        int    `json:"sort"`
	Status      string `json:"status" binding:"oneof=active inactive"`
}

// UpdateBrandRequest 更新品牌请求
type UpdateBrandRequest struct {
	Name        string `json:"name" binding:"max=100"`
	Logo        string `json:"logo" binding:"max=500"`
	Description string `json:"description" binding:"max=1000"`
	Sort        int    `json:"sort"`
	Status      string `json:"status" binding:"oneof=active inactive"`
}

// BrandDetailResponse 品牌详情响应
type BrandDetailResponse struct {
	ID          uint64 `json:"id"`
	Name        string `json:"name"`
	Logo        string `json:"logo"`
	Description string `json:"description"`
	Sort        int    `json:"sort"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// List 获取品牌列表
func (h *BrandAdminHandler) List(c *gin.Context) {
	var req BrandListRequest
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

	brands, total, err := h.brandService.ListBrands(c.Request.Context(), req.Page, req.PageSize, req.Status)
	if err != nil {
		h.logger.Error("获取品牌列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取品牌列表失败"})
		return
	}

	list := make([]BrandListItem, 0, len(brands))
	for _, b := range brands {
		list = append(list, BrandListItem{
			ID:          b.ID,
			Name:        b.Name,
			Logo:        b.Logo,
			Description: b.Description,
			Sort:        b.Sort,
			Status:      b.Status,
			CreatedAt:   b.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": BrandListResponse{
			List:  list,
			Total: total,
			Page:  req.Page,
		},
	})
}

// Create 创建品牌
func (h *BrandAdminHandler) Create(c *gin.Context) {
	var req CreateBrandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	// 检查品牌名是否已存在
	existingBrand, _ := h.brandService.GetBrandByName(c.Request.Context(), req.Name)
	if existingBrand != nil {
		c.JSON(http.StatusConflict, gin.H{"code": 40901, "message": "品牌名称已存在"})
		return
	}

	// 默认状态
	status := req.Status
	if status == "" {
		status = "active"
	}

	brand := &model.Brand{
		Name:        req.Name,
		Logo:        req.Logo,
		Description: req.Description,
		Sort:        req.Sort,
		Status:      status,
	}

	if err := h.brandService.CreateBrand(c.Request.Context(), brand); err != nil {
		h.logger.Error("创建品牌失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "创建品牌失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 0,
		"data": gin.H{"id": brand.ID},
	})
}

// Update 更新品牌
func (h *BrandAdminHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的品牌 ID"})
		return
	}

	var req UpdateBrandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	brand, err := h.brandService.GetBrandByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "品牌不存在"})
		return
	}

	// 检查品牌名是否与其他品牌重复
	if req.Name != "" && req.Name != brand.Name {
		existingBrand, _ := h.brandService.GetBrandByName(c.Request.Context(), req.Name)
		if existingBrand != nil && existingBrand.ID != id {
			c.JSON(http.StatusConflict, gin.H{"code": 40901, "message": "品牌名称已存在"})
			return
		}
		brand.Name = req.Name
	}

	if req.Logo != "" {
		brand.Logo = req.Logo
	}
	brand.Description = req.Description
	brand.Sort = req.Sort
	if req.Status != "" {
		brand.Status = req.Status
	}

	if err := h.brandService.UpdateBrand(c.Request.Context(), brand); err != nil {
		h.logger.Error("更新品牌失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新品牌失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "更新成功",
	})
}

// Delete 删除品牌
func (h *BrandAdminHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的品牌 ID"})
		return
	}

	// 检查品牌是否存在
	_, err = h.brandService.GetBrandByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "品牌不存在"})
		return
	}

	// 检查品牌下是否有商品
	hasProducts, err := h.brandService.HasProductsInBrand(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("检查品牌商品失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "检查品牌商品失败"})
		return
	}
	if hasProducts {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40004, "message": "该品牌下存在商品，无法删除"})
		return
	}

	if err := h.brandService.DeleteBrand(c.Request.Context(), id); err != nil {
		h.logger.Error("删除品牌失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "删除品牌失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}
