package handler

import (
	"net/http"

	"newshop/api/internal/model"
	"newshop/api/internal/pkg/jwt"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userService  *service.UserService
	emailService *service.EmailService
	jwtManager    *jwt.JWTManager
	logger        *zap.Logger
}

func NewAuthHandler(userService *service.UserService, emailService *service.EmailService, jwtManager *jwt.JWTManager, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		userService:  userService,
		emailService: emailService,
		jwtManager:    jwtManager,
		logger:        logger,
	}
}

type RegisterRequest struct {
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6,max=20"`
	Nickname     string `json:"nickname"`
	Code         string `json:"code" binding:"required"`
	CaptchaID    string `json:"captcha_id" binding:"required"`
	CaptchaToken string `json:"captcha_token" binding:"required"`
}

type LoginRequest struct {
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required"`
	Code         string `json:"code"`
	CaptchaID    string `json:"captcha_id" binding:"required"`
	CaptchaToken string `json:"captcha_token" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type SendCodeRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Type      string `json:"type" binding:"required,oneof=register login reset"`
	CaptchaID string `json:"captcha_id" binding:"required"`
	CaptchaToken string `json:"captcha_token" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

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
				"id":     user.ID,
				"email":  user.Email,
				"nickname": user.Nickname,
			},
		},
	})
}

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

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetUint64("user_id")

	user, err := h.userService.GetByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "用户不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"id":           user.ID,
			"email":        user.Email,
			"nickname":     user.Nickname,
			"avatar":       user.Avatar,
			"member_level": user.MemberLevel,
			"points":       user.Points,
		},
	})
}

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
