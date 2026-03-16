package admin

import (
	"encoding/json"
	"net/http"
	"strconv"

	"newshop/api/internal/model"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ConfigResponse 配置响应
type ConfigResponse struct {
	ID          uint64 `json:"id"`
	Key         string `json:"key"`
	Value       string `json:"value"`
	Type        string `json:"type"`
	Category    string `json:"category"`
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// ConfigListResponse 配置列表响应
type ConfigListResponse struct {
	Code int              `json:"code"`
	Data []ConfigResponse `json:"data"`
}

// ConfigDetailResponse 配置详情响应
type ConfigDetailResponse struct {
	Code int            `json:"code"`
	Data ConfigResponse `json:"data"`
}

// ConfigCreateResponse 创建配置响应
type ConfigCreateResponse struct {
	Code    int            `json:"code"`
	Message string         `json:"message"`
	Data    ConfigResponse `json:"data"`
}

// ConfigUpdateResponse 更新配置响应
type ConfigUpdateResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// ConfigDeleteResponse 删除配置响应
type ConfigDeleteResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// ConfigHistoryItem 配置历史项
type ConfigHistoryItem struct {
	ID         uint64 `json:"id"`
	ConfigID   uint64 `json:"config_id"`
	OldValue   string `json:"old_value"`
	NewValue   string `json:"new_value"`
	OperatorID uint64 `json:"operator_id"`
	OperatedAt string `json:"operated_at"`
}

// ConfigHistoriesResponse 配置历史列表响应
type ConfigHistoriesResponse struct {
	Code int `json:"code"`
	Data struct {
		Histories []ConfigHistoryItem `json:"histories"`
		Total     int64               `json:"total"`
		Page      int                 `json:"page"`
		PageSize  int                 `json:"page_size"`
	} `json:"data"`
}

// ConfigAdminHandler 配置管理处理器
type ConfigAdminHandler struct {
	configService *service.ConfigService
	logger        *zap.Logger
}

// NewConfigAdminHandler 创建配置管理处理器
func NewConfigAdminHandler(configService *service.ConfigService, logger *zap.Logger) *ConfigAdminHandler {
	return &ConfigAdminHandler{
		configService: configService,
		logger:        logger,
	}
}

// List 获取配置列表
// @Summary 获取配置列表
// @Description 获取所有系统配置，支持按分类筛选
// @Tags 管理后台-配置
// @Security ApiKeyAuth
// @Param category query string false "配置分类"
// @Success 200 {object} ConfigListResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/admin/configs [get]
func (h *ConfigAdminHandler) List(c *gin.Context) {
	category := c.Query("category")

	var configs []model.Config
	var err error

	if category != "" {
		configs, err = h.configService.GetByCategory(c.Request.Context(), category)
	} else {
		configs, err = h.configService.GetAllConfigs(c.Request.Context())
	}

	if err != nil {
		h.logger.Error("获取配置列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取配置列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": configs,
	})
}

// Get 获取配置详情
// @Summary 获取配置详情
// @Description 根据配置键获取配置详情
// @Tags 管理后台-配置
// @Security ApiKeyAuth
// @Param key path string true "配置键"
// @Success 200 {object} ConfigDetailResponse
// @Failure 404 {object} map[string]interface{}
// @Router /api/admin/configs/{key} [get]
func (h *ConfigAdminHandler) Get(c *gin.Context) {
	key := c.Param("key")

	config, err := h.configService.GetByKey(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    40400,
			"message": "配置不存在",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": config,
	})
}

// UpdateRequest 更新配置请求
type UpdateRequest struct {
	Value       string `json:"value" binding:"required"`
	Description string `json:"description"`
}

// Update 更新配置
// @Summary 更新配置
// @Description 更新指定配置的值，配置值必须是有效的 JSON 格式
// @Tags 管理后台-配置
// @Security ApiKeyAuth
// @Param key path string true "配置键"
// @Param request body UpdateRequest true "请求参数"
// @Success 200 {object} ConfigUpdateResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/admin/configs/{key} [put]
func (h *ConfigAdminHandler) Update(c *gin.Context) {
	key := c.Param("key")

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 验证 JSON 格式
	if !json.Valid([]byte(req.Value)) {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40002,
			"message": "配置值必须是有效的 JSON 格式",
		})
		return
	}

	// 获取管理员ID
	adminID, _ := c.Get("admin_id")

	err := h.configService.UpdateConfigValue(c.Request.Context(), key, json.RawMessage(req.Value), adminID.(uint64))
	if err != nil {
		if err == service.ErrConfigNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "配置不存在",
			})
			return
		}
		h.logger.Error("更新配置失败", zap.Error(err), zap.String("key", key))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "更新配置失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "更新成功",
	})
}

// CreateRequest 创建配置请求
type CreateRequest struct {
	Key         string `json:"key" binding:"required"`
	Value       string `json:"value" binding:"required"`
	Type        string `json:"type" binding:"required,oneof=string number boolean json array"`
	Category    string `json:"category" binding:"required"`
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public"`
}

// Create 创建配置
// @Summary 创建配置
// @Description 创建新的系统配置，配置值必须是有效的 JSON 格式
// @Tags 管理后台-配置
// @Security ApiKeyAuth
// @Param request body CreateRequest true "请求参数"
// @Success 200 {object} ConfigCreateResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/admin/configs [post]
func (h *ConfigAdminHandler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 验证 JSON 格式
	if !json.Valid([]byte(req.Value)) {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40002,
			"message": "配置值必须是有效的 JSON 格式",
		})
		return
	}

	config := &model.Config{
		Key:         req.Key,
		Value:       req.Value,
		Type:        req.Type,
		Category:    req.Category,
		Description: req.Description,
		IsPublic:    req.IsPublic,
	}

	adminID, _ := c.Get("admin_id")
	err := h.configService.UpsertConfig(c.Request.Context(), config, adminID.(uint64))
	if err != nil {
		h.logger.Error("创建配置失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "创建配置失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "创建成功",
		"data":    config,
	})
}

// Delete 删除配置
// @Summary 删除配置
// @Description 删除指定的系统配置
// @Tags 管理后台-配置
// @Security ApiKeyAuth
// @Param key path string true "配置键"
// @Success 200 {object} ConfigDeleteResponse
// @Failure 500 {object} map[string]interface{}
// @Router /api/admin/configs/{key} [delete]
func (h *ConfigAdminHandler) Delete(c *gin.Context) {
	key := c.Param("key")

	err := h.configService.DeleteConfig(c.Request.Context(), key)
	if err != nil {
		h.logger.Error("删除配置失败", zap.Error(err), zap.String("key", key))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "删除配置失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

// GetHistories 获取配置变更历史
// @Summary 获取配置变更历史
// @Description 获取指定配置的变更历史记录，支持分页
// @Tags 管理后台-配置
// @Security ApiKeyAuth
// @Param key path string true "配置键"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Success 200 {object} ConfigHistoriesResponse
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/admin/configs/{key}/histories [get]
func (h *ConfigAdminHandler) GetHistories(c *gin.Context) {
	key := c.Param("key")

	// 先获取配置ID
	config, err := h.configService.GetByKey(c.Request.Context(), key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    40400,
			"message": "配置不存在",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	histories, total, err := h.configService.GetConfigHistories(c.Request.Context(), config.ID, page, pageSize)
	if err != nil {
		h.logger.Error("获取配置历史失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取配置历史失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"histories": histories,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}
