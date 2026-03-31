package admin

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"newshop/api/internal/model"
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

// ==================== 响应结构体 ====================

// OrderAdminListResponse 订单列表响应
type OrderAdminListResponse struct {
	Code int                `json:"code" example:"0"`
	Data OrderAdminListData `json:"data"`
}

// OrderAdminListData 订单列表数据
type OrderAdminListData struct {
	Orders []OrderAdminListItem `json:"orders"`
	Total  int64                `json:"total"`
	Page   int                  `json:"page"`
}

// OrderAdminListItem 订单列表项
type OrderAdminListItem struct {
	ID             uint64  `json:"id" example:"1"`
	OrderNo        string  `json:"order_no" example:"ORD202401010001"`
	UserID         uint64  `json:"user_id" example:"1"`
	UserName       string  `json:"user_name,omitempty" example:"张三"`
	TotalAmount    float64 `json:"total_amount" example:"299.00"`
	PayAmount      float64 `json:"pay_amount" example:"279.00"`
	DiscountAmount float64 `json:"discount_amount" example:"20.00"`
	Status         string  `json:"status" example:"paid"`
	PaymentMethod  string  `json:"payment_method,omitempty" example:"alipay"`
	PaymentTime    string  `json:"payment_time,omitempty" example:"2024-01-01T12:00:00Z"`
	CreatedAt      string  `json:"created_at" example:"2024-01-01T10:00:00Z"`
}

// OrderAdminDetailResponse 订单详情响应
type OrderAdminDetailResponse struct {
	Code int                   `json:"code" example:"0"`
	Data *OrderAdminDetailData `json:"data"`
}

// OrderAdminDetailData 订单详情数据
type OrderAdminDetailData struct {
	ID              uint64               `json:"id" example:"1"`
	OrderNo         string               `json:"order_no" example:"ORD202401010001"`
	UserID          uint64               `json:"user_id" example:"1"`
	UserName        string               `json:"user_name,omitempty" example:"张三"`
	UserPhone       string               `json:"user_phone,omitempty" example:"13800138000"`
	TotalAmount     float64              `json:"total_amount" example:"299.00"`
	PayAmount       float64              `json:"pay_amount" example:"279.00"`
	DiscountAmount  float64              `json:"discount_amount" example:"20.00"`
	Status          string               `json:"status" example:"paid"`
	PaymentMethod   string               `json:"payment_method,omitempty" example:"alipay"`
	PaymentTime     string               `json:"payment_time,omitempty" example:"2024-01-01T12:00:00Z"`
	ReceiverName    string               `json:"receiver_name" example:"李四"`
	ReceiverPhone   string               `json:"receiver_phone" example:"13900139000"`
	ReceiverAddress string               `json:"receiver_address" example:"北京市朝阳区xxx街道xxx号"`
	ExpressCompany  string               `json:"express_company,omitempty" example:"顺丰速运"`
	ExpressNo       string               `json:"express_no,omitempty" example:"SF1234567890"`
	ShippedAt       string               `json:"shipped_at,omitempty" example:"2024-01-02T10:00:00Z"`
	Items           []OrderAdminItemData `json:"items"`
	CreatedAt       string               `json:"created_at" example:"2024-01-01T10:00:00Z"`
	UpdatedAt       string               `json:"updated_at" example:"2024-01-02T10:00:00Z"`
}

// OrderAdminItemData 订单商品项数据
type OrderAdminItemData struct {
	ID          uint64  `json:"id" example:"1"`
	ProductID   uint64  `json:"product_id" example:"1"`
	ProductName string  `json:"product_name" example:"iPhone 15 Pro"`
	SkuID       uint64  `json:"sku_id" example:"1"`
	SkuSpecs    string  `json:"sku_specs,omitempty" example:"颜色:深空黑;容量:256GB"`
	Price       float64 `json:"price" example:"7999.00"`
	Quantity    int     `json:"quantity" example:"1"`
	Image       string  `json:"image,omitempty" example:"https://example.com/product.jpg"`
}

// OrderAdminStatisticsResponse 订单统计响应
type OrderAdminStatisticsResponse struct {
	Code int                       `json:"code" example:"0"`
	Data *OrderAdminStatisticsData `json:"data"`
}

