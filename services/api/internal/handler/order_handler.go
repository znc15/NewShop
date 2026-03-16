package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/model"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// OrderHandler 订单处理器
type OrderHandler struct {
	orderService *service.OrderService
	logger       *zap.Logger
}

// NewOrderHandler 创建订单处理器实例
func NewOrderHandler(orderService *service.OrderService, logger *zap.Logger) *OrderHandler {
	return &OrderHandler{
		orderService: orderService,
		logger:       logger,
	}
}

// CreateOrder 创建订单
// @Summary 创建订单
// @Tags 订单
// @Security ApiKeyAuth
// @Param request body model.CreateOrderRequest true "请求参数"
// @Success 201 {object} OrderCreateResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders [post]
func (h *OrderHandler) CreateOrder(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req model.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	order, err := h.orderService.CreateOrder(c.Request.Context(), userID, &req)
	if err != nil {
		h.logger.Error("创建订单失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 0,
		"data": gin.H{
			"order_id":   order.ID,
			"order_no":   order.OrderNo,
			"status":     order.Status,
			"pay_amount": order.PayAmount,
		},
	})
}

// GetOrderList 获取订单列表
// @Summary 获取订单列表
// @Tags 订单
// @Security ApiKeyAuth
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param status query string false "订单状态筛选"
// @Success 200 {object} OrderListResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders [get]
func (h *OrderHandler) GetOrderList(c *gin.Context) {
	userID := c.GetUint64("user_id")

	// 解析分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	status := c.Query("status")

	orders, total, err := h.orderService.GetUserOrders(c.Request.Context(), userID, status, page, pageSize)
	if err != nil {
		h.logger.Error("获取订单列表失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取订单列表失败",
		})
		return
	}

	// 转换为响应格式
	list := make([]gin.H, 0, len(orders))
	for _, order := range orders {
		items := make([]gin.H, 0, len(order.Items))
		for _, item := range order.Items {
			items = append(items, gin.H{
				"product_id":   item.ProductID,
				"product_name": item.ProductName,
				"sku_name":     item.SkuName,
				"image":        item.Image,
				"price":        item.Price,
				"quantity":     item.Quantity,
				"total_amount": item.TotalAmount,
			})
		}

		list = append(list, gin.H{
			"id":               order.ID,
			"order_no":         order.OrderNo,
			"status":           order.Status,
			"total_amount":     order.TotalAmount,
			"pay_amount":       order.PayAmount,
			"freight_amount":   order.FreightAmount,
			"receiver_name":    order.ReceiverName,
			"receiver_phone":   order.ReceiverPhone,
			"receiver_address": order.ReceiverAddress,
			"items":            items,
			"created_at":       order.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"list":      list,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// GetOrderDetail 获取订单详情
// @Summary 获取订单详情
// @Tags 订单
// @Security ApiKeyAuth
// @Param id path int true "订单ID"
// @Success 200 {object} OrderDetailResponse
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders/{id} [get]
func (h *OrderHandler) GetOrderDetail(c *gin.Context) {
	userID := c.GetUint64("user_id")

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单ID",
		})
		return
	}

	order, err := h.orderService.GetOrderDetail(c.Request.Context(), userID, orderID)
	if err != nil {
		if err == service.ErrOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "订单不存在",
			})
			return
		}
		if err == service.ErrOrderNotYours {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    40300,
				"message": "无权访问此订单",
			})
			return
		}
		h.logger.Error("获取订单详情失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取订单详情失败",
		})
		return
	}

	// 转换订单商品
	items := make([]gin.H, 0, len(order.Items))
	for _, item := range order.Items {
		items = append(items, gin.H{
			"id":           item.ID,
			"product_id":   item.ProductID,
			"sku_id":       item.SkuID,
			"product_name": item.ProductName,
			"sku_name":     item.SkuName,
			"image":        item.Image,
			"price":        item.Price,
			"quantity":     item.Quantity,
			"total_amount": item.TotalAmount,
			"attributes":   item.Attributes,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"id":               order.ID,
			"order_no":         order.OrderNo,
			"status":           order.Status,
			"total_amount":     order.TotalAmount,
			"pay_amount":       order.PayAmount,
			"discount_amount":  order.DiscountAmount,
			"freight_amount":   order.FreightAmount,
			"payment_method":   order.PaymentMethod,
			"payment_time":     order.PaymentTime,
			"ship_time":        order.ShipTime,
			"receive_time":     order.ReceiveTime,
			"receiver_name":    order.ReceiverName,
			"receiver_phone":   order.ReceiverPhone,
			"receiver_address": order.ReceiverAddress,
			"remark":           order.Remark,
			"items":            items,
			"created_at":       order.CreatedAt,
			"updated_at":       order.UpdatedAt,
		},
	})
}

