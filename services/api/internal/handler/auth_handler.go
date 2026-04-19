package handler

import (
	"context"
	"errors"
	"net/http"
	"net/url"

	"newshop/api/internal/model"
	"newshop/api/internal/pkg/geetest"
	"newshop/api/internal/pkg/jwt"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	userService        *service.UserService
	emailService       *service.EmailService
	githubOAuthService *service.GitHubOAuthService
	configService      *service.ConfigService
	frontendLoginURL   string
	jwtManager         *jwt.JWTManager
	logger             *zap.Logger
}

func NewAuthHandler(userService *service.UserService, emailService *service.EmailService, githubOAuthService *service.GitHubOAuthService, configService *service.ConfigService, frontendLoginURL string, jwtManager *jwt.JWTManager, logger *zap.Logger) *AuthHandler {
	return &AuthHandler{
		userService:        userService,
		emailService:       emailService,
		githubOAuthService: githubOAuthService,
		configService:      configService,
		frontendLoginURL:   frontendLoginURL,
		jwtManager:         jwtManager,
		logger:             logger,
	}
}

const githubOAuthStateCookieName = "github_oauth_state"

type RegisterRequest struct {
	Email            string `json:"email" binding:"required,email"`
	Password         string `json:"password" binding:"required,min=6,max=20"`
	Nickname         string `json:"nickname"`
	Code             string `json:"code"`
	GeetestChallenge string `json:"geetest_challenge"`
	GeetestValidate  string `json:"geetest_validate"`
	GeetestSeccode   string `json:"geetest_seccode"`
	GeetestGenTime   string `json:"gen_time"`
}

