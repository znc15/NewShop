package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"newshop/api/internal/model"
)

var auditDB *gorm.DB
var auditLogger *zap.Logger

// InitAudit 初始化审计中间件
func InitAudit(db *gorm.DB, logger *zap.Logger) {
	auditDB = db
	auditLogger = logger
}

// AuditConfig 审计中间件配置
type AuditConfig struct {
	// SkipPaths 跳过审计的路径前缀
	SkipPaths []string
	// RecordBody 是否记录请求体
	RecordBody bool
	// BodyMaxSize 请求体最大记录大小
	BodyMaxSize int64
}

// DefaultAuditConfig 默认配置
var DefaultAuditConfig = AuditConfig{
	SkipPaths: []string{
		"/api/v1/health",
		"/api/v1/metrics",
	},
	RecordBody:  true,
	BodyMaxSize: 4096,
}

// AuditLogger 审计日志中间件
func AuditLogger(config AuditConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查是否跳过
		path := c.Request.URL.Path
		for _, skipPath := range config.SkipPaths {
			if strings.HasPrefix(path, skipPath) {
				c.Next()
				return
			}
		}

		// 生成请求ID
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
			c.Header("X-Request-ID", requestID)
		}

		// 记录开始时间
		startTime := time.Now()

		// 读取请求体
		var requestBody string
		if config.RecordBody && c.Request.Body != nil {
			bodyBytes, err := io.ReadAll(io.LimitReader(c.Request.Body, config.BodyMaxSize))
			if err == nil {
				requestBody = string(bodyBytes)
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			}
		}

		// 使用响应包装器捕获响应
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		c.Next()

		// 获取用户ID
		var userID uint
		if uid, exists := c.Get("user_id"); exists {
			if id, ok := uid.(uint); ok {
				userID = id
			}
		}

		// 确定操作类型
		action := determineAction(path, c.Request.Method)
		resource := determineResource(path)

		// 构建详情
		details := buildDetails(c.Request.Method, path, requestBody, blw.body.String(), c.Writer.Status())

		// 创建审计日志
		auditLog := model.AuditLog{
			UserID:     userID,
			Action:     action,
			Resource:   resource,
			IP:         c.ClientIP(),
			UserAgent:  c.GetHeader("User-Agent"),
			RequestID:  requestID,
			Details:    details,
			CreatedAt:  startTime,
		}

		// 从路径参数获取资源ID
		if resourceID := c.Param("id"); resourceID != "" {
			// 尝试解析为uint
			var id uint
			if _, err := json.Number(resourceID).Int64(); err == nil {
				auditLog.ResourceID = id
			}
		}

		// 异步写入审计日志
		go func() {
			if auditDB != nil {
				if err := auditDB.Create(&auditLog).Error; err != nil && auditLogger != nil {
					auditLogger.Error("写入审计日志失败", zap.Error(err))
				}
			}
		}()
	}
}

// bodyLogWriter 响应体捕获器
type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// determineAction 根据路径和方法确定操作类型
func determineAction(path, method string) string {
	// 登录/登出
	if strings.Contains(path, "/auth/login") {
		return model.AuditActionLogin
	}
	if strings.Contains(path, "/auth/logout") {
		return model.AuditActionLogout
	}

	// 订单操作
	if strings.Contains(path, "/orders") {
		switch method {
		case "POST":
			return model.AuditActionOrderCreate
		case "PUT", "PATCH":
			if strings.Contains(path, "/pay") {
				return model.AuditActionOrderPay
			}
			if strings.Contains(path, "/cancel") {
				return model.AuditActionOrderCancel
			}
		}
	}

	// 商品操作
	if strings.Contains(path, "/products") || strings.Contains(path, "/admin/products") {
		switch method {
		case "POST":
			return model.AuditActionProductCreate
		case "PUT", "PATCH":
			return model.AuditActionProductUpdate
		case "DELETE":
			return model.AuditActionProductDelete
		}
	}

	// 默认返回 HTTP 方法
	return strings.ToLower(method)
}

// determineResource 根据路径确定资源类型
func determineResource(path string) string {
	if strings.Contains(path, "/users") || strings.Contains(path, "/auth") {
		return model.AuditResourceUser
	}
	if strings.Contains(path, "/orders") {
		return model.AuditResourceOrder
	}
	if strings.Contains(path, "/products") {
		return model.AuditResourceProduct
	}
	if strings.Contains(path, "/cart") {
		return model.AuditResourceCart
	}
	if strings.Contains(path, "/coupons") {
		return model.AuditResourceCoupon
	}
	return "other"
}

// buildDetails 构建审计详情
func buildDetails(method, path, reqBody, respBody string, statusCode int) string {
	details := map[string]interface{}{
		"method":      method,
		"path":        path,
		"status_code": statusCode,
	}

	// 过滤敏感信息后记录请求体
	if reqBody != "" {
		filteredReq := filterSensitiveData(reqBody)
		details["request"] = truncateString(filteredReq, 1000)
	}

	// 记录响应体（仅错误时记录完整响应）
	if statusCode >= 400 && respBody != "" {
		details["response"] = truncateString(respBody, 500)
	}

	jsonDetails, err := json.Marshal(details)
	if err != nil {
		return "{}"
	}
	return string(jsonDetails)
}

// filterSensitiveData 过滤敏感数据
func filterSensitiveData(data string) string {
	sensitiveFields := []string{"password", "token", "secret", "api_key", "credit_card"}

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(data), &result); err != nil {
		return data
	}

	for _, field := range sensitiveFields {
		if _, exists := result[field]; exists {
			result[field] = "***REDACTED***"
		}
	}

	filtered, err := json.Marshal(result)
	if err != nil {
		return data
	}
	return string(filtered)
}

// truncateString 截断字符串
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
