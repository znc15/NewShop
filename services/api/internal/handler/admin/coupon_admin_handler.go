package admin

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"newshop/api/internal/model"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// CouponAdminHandler 优惠券管理后台 Handler
type CouponAdminHandler struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewCouponAdminHandler 创建优惠券管理 Handler
func NewCouponAdminHandler(db *gorm.DB, logger *zap.Logger) *CouponAdminHandler {
	return &CouponAdminHandler{db: db, logger: logger}
}

// CouponListRequest 优惠券列表请求
type CouponListRequest struct {
	Keyword  string `form:"keyword"`
	Status   string `form:"status"`
	Page     int    `form:"page"`
	PageSize int    `form:"page_size"`
}

// CouponPayload 优惠券创建/更新请求
type CouponPayload struct {
	Code        string   `json:"code"`
	Name        string   `json:"name" binding:"required,max=100"`
	Type        string   `json:"type" binding:"required,oneof=fixed percent"`
	Value       float64  `json:"value" binding:"required,gt=0"`
	MinAmount   float64  `json:"min_amount"`
	MaxDiscount *float64 `json:"max_discount"`
	TotalCount  int      `json:"total_count" binding:"required,gte=0"`
	StartTime   string   `json:"start_time" binding:"required"`
	EndTime     string   `json:"end_time" binding:"required"`
	Status      string   `json:"status" binding:"omitempty,oneof=active inactive expired"`
}

