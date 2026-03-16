package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type PointsHandler struct {
	pointsService *service.PointsService
	logger        *zap.Logger
}

func NewPointsHandler(pointsService *service.PointsService, logger *zap.Logger) *PointsHandler {
	return &PointsHandler{
		pointsService: pointsService,
		logger:        logger,
	}
}

// CheckIn 用户签到
// @Summary 用户签到
// @Tags 积分
// @Security ApiKeyAuth
// @Success 200 {object} CheckInResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /points/checkin [post]
func (h *PointsHandler) CheckIn(c *gin.Context) {
	userID := c.GetUint64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40100, "message": "未授权"})
		return
	}

	result, err := h.pointsService.CheckIn(c.Request.Context(), userID)
	if err != nil {
		if err == service.ErrAlreadyCheckedIn {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "今日已签到"})
			return
		}
		h.logger.Error("签到失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "签到失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"checked":         result.Checked,
			"points_earned":   result.PointsEarned,
			"base_points":     result.BasePoints,
			"bonus_points":    result.BonusPoints,
			"continuous_days": result.ContinuousDays,
			"check_date":      result.CheckDate.Format("2006-01-02"),
			"message":         result.Message,
		},
	})
}

// GetCheckInStatus 获取签到状态
// @Summary 获取签到状态
// @Tags 积分
// @Security ApiKeyAuth
// @Success 200 {object} CheckInStatusResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /points/status [get]
func (h *PointsHandler) GetCheckInStatus(c *gin.Context) {
	userID := c.GetUint64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40100, "message": "未授权"})
		return
	}

	status, err := h.pointsService.GetCheckInStatus(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("获取签到状态失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取签到状态失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"today_checked":   status.TodayChecked,
			"continuous_days": status.ContinuousDays,
			"total_points":    status.TotalPoints,
			"next_bonus_days": status.NextBonusDays,
			"next_bonus_type": status.NextBonusType,
		},
	})
}

// GetPointsHistory 获取积分历史
// @Summary 获取积分历史
// @Tags 积分
// @Security ApiKeyAuth
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Success 200 {object} PointsHistoryResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /points/history [get]
func (h *PointsHandler) GetPointsHistory(c *gin.Context) {
	userID := c.GetUint64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40100, "message": "未授权"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	result, err := h.pointsService.GetPointsHistory(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		h.logger.Error("获取积分历史失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取积分历史失败"})
		return
	}

	// 转换记录为响应格式
	records := make([]gin.H, 0, len(result.Records))
	for _, r := range result.Records {
		records = append(records, gin.H{
			"id":          r.ID,
			"points":      r.Points,
			"balance":     r.Balance,
			"type":        r.Type,
			"description": r.Description,
			"related_id":  r.RelatedID,
			"created_at":  r.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"records":   records,
			"total":     result.Total,
			"page":      result.Page,
			"page_size": result.PageSize,
		},
	})
}

// GetContinuousDays 获取连续签到天数
// @Summary 获取连续签到天数
// @Tags 积分
// @Security ApiKeyAuth
// @Success 200 {object} ContinuousDaysResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /points/continuous [get]
func (h *PointsHandler) GetContinuousDays(c *gin.Context) {
	userID := c.GetUint64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40100, "message": "未授权"})
		return
	}

	days, err := h.pointsService.GetContinuousDays(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("获取连续签到天数失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取连续签到天数失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"continuous_days": days,
		},
	})
}

// AddPointsRequest 手动增加积分请求
type AddPointsRequest struct {
	UserID      uint64 `json:"user_id" binding:"required"`
	Points      int    `json:"points" binding:"required,gt=0"`
	Description string `json:"description" binding:"required"`
}

