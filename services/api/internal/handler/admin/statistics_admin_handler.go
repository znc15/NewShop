package admin

import (
	"net/http"
	"strconv"
	"time"

	"newshop/api/internal/service/admin"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Response 通用响应结构
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// StatisticsAdminHandler 数据统计管理 Handler
type StatisticsAdminHandler struct {
	service *admin.StatisticsAdminService
	logger  *zap.Logger
}

// NewStatisticsAdminHandler 创建数据统计管理 Handler
func NewStatisticsAdminHandler(service *admin.StatisticsAdminService, logger *zap.Logger) *StatisticsAdminHandler {
	return &StatisticsAdminHandler{
		service: service,
		logger:  logger,
	}
}

// OverviewResponse 总览数据响应
type OverviewResponse struct {
	TodaySales          float64 `json:"today_sales"`    // 今日销售额
	TodayOrders         int64   `json:"today_orders"`   // 今日订单数
	TodayUsers          int64   `json:"today_users"`    // 今日新增用户
	TotalProducts       int64   `json:"total_products"` // 商品总数
	TotalUsers          int64   `json:"total_users"`    // 用户总数
	PendingOrders       int64   `json:"pending_orders"` // 待处理订单
	ComparedToYesterday struct {
		Sales  float64 `json:"sales"`  // 销售额环比
		Orders float64 `json:"orders"` // 订单数环比
		Users  float64 `json:"users"`  // 用户数环比
	} `json:"compared_to_yesterday"`
}

// GetOverview 获取总览数据
// @Summary 获取总览数据
// @Description 获取今日销售额、订单数、用户数等总览数据，包含环比数据
// @Tags 管理后台-统计
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} Response{data=OverviewResponse} "成功"
// @Failure 401 {object} Response "未授权"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/admin/stats/overview [get]
func (h *StatisticsAdminHandler) GetOverview(c *gin.Context) {
	ctx := c.Request.Context()

	overview, err := h.service.GetOverview(ctx)
	if err != nil {
		h.logger.Error("获取总览数据失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取总览数据失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": overview,
	})
}

// SalesStatisticsRequest 销售统计请求
type SalesStatisticsRequest struct {
	StartDate string `form:"start_date" binding:"required"` // 开始日期 YYYY-MM-DD
	EndDate   string `form:"end_date" binding:"required"`   // 结束日期 YYYY-MM-DD
	Type      string `form:"type"`                          // 统计类型: day/week/month
}

// SalesStatisticsResponse 销售统计响应
type SalesStatisticsResponse struct {
	TotalSales   float64           `json:"total_sales"`   // 总销售额
	TotalOrders  int64             `json:"total_orders"`  // 总订单数
	AverageOrder float64           `json:"average_order"` // 平均客单价
	RefundAmount float64           `json:"refund_amount"` // 退款金额
	RefundCount  int64             `json:"refund_count"`  // 退款订单数
	Details      []SalesDetailItem `json:"details"`       // 详细数据
}

// SalesDetailItem 销售明细项
type SalesDetailItem struct {
	Date   string  `json:"date"`   // 日期
	Sales  float64 `json:"sales"`  // 销售额
	Orders int64   `json:"orders"` // 订单数
}

// GetSalesStatistics 获取销售统计
// @Summary 获取销售统计
// @Description 获取指定时间段内的销售统计数据，支持按天/周/月统计
// @Tags 管理后台-统计
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param start_date query string true "开始日期 (格式: YYYY-MM-DD)"
// @Param end_date query string true "结束日期 (格式: YYYY-MM-DD)"
// @Param type query string false "统计类型: day(按天)/week(按周)/month(按月)，默认day"
// @Success 200 {object} Response{data=SalesStatisticsResponse} "成功"
// @Failure 400 {object} Response "请求参数错误"
// @Failure 401 {object} Response "未授权"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/admin/stats/sales [get]
func (h *StatisticsAdminHandler) GetSalesStatistics(c *gin.Context) {
	var req SalesStatisticsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 解析日期
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40002,
			"message": "开始日期格式错误",
		})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40003,
			"message": "结束日期格式错误",
		})
		return
	}

	// 设置结束日期为当天的最后一秒
	endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	// 默认按天统计
	if req.Type == "" {
		req.Type = "day"
	}

	ctx := c.Request.Context()
	stats, err := h.service.GetSalesStatistics(ctx, startDate, endDate, req.Type)
	if err != nil {
		h.logger.Error("获取销售统计失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取销售统计失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": stats,
	})
}

