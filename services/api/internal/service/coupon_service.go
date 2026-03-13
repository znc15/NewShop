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
	ErrCouponNotFound       = errors.New("优惠券不存在")
	ErrCouponExpired        = errors.New("优惠券已过期")
	ErrCouponNotStarted     = errors.New("优惠券尚未开始")
	ErrCouponExhausted      = errors.New("优惠券已被领完")
	ErrCouponAlreadyReceived = errors.New("已达到领取上限")
	ErrUserCouponNotFound   = errors.New("用户优惠券不存在")
	ErrUserCouponUsed       = errors.New("优惠券已使用")
	ErrUserCouponExpired    = errors.New("优惠券已过期")
	ErrOrderAmountNotEnough = errors.New("订单金额不满足优惠券使用条件")
)

type CouponService struct {
	db        *gorm.DB
	couponRepo *repository.CouponRepo
}

func NewCouponService(db *gorm.DB, couponRepo *repository.CouponRepo) *CouponService {
	return &CouponService{
		db:        db,
		couponRepo: couponRepo,
	}
}

// GetCouponList 获取可领取的优惠券列表
func (s *CouponService) GetCouponList(ctx context.Context) ([]model.Coupon, error) {
	return s.couponRepo.GetAvailableCouponList(ctx)
}

// ReceiveCoupon 领取优惠券
func (s *CouponService) ReceiveCoupon(ctx context.Context, userID, couponID uint64) (*model.UserCoupon, error) {
	// 获取优惠券信息
	coupon, err := s.couponRepo.GetCouponByID(ctx, couponID)
	if err != nil {
		return nil, ErrCouponNotFound
	}

	// 检查优惠券状态
	now := time.Now()
	if now.Before(coupon.StartTime) {
		return nil, ErrCouponNotStarted
	}
	if now.After(coupon.EndTime) {
		return nil, ErrCouponExpired
	}
	if coupon.UsedCount >= coupon.TotalCount {
		return nil, ErrCouponExhausted
	}

	// 检查用户领取次数
	receivedCount, err := s.couponRepo.CountUserCouponsByCouponID(ctx, userID, couponID)
	if err != nil {
		return nil, err
	}
	if int(receivedCount) >= coupon.PerLimit {
		return nil, ErrCouponAlreadyReceived
	}

	// 开启事务
	var userCoupon *model.UserCoupon
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 再次检查库存（防止并发超发）
		couponForUpdate, err := s.couponRepo.GetCouponByID(ctx, couponID)
		if err != nil {
			return err
		}
		if couponForUpdate.UsedCount >= couponForUpdate.TotalCount {
			return ErrCouponExhausted
		}

		// 更新领取数量
		if err := s.couponRepo.UpdateCouponUsedCount(ctx, couponID, 1); err != nil {
			return err
		}

		// 创建用户优惠券
		userCoupon = &model.UserCoupon{
			UserID:   userID,
			CouponID: couponID,
			Status:   model.UserCouponStatusUnused,
		}
		return s.couponRepo.CreateUserCoupon(ctx, userCoupon)
	})

	if err != nil {
		return nil, err
	}

	return userCoupon, nil
}

// GetUserCoupons 获取用户优惠券列表
func (s *CouponService) GetUserCoupons(ctx context.Context, userID uint64, status int) ([]model.CouponDetail, error) {
	// 先处理过期优惠券
	_ = s.couponRepo.ExpireUserCoupons(ctx)

	return s.couponRepo.GetUserCouponList(ctx, userID, status)
}

// UseCoupon 使用优惠券
func (s *CouponService) UseCoupon(ctx context.Context, userID, userCouponID, orderID uint64) error {
	// 获取用户优惠券
	userCoupon, err := s.couponRepo.GetUserCouponByID(ctx, userCouponID)
	if err != nil {
		return ErrUserCouponNotFound
	}

	// 验证归属
	if userCoupon.UserID != userID {
		return ErrUserCouponNotFound
	}

	// 检查状态
	if userCoupon.Status == model.UserCouponStatusUsed {
		return ErrUserCouponUsed
	}
	if userCoupon.Status == model.UserCouponStatusExpired {
		return ErrUserCouponExpired
	}

	// 获取优惠券信息验证有效期
	coupon, err := s.couponRepo.GetCouponByID(ctx, userCoupon.CouponID)
	if err != nil {
		return ErrCouponNotFound
	}

	now := time.Now()
	if now.Before(coupon.StartTime) {
		return ErrCouponNotStarted
	}
	if now.After(coupon.EndTime) {
		// 更新为过期状态
		_ = s.couponRepo.UpdateUserCouponStatus(ctx, userCouponID, model.UserCouponStatusExpired, 0)
		return ErrUserCouponExpired
	}

	// 更新使用状态
	return s.couponRepo.UpdateUserCouponStatus(ctx, userCouponID, model.UserCouponStatusUsed, orderID)
}

