package service

import (
	"context"
	"errors"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrAlreadyCheckedIn   = errors.New("今日已签到")
	ErrInsufficientPoints = errors.New("积分不足")
)

// PointsService 积分服务
type PointsService struct {
	db         *gorm.DB
	pointsRepo *repository.PointsRepo
	userRepo   *repository.UserRepo
}

func NewPointsService(db *gorm.DB, pointsRepo *repository.PointsRepo, userRepo *repository.UserRepo) *PointsService {
	return &PointsService{
		db:         db,
		pointsRepo: pointsRepo,
		userRepo:   userRepo,
	}
}

// CheckInResult 签到结果
type CheckInResult struct {
	Checked        bool      `json:"checked"`          // 是否签到成功
	PointsEarned   int       `json:"points_earned"`    // 获得积分
	BasePoints     int       `json:"base_points"`      // 基础积分
	BonusPoints    int       `json:"bonus_points"`     // 奖励积分
	ContinuousDays int       `json:"continuous_days"`  // 连续签到天数
	CheckDate      time.Time `json:"check_date"`       // 签到日期
	Message        string    `json:"message"`          // 提示信息
}

// CheckIn 用户签到
func (s *PointsService) CheckIn(ctx context.Context, userID uint64) (*CheckInResult, error) {
	today := time.Now().Truncate(24 * time.Hour)

	// 检查今日是否已签到
	existing, err := s.pointsRepo.GetCheckInByDate(ctx, userID, today)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrAlreadyCheckedIn
	}

	// 计算连续签到天数
	continuousDays, err := s.calculateContinuousDays(ctx, userID)
	if err != nil {
		return nil, err
	}

	// 计算获得积分
	basePoints := model.CheckInBasePoints
	bonusPoints := s.calculateBonusPoints(continuousDays)
	totalPoints := basePoints + bonusPoints

	// 使用事务处理签到逻辑
	var result *CheckInResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 获取用户当前积分
		user, err := s.pointsRepo.GetUserByID(ctx, userID)
		if err != nil {
			return err
		}
		if user == nil {
			return errors.New("用户不存在")
		}

		newBalance := user.Points + totalPoints

		// 创建签到记录
		checkIn := &model.CheckIn{
			UserID:         userID,
			CheckDate:      today,
			ContinuousDays: continuousDays,
			PointsEarned:   totalPoints,
			CreatedAt:      time.Now(),
		}
		if err := s.pointsRepo.CreateCheckIn(ctx, checkIn); err != nil {
			return err
		}

		// 创建积分记录
		pointsRecord := &model.PointsRecord{
			UserID:      userID,
			Points:      basePoints,
			Balance:     newBalance,
			Type:        model.PointsTypeCheckIn,
			Description: "每日签到",
			CreatedAt:   time.Now(),
		}
		if err := s.pointsRepo.CreatePointsRecord(ctx, pointsRecord); err != nil {
			return err
		}

		// 如果有连续签到奖励，创建额外记录
		if bonusPoints > 0 {
			bonusRecord := &model.PointsRecord{
				UserID:      userID,
				Points:      bonusPoints,
				Balance:     newBalance,
				Type:        model.PointsTypeContinuousBonus,
				Description: s.getBonusDescription(continuousDays),
				CreatedAt:   time.Now(),
			}
			if err := s.pointsRepo.CreatePointsRecord(ctx, bonusRecord); err != nil {
				return err
			}
		}

		// 更新用户积分
		if err := s.pointsRepo.UpdateUserPoints(ctx, userID, totalPoints); err != nil {
			return err
		}

		result = &CheckInResult{
			Checked:        true,
			PointsEarned:   totalPoints,
			BasePoints:     basePoints,
			BonusPoints:    bonusPoints,
			ContinuousDays: continuousDays,
			CheckDate:      today,
			Message:        s.getCheckInMessage(continuousDays, totalPoints),
		}
		return nil
	})

	return result, err
}

// calculateContinuousDays 计算连续签到天数
func (s *PointsService) calculateContinuousDays(ctx context.Context, userID uint64) (int, error) {
	today := time.Now().Truncate(24 * time.Hour)
	yesterday := today.AddDate(0, 0, -1)

	// 获取昨天的签到记录
	lastCheckIn, err := s.pointsRepo.GetCheckInByDate(ctx, userID, yesterday)
	if err != nil {
		return 0, err
	}

	// 如果昨天签到了，连续天数+1
	if lastCheckIn != nil {
		return lastCheckIn.ContinuousDays + 1, nil
	}

	// 否则重新开始计算
	return 1, nil
}

