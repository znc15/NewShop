// Package router 提供路由注册功能
package router

import (
	"strings"
	"time"

	_ "newshop/api/docs" // swagger docs，需要先运行 swag init 生成
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
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
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
	productRepo     *repository.ProductRepo
	cartRepo        *repository.CartRepo
	orderRepo       *repository.OrderRepo
	userRepo        *repository.UserRepo
	adminRepo       *repository.AdminRepo
	statisticsRepo  *repository.StatisticsRepo
	paymentRepo     *repository.PaymentRepo
	addressRepo     *repository.AddressRepo
	presaleRepo     *repository.PresaleRepo
	couponRepo      *repository.CouponRepo
	pointsRepo      *repository.PointsRepo
	memberLevelRepo *repository.MemberLevelRepo
	memberExpRepo   *repository.MemberExperienceRepo
	expLogRepo      *repository.ExperienceLogRepo
	configRepo      *repository.ConfigRepo
	pageRepo        *repository.PageRepository
	homePageRepo    *repository.HomePageRepo

	// Services
	userService     *service.UserService
	emailService    *service.EmailService
	authCodeService *service.AuthCodeService
	productService  *service.ProductService
	cartService     *service.CartService
	orderService    *service.OrderService
	adminService    *service.AdminService
	paymentService  *service.PaymentService
	addressService  *service.AddressService
	productAdminSvc *adminservice.ProductAdminService
	orderAdminSvc   *adminservice.OrderAdminService
	statisticsSvc   *adminservice.StatisticsAdminService
	presaleService  *service.PresaleService
	couponService   *service.CouponService
	pointsService   *service.PointsService
	membershipSvc   *service.MembershipService
	configService   *service.ConfigService
	pageService     *service.PageService
	homePageService *service.HomePageService

	// Handlers
	authHandler       *handler.AuthHandler
	authCodeHandler   *handler.AuthCodeHandler
	productHandler    *handler.ProductHandler
	cartHandler       *handler.CartHandler
	orderHandler      *handler.OrderHandler
	paymentHandler    *handler.PaymentHandler
	adminHandler      *handler.AdminHandler
	addressHandler    *handler.AddressHandler
	presaleHandler    *handler.PresaleHandler
	couponHandler     *handler.CouponHandler
	pointsHandler     *handler.PointsHandler
	membershipHandler *handler.MembershipHandler
	configHandler     *handler.ConfigHandler
	pageHandler       *handler.PageHandler
	homePageHandler   *handler.HomePageHandler
	// Admin handlers
	productAdminHandler    *adminhandler.ProductAdminHandler
	orderAdminHandler      *adminhandler.OrderAdminHandler
	categoryAdminHandler   *adminhandler.CategoryAdminHandler
	brandAdminHandler      *adminhandler.BrandAdminHandler
	statisticsAdminHandler *adminhandler.StatisticsAdminHandler
	userAdminHandler       *adminhandler.UserAdminHandler
	configAdminHandler     *adminhandler.ConfigAdminHandler
	pageAdminHandler       *adminhandler.PageAdminHandler
	couponAdminHandler     *adminhandler.CouponAdminHandler
	reviewAdminHandler     *adminhandler.ReviewAdminHandler
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
	paymentRepo := repository.NewPaymentRepo(db)
	addressRepo := repository.NewAddressRepo(db)
	presaleRepo := repository.NewPresaleRepo(db)
	couponRepo := repository.NewCouponRepo(db)
	pointsRepo := repository.NewPointsRepo(db)
	memberLevelRepo := repository.NewMemberLevelRepo(db)
	memberExpRepo := repository.NewMemberExperienceRepo(db)
	expLogRepo := repository.NewExperienceLogRepo(db)
	configRepo := repository.NewConfigRepo(db)
	pageRepo := repository.NewPageRepository(db)
	homePageRepo := repository.NewHomePageRepo(db)

	// 初始化 Services
	userService := service.NewUserService(db)
	productService := service.NewProductService(productRepo, db)
	cartService := service.NewCartService(cartRepo, db)
	orderService := service.NewOrderService(db, orderRepo, userRepo, productRepo)
	adminService := service.NewAdminService(adminRepo, db)
	addressService := service.NewAddressService(addressRepo, db)
	productAdminSvc := adminservice.NewProductAdminService(productRepo, db)
	orderAdminSvc := adminservice.NewOrderAdminService(orderRepo, db, logger)
	statisticsSvc := adminservice.NewStatisticsAdminService(statisticsRepo, logger)
	presaleService := service.NewPresaleService(db, presaleRepo)
	couponService := service.NewCouponService(db, couponRepo)
	pointsService := service.NewPointsService(db, pointsRepo, userRepo)
	membershipSvc := service.NewMembershipService(db, memberLevelRepo, memberExpRepo, expLogRepo)
	configService := service.NewConfigService(db, configRepo, logger)
	pageService := service.NewPageService(pageRepo, db)
	homePageService := service.NewHomePageService(homePageRepo)
	githubOAuthService := service.NewGitHubOAuthService(userService, configService, jwtManager, logger)
	frontendLoginURL := "/login"
	if len(cfg.CORS.AllowedOrigins) > 0 {
		frontendLoginURL = strings.TrimRight(cfg.CORS.AllowedOrigins[0], "/") + "/login"
	}

	// 初始化 Handlers
	authHandler := handler.NewAuthHandler(
		userService,
		nil, // emailService 需要邮件客户端，后续初始化
		githubOAuthService,
		frontendLoginURL,
		jwtManager,
		logger,
	)
	productHandler := handler.NewProductHandler(productService, logger)
	cartHandler := handler.NewCartHandler(cartService, logger)
	orderHandler := handler.NewOrderHandler(orderService, logger)
	adminHandler := handler.NewAdminHandler(adminService, jwtManager, logger)
	addressHandler := handler.NewAddressHandler(addressService, logger)
	presaleHandler := handler.NewPresaleHandler(presaleService, logger)
	couponHandler := handler.NewCouponHandler(couponService, logger)
	pointsHandler := handler.NewPointsHandler(pointsService, logger)
	membershipHandler := handler.NewMembershipHandler(membershipSvc, logger)
	configHandler := handler.NewConfigHandler(configService, logger)
	pageHandler := handler.NewPageHandler(pageService, logger)
	homePageHandler := handler.NewHomePageHandler(homePageService, logger)
	// Admin handlers
	productAdminHandler := adminhandler.NewProductAdminHandler(productAdminSvc, productRepo, logger)
	orderAdminHandler := adminhandler.NewOrderAdminHandler(orderAdminSvc, logger)
	categoryAdminHandler := adminhandler.NewCategoryAdminHandler(productAdminSvc, logger)
	brandAdminHandler := adminhandler.NewBrandAdminHandler(productAdminSvc, logger)
	statisticsAdminHandler := adminhandler.NewStatisticsAdminHandler(statisticsSvc, logger)
	userAdminSvc := adminservice.NewUserAdminService(db, userRepo, logger)
	userAdminHandler := adminhandler.NewUserAdminHandler(userAdminSvc, logger)
	configAdminHandler := adminhandler.NewConfigAdminHandler(configService, logger)
	pageAdminHandler := adminhandler.NewPageAdminHandler(pageService, logger)
	couponAdminHandler := adminhandler.NewCouponAdminHandler(db, logger)
	reviewAdminHandler := adminhandler.NewReviewAdminHandler(db, logger)

	return &Router{
		db:         db,
		rdb:        rdb,
		cfg:        cfg,
		logger:     logger,
		jwtManager: jwtManager,
		// Repositories
		productRepo:     productRepo,
		cartRepo:        cartRepo,
		orderRepo:       orderRepo,
		userRepo:        userRepo,
		adminRepo:       adminRepo,
		statisticsRepo:  statisticsRepo,
		paymentRepo:     paymentRepo,
		addressRepo:     addressRepo,
		presaleRepo:     presaleRepo,
		couponRepo:      couponRepo,
		pointsRepo:      pointsRepo,
		memberLevelRepo: memberLevelRepo,
		memberExpRepo:   memberExpRepo,
		expLogRepo:      expLogRepo,
		configRepo:      configRepo,
		pageRepo:        pageRepo,
		homePageRepo:    homePageRepo,
		// Services
		userService:     userService,
		productService:  productService,
		cartService:     cartService,
		orderService:    orderService,
		adminService:    adminService,
		addressService:  addressService,
		productAdminSvc: productAdminSvc,
		orderAdminSvc:   orderAdminSvc,
		statisticsSvc:   statisticsSvc,
		presaleService:  presaleService,
		couponService:   couponService,
		pointsService:   pointsService,
		membershipSvc:   membershipSvc,
		configService:   configService,
		pageService:     pageService,
		homePageService: homePageService,
		// Handlers
		authHandler:       authHandler,
		productHandler:    productHandler,
		cartHandler:       cartHandler,
		orderHandler:      orderHandler,
		adminHandler:      adminHandler,
		addressHandler:    addressHandler,
		presaleHandler:    presaleHandler,
		couponHandler:     couponHandler,
		pointsHandler:     pointsHandler,
		membershipHandler: membershipHandler,
		configHandler:     configHandler,
		pageHandler:       pageHandler,
		homePageHandler:   homePageHandler,
		// Admin handlers
		productAdminHandler:    productAdminHandler,
		orderAdminHandler:      orderAdminHandler,
		categoryAdminHandler:   categoryAdminHandler,
		brandAdminHandler:      brandAdminHandler,
		statisticsAdminHandler: statisticsAdminHandler,
		userAdminHandler:       userAdminHandler,
		configAdminHandler:     configAdminHandler,
		pageAdminHandler:       pageAdminHandler,
		couponAdminHandler:     couponAdminHandler,
		reviewAdminHandler:     reviewAdminHandler,
	}
}