// CancelOrder 取消订单
// @Summary 取消订单
// @Tags 订单
// @Security ApiKeyAuth
// @Param id path int true "订单ID"
// @Param request body CancelOrderRequest true "取消原因"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders/{id}/cancel [put]
func (h *OrderHandler) CancelOrder(c *gin.Context) {
	userID := c.GetUint64("user_id")

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单ID",
		})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)

	if err := h.orderService.CancelOrder(c.Request.Context(), userID, orderID, req.Reason); err != nil {
		if err == service.ErrOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "订单不存在",
			})
			return
		}
		if err == service.ErrOrderNotYours {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    40300,
				"message": "无权操作此订单",
			})
			return
		}
		if err == service.ErrOrderStatusInvalid {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "订单状态不允许取消",
			})
			return
		}
		if err == service.ErrOrderAlreadyCancel {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40003,
				"message": "订单已取消",
			})
			return
		}
		h.logger.Error("取消订单失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "取消订单失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "订单已取消",
	})
}

// ConfirmReceive 确认收货
// @Summary 确认收货
// @Tags 订单
// @Security ApiKeyAuth
// @Param id path int true "订单ID"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders/{id}/confirm [put]
func (h *OrderHandler) ConfirmReceive(c *gin.Context) {
	userID := c.GetUint64("user_id")

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单ID",
		})
		return
	}

	if err := h.orderService.ConfirmReceive(c.Request.Context(), userID, orderID); err != nil {
		if err == service.ErrOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "订单不存在",
			})
			return
		}
		if err == service.ErrOrderNotYours {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    40300,
				"message": "无权操作此订单",
			})
			return
		}
		if err == service.ErrOrderStatusInvalid {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "订单状态不允许确认收货",
			})
			return
		}
		h.logger.Error("确认收货失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "确认收货失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "确认收货成功",
	})
}

// GetOrderStatus 获取订单状态
// @Summary 获取订单状态
// @Tags 订单
// @Security ApiKeyAuth
// @Param id path int true "订单ID"
// @Success 200 {object} OrderStatusResponse
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders/{id}/status [get]
func (h *OrderHandler) GetOrderStatus(c *gin.Context) {
	userID := c.GetUint64("user_id")

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单ID",
		})
		return
	}

	status, err := h.orderService.GetOrderStatus(c.Request.Context(), userID, orderID)
	if err != nil {
		if err == service.ErrOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "订单不存在",
			})
			return
		}
		if err == service.ErrOrderNotYours {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    40300,
				"message": "无权访问此订单",
			})
			return
		}
		h.logger.Error("获取订单状态失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取订单状态失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"status": status,
		},
	})
}

// GetOrderByNo 按订单号查询
// @Summary 按订单号查询订单
// @Tags 订单
// @Security ApiKeyAuth
// @Param order_no path string true "订单号"
// @Success 200 {object} OrderSimpleResponse
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders/no/{order_no} [get]
func (h *OrderHandler) GetOrderByNo(c *gin.Context) {
	userID := c.GetUint64("user_id")

	orderNo := c.Param("order_no")
	if orderNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "订单号不能为空",
		})
		return
	}

	order, err := h.orderService.GetOrderByNo(c.Request.Context(), userID, orderNo)
	if err != nil {
		if err == service.ErrOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "订单不存在",
			})
			return
		}
		if err == service.ErrOrderNotYours {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    40300,
				"message": "无权访问此订单",
			})
			return
		}
		h.logger.Error("按订单号查询失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "查询订单失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"id":               order.ID,
			"order_no":         order.OrderNo,
			"status":           order.Status,
			"total_amount":     order.TotalAmount,
			"pay_amount":       order.PayAmount,
			"receiver_name":    order.ReceiverName,
			"receiver_phone":   order.ReceiverPhone,
			"receiver_address": order.ReceiverAddress,
			"created_at":       order.CreatedAt,
		},
	})
}

