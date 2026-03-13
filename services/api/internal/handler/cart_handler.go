package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type CartHandler struct {
	cartService *service.CartService
	logger      *zap.Logger
}

func NewCartHandler(cartService *service.CartService, logger *zap.Logger) *CartHandler {
	return &CartHandler{
		cartService: cartService,
		logger:      logger,
	}
}

// AddItemRequest 添加商品请求
type AddItemRequest struct {
	ProductID uint64 `json:"product_id" binding:"required"`
	SkuID     uint64 `json:"sku_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
}

// UpdateQuantityRequest 更新数量请求
type UpdateQuantityRequest struct {
	Quantity int `json:"quantity" binding:"required,min=1"`
}

// UpdateSelectedRequest 更新选中状态请求
type UpdateSelectedRequest struct {
	Selected bool `json:"selected"`
}

// BatchRemoveRequest 批量删除请求
type BatchRemoveRequest struct {
	IDs []uint64 `json:"ids" binding:"required"`
}

// GetCart 获取购物车
// GET /cart
func (h *CartHandler) GetCart(c *gin.Context) {
	userID := c.GetUint64("user_id")

	items, err := h.cartService.GetCart(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("获取购物车失败", zap.Uint64("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取购物车失败"})
		return
	}

	// 获取商品总数
	count, _ := h.cartService.GetCartItemCount(c.Request.Context(), userID)

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"items": items,
			"count": count,
		},
	})
}

// AddItem 添加商品到购物车
// POST /cart
func (h *CartHandler) AddItem(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req AddItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	item, err := h.cartService.AddItem(c.Request.Context(), userID, req.ProductID, req.SkuID, req.Quantity)
	if err != nil {
		if err == service.ErrInvalidQuantity {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "商品数量无效"})
			return
		}
		h.logger.Error("添加购物车失败", zap.Uint64("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "添加购物车失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code":    0,
		"message": "添加成功",
		"data":    item,
	})
}

// UpdateQuantity 更新购物车商品数量
// PUT /cart/:id
func (h *CartHandler) UpdateQuantity(c *gin.Context) {
	userID := c.GetUint64("user_id")

	// 解析购物车项 ID
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的购物车项ID"})
		return
	}

	var req UpdateQuantityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	if err := h.cartService.UpdateQuantity(c.Request.Context(), id, userID, req.Quantity); err != nil {
		if err == service.ErrInvalidQuantity {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "商品数量无效"})
			return
		}
		if err == service.ErrCartItemNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "购物车商品不存在"})
			return
		}
		h.logger.Error("更新数量失败", zap.Uint64("user_id", userID), zap.Uint64("item_id", id), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新数量失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "更新成功",
	})
}

// UpdateSelected 更新购物车商品选中状态
// PUT /cart/:id/selected
func (h *CartHandler) UpdateSelected(c *gin.Context) {
	userID := c.GetUint64("user_id")

	// 解析购物车项 ID
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的购物车项ID"})
		return
	}

	var req UpdateSelectedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误"})
		return
	}

	if err := h.cartService.UpdateSelected(c.Request.Context(), id, userID, req.Selected); err != nil {
		if err == service.ErrCartItemNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "购物车商品不存在"})
			return
		}
		h.logger.Error("更新选中状态失败", zap.Uint64("user_id", userID), zap.Uint64("item_id", id), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新选中状态失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "更新成功",
	})
}

// RemoveItem 删除购物车商品
// DELETE /cart/:id
func (h *CartHandler) RemoveItem(c *gin.Context) {
	userID := c.GetUint64("user_id")

	// 解析购物车项 ID
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的购物车项ID"})
		return
	}

	if err := h.cartService.RemoveItem(c.Request.Context(), id, userID); err != nil {
		if err == service.ErrCartItemNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "购物车商品不存在"})
			return
		}
		h.logger.Error("删除购物车商品失败", zap.Uint64("user_id", userID), zap.Uint64("item_id", id), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

// ClearCart 清空购物车
// DELETE /cart
func (h *CartHandler) ClearCart(c *gin.Context) {
	userID := c.GetUint64("user_id")

	if err := h.cartService.ClearCart(c.Request.Context(), userID); err != nil {
		h.logger.Error("清空购物车失败", zap.Uint64("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "清空购物车失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "购物车已清空",
	})
}

// BatchRemove 批量删除购物车商品
// POST /cart/batch-remove
func (h *CartHandler) BatchRemove(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var req BatchRemoveRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误"})
		return
	}

	if err := h.cartService.BatchRemove(c.Request.Context(), userID, req.IDs); err != nil {
		h.logger.Error("批量删除购物车商品失败", zap.Uint64("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "批量删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "批量删除成功",
	})
}

// GetSelectedItems 获取选中的购物车商品
// GET /cart/selected
func (h *CartHandler) GetSelectedItems(c *gin.Context) {
	userID := c.GetUint64("user_id")

	items, err := h.cartService.GetSelectedItems(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("获取选中商品失败", zap.Uint64("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取选中商品失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"items": items,
		},
	})
}

// RegisterCartRoutes 注册购物车路由
func RegisterCartRoutes(r *gin.RouterGroup, h *CartHandler, authMiddleware gin.HandlerFunc) {
	cart := r.Group("/cart")
	cart.Use(authMiddleware)
	{
		cart.GET("", h.GetCart)                     // 获取购物车
		cart.POST("", h.AddItem)                    // 添加商品
		cart.PUT("/:id", h.UpdateQuantity)          // 更新数量
		cart.PUT("/:id/selected", h.UpdateSelected) // 更新选中状态
		cart.DELETE("/:id", h.RemoveItem)           // 删除商品
		cart.DELETE("", h.ClearCart)                // 清空购物车
		cart.POST("/batch-remove", h.BatchRemove)   // 批量删除
		cart.GET("/selected", h.GetSelectedItems)   // 获取选中商品
	}
}