// AddPoints 手动增加积分（管理员接口）
// @Summary 手动增加积分
// @Tags 积分
// @Security ApiKeyAuth
// @Param request body AddPointsRequest true "请求参数"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /admin/points/add [post]
func (h *PointsHandler) AddPoints(c *gin.Context) {
	var req AddPointsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	err := h.pointsService.AddPoints(
		c.Request.Context(),
		req.UserID,
		req.Points,
		"manual_add",
		req.Description,
		0,
	)
	if err != nil {
		h.logger.Error("增加积分失败", zap.Error(err), zap.Uint64("user_id", req.UserID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "增加积分失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "积分增加成功",
	})
}

// DeductPointsRequest 手动扣减积分请求
type DeductPointsRequest struct {
	UserID      uint64 `json:"user_id" binding:"required"`
	Points      int    `json:"points" binding:"required,gt=0"`
	Description string `json:"description" binding:"required"`
}

// DeductPoints 手动扣减积分（管理员接口）
// @Summary 手动扣减积分
// @Tags 积分
// @Security ApiKeyAuth
// @Param request body DeductPointsRequest true "请求参数"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /admin/points/deduct [post]
func (h *PointsHandler) DeductPoints(c *gin.Context) {
	var req DeductPointsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	err := h.pointsService.DeductPoints(
		c.Request.Context(),
		req.UserID,
		req.Points,
		"manual_deduct",
		req.Description,
		0,
	)
	if err != nil {
		if err == service.ErrInsufficientPoints {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "用户积分不足"})
			return
		}
		h.logger.Error("扣减积分失败", zap.Error(err), zap.Uint64("user_id", req.UserID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "扣减积分失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "积分扣减成功",
	})
}

// GetUserPoints 获取用户积分
// @Summary 获取用户积分
// @Tags 积分
// @Security ApiKeyAuth
// @Success 200 {object} UserPointsResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /points/balance [get]
func (h *PointsHandler) GetUserPoints(c *gin.Context) {
	userID := c.GetUint64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40100, "message": "未授权"})
		return
	}

	points, err := h.pointsService.GetUserPoints(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("获取用户积分失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取用户积分失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"points": points,
		},
	})
}

// RegisterPointsRoutes 注册积分相关路由
func RegisterPointsRoutes(r *gin.RouterGroup, h *PointsHandler) {
	points := r.Group("/points")
	{
		// 用户接口（需要登录）
		points.POST("/checkin", h.CheckIn)             // 签到
		points.GET("/status", h.GetCheckInStatus)      // 签到状态
		points.GET("/history", h.GetPointsHistory)     // 积分历史
		points.GET("/continuous", h.GetContinuousDays) // 连续签到天数
		points.GET("/balance", h.GetUserPoints)        // 积分余额
	}
}

// RegisterAdminPointsRoutes 注册管理员积分路由
func RegisterAdminPointsRoutes(r *gin.RouterGroup, h *PointsHandler) {
	adminPoints := r.Group("/points")
	{
		adminPoints.POST("/add", h.AddPoints)       // 增加积分
		adminPoints.POST("/deduct", h.DeductPoints) // 扣减积分
	}
}

// CheckInResponse 签到响应
type CheckInResponse struct {
	Code int `json:"code"`
	Data *struct {
		Checked        bool   `json:"checked"`
		PointsEarned   int    `json:"points_earned"`
		BasePoints     int    `json:"base_points"`
		BonusPoints    int    `json:"bonus_points"`
		ContinuousDays int    `json:"continuous_days"`
		CheckDate      string `json:"check_date"`
		Message        string `json:"message"`
	} `json:"data"`
}

// CheckInStatusResponse 签到状态响应
type CheckInStatusResponse struct {
	Code int `json:"code"`
	Data *struct {
		TodayChecked   bool   `json:"today_checked"`
		ContinuousDays int    `json:"continuous_days"`
		TotalPoints    int    `json:"total_points"`
		NextBonusDays  int    `json:"next_bonus_days"`
		NextBonusType  string `json:"next_bonus_type"`
	} `json:"data"`
}

// PointsRecord 积分记录
type PointsRecord struct {
	ID          uint64 `json:"id"`
	Points      int    `json:"points"`
	Balance     int    `json:"balance"`
	Type        string `json:"type"`
	Description string `json:"description"`
	RelatedID   uint64 `json:"related_id"`
	CreatedAt   string `json:"created_at"`
}

// PointsHistoryResponse 积分历史响应
type PointsHistoryResponse struct {
	Code int `json:"code"`
	Data *struct {
		Records  []PointsRecord `json:"records"`
		Total    int            `json:"total"`
		Page     int            `json:"page"`
		PageSize int            `json:"page_size"`
	} `json:"data"`
}

// ContinuousDaysResponse 连续签到天数响应
type ContinuousDaysResponse struct {
	Code int `json:"code"`
	Data *struct {
		ContinuousDays int `json:"continuous_days"`
	} `json:"data"`
}

// UserPointsResponse 用户积分响应
type UserPointsResponse struct {
	Code int `json:"code"`
	Data *struct {
		Points int `json:"points"`
	} `json:"data"`
}
