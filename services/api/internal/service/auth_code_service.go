package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/pkg/jwt"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	loginCodeKeyPrefix      = "login_code:"
	loginCodeLength         = 6
	loginCodeTTL            = 5 * time.Minute
	loginCodeResendInterval = 60 * time.Second
	loginCodeMaxAttempts    = 5
)

var (
	ErrLoginCodeUserNotFound     = errors.New("该邮箱未注册")
	ErrLoginCodeSendTooFrequent  = errors.New("验证码发送过于频繁")
	ErrLoginCodeInvalidOrExpired = errors.New("验证码错误或已过期")
	ErrLoginCodeAttemptsExceeded = errors.New("验证码错误次数过多")
	errLoginCodeStoreUnavailable = errors.New("验证码存储未初始化")
)

type LoginCodeEmailSender interface {
	SendLoginCode(ctx context.Context, emailAddr, code string) error
}

type loginCodeStore interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key, value string, expiration time.Duration) error
	Delete(ctx context.Context, key string) error
	TTL(ctx context.Context, key string) (time.Duration, error)
}

type redisLoginCodeStore struct {
	client *redis.Client
}

type loginCodePayload struct {
	Code      string `json:"code"`
	Attempts  int    `json:"attempts"`
	CreatedAt int64  `json:"created_at"`
}

type AuthCodeLoginResult struct {
	AccessToken  string
	RefreshToken string
	User         *model.User
}

type AuthCodeService struct {
	userService *UserService
	emailSender LoginCodeEmailSender
	jwtManager  *jwt.JWTManager
	store       loginCodeStore
}

func NewAuthCodeService(userService *UserService, emailSender LoginCodeEmailSender, jwtManager *jwt.JWTManager, redisClient *redis.Client) *AuthCodeService {
	return newAuthCodeServiceWithStore(userService, emailSender, jwtManager, &redisLoginCodeStore{client: redisClient})
}

func newAuthCodeServiceWithStore(userService *UserService, emailSender LoginCodeEmailSender, jwtManager *jwt.JWTManager, store loginCodeStore) *AuthCodeService {
	return &AuthCodeService{
		userService: userService,
		emailSender: emailSender,
		jwtManager:  jwtManager,
		store:       store,
	}
}

func (s *AuthCodeService) SendLoginCode(ctx context.Context, email string) error {
	if s.store == nil {
		return errLoginCodeStoreUnavailable
	}
	if s.emailSender == nil {
		return fmt.Errorf("邮件服务未初始化")
	}

	if _, err := s.getActiveUserByEmail(ctx, email); err != nil {
		return err
	}

	payload, err := s.getLoginCodePayload(ctx, email)
	if err != nil && !errors.Is(err, redis.Nil) {
		return err
	}
	if err == nil {
		createdAt := time.Unix(payload.CreatedAt, 0)
		if time.Since(createdAt) < loginCodeResendInterval {
			return ErrLoginCodeSendTooFrequent
		}
	}

	code := generateCode(loginCodeLength)
	hashedCode, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("生成验证码哈希失败: %w", err)
	}

	encodedPayload, err := json.Marshal(loginCodePayload{
		Code:      string(hashedCode),
		Attempts:  0,
		CreatedAt: time.Now().Unix(),
	})
	if err != nil {
		return fmt.Errorf("编码验证码数据失败: %w", err)
	}

	key := s.loginCodeKey(email)
	if err := s.store.Set(ctx, key, string(encodedPayload), loginCodeTTL); err != nil {
		return fmt.Errorf("存储验证码失败: %w", err)
	}

	if err := s.emailSender.SendLoginCode(ctx, email, code); err != nil {
		_ = s.store.Delete(ctx, key)
		return fmt.Errorf("发送登录验证码失败: %w", err)
	}

	return nil
}

