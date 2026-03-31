package handler

import (
	"net/http"
	"strings"

	pkgerrors "newshop/api/internal/pkg/errors"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type PageHandler struct {
	pageService *service.PageService
	logger      *zap.Logger
}

func NewPageHandler(pageService *service.PageService, logger *zap.Logger) *PageHandler {
	return &PageHandler{pageService: pageService, logger: logger}
}

func (h *PageHandler) GetPageBySlug(c *gin.Context) {
	slug := strings.TrimSpace(c.Param("slug"))
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    pkgerrors.ErrBadRequest.Code,
			"message": pkgerrors.ErrBadRequest.Message,
		})
		return
	}

	page, err := h.pageService.GetPublishedPageBySlug(c.Request.Context(), slug)
	if err != nil {
		if err == service.ErrPageNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code":    pkgerrors.ErrPageNotFound.Code,
				"message": pkgerrors.ErrPageNotFound.Message,
			})
			return
		}
		h.logger.Error("获取页面详情失败", zap.Error(err), zap.String("slug", slug))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    pkgerrors.ErrInternalServer.Code,
			"message": pkgerrors.ErrInternalServer.Message,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": pkgerrors.ErrSuccess.Code,
		"data": page,
	})
}