// calculateBonusPoints 计算连续签到奖励
func (s *PointsService) calculateBonusPoints(continuousDays int) int {
	switch {
	case continuousDays >= 30:
		return model.CheckIn30DaysBonus
	case continuousDays >= 15:
		return model.CheckIn15DaysBonus
	case continuousDays >= 7:
		return model.CheckIn7DaysBonus
	default:
		return 0
	}
}

// getBonusDescription 获取奖励描述
func (s *PointsService) getBonusDescription(continuousDays int) string {
	switch {
	case continuousDays >= 30:
		return "连续签到30天奖励"
	case continuousDays >= 15:
		return "连续签到15天奖励"
	case continuousDays >= 7:
		return "连续签到7天奖励"
	default:
		return ""
	}
}

// getCheckInMessage 获取签到提示信息
func (s *PointsService) getCheckInMessage(continuousDays, totalPoints int) string {
	bonusMsg := ""
	switch {
	case continuousDays >= 30:
		bonusMsg = "，获得30天连续签到奖励！"
	case continuousDays >= 15:
		bonusMsg = "，获得15天连续签到奖励！"
	case continuousDays >= 7:
		bonusMsg = "，获得7天连续签到奖励！"
	}
	return "签到成功，获得" + intToString(totalPoints) + "积分" + bonusMsg
}

// CheckInStatus 签到状态
type CheckInStatus struct {
	TodayChecked   bool      `json:"today_checked"`    // 今日是否已签到
	ContinuousDays int       `json:"continuous_days"`  // 连续签到天数
	TotalPoints    int       `json:"total_points"`     // 总积分
	NextBonusDays  int       `json:"next_bonus_days"`  // 距离下一个奖励的天数
	NextBonusType  string    `json:"next_bonus_type"`  // 下一个奖励类型
	TodayRecords   []CheckInRecord `json:"today_records,omitempty"` // 今日签到记录（调试用）
}

// CheckInRecord 签到记录（简化版）
type CheckInRecord struct {
	CheckDate    time.Time `json:"check_date"`
	PointsEarned int       `json:"points_earned"`
}

// GetCheckInStatus 获取签到状态
func (s *PointsService) GetCheckInStatus(ctx context.Context, userID uint64) (*CheckInStatus, error) {
	today := time.Now().Truncate(24 * time.Hour)

	// 检查今日是否已签到
	todayCheckIn, err := s.pointsRepo.GetCheckInByDate(ctx, userID, today)
	if err != nil {
		return nil, err
	}

	// 获取最近一次签到记录以确定连续天数
	latestCheckIn, err := s.pointsRepo.GetLatestCheckIn(ctx, userID)
	if err != nil {
		return nil, err
	}

	// 获取用户信息
	user, err := s.pointsRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	status := &CheckInStatus{
		TodayChecked: todayCheckIn != nil,
		TotalPoints:  0,
	}

	if user != nil {
		status.TotalPoints = user.Points
	}

	// 计算连续签到天数
	if latestCheckIn != nil {
		// 如果最近签到是今天或昨天，使用其连续天数
		yesterday := today.AddDate(0, 0, -1)
		if latestCheckIn.CheckDate.Equal(today) || latestCheckIn.CheckDate.Equal(yesterday) {
			status.ContinuousDays = latestCheckIn.ContinuousDays
		} else {
			// 否则连续天数重置
			status.ContinuousDays = 0
		}
	}

	// 计算距离下一个奖励的天数
	status.NextBonusDays, status.NextBonusType = s.getNextBonus(status.ContinuousDays)

	return status, nil
}

// getNextBonus 获取下一个奖励信息
func (s *PointsService) getNextBonus(currentDays int) (int, string) {
	thresholds := []struct {
		days int
		name string
	}{
		{7, "7天奖励"},
		{15, "15天奖励"},
		{30, "30天奖励"},
	}

	for _, t := range thresholds {
		if currentDays < t.days {
			return t.days - currentDays, t.name
		}
	}

	// 已达到最高奖励，计算下一个周期
	return 30 - (currentDays % 30), "30天奖励"
}

