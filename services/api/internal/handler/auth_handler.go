package handler

import (
	"errors"
	"net/http"

	"newshop/api/internal/model"
	"newshop/api/internal/pkg/jwt"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	userService  *service.UserService
	emailService *service.EmailService
	jwtManager   *jwt.JWTManager
	logger       *zap.Logger
}

func NewAuthHandler(userService *service.UserService, emailService *service.EmailService, jwtManager *jwt.JWTManager, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		userService:  userService,
		emailService: emailService,
		jwtManager:   jwtManager,
		logger:       logger,
	}
}

type RegisterRequest struct {
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6,max=20"`
	Nickname     string `json:"nickname"`
	Code         string `json:"code"`
	CaptchaID    string `json:"captcha_id"`
	CaptchaToken string `json:"captcha_token"`
}

type LoginRequest struct {
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required"`
	Code         string `json:"code"`
	CaptchaID    string `json:"captcha_id"`
	CaptchaToken string `json:"captcha_token"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type SendCodeRequest struct {
	Email        string `json:"email" binding:"required,email"`
	Type         string `json:"type" binding:"required,oneof=register login reset"`
	CaptchaID    string `json:"captcha_id" binding:"required"`
	CaptchaToken string `json:"captcha_token" binding:"required"`
}

// Register 用户注册
// @Summary 用户注册
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "注册请求"
// @Success 201 {object} RegisterResponse
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 409 {object} map[string]interface{} "邮箱已被注册"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /api/v1/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	existingUser, err := h.userService.GetByEmail(c.Request.Context(), req.Email)
	if err != nil && err != gorm.ErrRecordNotFound {
		h.logger.Error("查询用户失败", zap.Error(err), zap.String("email", req.Email))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "查询用户失败"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusConflict, gin.H{"code": 40901, "message": "邮箱已被注册"})
		return
	}

	// 开发环境跳过验证码校验
	if h.emailService != nil && req.Code != "" {
		valid, err := h.emailService.VerifyCode(c.Request.Context(), req.Email, "register", req.Code)
		if err != nil {
			h.logger.Error("验证码校验失败", zap.Error(err), zap.String("email", req.Email))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "验证码校验失败"})
			return
		}
		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "验证码错误或已过期"})
			return
		}
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "密码加密失败"})
		return
	}

	user := &model.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Nickname:     req.Nickname,
		MemberLevel:  1,
		Points:       0,
		Status:       "active",
	}

	if err := h.userService.Create(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "创建用户失败"})
		return
	}

	accessToken, err := h.jwtManager.GenerateToken(user.ID, user.Email, "user")
	if err != nil {
		h.logger.Error("生成访问令牌失败", zap.Error(err), zap.Uint64("user_id", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "生成令牌失败"})
		return
	}
	refreshToken, err := h.jwtManager.GenerateRefreshToken(user.ID, user.Email, "user")
	if err != nil {
		h.logger.Error("生成刷新令牌失败", zap.Error(err), zap.Uint64("user_id", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "生成令牌失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 0,
		"data": gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"user": gin.H{
				"id":       user.ID,
				"email":    user.Email,
				"nickname": user.Nickname,
			},
		},
	})
}

// Login 用户登录
// @Summary 用户登录
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body LoginRequest true "登录请求"
// @Success 200 {object} LoginResponse
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 401 {object} map[string]interface{} "邮箱或密码错误"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误"})
		return
	}

	user, err := h.userService.GetByEmail(c.Request.Context(), req.Email)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40101, "message": "邮箱或密码错误"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40101, "message": "邮箱或密码错误"})
		return
	}

	accessToken, err := h.jwtManager.GenerateToken(user.ID, user.Email, "user")
	if err != nil {
		h.logger.Error("生成访问令牌失败", zap.Error(err), zap.Uint64("user_id", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "生成令牌失败"})
		return
	}
	refreshToken, err := h.jwtManager.GenerateRefreshToken(user.ID, user.Email, "user")
	if err != nil {
		h.logger.Error("生成刷新令牌失败", zap.Error(err), zap.Uint64("user_id", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "生成令牌失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"user": gin.H{
				"id":       user.ID,
				"email":    user.Email,
				"nickname": user.Nickname,
			},
		},
	})
}

// Refresh 刷新令牌
// @Summary 刷新令牌
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body RefreshRequest true "刷新令牌请求"
// @Success 200 {object} RefreshResponse
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 401 {object} map[string]interface{} "刷新令牌无效"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /api/v1/auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误"})
		return
	}

	claims, err := h.jwtManager.ValidateToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40102, "message": "刷新令牌无效"})
		return
	}

	accessToken, err := h.jwtManager.GenerateToken(claims.UserID, claims.Email, claims.Role)
	if err != nil {
		h.logger.Error("生成访问令牌失败", zap.Error(err), zap.Uint64("user_id", claims.UserID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "生成令牌失败"})
		return
	}
	refreshToken, err := h.jwtManager.GenerateRefreshToken(claims.UserID, claims.Email, claims.Role)
	if err != nil {
		h.logger.Error("生成刷新令牌失败", zap.Error(err), zap.Uint64("user_id", claims.UserID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "生成令牌失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"access_token":  accessToken,
			"refresh_token": refreshToken,
		},
	})
}

// SendCode 发送验证码
// @Summary 发送验证码
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body SendCodeRequest true "发送验证码请求"
// @Success 200 {object} map[string]interface{} "验证码已发送"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 409 {object} map[string]interface{} "邮箱已被注册"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /api/v1/auth/send-code [post]
func (h *AuthHandler) SendCode(c *gin.Context) {
	var req SendCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误"})
		return
	}

	codeType := req.Type
	if codeType == "register" {
		existingUser, err := h.userService.GetByEmail(c.Request.Context(), req.Email)
		if err != nil {
			h.logger.Error("查询用户失败", zap.Error(err), zap.String("email", req.Email))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "查询用户失败"})
			return
		}
		if existingUser != nil {
			c.JSON(http.StatusConflict, gin.H{"code": 40901, "message": "邮箱已被注册"})
			return
		}
	}

	if err := h.emailService.SendVerifyCode(c.Request.Context(), req.Email, codeType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "发送验证码失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "验证码已发送",
	})
}

// GetProfile 获取用户信息
// @Summary 获取用户信息
// @Tags 认证
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} ProfileResponse
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 404 {object} map[string]interface{} "用户不存在"
// @Router /api/v1/auth/profile [get]
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetUint64("user_id")

	profile, err := h.userService.GetProfile(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "用户不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": profile,
	})
}

type UpdateProfileRequest struct {
	Username *string `json:"username"`
	Nickname *string `json:"nickname"`
	Phone    *string `json:"phone"`
	Avatar   *string `json:"avatar"`
}

// UpdateProfile 更新用户资料
// @Summary 更新用户资料
// @Tags 认证
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param request body UpdateProfileRequest true "更新用户资料请求"
// @Success 200 {object} ProfileResponse
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "用户不存在"
// @Failure 409 {object} map[string]interface{} "手机号已被使用"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /api/v1/auth/profile [put]
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	profile, err := h.userService.UpdateProfile(c.Request.Context(), userID, &service.UpdateProfileRequest{
		Username: req.Username,
		Nickname: req.Nickname,
		Phone:    req.Phone,
		Avatar:   req.Avatar,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "用户不存在"})
		case errors.Is(err, gorm.ErrDuplicatedKey):
			c.JSON(http.StatusConflict, gin.H{"code": 40901, "message": "手机号已被使用"})
		default:
			h.logger.Error("更新用户资料失败", zap.Error(err), zap.Uint64("user_id", userID))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新用户资料失败"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": profile,
	})
}

// UpdatePassword 修改密码
// @Summary 修改密码
// @Tags 认证
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param request body UpdatePasswordRequest true "修改密码请求"
// @Success 200 {object} map[string]interface{} "密码修改成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误或验证码错误"
// @Failure 401 {object} map[string]interface{} "未授权或原密码错误"
// @Failure 404 {object} map[string]interface{} "用户不存在"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /api/v1/auth/password [put]
func (h *AuthHandler) UpdatePassword(c *gin.Context) {
	userID := c.GetUint64("user_id")
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6,max=20"`
		Code        string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误"})
		return
	}

	user, err := h.userService.GetByID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("查询用户失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "用户不存在"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "用户不存在"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40101, "message": "原密码错误"})
		return
	}

	valid, err := h.emailService.VerifyCode(c.Request.Context(), user.Email, "reset", req.Code)
	if err != nil {
		h.logger.Error("验证码校验失败", zap.Error(err), zap.String("email", user.Email))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "验证码校验失败"})
		return
	}
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "验证码错误或已过期"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		h.logger.Error("密码加密失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "密码加密失败"})
		return
	}
	user.PasswordHash = string(hashedPassword)
	if err := h.userService.Update(c.Request.Context(), user); err != nil {
		h.logger.Error("更新用户密码失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新密码失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "密码修改成功"})
}

// Logout 退出登录
// @Summary 退出登录
// @Tags 认证
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} map[string]interface{} "退出成功"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Router /api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	// JWT是无状态的，客户端删除token即可
	// 如果需要服务端黑名单，可以在这里实现
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "退出成功"})
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Code     string `json:"code" binding:"required"`
	Password string `json:"password" binding:"required,min=6,max=20"`
}

