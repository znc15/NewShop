package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/middleware"
	"newshop/api/internal/pkg/jwt"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type AdminHandler struct {
	adminService *service.AdminService
	jwtManager   *jwt.JWTManager
	logger       *zap.Logger
}

func NewAdminHandler(adminService *service.AdminService, jwtManager *jwt.JWTManager, logger *zap.Logger) *AdminHandler {
	return &AdminHandler{
		adminService: adminService,
		jwtManager:   jwtManager,
		logger:       logger,
	}
}

type AdminLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

type AdminLoginResponse struct {
	AccessToken string    `json:"access_token"`
	Admin       AdminInfo `json:"admin"`
}

type AdminInfo struct {
	ID       uint64 `json:"id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Role     string `json:"role"`
}

// Login 管理员登录
// POST /admin/auth/login
func (h *AdminHandler) Login(c *gin.Context) {
	var req AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 获取客户端 IP
	ip := c.ClientIP()

	result, err := h.adminService.Login(
		c.Request.Context(),
		req.Username,
		req.Password,
		ip,
		h.jwtManager.GenerateToken,
	)
	if err != nil {
		switch err {
		case service.ErrInvalidCredentials:
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    40101,
				"message": "用户名或密码错误",
			})
		case service.ErrAdminDisabled:
			c.JSON(http.StatusForbidden, gin.H{
				"code":    40301,
				"message": "管理员账号已禁用",
			})
		default:
			h.logger.Error("管理员登录失败", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    50000,
				"message": "登录失败",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": AdminLoginResponse{
			AccessToken: result.AccessToken,
			Admin: AdminInfo{
				ID:       result.Admin.ID,
				Username: result.Admin.Username,
				Nickname: result.Admin.Nickname,
				Role:     result.Admin.Role,
			},
		},
	})
}

// GetProfile 获取当前管理员信息
// GET /admin/profile
func (h *AdminHandler) GetProfile(c *gin.Context) {
	adminID := c.GetUint64("user_id")

	admin, err := h.adminService.GetAdminByID(c.Request.Context(), adminID)
	if err != nil {
		if err == service.ErrAdminNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40401,
				"message": "管理员不存在",
			})
			return
		}
		h.logger.Error("获取管理员信息失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取管理员信息失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"id":            admin.ID,
			"username":      admin.Username,
			"nickname":      admin.Nickname,
			"role":          admin.Role,
			"status":        admin.Status,
			"last_login_at": admin.LastLoginAt,
			"last_login_ip": admin.LastLoginIP,
			"created_at":    admin.CreatedAt,
		},
	})
}

type CreateAdminRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6,max=20"`
	Nickname string `json:"nickname" binding:"required"`
	Role     string `json:"role" binding:"required,oneof=admin super_admin operator"`
}

// CreateAdmin 创建管理员
// POST /admin/admins
func (h *AdminHandler) CreateAdmin(c *gin.Context) {
	var req CreateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	admin, err := h.adminService.CreateAdmin(
		c.Request.Context(),
		req.Username,
		req.Password,
		req.Nickname,
		req.Role,
	)
	if err != nil {
		if err == service.ErrAdminAlreadyExists {
			c.JSON(http.StatusConflict, gin.H{
				"code":    40901,
				"message": "管理员用户名已存在",
			})
			return
		}
		h.logger.Error("创建管理员失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "创建管理员失败",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 0,
		"data": gin.H{
			"id":       admin.ID,
			"username": admin.Username,
			"nickname": admin.Nickname,
			"role":     admin.Role,
			"status":   admin.Status,
		},
	})
}

type UpdateAdminRequest struct {
	Nickname string `json:"nickname"`
	Password string `json:"password"`
	Role     string `json:"role" binding:"omitempty,oneof=admin super_admin operator"`
	Status   string `json:"status" binding:"omitempty,oneof=active disabled"`
}

// UpdateAdmin 更新管理员
// PUT /admin/admins/:id
func (h *AdminHandler) UpdateAdmin(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的管理员 ID",
		})
		return
	}

	var req UpdateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	input := service.UpdateAdminInput{
		Nickname: &req.Nickname,
		Role:     &req.Role,
		Status:   &req.Status,
	}

	// 只有当密码不为空时才更新密码
	if req.Password != "" {
		input.Password = &req.Password
	}

	// 处理空字符串的情况
	if req.Nickname == "" {
		input.Nickname = nil
	}
	if req.Role == "" {
		input.Role = nil
	}
	if req.Status == "" {
		input.Status = nil
	}

	admin, err := h.adminService.UpdateAdmin(c.Request.Context(), id, input)
	if err != nil {
		if err == service.ErrAdminNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40401,
				"message": "管理员不存在",
			})
			return
		}
		h.logger.Error("更新管理员失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "更新管理员失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"id":       admin.ID,
			"username": admin.Username,
			"nickname": admin.Nickname,
			"role":     admin.Role,
			"status":   admin.Status,
		},
	})
}

// DeleteAdmin 删除管理员
// DELETE /admin/admins/:id
func (h *AdminHandler) DeleteAdmin(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的管理员 ID",
		})
		return
	}

	// 防止删除自己
	currentAdminID := c.GetUint64("user_id")
	if currentAdminID == id {
		c.JSON(http.StatusForbidden, gin.H{
			"code":    40302,
			"message": "不能删除自己的账号",
		})
		return
	}

	if err := h.adminService.DeleteAdmin(c.Request.Context(), id); err != nil {
		if err == service.ErrAdminNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40401,
				"message": "管理员不存在",
			})
			return
		}
		h.logger.Error("删除管理员失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "删除管理员失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

type ListAdminsQuery struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"page_size" binding:"omitempty,min=1,max=100"`
}

// ListAdmins 管理员列表
// GET /admin/admins
func (h *AdminHandler) ListAdmins(c *gin.Context) {
	var query ListAdminsQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	if query.Page == 0 {
		query.Page = 1
	}
	if query.PageSize == 0 {
		query.PageSize = 20
	}

	result, err := h.adminService.ListAdmins(c.Request.Context(), query.Page, query.PageSize)
	if err != nil {
		h.logger.Error("获取管理员列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取管理员列表失败",
		})
		return
	}

	// 转换为响应格式，隐藏敏感信息
	admins := make([]gin.H, len(result.Admins))
	for i, admin := range result.Admins {
		admins[i] = gin.H{
			"id":            admin.ID,
			"username":      admin.Username,
			"nickname":      admin.Nickname,
			"role":          admin.Role,
			"status":        admin.Status,
			"last_login_at": admin.LastLoginAt,
			"last_login_ip": admin.LastLoginIP,
			"created_at":    admin.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"admins": admins,
			"total":  result.Total,
			"page":   result.Page,
		},
	})
}

// RegisterAdminRoutes 注册管理员相关路由
func RegisterAdminRoutes(r *gin.RouterGroup, handler *AdminHandler, jwtManager *jwt.JWTManager) {
	// 公开路由（无需认证）
	auth := r.Group("/auth")
	{
		auth.POST("/login", handler.Login)
	}

	// 需要管理员认证的路由
	admin := r.Group("")
	admin.Use(middleware.AdminAuth(jwtManager))
	{
		// 当前管理员信息
		admin.GET("/profile", handler.GetProfile)

		// 管理员 CRUD
		admin.GET("/admins", handler.ListAdmins)
		admin.POST("/admins", handler.CreateAdmin)
		admin.PUT("/admins/:id", handler.UpdateAdmin)
		admin.DELETE("/admins/:id", handler.DeleteAdmin)
	}
}
