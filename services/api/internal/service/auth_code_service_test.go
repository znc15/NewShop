package service

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/pkg/jwt"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type fakeLoginCodeEmailSender struct {
	lastEmail string
	lastCode  string
	err       error
}

func (f *fakeLoginCodeEmailSender) SendLoginCode(_ context.Context, emailAddr, code string) error {
	if f.err != nil {
		return f.err
	}
	f.lastEmail = emailAddr
	f.lastCode = code
	return nil
}

type fakeLoginCodeStoreEntry struct {
	value     string
	expiresAt time.Time
}

type fakeLoginCodeStore struct {
	entries map[string]fakeLoginCodeStoreEntry
}

func newFakeLoginCodeStore() *fakeLoginCodeStore {
	return &fakeLoginCodeStore{entries: make(map[string]fakeLoginCodeStoreEntry)}
}

func (s *fakeLoginCodeStore) Get(_ context.Context, key string) (string, error) {
	entry, ok := s.entries[key]
	if !ok {
		return "", redis.Nil
	}
	if time.Now().After(entry.expiresAt) {
		delete(s.entries, key)
		return "", redis.Nil
	}
	return entry.value, nil
}

func (s *fakeLoginCodeStore) Set(_ context.Context, key, value string, expiration time.Duration) error {
	s.entries[key] = fakeLoginCodeStoreEntry{
		value:     value,
		expiresAt: time.Now().Add(expiration),
	}
	return nil
}

func (s *fakeLoginCodeStore) Delete(_ context.Context, key string) error {
	delete(s.entries, key)
	return nil
}

func (s *fakeLoginCodeStore) TTL(_ context.Context, key string) (time.Duration, error) {
	entry, ok := s.entries[key]
	if !ok {
		return 0, redis.Nil
	}
	if time.Now().After(entry.expiresAt) {
		delete(s.entries, key)
		return 0, redis.Nil
	}
	return time.Until(entry.expiresAt), nil
}

func setupAuthCodeTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	if err != nil {
		t.Fatalf("连接测试数据库失败: %v", err)
	}

	if err := db.AutoMigrate(&model.User{}); err != nil {
		t.Fatalf("迁移用户表失败: %v", err)
	}

	return db
}

func createAuthCodeTestUser(t *testing.T, db *gorm.DB, email string) *model.User {
	t.Helper()

	user := &model.User{
		Email:        email,
		Phone:        email,
		PasswordHash: "hashed_password",
		Nickname:     "验证码用户",
		Status:       "active",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("创建测试用户失败: %v", err)
	}

	return user
}

func TestAuthCodeServiceSendLoginCode(t *testing.T) {
	db := setupAuthCodeTestDB(t)
	createAuthCodeTestUser(t, db, "user@example.com")

	store := newFakeLoginCodeStore()
	emailSender := &fakeLoginCodeEmailSender{}
	service := newAuthCodeServiceWithStore(NewUserService(db), emailSender, jwt.NewJWTManager("test-secret", time.Hour), store)

	if err := service.SendLoginCode(context.Background(), "user@example.com"); err != nil {
		t.Fatalf("发送登录验证码失败: %v", err)
	}

	if emailSender.lastEmail != "user@example.com" {
		t.Fatalf("期望发送到 user@example.com，实际为 %s", emailSender.lastEmail)
	}
	if len(emailSender.lastCode) != 6 {
		t.Fatalf("期望生成 6 位验证码，实际为 %q", emailSender.lastCode)
	}

	stored, err := store.Get(context.Background(), loginCodeKeyPrefix+"user@example.com")
	if err != nil {
		t.Fatalf("读取缓存验证码失败: %v", err)
	}
	if stored == emailSender.lastCode {
		t.Fatal("验证码不应以明文形式存储")
	}

	if err := service.SendLoginCode(context.Background(), "user@example.com"); !errors.Is(err, ErrLoginCodeSendTooFrequent) {
		t.Fatalf("期望返回发送过于频繁错误，实际为: %v", err)
	}
}

func TestAuthCodeServiceVerifyLoginCode(t *testing.T) {
	db := setupAuthCodeTestDB(t)
	user := createAuthCodeTestUser(t, db, "login@example.com")

	store := newFakeLoginCodeStore()
	emailSender := &fakeLoginCodeEmailSender{}
	jwtManager := jwt.NewJWTManager("test-secret", time.Hour)
	service := newAuthCodeServiceWithStore(NewUserService(db), emailSender, jwtManager, store)

	if err := service.SendLoginCode(context.Background(), user.Email); err != nil {
		t.Fatalf("发送登录验证码失败: %v", err)
	}

	result, err := service.VerifyLoginCode(context.Background(), user.Email, emailSender.lastCode)
	if err != nil {
		t.Fatalf("验证码登录失败: %v", err)
	}
	if result.User.ID != user.ID {
		t.Fatalf("期望登录用户 ID=%d，实际为 %d", user.ID, result.User.ID)
	}
	if result.AccessToken == "" || result.RefreshToken == "" {
		t.Fatal("期望生成访问令牌和刷新令牌")
	}

	if _, err := store.Get(context.Background(), loginCodeKeyPrefix+user.Email); !errors.Is(err, redis.Nil) {
		t.Fatalf("验证码成功登录后应被删除，实际错误: %v", err)
	}
}

func TestAuthCodeServiceVerifyLoginCodeAttemptsExceeded(t *testing.T) {
	db := setupAuthCodeTestDB(t)
	createAuthCodeTestUser(t, db, "locked@example.com")

	store := newFakeLoginCodeStore()
	emailSender := &fakeLoginCodeEmailSender{}
	service := newAuthCodeServiceWithStore(NewUserService(db), emailSender, jwt.NewJWTManager("test-secret", time.Hour), store)

	if err := service.SendLoginCode(context.Background(), "locked@example.com"); err != nil {
		t.Fatalf("发送登录验证码失败: %v", err)
	}

	for i := 0; i < loginCodeMaxAttempts-1; i++ {
		_, err := service.VerifyLoginCode(context.Background(), "locked@example.com", "000000")
		if !errors.Is(err, ErrLoginCodeInvalidOrExpired) {
			t.Fatalf("第 %d 次错误校验应返回验证码错误，实际为: %v", i+1, err)
		}
	}

	_, err := service.VerifyLoginCode(context.Background(), "locked@example.com", "000000")
	if !errors.Is(err, ErrLoginCodeAttemptsExceeded) {
		t.Fatalf("达到错误上限后应锁定，实际错误: %v", err)
	}

	_, err = service.VerifyLoginCode(context.Background(), "locked@example.com", emailSender.lastCode)
	if !errors.Is(err, ErrLoginCodeAttemptsExceeded) {
		t.Fatalf("锁定后即使验证码正确也应拒绝，实际错误: %v", err)
	}
}