// GetAvailableCoupons 获取订单可用优惠券
func (s *CouponService) GetAvailableCoupons(ctx context.Context, userID uint64, orderAmount float64) ([]model.CouponDetail, error) {
	// 先处理过期优惠券
	_ = s.couponRepo.ExpireUserCoupons(ctx)

	return s.couponRepo.GetAvailableCouponsForOrder(ctx, userID, orderAmount)
}

// CalculateDiscount 计算优惠金额
func (s *CouponService) CalculateDiscount(ctx context.Context, userCouponID uint64, orderAmount float64) (float64, error) {
	// 获取用户优惠券
	userCoupon, err := s.couponRepo.GetUserCouponByID(ctx, userCouponID)
	if err != nil {
		return 0, ErrUserCouponNotFound
	}

	// 获取优惠券信息
	coupon, err := s.couponRepo.GetCouponByID(ctx, userCoupon.CouponID)
	if err != nil {
		return 0, ErrCouponNotFound
	}

	// 检查订单金额是否满足条件
	if orderAmount < coupon.MinAmount {
		return 0, ErrOrderAmountNotEnough
	}

	// 计算优惠金额
	var discount float64
	switch coupon.Type {
	case model.CouponTypeFixed, model.CouponTypeNoThreshold:
		// 满减和无门槛直接减固定金额
		discount = coupon.Amount
	case model.CouponTypePercent:
		// 折扣券计算折扣金额
		discount = orderAmount * (1 - coupon.Discount)
	default:
		discount = coupon.Amount
	}

	// 优惠金额不能超过订单金额
	if discount > orderAmount {
		discount = orderAmount
	}

	return discount, nil
}

// ValidateCoupon 验证优惠券是否可用
func (s *CouponService) ValidateCoupon(ctx context.Context, userID, userCouponID, orderAmount float64) error {
	// 获取用户优惠券
	userCoupon, err := s.couponRepo.GetUserCouponByID(ctx, uint64(userCouponID))
	if err != nil {
		return ErrUserCouponNotFound
	}

	// 验证归属
	if userCoupon.UserID != uint64(userID) {
		return ErrUserCouponNotFound
	}

	// 检查状态
	if userCoupon.Status == model.UserCouponStatusUsed {
		return ErrUserCouponUsed
	}
	if userCoupon.Status == model.UserCouponStatusExpired {
		return ErrUserCouponExpired
	}

	// 获取优惠券信息
	coupon, err := s.couponRepo.GetCouponByID(ctx, userCoupon.CouponID)
	if err != nil {
		return ErrCouponNotFound
	}

	// 检查有效期
	now := time.Now()
	if now.Before(coupon.StartTime) {
		return ErrCouponNotStarted
	}
	if now.After(coupon.EndTime) {
		return ErrUserCouponExpired
	}

	// 检查订单金额
	if orderAmount < coupon.MinAmount {
		return ErrOrderAmountNotEnough
	}

	return nil
}

// RefundCoupon 退还优惠券（订单取消/退款时调用）
func (s *CouponService) RefundCoupon(ctx context.Context, userCouponID uint64) error {
	userCoupon, err := s.couponRepo.GetUserCouponByID(ctx, userCouponID)
	if err != nil {
		return ErrUserCouponNotFound
	}

	if userCoupon.Status != model.UserCouponStatusUsed {
		return nil
	}

	// 检查优惠券是否还有效
	coupon, err := s.couponRepo.GetCouponByID(ctx, userCoupon.CouponID)
	if err != nil {
		return ErrCouponNotFound
	}

	now := time.Now()
	newStatus := model.UserCouponStatusUnused
	if now.After(coupon.EndTime) {
		newStatus = model.UserCouponStatusExpired
	}

	updates := map[string]interface{}{
		"status":     newStatus,
		"order_id":   0,
		"used_time":  nil,
		"updated_at": time.Now(),
	}
	return s.db.WithContext(ctx).
		Model(&model.UserCoupon{}).
		Where("id = ?", userCouponID).
		Updates(updates).Error
}
