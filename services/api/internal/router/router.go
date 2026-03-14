// Package router 提供路由注册功能
package router

import (
	"time"

	"newshop/api/internal/config"
	"newshop/api/internal/handler"
	adminhandler "newshop/api/internal/handler/admin"
	"newshop/api/internal/middleware"
	"newshop/api/internal/pkg/jwt"
	"newshop/api/internal/repository"
	"newshop/api/internal/service"
	adminservice "newshop/api/internal/service/admin"

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

	// Repositories
	productRepo    *repository.ProductRepo
	cartRepo       *repository.CartRepo
	orderRepo      *repository.OrderRepo
	userRepo       *repository.UserRepo
	adminRepo      *repository.AdminRepo
	statisticsRepo *repository.StatisticsRepo

	// Services
	userService     *service.UserService
	emailService    *service.EmailService
	productService  *service.ProductService
	cartService     *service.CartService
	orderService    *service.OrderService
	adminService    *service.AdminService
	paymentService  *service.PaymentService
	productAdminSvc *adminservice.ProductAdminService
	orderAdminSvc   *adminservice.OrderAdminService
	statisticsSvc   *adminservice.StatisticsAdminService

	// Handlers
	authHandler    *handler.AuthHandler
	productHandler *handler.ProductHandler
	cartHandler    *handler.CartHandler
	orderHandler   *handler.OrderHandler
	paymentHandler *handler.PaymentHandler
	adminHandler   *handler.AdminHandler
	// Admin handlers
	productAdminHandler   *adminhandler.ProductAdminHandler
	orderAdminHandler     *adminhandler.OrderAdminHandler
	categoryAdminHandler  *adminhandler.CategoryAdminHandler
	brandAdminHandler     *adminhandler.BrandAdminHandler
	statisticsAdminHandler *adminhandler.StatisticsAdminHandler
}