// CheckoutPreview 结算预览
// @Summary 结算预览
// @Tags 订单
// @Security ApiKeyAuth
// @Param request body CheckoutPreviewRequest true "请求参数"
// @Success 200 {object} CheckoutPreviewResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders/checkout/preview [post]
func (h *OrderHandler) CheckoutPreview(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req struct {
		AddressID uint64   `json:"address_id" binding:"required"`
		ItemIDs   []uint64 `json:"item_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	preview, err := h.orderService.CheckoutPreview(c.Request.Context(), userID, req.AddressID, req.ItemIDs)
	if err != nil {
		h.logger.Error("结算预览失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "结算预览失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": preview,
	})
}

// ApplyRefund 申请退款
// @Summary 申请退款
// @Tags 订单
// @Security ApiKeyAuth
// @Param id path int true "订单ID"
// @Param request body RefundRequest true "退款原因"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders/{id}/refund [post]
func (h *OrderHandler) ApplyRefund(c *gin.Context) {
	userID := c.GetUint64("user_id")

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单ID",
		})
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误",
		})
		return
	}

	if err := h.orderService.ApplyRefund(c.Request.Context(), userID, orderID, req.Reason); err != nil {
		if err == service.ErrOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "订单不存在",
			})
			return
		}
		if err == service.ErrOrderNotYours {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    40300,
				"message": "无权操作此订单",
			})
			return
		}
		if err == service.ErrOrderStatusInvalid {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "订单状态不允许退款",
			})
			return
		}
		h.logger.Error("申请退款失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "申请退款失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "退款申请已提交",
	})
}

// GetLogistics 获取物流信息
// @Summary 获取物流信息
// @Tags 订单
// @Security ApiKeyAuth
// @Param id path int true "订单ID"
// @Success 200 {object} LogisticsResponse
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders/{id}/logistics [get]
func (h *OrderHandler) GetLogistics(c *gin.Context) {
	userID := c.GetUint64("user_id")

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单ID",
		})
		return
	}

	logistics, err := h.orderService.GetLogistics(c.Request.Context(), userID, orderID)
	if err != nil {
		if err == service.ErrOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "订单不存在",
			})
			return
		}
		if err == service.ErrOrderNotYours {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    40300,
				"message": "无权访问此订单",
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

// Reorder 一键复购
// @Summary 一键复购
// @Tags 订单
// @Security ApiKeyAuth
// @Param id path int true "订单ID"
// @Success 200 {object} ReorderResponse
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /orders/{id}/reorder [post]
func (h *OrderHandler) Reorder(c *gin.Context) {
	userID := c.GetUint64("user_id")

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的订单ID",
		})
		return
	}

	items, err := h.orderService.Reorder(c.Request.Context(), userID, orderID)
	if err != nil {
		if err == service.ErrOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "订单不存在",
			})
			return
		}
		if err == service.ErrOrderNotYours {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    40300,
				"message": "无权操作此订单",
			})
			return
		}
		h.logger.Error("一键复购失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "一键复购失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "已添加到购物车",
		"data": gin.H{
			"items": items,
		},
	})
}

// RegisterOrderRoutes 注册订单路由
func RegisterOrderRoutes(r *gin.RouterGroup, handler *OrderHandler) {
	orders := r.Group("/orders")
	{
		orders.POST("", handler.CreateOrder)
		orders.GET("", handler.GetOrderList)
		orders.GET("/no/:order_no", handler.GetOrderByNo)
		orders.POST("/checkout/preview", handler.CheckoutPreview)
		orders.GET("/:id", handler.GetOrderDetail)
		orders.GET("/:id/status", handler.GetOrderStatus)
		orders.GET("/:id/logistics", handler.GetLogistics)
		orders.POST("/:id/reorder", handler.Reorder)
		orders.POST("/:id/refund", handler.ApplyRefund)
		orders.PUT("/:id/cancel", handler.CancelOrder)
		orders.PUT("/:id/confirm", handler.ConfirmReceive)
	}
}

// ==================== Swagger 响应结构体 ====================

// OrderCreateResponse 创建订单响应
type OrderCreateResponse struct {
	Code int `json:"code"`
	Data struct {
		OrderID   uint64  `json:"order_id"`
		OrderNo   string  `json:"order_no"`
		Status    string  `json:"status"`
		PayAmount float64 `json:"pay_amount"`
	} `json:"data"`
}

// OrderListItem 订单列表项
type OrderListItem struct {
	ID              uint64      `json:"id"`
	OrderNo         string      `json:"order_no"`
	Status          string      `json:"status"`
	TotalAmount     float64     `json:"total_amount"`
	PayAmount       float64     `json:"pay_amount"`
	FreightAmount   float64     `json:"freight_amount"`
	ReceiverName    string      `json:"receiver_name"`
	ReceiverPhone   string      `json:"receiver_phone"`
	ReceiverAddress string      `json:"receiver_address"`
	Items           []OrderItem `json:"items"`
	CreatedAt       string      `json:"created_at"`
}

// OrderItem 订单商品项
type OrderItem struct {
	ProductID   uint64  `json:"product_id"`
	ProductName string  `json:"product_name"`
	SkuName     string  `json:"sku_name"`
	Image       string  `json:"image"`
	Price       float64 `json:"price"`
	Quantity    int     `json:"quantity"`
	TotalAmount float64 `json:"total_amount"`
}

// OrderListResponse 订单列表响应
type OrderListResponse struct {
	Code int `json:"code"`
	Data struct {
		List     []OrderListItem `json:"list"`
		Total    int64           `json:"total"`
		Page     int             `json:"page"`
		PageSize int             `json:"page_size"`
	} `json:"data"`
}

// OrderDetailItem 订单详情商品项
type OrderDetailItem struct {
	ID          uint64  `json:"id"`
	ProductID   uint64  `json:"product_id"`
	SkuID       uint64  `json:"sku_id"`
	ProductName string  `json:"product_name"`
	SkuName     string  `json:"sku_name"`
	Image       string  `json:"image"`
	Price       float64 `json:"price"`
	Quantity    int     `json:"quantity"`
	TotalAmount float64 `json:"total_amount"`
	Attributes  string  `json:"attributes"`
}

// OrderDetailResponse 订单详情响应
type OrderDetailResponse struct {
	Code int `json:"code"`
	Data struct {
		ID              uint64            `json:"id"`
		OrderNo         string            `json:"order_no"`
		Status          string            `json:"status"`
		TotalAmount     float64           `json:"total_amount"`
		PayAmount       float64           `json:"pay_amount"`
		DiscountAmount  float64           `json:"discount_amount"`
		FreightAmount   float64           `json:"freight_amount"`
		PaymentMethod   string            `json:"payment_method"`
		PaymentTime     string            `json:"payment_time"`
		ShipTime        string            `json:"ship_time"`
		ReceiveTime     string            `json:"receive_time"`
		ReceiverName    string            `json:"receiver_name"`
		ReceiverPhone   string            `json:"receiver_phone"`
		ReceiverAddress string            `json:"receiver_address"`
		Remark          string            `json:"remark"`
		Items           []OrderDetailItem `json:"items"`
		CreatedAt       string            `json:"created_at"`
		UpdatedAt       string            `json:"updated_at"`
	} `json:"data"`
}

// OrderStatusResponse 订单状态响应
type OrderStatusResponse struct {
	Code int `json:"code"`
	Data struct {
		Status string `json:"status"`
	} `json:"data"`
}

// OrderSimpleResponse 简单订单响应
type OrderSimpleResponse struct {
	Code int `json:"code"`
	Data struct {
		ID              uint64  `json:"id"`
		OrderNo         string  `json:"order_no"`
		Status          string  `json:"status"`
		TotalAmount     float64 `json:"total_amount"`
		PayAmount       float64 `json:"pay_amount"`
		ReceiverName    string  `json:"receiver_name"`
		ReceiverPhone   string  `json:"receiver_phone"`
		ReceiverAddress string  `json:"receiver_address"`
		CreatedAt       string  `json:"created_at"`
	} `json:"data"`
}

// CancelOrderRequest 取消订单请求
type CancelOrderRequest struct {
	Reason string `json:"reason"`
}

// CheckoutPreviewRequest 结算预览请求
type CheckoutPreviewRequest struct {
	AddressID uint64   `json:"address_id"`
	ItemIDs   []uint64 `json:"item_ids"`
}

// CheckoutPreviewResponse 结算预览响应
type CheckoutPreviewResponse struct {
	Code int         `json:"code"`
	Data interface{} `json:"data"`
}

// RefundRequest 退款请求
type RefundRequest struct {
	Reason string `json:"reason"`
}

// LogisticsResponse 物流信息响应
type LogisticsResponse struct {
	Code int         `json:"code"`
	Data interface{} `json:"data"`
}

// ReorderResponse 一键复购响应
type ReorderResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    struct {
		Items interface{} `json:"items"`
	} `json:"data"`
}
