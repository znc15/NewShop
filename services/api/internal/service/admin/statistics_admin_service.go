package admin

import (
	"context"
	"fmt"
	"time"

	"newshop/api/internal/repository"

	"go.uber.org/zap"
)

// StatisticsAdminService 数据统计管理服务
type StatisticsAdminService struct {
	repo   *repository.StatisticsRepo
	logger *zap.Logger
}

// NewStatisticsAdminService 创建数据统计管理服务
func NewStatisticsAdminService(repo *repository.StatisticsRepo, logger *zap.Logger) *StatisticsAdminService {
	return &StatisticsAdminService{
		repo:   repo,
		logger: logger,
	}
}

// OverviewData 总览数据
type OverviewData struct {
	TodaySales      float64 `json:"today_sales"`
	TodayOrders     int64   `json:"today_orders"`
	TodayUsers      int64   `json:"today_users"`
	TotalProducts   int64   `json:"total_products"`
	TotalUsers      int64   `json:"total_users"`
	PendingOrders   int64   `json:"pending_orders"`
	YesterdaySales  float64 `json:"-"`
	YesterdayOrders int64   `json:"-"`
	YesterdayUsers  int64   `json:"-"`
}

// GetOverview 获取总览数据
func (s *StatisticsAdminService) GetOverview(ctx context.Context) (*OverviewData, error) {
	// 获取今日数据
	today := time.Now()
	todayStart := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location())
	todayEnd := todayStart.Add(24*time.Hour - time.Second)

	// 获取昨日数据
	yesterdayStart := todayStart.AddDate(0, 0, -1)
	yesterdayEnd := todayEnd.AddDate(0, 0, -1)

	overview := &OverviewData{}

	// 今日销售额
	todaySales, err := s.repo.GetSalesAmount(ctx, todayStart, todayEnd)
	if err != nil {
		s.logger.Error("获取今日销售额失败", zap.Error(err))
	} else {
		overview.TodaySales = todaySales
	}

	// 今日订单数
	todayOrders, err := s.repo.GetOrderCount(ctx, todayStart, todayEnd, "")
	if err != nil {
		s.logger.Error("获取今日订单数失败", zap.Error(err))
	} else {
		overview.TodayOrders = todayOrders
	}

	// 今日新增用户
	todayUsers, err := s.repo.GetNewUserCount(ctx, todayStart, todayEnd)
	if err != nil {
		s.logger.Error("获取今日新增用户失败", zap.Error(err))
	} else {
		overview.TodayUsers = todayUsers
	}

	// 昨日销售额
	yesterdaySales, err := s.repo.GetSalesAmount(ctx, yesterdayStart, yesterdayEnd)
	if err != nil {
		s.logger.Error("获取昨日销售额失败", zap.Error(err))
	} else {
		overview.YesterdaySales = yesterdaySales
	}

	// 昨日订单数
	yesterdayOrders, err := s.repo.GetOrderCount(ctx, yesterdayStart, yesterdayEnd, "")
	if err != nil {
		s.logger.Error("获取昨日订单数失败", zap.Error(err))
	} else {
		overview.YesterdayOrders = yesterdayOrders
	}

	// 昨日新增用户
	yesterdayUsers, err := s.repo.GetNewUserCount(ctx, yesterdayStart, yesterdayEnd)
	if err != nil {
		s.logger.Error("获取昨日新增用户失败", zap.Error(err))
	} else {
		overview.YesterdayUsers = yesterdayUsers
	}

	// 商品总数
	totalProducts, err := s.repo.GetProductCount(ctx, "")
	if err != nil {
		s.logger.Error("获取商品总数失败", zap.Error(err))
	} else {
		overview.TotalProducts = totalProducts
	}

	// 用户总数
	totalUsers, err := s.repo.GetTotalUserCount(ctx)
	if err != nil {
		s.logger.Error("获取用户总数失败", zap.Error(err))
	} else {
		overview.TotalUsers = totalUsers
	}

	// 待处理订单数
	pendingOrders, err := s.repo.GetOrderCount(ctx, todayStart.AddDate(0, 0, -30), todayEnd, "pending")
	if err != nil {
		s.logger.Error("获取待处理订单数失败", zap.Error(err))
	} else {
		overview.PendingOrders = pendingOrders
	}

	return overview, nil
}

// SalesStatistics 销售统计数据
type SalesStatistics struct {
	TotalSales   float64                    `json:"total_sales"`
	TotalOrders  int64                      `json:"total_orders"`
	AverageOrder float64                    `json:"average_order"`
	RefundAmount float64                    `json:"refund_amount"`
	RefundCount  int64                      `json:"refund_count"`
	Details      []repository.SalesDetail   `json:"details"`
}

// GetSalesStatistics 获取销售统计
func (s *StatisticsAdminService) GetSalesStatistics(ctx context.Context, startDate, endDate time.Time, statType string) (*SalesStatistics, error) {
	stats := &SalesStatistics{}

	// 总销售额
	totalSales, err := s.repo.GetSalesAmount(ctx, startDate, endDate)
	if err != nil {
		s.logger.Error("获取总销售额失败", zap.Error(err))
		return nil, err
	}
	stats.TotalSales = totalSales

	// 总订单数
	totalOrders, err := s.repo.GetOrderCount(ctx, startDate, endDate, "")
	if err != nil {
		s.logger.Error("获取总订单数失败", zap.Error(err))
		return nil, err
	}
	stats.TotalOrders = totalOrders

	// 平均客单价
	if totalOrders > 0 {
		stats.AverageOrder = totalSales / float64(totalOrders)
	}

	// 退款统计
	refundAmount, refundCount, err := s.repo.GetRefundStats(ctx, startDate, endDate)
	if err != nil {
		s.logger.Error("获取退款统计失败", zap.Error(err))
	} else {
		stats.RefundAmount = refundAmount
		stats.RefundCount = refundCount
	}

	// 获取详细数据
	details, err := s.repo.GetSalesDetails(ctx, startDate, endDate, statType)
	if err != nil {
		s.logger.Error("获取销售明细失败", zap.Error(err))
	} else {
		stats.Details = details
	}

	return stats, nil
}