// NewRouter 创建路由管理器
func NewRouter(db *gorm.DB, rdb *redis.Client, cfg *config.Config, logger *zap.Logger) *Router {
	// 初始化 JWT 管理器
	jwtManager := jwt.NewJWTManager(cfg.JWT.Secret, cfg.JWT.Expiry)

	// 初始化 Repositories
	productRepo := repository.NewProductRepo(db)
	cartRepo := repository.NewCartRepo(db)
	orderRepo := repository.NewOrderRepo(db)
	userRepo := repository.NewUserRepo(db)
	adminRepo := repository.NewAdminRepo(db)
	statisticsRepo := repository.NewStatisticsRepo(db)

	// 初始化 Services
	userService := service.NewUserService(db)
	productService := service.NewProductService(productRepo, db)
	cartService := service.NewCartService(cartRepo, db)
	orderService := service.NewOrderService(db, orderRepo, userRepo)
	adminService := service.NewAdminService(adminRepo, db)
	productAdminSvc := adminservice.NewProductAdminService(productRepo, db)
	orderAdminSvc := adminservice.NewOrderAdminService(orderRepo, db, logger)
	statisticsSvc := adminservice.NewStatisticsAdminService(statisticsRepo, logger)

	// 初始化 Handlers
	authHandler := handler.NewAuthHandler(
		userService,
		nil, // emailService 需要邮件客户端，后续初始化
		jwtManager,
		logger,
	)
	productHandler := handler.NewProductHandler(productService, logger)
	cartHandler := handler.NewCartHandler(cartService, logger)
	orderHandler := handler.NewOrderHandler(orderService, logger)
	adminHandler := handler.NewAdminHandler(adminService, jwtManager, logger)
	// Admin handlers
	productAdminHandler := adminhandler.NewProductAdminHandler(productAdminSvc, productRepo, logger)
	orderAdminHandler := adminhandler.NewOrderAdminHandler(orderAdminSvc, logger)
	categoryAdminHandler := adminhandler.NewCategoryAdminHandler(productAdminSvc, logger)
	brandAdminHandler := adminhandler.NewBrandAdminHandler(productAdminSvc, logger)
	statisticsAdminHandler := adminhandler.NewStatisticsAdminHandler(statisticsSvc, logger)

	return &Router{
		db:          db,
		rdb:         rdb,
		cfg:         cfg,
		logger:      logger,
		jwtManager:  jwtManager,
		// Repositories
		productRepo:    productRepo,
		cartRepo:       cartRepo,
		orderRepo:      orderRepo,
		userRepo:       userRepo,
		adminRepo:      adminRepo,
		statisticsRepo: statisticsRepo,
		// Services
		userService:     userService,
		productService:  productService,
		cartService:     cartService,
		orderService:    orderService,
		adminService:    adminService,
		productAdminSvc: productAdminSvc,
		orderAdminSvc:   orderAdminSvc,
		statisticsSvc:   statisticsSvc,
		// Handlers
		authHandler:    authHandler,
		productHandler: productHandler,
		cartHandler:    cartHandler,
		orderHandler:   orderHandler,
		adminHandler:   adminHandler,
		// Admin handlers
		productAdminHandler:    productAdminHandler,
		orderAdminHandler:      orderAdminHandler,
		categoryAdminHandler:   categoryAdminHandler,
		brandAdminHandler:      brandAdminHandler,
		statisticsAdminHandler: statisticsAdminHandler,
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

// SetPaymentService 设置支付服务
func (r *Router) SetPaymentService(paymentService *service.PaymentService) {
	r.paymentService = paymentService
	r.paymentHandler = handler.NewPaymentHandler(paymentService, r.logger)
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
		r.setupPaymentRoutes(v1)
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
		// 用户信息相关
		user.GET("/info", r.authHandler.GetProfile)
		user.PUT("/info", r.authHandler.GetProfile) // 暂时复用 GetProfile，后续可扩展
		// 用户地址相关（待实现 AddressHandler）
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
		products.GET("", r.productHandler.GetProductList)
		products.GET("/:id", r.productHandler.GetProductDetail)
		products.GET("/search", r.productHandler.SearchProducts)
	}
	// 分类路由
	categories := rg.Group("/categories")
	{
		categories.GET("", r.productHandler.GetCategories)
		categories.GET("/:id", r.productHandler.GetCategoryDetail)
		categories.GET("/:id/products", r.productHandler.GetProductsByCategory)
	}
	// 品牌路由
	brands := rg.Group("/brands")
	{
		brands.GET("", r.productHandler.GetBrands)
		brands.GET("/:id", r.productHandler.GetBrandDetail)
		brands.GET("/:id/products", r.productHandler.GetProductsByBrand)
	}
	// 搜索
	rg.GET("/search", r.productHandler.SearchProducts)
	// 需要认证的商品评论路由
	productsProtected := rg.Group("/products")
	productsProtected.Use(middleware.Auth(r.jwtManager))
	{
		productsProtected.POST("/:id/review", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
		})
	}
}

// setupCartRoutes 购物车路由（需要认证）
func (r *Router) setupCartRoutes(rg *gin.RouterGroup) {
	cart := rg.Group("/cart")
	cart.Use(middleware.Auth(r.jwtManager))
	{
		cart.GET("", r.cartHandler.GetCart)
		cart.POST("", r.cartHandler.AddItem)
		cart.PUT("/:id", r.cartHandler.UpdateQuantity)
		cart.DELETE("/:id", r.cartHandler.RemoveItem)
		cart.DELETE("", r.cartHandler.ClearCart)
	}
}

// setupOrderRoutes 订单路由（需要认证）
func (r *Router) setupOrderRoutes(rg *gin.RouterGroup) {
	orders := rg.Group("/orders")
	orders.Use(middleware.Auth(r.jwtManager))
	{
		orders.GET("", r.orderHandler.GetOrderList)
		orders.GET("/:id", r.orderHandler.GetOrderDetail)
		orders.POST("", r.orderHandler.CreateOrder)
		orders.PUT("/:id/cancel", r.orderHandler.CancelOrder)
		orders.GET("/:id/pay", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": gin.H{"pay_url": ""}, "message": "请使用支付接口"})
		})
		orders.PUT("/:id/confirm", r.orderHandler.ConfirmReceive)
		orders.GET("/:id/status", r.orderHandler.GetOrderStatus)
	}
}

