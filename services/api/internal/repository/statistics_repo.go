package repository

import (
	"context"
	"fmt"
	"time"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

// StatisticsRepo 数据统计仓库
type StatisticsRepo struct {
	db *gorm.DB
}

// NewStatisticsRepo 创建数据统计仓库
func NewStatisticsRepo(db *gorm.DB) *StatisticsRepo {
	return &StatisticsRepo{db: db}
}

// GetSalesAmount 获取销售额
func (r *StatisticsRepo) GetSalesAmount(ctx context.Context, startDate, endDate time.Time) (float64, error) {
	var result struct {
		Total float64
	}

	err := r.db.WithContext(ctx).
		Model(&model.Order{}).
		Where("status IN ?", []string{"paid", "shipped", "completed"}).
		Where("created_at >= ? AND created_at <= ?", startDate, endDate).
		Select("COALESCE(SUM(pay_amount), 0) as total").
		Scan(&result).Error

	return result.Total, err
}

// GetOrderCount 获取订单数量
func (r *StatisticsRepo) GetOrderCount(ctx context.Context, startDate, endDate time.Time, status string) (int64, error) {
	var count int64

	query := r.db.WithContext(ctx).
		Model(&model.Order{}).
		Where("created_at >= ? AND created_at <= ?", startDate, endDate)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	err := query.Count(&count).Error
	return count, err
}

// GetNewUserCount 获取新增用户数量
func (r *StatisticsRepo) GetNewUserCount(ctx context.Context, startDate, endDate time.Time) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("created_at >= ? AND created_at <= ?", startDate, endDate).
		Count(&count).Error

	return count, err
}

// GetTotalUserCount 获取总用户数量
func (r *StatisticsRepo) GetTotalUserCount(ctx context.Context) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&model.User{}).
		Count(&count).Error

	return count, err
}

// GetProductCount 获取商品数量
func (r *StatisticsRepo) GetProductCount(ctx context.Context, status string) (int64, error) {
	var count int64

	query := r.db.WithContext(ctx).Model(&model.Product{})

	if status != "" {
		query = query.Where("status = ?", status)
	}

	err := query.Count(&count).Error
	return count, err
}

// GetRefundStats 获取退款统计
func (r *StatisticsRepo) GetRefundStats(ctx context.Context, startDate, endDate time.Time) (float64, int64, error) {
	var result struct {
		TotalAmount float64
		Count       int64
	}

	err := r.db.WithContext(ctx).
		Model(&model.Order{}).
		Where("status = ?", "refunded").
		Where("updated_at >= ? AND updated_at <= ?", startDate, endDate).
		Select("COALESCE(SUM(pay_amount), 0) as total_amount, COUNT(*) as count").
		Scan(&result).Error

	return result.TotalAmount, result.Count, err
}

// SalesDetail 销售明细
type SalesDetail struct {
	Date   string
	Sales  float64
	Orders int64
}

// SalesDetailRow 销售明细行
type SalesDetailRow struct {
	Date   string
	Sales  float64
	Orders int64
}

// GetSalesDetails 获取销售明细
func (r *StatisticsRepo) GetSalesDetails(ctx context.Context, startDate, endDate time.Time, statType string) ([]SalesDetail, error) {
	var rows []struct {
		Date  time.Time
		Sales float64
		Count int64
	}

	var groupFormat string
	switch statType {
	case "week":
		groupFormat = "DATE_TRUNC('week', created_at)"
	case "month":
		groupFormat = "DATE_TRUNC('month', created_at)"
	default:
		groupFormat = "DATE(created_at)"
	}

	query := fmt.Sprintf(`
		SELECT %s as date, COALESCE(SUM(pay_amount), 0) as sales, COUNT(*) as count
		FROM orders
		WHERE status IN ('paid', 'shipped', 'completed')
		AND created_at >= ? AND created_at <= ?
		GROUP BY %s
		ORDER BY date ASC
	`, groupFormat, groupFormat)

	err := r.db.WithContext(ctx).Raw(query, startDate, endDate).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	details := make([]SalesDetail, len(rows))
	for i, row := range rows {
		dateStr := row.Date.Format("2006-01-02")
		if statType == "week" {
			dateStr = row.Date.Format("2006-01-02") + " ~ " + row.Date.AddDate(0, 0, 6).Format("2006-01-02")
		} else if statType == "month" {
			dateStr = row.Date.Format("2006-01")
		}
		details[i] = SalesDetail{
			Date:   dateStr,
			Sales:  row.Sales,
			Orders: row.Count,
		}
	}

	return details, nil
}

// GetActiveUserCount 获取活跃用户数量
func (r *StatisticsRepo) GetActiveUserCount(ctx context.Context, startDate, endDate time.Time) (int64, error) {
	var count int64

	// 活跃用户定义为在指定时间段内有下单的用户
	err := r.db.WithContext(ctx).
		Model(&model.Order{}).
		Where("created_at >= ? AND created_at <= ?", startDate, endDate).
		Distinct("user_id").
		Count(&count).Error

	return count, err
}

// GetMemberUserCount 获取会员用户数量
func (r *StatisticsRepo) GetMemberUserCount(ctx context.Context) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("member_level > ?", 1).
		Count(&count).Error

	return count, err
}

// UserDetail 用户明细
type UserDetail struct {
	Date     string
	NewUsers int64
	Active   int64
}

