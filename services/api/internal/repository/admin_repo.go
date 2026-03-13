package repository

import (
	"context"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

type AdminRepo struct {
	db *gorm.DB
}

func NewAdminRepo(db *gorm.DB) *AdminRepo {
	return &AdminRepo{db: db}
}

func (r *AdminRepo) Create(ctx context.Context, admin *model.Admin) error {
	return r.db.WithContext(ctx).Create(admin).Error
}

func (r *AdminRepo) GetByID(ctx context.Context, id uint64) (*model.Admin, error) {
	var admin model.Admin
	err := r.db.WithContext(ctx).First(&admin, id).Error
	if err != nil {
		return nil, err
	}
	return &admin, nil
}

func (r *AdminRepo) GetByUsername(ctx context.Context, username string) (*model.Admin, error) {
	var admin model.Admin
	err := r.db.WithContext(ctx).Where("username = ?", username).First(&admin).Error
	if err != nil {
		return nil, err
	}
	return &admin, nil
}

func (r *AdminRepo) Update(ctx context.Context, admin *model.Admin) error {
	return r.db.WithContext(ctx).Save(admin).Error
}

func (r *AdminRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.Admin{}, id).Error
}

func (r *AdminRepo) List(ctx context.Context, page, pageSize int) ([]model.Admin, int64, error) {
	var admins []model.Admin
	var total int64

	offset := (page - 1) * pageSize

	if err := r.db.WithContext(ctx).Model(&model.Admin{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.db.WithContext(ctx).Offset(offset).Limit(pageSize).Order("id DESC").Find(&admins).Error
	if err != nil {
		return nil, 0, err
	}

	return admins, total, nil
}

func (r *AdminRepo) UpdateLastLogin(ctx context.Context, id uint64, ip string) error {
	return r.db.WithContext(ctx).Model(&model.Admin{}).Where("id = ?", id).Updates(map[string]interface{}{
		"last_login_at": r.db.NowFunc(),
		"last_login_ip": ip,
	}).Error
}
