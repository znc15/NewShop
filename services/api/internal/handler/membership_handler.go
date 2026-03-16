package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// MembershipHandler 会员处理器
type MembershipHandler struct {
	memberService *service.MembershipService
	logger        *zap.Logger
}

// NewMembershipHandler 创建会员处理器
func NewMembershipHandler(memberService *service.MembershipService, logger *zap.Logger) *MembershipHandler {
	return &MembershipHandler{
		memberService: memberService,
		logger:        logger,
	}
}

// GetLevelList 获取会员等级列表
// @Summary 获取会员等级列表
// @Description 获取所有会员等级信息列表
// @Tags 会员
// @Success 200 {object} MemberLevelListResponse
// @Failure 500 {object} MembershipErrorResponse
// @Router /membership/levels [get]
func (h *MembershipHandler) GetLevelList(c *gin.Context) {
	levels, err := h.memberService.GetLevelList(c.Request.Context())
	if err != nil {
		h.logger.Error("获取等级列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取等级列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": levels,
	})
}

// GetUserLevel 获取用户当前等级
// @Summary 获取用户当前等级
// @Description 获取当前登录用户的会员等级和经验值信息
// @Tags 会员
// @Security ApiKeyAuth
// @Success 200 {object} UserLevelResponse
// @Failure 401 {object} MembershipErrorResponse
// @Failure 500 {object} MembershipErrorResponse
// @Router /membership/user/level [get]
func (h *MembershipHandler) GetUserLevel(c *gin.Context) {
	// 从上下文获取用户ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40101, "message": "未登录"})
		return
	}

	exp, level, err := h.memberService.GetUserLevel(c.Request.Context(), userID.(uint64))
	if err != nil {
		h.logger.Error("获取用户等级失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取用户等级失败"})
		return
	}

	// 获取下一等级信息
	nextLevel, _ := h.memberService.GetLevelRights(c.Request.Context(), uint64(exp.CurrentLevel+1))

	response := gin.H{
		"current_level":   level,
		"total_points":    exp.TotalPoints,
		"experience":      exp.Experience,
		"current_levelId": exp.CurrentLevel,
	}

	if nextLevel != nil {
		response["next_level"] = nextLevel
		response["points_to_next"] = nextLevel.MinPoints - exp.TotalPoints
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": response,
	})
}

// GetLevelRights 获取等级权益
// @Summary 获取等级权益
// @Description 获取指定等级的权益详情
// @Tags 会员
// @Param id path int true "等级ID"
// @Success 200 {object} LevelRightsResponse
// @Failure 400 {object} MembershipErrorResponse
// @Failure 404 {object} MembershipErrorResponse
// @Router /membership/levels/{id} [get]
func (h *MembershipHandler) GetLevelRights(c *gin.Context) {
	levelIDStr := c.Param("id")
	levelID, err := strconv.ParseUint(levelIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的等级ID"})
		return
	}

	level, err := h.memberService.GetLevelRights(c.Request.Context(), levelID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"code": 40401, "message": "等级不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": level,
	})
}

// GetExperienceLogs 获取经验值变动日志
// @Summary 获取经验值变动日志
// @Description 获取当前用户的经验值变动历史记录（分页）
// @Tags 会员
// @Security ApiKeyAuth
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Success 200 {object} ExperienceLogsResponse
// @Failure 401 {object} MembershipErrorResponse
// @Failure 500 {object} MembershipErrorResponse
// @Router /membership/user/experience-logs [get]
func (h *MembershipHandler) GetExperienceLogs(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40101, "message": "未登录"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	logs, total, err := h.memberService.GetExperienceLogs(c.Request.Context(), userID.(uint64), page, pageSize)
	if err != nil {
		h.logger.Error("获取经验值日志失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取经验值日志失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"list":      logs,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// CheckIn 签到获取经验值
// @Summary 签到获取经验值
// @Description 用户每日签到获取经验值奖励
// @Tags 会员
// @Security ApiKeyAuth
// @Success 200 {object} MembershipCheckInResponse
// @Failure 400 {object} MembershipErrorResponse
// @Failure 401 {object} MembershipErrorResponse
// @Failure 500 {object} MembershipErrorResponse
// @Router /membership/checkin [post]
func (h *MembershipHandler) CheckIn(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"code": 40101, "message": "未登录"})
		return
	}

	err := h.memberService.AddCheckInExperience(c.Request.Context(), userID.(uint64))
	if err != nil {
		if err == service.ErrInvalidPoints {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "无效的经验值"})
			return
		}
		h.logger.Error("签到失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "签到失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "签到成功，获得5经验值",
		"data": gin.H{
			"points": 5,
		},
	})
}

// RegisterMembershipRoutes 注册会员相关路由
func RegisterMembershipRoutes(r *gin.RouterGroup, h *MembershipHandler) {
	member := r.Group("/membership")
	{
		// 公开接口
		member.GET("/levels", h.GetLevelList)
		member.GET("/levels/:id", h.GetLevelRights)

		// 需要登录的接口
		auth := member.Group("")
		{
			auth.GET("/user/level", h.GetUserLevel)
			auth.GET("/user/experience-logs", h.GetExperienceLogs)
			auth.POST("/checkin", h.CheckIn)
		}
	}
}

// MembershipErrorResponse 会员模块错误响应
type MembershipErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// MemberLevelListResponse 会员等级列表响应
type MemberLevelListResponse struct {
	Code int           `json:"code"`
	Data []LevelDetail `json:"data"`
}

// LevelDetail 等级详情
type LevelDetail struct {
	ID          uint64 `json:"id"`
	Name        string `json:"name"`
	MinPoints   int    `json:"min_points"`
	Discount    int    `json:"discount"`
	Description string `json:"description"`
}

// UserLevelResponse 用户等级响应
type UserLevelResponse struct {
	Code int `json:"code"`
	Data struct {
		CurrentLevel   *LevelDetail `json:"current_level"`
		TotalPoints    int          `json:"total_points"`
		Experience     int          `json:"experience"`
		CurrentLevelID uint64       `json:"current_levelId"`
		NextLevel      *LevelDetail `json:"next_level,omitempty"`
		PointsToNext   int          `json:"points_to_next,omitempty"`
	} `json:"data"`
}

// LevelRightsResponse 等级权益响应
type LevelRightsResponse struct {
	Code int         `json:"code"`
	Data LevelDetail `json:"data"`
}

// ExperienceLogsResponse 经验值日志响应
type ExperienceLogsResponse struct {
	Code int `json:"code"`
	Data struct {
		List     []ExperienceLog `json:"list"`
		Total    int64           `json:"total"`
		Page     int             `json:"page"`
		PageSize int             `json:"page_size"`
	} `json:"data"`
}

// ExperienceLog 经验值日志
type ExperienceLog struct {
	ID          uint64 `json:"id"`
	UserID      uint64 `json:"user_id"`
	Points      int    `json:"points"`
	Type        string `json:"type"`
	Description string `json:"description"`
	CreatedAt   string `json:"created_at"`
}

// MembershipCheckInResponse 会员签到响应
type MembershipCheckInResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    struct {
		Points int `json:"points"`
	} `json:"data"`
}
