package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"newshop/api/internal/config"
)

// CORS 创建 CORS 中间件，从配置读取允许的来源
func CORS(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// 检查请求的 Origin 是否在允许列表中
		allowedOrigin := ""
		for _, allowed := range cfg.CORS.AllowedOrigins {
			if allowed == origin {
				allowedOrigin = origin
				break
			}
		}

		// 如果找到匹配的允许来源，设置响应头
		if allowedOrigin != "" {
			c.Header("Access-Control-Allow-Origin", allowedOrigin)
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
