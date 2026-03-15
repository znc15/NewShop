package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/model"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// LogisticsHandler 物流处理器
type LogisticsHandler struct {
	logisticsService *service.LogisticsService
	logger           *zap.Logger
}

// NewLogisticsHandler 创建物流处理器实例
func NewLogisticsHandler(logisticsService *service.LogisticsService, logger *zap.Logger) *LogisticsHandler {
	return &LogisticsHandler{
		logisticsService: logisticsService,
		logger:           logger,
	}
}

// GetCompanies 获取物流公司列表
// GET /api/v1/logistics/companies
func (h *LogisticsHandler) GetCompanies(c *gin.Context) {
	status := c.Query("status")

	companies, err := h.logisticsService.GetCompanies(c.Request.Context(), status)
	if err != nil {
		h.logger.Error("获取物流公司列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取物流公司列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": companies,
	})
}

// GetLogisticsByOrderID 获取订单物流信息
// GET /api/v1/logistics/:order_id
func (h *LogisticsHandler) GetLogisticsByOrderID(c *gin.Context) {
	orderID, err := strconv.ParseUint(c.Param("order_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单ID",
		})
		return
	}

	logistics, err := h.logisticsService.GetLogisticsByOrderID(c.Request.Context(), orderID)
	if err != nil {
		if err == service.ErrLogisticsNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "物流信息不存在",
			})
			return
		}
		h.logger.Error("获取物流信息失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取物流信息失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": logistics,
	})
}

// CreateLogistics 创建物流信息（管理端）
// POST /api/v1/admin/logistics
func (h *LogisticsHandler) CreateLogistics(c *gin.Context) {
	var req model.CreateLogisticsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	logistics, err := h.logisticsService.CreateLogistics(c.Request.Context(), &req)
	if err != nil {
		if err == service.ErrOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "订单不存在",
			})
			return
		}
		if err == service.ErrOrderLogisticsExists {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "该订单已存在物流信息",
			})
			return
		}
		if err == service.ErrLogisticsCompanyNotFound {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40003,
				"message": "物流公司不存在",
			})
			return
		}
		h.logger.Error("创建物流信息失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "创建物流信息失败",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 0,
		"data": gin.H{
			"id":           logistics.ID,
			"order_id":     logistics.OrderID,
			"company_id":   logistics.CompanyID,
			"tracking_no":  logistics.TrackingNo,
			"status":       logistics.Status,
			"created_at":   logistics.CreatedAt,
		},
		"message": "创建物流信息成功",
	})
}

// UpdateLogistics 更新物流信息（管理端）
// PUT /api/v1/admin/logistics/:id
func (h *LogisticsHandler) UpdateLogistics(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的物流ID",
		})
		return
	}

	var req model.UpdateLogisticsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	logistics, err := h.logisticsService.UpdateLogistics(c.Request.Context(), id, &req)
	if err != nil {
		if err == service.ErrLogisticsNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "物流信息不存在",
			})
			return
		}
		if err == service.ErrLogisticsCompanyNotFound {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40003,
				"message": "物流公司不存在",
			})
			return
		}
		h.logger.Error("更新物流信息失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "更新物流信息失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "更新物流信息成功",
		"data": gin.H{
			"id":          logistics.ID,
			"order_id":    logistics.OrderID,
			"company_id":  logistics.CompanyID,
			"tracking_no": logistics.TrackingNo,
			"status":      logistics.Status,
			"updated_at":  logistics.UpdatedAt,
		},
	})
}

// AddTrace 添加物流轨迹（管理端）
// POST /api/v1/admin/logistics/:id/traces
func (h *LogisticsHandler) AddTrace(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的物流ID",
		})
		return
	}

	var req model.AddTraceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	if err := h.logisticsService.AddTrace(c.Request.Context(), id, &req); err != nil {
		if err == service.ErrLogisticsNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "物流信息不存在",
			})
			return
		}
		h.logger.Error("添加物流轨迹失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "添加物流轨迹失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "添加物流轨迹成功",
	})
}

// CreateCompany 创建物流公司（管理端）
// POST /api/v1/admin/logistics/companies
func (h *LogisticsHandler) CreateCompany(c *gin.Context) {
	var req model.CreateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	company, err := h.logisticsService.CreateCompany(c.Request.Context(), &req)
	if err != nil {
		if err.Error() == "物流公司编码已存在" {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "物流公司编码已存在",
			})
			return
		}
		h.logger.Error("创建物流公司失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "创建物流公司失败",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 0,
		"data": company,
		"message": "创建物流公司成功",
	})
}

// UpdateCompany 更新物流公司（管理端）
// PUT /api/v1/admin/logistics/companies/:id
func (h *LogisticsHandler) UpdateCompany(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的物流公司ID",
		})
		return
	}

	var req model.UpdateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	company, err := h.logisticsService.UpdateCompany(c.Request.Context(), id, &req)
	if err != nil {
		if err == service.ErrLogisticsCompanyNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "物流公司不存在",
			})
			return
		}
		h.logger.Error("更新物流公司失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "更新物流公司失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "更新物流公司成功",
		"data":    company,
	})
}

// DeleteCompany 删除物流公司（管理端）
// DELETE /api/v1/admin/logistics/companies/:id
func (h *LogisticsHandler) DeleteCompany(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的物流公司ID",
		})
		return
	}

	if err := h.logisticsService.DeleteCompany(c.Request.Context(), id); err != nil {
		if err == service.ErrLogisticsCompanyNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "物流公司不存在",
			})
			return
		}
		h.logger.Error("删除物流公司失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "删除物流公司失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除物流公司成功",
	})
}

// GetLogisticsDetail 获取物流详情（管理端）
// GET /api/v1/admin/logistics/:id
func (h *LogisticsHandler) GetLogisticsDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的物流ID",
		})
		return
	}

	logistics, err := h.logisticsService.GetLogisticsByID(c.Request.Context(), id)
	if err != nil {
		if err == service.ErrLogisticsNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "物流信息不存在",
			})
			return
		}
		h.logger.Error("获取物流信息失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取物流信息失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": logistics,
	})
}

// RegisterLogisticsRoutes 注册物流路由（用户端）
func RegisterLogisticsRoutes(r *gin.RouterGroup, handler *LogisticsHandler) {
	logistics := r.Group("/logistics")
	{
		// 获取物流公司列表（公开）
		logistics.GET("/companies", handler.GetCompanies)
		// 根据订单ID获取物流信息
		logistics.GET("/:order_id", handler.GetLogisticsByOrderID)
	}
}

// RegisterAdminLogisticsRoutes 注册物流管理路由（管理端）
func RegisterAdminLogisticsRoutes(r *gin.RouterGroup, handler *LogisticsHandler) {
	logistics := r.Group("/logistics")
	{
		// 物流公司管理
		logistics.GET("/companies", handler.GetCompanies)
		logistics.POST("/companies", handler.CreateCompany)
		logistics.PUT("/companies/:id", handler.UpdateCompany)
		logistics.DELETE("/companies/:id", handler.DeleteCompany)

		// 物流信息管理
		logistics.POST("", handler.CreateLogistics)
		logistics.GET("/:id", handler.GetLogisticsDetail)
		logistics.PUT("/:id", handler.UpdateLogistics)
		logistics.POST("/:id/traces", handler.AddTrace)
	}
}