type LoginRequest struct {
	Email            string `json:"email" binding:"required,email"`
	Password         string `json:"password" binding:"required"`
	Code             string `json:"code"`
	GeetestChallenge string `json:"geetest_challenge"`
	GeetestValidate  string `json:"geetest_validate"`
	GeetestSeccode   string `json:"geetest_seccode"`
	GeetestGenTime   string `json:"gen_time"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type SendCodeRequest struct {
	Email            string `json:"email" binding:"required,email"`
	Type             string `json:"type" binding:"required,oneof=register login reset"`
	CaptchaID        string `json:"captcha_id"`
	CaptchaToken     string `json:"captcha_token"`
	GeetestChallenge string `json:"geetest_challenge"`
	GeetestValidate  string `json:"geetest_validate"`
	GeetestSeccode   string `json:"geetest_seccode"`
	GeetestGenTime   string `json:"gen_time"`
}

type GeetestParams struct {
	GeetestChallenge string
	GeetestValidate  string
	GeetestSeccode   string
	GeetestGenTime   string
}

func VerifyGeetestForAction(ctx context.Context, configService *service.ConfigService, logger *zap.Logger, action string, params GeetestParams) (int, string) {
	var enabledActions []string
	if err := configService.GetJSONConfig(ctx, model.ConfigKeyGeetestActions, &enabledActions); err != nil {
		logger.Error("获取极验配置失败", zap.Error(err))
		return 50000, "系统配置错误"
	}

	isRequired := false
	for _, a := range enabledActions {
		if a == action {
			isRequired = true
			break
		}
	}

	if !isRequired {
		return 0, ""
	}

	id, _ := configService.GetStringConfig(ctx, model.ConfigKeyGeetestID)
	key, _ := configService.GetStringConfig(ctx, model.ConfigKeyGeetestKey)
	if id == "" || key == "" {
		return 0, ""
	}

	if params.GeetestChallenge == "" || params.GeetestValidate == "" || params.GeetestSeccode == "" {
		return 40001, "请完成行为验证"
	}

	client := geetest.NewClient(id, key)
	valid, err := client.Verify(geetest.VerifyRequest{
		LotNumber:     params.GeetestChallenge,
		CaptchaOutput: params.GeetestValidate,
		PassToken:     params.GeetestSeccode,
		GenTime:       params.GeetestGenTime,
	})
	if err != nil {
		logger.Error("极验服务器请求失败", zap.Error(err))
		return 50000, "验证码校验失败"
	}
	if !valid {
		return 40002, "验证码错误或已过期"
	}

	return 0, ""
}

// GetGeetestInfo 获取极验初始化信息
// @Summary 获取极验初始化信息
// @Tags 认证
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/auth/geetest [get]
func (h *AuthHandler) GetGeetestInfo(c *gin.Context) {
	id, err := h.configService.GetStringConfig(c.Request.Context(), model.ConfigKeyGeetestID)
	if err != nil {
		h.logger.Error("获取极验 ID 失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取验证配置失败"})
		return
	}

	var enabledActions []string
	if err := h.configService.GetJSONConfig(c.Request.Context(), model.ConfigKeyGeetestActions, &enabledActions); err != nil {
		h.logger.Warn("获取启用的极验行为失败, 默认全部关闭", zap.Error(err))
		enabledActions = []string{}
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"geetest_id":      id,
			"enabled_actions": enabledActions,
		},
	})
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

	// 极验验证
	if code, msg := VerifyGeetestForAction(c.Request.Context(), h.configService, h.logger, "register", GeetestParams{
		GeetestChallenge: req.GeetestChallenge,
		GeetestValidate:  req.GeetestValidate,
		GeetestSeccode:   req.GeetestSeccode,
		GeetestGenTime:   req.GeetestGenTime,
	}); code != 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": code, "message": msg})
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

	// 极验验证
	if code, msg := VerifyGeetestForAction(c.Request.Context(), h.configService, h.logger, "login", GeetestParams{
		GeetestChallenge: req.GeetestChallenge,
		GeetestValidate:  req.GeetestValidate,
		GeetestSeccode:   req.GeetestSeccode,
		GeetestGenTime:   req.GeetestGenTime,
	}); code != 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": code, "message": msg})
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

// GitHubLogin 发起 GitHub OAuth 登录
// @Summary 发起 GitHub OAuth 登录
// @Tags 认证
// @Success 302 {string} string "跳转到 GitHub 授权页"
// @Router /api/v1/auth/github [get]
func (h *AuthHandler) GitHubLogin(c *gin.Context) {
	if h.githubOAuthService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"code": 50000, "message": "GitHub OAuth 未启用"})
		return
	}

	state, err := h.githubOAuthService.GenerateState()
	if err != nil {
		h.logger.Error("生成 GitHub OAuth state 失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "发起 GitHub 登录失败"})
		return
	}

	authURL, err := h.githubOAuthService.GetAuthorizationURL(c.Request.Context(), state)
	if err != nil {
		h.logger.Error("生成 GitHub OAuth 授权地址失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "GitHub OAuth 配置无效"})
		return
	}

	c.SetCookie(githubOAuthStateCookieName, state, 600, "/", "", false, true)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// GitHubCallback 处理 GitHub OAuth 回调
// @Summary 处理 GitHub OAuth 回调
// @Tags 认证
// @Success 302 {string} string "回跳前端登录页"
// @Router /api/v1/auth/github/callback [get]
func (h *AuthHandler) GitHubCallback(c *gin.Context) {
	if h.githubOAuthService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"code": 50000, "message": "GitHub OAuth 未启用"})
		return
	}

	state := c.Query("state")
	code := c.Query("code")
	cookieState, err := c.Cookie(githubOAuthStateCookieName)
	c.SetCookie(githubOAuthStateCookieName, "", -1, "/", "", false, true)

	if err != nil || cookieState == "" || state == "" || cookieState != state {
		h.logger.Warn("GitHub OAuth state 校验失败", zap.Error(err))
		h.redirectToFrontendLogin(c, "GitHub 登录状态校验失败")
		return
	}

	result, err := h.githubOAuthService.HandleCallback(c.Request.Context(), code)
	if err != nil {
		h.logger.Error("GitHub OAuth 回调处理失败", zap.Error(err))
		h.redirectToFrontendLogin(c, "GitHub 登录失败，请稍后重试")
		return
	}

	redirectURL := h.frontendLoginURL
	if redirectURL == "" {
		redirectURL = "/login"
	}

	parsedURL, err := url.Parse(redirectURL)
	if err != nil {
		h.logger.Error("解析前端登录地址失败", zap.Error(err), zap.String("url", redirectURL))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "登录回跳失败"})
		return
	}

	query := parsedURL.Query()
	query.Set("access_token", result.AccessToken)
	query.Set("refresh_token", result.RefreshToken)
	parsedURL.RawQuery = query.Encode()

	c.Redirect(http.StatusTemporaryRedirect, parsedURL.String())
}

func (h *AuthHandler) redirectToFrontendLogin(c *gin.Context, errMessage string) {
	redirectURL := h.frontendLoginURL
	if redirectURL == "" {
		redirectURL = "/login"
	}

	parsedURL, parseErr := url.Parse(redirectURL)
	if parseErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": errMessage})
		return
	}

	query := parsedURL.Query()
	query.Set("oauth_error", errMessage)
	parsedURL.RawQuery = query.Encode()
	c.Redirect(http.StatusTemporaryRedirect, parsedURL.String())
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

	// 极验验证
	if code, msg := VerifyGeetestForAction(c.Request.Context(), h.configService, h.logger, "send_code", GeetestParams{
		GeetestChallenge: req.GeetestChallenge,
		GeetestValidate:  req.GeetestValidate,
		GeetestSeccode:   req.GeetestSeccode,
		GeetestGenTime:   req.GeetestGenTime,
	}); code != 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": code, "message": msg})
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
	Email            string `json:"email" binding:"required,email"`
	Code             string `json:"code" binding:"required"`
	Password         string `json:"password" binding:"required,min=6,max=20"`
	GeetestChallenge string `json:"geetest_challenge"`
	GeetestValidate  string `json:"geetest_validate"`
	GeetestSeccode   string `json:"geetest_seccode"`
	GeetestGenTime   string `json:"gen_time"`
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

	// 极验验证
	if code, msg := VerifyGeetestForAction(c.Request.Context(), h.configService, h.logger, "reset_password", GeetestParams{
		GeetestChallenge: req.GeetestChallenge,
		GeetestValidate:  req.GeetestValidate,
		GeetestSeccode:   req.GeetestSeccode,
		GeetestGenTime:   req.GeetestGenTime,
	}); code != 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": code, "message": msg})
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
