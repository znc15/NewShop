// Package handler 提供 HTTP 请求处理器
package handler

import (
	"fmt"
	"net/http"

	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// PaymentHandler 支付处理器
type PaymentHandler struct {
	paymentService *service.PaymentService
	logger         *zap.Logger
}

// NewPaymentHandler 创建支付处理器
func NewPaymentHandler(paymentService *service.PaymentService, logger *zap.Logger) *PaymentHandler {
	return &PaymentHandler{
		paymentService: paymentService,
		logger:         logger,
	}
}

// CreatePaymentRequest 创建支付请求
type CreatePaymentRequest struct {
	OutTradeNo string `json:"out_trade_no" binding:"required"` // 商户订单号
	Amount     string `json:"amount" binding:"required"`       // 金额
	Subject    string `json:"subject" binding:"required"`      // 订单标题
	Body       string `json:"body"`                            // 订单描述
	Passback   string `json:"passback"`                        // 回传参数
	PayType    string `json:"pay_type"`                        // 支付类型: page(默认) / wap
}

// CreatePayment 创建支付
// POST /payment/create
func (h *PaymentHandler) CreatePayment(c *gin.Context) {
	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 获取用户ID（从中间件设置）
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    40100,
			"message": "未登录",
		})
		return
	}

	// 设置默认支付类型
	payType := req.PayType
	if payType == "" {
		payType = "page"
	}

	// 创建支付
	result, err := h.paymentService.CreatePayment(c.Request.Context(), service.CreatePaymentRequest{
		OutTradeNo: req.OutTradeNo,
		UserID:     userID.(uint64),
		Amount:     req.Amount,
		Subject:    req.Subject,
		Body:       req.Body,
		Passback:   req.Passback,
		PayType:    payType,
	})
	if err != nil {
		h.logger.Error("创建支付失败", zap.Error(err))
		if err == service.ErrPaymentAlreadyPaid {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "订单已支付",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "创建支付失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"pay_url":      result.PayURL,
			"out_trade_no": result.OutTradeNo,
		},
	})
}

// HandleNotify 处理支付宝回调
// POST /payment/notify
func (h *PaymentHandler) HandleNotify(c *gin.Context) {
	if err := h.paymentService.HandleNotify(c.Request.Context(), c.Request); err != nil {
		h.logger.Error("处理支付回调失败", zap.Error(err))
		c.String(http.StatusBadRequest, "fail")
		return
	}

	// 必须返回 success 给支付宝
	c.String(http.StatusOK, "success")
}

// QueryPaymentRequest 查询支付请求
type QueryPaymentRequest struct {
	OutTradeNo string `form:"out_trade_no" binding:"required"` // 商户订单号
}

// QueryPayment 查询支付状态
// GET /payment/query
func (h *PaymentHandler) QueryPayment(c *gin.Context) {
	var req QueryPaymentRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	record, err := h.paymentService.QueryPayment(c.Request.Context(), req.OutTradeNo)
	if err != nil {
		if err == service.ErrPaymentNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "支付记录不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "查询支付状态失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"out_trade_no":   record.OutTradeNo,
			"trade_no":       record.TradeNo,
			"total_amount":   record.TotalAmount,
			"paid_amount":    record.PaidAmount,
			"status":         record.Status,
			"subject":        record.Subject,
			"created_at":     record.CreatedAt,
			"paid_at":        record.PaidAt,
			"refunded_amount": record.RefundedAmount,
			"refunded_at":    record.RefundedAt,
		},
	})
}

// RefundPaymentRequest 退款请求
type RefundPaymentRequest struct {
	OutTradeNo   string `json:"out_trade_no" binding:"required"`   // 商户订单号
	RefundAmount string `json:"refund_amount" binding:"required"`  // 退款金额
	RefundReason string `json:"refund_reason" binding:"required"`  // 退款原因
}

// RefundPayment 申请退款
// POST /payment/refund
func (h *PaymentHandler) RefundPayment(c *gin.Context) {
	var req RefundPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	result, err := h.paymentService.RefundPayment(c.Request.Context(), service.RefundRequest{
		OutTradeNo:   req.OutTradeNo,
		RefundAmount: req.RefundAmount,
		RefundReason: req.RefundReason,
	})
	if err != nil {
		h.logger.Error("退款失败", zap.Error(err))
		switch err {
		case service.ErrPaymentNotFound:
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "支付记录不存在",
			})
		case service.ErrPaymentNotPaid:
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "订单未支付，无法退款",
			})
		case service.ErrPaymentAlreadyRefund:
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40003,
				"message": "订单已退款",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    50000,
				"message": "退款失败: " + err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"trade_no":     result.TradeNo,
			"out_trade_no": result.OutTradeNo,
			"refund_fee":   result.RefundFee,
		},
	})
}

// RegisterRoutes 注册路由
func (h *PaymentHandler) RegisterRoutes(r *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	payment := r.Group("/payment")
	{
		// 需要登录的接口
		payment.POST("/create", authMiddleware, h.CreatePayment)
		payment.GET("/query", authMiddleware, h.QueryPayment)
		payment.POST("/refund", authMiddleware, h.RefundPayment)

		// 支付宝回调（不需要登录）
		payment.POST("/notify", h.HandleNotify)
	}
}

// ClosePaymentRequest 关闭支付请求
type ClosePaymentRequest struct {
	OutTradeNo string `json:"out_trade_no" binding:"required"` // 商户订单号
}

// GeneratePayForm 生成支付表单 HTML
// POST /payment/form
func (h *PaymentHandler) GeneratePayForm(c *gin.Context) {
	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    40100,
			"message": "未登录",
		})
		return
	}

	payType := req.PayType
	if payType == "" {
		payType = "page"
	}

	result, err := h.paymentService.CreatePayment(c.Request.Context(), service.CreatePaymentRequest{
		OutTradeNo: req.OutTradeNo,
		UserID:     userID.(uint64),
		Amount:     req.Amount,
		Subject:    req.Subject,
		Body:       req.Body,
		Passback:   req.Passback,
		PayType:    payType,
	})
	if err != nil {
		h.logger.Error("创建支付失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "创建支付失败",
		})
		return
	}

	// 返回 HTML 内容类型
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>正在跳转到支付宝...</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px; background: #f5f5f5; }
        .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .spinner { width: 40px; height: 40px; margin: 20px auto; border: 3px solid #f3f3f3; border-top: 3px solid #1677ff; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        p { color: #666; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <p>正在跳转到支付宝...</p>
        <p style="font-size: 12px; color: #999;">如未自动跳转，请点击下方按钮</p>
        <a href="%s" style="display: inline-block; margin-top: 15px; padding: 10px 30px; background: #1677ff; color: white; text-decoration: none; border-radius: 4px;">立即支付</a>
    </div>
    <script>setTimeout(function() { window.location.href = '%s'; }, 1000);</script>
</body>
</html>`, result.PayURL, result.PayURL))
}
