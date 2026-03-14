package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type AddressHandler struct {
	addressService *service.AddressService
	logger         *zap.Logger
}

func NewAddressHandler(addressService *service.AddressService, logger *zap.Logger) *AddressHandler {
	return &AddressHandler{
		addressService: addressService,
		logger:         logger,
	}
}

// ListAddresses 获取地址列表
// GET /user/addresses
func (h *AddressHandler) ListAddresses(c *gin.Context) {
	userID := c.GetUint64("user_id")

	addresses, err := h.addressService.ListAddresses(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("获取地址列表失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取地址列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"addresses": addresses,
		},
	})
}

// GetAddress 获取单个地址
// GET /user/addresses/:id
func (h *AddressHandler) GetAddress(c *gin.Context) {
	userID := c.GetUint64("user_id")

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的地址ID"})
		return
	}

	address, err := h.addressService.GetAddressByID(c.Request.Context(), id, userID)
	if err != nil {
		if err == service.ErrAddressNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "地址不存在"})
			return
		}
		h.logger.Error("获取地址失败", zap.Error(err), zap.Uint64("address_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取地址失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": address,
	})
}

// CreateAddress 创建地址
// POST /user/addresses
func (h *AddressHandler) CreateAddress(c *gin.Context) {
	userID := c.GetUint64("user_id")

	var input service.CreateAddressInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	address, err := h.addressService.CreateAddress(c.Request.Context(), userID, input)
	if err != nil {
		if err == service.ErrAddressLimit {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "地址数量已达上限（最多20个）"})
			return
		}
		h.logger.Error("创建地址失败", zap.Error(err), zap.Uint64("user_id", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "创建地址失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 0,
		"data": address,
	})
}

// UpdateAddress 更新地址
// PUT /user/addresses/:id
func (h *AddressHandler) UpdateAddress(c *gin.Context) {
	userID := c.GetUint64("user_id")

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的地址ID"})
		return
	}

	var input service.UpdateAddressInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	address, err := h.addressService.UpdateAddress(c.Request.Context(), id, userID, input)
	if err != nil {
		if err == service.ErrAddressNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "地址不存在"})
			return
		}
		h.logger.Error("更新地址失败", zap.Error(err), zap.Uint64("address_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新地址失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": address,
	})
}

// DeleteAddress 删除地址
// DELETE /user/addresses/:id
func (h *AddressHandler) DeleteAddress(c *gin.Context) {
	userID := c.GetUint64("user_id")

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的地址ID"})
		return
	}

	if err := h.addressService.DeleteAddress(c.Request.Context(), id, userID); err != nil {
		if err == service.ErrAddressNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "地址不存在"})
			return
		}
		h.logger.Error("删除地址失败", zap.Error(err), zap.Uint64("address_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "删除地址失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

// SetDefaultAddress 设置默认地址
// PUT /user/addresses/:id/default
func (h *AddressHandler) SetDefaultAddress(c *gin.Context) {
	userID := c.GetUint64("user_id")

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的地址ID"})
		return
	}

	if err := h.addressService.SetDefaultAddress(c.Request.Context(), id, userID); err != nil {
		if err == service.ErrAddressNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "地址不存在"})
			return
		}
		h.logger.Error("设置默认地址失败", zap.Error(err), zap.Uint64("address_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "设置默认地址失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "设置成功",
	})
}
