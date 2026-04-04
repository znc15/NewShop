package admin

import (
	"net/http"
	"strconv"
	"strings"

	"newshop/api/internal/model"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ReviewAdminHandler 商品评价管理后台 Handler
type ReviewAdminHandler struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewReviewAdminHandler 创建商品评价管理 Handler
func NewReviewAdminHandler(db *gorm.DB, logger *zap.Logger) *ReviewAdminHandler {
	return &ReviewAdminHandler{db: db, logger: logger}
}

// ReviewListRequest 评价列表请求
type ReviewListRequest struct {
	Keyword   string `form:"keyword"`
	Status    string `form:"status"`
	ProductID uint64 `form:"product_id"`
	Page      int    `form:"page"`
	PageSize  int    `form:"page_size"`
}

// ReviewPayload 评价创建请求
type ReviewPayload struct {
	ProductID uint64 `json:"product_id" binding:"required"`
	Author    string `json:"author" binding:"required,max=80"`
	Handle    string `json:"handle" binding:"max=120"`
	Avatar    string `json:"avatar" binding:"max=10"`
	Content   string `json:"content" binding:"required"`
	Rating    int    `json:"rating" binding:"required,min=1,max=5"`
	Sort      int    `json:"sort"`
	Status    string `json:"status" binding:"omitempty,oneof=active inactive"`
}

// UpdateReviewPayload 评价更新请求
type UpdateReviewPayload struct {
	ProductID *uint64 `json:"product_id"`
	Author    *string `json:"author" binding:"omitempty,max=80"`
	Handle    *string `json:"handle" binding:"omitempty,max=120"`
	Avatar    *string `json:"avatar" binding:"omitempty,max=10"`
	Content   *string `json:"content"`
	Rating    *int    `json:"rating" binding:"omitempty,min=1,max=5"`
	Sort      *int    `json:"sort"`
	Status    *string `json:"status" binding:"omitempty,oneof=active inactive"`
}

type reviewAdminItem struct {
	ID          uint64 `json:"id"`
	ProductID   uint64 `json:"product_id"`
	ProductName string `json:"product_name"`
	Author      string `json:"author"`
	Handle      string `json:"handle"`
	Avatar      string `json:"avatar"`
	Content     string `json:"content"`
	Rating      int    `json:"rating"`
	Sort        int    `json:"sort"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// List 获取商品评价列表
func (h *ReviewAdminHandler) List(c *gin.Context) {
	var req ReviewListRequest
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

	query := h.db.WithContext(c.Request.Context()).Model(&model.HomeReview{}).Where("product_id > 0")
	if req.ProductID > 0 {
		query = query.Where("product_id = ?", req.ProductID)
	}
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}
	keyword := strings.TrimSpace(req.Keyword)
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("author ILIKE ? OR handle ILIKE ? OR content ILIKE ?", like, like, like)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		h.logger.Error("统计商品评价失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取商品评价失败"})
		return
	}

	var reviews []model.HomeReview
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("sort ASC, id DESC").Offset(offset).Limit(req.PageSize).Find(&reviews).Error; err != nil {
		h.logger.Error("查询商品评价失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取商品评价失败"})
		return
	}

	productNameMap, err := h.getProductNameMap(c, reviews)
	if err != nil {
		h.logger.Error("查询商品名称失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取商品评价失败"})
		return
	}

	items := make([]reviewAdminItem, 0, len(reviews))
	for _, review := range reviews {
		items = append(items, buildReviewAdminItem(review, productNameMap[review.ProductID]))
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

// Get 获取商品评价详情
func (h *ReviewAdminHandler) Get(c *gin.Context) {
	id, ok := parseReviewID(c)
	if !ok {
		return
	}

	var review model.HomeReview
	if err := h.db.WithContext(c.Request.Context()).Where("id = ? AND product_id > 0", id).First(&review).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "评价不存在"})
			return
		}
		h.logger.Error("获取评价详情失败", zap.Error(err), zap.Uint64("review_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取评价详情失败"})
		return
	}

	productName, err := h.getProductNameByID(c, review.ProductID)
	if err != nil {
		h.logger.Error("获取评价商品失败", zap.Error(err), zap.Uint64("review_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "获取评价详情失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": buildReviewAdminItem(review, productName)})
}

// Create 创建商品评价
func (h *ReviewAdminHandler) Create(c *gin.Context) {
	var req ReviewPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	if req.ProductID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "商品ID不能为空"})
		return
	}
	if strings.TrimSpace(req.Author) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "作者不能为空"})
		return
	}
	if strings.TrimSpace(req.Content) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40004, "message": "评价内容不能为空"})
		return
	}

	productName, err := h.getProductNameByID(c, req.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40005, "message": "商品不存在"})
		return
	}

	status := req.Status
	if status == "" {
		status = model.HomeBannerStatusActive
	}

	review := model.HomeReview{
		ProductID: req.ProductID,
		Author:    strings.TrimSpace(req.Author),
		Handle:    strings.TrimSpace(req.Handle),
		Avatar:    strings.TrimSpace(req.Avatar),
		Content:   strings.TrimSpace(req.Content),
		Rating:    req.Rating,
		Sort:      req.Sort,
		Status:    status,
	}

	if err := h.db.WithContext(c.Request.Context()).Create(&review).Error; err != nil {
		h.logger.Error("创建评价失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "创建评价失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"code": 0, "data": buildReviewAdminItem(review, productName)})
}

// Update 更新商品评价
func (h *ReviewAdminHandler) Update(c *gin.Context) {
	id, ok := parseReviewID(c)
	if !ok {
		return
	}

	var req UpdateReviewPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "请求参数错误: " + err.Error()})
		return
	}

	var review model.HomeReview
	if err := h.db.WithContext(c.Request.Context()).Where("id = ? AND product_id > 0", id).First(&review).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"code": 40400, "message": "评价不存在"})
			return
		}
		h.logger.Error("查询评价失败", zap.Error(err), zap.Uint64("review_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新评价失败"})
		return
	}

	if req.ProductID != nil {
		if *req.ProductID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40002, "message": "商品ID不能为空"})
			return
		}
		if _, err := h.getProductNameByID(c, *req.ProductID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40003, "message": "商品不存在"})
			return
		}
		review.ProductID = *req.ProductID
	}
	if req.Author != nil {
		author := strings.TrimSpace(*req.Author)
		if author == "" {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40004, "message": "作者不能为空"})
			return
		}
		review.Author = author
	}
	if req.Handle != nil {
		review.Handle = strings.TrimSpace(*req.Handle)
	}
	if req.Avatar != nil {
		review.Avatar = strings.TrimSpace(*req.Avatar)
	}
	if req.Content != nil {
		content := strings.TrimSpace(*req.Content)
		if content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"code": 40005, "message": "评价内容不能为空"})
			return
		}
		review.Content = content
	}
	if req.Rating != nil {
		review.Rating = *req.Rating
	}
	if req.Sort != nil {
		review.Sort = *req.Sort
	}
	if req.Status != nil {
		review.Status = *req.Status
	}

	if err := h.db.WithContext(c.Request.Context()).Save(&review).Error; err != nil {
		h.logger.Error("更新评价失败", zap.Error(err), zap.Uint64("review_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新评价失败"})
		return
	}

	productName, err := h.getProductNameByID(c, review.ProductID)
	if err != nil {
		h.logger.Error("获取评价商品失败", zap.Error(err), zap.Uint64("review_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "更新评价失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "更新成功", "data": buildReviewAdminItem(review, productName)})
}

// Delete 删除商品评价
func (h *ReviewAdminHandler) Delete(c *gin.Context) {
	id, ok := parseReviewID(c)
	if !ok {
		return
	}

	if err := h.db.WithContext(c.Request.Context()).Where("id = ? AND product_id > 0", id).Delete(&model.HomeReview{}).Error; err != nil {
		h.logger.Error("删除评价失败", zap.Error(err), zap.Uint64("review_id", id))
		c.JSON(http.StatusInternalServerError, gin.H{"code": 50000, "message": "删除评价失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "删除成功"})
}

func parseReviewID(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": 40001, "message": "无效的评价ID"})
		return 0, false
	}
	return id, true
}

func buildReviewAdminItem(review model.HomeReview, productName string) reviewAdminItem {
	return reviewAdminItem{
		ID:          review.ID,
		ProductID:   review.ProductID,
		ProductName: productName,
		Author:      review.Author,
		Handle:      review.Handle,
		Avatar:      review.Avatar,
		Content:     review.Content,
		Rating:      review.Rating,
		Sort:        review.Sort,
		Status:      review.Status,
		CreatedAt:   review.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:   review.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

func (h *ReviewAdminHandler) getProductNameByID(c *gin.Context, productID uint64) (string, error) {
	var product model.Product
	if err := h.db.WithContext(c.Request.Context()).Select("id", "name").First(&product, productID).Error; err != nil {
		return "", err
	}
	return product.Name, nil
}

func (h *ReviewAdminHandler) getProductNameMap(c *gin.Context, reviews []model.HomeReview) (map[uint64]string, error) {
	result := make(map[uint64]string)
	ids := make([]uint64, 0)
	seen := make(map[uint64]struct{})

	for _, review := range reviews {
		if review.ProductID == 0 {
			continue
		}
		if _, ok := seen[review.ProductID]; ok {
			continue
		}
		seen[review.ProductID] = struct{}{}
		ids = append(ids, review.ProductID)
	}

	if len(ids) == 0 {
		return result, nil
	}

	var products []model.Product
	if err := h.db.WithContext(c.Request.Context()).Select("id", "name").Where("id IN ?", ids).Find(&products).Error; err != nil {
		return nil, err
	}

	for _, product := range products {
		result[product.ID] = product.Name
	}

	return result, nil
}
