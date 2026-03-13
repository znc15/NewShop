package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func RateLimit(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
	 key := "ratelimit:" + c.ClientIP()
        ctx := context.Background()

        count, err := rdb.Incr(ctx, key).Result()
        if err != nil {
            c.Next()
            return
        }

        if count == 1 {
            rdb.Expire(ctx, key, window)
        }

        if count > int64(limit) {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "code":    42900,
                "message": "请求过于频繁，请稍后再试",
            })
            c.Abort()
            return
        }

        c.Next()
    }
}
