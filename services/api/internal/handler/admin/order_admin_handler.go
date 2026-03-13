package admin

import (
	"net/http"
	"strconv"
	"time"

	"newshop/api/internal/repository"
	"newshop/api/internal/service/admin"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// OrderAdminHandler 订单管理 Handler
type OrderAdminHandler struct {
	service *admin.OrderAdminService
	logger  *zap.Logger
}

// NewOrderAdminHandler 创建订单管理 Handler
func NewOrderAdminHandler(service *admin.OrderAdminService, logger *zap.Logger) *OrderAdminHandler {
	return &OrderAdminHandler{
		service: service,
		logger:  logger,
	}
}

// OrderListQuery 订单列表查询参数
type OrderListQuery struct {
	Status    string `form:"status"`     // 状态筛选
	UserID    uint64 `form:"user_id"`    // 用户ID筛选
	OrderNo   string `form:"order_no"`   // 订单号筛选
	StartDate string `form:"start_date"` // 开始日期 YYYY-MM-DD
	EndDate   string `form:"end_date"`   // 结束日期 YYYY-MM-DD
	Page      int    `form:"page"`       // 页码
	PageSize  int    `form:"page_size"`  // 每页数量
}

// ListOrders 获取订单列表
// GET /admin/orders
func (h *OrderAdminHandler) ListOrders(c *gin.Context) {
	var query OrderListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 设置默认分页
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 || query.PageSize > 100 {
		query.PageSize = 20
	}

	// 构建筛选条件
	filter := repository.OrderListFilter{
		Status:   query.Status,
		UserID:   query.UserID,
		OrderNo:  query.OrderNo,
		Page:     query.Page,
		PageSize: query.PageSize,
	}

	// 解析时间范围
	if query.StartDate != "" {
		startTime, err := time.Parse("2006-01-02", query.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "开始日期格式错误",
			})
			return
		}
		filter.StartTime = &startTime
	}

	if query.EndDate != "" {
		endTime, err := time.Parse("2006-01-02", query.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40003,
				"message": "结束日期格式错误",
			})
			return
		}
		// 设置为当天的最后一秒
		endTime = endTime.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		filter.EndTime = &endTime
	}

	result, err := h.service.GetOrderList(c.Request.Context(), filter)
	if err != nil {
		h.logger.Error("获取订单列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取订单列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"orders": result.Orders,
			"total":  result.Total,
			"page":   result.Page,
		},
	})
}

// GetOrderDetail 获取订单详情
// GET /admin/orders/:id
func (h *OrderAdminHandler) GetOrderDetail(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单 ID",
		})
		return
	}

	order, err := h.service.GetOrderDetail(c.Request.Context(), id)
	if err != nil {
		if err == admin.ErrOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40401,
				"message": "订单不存在",
			})
			return
		}
		h.logger.Error("获取订单详情失败", zap.Error(err), zap.Uint64("order_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取订单详情失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": order,
	})
}

// ShipOrderRequest 发货请求
type ShipOrderRequest struct {
	ExpressCompany string `json:"express_company" binding:"required"` // 物流公司
	ExpressNo      string `json:"express_no" binding:"required"`      // 物流单号
}

// ShipOrder 发货
// PUT /admin/orders/:id/ship
func (h *OrderAdminHandler) ShipOrder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单 ID",
		})
		return
	}

	var req ShipOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40002,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 获取管理员ID
	adminID := c.GetUint64("user_id")

	input := admin.ShipOrderInput{
		ExpressCompany: req.ExpressCompany,
		ExpressNo:      req.ExpressNo,
	}

	err = h.service.ShipOrder(c.Request.Context(), id, adminID, input)
	if err != nil {
		switch err {
		case admin.ErrOrderNotFound:
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40401,
				"message": "订单不存在",
			})
		case admin.ErrOrderCannotShip:
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40003,
				"message": "当前订单状态无法发货",
			})
		default:
			h.logger.Error("发货失败", zap.Error(err), zap.Uint64("order_id", id))
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    50000,
				"message": "发货失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "发货成功",
	})
}

// RefundOrderRequest 退款请求
type RefundOrderRequest struct {
	RefundAmount float64 `json:"refund_amount" binding:"required,gt=0"` // 退款金额
	RefundReason string  `json:"refund_reason" binding:"required"`      // 退款原因
}

// RefundOrder 退款
// PUT /admin/orders/:id/refund
func (h *OrderAdminHandler) RefundOrder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单 ID",
		})
		return
	}

	var req RefundOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40002,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 获取管理员ID
	adminID := c.GetUint64("user_id")

	input := admin.RefundOrderInput{
		RefundAmount: req.RefundAmount,
		RefundReason:  req.RefundReason,
	}

	err = h.service.RefundOrder(c.Request.Context(), id, adminID, input)
	if err != nil {
		switch err {
		case admin.ErrOrderNotFound:
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40401,
				"message": "订单不存在",
			})
		case admin.ErrOrderCannotRefund:
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40003,
				"message": "当前订单状态无法退款",
			})
		case admin.ErrRefundAmountInvalid:
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40004,
				"message": "退款金额无效",
			})
		default:
			h.logger.Error("退款失败", zap.Error(err), zap.Uint64("order_id", id))
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    50000,
				"message": "退款失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "退款成功",
	})
}

// StatisticsQuery 统计查询参数
type StatisticsQuery struct {
	StartDate string `form:"start_date"` // 开始日期 YYYY-MM-DD
	EndDate   string `form:"end_date"`   // 结束日期 YYYY-MM-DD
}

// GetStatistics 获取订单统计
// GET /admin/orders/statistics
func (h *OrderAdminHandler) GetStatistics(c *gin.Context) {
	var query StatisticsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	var startTime, endTime *time.Time

	// 解析时间范围
	if query.StartDate != "" {
		t, err := time.Parse("2006-01-02", query.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "开始日期格式错误",
			})
			return
		}
		startTime = &t
	}

	if query.EndDate != "" {
		t, err := time.Parse("2006-01-02", query.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40003,
				"message": "结束日期格式错误",
			})
			return
		}
		// 设置为当天的最后一秒
		t = t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		endTime = &t
	}

	stats, err := h.service.GetOrderStatistics(c.Request.Context(), startTime, endTime)
	if err != nil {
		h.logger.Error("获取订单统计失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取订单统计失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": stats,
	})
}

// RegisterOrderAdminRoutes 注册订单管理路由
func RegisterOrderAdminRoutes(r *gin.RouterGroup, handler *OrderAdminHandler) {
	orders := r.Group("/orders")
	{
		orders.GET("", handler.ListOrders)
		orders.GET("/statistics", handler.GetStatistics)
		orders.GET("/:id", handler.GetOrderDetail)
		orders.PUT("/:id/ship", handler.ShipOrder)
		orders.PUT("/:id/refund", handler.RefundOrder)
	}
}
