// Package main 是应用程序入口点
package main

import (
	"log"

	"newshop/api/internal/config"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 设置运行模式
	gin.SetMode(cfg.Server.Mode)

	// 创建路由
	r := gin.New()

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// 启动服务
	log.Printf("服务器启动于 :%s", cfg.Server.Port)
	if err := r.Run(":" + cfg.Server.Port); err != nil {
		log.Fatalf("启动服务失败: %v", err)
	}
}
