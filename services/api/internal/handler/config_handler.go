package handler

import (
	"net/http"

	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ConfigHandler struct {
	configService *service.ConfigService
	logger        *zap.Logger
}

func NewConfigHandler(configService *service.ConfigService, logger *zap.Logger) *ConfigHandler {
	return &ConfigHandler{
		configService: configService,
		logger:        logger,
	}
}

func (h *ConfigHandler) GetPublicConfigs(c *gin.Context) {
	configs, err := h.configService.GetPublicConfigs(c.Request.Context())
	if err != nil {
		h.logger.Error("获取公开配置失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取公开配置失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": configs,
	})
}