func (s *AuthCodeService) VerifyLoginCode(ctx context.Context, email, code string) (*AuthCodeLoginResult, error) {
	if s.store == nil {
		return nil, errLoginCodeStoreUnavailable
	}

	user, err := s.getActiveUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	payload, err := s.getLoginCodePayload(ctx, email)
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, ErrLoginCodeInvalidOrExpired
		}
		return nil, err
	}

	if payload.Attempts >= loginCodeMaxAttempts {
		return nil, ErrLoginCodeAttemptsExceeded
	}

	if err := bcrypt.CompareHashAndPassword([]byte(payload.Code), []byte(code)); err != nil {
		payload.Attempts++
		if storeErr := s.updateLoginCodePayload(ctx, email, payload); storeErr != nil {
			return nil, storeErr
		}

		if payload.Attempts >= loginCodeMaxAttempts {
			return nil, ErrLoginCodeAttemptsExceeded
		}

		return nil, ErrLoginCodeInvalidOrExpired
	}

	if err := s.store.Delete(ctx, s.loginCodeKey(email)); err != nil {
		return nil, fmt.Errorf("删除验证码失败: %w", err)
	}

	accessToken, err := s.jwtManager.GenerateToken(user.ID, user.Email, "user")
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID, user.Email, "user")
	if err != nil {
		return nil, err
	}

	return &AuthCodeLoginResult{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, nil
}

func (s *AuthCodeService) getActiveUserByEmail(ctx context.Context, email string) (*model.User, error) {
	if s.userService == nil {
		return nil, ErrLoginCodeUserNotFound
	}

	user, err := s.userService.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrLoginCodeUserNotFound
		}
		return nil, err
	}
	if user == nil {
		return nil, ErrLoginCodeUserNotFound
	}

	return user, nil
}

func (s *AuthCodeService) getLoginCodePayload(ctx context.Context, email string) (*loginCodePayload, error) {
	encodedPayload, err := s.store.Get(ctx, s.loginCodeKey(email))
	if err != nil {
		return nil, err
	}

	var payload loginCodePayload
	if err := json.Unmarshal([]byte(encodedPayload), &payload); err != nil {
		return nil, fmt.Errorf("解析验证码数据失败: %w", err)
	}

	return &payload, nil
}

func (s *AuthCodeService) updateLoginCodePayload(ctx context.Context, email string, payload *loginCodePayload) error {
	ttl, err := s.store.TTL(ctx, s.loginCodeKey(email))
	if err != nil && !errors.Is(err, redis.Nil) {
		return fmt.Errorf("读取验证码有效期失败: %w", err)
	}
	if ttl <= 0 {
		ttl = loginCodeTTL
	}

	encodedPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("编码验证码数据失败: %w", err)
	}

	if err := s.store.Set(ctx, s.loginCodeKey(email), string(encodedPayload), ttl); err != nil {
		return fmt.Errorf("更新验证码数据失败: %w", err)
	}

	return nil
}

func (s *AuthCodeService) loginCodeKey(email string) string {
	return loginCodeKeyPrefix + email
}

func (s *redisLoginCodeStore) Get(ctx context.Context, key string) (string, error) {
	if s.client == nil {
		return "", errLoginCodeStoreUnavailable
	}
	return s.client.Get(ctx, key).Result()
}

func (s *redisLoginCodeStore) Set(ctx context.Context, key, value string, expiration time.Duration) error {
	if s.client == nil {
		return errLoginCodeStoreUnavailable
	}
	return s.client.Set(ctx, key, value, expiration).Err()
}

func (s *redisLoginCodeStore) Delete(ctx context.Context, key string) error {
	if s.client == nil {
		return errLoginCodeStoreUnavailable
	}
	return s.client.Del(ctx, key).Err()
}

func (s *redisLoginCodeStore) TTL(ctx context.Context, key string) (time.Duration, error) {
	if s.client == nil {
		return 0, errLoginCodeStoreUnavailable
	}
	return s.client.TTL(ctx, key).Result()
}
