package service

import (
	"context"
	"errors"
	"strings"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

var ErrUserNotFound = errors.New("用户不存在")

type UserService struct {
	db *gorm.DB
}

type UserProfile struct {
	ID          uint64  `json:"id"`
	Email       string  `json:"email"`
	Phone       string  `json:"phone"`
	Username    string  `json:"username"`
	Nickname    string  `json:"nickname"`
	Avatar      string  `json:"avatar"`
	MemberLevel int     `json:"member_level"`
	Level       int     `json:"level"`
	Points      int     `json:"points"`
	Status      string  `json:"status"`
	OrderCount  int64   `json:"order_count"`
	TotalSpent  float64 `json:"total_spent"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

type UpdateProfileRequest struct {
	Username *string
	Nickname *string
	Phone    *string
	Avatar   *string
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) buildProfile(ctx context.Context, user *model.User) (*UserProfile, error) {
	orderCount, totalSpent, err := s.GetOrderStats(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	username := strings.TrimSpace(user.Nickname)
	if username == "" {
		username = strings.TrimSpace(strings.Split(user.Email, "@")[0])
	}
	if username == "" {
		username = "用户"
	}

	return &UserProfile{
		ID:          user.ID,
		Email:       user.Email,
		Phone:       user.Phone,
		Username:    username,
		Nickname:    user.Nickname,
		Avatar:      user.Avatar,
		MemberLevel: user.MemberLevel,
		Level:       user.MemberLevel,
		Points:      user.Points,
		Status:      user.Status,
		OrderCount:  orderCount,
		TotalSpent:  totalSpent,
		CreatedAt:   user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

func (s *UserService) GetOrderStats(ctx context.Context, userID uint64) (int64, float64, error) {
	var stats struct {
		OrderCount int64   `gorm:"column:order_count"`
		TotalSpent float64 `gorm:"column:total_spent"`
	}

	err := s.db.WithContext(ctx).
		Model(&model.Order{}).
		Select("COUNT(*) as order_count, COALESCE(SUM(pay_amount), 0) as total_spent").
		Where("user_id = ?", userID).
		Where("status IN ?", []model.OrderStatus{model.OrderStatusPaid, model.OrderStatusShipped, model.OrderStatusDelivered, model.OrderStatusCompleted}).
		Scan(&stats).Error
	if err != nil {
		return 0, 0, err
	}

	return stats.OrderCount, stats.TotalSpent, nil
}

func (s *UserService) GetProfile(ctx context.Context, id uint64) (*UserProfile, error) {
	user, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return s.buildProfile(ctx, user)
}

func (s *UserService) UpdateProfile(ctx context.Context, id uint64, req *UpdateProfileRequest) (*UserProfile, error) {
	user, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if req.Phone != nil {
		phone := strings.TrimSpace(*req.Phone)
		if phone != "" && phone != user.Phone {
			existing, err := s.GetByPhone(ctx, phone)
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, err
			}
			if existing != nil && existing.ID != user.ID {
				return nil, gorm.ErrDuplicatedKey
			}
		}
		user.Phone = phone
	}

	if req.Nickname != nil {
		user.Nickname = strings.TrimSpace(*req.Nickname)
	} else if req.Username != nil {
		user.Nickname = strings.TrimSpace(*req.Username)
	}

	if req.Avatar != nil {
		user.Avatar = strings.TrimSpace(*req.Avatar)
	}

	if err := s.Update(ctx, user); err != nil {
		return nil, err
	}

	return s.buildProfile(ctx, user)
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
