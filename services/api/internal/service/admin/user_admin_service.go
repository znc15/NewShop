package admin

import (
	"context"
	"errors"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

var (
	ErrUserNotFound = errors.New("用户不存在")
)

// UserAdminService 用户管理服务
type UserAdminService struct {
	db      *gorm.DB
	userRepo *repository.UserRepo
	logger  *zap.Logger
}

// NewUserAdminService 创建用户管理服务
func NewUserAdminService(db *gorm.DB, userRepo *repository.UserRepo, logger *zap.Logger) *UserAdminService {
	return &UserAdminService{
		db:      db,
		userRepo: userRepo,
		logger:  logger,
	}
}

// UserListResult 用户列表结果
type UserListResult struct {
	Users    []model.User `json:"users"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
}

// GetUsers 获取用户列表
func (s *UserAdminService) GetUsers(ctx context.Context, page, pageSize int, keyword, status string) (*UserListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	users, total, err := s.userRepo.List(ctx, page, pageSize, keyword, status)
	if err != nil {
		s.logger.Error("获取用户列表失败", zap.Error(err))
		return nil, err
	}

	return &UserListResult{
		Users:    users,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetUser 获取用户详情
func (s *UserAdminService) GetUser(ctx context.Context, id uint64) (*model.User, error) {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Nickname    string `json:"nickname"`
	Phone       string `json:"phone"`
	Avatar      string `json:"avatar"`
	Status      string `json:"status"`
	MemberLevel int    `json:"member_level"`
	Points      int    `json:"points"`
}

// UpdateUser 更新用户信息
func (s *UserAdminService) UpdateUser(ctx context.Context, id uint64, req *UpdateUserRequest) error {
	// 检查用户是否存在
	_, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	updates := make(map[string]interface{})
	if req.Nickname != "" {
		updates["nickname"] = req.Nickname
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.MemberLevel > 0 {
		updates["member_level"] = req.MemberLevel
	}
	if req.Points >= 0 {
		updates["points"] = req.Points
	}

	if len(updates) == 0 {
		return nil
	}

	return s.userRepo.Update(ctx, id, updates)
}

// DeleteUser 删除用户
func (s *UserAdminService) DeleteUser(ctx context.Context, id uint64) error {
	// 检查用户是否存在
	_, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	return s.userRepo.Delete(ctx, id)
}

// UserStats 用户统计
type UserStats struct {
	Total    int64 `json:"total"`
	Active   int64 `json:"active"`
	Inactive int64 `json:"inactive"`
}

// GetUserStats 获取用户统计
func (s *UserAdminService) GetUserStats(ctx context.Context) (*UserStats, error) {
	total, err := s.userRepo.Count(ctx)
	if err != nil {
		return nil, err
	}

	active, err := s.userRepo.CountByStatus(ctx, "active")
	if err != nil {
		return nil, err
	}

	inactive, err := s.userRepo.CountByStatus(ctx, "inactive")
	if err != nil {
		return nil, err
	}

	return &UserStats{
		Total:    total,
		Active:   active,
		Inactive: inactive,
	}, nil
}
