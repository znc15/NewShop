package service

import (
	"context"
	"errors"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

var ErrUserNotFound = errors.New("用户不存在")

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) Create(ctx context.Context, user *model.User) error {
	return s.db.WithContext(ctx).Create(user).Error
}

func (s *UserService) GetByID(ctx context.Context, id uint64) (*model.User, error) {
	var user model.User
	result := s.db.WithContext(ctx).First(&user, id)
	if result.Error != nil {
		return nil, ErrUserNotFound
	}
	if user.ID == 0 {
        return nil, ErrUserNotFound
    }
    return &user, nil
}

func (s *UserService) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	result := s.db.WithContext(ctx).Where("email = ?", email).First(&user)
	if result.Error != nil {
        return nil, result.Error
    }
    return &user, nil
}

func (s *UserService) GetByPhone(ctx context.Context, phone string) (*model.User, error) {
	var user model.User
	result := s.db.WithContext(ctx).Where("phone = ?", phone).First(&user)
	if result.Error != nil {
        return nil, result.Error
    }
    return &user, nil
}

func (s *UserService) Update(ctx context.Context, user *model.User) error {
	return s.db.WithContext(ctx).Save(user).Error
}

func (s *UserService) Delete(ctx context.Context, id uint64) error {
	return s.db.WithContext(ctx).Delete(&model.User{}, id).Error
}