// GetUserDetails 获取用户明细
func (r *StatisticsRepo) GetUserDetails(ctx context.Context, startDate, endDate time.Time) ([]UserDetail, error) {
	var newUsers []struct {
		Date  time.Time
		Count int64
	}

	// 按天统计新增用户
	err := r.db.WithContext(ctx).
		Model(&model.User{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ?", startDate, endDate).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&newUsers).Error
	if err != nil {
		return nil, err
	}

	// 获取活跃用户（有下单的用户）
	var activeUsers []struct {
		Date  time.Time
		Count int64
	}

	err = r.db.WithContext(ctx).
		Model(&model.Order{}).
		Select("DATE(created_at) as date, COUNT(DISTINCT user_id) as count").
		Where("created_at >= ? AND created_at <= ?", startDate, endDate).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&activeUsers).Error
	if err != nil {
		return nil, err
	}

	// 合并数据
	activeMap := make(map[string]int64)
	for _, au := range activeUsers {
		activeMap[au.Date.Format("2006-01-02")] = au.Count
	}

	details := make([]UserDetail, len(newUsers))
	for i, nu := range newUsers {
		dateStr := nu.Date.Format("2006-01-02")
		details[i] = UserDetail{
			Date:     dateStr,
			NewUsers: nu.Count,
			Active:   activeMap[dateStr],
		}
	}

	return details, nil
}

// GetLowStockProductCount 获取库存预警商品数量
func (r *StatisticsRepo) GetLowStockProductCount(ctx context.Context, threshold int) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("status = ? AND stock <= ?", "active", threshold).
		Count(&count).Error

	return count, err
}

// ProductSales 商品销售数据
type ProductSales struct {
	ProductID   uint64
	ProductName string
	MainImage   string
	SalesCount  int64
	SalesAmount float64
}

// GetTopSalesProducts 获取销量排行商品
func (r *StatisticsRepo) GetTopSalesProducts(ctx context.Context, startDate, endDate time.Time, limit int, sortBy string) ([]ProductSales, error) {
	var results []struct {
		ProductID   uint64
		ProductName string
		MainImage   string
		SalesCount  int64
		SalesAmount float64
	}

	orderClause := "sales_count DESC"
	if sortBy == "amount" {
		orderClause = "sales_amount DESC"
	}

	query := `
		SELECT
			oi.product_id,
			oi.product_name,
			p.main_image,
			SUM(oi.quantity) as sales_count,
			SUM(oi.total_amount) as sales_amount
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		LEFT JOIN products p ON oi.product_id = p.id
		WHERE o.status IN ('paid', 'shipped', 'completed')
		AND o.created_at >= ? AND o.created_at <= ?
		GROUP BY oi.product_id, oi.product_name, p.main_image
		ORDER BY ` + orderClause + `
		LIMIT ?
	`

	err := r.db.WithContext(ctx).Raw(query, startDate, endDate, limit).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	sales := make([]ProductSales, len(results))
	for i, r := range results {
		sales[i] = ProductSales{
			ProductID:   r.ProductID,
			ProductName: r.ProductName,
			MainImage:   r.MainImage,
			SalesCount:  r.SalesCount,
			SalesAmount: r.SalesAmount,
		}
	}

	return sales, nil
}

// TrendItem 趋势项
type TrendItem struct {
	Date  string
	Value float64
}

// TrendRow 趋势行
type TrendRow struct {
	Date  time.Time
	Value float64
}

// GetSalesTrend 获取销售趋势
func (r *StatisticsRepo) GetSalesTrend(ctx context.Context, startDate, endDate time.Time) ([]TrendItem, error) {
	var rows []TrendRow

	query := `
		SELECT DATE(created_at) as date, COALESCE(SUM(pay_amount), 0) as value
		FROM orders
		WHERE status IN ('paid', 'shipped', 'completed')
		AND created_at >= ? AND created_at <= ?
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`

	err := r.db.WithContext(ctx).Raw(query, startDate, endDate).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return fillTrendGaps(rows, startDate, endDate), nil
}

// GetUserTrend 获取用户趋势
func (r *StatisticsRepo) GetUserTrend(ctx context.Context, startDate, endDate time.Time) ([]TrendItem, error) {
	var rows []TrendRow

	query := `
		SELECT DATE(created_at) as date, COUNT(*) as value
		FROM users
		WHERE created_at >= ? AND created_at <= ?
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`

	err := r.db.WithContext(ctx).Raw(query, startDate, endDate).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return fillTrendGaps(rows, startDate, endDate), nil
}

// GetOrderTrend 获取订单趋势
func (r *StatisticsRepo) GetOrderTrend(ctx context.Context, startDate, endDate time.Time) ([]TrendItem, error) {
	var rows []TrendRow

	query := `
		SELECT DATE(created_at) as date, COUNT(*) as value
		FROM orders
		WHERE status IN ('paid', 'shipped', 'completed')
		AND created_at >= ? AND created_at <= ?
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`

	err := r.db.WithContext(ctx).Raw(query, startDate, endDate).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return fillTrendGaps(rows, startDate, endDate), nil
}

// fillTrendGaps 填充趋势数据中的空缺日期
func fillTrendGaps(rows []TrendRow, startDate, endDate time.Time) []TrendItem {
	// 创建日期到值的映射
	dataMap := make(map[string]float64)
	for _, row := range rows {
		dataMap[row.Date.Format("2006-01-02")] = row.Value
	}

	// 生成完整的日期序列
	var result []TrendItem
	current := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	end := time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 0, 0, 0, 0, endDate.Location())

	for current.Before(end) || current.Equal(end) {
		dateStr := current.Format("2006-01-02")
		value := dataMap[dateStr] // 如果没有数据，默认为0
		result = append(result, TrendItem{
			Date:  dateStr,
			Value: value,
		})
		current = current.AddDate(0, 0, 1)
	}

	return result
}