// SetEmailService 设置邮件服务
func (r *Router) SetEmailService(emailService *service.EmailService) {
	r.emailService = emailService
	r.authCodeService = service.NewAuthCodeService(
		r.userService,
		emailService,
		r.jwtManager,
		r.rdb,
	)
	// 重新创建 AuthHandler 以包含邮件服务
	r.authHandler = handler.NewAuthHandler(
		r.userService,
		emailService,
		service.NewGitHubOAuthService(r.userService, r.configService, r.jwtManager, r.logger),
		func() string {
			if len(r.cfg.CORS.AllowedOrigins) > 0 {
				return strings.TrimRight(r.cfg.CORS.AllowedOrigins[0], "/") + "/login"
			}
			return "/login"
		}(),
		r.jwtManager,
		r.logger,
	)
	r.authCodeHandler = handler.NewAuthCodeHandler(r.authCodeService, r.logger)
}

// SetPaymentService 设置支付服务
func (r *Router) SetPaymentService(paymentService *service.PaymentService) {
	r.paymentService = paymentService
	r.paymentHandler = handler.NewPaymentHandler(paymentService, r.logger)
}

// GetPaymentRepo 获取支付仓库（用于创建PaymentService）
func (r *Router) GetPaymentRepo() *repository.PaymentRepo {
	return r.paymentRepo
}

