// Package main 是应用程序入口点
package main

import (
	"context"
	"log"

	_ "newshop/api/docs" // swagger docs，需要先运行 swag init 生成
	"newshop/api/internal/config"
	"newshop/api/internal/model"
	"newshop/api/internal/pkg/email"
	"newshop/api/internal/pkg/jwt"
	"newshop/api/internal/router"
	"newshop/api/internal/service"
	"newshop/api/internal/task/scheduler"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// @title NewShop API
// @version 1.0
// @description NewShop 电商平台 API 接口文档，支持商品管理、购物车、订单、预售、优惠券、积分、会员等核心电商功能
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /api/v1
// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization
// @description JWT认证令牌，格式: Bearer {token}

// Application 应用程序结构
type Application struct {
	config       *config.Config
	db           *gorm.DB
	redis        *redis.Client
	logger       *zap.Logger
	jwtManager   *jwt.JWTManager
	emailService *service.EmailService
	emailClient  *email.Client
}

func main() {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 初始化日志
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("初始化日志失败: %v", err)
	}
	defer logger.Sync()

	// 初始化数据库
	db, err := config.NewDB(&config.DBConfig{
		Host:     cfg.Database.Host,
		Port:     cfg.Database.Port,
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		Name:     cfg.Database.Name,
	})
	if err != nil {
		logger.Fatal("连接数据库失败", zap.Error(err))
	}

	if err := ensureCriticalTables(db); err != nil {
		logger.Fatal("初始化关键数据表失败", zap.Error(err))
	}

	// 初始化 Redis
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.Redis.Host + ":" + cfg.Redis.Port,
	})

	// 测试 Redis 连接
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Warn("Redis 连接失败，部分功能可能不可用", zap.Error(err))
	}

	// 初始化邮件客户端
	emailClient := email.NewClient(email.Config{
		Host:     cfg.SMTP.Host,
		Port:     cfg.SMTP.Port,
		User:     cfg.SMTP.User,
		Password: cfg.SMTP.Password,
		From:     cfg.SMTP.From,
	})

	// 初始化邮件服务
	emailService := service.NewEmailService(db, rdb, emailClient)

	// 创建 Gin 引擎
	engine := gin.New()

	// 创建路由管理器
	appRouter := router.NewRouter(db, rdb, cfg, logger)
	appRouter.SetEmailService(emailService)

	// 创建并启动任务调度器
	taskScheduler := scheduler.NewScheduler(db, emailService, logger)
	go taskScheduler.Start()
	defer taskScheduler.Stop()

	logger.Info("任务调度器已启动")

	// 注册路由
	appRouter.Setup(engine)

	// 记录启动信息
	logger.Info("服务器启动中",
		zap.String("port", cfg.Server.Port),
		zap.String("mode", cfg.Server.Mode),
	)

	// 打印路由信息（调试模式）
	if cfg.Server.Mode == gin.DebugMode {
		routes := engine.Routes()
		logger.Info("已注册路由", zap.Int("count", len(routes)))
	}

	// 启动服务
	log.Printf("服务器启动于 :%s", cfg.Server.Port)
	if err := engine.Run(":" + cfg.Server.Port); err != nil {
		logger.Fatal("启动服务失败", zap.Error(err))
	}
}

func ensureCriticalTables(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.Presale{},
		&model.PresaleOrder{},
		&model.Config{},
		&model.ConfigHistory{},
		&model.Coupon{},
		&model.UserCoupon{},
		&model.HomeBanner{},
		&model.HomeReview{},
		&model.NewsletterSubscription{},
		&scheduler.Task{},
	)
}
