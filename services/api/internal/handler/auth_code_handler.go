package handler

import (
	"errors"
	"net/http"

	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type AuthCodeHandler struct {
	authCodeService *service.AuthCodeService
	logger          *zap.Logger
}

type SendLoginCodeRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type VerifyLoginCodeRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required,len=6,numeric"`
}

func NewAuthCodeHandler(authCodeService *service.AuthCodeService, logger *zap.Logger) *AuthCodeHandler {
	return &AuthCodeHandler{
		authCodeService: authCodeService,
		logger:          logger,
	}
}

// SendLoginCode 发送登录验证码
// @Summary 发送登录验证码
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body SendLoginCodeRequest true "发送登录验证码请求"
// @Success 200 {object} map[string]interface{} "验证码已发送"
// @Failure 400 {object} map[string]interface{} "请求参数错误或邮箱未注册"
// @Failure 429 {object} map[string]interface{} "发送过于频繁"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /api/v1/auth/login/code/send [post]
func (h *AuthCodeHandler) SendLoginCode(c *gin.Context) {
	var req SendLoginCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	err := h.authCodeService.SendLoginCode(c.Request.Context(), req.Email)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLoginCodeUserNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "该邮箱未注册"})
		case errors.Is(err, service.ErrLoginCodeSendTooFrequent):
			c.JSON(http.StatusTooManyRequests, gin.H{"code": 42901, "message": "验证码发送过于频繁，请 60 秒后再试"})
		default:
			h.logger.Error("发送登录验证码失败", zap.Error(err), zap.String("email", req.Email))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "发送验证码失败"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "验证码已发送",
	})
}

// VerifyLoginCode 验证登录验证码
// @Summary 验证登录验证码
// @Tags 认证
// @Accept json
// @Produce json
// @Param request body VerifyLoginCodeRequest true "验证码登录请求"
// @Success 200 {object} LoginResponse
// @Failure 400 {object} map[string]interface{} "请求参数错误或验证码错误"
// @Failure 429 {object} map[string]interface{} "验证码错误次数过多"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /api/v1/auth/login/code/verify [post]
func (h *AuthCodeHandler) VerifyLoginCode(c *gin.Context) {
	var req VerifyLoginCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	result, err := h.authCodeService.VerifyLoginCode(c.Request.Context(), req.Email, req.Code)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLoginCodeUserNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "该邮箱未注册"})
		case errors.Is(err, service.ErrLoginCodeInvalidOrExpired):
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "验证码错误或已过期"})
		case errors.Is(err, service.ErrLoginCodeAttemptsExceeded):
			c.JSON(http.StatusTooManyRequests, gin.H{"code": 42902, "message": "验证码错误次数过多，请重新获取"})
		default:
			h.logger.Error("验证码登录失败", zap.Error(err), zap.String("email", req.Email))
			c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "验证码登录失败"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"access_token":  result.AccessToken,
			"refresh_token": result.RefreshToken,
			"user": gin.H{
				"id":       result.User.ID,
				"email":    result.User.Email,
				"nickname": result.User.Nickname,
			},
		},
	})
}