// UserStatisticsRequest 用户统计请求
type UserStatisticsRequest struct {
	StartDate string `form:"start_date"` // 开始日期
	EndDate   string `form:"end_date"`   // 结束日期
}

// UserStatisticsResponse 用户统计响应
type UserStatisticsResponse struct {
	TotalUsers  int64            `json:"total_users"`  // 总用户数
	NewUsers    int64            `json:"new_users"`    // 新增用户数
	ActiveUsers int64            `json:"active_users"` // 活跃用户数
	MemberUsers int64            `json:"member_users"` // 会员用户数
	Details     []UserDetailItem `json:"details"`      // 详细数据
}

// UserDetailItem 用户明细项
type UserDetailItem struct {
	Date     string `json:"date"`      // 日期
	NewUsers int64  `json:"new_users"` // 新增用户
	Active   int64  `json:"active"`    // 活跃用户
}

// GetUserStatistics 获取用户统计
// @Summary 获取用户统计
// @Description 获取指定时间段内的用户统计数据，包括新增用户、活跃用户、会员用户等
// @Tags 管理后台-统计
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param start_date query string false "开始日期 (格式: YYYY-MM-DD)，默认最近30天"
// @Param end_date query string false "结束日期 (格式: YYYY-MM-DD)，默认今天"
// @Success 200 {object} Response{data=UserStatisticsResponse} "成功"
// @Failure 400 {object} Response "请求参数错误"
// @Failure 401 {object} Response "未授权"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/admin/stats/users [get]
func (h *StatisticsAdminHandler) GetUserStatistics(c *gin.Context) {
	var req UserStatisticsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	var startDate, endDate time.Time
	var err error

	// 默认最近30天
	if req.StartDate == "" || req.EndDate == "" {
		endDate = time.Now()
		startDate = endDate.AddDate(0, 0, -30)
	} else {
		startDate, err = time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "开始日期格式错误",
			})
			return
		}

		endDate, err = time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40003,
				"message": "结束日期格式错误",
			})
			return
		}
		endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	}

	ctx := c.Request.Context()
	stats, err := h.service.GetUserStatistics(ctx, startDate, endDate)
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

// ProductStatisticsRequest 商品统计请求
type ProductStatisticsRequest struct {
	StartDate string `form:"start_date"` // 开始日期
	EndDate   string `form:"end_date"`   // 结束日期
	Limit     int    `form:"limit"`      // 返回数量
	SortBy    string `form:"sort_by"`    // 排序字段: sales/amount
}

// ProductStatisticsResponse 商品统计响应
type ProductStatisticsResponse struct {
	TotalProducts    int64              `json:"total_products"`     // 商品总数
	OnSaleProducts   int64              `json:"on_sale_products"`   // 在售商品数
	OffSaleProducts  int64              `json:"off_sale_products"`  // 下架商品数
	LowStockProducts int64              `json:"low_stock_products"` // 库存预警商品
	TopSales         []ProductSalesItem `json:"top_sales"`          // 销量排行
	TopAmount        []ProductSalesItem `json:"top_amount"`         // 销售额排行
}

// ProductSalesItem 商品销售项
type ProductSalesItem struct {
	ProductID   uint64  `json:"product_id"`   // 商品ID
	ProductName string  `json:"product_name"` // 商品名称
	MainImage   string  `json:"main_image"`   // 主图
	SalesCount  int64   `json:"sales_count"`  // 销量
	SalesAmount float64 `json:"sales_amount"` // 销售额
}

