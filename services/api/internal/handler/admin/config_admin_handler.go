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
// GET /api/admin/configs
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
// GET /api/admin/configs/:key
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
// PUT /api/admin/configs/:key
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
// POST /api/admin/configs
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
// DELETE /api/admin/configs/:key
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
// GET /api/admin/configs/:key/histories
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