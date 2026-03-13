package repository

import (
	"context"
	"time"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

type CouponRepo struct {
	db *gorm.DB
}

func NewCouponRepo(db *gorm.DB) *CouponRepo {
	return &CouponRepo{db: db}
}

// CreateCoupon 创建优惠券
func (r *CouponRepo) CreateCoupon(ctx context.Context, coupon *model.Coupon) error {
	return r.db.WithContext(ctx).Create(coupon).Error
}

// GetCouponByID 根据ID获取优惠券
func (r *CouponRepo) GetCouponByID(ctx context.Context, id uint64) (*model.Coupon, error) {
	var coupon model.Coupon
	err := r.db.WithContext(ctx).First(&coupon, id).Error
	if err != nil {
		return nil, err
	}
	return &coupon, nil
}

// GetAvailableCouponList 获取可领取的优惠券列表
func (r *CouponRepo) GetAvailableCouponList(ctx context.Context) ([]model.Coupon, error) {
	var coupons []model.Coupon
	now := time.Now()
	err := r.db.WithContext(ctx).
		Where("status = ?", model.CouponStatusActive).
		Where("start_time <= ?", now).
		Where("end_time >= ?", now).
		Where("used_count < total_count").
		Order("created_at DESC").
		Find(&coupons).Error
	return coupons, err
}

// UpdateCouponUsedCount 更新优惠券领取数量
func (r *CouponRepo) UpdateCouponUsedCount(ctx context.Context, couponID uint64, increment int) error {
	return r.db.WithContext(ctx).
		Model(&model.Coupon{}).
		Where("id = ?", couponID).
		Update("used_count", gorm.Expr("used_count + ?", increment)).Error
}

// CreateUserCoupon 创建用户优惠券
func (r *CouponRepo) CreateUserCoupon(ctx context.Context, userCoupon *model.UserCoupon) error {
	return r.db.WithContext(ctx).Create(userCoupon).Error
}

// GetUserCouponByID 根据ID获取用户优惠券
func (r *CouponRepo) GetUserCouponByID(ctx context.Context, id uint64) (*model.UserCoupon, error) {
	var userCoupon model.UserCoupon
	err := r.db.WithContext(ctx).First(&userCoupon, id).Error
	if err != nil {
		return nil, err
	}
	return &userCoupon, nil
}

// GetUserCouponByUserAndCoupon 检查用户是否已领取某优惠券
func (r *CouponRepo) GetUserCouponByUserAndCoupon(ctx context.Context, userID, couponID uint64) (*model.UserCoupon, error) {
	var userCoupon model.UserCoupon
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND coupon_id = ?", userID, couponID).
		First(&userCoupon).Error
	if err != nil {
		return nil, err
	}
	return &userCoupon, nil
}

// CountUserCouponsByCouponID 统计用户领取某优惠券的数量
func (r *CouponRepo) CountUserCouponsByCouponID(ctx context.Context, userID, couponID uint64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.UserCoupon{}).
		Where("user_id = ? AND coupon_id = ?", userID, couponID).
		Count(&count).Error
	return count, err
}

// GetUserCouponList 获取用户优惠券列表
func (r *CouponRepo) GetUserCouponList(ctx context.Context, userID uint64, status int) ([]model.CouponDetail, error) {
	var details []model.CouponDetail

	query := r.db.WithContext(ctx).
		Model(&model.UserCoupon{}).
		Select("user_coupons.*, coupons.*").
		Joins("LEFT JOIN coupons ON user_coupons.coupon_id = coupons.id").
		Where("user_coupons.user_id = ?", userID)

	if status > 0 {
		query = query.Where("user_coupons.status = ?", status)
	}

	err := query.Scan(&details).Error
	return details, err
}

// GetAvailableCouponsForOrder 获取订单可用优惠券
func (r *CouponRepo) GetAvailableCouponsForOrder(ctx context.Context, userID uint64, orderAmount float64) ([]model.CouponDetail, error) {
	var details []model.CouponDetail
	now := time.Now()

	err := r.db.WithContext(ctx).
		Model(&model.UserCoupon{}).
		Select("user_coupons.*, coupons.*").
		Joins("LEFT JOIN coupons ON user_coupons.coupon_id = coupons.id").
		Where("user_coupons.user_id = ?", userID).
		Where("user_coupons.status = ?", model.UserCouponStatusUnused).
		Where("coupons.start_time <= ?", now).
		Where("coupons.end_time >= ?", now).
		Where("coupons.min_amount <= ?", orderAmount).
		Scan(&details).Error

	return details, err
}

// UpdateUserCouponStatus 更新用户优惠券状态
func (r *CouponRepo) UpdateUserCouponStatus(ctx context.Context, id uint64, status int, orderID uint64) error {
	updates := map[string]interface{}{
		"status":     status,
		"order_id":   orderID,
		"used_time":  time.Now(),
		"updated_at": time.Now(),
	}
	return r.db.WithContext(ctx).
		Model(&model.UserCoupon{}).
		Where("id = ?", id).
		Updates(updates).Error
}

// ExpireUserCoupons 使过期的用户优惠券失效
func (r *CouponRepo) ExpireUserCoupons(ctx context.Context) error {
	now := time.Now()

	// 查找所有已过期但状态仍为未使用的用户优惠券
	var expiredCouponIDs []uint64
	err := r.db.WithContext(ctx).
		Model(&model.UserCoupon{}).
		Select("user_coupons.id").
		Joins("LEFT JOIN coupons ON user_coupons.coupon_id = coupons.id").
		Where("user_coupons.status = ?", model.UserCouponStatusUnused).
		Where("coupons.end_time < ?", now).
		Pluck("user_coupons.id", &expiredCouponIDs).Error
	if err != nil {
		return err
	}

	if len(expiredCouponIDs) == 0 {
		return nil
	}

	return r.db.WithContext(ctx).
		Model(&model.UserCoupon{}).
		Where("id IN ?", expiredCouponIDs).
		Update("status", model.UserCouponStatusExpired).Error
}

// GetUserCouponForUpdate 加锁获取用户优惠券（用于并发场景）
func (r *CouponRepo) GetUserCouponForUpdate(ctx context.Context, id uint64) (*model.UserCoupon, error) {
	var userCoupon model.UserCoupon
	err := r.db.WithContext(ctx).
		Set("gorm:query_option", "FOR UPDATE").
		First(&userCoupon, id).Error
	if err != nil {
		return nil, err
	}
	return &userCoupon, nil
}

// BatchGetUserCoupons 批量获取用户优惠券
func (r *CouponRepo) BatchGetUserCoupons(ctx context.Context, ids []uint64) ([]model.UserCoupon, error) {
	var userCoupons []model.UserCoupon
	err := r.db.WithContext(ctx).Find(&userCoupons, ids).Error
	return userCoupons, err
}