// OrderAdminStatisticsData 订单统计数据
type OrderAdminStatisticsData struct {
	TotalOrders     int64   `json:"total_orders" example:"1000"`
	TotalAmount     float64 `json:"total_amount" example:"99999.00"`
	TotalPayAmount  float64 `json:"total_pay_amount" example:"89999.00"`
	PendingOrders   int64   `json:"pending_orders" example:"50"`
	PaidOrders      int64   `json:"paid_orders" example:"800"`
	ShippedOrders   int64   `json:"shipped_orders" example:"100"`
	CompletedOrders int64   `json:"completed_orders" example:"40"`
	CancelledOrders int64   `json:"cancelled_orders" example:"10"`
	RefundedOrders  int64   `json:"refunded_orders" example:"5"`
}

// OrderAdminSuccessResponse 操作成功响应
type OrderAdminSuccessResponse struct {
	Code    int    `json:"code" example:"0"`
	Message string `json:"message" example:"操作成功"`
}

// OrderAdminErrorResponse 错误响应
type OrderAdminErrorResponse struct {
	Code    int    `json:"code" example:"40001"`
	Message string `json:"message" example:"请求参数错误"`
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
// @Summary 获取订单列表
// @Tags 管理后台-订单
// @Security ApiKeyAuth
// @Param status query string false "订单状态"
// @Param user_id query uint64 false "用户ID"
// @Param order_no query string false "订单号"
// @Param start_date query string false "开始日期 (YYYY-MM-DD)"
// @Param end_date query string false "结束日期 (YYYY-MM-DD)"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Success 200 {object} OrderAdminListResponse
// @Failure 400 {object} OrderAdminErrorResponse
// @Failure 500 {object} OrderAdminErrorResponse
// @Router /api/admin/orders [get]
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
		"data": buildOrderListData(result.Orders, result.Total, result.Page, query.PageSize),
	})
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func buildOrderListData(orders []model.Order, total int64, page, pageSize int) gin.H {
	if pageSize <= 0 {
		pageSize = 20
	}

	items := make([]gin.H, 0, len(orders))
	for _, order := range orders {
		items = append(items, buildOrderPayload(order))
	}

	return gin.H{
		"items":       items,
		"orders":      items,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": maxInt(1, int((total+int64(pageSize)-1)/int64(pageSize))),
	}
}

func buildOrderPayload(order model.Order) gin.H {
	return gin.H{
		"id":               order.ID,
		"order_no":         order.OrderNo,
		"user_id":          order.UserID,
		"status":           order.Status,
		"total_amount":     order.TotalAmount,
		"discount_amount":  order.DiscountAmount,
		"shipping_fee":     order.FreightAmount,
		"freight_amount":   order.FreightAmount,
		"pay_amount":       order.PayAmount,
		"payment_method":   order.PaymentMethod,
		"receiver_name":    order.ReceiverName,
		"receiver_phone":   order.ReceiverPhone,
		"receiver_address": order.ReceiverAddress,
		"items_count":      len(order.Items),
		"remark":           order.Remark,
		"refund_reason":    nullableString(order.RefundReason),
		"tracking_company": nullableString(order.ExpressCompany),
		"express_company":  nullableString(order.ExpressCompany),
		"tracking_no":      nullableString(order.ExpressNo),
		"express_no":       nullableString(order.ExpressNo),
		"paid_at":          order.PaymentTime,
		"payment_time":     order.PaymentTime,
		"shipped_at":       order.ShipTime,
		"ship_time":        order.ShipTime,
		"delivered_at":     order.ReceiveTime,
		"receive_time":     order.ReceiveTime,
		"refunded_at":      order.RefundTime,
		"refund_time":      order.RefundTime,
		"created_at":       order.CreatedAt,
		"updated_at":       order.UpdatedAt,
		"items":            order.Items,
	}
}

func nullableString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

// GetOrderDetail 获取订单详情
// @Summary 获取订单详情
// @Tags 管理后台-订单
// @Security ApiKeyAuth
// @Param id path uint64 true "订单ID"
// @Success 200 {object} OrderAdminDetailResponse
// @Failure 400 {object} OrderAdminErrorResponse
// @Failure 404 {object} OrderAdminErrorResponse
// @Failure 500 {object} OrderAdminErrorResponse
// @Router /api/admin/orders/{id} [get]
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
		"data": buildOrderPayload(*order),
	})
}

