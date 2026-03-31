package service

import (
	"context"
	"errors"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrAdminNotFound      = errors.New("管理员不存在")
	ErrAdminAlreadyExists = errors.New("管理员用户名已存在")
	ErrInvalidCredentials = errors.New("用户名或密码错误")
	ErrAdminDisabled      = errors.New("管理员账号已禁用")
)

type AdminService struct {
	repo *repository.AdminRepo
	db   *gorm.DB
}

func NewAdminService(repo *repository.AdminRepo, db *gorm.DB) *AdminService {
	return &AdminService{repo: repo, db: db}
}

type AdminLoginResult struct {
	Admin       *model.Admin
	AccessToken string
}

func (s *AdminService) Login(ctx context.Context, username, password, ip string, generateToken func(userID uint64, email, role string) (string, error)) (*AdminLoginResult, error) {
	admin, err := s.repo.GetByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	if admin.Status != "active" {
		return nil, ErrAdminDisabled
	}

	// 更新最后登录信息
	if err := s.repo.UpdateLastLogin(ctx, admin.ID, ip); err != nil {
		// 登录成功但更新登录信息失败，仅记录日志，不影响登录
	}

	// 生成 token
	role := admin.Role
	if role == "" {
		role = "admin"
	}

	accessToken, err := generateToken(admin.ID, admin.Username, role)
	if err != nil {
		return nil, err
	}

	return &AdminLoginResult{
		Admin:       admin,
		AccessToken: accessToken,
	}, nil
}

func (s *AdminService) GetAdminByID(ctx context.Context, id uint64) (*model.Admin, error) {
	admin, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAdminNotFound
		}
		return nil, err
	}
	return admin, nil
}

func (s *AdminService) CreateAdmin(ctx context.Context, username, password, nickname, role string) (*model.Admin, error) {
	// 检查用户名是否已存在
	_, err := s.repo.GetByUsername(ctx, username)
	if err == nil {
		return nil, ErrAdminAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	admin := &model.Admin{
		Username:     username,
		PasswordHash: string(hashedPassword),
		Nickname:     nickname,
		Role:         role,
		Status:       "active",
	}

	if err := s.repo.Create(ctx, admin); err != nil {
		return nil, err
	}

	return admin, nil
}

type UpdateAdminInput struct {
	Nickname *string
	Password *string
	Role     *string
	Status   *string
}

func (s *AdminService) UpdateAdmin(ctx context.Context, id uint64, input UpdateAdminInput) (*model.Admin, error) {
	admin, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAdminNotFound
		}
		return nil, err
	}

	if input.Nickname != nil {
		admin.Nickname = *input.Nickname
	}

	if input.Password != nil && *input.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*input.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		admin.PasswordHash = string(hashedPassword)
	}

	if input.Role != nil {
		admin.Role = *input.Role
	}

	if input.Status != nil {
		admin.Status = *input.Status
	}

	if err := s.repo.Update(ctx, admin); err != nil {
		return nil, err
	}

	return admin, nil
}

func (s *AdminService) DeleteAdmin(ctx context.Context, id uint64) error {
	// 检查管理员是否存在
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAdminNotFound
		}
		return err
	}

	return s.repo.Delete(ctx, id)
}

type AdminListResult struct {
	Admins []model.Admin `json:"admins"`
	Total  int64         `json:"total"`
	Page   int           `json:"page"`
}

func (s *AdminService) ListAdmins(ctx context.Context, page, pageSize int) (*AdminListResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	admins, total, err := s.repo.List(ctx, page, pageSize)
	if err != nil {
		return nil, err
	}

	return &AdminListResult{
		Admins: admins,
		Total:  total,
		Page:   page,
	}, nil
}

// UpdateLastLogin 更新最后登录时间（供外部调用）
func (s *AdminService) UpdateLastLogin(ctx context.Context, id uint64, ip string) error {
	return s.repo.UpdateLastLogin(ctx, id, ip)
}

// SetAdminStatus 设置管理员状态
func (s *AdminService) SetAdminStatus(ctx context.Context, id uint64, status string) error {
	admin, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	now := time.Now()
	admin.Status = status
	admin.UpdatedAt = now
	return s.repo.Update(ctx, admin)
}