// UserStatistics 用户统计数据
type UserStatistics struct {
	TotalUsers  int64                   `json:"total_users"`
	NewUsers    int64                   `json:"new_users"`
	ActiveUsers int64                   `json:"active_users"`
	MemberUsers int64                   `json:"member_users"`
	Details     []repository.UserDetail `json:"details"`
}

// GetUserStatistics 获取用户统计
func (s *StatisticsAdminService) GetUserStatistics(ctx context.Context, startDate, endDate time.Time) (*UserStatistics, error) {
	stats := &UserStatistics{}

	// 总用户数
	totalUsers, err := s.repo.GetTotalUserCount(ctx)
	if err != nil {
		s.logger.Error("获取总用户数失败", zap.Error(err))
		return nil, err
	}
	stats.TotalUsers = totalUsers

	// 新增用户数
	newUsers, err := s.repo.GetNewUserCount(ctx, startDate, endDate)
	if err != nil {
		s.logger.Error("获取新增用户数失败", zap.Error(err))
		return nil, err
	}
	stats.NewUsers = newUsers

	// 活跃用户数
	activeUsers, err := s.repo.GetActiveUserCount(ctx, startDate, endDate)
	if err != nil {
		s.logger.Error("获取活跃用户数失败", zap.Error(err))
	} else {
		stats.ActiveUsers = activeUsers
	}

	// 会员用户数
	memberUsers, err := s.repo.GetMemberUserCount(ctx)
	if err != nil {
		s.logger.Error("获取会员用户数失败", zap.Error(err))
	} else {
		stats.MemberUsers = memberUsers
	}

	// 获取详细数据
	details, err := s.repo.GetUserDetails(ctx, startDate, endDate)
	if err != nil {
		s.logger.Error("获取用户明细失败", zap.Error(err))
	} else {
		stats.Details = details
	}

	return stats, nil
}

// ProductStatistics 商品统计数据
type ProductStatistics struct {
	TotalProducts    int64                    `json:"total_products"`
	OnSaleProducts   int64                    `json:"on_sale_products"`
	OffSaleProducts  int64                    `json:"off_sale_products"`
	LowStockProducts int64                    `json:"low_stock_products"`
	TopSales         []repository.ProductSales `json:"top_sales"`
	TopAmount        []repository.ProductSales `json:"top_amount"`
}

// GetProductStatistics 获取商品统计
func (s *StatisticsAdminService) GetProductStatistics(ctx context.Context, startDate, endDate time.Time, limit int, sortBy string) (*ProductStatistics, error) {
	stats := &ProductStatistics{}

	// 商品总数
	totalProducts, err := s.repo.GetProductCount(ctx, "")
	if err != nil {
		s.logger.Error("获取商品总数失败", zap.Error(err))
		return nil, err
	}
	stats.TotalProducts = totalProducts

	// 在售商品数
	onSaleProducts, err := s.repo.GetProductCount(ctx, "active")
	if err != nil {
		s.logger.Error("获取在售商品数失败", zap.Error(err))
	} else {
		stats.OnSaleProducts = onSaleProducts
	}

	// 下架商品数
	offSaleProducts, err := s.repo.GetProductCount(ctx, "inactive")
	if err != nil {
		s.logger.Error("获取下架商品数失败", zap.Error(err))
	} else {
		stats.OffSaleProducts = offSaleProducts
	}

	// 库存预警商品数
	lowStockProducts, err := s.repo.GetLowStockProductCount(ctx, 10)
	if err != nil {
		s.logger.Error("获取库存预警商品数失败", zap.Error(err))
	} else {
		stats.LowStockProducts = lowStockProducts
	}

	// 销量排行
	topSales, err := s.repo.GetTopSalesProducts(ctx, startDate, endDate, limit, "sales")
	if err != nil {
		s.logger.Error("获取销量排行失败", zap.Error(err))
	} else {
		stats.TopSales = topSales
	}

	// 销售额排行
	topAmount, err := s.repo.GetTopSalesProducts(ctx, startDate, endDate, limit, "amount")
	if err != nil {
		s.logger.Error("获取销售额排行失败", zap.Error(err))
	} else {
		stats.TopAmount = topAmount
	}

	return stats, nil
}

// TrendData 趋势数据
type TrendData struct {
	Labels []string               `json:"labels"`
	Data   []repository.TrendItem `json:"data"`
}

// GetTrendData 获取趋势数据
func (s *StatisticsAdminService) GetTrendData(ctx context.Context, startDate, endDate time.Time, dataType string) (*TrendData, error) {
	var data []repository.TrendItem
	var err error

	switch dataType {
	case "sales":
		data, err = s.repo.GetSalesTrend(ctx, startDate, endDate)
	case "users":
		data, err = s.repo.GetUserTrend(ctx, startDate, endDate)
	case "orders":
		data, err = s.repo.GetOrderTrend(ctx, startDate, endDate)
	default:
		data, err = s.repo.GetSalesTrend(ctx, startDate, endDate)
	}

	if err != nil {
		s.logger.Error("获取趋势数据失败", zap.Error(err), zap.String("type", dataType))
		return nil, fmt.Errorf("获取趋势数据失败: %w", err)
	}

	// 生成标签
	labels := make([]string, len(data))
	for i, item := range data {
		labels[i] = item.Date
	}

	return &TrendData{
		Labels: labels,
		Data:   data,
	}, nil
}