// Setup 注册所有路由
func (r *Router) Setup(engine *gin.Engine) {
	// 全局中间件（按顺序执行）
	engine.Use(middleware.CORS(r.cfg))
	engine.Use(middleware.Recovery(r.logger))
	engine.Use(middleware.Logger(r.logger))
	engine.Use(middleware.RateLimit(r.rdb, 100, time.Minute)) // 每分钟 100 次请求限制

	// 健康检查
	engine.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "服务运行正常"})
	})

	// Swagger API 文档
	engine.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API v1 路由组
	v1 := engine.Group("/api/v1")
	{
		// 注册各模块路由
		r.setupAuthRoutes(v1)
		r.setupConfigRoutes(v1)
		r.setupUserRoutes(v1)
		r.setupProductRoutes(v1)
		r.setupCartRoutes(v1)
		r.setupOrderRoutes(v1)
		r.setupPaymentRoutes(v1)
		r.setupPresaleRoutes(v1)
		r.setupCouponRoutes(v1)
		r.setupPointsRoutes(v1)
		r.setupMembershipRoutes(v1)
		r.setupPageRoutes(v1)
		r.setupHomeRoutes(v1)
	}

	// 管理后台路由组
	admin := engine.Group("/api/admin")
	{
		r.setupAdminRoutes(admin)
	}
}

