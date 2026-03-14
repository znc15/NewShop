package service

import (
	"context"
	"errors"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrAddressNotFound = errors.New("地址不存在")
	ErrAddressLimit    = errors.New("地址数量已达上限")
)

type AddressService struct {
	repo *repository.AddressRepo
	db   *gorm.DB
}

func NewAddressService(repo *repository.AddressRepo, db *gorm.DB) *AddressService {
	return &AddressService{repo: repo, db: db}
}

// ListAddresses 获取用户地址列表
func (s *AddressService) ListAddresses(ctx context.Context, userID uint64) ([]model.UserAddress, error) {
	return s.repo.List(ctx, userID)
}

// GetAddressByID 获取单个地址
func (s *AddressService) GetAddressByID(ctx context.Context, id, userID uint64) (*model.UserAddress, error) {
	address, err := s.repo.GetByID(ctx, id, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAddressNotFound
		}
		return nil, err
	}
	return address, nil
}

// CreateAddressInput 创建地址输入
type CreateAddressInput struct {
	Name      string `json:"name" binding:"required"`
	Phone     string `json:"phone" binding:"required"`
	Province  string `json:"province" binding:"required"`
	City      string `json:"city" binding:"required"`
	District  string `json:"district" binding:"required"`
	Address   string `json:"address" binding:"required"`
	IsDefault bool   `json:"is_default"`
}

// CreateAddress 创建地址
func (s *AddressService) CreateAddress(ctx context.Context, userID uint64, input CreateAddressInput) (*model.UserAddress, error) {
	// 检查地址数量限制（最多20个）
	var count int64
	if err := s.db.Model(&model.UserAddress{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
		return nil, err
	}
	if count >= 20 {
		return nil, ErrAddressLimit
	}

	address := &model.UserAddress{
		UserID:    userID,
		Name:      input.Name,
		Phone:     input.Phone,
		Province:  input.Province,
		City:      input.City,
		District:  input.District,
		Address:   input.Address,
		IsDefault: input.IsDefault,
	}

	// 如果是第一个地址，自动设为默认
	if count == 0 {
		address.IsDefault = true
	}

	// 如果设为默认，先清除其他默认地址
	if address.IsDefault {
		_ = s.repo.ClearDefault(ctx, userID)
	}

	if err := s.repo.Create(ctx, address); err != nil {
		return nil, err
	}

	return address, nil
}

// UpdateAddressInput 更新地址输入
type UpdateAddressInput struct {
	Name      *string `json:"name"`
	Phone     *string `json:"phone"`
	Province  *string `json:"province"`
	City      *string `json:"city"`
	District  *string `json:"district"`
	Address   *string `json:"address"`
	IsDefault *bool   `json:"is_default"`
}

// UpdateAddress 更新地址
func (s *AddressService) UpdateAddress(ctx context.Context, id, userID uint64, input UpdateAddressInput) (*model.UserAddress, error) {
	address, err := s.repo.GetByID(ctx, id, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAddressNotFound
		}
		return nil, err
	}

	if input.Name != nil {
		address.Name = *input.Name
	}
	if input.Phone != nil {
		address.Phone = *input.Phone
	}
	if input.Province != nil {
		address.Province = *input.Province
	}
	if input.City != nil {
		address.City = *input.City
	}
	if input.District != nil {
		address.District = *input.District
	}
	if input.Address != nil {
		address.Address = *input.Address
	}
	if input.IsDefault != nil && *input.IsDefault {
		// 设为默认地址
		if err := s.repo.SetDefault(ctx, id, userID); err != nil {
			return nil, err
		}
		address.IsDefault = true
	}

	if err := s.repo.Update(ctx, address); err != nil {
		return nil, err
	}

	return address, nil
}

// DeleteAddress 删除地址
func (s *AddressService) DeleteAddress(ctx context.Context, id, userID uint64) error {
	_, err := s.repo.GetByID(ctx, id, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAddressNotFound
		}
		return err
	}
	return s.repo.Delete(ctx, id, userID)
}

// SetDefaultAddress 设置默认地址
func (s *AddressService) SetDefaultAddress(ctx context.Context, id, userID uint64) error {
	_, err := s.repo.GetByID(ctx, id, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAddressNotFound
		}
		return err
	}
	return s.repo.SetDefault(ctx, id, userID)
}
