package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/model"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type PresaleHandler struct {
	presaleService *service.PresaleService
	logger         *zap.Logger
}

func NewPresaleHandler(presaleService *service.PresaleService, logger *zap.Logger) *PresaleHandler {
	return &PresaleHandler{
		presaleService: presaleService,
		logger:         logger,
	}
}

// PresaleListRequest 预售列表请求
type PresaleListRequest struct {
	Status   string `form:"status" binding:"omitempty,oneof=draft pending deposit balance finished cancelled"`
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PageSize int    `form:"page_size" binding:"omitempty,min=1,max=100"`
}

// PresaleListResponse 预售列表响应
type PresaleListResponse struct {
	List  []model.Presale `json:"list"`
	Total int64           `json:"total"`
	Page  int             `json:"page"`
}

// GetPresaleList 获取预售列表
// @Summary 获取预售列表
// @Tags 预售
// @Param status query string false "状态筛选"
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Success 200 {object} PresaleListResponse
// @Router /presales [get]
func (h *PresaleHandler) GetPresaleList(c *gin.Context) {
	var req PresaleListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 20
	}

	presales, total, err := h.presaleService.GetPresaleList(c.Request.Context(), model.PresaleStatus(req.Status), req.Page, req.PageSize)
	if err != nil {
		h.logger.Error("获取预售列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取预售列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": PresaleListResponse{
			List:  presales,
			Total: total,
			Page:  req.Page,
		},
	})
}

// GetActivePresaleList 获取当前可参与的预售列表
// @Summary 获取当前可参与的预售列表
// @Tags 预售
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Success 200 {object} PresaleListResponse
// @Router /presales/active [get]
func (h *PresaleHandler) GetActivePresaleList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	presales, total, err := h.presaleService.GetActivePresaleList(c.Request.Context(), page, pageSize)
	if err != nil {
		h.logger.Error("获取活跃预售列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取预售列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": PresaleListResponse{
			List:  presales,
			Total: total,
			Page:  page,
		},
	})
}

// GetPresaleDetail 获取预售详情
// @Summary 获取预售详情
// @Tags 预售
// @Param id path int true "预售ID"
// @Success 200 {object} model.Presale
// @Router /presales/{id} [get]
func (h *PresaleHandler) GetPresaleDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的预售ID"})
		return
	}

	presale, err := h.presaleService.GetPresaleDetail(c.Request.Context(), id)
	if err != nil {
		if err == service.ErrPresaleNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "预售商品不存在"})
			return
		}
		h.logger.Error("获取预售详情失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取预售详情失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": presale,
	})
}

// CreatePresaleOrderRequest 创建预售订单请求
type CreatePresaleOrderRequest struct {
	PresaleID uint64 `json:"presale_id" binding:"required"`
}

// CreatePresaleOrder 创建预售订单
// @Summary 创建预售订单
// @Tags 预售
// @Param request body CreatePresaleOrderRequest true "请求参数"
// @Success 200 {object} model.PresaleOrder
// @Router /presales/orders [post]
func (h *PresaleHandler) CreatePresaleOrder(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req CreatePresaleOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	order, err := h.presaleService.CreatePresaleOrder(c.Request.Context(), userID, req.PresaleID)
	if err != nil {
		switch err {
		case service.ErrPresaleNotFound:
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "预售商品不存在"})
		case service.ErrPresaleNotActive:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "预售活动未开始或已结束"})
		case service.ErrPresaleOutOfStock:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "预售商品库存不足"})
		case service.ErrPresaleOrderExists:
			c.JSON(http.StatusConflict, gin.H{"code": 40901, "message": "已参与该预售活动"})
		case service.ErrDepositTimeNotValid:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40004, "message": "不在定金支付时间范围内"})
		default:
			h.logger.Error("创建预售订单失败", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "创建预售订单失败"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 0,
		"data": order,
	})
}

// PayDepositRequest 支付定金请求
type PayDepositRequest struct {
	OrderID uint64 `json:"order_id" binding:"required"`
}