// ResetPassword 重置密码（忘记密码）
// @Summary 重置密码
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body ResetPasswordRequest true "重置密码请求"
// @Success 200 {object} map[string]interface{} "密码重置成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误或验证码错误"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /api/v1/auth/reset-password [post]
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	// 验证验证码
	if h.emailService != nil {
		valid, err := h.emailService.VerifyCode(c.Request.Context(), req.Email, "reset", req.Code)
		if err != nil {
			h.logger.Error("验证码校验失败", zap.Error(err), zap.String("email", req.Email))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "验证码校验失败"})
			return
		}
		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "验证码错误或已过期"})
			return
		}
	}

	// 查找用户
	user, err := h.userService.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "该邮箱未注册"})
			return
		}
		h.logger.Error("查询用户失败", zap.Error(err), zap.String("email", req.Email))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "查询用户失败"})
		return
	}

	// 更新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "密码加密失败"})
		return
	}
	user.PasswordHash = string(hashedPassword)
	if err := h.userService.Update(c.Request.Context(), user); err != nil {
		h.logger.Error("更新密码失败", zap.Error(err), zap.Uint64("user_id", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新密码失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "密码重置成功"})
}

// UpdatePasswordRequest 修改密码请求
type UpdatePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=20"`
	Code        string `json:"code" binding:"required"`
}

