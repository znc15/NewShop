package tests

import (
	"testing"
	"time"

	"newshop/api/internal/pkg/jwt"
)

func TestJWTGenerateAndValidate(t *testing.T) {
	manager := jwt.NewJWTManager("test-secret", time.Hour)
	token, err := manager.GenerateToken(1, "test@example.com", "user")
	if err != nil {
		t.Fatalf("生成 token 失败: %v", err)
	}

	claims, err := manager.ValidateToken(token)
	if err != nil {
		t.Fatalf("验证 token 失败: %v", err)
	}

	if claims.UserID != 1 {
		t.Errorf("期望 UserID=1, 得到 %d", claims.UserID)
	}
	if claims.Email != "test@example.com" {
		t.Errorf("期望 Email=test@example.com, 得到 %s", claims.Email)
	}
	if claims.Role != "user" {
		t.Errorf("期望 Role=user, 得到 %s", claims.Role)
	}
}

func TestJWTExpiredToken(t *testing.T) {
	// 使用负数时长创建已过期的 token
	manager := jwt.NewJWTManager("test-secret", -time.Hour)
	token, _ := manager.GenerateToken(1, "test@example.com", "user")

	_, err := manager.ValidateToken(token)
	if err != jwt.ErrExpiredToken {
		t.Errorf("期望 ErrExpiredToken, 得到 %v", err)
	}
}

func TestJWTInvalidToken(t *testing.T) {
	manager := jwt.NewJWTManager("test-secret", time.Hour)

	_, err := manager.ValidateToken("invalid-token")
	if err != jwt.ErrInvalidToken {
		t.Errorf("期望 ErrInvalidToken, 得到 %v", err)
	}
}

func TestJWTRefreshToken(t *testing.T) {
	manager := jwt.NewJWTManager("test-secret", time.Hour)

	refreshToken, err := manager.GenerateRefreshToken(1, "test@example.com", "admin")
	if err != nil {
		t.Fatalf("生成 refresh token 失败: %v", err)
	}

	claims, err := manager.ValidateToken(refreshToken)
	if err != nil {
		t.Fatalf("验证 refresh token 失败: %v", err)
	}

	if claims.UserID != 1 {
		t.Errorf("期望 UserID=1, 得到 %d", claims.UserID)
	}
	if claims.Role != "admin" {
		t.Errorf("期望 Role=admin, 得到 %s", claims.Role)
	}
}

func TestJWTWrongSecret(t *testing.T) {
	manager1 := jwt.NewJWTManager("secret1", time.Hour)
	manager2 := jwt.NewJWTManager("secret2", time.Hour)

	token, _ := manager1.GenerateToken(1, "test@example.com", "user")

	_, err := manager2.ValidateToken(token)
	if err != jwt.ErrInvalidToken {
		t.Errorf("期望 ErrInvalidToken (密钥不匹配), 得到 %v", err)
	}
}