type couponAdminItem struct {
	ID          uint64   `json:"id"`
	Code        string   `json:"code"`
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Value       float64  `json:"value"`
	MinAmount   float64  `json:"min_amount"`
	MaxDiscount *float64 `json:"max_discount"`
	TotalCount  int      `json:"total_count"`
	UsedCount   int      `json:"used_count"`
	StartTime   string   `json:"start_time"`
	EndTime     string   `json:"end_time"`
	Status      string   `json:"status"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}

// List 获取优惠券列表
func (h *CouponAdminHandler) List(c *gin.Context) {
	var req CouponListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 || req.PageSize > 100 {
		req.PageSize = 20
	}

	now := time.Now()
	query := h.db.Model(&model.Coupon{})

	keyword := strings.TrimSpace(req.Keyword)
	if keyword != "" {
		like := "%" + keyword + "%"
		if id, ok := parseCouponCodeID(keyword); ok {
			query = query.Where(h.db.Where("name ILIKE ?", like).Or("id = ?", id))
		} else {
			query = query.Where("name ILIKE ?", like)
		}
	}

	switch req.Status {
	case "active":
		query = query.Where("status = ? AND end_time > ?", model.CouponStatusActive, now)
	case "inactive":
		query = query.Where("status = ?", model.CouponStatusNotStarted)
	case "expired":
		query = query.Where("status = ? OR end_time <= ?", model.CouponStatusEnded, now)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		h.logger.Error("统计优惠券数量失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取优惠券列表失败"})
		return
	}

	var coupons []model.Coupon
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&coupons).Error; err != nil {
		h.logger.Error("查询优惠券列表失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取优惠券列表失败"})
		return
	}

	items := make([]couponAdminItem, 0, len(coupons))
	for _, coupon := range coupons {
		items = append(items, toCouponAdminItem(coupon, now))
	}

	totalPages := 1
	if req.PageSize > 0 {
		totalPages = int((total + int64(req.PageSize) - 1) / int64(req.PageSize))
		if totalPages == 0 {
			totalPages = 1
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"items":       items,
			"list":        items,
			"total":       total,
			"page":        req.Page,
			"page_size":   req.PageSize,
			"total_pages": totalPages,
		},
	})
}

// Get 获取优惠券详情
func (h *CouponAdminHandler) Get(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}

	var coupon model.Coupon
	if err := h.db.First(&coupon, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "优惠券不存在"})
			return
		}
		h.logger.Error("获取优惠券详情失败", zap.Error(err), zap.Uint64("coupon_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取优惠券详情失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": toCouponAdminItem(coupon, time.Now())})
}

// Create 创建优惠券
func (h *CouponAdminHandler) Create(c *gin.Context) {
	var req CouponPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	startTime, err := parseCouponTime(req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "开始时间格式错误"})
		return
	}
	endTime, err := parseCouponTime(req.EndTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "结束时间格式错误"})
		return
	}
	if !endTime.After(startTime) {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40004, "message": "结束时间必须晚于开始时间"})
		return
	}

	coupon := model.Coupon{
		Name:       req.Name,
		MinAmount:  req.MinAmount,
		TotalCount: req.TotalCount,
		UsedCount:  0,
		PerLimit:   1,
		StartTime:  startTime,
		EndTime:    endTime,
		Status:     mapAdminStatusToCouponStatus(req.Status, startTime, endTime),
	}
	applyCouponValue(&coupon, req.Type, req.Value)

	if err := h.db.Create(&coupon).Error; err != nil {
		h.logger.Error("创建优惠券失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "创建优惠券失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"code": 0, "data": toCouponAdminItem(coupon, time.Now())})
}

// Update 更新优惠券
func (h *CouponAdminHandler) Update(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}

	var req CouponPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	startTime, err := parseCouponTime(req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "开始时间格式错误"})
		return
	}
	endTime, err := parseCouponTime(req.EndTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "结束时间格式错误"})
		return
	}
	if !endTime.After(startTime) {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40004, "message": "结束时间必须晚于开始时间"})
		return
	}

	var coupon model.Coupon
	if err := h.db.First(&coupon, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "优惠券不存在"})
			return
		}
		h.logger.Error("查询优惠券失败", zap.Error(err), zap.Uint64("coupon_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新优惠券失败"})
		return
	}

	coupon.Name = req.Name
	coupon.MinAmount = req.MinAmount
	coupon.TotalCount = req.TotalCount
	coupon.StartTime = startTime
	coupon.EndTime = endTime
	coupon.Status = mapAdminStatusToCouponStatus(req.Status, startTime, endTime)
	applyCouponValue(&coupon, req.Type, req.Value)

	if err := h.db.Save(&coupon).Error; err != nil {
		h.logger.Error("更新优惠券失败", zap.Error(err), zap.Uint64("coupon_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新优惠券失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "更新成功", "data": toCouponAdminItem(coupon, time.Now())})
}

// Delete 删除优惠券
func (h *CouponAdminHandler) Delete(c *gin.Context) {
	id, ok := parseIDParam(c)
	if !ok {
		return
	}

	if err := h.db.Delete(&model.Coupon{}, id).Error; err != nil {
		h.logger.Error("删除优惠券失败", zap.Error(err), zap.Uint64("coupon_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "删除优惠券失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "删除成功"})
}

func toCouponAdminItem(coupon model.Coupon, now time.Time) couponAdminItem {
	typeLabel := "fixed"
	value := coupon.Amount
	var maxDiscount *float64

	if coupon.Type == model.CouponTypePercent {
		typeLabel = "percent"
		value = coupon.Discount
		if value <= 1 {
			value = value * 100
		}
		maxDiscount = nil
	}

	status := "inactive"
	if now.After(coupon.EndTime) || coupon.Status == model.CouponStatusEnded {
		status = "expired"
	} else if coupon.Status == model.CouponStatusActive {
		status = "active"
	}

	return couponAdminItem{
		ID:          coupon.ID,
		Code:        formatCouponCode(coupon.ID),
		Name:        coupon.Name,
		Type:        typeLabel,
		Value:       value,
		MinAmount:   coupon.MinAmount,
		MaxDiscount: maxDiscount,
		TotalCount:  coupon.TotalCount,
		UsedCount:   coupon.UsedCount,
		StartTime:   coupon.StartTime.Format(time.RFC3339),
		EndTime:     coupon.EndTime.Format(time.RFC3339),
		Status:      status,
		CreatedAt:   coupon.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   coupon.UpdatedAt.Format(time.RFC3339),
	}
}

func applyCouponValue(coupon *model.Coupon, couponType string, value float64) {
	if couponType == "percent" {
		coupon.Type = model.CouponTypePercent
		discount := value
		if discount > 1 {
			discount = discount / 100
		}
		coupon.Discount = discount
		coupon.Amount = 0
		return
	}

	coupon.Type = model.CouponTypeFixed
	coupon.Amount = value
	coupon.Discount = 0
}

func mapAdminStatusToCouponStatus(status string, startTime, endTime time.Time) int {
	now := time.Now()
	switch status {
	case "active":
		return model.CouponStatusActive
	case "expired":
		return model.CouponStatusEnded
	case "inactive":
		return model.CouponStatusNotStarted
	default:
		if now.After(endTime) {
			return model.CouponStatusEnded
		}
		if now.Before(startTime) {
			return model.CouponStatusNotStarted
		}
		return model.CouponStatusActive
	}
}

func parseCouponCodeID(keyword string) (uint64, bool) {
	upper := strings.ToUpper(strings.TrimSpace(keyword))
	if !strings.HasPrefix(upper, "CPN") {
		return 0, false
	}
	id, err := strconv.ParseUint(upper[3:], 10, 64)
	if err != nil {
		return 0, false
	}
	return id, true
}

func formatCouponCode(id uint64) string {
	return fmt.Sprintf("CPN%06d", id)
}

func parseIDParam(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的优惠券 ID"})
		return 0, false
	}
	return id, true
}

func parseCouponTime(value string) (time.Time, error) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}

	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("invalid time format: %s", value)
}
