package service

import (
	"context"
	"errors"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/gorm"
)

// 经验值获取常量
const (
	ExpPerYuan    = 1 // 消费1元=1经验值
	ExpPerCheckIn = 5 // 签到=5经验值
)

// 经验值类型
const (
	ExpTypeConsume  = "consume"  // 消费
	ExpTypeCheckIn  = "checkin"  // 签到
	ExpTypeAdmin    = "admin"    // 管理员调整
	ExpTypeActivity = "activity" // 活动奖励
)

var (
	ErrUserExperienceNotFound = errors.New("用户经验值记录不存在")
	ErrMemberLevelNotFound    = errors.New("会员等级不存在")
	ErrInvalidPoints          = errors.New("经验值不能为负数")
)

// MembershipService 会员服务
type MembershipService struct {
	db        *gorm.DB
	levelRepo *repository.MemberLevelRepo
	expRepo   *repository.MemberExperienceRepo
	logRepo   *repository.ExperienceLogRepo
}

// NewMembershipService 创建会员服务
func NewMembershipService(
	db *gorm.DB,
	levelRepo *repository.MemberLevelRepo,
	expRepo *repository.MemberExperienceRepo,
	logRepo *repository.ExperienceLogRepo,
) *MembershipService {
	return &MembershipService{
		db:        db,
		levelRepo: levelRepo,
		expRepo:   expRepo,
		logRepo:   logRepo,
	}
}

// GetUserLevel 获取用户等级信息
func (s *MembershipService) GetUserLevel(ctx context.Context, userID uint64) (*model.MemberExperience, *model.MemberLevel, error) {
	exp, err := s.expRepo.GetByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 用户没有经验值记录，返回默认等级
			defaultExp := &model.MemberExperience{
				UserID:       userID,
				TotalPoints:  0,
				CurrentLevel: 1,
				Experience:   0,
			}
			level, _ := s.levelRepo.GetByID(ctx, 1)
			return defaultExp, level, nil
		}
		return nil, nil, err
	}

	level, err := s.levelRepo.GetByID(ctx, uint64(exp.CurrentLevel))
	if err != nil {
		// 如果等级不存在，重新计算
		level, _ = s.CalculateLevel(ctx, exp.TotalPoints)
	}

	return exp, level, nil
}

// AddExperience 增加经验值
func (s *MembershipService) AddExperience(ctx context.Context, userID uint64, points int, expType, remark string) error {
	if points <= 0 {
		return ErrInvalidPoints
	}

	// 增加经验值
	if err := s.expRepo.AddExperience(ctx, userID, points, expType, remark); err != nil {
		return err
	}

	// 获取更新后的经验值记录，检查是否需要升级
	exp, err := s.expRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil // 经验值已添加成功，升级检查失败不影响主流程
	}

	// 计算新等级
	newLevel, err := s.CalculateLevel(ctx, exp.TotalPoints)
	if err != nil {
		return nil // 同上
	}

	// 如果等级发生变化，更新记录
	if newLevel != nil && int(newLevel.ID) != exp.CurrentLevel {
		exp.CurrentLevel = int(newLevel.ID)
		s.expRepo.Update(ctx, exp)
	}

	return nil
}

// AddConsumeExperience 消费获取经验值
func (s *MembershipService) AddConsumeExperience(ctx context.Context, userID uint64, amount float64, orderNo string) error {
	points := int(amount * float64(ExpPerYuan))
	remark := "订单消费:" + orderNo
	return s.AddExperience(ctx, userID, points, ExpTypeConsume, remark)
}

// AddCheckInExperience 签到获取经验值
func (s *MembershipService) AddCheckInExperience(ctx context.Context, userID uint64) error {
	return s.AddExperience(ctx, userID, ExpPerCheckIn, ExpTypeCheckIn, "每日签到")
}

// CalculateLevel 根据经验值计算等级
func (s *MembershipService) CalculateLevel(ctx context.Context, points int) (*model.MemberLevel, error) {
	level, err := s.levelRepo.GetByPoints(ctx, points)
	if err != nil {
		// 如果找不到，返回最低等级
		return s.levelRepo.GetByID(ctx, 1)
	}
	return level, nil
}

// GetLevelRights 获取等级权益
func (s *MembershipService) GetLevelRights(ctx context.Context, levelID uint64) (*model.MemberLevel, error) {
	level, err := s.levelRepo.GetByID(ctx, levelID)
	if err != nil {
		return nil, ErrMemberLevelNotFound
	}
	return level, nil
}

// GetLevelList 获取等级列表
func (s *MembershipService) GetLevelList(ctx context.Context) ([]model.MemberLevel, error) {
	return s.levelRepo.GetAll(ctx)
}

// GetExperienceLogs 获取经验值变动日志
func (s *MembershipService) GetExperienceLogs(ctx context.Context, userID uint64, page, pageSize int) ([]model.ExperienceLog, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	return s.logRepo.GetByUserID(ctx, userID, page, pageSize)
}

// InitDefaultLevels 初始化默认会员等级（用于数据库初始化）
func (s *MembershipService) InitDefaultLevels(ctx context.Context) error {
	levels := []model.MemberLevel{
		{ID: 1, Name: "普通会员", MinPoints: 0, MaxPoints: 999, Discount: 1.00, Icon: "普通", Rights: model.JSONArray{"基础折扣"}},
		{ID: 2, Name: "银卡会员", MinPoints: 1000, MaxPoints: 4999, Discount: 0.98, Icon: "银卡", Rights: model.JSONArray{"98折优惠", "专属客服", "生日礼包"}},
		{ID: 3, Name: "金卡会员", MinPoints: 5000, MaxPoints: 19999, Discount: 0.95, Icon: "金卡", Rights: model.JSONArray{"95折优惠", "专属客服", "生日礼包", "免运费", "优先发货"}},
		{ID: 4, Name: "白金会员", MinPoints: 20000, MaxPoints: 49999, Discount: 0.92, Icon: "白金", Rights: model.JSONArray{"92折优惠", "专属客服", "生日礼包", "免运费", "优先发货", "专属活动", "积分加倍"}},
		{ID: 5, Name: "钻石会员", MinPoints: 50000, MaxPoints: 999999999, Discount: 0.88, Icon: "钻石", Rights: model.JSONArray{"88折优惠", "专属客服", "生日礼包", "免运费", "优先发货", "专属活动", "积分加倍", "尊享特权", "新品优先"}},
	}

	for _, level := range levels {
		existing, _ := s.levelRepo.GetByID(ctx, level.ID)
		if existing == nil {
			if err := s.levelRepo.Create(ctx, &level); err != nil {
				return err
			}
		}
	}
	return nil
}