// PointsHistoryResult 积分历史结果
type PointsHistoryResult struct {
	Records []model.PointsRecord `json:"records"`
	Total   int64                `json:"total"`
	Page    int                  `json:"page"`
	PageSize int                 `json:"page_size"`
}

// GetPointsHistory 获取积分历史
func (s *PointsService) GetPointsHistory(ctx context.Context, userID uint64, page, pageSize int) (*PointsHistoryResult, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	records, total, err := s.pointsRepo.GetPointsRecordsByUserID(ctx, userID, page, pageSize)
	if err != nil {
		return nil, err
	}

	return &PointsHistoryResult{
		Records:  records,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// AddPoints 增加积分
func (s *PointsService) AddPoints(ctx context.Context, userID uint64, points int, pointsType model.PointsType, description string, relatedID uint64) error {
	if points <= 0 {
		return errors.New("积分必须大于0")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 获取用户当前积分
		user, err := s.pointsRepo.GetUserByID(ctx, userID)
		if err != nil {
			return err
		}
		if user == nil {
			return errors.New("用户不存在")
		}

		newBalance := user.Points + points

		// 创建积分记录
		record := &model.PointsRecord{
			UserID:      userID,
			Points:      points,
			Balance:     newBalance,
			Type:        pointsType,
			Description: description,
			RelatedID:   relatedID,
			CreatedAt:   time.Now(),
		}
		if err := s.pointsRepo.CreatePointsRecord(ctx, record); err != nil {
			return err
		}

		// 更新用户积分
		return s.pointsRepo.UpdateUserPoints(ctx, userID, points)
	})
}

// DeductPoints 扣减积分
func (s *PointsService) DeductPoints(ctx context.Context, userID uint64, points int, pointsType model.PointsType, description string, relatedID uint64) error {
	if points <= 0 {
		return errors.New("积分必须大于0")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 获取用户当前积分
		user, err := s.pointsRepo.GetUserByID(ctx, userID)
		if err != nil {
			return err
		}
		if user == nil {
			return errors.New("用户不存在")
		}

		if user.Points < points {
			return ErrInsufficientPoints
		}

		newBalance := user.Points - points

		// 创建积分记录（负数）
		record := &model.PointsRecord{
			UserID:      userID,
			Points:      -points,
			Balance:     newBalance,
			Type:        pointsType,
			Description: description,
			RelatedID:   relatedID,
			CreatedAt:   time.Now(),
		}
		if err := s.pointsRepo.CreatePointsRecord(ctx, record); err != nil {
			return err
		}

		// 更新用户积分
		return s.pointsRepo.UpdateUserPoints(ctx, userID, -points)
	})
}

// GetContinuousDays 获取连续签到天数
func (s *PointsService) GetContinuousDays(ctx context.Context, userID uint64) (int, error) {
	today := time.Now().Truncate(24 * time.Hour)

	// 获取最近一次签到记录
	latestCheckIn, err := s.pointsRepo.GetLatestCheckIn(ctx, userID)
	if err != nil {
		return 0, err
	}

	if latestCheckIn == nil {
		return 0, nil
	}

	// 如果最近签到是今天或昨天，返回连续天数
	yesterday := today.AddDate(0, 0, -1)
	if latestCheckIn.CheckDate.Equal(today) || latestCheckIn.CheckDate.Equal(yesterday) {
		return latestCheckIn.ContinuousDays, nil
	}

	// 否则连续天数已重置
	return 0, nil
}

// GetUserPoints 获取用户当前积分
func (s *PointsService) GetUserPoints(ctx context.Context, userID uint64) (int, error) {
	user, err := s.pointsRepo.GetUserByID(ctx, userID)
	if err != nil {
		return 0, err
	}
	if user == nil {
		return 0, errors.New("用户不存在")
	}
	return user.Points, nil
}

// 辅助函数：int转string
func intToString(n int) string {
	if n == 0 {
		return "0"
	}

	var negative bool
	if n < 0 {
		negative = true
		n = -n
	}

	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}

	if negative {
		digits = append([]byte{'-'}, digits...)
	}

	return string(digits)
}
