package admin

import (
	"net/http"
	"strconv"

	"newshop/api/internal/model"
	"newshop/api/internal/service/admin"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// CategoryAdminHandler 分类管理后台 Handler
type CategoryAdminHandler struct {
	categoryService *admin.ProductAdminService
	logger          *zap.Logger
}

// NewCategoryAdminHandler 创建分类管理 Handler
func NewCategoryAdminHandler(categoryService *admin.ProductAdminService, logger *zap.Logger) *CategoryAdminHandler {
	return &CategoryAdminHandler{
		categoryService: categoryService,
		logger:          logger,
	}
}

// CategoryListResponse 分类列表响应
type CategoryListResponse struct {
	Items []CategoryTreeItem `json:"items"`
	List  []CategoryTreeItem `json:"list,omitempty"`
}

// CategoryTreeItem 分类树形项
type CategoryTreeItem struct {
	ID       uint64             `json:"id"`
	Name     string             `json:"name"`
	ParentID uint64             `json:"parent_id"`
	Level    int                `json:"level"`
	Sort     int                `json:"sort"`
	Icon     string             `json:"icon"`
	Status   string             `json:"status"`
	Children []CategoryTreeItem `json:"children,omitempty"`
}

// CreateCategoryRequest 创建分类请求
type CreateCategoryRequest struct {
	Name     string `json:"name" binding:"required,max=100"`
	ParentID uint64 `json:"parent_id"`
	Sort     int    `json:"sort"`
	Icon     string `json:"icon" binding:"max=500"`
	Status   string `json:"status" binding:"oneof=active inactive"`
}

// UpdateCategoryRequest 更新分类请求
type UpdateCategoryRequest struct {
	Name   string `json:"name" binding:"max=100"`
	Sort   int    `json:"sort"`
	Icon   string `json:"icon" binding:"max=500"`
	Status string `json:"status" binding:"oneof=active inactive"`
}

// CategoryDetailResponse 分类详情响应
type CategoryDetailResponse struct {
	ID        uint64 `json:"id"`
	Name      string `json:"name"`
	ParentID  uint64 `json:"parent_id"`
	Level     int    `json:"level"`
	Sort      int    `json:"sort"`
	Icon      string `json:"icon"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// List 获取分类列表（树形结构）
// @Summary 获取分类列表
// @Description 管理后台获取分类列表，返回树形结构的分类数据
// @Tags 管理后台-分类
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "code=0 表示成功，data.list 为分类树形列表"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/categories [get]
func (h *CategoryAdminHandler) List(c *gin.Context) {
	categories, err := h.categoryService.GetCategoryTree(c.Request.Context())
	if err != nil {
		h.logger.Error("获取分类列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取分类列表失败"})
		return
	}

	list := convertToCategoryTreeItems(categories)

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": CategoryListResponse{
			Items: list,
			List:  list,
		},
	})
}

// Create 创建分类
// @Summary 创建分类
// @Description 管理后台创建新分类，支持多级分类（最多3级）
// @Tags 管理后台-分类
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param request body CreateCategoryRequest true "分类信息"
// @Success 201 {object} map[string]interface{} "code=0 表示成功，data.id 为新分类ID"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/categories [post]
func (h *CategoryAdminHandler) Create(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	// 计算分类层级
	level := 1
	if req.ParentID > 0 {
		parent, err := h.categoryService.GetCategoryByID(c.Request.Context(), req.ParentID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "父级分类不存在"})
			return
		}
		level = parent.Level + 1
		if level > 3 {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "分类层级不能超过 3 级"})
			return
		}
	}

	// 默认状态
	status := req.Status
	if status == "" {
		status = "active"
	}

	category := &model.Category{
		Name:     req.Name,
		ParentID: req.ParentID,
		Level:    level,
		Sort:     req.Sort,
		Icon:     req.Icon,
		Status:   status,
	}

	if err := h.categoryService.CreateCategory(c.Request.Context(), category); err != nil {
		h.logger.Error("创建分类失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "创建分类失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 0,
		"data": gin.H{"id": category.ID},
	})
}

// Update 更新分类
// @Summary 更新分类
// @Description 管理后台更新分类信息，包括名称、排序、图标、状态
// @Tags 管理后台-分类
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param id path int true "分类ID"
// @Param request body UpdateCategoryRequest true "分类更新信息"
// @Success 200 {object} map[string]interface{} "code=0 表示成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 404 {object} map[string]interface{} "分类不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/categories/{id} [put]
func (h *CategoryAdminHandler) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的分类 ID"})
		return
	}

	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	category, err := h.categoryService.GetCategoryByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "分类不存在"})
		return
	}

	if req.Name != "" {
		category.Name = req.Name
	}
	category.Sort = req.Sort
	category.Icon = req.Icon
	if req.Status != "" {
		category.Status = req.Status
	}

	if err := h.categoryService.UpdateCategory(c.Request.Context(), category); err != nil {
		h.logger.Error("更新分类失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新分类失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "更新成功",
	})
}

// Delete 删除分类
// @Summary 删除分类
// @Description 管理后台删除分类，存在子分类或商品的分类无法删除
// @Tags 管理后台-分类
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param id path int true "分类ID"
// @Success 200 {object} map[string]interface{} "code=0 表示成功"
// @Failure 400 {object} map[string]interface{} "参数错误或分类下存在子分类/商品"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 404 {object} map[string]interface{} "分类不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/categories/{id} [delete]
func (h *CategoryAdminHandler) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的分类 ID"})
		return
	}

	// 检查分类是否存在
	category, err := h.categoryService.GetCategoryByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "分类不存在"})
		return
	}

	// 检查是否有子分类
	if len(category.Children) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40004, "message": "该分类下存在子分类，无法删除"})
		return
	}

	// 检查分类下是否有商品
	hasProducts, err := h.categoryService.HasProductsInCategory(c.Request.Context(), id)
	if err != nil {
		h.logger.Error("检查分类商品失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "检查分类商品失败"})
		return
	}
	if hasProducts {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40005, "message": "该分类下存在商品，无法删除"})
		return
	}

	if err := h.categoryService.DeleteCategory(c.Request.Context(), id); err != nil {
		h.logger.Error("删除分类失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "删除分类失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

// convertToCategoryTreeItems 转换为分类树形响应
func convertToCategoryTreeItems(categories []model.Category) []CategoryTreeItem {
	result := make([]CategoryTreeItem, 0, len(categories))
	for _, cat := range categories {
		item := CategoryTreeItem{
			ID:       cat.ID,
			Name:     cat.Name,
			ParentID: cat.ParentID,
			Level:    cat.Level,
			Sort:     cat.Sort,
			Icon:     cat.Icon,
			Status:   cat.Status,
		}
		if len(cat.Children) > 0 {
			item.Children = convertToCategoryTreeItems(cat.Children)
		}
		result = append(result, item)
	}
	return result
}
