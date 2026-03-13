package repository

import (
	"context"
	"time"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

type PointsRepo struct {
	db *gorm.DB
}

func NewPointsRepo(db *gorm.DB) *PointsRepo {
	return &PointsRepo{db: db}
}

// CreatePointsRecord 创建积分记录
func (r *PointsRepo) CreatePointsRecord(ctx context.Context, record *model.PointsRecord) error {
	return r.db.WithContext(ctx).Create(record).Error
}

// GetPointsRecordsByUserID 获取用户积分记录（分页）
func (r *PointsRepo) GetPointsRecordsByUserID(ctx context.Context, userID uint64, page, pageSize int) ([]model.PointsRecord, int64, error) {
	var records []model.PointsRecord
	var total int64

	query := r.db.WithContext(ctx).Model(&model.PointsRecord{}).Where("user_id = ?", userID)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&records).Error
	return records, total, err
}

// GetLatestPointsRecord 获取用户最新积分记录
func (r *PointsRepo) GetLatestPointsRecord(ctx context.Context, userID uint64) (*model.PointsRecord, error) {
	var record model.PointsRecord
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		First(&record).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &record, err
}

// CreateCheckIn 创建签到记录
func (r *PointsRepo) CreateCheckIn(ctx context.Context, checkIn *model.CheckIn) error {
	return r.db.WithContext(ctx).Create(checkIn).Error
}

// GetCheckInByDate 获取用户指定日期的签到记录
func (r *PointsRepo) GetCheckInByDate(ctx context.Context, userID uint64, date time.Time) (*model.CheckIn, error) {
	var checkIn model.CheckIn
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND check_date = ?", userID, date.Format("2006-01-02")).
		First(&checkIn).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &checkIn, err
}

// GetLatestCheckIn 获取用户最近一次签到记录
func (r *PointsRepo) GetLatestCheckIn(ctx context.Context, userID uint64) (*model.CheckIn, error) {
	var checkIn model.CheckIn
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("check_date DESC").
		First(&checkIn).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &checkIn, err
}

// GetCheckInHistory 获取用户签到历史（分页）
func (r *PointsRepo) GetCheckInHistory(ctx context.Context, userID uint64, page, pageSize int) ([]model.CheckIn, int64, error) {
	var checkIns []model.CheckIn
	var total int64

	query := r.db.WithContext(ctx).Model(&model.CheckIn{}).Where("user_id = ?", userID)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("check_date DESC").Offset(offset).Limit(pageSize).Find(&checkIns).Error
	return checkIns, total, err
}

// GetCheckInsByDateRange 获取用户指定日期范围内的签到记录
func (r *PointsRepo) GetCheckInsByDateRange(ctx context.Context, userID uint64, startDate, endDate time.Time) ([]model.CheckIn, error) {
	var checkIns []model.CheckIn
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND check_date >= ? AND check_date <= ?", userID, startDate.Format("2006-01-02"), endDate.Format("2006-01-02")).
		Order("check_date ASC").
		Find(&checkIns).Error
	return checkIns, err
}

// UpdateUserPoints 更新用户积分（直接操作）
func (r *PointsRepo) UpdateUserPoints(ctx context.Context, userID uint64, pointsDelta int) error {
	return r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("id = ?", userID).
		Update("points", gorm.Expr("points + ?", pointsDelta)).Error
}

// GetUserByID 获取用户信息
func (r *PointsRepo) GetUserByID(ctx context.Context, userID uint64) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).First(&user, userID).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}
