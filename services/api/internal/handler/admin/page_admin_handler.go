package admin

import (
	"net/http"
	"strconv"
	"strings"

	pkgerrors "newshop/api/internal/pkg/errors"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type PageAdminHandler struct {
	pageService *service.PageService
	logger      *zap.Logger
}

type CreatePageRequest struct {
	Slug      string `json:"slug" binding:"required,max=100"`
	Title     string `json:"title" binding:"required,max=200"`
	Content   string `json:"content"`
	MetaTitle string `json:"meta_title" binding:"max=200"`
	MetaDesc  string `json:"meta_desc" binding:"max=500"`
	Status    int    `json:"status"`
	SortOrder int    `json:"sort_order"`
}

type UpdatePageRequest struct {
	Slug      *string `json:"slug" binding:"omitempty,max=100"`
	Title     *string `json:"title" binding:"omitempty,max=200"`
	Content   *string `json:"content"`
	MetaTitle *string `json:"meta_title" binding:"omitempty,max=200"`
	MetaDesc  *string `json:"meta_desc" binding:"omitempty,max=500"`
	Status    *int    `json:"status"`
	SortOrder *int    `json:"sort_order"`
}

func NewPageAdminHandler(pageService *service.PageService, logger *zap.Logger) *PageAdminHandler {
	return &PageAdminHandler{pageService: pageService, logger: logger}
}

func (h *PageAdminHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	keyword := c.Query("keyword")

	var status *int
	if statusStr, ok := c.GetQuery("status"); ok {
		parsed, err := strconv.Atoi(statusStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    pkgerrors.ErrBadRequest.Code,
				"message": "状态参数错误",
			})
			return
		}
		status = &parsed
	}

	result, err := h.pageService.ListPages(c.Request.Context(), page, pageSize, keyword, status)
	if err != nil {
		if err == service.ErrInvalidPageStatus {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    pkgerrors.ErrPageStatusInvalid.Code,
				"message": pkgerrors.ErrPageStatusInvalid.Message,
			})
			return
		}
		h.logger.Error("获取页面列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    pkgerrors.ErrInternalServer.Code,
			"message": "获取页面列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": pkgerrors.ErrSuccess.Code,
		"data": gin.H{
			"pages":     result.Pages,
			"total":     result.Total,
			"page":      result.Page,
			"page_size": result.PageSize,
		},
	})
}

func (h *PageAdminHandler) Get(c *gin.Context) {
	id, ok := parsePageID(c)
	if !ok {
		return
	}

	page, err := h.pageService.GetPageByID(c.Request.Context(), id)
	if err != nil {
		if err == service.ErrPageNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    pkgerrors.ErrPageNotFound.Code,
				"message": pkgerrors.ErrPageNotFound.Message,
			})
			return
		}
		h.logger.Error("获取页面详情失败", zap.Error(err), zap.Uint("page_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    pkgerrors.ErrInternalServer.Code,
			"message": "获取页面详情失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": pkgerrors.ErrSuccess.Code,
		"data": page,
	})
}

func (h *PageAdminHandler) Create(c *gin.Context) {
	var req CreatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    pkgerrors.ErrBadRequest.Code,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	page, err := h.pageService.CreatePage(c.Request.Context(), service.CreatePageInput{
		Slug:      req.Slug,
		Title:     req.Title,
		Content:   req.Content,
		MetaTitle: req.MetaTitle,
		MetaDesc:  req.MetaDesc,
		Status:    req.Status,
		SortOrder: req.SortOrder,
	})
	if err != nil {
		h.handleWriteError(c, err, "创建页面失败")
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code":    pkgerrors.ErrSuccess.Code,
		"message": "创建成功",
		"data":    page,
	})
}

func (h *PageAdminHandler) Update(c *gin.Context) {
	id, ok := parsePageID(c)
	if !ok {
		return
	}

	var req UpdatePageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    pkgerrors.ErrBadRequest.Code,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	page, err := h.pageService.UpdatePage(c.Request.Context(), id, service.UpdatePageInput{
		Slug:      req.Slug,
		Title:     req.Title,
		Content:   req.Content,
		MetaTitle: req.MetaTitle,
		MetaDesc:  req.MetaDesc,
		Status:    req.Status,
		SortOrder: req.SortOrder,
	})
	if err != nil {
		h.handleWriteError(c, err, "更新页面失败")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    pkgerrors.ErrSuccess.Code,
		"message": "更新成功",
		"data":    page,
	})
}

func (h *PageAdminHandler) Delete(c *gin.Context) {
	id, ok := parsePageID(c)
	if !ok {
		return
	}

	err := h.pageService.DeletePage(c.Request.Context(), id)
	if err != nil {
		if err == service.ErrPageNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    pkgerrors.ErrPageNotFound.Code,
				"message": pkgerrors.ErrPageNotFound.Message,
			})
			return
		}
		h.logger.Error("删除页面失败", zap.Error(err), zap.Uint("page_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    pkgerrors.ErrInternalServer.Code,
			"message": "删除页面失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    pkgerrors.ErrSuccess.Code,
		"message": "删除成功",
	})
}

func (h *PageAdminHandler) handleWriteError(c *gin.Context, err error, fallbackMessage string) {
	switch err {
	case service.ErrPageNotFound:
		c.JSON(http.StatusNotFound, gin.H{
			"code":    pkgerrors.ErrPageNotFound.Code,
			"message": pkgerrors.ErrPageNotFound.Message,
		})
	case service.ErrPageSlugExists:
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    pkgerrors.ErrPageSlugExists.Code,
			"message": pkgerrors.ErrPageSlugExists.Message,
		})
	case service.ErrInvalidPageStatus:
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    pkgerrors.ErrPageStatusInvalid.Code,
			"message": pkgerrors.ErrPageStatusInvalid.Message,
		})
	case service.ErrInvalidPageInput:
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    pkgerrors.ErrBadRequest.Code,
			"message": "页面标识和标题不能为空",
		})
	default:
		h.logger.Error(fallbackMessage, zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    pkgerrors.ErrInternalServer.Code,
			"message": fallbackMessage,
		})
	}
}

func parsePageID(c *gin.Context) (uint, bool) {
	idStr := strings.TrimSpace(c.Param("id"))
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    pkgerrors.ErrBadRequest.Code,
			"message": "无效的页面ID",
		})
		return 0, false
	}
	return uint(id), true
}
