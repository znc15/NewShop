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

// PaymentErrorResponse 支付错误响应
type PaymentErrorResponse struct {
	Code    int    `json:"code" example:"50000"`
	Message string `json:"message" example:"操作失败"`
}

// CreatePaymentResponse 创建支付响应
type CreatePaymentResponse struct {
	Code int               `json:"code" example:"0"`
	Data CreatePaymentData `json:"data"`
}

// CreatePaymentData 创建支付数据
type CreatePaymentData struct {
	PayURL     string `json:"pay_url" example:"https://openapi.alipay.com/gateway.do?..."`
	OutTradeNo string `json:"out_trade_no" example:"ORDER20240101123456"`
}

// QueryPaymentResponse 查询支付响应
type QueryPaymentResponse struct {
	Code int              `json:"code" example:"0"`
	Data QueryPaymentData `json:"data"`
}

// QueryPaymentData 查询支付数据
type QueryPaymentData struct {
	OutTradeNo     string `json:"out_trade_no" example:"ORDER20240101123456"`
	TradeNo        string `json:"trade_no" example:"2024010122001412341234567890"`
	TotalAmount    string `json:"total_amount" example:"100.00"`
	PaidAmount     string `json:"paid_amount" example:"100.00"`
	Status         int    `json:"status" example:"1"`
	Subject        string `json:"subject" example:"商品订单支付"`
	CreatedAt      string `json:"created_at" example:"2024-01-01T10:00:00Z"`
	PaidAt         string `json:"paid_at" example:"2024-01-01T10:05:00Z"`
	RefundedAmount string `json:"refunded_amount" example:"0.00"`
	RefundedAt     string `json:"refunded_at" example:""`
}

// RefundPaymentResponse 退款响应
type RefundPaymentResponse struct {
	Code int               `json:"code" example:"0"`
	Data RefundPaymentData `json:"data"`
}

// RefundPaymentData 退款数据
type RefundPaymentData struct {
	TradeNo    string `json:"trade_no" example:"2024010122001412341234567890"`
	OutTradeNo string `json:"out_trade_no" example:"ORDER20240101123456"`
	RefundFee  string `json:"refund_fee" example:"100.00"`
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
// @Summary 创建支付
// @Description 创建支付宝支付订单，返回支付链接
// @Tags 支付
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param request body CreatePaymentRequest true "支付请求参数"
// @Success 200 {object} CreatePaymentResponse "支付创建成功"
// @Failure 400 {object} PaymentErrorResponse "请求参数错误或订单已支付"
// @Failure 401 {object} PaymentErrorResponse "未登录"
// @Failure 500 {object} PaymentErrorResponse "服务器内部错误"
// @Router /api/v1/payment/create [post]
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
// @Summary 处理支付宝回调
// @Description 处理支付宝异步通知，更新支付状态（支付宝服务器调用，无需认证）
// @Tags 支付
// @Accept json
// @Produce text/plain
// @Success 200 {string} string "success"
// @Failure 400 {string} string "fail"
// @Router /api/v1/payment/notify [post]
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
// @Summary 查询支付状态
// @Description 根据商户订单号查询支付状态和详细信息
// @Tags 支付
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param out_trade_no query string true "商户订单号"
// @Success 200 {object} QueryPaymentResponse "查询成功"
// @Failure 400 {object} PaymentErrorResponse "请求参数错误"
// @Failure 404 {object} PaymentErrorResponse "支付记录不存在"
// @Failure 500 {object} PaymentErrorResponse "服务器内部错误"
// @Router /api/v1/payment/query [get]
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
			"out_trade_no":    record.OutTradeNo,
			"trade_no":        record.TradeNo,
			"total_amount":    record.TotalAmount,
			"paid_amount":     record.PaidAmount,
			"status":          record.Status,
			"subject":         record.Subject,
			"created_at":      record.CreatedAt,
			"paid_at":         record.PaidAt,
			"refunded_amount": record.RefundedAmount,
			"refunded_at":     record.RefundedAt,
		},
	})
}

// RefundPaymentRequest 退款请求
type RefundPaymentRequest struct {
	OutTradeNo   string `json:"out_trade_no" binding:"required"`  // 商户订单号
	RefundAmount string `json:"refund_amount" binding:"required"` // 退款金额
	RefundReason string `json:"refund_reason" binding:"required"` // 退款原因
}

// RefundPayment 申请退款
// @Summary 申请退款
// @Description 对已支付的订单申请退款
// @Tags 支付
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param request body RefundPaymentRequest true "退款请求参数"
// @Success 200 {object} RefundPaymentResponse "退款成功"
// @Failure 400 {object} PaymentErrorResponse "请求参数错误或订单未支付/已退款"
// @Failure 404 {object} PaymentErrorResponse "支付记录不存在"
// @Failure 500 {object} PaymentErrorResponse "服务器内部错误"
// @Router /api/v1/payment/refund [post]
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
// @Summary 生成支付表单
// @Description 生成支付表单HTML页面，自动跳转到支付宝支付页面
// @Tags 支付
// @Security ApiKeyAuth
// @Accept json
// @Produce html
// @Param request body CreatePaymentRequest true "支付请求参数"
// @Success 200 {string} string "HTML页面"
// @Failure 400 {object} PaymentErrorResponse "请求参数错误"
// @Failure 401 {object} PaymentErrorResponse "未登录"
// @Failure 500 {object} PaymentErrorResponse "服务器内部错误"
// @Router /api/v1/payment/form [post]
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
	html := `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>正在跳转到支付宝...</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px 20px; background: #f5f5f5; }
        .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .spinner { width: 40px; height: 40px; margin: 20px auto; border: 3px solid #f3f3f3; border-top: 3px solid #1677ff; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        p { color: #666; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <p>正在跳转到支付宝...</p>
        <p style="font-size: 12px; color: #999;">如未自动跳转，请点击下方按钮</p>
        <a id="payLink" href="#" style="display: inline-block; margin-top: 15px; padding: 10px 30px; background: #1677ff; color: white; text-decoration: none; border-radius: 4px;">立即支付</a>
    </div>
    <script>
        var payUrl = "%s";
        document.getElementById('payLink').href = payUrl;
        setTimeout(function() { window.location.href = payUrl; }, 1000);
    </script>
</body>
</html>`
	c.String(http.StatusOK, fmt.Sprintf(html, result.PayURL))
}