// setupPaymentRoutes 支付路由
func (r *Router) setupPaymentRoutes(rg *gin.RouterGroup) {
	if r.paymentHandler == nil {
		return
	}
	r.paymentHandler.RegisterRoutes(rg, middleware.Auth(r.jwtManager))
}

// setupAdminRoutes 管理后台路由（需要管理员权限）
func (r *Router) setupAdminRoutes(rg *gin.RouterGroup) {
	// 管理员认证相关路由（无需 AdminAuth 中间件）
	handler.RegisterAdminRoutes(rg, r.adminHandler, r.jwtManager)

	// 以下路由需要管理员权限
	rg.Use(middleware.AdminAuth(r.jwtManager))

	// 用户管理
	users := rg.Group("/users")
	{
		users.GET("", r.listUsers)
		users.GET("/:id", r.getUser)
		users.PUT("/:id", r.updateUser)
		users.DELETE("/:id", r.deleteUser)
	}

	// 商品管理
	products := rg.Group("/products")
	{
		products.GET("", r.productAdminHandler.List)
		products.POST("", r.productAdminHandler.Create)
		products.GET("/:id", r.productAdminHandler.Get)
		products.PUT("/:id", r.productAdminHandler.Update)
		products.DELETE("/:id", r.productAdminHandler.Delete)
		products.PUT("/:id/status", r.productAdminHandler.UpdateStatus)
		products.PUT("/:id/stock", r.productAdminHandler.UpdateStock)
	}

	// 订单管理
	orders := rg.Group("/orders")
	{
		orders.GET("", r.orderAdminHandler.ListOrders)
		orders.GET("/:id", r.orderAdminHandler.GetOrderDetail)
		orders.PUT("/:id/status", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "请使用专用接口（ship/refund）"})
		})
		orders.PUT("/:id/ship", r.orderAdminHandler.ShipOrder)
		orders.PUT("/:id/refund", r.orderAdminHandler.RefundOrder)
		orders.GET("/statistics", r.orderAdminHandler.GetStatistics)
	}

	// 分类管理
	categories := rg.Group("/categories")
	{
		categories.GET("", r.categoryAdminHandler.List)
		categories.POST("", r.categoryAdminHandler.Create)
		categories.PUT("/:id", r.categoryAdminHandler.Update)
		categories.DELETE("/:id", r.categoryAdminHandler.Delete)
	}

	// 品牌管理
	brands := rg.Group("/brands")
	{
		brands.GET("", r.brandAdminHandler.List)
		brands.POST("", r.brandAdminHandler.Create)
		brands.PUT("/:id", r.brandAdminHandler.Update)
		brands.DELETE("/:id", r.brandAdminHandler.Delete)
	}

	// 数据统计
	stats := rg.Group("/stats")
	{
		stats.GET("/overview", r.statisticsAdminHandler.GetOverview)
		stats.GET("/sales", r.statisticsAdminHandler.GetSalesStatistics)
		stats.GET("/users", r.statisticsAdminHandler.GetUserStatistics)
		stats.GET("/products", r.statisticsAdminHandler.GetProductStatistics)
		stats.GET("/trend", r.statisticsAdminHandler.GetTrendData)
	}
}

// 用户管理辅助方法（临时占位，待实现 UserAdminHandler）

func (r *Router) listUsers(c *gin.Context) {
	c.JSON(200, gin.H{"code": 0, "data": []interface{}{}, "message": "功能开发中"})
}

func (r *Router) getUser(c *gin.Context) {
	c.JSON(200, gin.H{"code": 0, "data": nil, "message": "功能开发中"})
}

func (r *Router) updateUser(c *gin.Context) {
	c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
}

func (r *Router) deleteUser(c *gin.Context) {
	c.JSON(200, gin.H{"code": 0, "message": "功能开发中"})
}