func (r *Router) setupConfigRoutes(rg *gin.RouterGroup) {
	configs := rg.Group("/configs")
	{
		configs.GET("/public", r.configHandler.GetPublicConfigs)
	}
}

// setupAuthRoutes 认证路由（公开 + 需要认证的混合）
func (r *Router) setupAuthRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		// 公开路由
		auth.POST("/register", r.authHandler.Register)
		auth.POST("/login", r.authHandler.Login)
		if r.authCodeHandler != nil {
			auth.POST("/login/code/send", r.authCodeHandler.SendLoginCode)
			auth.POST("/login/code/verify", r.authCodeHandler.VerifyLoginCode)
		}
		auth.GET("/github", r.authHandler.GitHubLogin)
		auth.GET("/github/callback", r.authHandler.GitHubCallback)
		auth.POST("/refresh", r.authHandler.Refresh)
		auth.POST("/send-code", r.authHandler.SendCode)
		auth.POST("/reset-password", r.authHandler.ResetPassword) // 重置密码

		// 需要认证的路由
		authProtected := auth.Group("")
		authProtected.Use(middleware.Auth(r.jwtManager))
		{
			authProtected.GET("/profile", r.authHandler.GetProfile)
			authProtected.GET("/me", r.authHandler.GetProfile) // 别名，前端兼容
			authProtected.PUT("/profile", r.authHandler.UpdateProfile)
			authProtected.PUT("/password", r.authHandler.UpdatePassword)
			authProtected.POST("/logout", r.authHandler.Logout) // 退出登录
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
		user.PUT("/info", r.authHandler.UpdateProfile)
		// 用户地址相关
		user.GET("/addresses", r.addressHandler.ListAddresses)
		user.GET("/addresses/:id", r.addressHandler.GetAddress)
		user.POST("/addresses", r.addressHandler.CreateAddress)
		user.PUT("/addresses/:id", r.addressHandler.UpdateAddress)
		user.DELETE("/addresses/:id", r.addressHandler.DeleteAddress)
		user.PUT("/addresses/:id/default", r.addressHandler.SetDefaultAddress)
	}
}

// setupProductRoutes 商品路由
func (r *Router) setupProductRoutes(rg *gin.RouterGroup) {
	products := rg.Group("/products")
	{
		// 公开路由 - 注意：静态路由必须在动态路由（/:id）之前注册
		products.GET("", r.productHandler.GetProductList)
		products.GET("/hot", r.productHandler.GetHotProducts) // 热门商品
		products.GET("/new", r.productHandler.GetNewProducts) // 新品推荐
		products.GET("/:id/reviews", r.homePageHandler.GetProductReviews)
		products.GET("/search", r.productHandler.SearchProducts)
		products.GET("/:id", r.productHandler.GetProductDetail) // 动态路由放最后
	}

	// 分类路由
	categories := rg.Group("/categories")
	{
		// 静态路由必须在动态路由（/:id）之前
		categories.GET("", r.productHandler.GetCategories)
		categories.GET("/tree", r.productHandler.GetCategories) // 分类树（复用 GetCategories）
		categories.GET("/:id/products", r.productHandler.GetProductsByCategory)
		categories.GET("/:id", r.productHandler.GetCategoryDetail)
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
		cart.PUT("/:id/selected", r.cartHandler.UpdateSelected)
		cart.DELETE("/:id", r.cartHandler.RemoveItem)
		cart.DELETE("", r.cartHandler.ClearCart)
		// 批量删除
		cart.POST("/batch-remove", r.cartHandler.BatchRemove)
		// 批量选择
		cart.POST("/batch-select", r.cartHandler.BatchSelect)
		// 全选/取消全选
		cart.POST("/select-all", r.cartHandler.SelectAll)
		// 获取选中商品
		cart.GET("/selected", r.cartHandler.GetSelectedItems)
		// 获取购物车商品数量
		cart.GET("/count", r.cartHandler.GetCartCount)
	}
}