// GetProductStatistics 获取商品统计
// @Summary 获取商品统计
// @Description 获取商品统计数据，包括商品总数、在售/下架数量、库存预警、销量排行和销售额排行
// @Tags 管理后台-统计
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param start_date query string false "开始日期 (格式: YYYY-MM-DD)，默认最近30天"
// @Param end_date query string false "结束日期 (格式: YYYY-MM-DD)，默认今天"
// @Param limit query int false "返回排行数量，默认10，最大100"
// @Param sort_by query string false "排序字段: sales(销量)/amount(销售额)，默认sales"
// @Success 200 {object} Response{data=ProductStatisticsResponse} "成功"
// @Failure 400 {object} Response "请求参数错误"
// @Failure 401 {object} Response "未授权"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/admin/stats/products [get]
func (h *StatisticsAdminHandler) GetProductStatistics(c *gin.Context) {
	var req ProductStatisticsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	var startDate, endDate time.Time
	var err error

	// 默认最近30天
	if req.StartDate == "" || req.EndDate == "" {
		endDate = time.Now()
		startDate = endDate.AddDate(0, 0, -30)
	} else {
		startDate, err = time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40002,
				"message": "开始日期格式错误",
			})
			return
		}

		endDate, err = time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    40003,
				"message": "结束日期格式错误",
			})
			return
		}
		endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	}

	// 默认返回10条
	if req.Limit <= 0 {
		req.Limit = 10
	}
	if req.Limit > 100 {
		req.Limit = 100
	}

	// 默认按销量排序
	if req.SortBy == "" {
		req.SortBy = "sales"
	}

	ctx := c.Request.Context()
	stats, err := h.service.GetProductStatistics(ctx, startDate, endDate, req.Limit, req.SortBy)
	if err != nil {
		h.logger.Error("获取商品统计失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取商品统计失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": stats,
	})
}

// TrendDataRequest 趋势数据请求
type TrendDataRequest struct {
	StartDate string `form:"start_date" binding:"required"` // 开始日期
	EndDate   string `form:"end_date" binding:"required"`   // 结束日期
	Type      string `form:"type"`                          // 数据类型: sales/users/orders
}

// TrendDataResponse 趋势数据响应
type TrendDataResponse struct {
	Labels []string     `json:"labels"` // X轴标签
	Data   []TrendValue `json:"data"`   // 数据点
}

// TrendValue 趋势值
type TrendValue struct {
	Date  string  `json:"date"`  // 日期
	Value float64 `json:"value"` // 数值
}

// GetTrendData 获取趋势数据
// @Summary 获取趋势数据
// @Description 获取指定时间段内的趋势图数据，支持销售趋势、用户趋势、订单趋势
// @Tags 管理后台-统计
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param start_date query string true "开始日期 (格式: YYYY-MM-DD)"
// @Param end_date query string true "结束日期 (格式: YYYY-MM-DD)"
// @Param type query string false "数据类型: sales(销售)/users(用户)/orders(订单)，默认sales"
// @Success 200 {object} Response{data=TrendDataResponse} "成功"
// @Failure 400 {object} Response "请求参数错误"
// @Failure 401 {object} Response "未授权"
// @Failure 500 {object} Response "服务器错误"
// @Router /api/admin/stats/trend [get]
func (h *StatisticsAdminHandler) GetTrendData(c *gin.Context) {
	var req TrendDataRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40001,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40002,
			"message": "开始日期格式错误",
		})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    40003,
			"message": "结束日期格式错误",
		})
		return
	}
	endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	// 默认销售趋势
	if req.Type == "" {
		req.Type = "sales"
	}

	ctx := c.Request.Context()
	trend, err := h.service.GetTrendData(ctx, startDate, endDate, req.Type)
	if err != nil {
		h.logger.Error("获取趋势数据失败", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    50000,
			"message": "获取趋势数据失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": trend,
	})
}

// RegisterStatisticsAdminRoutes 注册数据统计管理路由
func RegisterStatisticsAdminRoutes(r *gin.RouterGroup, handler *StatisticsAdminHandler) {
	stats := r.Group("/statistics")
	{
		stats.GET("/overview", handler.GetOverview)
		stats.GET("/sales", handler.GetSalesStatistics)
		stats.GET("/users", handler.GetUserStatistics)
		stats.GET("/products", handler.GetProductStatistics)
		stats.GET("/trend", handler.GetTrendData)
	}
}

// parsePageParams 解析分页参数
func parsePageParams(c *gin.Context) (page, pageSize int) {
	page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ = strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	return
}
