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
