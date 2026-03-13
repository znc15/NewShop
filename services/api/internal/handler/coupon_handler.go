package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type CouponHandler struct {
	couponService *service.CouponService
	logger        *zap.Logger
}

func NewCouponHandler(couponService *service.CouponService, logger *zap.Logger) *CouponHandler {
	return &CouponHandler{
		couponService: couponService,
		logger:        logger,
	}
}

// GetCouponList 获取可领取的优惠券列表
// GET /api/v1/coupons
func (h *CouponHandler) GetCouponList(c *gin.Context) {
	coupons, err := h.couponService.GetCouponList(c.Request.Context())
	if err != nil {
		h.logger.Error("获取优惠券列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取优惠券列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": coupons,
	})
}

// ReceiveCoupon 领取优惠券
// POST /api/v1/coupons/:id/receive
func (h *CouponHandler) ReceiveCoupon(c *gin.Context) {
	userID := c.GetUint64("user_id")

	couponIDStr := c.Param("id")
	couponID, err := strconv.ParseUint(couponIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "优惠券ID无效",
		})
		return
	}

	userCoupon, err := h.couponService.ReceiveCoupon(c.Request.Context(), userID, couponID)
	if err != nil {
		h.logger.Warn("领取优惠券失败",
			zap.Uint64("user_id", userID),
			zap.Uint64("coupon_id", couponID),
			zap.Error(err),
		)

		code := 50000
		message := "领取优惠券失败"
		switch err {
		case service.ErrCouponNotFound:
			code = 40400
			message = "优惠券不存在"
		case service.ErrCouponExpired:
			code = 40003
			message = "优惠券已过期"
		case service.ErrCouponNotStarted:
			code = 40004
			message = "优惠券尚未开始"
		case service.ErrCouponExhausted:
			code = 40005
			message = "优惠券已被领完"
		case service.ErrCouponAlreadyReceived:
			code = 40006
			message = "已达到领取上限"
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    code,
			"message": message,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"id":         userCoupon.ID,
			"coupon_id":  userCoupon.CouponID,
			"status":     userCoupon.Status,
			"created_at": userCoupon.CreatedAt,
		},
		"message": "领取成功",
	})
}

// GetUserCoupons 获取用户优惠券列表
// GET /api/v1/user/coupons
func (h *CouponHandler) GetUserCoupons(c *gin.Context) {
	userID := c.GetUint64("user_id")

	statusStr := c.DefaultQuery("status", "0")
	status, _ := strconv.Atoi(statusStr)

	coupons, err := h.couponService.GetUserCoupons(c.Request.Context(), userID, status)
	if err != nil {
		h.logger.Error("获取用户优惠券列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取用户优惠券列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": coupons,
	})
}

// GetAvailableCoupons 获取订单可用优惠券
// GET /api/v1/user/coupons/available
func (h *CouponHandler) GetAvailableCoupons(c *gin.Context) {
	userID := c.GetUint64("user_id")

	amountStr := c.Query("amount")
	if amountStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请提供订单金额",
		})
		return
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil || amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40002,
			"message": "订单金额无效",
		})
		return
	}

	coupons, err := h.couponService.GetAvailableCoupons(c.Request.Context(), userID, amount)
	if err != nil {
		h.logger.Error("获取可用优惠券失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取可用优惠券失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": coupons,
	})
}

// UseCouponRequest 使用优惠券请求
type UseCouponRequest struct {
	UserCouponID uint64 `json:"user_coupon_id" binding:"required"`
	OrderID      uint64 `json:"order_id" binding:"required"`
}

// UseCoupon 使用优惠券
// POST /api/v1/user/coupons/use
func (h *CouponHandler) UseCoupon(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req UseCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误",
		})
		return
	}

	err := h.couponService.UseCoupon(c.Request.Context(), userID, req.UserCouponID, req.OrderID)
	if err != nil {
		h.logger.Warn("使用优惠券失败",
			zap.Uint64("user_id", userID),
			zap.Uint64("user_coupon_id", req.UserCouponID),
			zap.Error(err),
		)

		code := 50000
		message := "使用优惠券失败"
		switch err {
		case service.ErrUserCouponNotFound:
			code = 40400
			message = "优惠券不存在"
		case service.ErrUserCouponUsed:
			code = 40007
			message = "优惠券已使用"
		case service.ErrUserCouponExpired:
			code = 40008
			message = "优惠券已过期"
		case service.ErrCouponNotStarted:
			code = 40004
			message = "优惠券尚未生效"
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    code,
			"message": message,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "使用成功",
	})
}

// CalculateDiscountRequest 计算优惠金额请求
type CalculateDiscountRequest struct {
	UserCouponID uint64  `json:"user_coupon_id" binding:"required"`
	OrderAmount  float64 `json:"order_amount" binding:"required,gt=0"`
}

// CalculateDiscount 计算优惠金额
// POST /api/v1/coupons/calculate
func (h *CouponHandler) CalculateDiscount(c *gin.Context) {
	var req CalculateDiscountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误",
		})
		return
	}

	discount, err := h.couponService.CalculateDiscount(c.Request.Context(), req.UserCouponID, req.OrderAmount)
	if err != nil {
		code := 50000
		message := "计算优惠金额失败"
		switch err {
		case service.ErrUserCouponNotFound, service.ErrCouponNotFound:
			code = 40400
			message = "优惠券不存在"
		case service.ErrOrderAmountNotEnough:
			code = 40009
			message = "订单金额不满足优惠券使用条件"
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    code,
			"message": message,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"discount": discount,
		},
	})
}

// RegisterCouponRoutes 注册优惠券相关路由
func RegisterCouponRoutes(r *gin.RouterGroup, handler *CouponHandler, authMiddleware gin.HandlerFunc) {
	// 公开接口
	r.GET("/coupons", handler.GetCouponList)

	// 需要认证的接口
	userGroup := r.Group("")
	userGroup.Use(authMiddleware)
	{
		userGroup.POST("/coupons/:id/receive", handler.ReceiveCoupon)
		userGroup.GET("/user/coupons", handler.GetUserCoupons)
		userGroup.GET("/user/coupons/available", handler.GetAvailableCoupons)
		userGroup.POST("/user/coupons/use", handler.UseCoupon)
		userGroup.POST("/coupons/calculate", handler.CalculateDiscount)
	}
}
