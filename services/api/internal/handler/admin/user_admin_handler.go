package admin

import (
	"net/http"
	"strconv"
	"strings"

	"newshop/api/internal/service/admin"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// UserAdminHandler 用户管理处理器
type UserAdminHandler struct {
	userAdminSvc *admin.UserAdminService
	logger       *zap.Logger
}

// NewUserAdminHandler 创建用户管理处理器
func NewUserAdminHandler(userAdminSvc *admin.UserAdminService, logger *zap.Logger) *UserAdminHandler {
	return &UserAdminHandler{
		userAdminSvc: userAdminSvc,
		logger:       logger,
	}
}

// ========== 响应结构体定义 ==========

// UserListItem 用户列表项
type UserListItem struct {
	ID          uint64 `json:"id"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Username    string `json:"username"`
	Nickname    string `json:"nickname"`
	Avatar      string `json:"avatar"`
	MemberLevel int    `json:"member_level"`
	Level       int    `json:"level"`
	Points      int    `json:"points"`
	OrderCount  int    `json:"order_count"`
	TotalSpent  int64  `json:"total_spent"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// UserListResponse 用户列表响应
type UserListResponse struct {
	Items      []UserListItem `json:"items"`
	Users      []UserListItem `json:"users,omitempty"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	PageSize   int            `json:"page_size"`
	TotalPages int            `json:"total_pages"`
}

// UserDetailResponse 用户详情响应
type UserDetailResponse struct {
	ID          uint64 `json:"id"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Nickname    string `json:"nickname"`
	Avatar      string `json:"avatar"`
	MemberLevel int    `json:"member_level"`
	Points      int    `json:"points"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// UserStatsResponse 用户统计响应
type UserStatsResponse struct {
	TotalUsers     int64 `json:"total_users"`
	ActiveUsers    int64 `json:"active_users"`
	InactiveUsers  int64 `json:"inactive_users"`
	TodayNewUsers  int64 `json:"today_new_users"`
	MonthNewUsers  int64 `json:"month_new_users"`
	VipUsers       int64 `json:"vip_users"`
	TotalPoints    int64 `json:"total_points"`
	AvgMemberLevel int   `json:"avg_member_level"`
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Nickname    string `json:"nickname"`
	Phone       string `json:"phone"`
	Avatar      string `json:"avatar"`
	Status      string `json:"status"`
	MemberLevel int    `json:"member_level"`
	Points      int    `json:"points"`
}

// ========== API 方法 ==========

// List 获取用户列表
// @Summary 获取用户列表
// @Description 管理后台获取用户列表，支持按关键词、状态筛选，支持分页
// @Tags 管理后台-用户
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(20)
// @Param keyword query string false "搜索关键词（邮箱/昵称/手机号）"
// @Param status query string false "用户状态 (active/inactive/banned)"
// @Success 200 {object} map[string]interface{} "code=0 表示成功，data 包含 users、total、page、page_size"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/users [get]
func (h *UserAdminHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	keyword := c.Query("keyword")
	status := c.Query("status")

	result, err := h.userAdminSvc.GetUsers(c.Request.Context(), page, pageSize, keyword, status)
	if err != nil {
		h.logger.Error("获取用户列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取用户列表失败",
		})
		return
	}

	userList := make([]UserListItem, 0, len(result.Users))
	for _, u := range result.Users {
		username := strings.SplitN(u.Email, "@", 2)[0]
		userList = append(userList, UserListItem{
			ID:          u.ID,
			Email:       u.Email,
			Phone:       u.Phone,
			Username:    username,
			Nickname:    u.Nickname,
			Avatar:      u.Avatar,
			MemberLevel: u.MemberLevel,
			Level:       u.MemberLevel,
			Points:      u.Points,
			OrderCount:  0,
			TotalSpent:  0,
			Status:      u.Status,
			CreatedAt:   u.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:   u.UpdatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	totalPages := (result.Total + int64(result.PageSize) - 1) / int64(result.PageSize)
	if totalPages == 0 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": UserListResponse{
			Items:      userList,
			Users:      userList,
			Total:      result.Total,
			Page:       result.Page,
			PageSize:   result.PageSize,
			TotalPages: int(totalPages),
		},
	})
}

// Get 获取用户详情
// @Summary 获取用户详情
// @Description 管理后台根据用户ID获取用户详细信息
// @Tags 管理后台-用户
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Success 200 {object} map[string]interface{} "code=0 表示成功，data 包含用户详细信息"
// @Failure 400 {object} map[string]interface{} "无效的用户ID"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 404 {object} map[string]interface{} "用户不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/users/{id} [get]
func (h *UserAdminHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的用户ID",
		})
		return
	}

	user, err := h.userAdminSvc.GetUser(c.Request.Context(), id)
	if err != nil {
		if err == admin.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "用户不存在",
			})
			return
		}
		h.logger.Error("获取用户详情失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取用户详情失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"id":           user.ID,
			"email":        user.Email,
			"phone":        user.Phone,
			"nickname":     user.Nickname,
			"avatar":       user.Avatar,
			"member_level": user.MemberLevel,
			"points":       user.Points,
			"status":       user.Status,
			"created_at":   user.CreatedAt.Format("2006-01-02 15:04:05"),
			"updated_at":   user.UpdatedAt.Format("2006-01-02 15:04:05"),
		},
	})
}

// Update 更新用户信息
// @Summary 更新用户信息
// @Description 管理后台更新用户信息，包括昵称、手机号、头像、状态、会员等级、积分等
// @Tags 管理后台-用户
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Param request body UpdateUserRequest true "更新用户请求"
// @Success 200 {object} map[string]interface{} "code=0 表示更新成功"
// @Failure 400 {object} map[string]interface{} "参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 404 {object} map[string]interface{} "用户不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/users/{id} [put]
func (h *UserAdminHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的用户ID",
		})
		return
	}

	var req struct {
		Nickname    string `json:"nickname"`
		Phone       string `json:"phone"`
		Avatar      string `json:"avatar"`
		Status      string `json:"status"`
		MemberLevel int    `json:"member_level"`
		Points      int    `json:"points"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40002,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	updateReq := &admin.UpdateUserRequest{
		Nickname:    req.Nickname,
		Phone:       req.Phone,
		Avatar:      req.Avatar,
		Status:      req.Status,
		MemberLevel: req.MemberLevel,
		Points:      req.Points,
	}

	err = h.userAdminSvc.UpdateUser(c.Request.Context(), id, updateReq)
	if err != nil {
		if err == admin.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "用户不存在",
			})
			return
		}
		h.logger.Error("更新用户信息失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "更新用户信息失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "更新成功",
	})
}

// Delete 删除用户
// @Summary 删除用户
// @Description 管理后台删除指定用户（软删除）
// @Tags 管理后台-用户
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param id path int true "用户ID"
// @Success 200 {object} map[string]interface{} "code=0 表示删除成功"
// @Failure 400 {object} map[string]interface{} "无效的用户ID"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 404 {object} map[string]interface{} "用户不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/users/{id} [delete]
func (h *UserAdminHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "无效的用户ID",
		})
		return
	}

	err = h.userAdminSvc.DeleteUser(c.Request.Context(), id)
	if err != nil {
		if err == admin.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    40400,
				"message": "用户不存在",
			})
			return
		}
		h.logger.Error("删除用户失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "删除用户失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

// Stats 获取用户统计
// @Summary 获取用户统计
// @Description 管理后台获取用户统计数据，包括总用户数、活跃用户、今日新增、会员统计等
// @Tags 管理后台-用户
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "code=0 表示成功，data 包含统计数据"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/admin/users/stats [get]
func (h *UserAdminHandler) Stats(c *gin.Context) {
	stats, err := h.userAdminSvc.GetUserStats(c.Request.Context())
	if err != nil {
		h.logger.Error("获取用户统计失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取用户统计失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": stats,
	})
}