// PayDeposit 支付定金
// @Summary 支付定金
// @Tags 预售
// @Param request body PayDepositRequest true "请求参数"
// @Success 200 {object} model.PresaleOrder
// @Router /presales/orders/deposit [post]
func (h *PresaleHandler) PayDeposit(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req PayDepositRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	order, err := h.presaleService.PayDeposit(c.Request.Context(), req.OrderID, userID)
	if err != nil {
		switch err {
		case service.ErrPresaleOrderNotFound:
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "预售订单不存在"})
		case service.ErrOrderStatusInvalid:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "订单状态不正确"})
		case service.ErrDepositAlreadyPaid:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "定金已支付"})
		case service.ErrDepositTimeNotValid:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40004, "message": "不在定金支付时间范围内"})
		default:
			h.logger.Error("支付定金失败", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "支付定金失败"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "定金支付成功",
		"data":    order,
	})
}

// PayBalanceRequest 支付尾款请求
type PayBalanceRequest struct {
	OrderID uint64 `json:"order_id" binding:"required"`
}

// PayBalance 支付尾款
// @Summary 支付尾款
// @Tags 预售
// @Param request body PayBalanceRequest true "请求参数"
// @Success 200 {object} model.PresaleOrder
// @Router /presales/orders/balance [post]
func (h *PresaleHandler) PayBalance(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req PayBalanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	order, err := h.presaleService.PayBalance(c.Request.Context(), req.OrderID, userID)
	if err != nil {
		switch err {
		case service.ErrPresaleOrderNotFound:
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "预售订单不存在"})
		case service.ErrOrderStatusInvalid:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "订单状态不正确"})
		case service.ErrDepositNotPaid:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "定金未支付"})
		case service.ErrBalanceAlreadyPaid:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40004, "message": "尾款已支付"})
		case service.ErrBalanceTimeNotValid:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40005, "message": "不在尾款支付时间范围内"})
		default:
			h.logger.Error("支付尾款失败", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "支付尾款失败"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "尾款支付成功",
		"data":    order,
	})
}

// GetUserOrderListRequest 用户订单列表请求
type GetUserOrderListRequest struct {
	Status   string `form:"status" binding:"omitempty,oneof=pending_deposit deposit_paid pending_balance completed cancelled refunded"`
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PageSize int    `form:"page_size" binding:"omitempty,min=1,max=100"`
}

// UserOrderListResponse 用户订单列表响应
type UserOrderListResponse struct {
	List  []model.PresaleOrder `json:"list"`
	Total int64                `json:"total"`
	Page  int                  `json:"page"`
}

// GetUserOrderList 获取用户预售订单列表
// @Summary 获取用户预售订单列表
// @Tags 预售
// @Param status query string false "状态筛选"
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Success 200 {object} UserOrderListResponse
// @Router /presales/my-orders [get]
func (h *PresaleHandler) GetUserOrderList(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req GetUserOrderListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 20
	}

	orders, total, err := h.presaleService.GetUserOrderList(c.Request.Context(), userID, model.PresaleOrderStatus(req.Status), req.Page, req.PageSize)
	if err != nil {
		h.logger.Error("获取用户预售订单列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取订单列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": UserOrderListResponse{
			List:  orders,
			Total: total,
			Page:  req.Page,
		},
	})
}

// GetOrderDetail 获取预售订单详情
// @Summary 获取预售订单详情
// @Tags 预售
// @Param id path int true "订单ID"
// @Success 200 {object} model.PresaleOrder
// @Router /presales/orders/{id} [get]
func (h *PresaleHandler) GetOrderDetail(c *gin.Context) {
	userID := c.GetUint64("user_id")

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的订单ID"})
		return
	}

	order, err := h.presaleService.GetOrderDetail(c.Request.Context(), id, userID)
	if err != nil {
		if err == service.ErrPresaleOrderNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "预售订单不存在"})
			return
		}
		h.logger.Error("获取预售订单详情失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取订单详情失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": order,
	})
}

// CancelOrder 取消预售订单
// @Summary 取消预售订单
// @Tags 预售
// @Param id path int true "订单ID"
// @Success 200 {object} model.PresaleOrder
// @Router /presales/orders/{id}/cancel [post]
func (h *PresaleHandler) CancelOrder(c *gin.Context) {
	userID := c.GetUint64("user_id")

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的订单ID"})
		return
	}

	order, err := h.presaleService.CancelOrder(c.Request.Context(), id, userID)
	if err != nil {
		switch err {
		case service.ErrPresaleOrderNotFound:
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "预售订单不存在"})
		case service.ErrOrderStatusInvalid:
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "当前状态不可取消"})
		default:
			h.logger.Error("取消预售订单失败", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "取消订单失败"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "订单已取消",
		"data":    order,
	})
}
