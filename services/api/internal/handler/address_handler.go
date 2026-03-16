package handler

import (
	"net/http"
	"strconv"

	"newshop/api/internal/service"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Response 通用响应结构
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// AddressResponse 地址响应结构
type AddressResponse struct {
	ID        uint64 `json:"id"`
	UserID    uint64 `json:"user_id"`
	Name      string `json:"name"`
	Phone     string `json:"phone"`
	Province  string `json:"province"`
	City      string `json:"city"`
	District  string `json:"district"`
	Address   string `json:"address"`
	IsDefault bool   `json:"is_default"`
}

// AddressListResponse 地址列表响应
type AddressListResponse struct {
	Addresses []AddressResponse `json:"addresses"`
}

// AddressCreateRequest 创建地址请求
type AddressCreateRequest struct {
	Name      string `json:"name" binding:"required" example:"张三"`
	Phone     string `json:"phone" binding:"required" example:"13800138000"`
	Province  string `json:"province" binding:"required" example:"浙江省"`
	City      string `json:"city" binding:"required" example:"杭州市"`
	District  string `json:"district" binding:"required" example:"西湖区"`
	Address   string `json:"address" binding:"required" example:"文三路123号"`
	IsDefault bool   `json:"is_default" example:"false"`
}

// AddressUpdateRequest 更新地址请求
type AddressUpdateRequest struct {
	Name      *string `json:"name" example:"张三"`
	Phone     *string `json:"phone" example:"13800138000"`
	Province  *string `json:"province" example:"浙江省"`
	City      *string `json:"city" example:"杭州市"`
	District  *string `json:"district" example:"西湖区"`
	Address   *string `json:"address" example:"文三路123号"`
	IsDefault *bool   `json:"is_default" example:"false"`
}

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
// @Summary 获取地址列表
// @Description 获取当前用户的所有收货地址
// @Tags 地址
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} Response{data=AddressListResponse} "成功"
// @Failure 401 {object} Response "未授权"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/v1/user/addresses [get]
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
// @Summary 获取单个地址
// @Description 根据ID获取地址详情
// @Tags 地址
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "地址ID"
// @Success 200 {object} Response{data=AddressResponse} "成功"
// @Failure 400 {object} Response "无效的地址ID"
// @Failure 401 {object} Response "未授权"
// @Failure 404 {object} Response "地址不存在"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/v1/user/addresses/{id} [get]
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
// @Summary 创建地址
// @Description 创建新的收货地址，每个用户最多20个地址
// @Tags 地址
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param request body AddressCreateRequest true "地址信息"
// @Success 201 {object} Response{data=AddressResponse} "创建成功"
// @Failure 400 {object} Response "请求参数错误或地址数量已达上限"
// @Failure 401 {object} Response "未授权"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/v1/user/addresses [post]
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
// @Summary 更新地址
// @Description 更新指定地址的信息
// @Tags 地址
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "地址ID"
// @Param request body AddressUpdateRequest true "地址更新信息"
// @Success 200 {object} Response{data=AddressResponse} "更新成功"
// @Failure 400 {object} Response "请求参数错误"
// @Failure 401 {object} Response "未授权"
// @Failure 404 {object} Response "地址不存在"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/v1/user/addresses/{id} [put]
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
// @Summary 删除地址
// @Description 删除指定的收货地址
// @Tags 地址
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "地址ID"
// @Success 200 {object} Response "删除成功"
// @Failure 400 {object} Response "无效的地址ID"
// @Failure 401 {object} Response "未授权"
// @Failure 404 {object} Response "地址不存在"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/v1/user/addresses/{id} [delete]
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
// @Summary 设置默认地址
// @Description 将指定地址设为默认收货地址
// @Tags 地址
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path int true "地址ID"
// @Success 200 {object} Response "设置成功"
// @Failure 400 {object} Response "无效的地址ID"
// @Failure 401 {object} Response "未授权"
// @Failure 404 {object} Response "地址不存在"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/v1/user/addresses/{id}/default [put]
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
