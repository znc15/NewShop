// Package config 提供应用程序配置加载功能
package config

import (
	"os"
	"strconv"
	"time"
)

// Config 应用程序配置结构
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Meili    MeiliConfig
	JWT      JWTConfig
	Alipay   AlipayConfig
	Geetest  GeetestConfig
	SMTP     SMTPConfig
	CORS     CORSConfig
}

// CORSConfig CORS 配置
type CORSConfig struct {
	AllowedOrigins []string
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port string
	Mode string
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
}

// RedisConfig Redis 配置
type RedisConfig struct {
	Host string
	Port string
}

// MeiliConfig Meilisearch 配置
type MeiliConfig struct {
	Host    string
	APIKey  string
}

// JWTConfig JWT 配置
type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

// AlipayConfig 支付宝配置
type AlipayConfig struct {
	AppID      string
	PrivateKey string
	PublicKey  string
	NotifyURL  string
	ReturnURL  string
	IsProd     bool
}

// GeetestConfig 极验配置
type GeetestConfig struct {
	ID  string
	Key string
}

// SMTPConfig SMTP 配置
type SMTPConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
}

// Load 从环境变量加载配置
func Load() (*Config, error) {
	cfg := &Config{
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8080"),
			Mode: getEnv("SERVER_MODE", "debug"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			Name:     getEnv("DB_NAME", "newshop"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
		},
		Redis: RedisConfig{
			Host: getEnv("REDIS_HOST", "localhost"),
			Port: getEnv("REDIS_PORT", "6379"),
		},
		Meili: MeiliConfig{
			Host:   getEnv("MEILI_HOST", "http://localhost:7700"),
			APIKey: getEnv("MEILI_API_KEY", ""),
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", "your-super-secret-key-change-in-production"),
			Expiry: parseDuration(getEnv("JWT_EXPIRY", "24h")),
		},
		Alipay: AlipayConfig{
			AppID:      getEnv("ALIPAY_APP_ID", ""),
			PrivateKey: getEnv("ALIPAY_PRIVATE_KEY", ""),
			PublicKey:  getEnv("ALIPAY_PUBLIC_KEY", ""),
			NotifyURL:  getEnv("ALIPAY_NOTIFY_URL", ""),
			ReturnURL:  getEnv("ALIPAY_RETURN_URL", ""),
			IsProd:     getEnv("ALIPAY_IS_PROD", "false") == "true",
		},
		Geetest: GeetestConfig{
			ID:  getEnv("GEETEST_ID", ""),
			Key: getEnv("GEETEST_KEY", ""),
		},
		SMTP: SMTPConfig{
			Host:     getEnv("SMTP_HOST", "smtp.example.com"),
			Port:     getEnvInt("SMTP_PORT", 587),
			User:     getEnv("SMTP_USER", ""),
			Password: getEnv("SMTP_PASSWORD", ""),
			From:     getEnv("SMTP_FROM", "noreply@example.com"),
		},
		CORS: CORSConfig{
			AllowedOrigins: getEnvSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
		},
	}

	return cfg, nil
}

// getEnv 获取环境变量，如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvInt 获取整数类型环境变量
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

// parseDuration 解析持续时间字符串
func parseDuration(s string) time.Duration {
	if d, err := time.ParseDuration(s); err == nil {
		return d
	}
	return 24 * time.Hour
}

// getEnvSlice 获取逗号分隔的字符串切片环境变量
func getEnvSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		var result []string
		for _, v := range splitByComma(value) {
			if v != "" {
				result = append(result, v)
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultValue
}

// splitByComma 按逗号分隔字符串
func splitByComma(s string) []string {
	var result []string
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			part := trimSpace(s[start:i])
			result = append(result, part)
			start = i + 1
		}
	}
	return result
}

// trimSpace 去除字符串前后空白
func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && isSpace(s[start]) {
		start++
	}
	for end > start && isSpace(s[end-1]) {
		end--
	}
	return s[start:end]
}

// isSpace 判断是否为空白字符
func isSpace(c byte) bool {
	return c == ' ' || c == '\t' || c == '\n' || c == '\r'
}
