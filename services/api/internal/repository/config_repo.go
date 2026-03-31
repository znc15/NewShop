package repository

import (
	"context"
	"encoding/json"
	"time"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

type ConfigRepo struct {
	db *gorm.DB
}

func NewConfigRepo(db *gorm.DB) *ConfigRepo {
	return &ConfigRepo{db: db}
}

// GetByKey 根据键获取配置
func (r *ConfigRepo) GetByKey(ctx context.Context, key string) (*model.Config, error) {
	var config model.Config
	err := r.db.WithContext(ctx).Where("key = ?", key).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// GetByCategory 根据分类获取配置列表
func (r *ConfigRepo) GetByCategory(ctx context.Context, category string) ([]model.Config, error) {
	var configs []model.Config
	err := r.db.WithContext(ctx).Where("category = ?", category).Find(&configs).Error
	return configs, err
}

// GetPublicConfigs 获取公开配置
func (r *ConfigRepo) GetPublicConfigs(ctx context.Context) ([]model.Config, error) {
	var configs []model.Config
	err := r.db.WithContext(ctx).Where("is_public = ?", true).Find(&configs).Error
	return configs, err
}

// GetAll 获取所有配置
func (r *ConfigRepo) GetAll(ctx context.Context) ([]model.Config, error) {
	var configs []model.Config
	err := r.db.WithContext(ctx).Find(&configs).Error
	return configs, err
}

// Upsert 创建或更新配置
func (r *ConfigRepo) Upsert(ctx context.Context, config *model.Config) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing model.Config
		err := tx.Where("key = ?", config.Key).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			// 创建新配置
			return tx.Create(config).Error
		} else if err != nil {
			return err
		}

		// 更新现有配置
		config.ID = existing.ID
		config.Version = existing.Version + 1
		config.PreviousValue = existing.Value
		return tx.Model(&existing).Updates(config).Error
	})
}

// UpdateValue 更新配置值
func (r *ConfigRepo) UpdateValue(ctx context.Context, key, value string, adminID uint64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var config model.Config
		if err := tx.Where("key = ?", key).First(&config).Error; err != nil {
			return err
		}

		// 创建变更历史
		history := &model.ConfigHistory{
			ConfigID:  config.ID,
			OldValue:  config.Value,
			NewValue:  value,
			ChangedBy: adminID,
			CreatedAt: time.Now(),
		}
		if err := tx.Create(history).Error; err != nil {
			return err
		}

		// 更新配置
		return tx.Model(&config).Updates(map[string]interface{}{
			"value":          value,
			"previous_value": config.Value,
			"version":        config.Version + 1,
			"updated_at":     time.Now(),
		}).Error
	})
}

// Delete 删除配置
func (r *ConfigRepo) Delete(ctx context.Context, key string) error {
	return r.db.WithContext(ctx).Where("key = ?", key).Delete(&model.Config{}).Error
}

// GetHistories 获取配置变更历史
func (r *ConfigRepo) GetHistories(ctx context.Context, configID uint64, page, pageSize int) ([]model.ConfigHistory, int64, error) {
	var histories []model.ConfigHistory
	var total int64

	query := r.db.WithContext(ctx).Model(&model.ConfigHistory{}).Where("config_id = ?", configID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&histories).Error; err != nil {
		return nil, 0, err
	}

	return histories, total, nil
}

