package repository

import (
	"context"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

// MemberLevelRepo 会员等级仓储
type MemberLevelRepo struct {
	db *gorm.DB
}

// NewMemberLevelRepo 创建会员等级仓储
func NewMemberLevelRepo(db *gorm.DB) *MemberLevelRepo {
	return &MemberLevelRepo{db: db}
}

// GetAll 获取所有会员等级
func (r *MemberLevelRepo) GetAll(ctx context.Context) ([]model.MemberLevel, error) {
	var levels []model.MemberLevel
	err := r.db.WithContext(ctx).Order("id ASC").Find(&levels).Error
	return levels, err
}

// GetByID 根据ID获取会员等级
func (r *MemberLevelRepo) GetByID(ctx context.Context, id uint64) (*model.MemberLevel, error) {
	var level model.MemberLevel
	err := r.db.WithContext(ctx).First(&level, id).Error
	if err != nil {
		return nil, err
	}
	return &level, nil
}

// GetByPoints 根据经验值获取对应等级
func (r *MemberLevelRepo) GetByPoints(ctx context.Context, points int) (*model.MemberLevel, error) {
	var level model.MemberLevel
	err := r.db.WithContext(ctx).
		Where("min_points <= ? AND max_points >= ?", points, points).
		First(&level).Error
	if err != nil {
		// 如果没有找到，返回最高等级（当经验值超过最高等级要求时）
		err = r.db.WithContext(ctx).
			Where("min_points <= ?", points).
			Order("id DESC").
			First(&level).Error
	}
	return &level, err
}

// Create 创建会员等级
func (r *MemberLevelRepo) Create(ctx context.Context, level *model.MemberLevel) error {
	return r.db.WithContext(ctx).Create(level).Error
}

// Update 更新会员等级
func (r *MemberLevelRepo) Update(ctx context.Context, level *model.MemberLevel) error {
	return r.db.WithContext(ctx).Save(level).Error
}

// Delete 删除会员等级
func (r *MemberLevelRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.MemberLevel{}, id).Error
}

// MemberExperienceRepo 会员经验值仓储
type MemberExperienceRepo struct {
	db *gorm.DB
}

// NewMemberExperienceRepo 创建会员经验值仓储
func NewMemberExperienceRepo(db *gorm.DB) *MemberExperienceRepo {
	return &MemberExperienceRepo{db: db}
}

// GetByUserID 根据用户ID获取经验值记录
func (r *MemberExperienceRepo) GetByUserID(ctx context.Context, userID uint64) (*model.MemberExperience, error) {
	var exp model.MemberExperience
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&exp).Error
	if err != nil {
		return nil, err
	}
	return &exp, nil
}

// Create 创建经验值记录
func (r *MemberExperienceRepo) Create(ctx context.Context, exp *model.MemberExperience) error {
	return r.db.WithContext(ctx).Create(exp).Error
}

// Update 更新经验值记录
func (r *MemberExperienceRepo) Update(ctx context.Context, exp *model.MemberExperience) error {
	return r.db.WithContext(ctx).Save(exp).Error
}

// AddExperience 增加经验值（使用事务）
func (r *MemberExperienceRepo) AddExperience(ctx context.Context, userID uint64, points int, expType, remark string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 更新或创建经验值记录
		var exp model.MemberExperience
		result := tx.Where("user_id = ?", userID).First(&exp)
		if result.Error == gorm.ErrRecordNotFound {
			exp = model.MemberExperience{
				UserID:       userID,
				TotalPoints:  points,
				CurrentLevel: 1,
				Experience:   points,
			}
			if err := tx.Create(&exp).Error; err != nil {
				return err
			}
		} else {
			exp.TotalPoints += points
			exp.Experience += points
			if err := tx.Save(&exp).Error; err != nil {
				return err
			}
		}

		// 记录经验值变动日志
		log := model.ExperienceLog{
			UserID: userID,
			Points: points,
			Type:   expType,
			Remark: remark,
		}
		return tx.Create(&log).Error
	})
}

// ExperienceLogRepo 经验值日志仓储
type ExperienceLogRepo struct {
	db *gorm.DB
}

// NewExperienceLogRepo 创建经验值日志仓储
func NewExperienceLogRepo(db *gorm.DB) *ExperienceLogRepo {
	return &ExperienceLogRepo{db: db}
}

// GetByUserID 获取用户经验值变动日志
func (r *ExperienceLogRepo) GetByUserID(ctx context.Context, userID uint64, page, pageSize int) ([]model.ExperienceLog, int64, error) {
	var logs []model.ExperienceLog
	var total int64

	query := r.db.WithContext(ctx).Model(&model.ExperienceLog{}).Where("user_id = ?", userID)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&logs).Error
	return logs, total, err
}