// setupOrderRoutes 订单路由
func (r *Router) setupOrderRoutes(rg *gin.RouterGroup) {
	orders := rg.Group("/orders")
	orders.Use(middleware.Auth(r.jwtManager))
	{
		orders.GET("", r.orderHandler.GetOrderList)
		orders.POST("", r.orderHandler.CreateOrder)
		// 静态路由必须在动态路由（/:id）之前
		orders.GET("/no/:order_no", r.orderHandler.GetOrderByNo)
		orders.POST("/checkout/preview", r.orderHandler.CheckoutPreview)
		// 动态路由
		orders.GET("/:id", r.orderHandler.GetOrderDetail)
		orders.GET("/:id/status", r.orderHandler.GetOrderStatus)
		orders.GET("/:id/logistics", r.orderHandler.GetLogistics)
		orders.POST("/:id/reorder", r.orderHandler.Reorder)
		orders.POST("/:id/refund", r.orderHandler.ApplyRefund)
		orders.PUT("/:id/cancel", r.orderHandler.CancelOrder)
		orders.PUT("/:id/confirm", r.orderHandler.ConfirmReceive)
		orders.GET("/:id/pay", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "data": gin.H{"pay_url": ""}, "message": "请使用支付接口"})
		})
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
		users.GET("", r.userAdminHandler.List)
		users.GET("/stats", r.userAdminHandler.Stats)
		users.GET("/:id", r.userAdminHandler.Get)
		users.PUT("/:id", r.userAdminHandler.Update)
		users.DELETE("/:id", r.userAdminHandler.Delete)
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
		// 静态路由必须在动态路由（/:id）之前
		orders.GET("/statistics", r.orderAdminHandler.GetStatistics)
		// 动态路由
		orders.GET("/:id", r.orderAdminHandler.GetOrderDetail)
		orders.PUT("/:id/status", func(c *gin.Context) {
			c.JSON(200, gin.H{"code": 0, "message": "请使用专用接口（ship/refund）"})
		})
		orders.PUT("/:id/ship", r.orderAdminHandler.ShipOrder)
		orders.PUT("/:id/refund", r.orderAdminHandler.RefundOrder)
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

	// 配置管理
	configs := rg.Group("/configs")
	{
		configs.GET("", r.configAdminHandler.List)
		configs.POST("", r.configAdminHandler.Create)
		configs.GET("/:key", r.configAdminHandler.Get)
		configs.PUT("/:key", r.configAdminHandler.Update)
		configs.DELETE("/:key", r.configAdminHandler.Delete)
		configs.GET("/:key/histories", r.configAdminHandler.GetHistories)
	}

	// 优惠券管理
	coupons := rg.Group("/coupons")
	{
		coupons.GET("", r.couponAdminHandler.List)
		coupons.POST("", r.couponAdminHandler.Create)
		coupons.GET("/:id", r.couponAdminHandler.Get)
		coupons.PUT("/:id", r.couponAdminHandler.Update)
		coupons.DELETE("/:id", r.couponAdminHandler.Delete)
	}

	reviews := rg.Group("/reviews")
	{
		reviews.GET("", r.reviewAdminHandler.List)
		reviews.POST("", r.reviewAdminHandler.Create)
		reviews.GET("/:id", r.reviewAdminHandler.Get)
		reviews.PUT("/:id", r.reviewAdminHandler.Update)
		reviews.DELETE("/:id", r.reviewAdminHandler.Delete)
	}

	pages := rg.Group("/pages")
	{
		pages.GET("", r.pageAdminHandler.List)
		pages.POST("", r.pageAdminHandler.Create)
		pages.GET("/:id", r.pageAdminHandler.Get)
		pages.PUT("/:id", r.pageAdminHandler.Update)
		pages.DELETE("/:id", r.pageAdminHandler.Delete)
	}
}