// InitializeDefaults 初始化默认配置
func (r *ConfigRepo) InitializeDefaults(ctx context.Context) error {
	defaultConfigs := []struct {
		Key         string
		Value       interface{}
		Type        string
		Category    string
		Description string
		IsPublic    bool
	}{
		{
			Key:         model.ConfigKeyPointsCheckinDaily,
			Value:       map[string]interface{}{"base": 10, "streak_bonus": []int{5, 10, 15, 20, 25}},
			Type:        model.ConfigTypeJSON,
			Category:    model.ConfigCategoryPoints,
			Description: "每日签到积分配置",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeyPointsPurchaseRate,
			Value:       1,
			Type:        model.ConfigTypeNumber,
			Category:    model.ConfigCategoryPoints,
			Description: "购物积分返还比例（每元积分数）",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeyMemberTiers,
			Value:       []map[string]interface{}{{"level": 1, "name": "普通会员", "min_points": 0}, {"level": 2, "name": "银卡会员", "min_points": 1000}, {"level": 3, "name": "金卡会员", "min_points": 5000}, {"level": 4, "name": "钻石会员", "min_points": 10000}},
			Type:        model.ConfigTypeArray,
			Category:    model.ConfigCategoryMember,
			Description: "会员等级配置",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeyFeaturePreorder,
			Value:       true,
			Type:        model.ConfigTypeBoolean,
			Category:    model.ConfigCategoryFeature,
			Description: "预售功能开关",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeyFeatureCoupon,
			Value:       true,
			Type:        model.ConfigTypeBoolean,
			Category:    model.ConfigCategoryFeature,
			Description: "优惠券功能开关",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeyFeaturePoints,
			Value:       true,
			Type:        model.ConfigTypeBoolean,
			Category:    model.ConfigCategoryFeature,
			Description: "积分功能开关",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeyOrderTimeoutMinutes,
			Value:       30,
			Type:        model.ConfigTypeNumber,
			Category:    model.ConfigCategoryOrder,
			Description: "订单超时时间（分钟）",
			IsPublic:    false,
		},
		{
			Key:         model.ConfigKeyOrderAutoConfirmDays,
			Value:       7,
			Type:        model.ConfigTypeNumber,
			Category:    model.ConfigCategoryOrder,
			Description: "自动确认收货天数",
			IsPublic:    false,
		},
		{
			Key:         model.ConfigKeySEOSiteTitle,
			Value:       "NewShop - 新零售电商平台",
			Type:        model.ConfigTypeString,
			Category:    model.ConfigCategorySEO,
			Description: "网站标题",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeySEOSiteDescription,
			Value:       "NewShop 是一个基于 Go 与 React 构建的现代化电商平台，提供商品、订单、会员与营销等完整能力。",
			Type:        model.ConfigTypeString,
			Category:    model.ConfigCategorySEO,
			Description: "网站描述",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeySEOSiteKeywords,
			Value:       "NewShop,电商,新零售,购物平台",
			Type:        model.ConfigTypeString,
			Category:    model.ConfigCategorySEO,
			Description: "网站关键词",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeySEOOGImage,
			Value:       "",
			Type:        model.ConfigTypeString,
			Category:    model.ConfigCategorySEO,
			Description: "Open Graph 图片",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeySEOGoogleVerify,
			Value:       "",
			Type:        model.ConfigTypeString,
			Category:    model.ConfigCategorySEO,
			Description: "Google 站长验证码",
			IsPublic:    true,
		},
		{
			Key:         model.ConfigKeyGitHubClientID,
			Value:       "",
			Type:        model.ConfigTypeString,
			Category:    model.ConfigCategorySystem,
			Description: "GitHub OAuth Client ID",
			IsPublic:    false,
		},
		{
			Key:         model.ConfigKeyGitHubClientSecret,
			Value:       "",
			Type:        model.ConfigTypeString,
			Category:    model.ConfigCategorySystem,
			Description: "GitHub OAuth Client Secret",
			IsPublic:    false,
		},
		{
			Key:         model.ConfigKeyGitHubRedirectURI,
			Value:       "",
			Type:        model.ConfigTypeString,
			Category:    model.ConfigCategorySystem,
			Description: "GitHub OAuth 回调地址",
			IsPublic:    false,
		},
	}

	for _, dc := range defaultConfigs {
		// 检查是否已存在
		var existing model.Config
		err := r.db.WithContext(ctx).Where("key = ?", dc.Key).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			valueJSON, _ := json.Marshal(dc.Value)
			config := &model.Config{
				Key:         dc.Key,
				Value:       string(valueJSON),
				Type:        dc.Type,
				Category:    dc.Category,
				Description: dc.Description,
				IsPublic:    dc.IsPublic,
			}
			if err := r.db.Create(config).Error; err != nil {
				return err
			}
		}
	}
	return nil
}
