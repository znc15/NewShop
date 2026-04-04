package handler

import (
	"net/http"
	"strconv"
	"strings"

	pkgerrors "newshop/api/internal/pkg/errors"
	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type HomePageHandler struct {
	homePageService *service.HomePageService
	logger          *zap.Logger
}

type subscribeRequest struct {
	Email string `json:"email"`
}

func NewHomePageHandler(homePageService *service.HomePageService, logger *zap.Logger) *HomePageHandler {
	return &HomePageHandler{homePageService: homePageService, logger: logger}
}

func (h *HomePageHandler) GetBanners(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "3"))
	banners, err := h.homePageService.ListBanners(c.Request.Context(), limit)
	if err != nil {
		h.logger.Error("获取首页展示位失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    pkgerrors.ErrInternalServer.Code,
			"message": pkgerrors.ErrInternalServer.Message,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": pkgerrors.ErrSuccess.Code,
		"data": gin.H{
			"banners": banners,
		},
	})
}

func (h *HomePageHandler) GetFeaturedReviews(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "3"))
	reviews, err := h.homePageService.ListReviews(c.Request.Context(), limit)
	if err != nil {
		h.logger.Error("获取首页评价失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    pkgerrors.ErrInternalServer.Code,
			"message": pkgerrors.ErrInternalServer.Message,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": pkgerrors.ErrSuccess.Code,
		"data": gin.H{
			"reviews": reviews,
		},
	})
}

func (h *HomePageHandler) GetProductReviews(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || productID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    pkgerrors.ErrBadRequest.Code,
			"message": "无效的商品ID",
		})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	reviews, err := h.homePageService.ListProductReviews(c.Request.Context(), productID, limit)
	if err != nil {
		h.logger.Error("获取商品评价失败", zap.Error(err), zap.Uint64("product_id", productID))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    pkgerrors.ErrInternalServer.Code,
			"message": pkgerrors.ErrInternalServer.Message,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": pkgerrors.ErrSuccess.Code,
		"data": gin.H{
			"reviews": reviews,
		},
	})
}

func (h *HomePageHandler) Subscribe(c *gin.Context) {
	var req subscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    pkgerrors.ErrBadRequest.Code,
			"message": "请求参数错误",
		})
		return
	}

	subscription, alreadySubscribed, err := h.homePageService.Subscribe(c.Request.Context(), strings.TrimSpace(req.Email))
	if err != nil {
		if err == service.ErrInvalidSubscriptionEmail {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    pkgerrors.ErrBadRequest.Code,
				"message": err.Error(),
			})
			return
		}

		h.logger.Error("首页订阅失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    pkgerrors.ErrInternalServer.Code,
			"message": pkgerrors.ErrInternalServer.Message,
		})
		return
	}

	message := "订阅成功"
	if alreadySubscribed {
		message = "你已订阅过，我们会继续为你推送新品消息"
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    pkgerrors.ErrSuccess.Code,
		"message": message,
		"data": gin.H{
			"subscription": subscription,
			"already":      alreadySubscribed,
		},
	})
}