// UserInfo 用户基本信息
type UserInfo struct {
	ID       uint64 `json:"id"`
	Email    string `json:"email"`
	Nickname string `json:"nickname"`
}

// RegisterResponse 注册响应
type RegisterResponse struct {
	Code int `json:"code"`
	Data *struct {
		AccessToken  string    `json:"access_token"`
		RefreshToken string    `json:"refresh_token"`
		User         *UserInfo `json:"user"`
	} `json:"data"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Code int `json:"code"`
	Data *struct {
		AccessToken  string    `json:"access_token"`
		RefreshToken string    `json:"refresh_token"`
		User         *UserInfo `json:"user"`
	} `json:"data"`
}

// RefreshResponse 刷新令牌响应
type RefreshResponse struct {
	Code int `json:"code"`
	Data *struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	} `json:"data"`
}

// ProfileResponse 用户信息响应
type ProfileResponse struct {
	Code int `json:"code"`
	Data *struct {
		ID          uint64  `json:"id"`
		Email       string  `json:"email"`
		Phone       string  `json:"phone"`
		Username    string  `json:"username"`
		Nickname    string  `json:"nickname"`
		Avatar      string  `json:"avatar"`
		MemberLevel int     `json:"member_level"`
		Level       int     `json:"level"`
		Points      int     `json:"points"`
		Status      string  `json:"status"`
		OrderCount  int64   `json:"order_count"`
		TotalSpent  float64 `json:"total_spent"`
		CreatedAt   string  `json:"created_at"`
		UpdatedAt   string  `json:"updated_at"`
	} `json:"data"`
}
