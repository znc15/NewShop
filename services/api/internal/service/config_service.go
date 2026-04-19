package service

import (
	"context"
	"encoding/json"
	"errors"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

var (
	ErrConfigNotFound = errors.New("配置不存在")
	ErrInvalidConfigType = errors.New("配置类型无效")
)

// ConfigService 配置服务
type ConfigService struct {
	db        *gorm.DB
	configRepo *repository.ConfigRepo
	logger     *zap.Logger
}

// NewConfigService 创建配置服务
func NewConfigService(db *gorm.DB, configRepo *repository.ConfigRepo, logger *zap.Logger) *ConfigService {
	return &ConfigService{
		db:        db,
		configRepo: configRepo,
		logger:    logger,
	}
}

// GetByKey 根据键获取配置
func (s *ConfigService) GetByKey(ctx context.Context, key string) (*model.Config, error) {
	return s.configRepo.GetByKey(ctx, key)
}

// GetByCategory 根据分类获取配置列表
func (s *ConfigService) GetByCategory(ctx context.Context, category string) ([]model.Config, error) {
	return s.configRepo.GetByCategory(ctx, category)
}

// GetPublicConfigs 获取公开配置（供前端使用）
func (s *ConfigService) GetPublicConfigs(ctx context.Context) (map[string]interface{}, error) {
	configs, err := s.configRepo.GetPublicConfigs(ctx)
	if err != nil {
		return nil, err
	}

	result := make(map[string]interface{})
	for _, config := range configs {
		var value interface{}
		if err := json.Unmarshal([]byte(config.Value), &value); err != nil {
				s.logger.Warn("解析配置值失败", zap.String("key", config.Key), zap.Error(err))
				continue
		}
		result[config.Key] = value
	}
	return result, nil
}

// GetAllConfigs 获取所有配置
func (s *ConfigService) GetAllConfigs(ctx context.Context) ([]model.Config, error) {
	return s.configRepo.GetAll(ctx)
}

// UpsertConfig 创建或更新配置
func (s *ConfigService) UpsertConfig(ctx context.Context, config *model.Config, adminID uint64) error {
	return s.configRepo.Upsert(ctx, config)
}

// UpdateConfigValue 更新配置值
func (s *ConfigService) UpdateConfigValue(ctx context.Context, key string, value json.RawMessage, adminID uint64) error {
	// 获取现有配置以验证存在性
	_, err := s.configRepo.GetByKey(ctx, key)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrConfigNotFound
		}
		return err
	}

	return s.configRepo.UpdateValue(ctx, key, string(value), adminID)
}

// DeleteConfig 删除配置
func (s *ConfigService) DeleteConfig(ctx context.Context, key string) error {
	return s.configRepo.Delete(ctx, key)
}

// GetConfigHistories 获取配置变更历史
func (s *ConfigService) GetConfigHistories(ctx context.Context, configID uint64, page, pageSize int) ([]model.ConfigHistory, int64, error) {
	return s.configRepo.GetHistories(ctx, configID, page, pageSize)
}

// InitializeDefaults 初始化默认配置
func (s *ConfigService) InitializeDefaults(ctx context.Context) error {
	return s.configRepo.InitializeDefaults(ctx)
}

// ========== 便捷方法 ==========

// GetBoolConfig 获取布尔类型配置
func (s *ConfigService) GetBoolConfig(ctx context.Context, key string) (bool, error) {
	config, err := s.configRepo.GetByKey(ctx, key)
	if err != nil {
		return false, err
	}

	if config.Type != model.ConfigTypeBoolean {
		return false, ErrInvalidConfigType
	}

	var value bool
	if err := json.Unmarshal([]byte(config.Value), &value); err != nil {
		return false, err
	}
	return value, nil
}

// GetIntConfig 获取整数类型配置
func (s *ConfigService) GetIntConfig(ctx context.Context, key string) (int, error) {
	config, err := s.configRepo.GetByKey(ctx, key)
	if err != nil {
		return 0, err
	}

	if config.Type != model.ConfigTypeNumber {
		return 0, ErrInvalidConfigType
	}

	var value int
	if err := json.Unmarshal([]byte(config.Value), &value); err != nil {
		return 0, err
	}
	return value, nil
}

// GetStringConfig 获取字符串类型配置
func (s *ConfigService) GetStringConfig(ctx context.Context, key string) (string, error) {
	config, err := s.configRepo.GetByKey(ctx, key)
	if err != nil {
		return "", err
	}

	if config.Type != model.ConfigTypeString {
		return "", ErrInvalidConfigType
	}

	var value string
	if err := json.Unmarshal([]byte(config.Value), &value); err != nil {
		// 兼容非 JSON 格式的老数据
		return config.Value, nil
	}

	return value, nil
}

// GetJSONConfig 获取 JSON 类型配置
func (s *ConfigService) GetJSONConfig(ctx context.Context, key string, dest interface{}) error {
	config, err := s.configRepo.GetByKey(ctx, key)
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(config.Value), dest)
}

// IsFeatureEnabled 检查功能是否启用
func (s *ConfigService) IsFeatureEnabled(ctx context.Context, featureKey string) bool {
	value, err := s.GetBoolConfig(ctx, featureKey)
	if err != nil {
		s.logger.Warn("获取功能开关失败", zap.String("key", featureKey), zap.Error(err))
		return false // 默认关闭
	}
	return value
}
