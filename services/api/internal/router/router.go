// Package router 提供路由注册功能
package router

import (
	"time"

	"newshop/api/internal/config"
	"newshop/api/internal/handler"
	"newshop/api/internal/middleware"
	"newshop/api/internal/pkg/jwt"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Router 路由管理器
type Router struct {
	db         *gorm.DB
	rdb        *redis.Client
	cfg        *config.Config
	logger     *zap.Logger
	jwtManager *jwt.JWTManager

	// Services
	userService  *service.UserService
	emailService *service.EmailService

	// Handlers
	authHandler *handler.AuthHandler
}

// NewRouter 创建路由管理器
func NewRouter(db *gorm.DB, rdb *redis.Client, cfg *config.Config, logger *zap.Logger) *Router {
	// 初始化 JWT 管理器
	jwtManager := jwt.NewJWTManager(cfg.JWT.Secret, cfg.JWT.Expiry)

	// 初始化服务
	userService := service.NewUserService(db)

	// 初始化处理器
	authHandler := handler.NewAuthHandler(
		userService,
		nil, // emailService 需要邮件客户端，后续初始化
		jwtManager,
		logger,
	)

	return &Router{
		db:          db,
		rdb:         rdb,
		cfg:         cfg,
		logger:      logger,
		jwtManager:  jwtManager,
		userService: userService,
		authHandler: authHandler,
	}
}

// SetEmailService 设置邮件服务
func (r *Router) SetEmailService(emailService *service.EmailService) {
	r.emailService = emailService
	// 重新创建 AuthHandler 以包含邮件服务
	r.authHandler = handler.NewAuthHandler(
		r.userService,
		emailService,
		r.jwtManager,
		r.logger,
	)
}

// Setup 注册所有路由
func (r *Router) Setup(engine *gin.Engine) {
	// 全局中间件（按顺序执行）
	engine.Use(middleware.CORS())
	engine.Use(middleware.Recovery(r.logger))
	engine.Use(middleware.Logger(r.logger))
	engine.Use(middleware.RateLimit(r.rdb, 100, time.Minute)) // 每分钟 100 次请求限制

	// 健康检查
	engine.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "服务运行正常"})
	})

	// API v1 路由组
	v1 := engine.Group("/api/v1")
	{
		// 注册各模块路由
		r.setupAuthRoutes(v1)
		r.setupUserRoutes(v1)
		r.setupProductRoutes(v1)
		r.setupCartRoutes(v1)
		r.setupOrderRoutes(v1)
	}

	// 管理后台路由组
	admin := engine.Group("/api/admin")
	{
		r.setupAdminRoutes(admin)
	}
}

// setupAuthRoutes 认证路由（公开 + 需要认证的混合）
func (r *Router) setupAuthRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		// 公开路由
		auth.POST("/register", r.authHandler.Register)
		auth.POST("/login", r.authHandler.Login)
		auth.POST("/refresh", r.authHandler.Refresh)
		auth.POST("/send-code", r.authHandler.SendCode)

		// 需要认证的路由
		authProtected := auth.Group("")
		authProtected.Use(middleware.Auth(r.jwtManager))
		{
			authProtected.GET("/profile", r.authHandler.GetProfile)
			authProtected.PUT("/password", r.authHandler.UpdatePassword)
		}
	}
}

// setupUserRoutes 用户路由（需要认证）
func (r *Router) setupUserRoutes(rg *gin.RouterGroup) {
	user := rg.Group("/user")
	user.Use(middleware.Auth(r.jwtManager))
	{
		// 用户信息相关（待实现具体 handler）
		user.GET("/info", r.authHandler.GetProfile)
		user.PUT("/info", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		user.GET("/addresses", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
		})
		user.POST("/addresses", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
	}
}

// setupProductRoutes 商品路由
func (r *Router) setupProductRoutes(rg *gin.RouterGroup) {
	products := rg.Group("/products")
	{
		// 公开路由
		products.GET("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
		})
		products.GET("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": nil, "message": "功能开发中"})
		})
		products.GET("/search", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
		})
		products.GET("/categories", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
		})

		// 需要认证的路由
		productsProtected := products.Group("")
		productsProtected.Use(middleware.Auth(r.jwtManager))
		{
			productsProtected.POST("/:id/review", func(c *gin.Context) {
				c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
			})
		}
	}
}

// setupCartRoutes 购物车路由（需要认证）
func (r *Router) setupCartRoutes(rg *gin.RouterGroup) {
	cart := rg.Group("/cart")
	cart.Use(middleware.Auth(r.jwtManager))
	{
		cart.GET("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": gin.H{"items": []interface{}{}}, "message": "功能开发中"})
		})
		cart.POST("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		cart.PUT("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		cart.DELETE("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		cart.DELETE("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
	}
}

// setupOrderRoutes 订单路由（需要认证）
func (r *Router) setupOrderRoutes(rg *gin.RouterGroup) {
	orders := rg.Group("/orders")
	orders.Use(middleware.Auth(r.jwtManager))
	{
		orders.GET("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
		})
		orders.GET("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": nil, "message": "功能开发中"})
		})
		orders.POST("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		orders.PUT("/:id/cancel", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		orders.GET("/:id/pay", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": gin.H{"pay_url": ""}, "message": "功能开发中"})
		})
	}
}

// setupAdminRoutes 管理后台路由（需要管理员权限）
func (r *Router) setupAdminRoutes(rg *gin.RouterGroup) {
	// 应用管理员认证中间件
	rg.Use(middleware.AdminAuth(r.jwtManager))

	// 用户管理
	users := rg.Group("/users")
	{
		users.GET("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
		})
		users.GET("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": nil, "message": "功能开发中"})
		})
		users.PUT("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		users.DELETE("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
	}

	// 商品管理
	products := rg.Group("/products")
	{
		products.GET("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
		})
		products.POST("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		products.GET("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": nil, "message": "功能开发中"})
		})
		products.PUT("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		products.DELETE("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
	}

	// 订单管理
	orders := rg.Group("/orders")
	{
		orders.GET("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
		})
		orders.GET("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": nil, "message": "功能开发中"})
		})
		orders.PUT("/:id/status", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
	}

	// 分类管理
	categories := rg.Group("/categories")
	{
		categories.GET("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
		})
		categories.POST("", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		categories.PUT("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
		categories.DELETE("/:id", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
	}

	// 数据统计
	stats := rg.Group("/stats")
	{
		stats.GET("/overview", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"code": 0,
				"data": gin.H{
					"total_users":    0,
					"total_orders":   0,
					"total_products": 0,
					"total_revenue":  0,
				},
				"message": "功能开发中",
			})
		})
		stats.GET("/sales", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
		})
	}
}
