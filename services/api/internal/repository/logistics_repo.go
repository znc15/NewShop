package repository

import (
	"context"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

// LogisticsRepo 物流仓库
type LogisticsRepo struct {
	db *gorm.DB
}

// NewLogisticsRepo 创建物流仓库实例
func NewLogisticsRepo(db *gorm.DB) *LogisticsRepo {
	return &LogisticsRepo{db: db}
}

// CreateCompany 创建物流公司
func (r *LogisticsRepo) CreateCompany(ctx context.Context, company *model.LogisticsCompany) error {
	return r.db.WithContext(ctx).Create(company).Error
}

// GetCompanyByID 根据ID获取物流公司
func (r *LogisticsRepo) GetCompanyByID(ctx context.Context, id uint64) (*model.LogisticsCompany, error) {
	var company model.LogisticsCompany
	err := r.db.WithContext(ctx).First(&company, id).Error
	return &company, err
}

// GetCompanyByCode 根据编码获取物流公司
func (r *LogisticsRepo) GetCompanyByCode(ctx context.Context, code string) (*model.LogisticsCompany, error) {
	var company model.LogisticsCompany
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&company).Error
	return &company, err
}

// ListCompanies 获取物流公司列表
func (r *LogisticsRepo) ListCompanies(ctx context.Context, status string) ([]model.LogisticsCompany, error) {
	var companies []model.LogisticsCompany
	query := r.db.WithContext(ctx).Model(&model.LogisticsCompany{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	err := query.Order("sort_order ASC, id ASC").Find(&companies).Error
	return companies, err
}

// UpdateCompany 更新物流公司
func (r *LogisticsRepo) UpdateCompany(ctx context.Context, company *model.LogisticsCompany) error {
	return r.db.WithContext(ctx).Save(company).Error
}

// DeleteCompany 删除物流公司（软删除）
func (r *LogisticsRepo) DeleteCompany(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.LogisticsCompany{}, id).Error
}

// Create 创建订单物流
func (r *LogisticsRepo) Create(ctx context.Context, logistics *model.OrderLogistics) error {
	return r.db.WithContext(ctx).Create(logistics).Error
}

// GetByID 根据ID获取订单物流
func (r *LogisticsRepo) GetByID(ctx context.Context, id uint64) (*model.OrderLogistics, error) {
	var logistics model.OrderLogistics
	err := r.db.WithContext(ctx).First(&logistics, id).Error
	return &logistics, err
}

// GetByOrderID 根据订单ID获取物流信息
func (r *LogisticsRepo) GetByOrderID(ctx context.Context, orderID uint64) (*model.OrderLogistics, error) {
	var logistics model.OrderLogistics
	err := r.db.WithContext(ctx).Where("order_id = ?", orderID).First(&logistics).Error
	return &logistics, err
}

// GetByOrderIDWithCompany 根据订单ID获取物流信息（包含物流公司）
func (r *LogisticsRepo) GetByOrderIDWithCompany(ctx context.Context, orderID uint64) (*model.OrderLogistics, *model.LogisticsCompany, error) {
	var logistics model.OrderLogistics
	err := r.db.WithContext(ctx).Where("order_id = ?", orderID).First(&logistics).Error
	if err != nil {
		return nil, nil, err
	}

	var company model.LogisticsCompany
	err = r.db.WithContext(ctx).First(&company, logistics.CompanyID).Error
	if err != nil {
		return &logistics, nil, err
	}

	return &logistics, &company, nil
}

// GetByTrackingNo 根据物流单号查询
func (r *LogisticsRepo) GetByTrackingNo(ctx context.Context, trackingNo string) (*model.OrderLogistics, error) {
	var logistics model.OrderLogistics
	err := r.db.WithContext(ctx).Where("tracking_no = ?", trackingNo).First(&logistics).Error
	return &logistics, err
}

// Update 更新订单物流
func (r *LogisticsRepo) Update(ctx context.Context, logistics *model.OrderLogistics) error {
	return r.db.WithContext(ctx).Save(logistics).Error
}

// UpdateStatus 更新物流状态
func (r *LogisticsRepo) UpdateStatus(ctx context.Context, id uint64, status model.LogisticsStatus) error {
	return r.db.WithContext(ctx).Model(&model.OrderLogistics{}).Where("id = ?", id).Update("status", status).Error
}

// AddTrace 添加物流轨迹
func (r *LogisticsRepo) AddTrace(ctx context.Context, id uint64, trace model.LogisticsTrace) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var logistics model.OrderLogistics
		if err := tx.First(&logistics, id).Error; err != nil {
			return err
		}

		// 添加新轨迹到开头（最新的在前）
		traces := append([]model.LogisticsTrace{trace}, logistics.Traces...)
		return tx.Model(&logistics).Update("traces", model.LogisticsTraceList(traces)).Error
	})
}

// SetTraces 设置物流轨迹（批量替换）
func (r *LogisticsRepo) SetTraces(ctx context.Context, id uint64, traces model.LogisticsTraceList) error {
	return r.db.WithContext(ctx).Model(&model.OrderLogistics{}).Where("id = ?", id).Update("traces", traces).Error
}

// Delete 删除订单物流（软删除）
func (r *LogisticsRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.OrderLogistics{}, id).Error
}

// ListByStatus 根据状态获取物流列表
func (r *LogisticsRepo) ListByStatus(ctx context.Context, status model.LogisticsStatus, page, pageSize int) ([]model.OrderLogistics, int64, error) {
	var logistics []model.OrderLogistics
	var total int64

	query := r.db.WithContext(ctx).Model(&model.OrderLogistics{}).Where("status = ?", status)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("id DESC").Offset(offset).Limit(pageSize).Find(&logistics).Error
	return logistics, total, err
}

// GetDB 获取数据库连接（用于事务）
func (r *LogisticsRepo) GetDB() *gorm.DB {
	return r.db
}