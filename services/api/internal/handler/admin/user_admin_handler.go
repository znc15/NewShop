package admin

import (
	"net/http"
	"strconv"

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

// List 获取用户列表
// GET /api/admin/users
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

	// 清除敏感信息
	userList := make([]gin.H, 0, len(result.Users))
	for _, u := range result.Users {
		userList = append(userList, gin.H{
			"id":           u.ID,
			"email":        u.Email,
			"phone":        u.Phone,
			"nickname":     u.Nickname,
			"avatar":       u.Avatar,
			"member_level": u.MemberLevel,
			"points":       u.Points,
			"status":       u.Status,
			"created_at":   u.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"users":     userList,
			"total":     result.Total,
			"page":      result.Page,
			"page_size": result.PageSize,
		},
	})
}

// Get 获取用户详情
// GET /api/admin/users/:id
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
// PUT /api/admin/users/:id
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
// DELETE /api/admin/users/:id
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
// GET /api/admin/users/stats
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
