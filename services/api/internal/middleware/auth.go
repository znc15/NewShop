package middleware

import (
	"net/http"
	"strings"

	"newshop/api/internal/pkg/jwt"

	"github.com/gin-gonic/gin"
)

func Auth(jwtManager *jwt.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
	 authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "code":    40100,
                "message": "未提供认证信息",
            })
            c.Abort()
            return
        }

        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "code":    40101,
                "message": "认证格式错误",
            })
            c.Abort()
            return
        }

        claims, err := jwtManager.ValidateToken(parts[1])
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{
                "code":    40102,
                "message": "token 无效或已过期",
            })
            c.Abort()
            return
        }

        c.Set("user_id", claims.UserID)
        c.Set("email", claims.Email)
        c.Set("role", claims.Role)

        c.Next()
    }
}

func AdminAuth(jwtManager *jwt.JWTManager) gin.HandlerFunc {
 return func(c *gin.Context) {
        authMiddleware := Auth(jwtManager)
        authMiddleware(c)

        if c.IsAborted() {
            return
        }

        role, _ := c.Get("role")
        if role != "admin" {
            c.JSON(http.StatusForbidden, gin.H{
                "code":    40300,
                "message": "需要管理员权限",
            })
            c.Abort()
            return
        }

        c.Next()
    }
}