// setupPresaleRoutes 预售路由
func (r *Router) setupPresaleRoutes(rg *gin.RouterGroup) {
	presale := rg.Group("/presales")
	{
		// 公开路由
		presale.GET("", r.presaleHandler.GetPresaleList)
		presale.GET("/active", r.presaleHandler.GetActivePresaleList)
		presale.GET("/:id", r.presaleHandler.GetPresaleDetail)
	}

	// 需要认证的预售路由
	presaleProtected := rg.Group("/presales")
	presaleProtected.Use(middleware.Auth(r.jwtManager))
	{
		presaleProtected.POST("/orders", r.presaleHandler.CreatePresaleOrder)
		presaleProtected.POST("/orders/deposit", r.presaleHandler.PayDeposit)
		presaleProtected.POST("/orders/balance", r.presaleHandler.PayBalance)
		presaleProtected.GET("/my-orders", r.presaleHandler.GetUserOrderList)
		presaleProtected.GET("/orders/:id", r.presaleHandler.GetOrderDetail)
		presaleProtected.POST("/orders/:id/cancel", r.presaleHandler.CancelOrder)
	}
}

// setupCouponRoutes 优惠券路由
func (r *Router) setupCouponRoutes(rg *gin.RouterGroup) {
	handler.RegisterCouponRoutes(rg, r.couponHandler, middleware.Auth(r.jwtManager))
}

// setupPointsRoutes 积分路由
func (r *Router) setupPointsRoutes(rg *gin.RouterGroup) {
	points := rg.Group("/points")
	points.Use(middleware.Auth(r.jwtManager))
	{
		points.POST("/checkin", r.pointsHandler.CheckIn)
		points.GET("/status", r.pointsHandler.GetCheckInStatus)
		points.GET("/history", r.pointsHandler.GetPointsHistory)
		points.GET("/continuous", r.pointsHandler.GetContinuousDays)
		points.GET("/balance", r.pointsHandler.GetUserPoints)
	}
}

// setupMembershipRoutes 会员路由
func (r *Router) setupMembershipRoutes(rg *gin.RouterGroup) {
	member := rg.Group("/member")
	{
		// 公开路由
		member.GET("/levels", r.membershipHandler.GetLevelList)
	}
	// 需要认证的会员路由
	memberProtected := rg.Group("/member")
	memberProtected.Use(middleware.Auth(r.jwtManager))
	{
		memberProtected.GET("/profile", r.membershipHandler.GetUserLevel)
		memberProtected.GET("/rights/:level_id", r.membershipHandler.GetLevelRights)
		memberProtected.GET("/experience/logs", r.membershipHandler.GetExperienceLogs)
		memberProtected.POST("/checkin", r.membershipHandler.CheckIn)
	}
}

func (r *Router) setupPageRoutes(rg *gin.RouterGroup) {
	pages := rg.Group("/pages")
	{
		pages.GET("/:slug", r.pageHandler.GetPageBySlug)
	}
}

func (r *Router) setupHomeRoutes(rg *gin.RouterGroup) {
	home := rg.Group("")
	{
		home.GET("/banners", r.homePageHandler.GetBanners)
		home.GET("/reviews/featured", r.homePageHandler.GetFeaturedReviews)
		home.POST("/subscriptions", r.homePageHandler.Subscribe)
	}
}