// ShipOrderRequest 发货请求
type ShipOrderRequest struct {
	ExpressCompany  string `json:"express_company" example:"顺丰速运"`     // 物流公司（兼容字段）
	ExpressNo       string `json:"express_no" example:"SF1234567890"`  // 物流单号（兼容字段）
	TrackingCompany string `json:"tracking_company" example:"顺丰速运"`    // 物流公司（新字段）
	TrackingNo      string `json:"tracking_no" example:"SF1234567890"` // 物流单号（新字段）
}

// RefundOrderRequest 退款请求
type RefundOrderRequest struct {
	RefundAmount float64 `json:"refund_amount" example:"299.00"` // 退款金额（新字段）
	RefundReason string  `json:"refund_reason" example:"用户申请退款"` // 退款原因（新字段）
	Amount       float64 `json:"amount" example:"299.00"`        // 退款金额（旧字段）
	Reason       string  `json:"reason" example:"用户申请退款"`        // 退款原因（旧字段）
}

// ShipOrder 发货
// @Summary 订单发货
// @Tags 管理后台-订单
// @Security ApiKeyAuth
// @Param id path uint64 true "订单ID"
// @Param request body ShipOrderRequest true "发货信息"
// @Success 200 {object} OrderAdminSuccessResponse
// @Failure 400 {object} OrderAdminErrorResponse
// @Failure 404 {object} OrderAdminErrorResponse
// @Failure 500 {object} OrderAdminErrorResponse
// @Router /api/admin/orders/{id}/ship [put]
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

	expressCompany := strings.TrimSpace(req.ExpressCompany)
	if expressCompany == "" {
		expressCompany = strings.TrimSpace(req.TrackingCompany)
	}

	expressNo := strings.TrimSpace(req.ExpressNo)
	if expressNo == "" {
		expressNo = strings.TrimSpace(req.TrackingNo)
	}

	if expressCompany == "" || expressNo == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40002,
			"message": "物流公司和物流单号不能为空",
		})
		return
	}

	// 获取管理员ID
	adminID := c.GetUint64("user_id")

	input := admin.ShipOrderInput{
		ExpressCompany: expressCompany,
		ExpressNo:      expressNo,
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

// RefundOrder 退款
// @Summary 订单退款
// @Tags 管理后台-订单
// @Security ApiKeyAuth
// @Param id path uint64 true "订单ID"
// @Param request body RefundOrderRequest true "退款信息"
// @Success 200 {object} OrderAdminSuccessResponse
// @Failure 400 {object} OrderAdminErrorResponse
// @Failure 404 {object} OrderAdminErrorResponse
// @Failure 500 {object} OrderAdminErrorResponse
// @Router /api/admin/orders/{id}/refund [put]
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

	refundAmount, refundReason := resolveRefundInput(req)
	if refundAmount <= 0 || refundReason == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40002,
			"message": "退款金额和退款原因不能为空",
		})
		return
	}

	// 获取管理员ID
	adminID := c.GetUint64("user_id")

	input := admin.RefundOrderInput{
		RefundAmount: refundAmount,
		RefundReason: refundReason,
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

func resolveRefundInput(req RefundOrderRequest) (float64, string) {
	refundAmount := req.RefundAmount
	if refundAmount <= 0 {
		refundAmount = req.Amount
	}

	refundReason := strings.TrimSpace(req.RefundReason)
	if refundReason == "" {
		refundReason = strings.TrimSpace(req.Reason)
	}

	return refundAmount, refundReason
}

// StatisticsQuery 统计查询参数
type StatisticsQuery struct {
	StartDate string `form:"start_date"` // 开始日期 YYYY-MM-DD
	EndDate   string `form:"end_date"`   // 结束日期 YYYY-MM-DD
}

// GetStatistics 获取订单统计
// @Summary 获取订单统计
// @Tags 管理后台-订单
// @Security ApiKeyAuth
// @Param start_date query string false "开始日期 (YYYY-MM-DD)"
// @Param end_date query string false "结束日期 (YYYY-MM-DD)"
// @Success 200 {object} OrderAdminStatisticsResponse
// @Failure 400 {object} OrderAdminErrorResponse
// @Failure 500 {object} OrderAdminErrorResponse
// @Router /api/admin/orders/statistics [get]
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
