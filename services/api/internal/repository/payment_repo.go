package repository

import (
	"context"

	"newshop/api/internal/model"

	"gorm.io/gorm"
)

// PaymentRepo 支付仓库
type PaymentRepo struct {
	db *gorm.DB
}

// NewPaymentRepo 创建支付仓库
func NewPaymentRepo(db *gorm.DB) *PaymentRepo {
	return &PaymentRepo{db: db}
}

// Create 创建支付记录
func (r *PaymentRepo) Create(ctx context.Context, payment *model.Payment) error {
	return r.db.WithContext(ctx).Create(payment).Error
}

// Update 更新支付记录
func (r *PaymentRepo) Update(ctx context.Context, payment *model.Payment) error {
	return r.db.WithContext(ctx).Save(payment).Error
}

// GetByOutTradeNo 根据商户订单号获取支付记录
func (r *PaymentRepo) GetByOutTradeNo(ctx context.Context, outTradeNo string) (*model.Payment, error) {
	var payment model.Payment
	err := r.db.WithContext(ctx).Where("out_trade_no = ?", outTradeNo).First(&payment).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

// GetByTradeNo 根据第三方交易号获取支付记录
func (r *PaymentRepo) GetByTradeNo(ctx context.Context, tradeNo string) (*model.Payment, error) {
	var payment model.Payment
	err := r.db.WithContext(ctx).Where("trade_no = ?", tradeNo).First(&payment).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

// GetByID 根据ID获取支付记录
func (r *PaymentRepo) GetByID(ctx context.Context, id uint64) (*model.Payment, error) {
	var payment model.Payment
	err := r.db.WithContext(ctx).First(&payment, id).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

// ListByUserID 获取用户支付记录列表
func (r *PaymentRepo) ListByUserID(ctx context.Context, userID uint64, page, pageSize int) ([]model.Payment, int64, error) {
	var payments []model.Payment
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Payment{}).Where("user_id = ?", userID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&payments).Error
	return payments, total, err
}

// CreateRefund 创建退款记录
func (r *PaymentRepo) CreateRefund(ctx context.Context, refund *model.PaymentRefund) error {
	return r.db.WithContext(ctx).Create(refund).Error
}

// UpdateRefund 更新退款记录
func (r *PaymentRepo) UpdateRefund(ctx context.Context, refund *model.PaymentRefund) error {
	return r.db.WithContext(ctx).Save(refund).Error
}

// GetRefundByOutRequestNo 根据退款请求单号获取退款记录
func (r *PaymentRepo) GetRefundByOutRequestNo(ctx context.Context, outRequestNo string) (*model.PaymentRefund, error) {
	var refund model.PaymentRefund
	err := r.db.WithContext(ctx).Where("out_request_no = ?", outRequestNo).First(&refund).Error
	if err != nil {
		return nil, err
	}
	return &refund, nil
}

// ListRefundsByPaymentID 获取支付记录的退款列表
func (r *PaymentRepo) ListRefundsByPaymentID(ctx context.Context, paymentID uint64) ([]model.PaymentRefund, error) {
	var refunds []model.PaymentRefund
	err := r.db.WithContext(ctx).Where("payment_id = ?", paymentID).Order("created_at DESC").Find(&refunds).Error
	return refunds, err
}

// UpdatePaymentStatus 更新支付状态（带事务）
func (r *PaymentRepo) UpdatePaymentStatus(ctx context.Context, outTradeNo string, status model.PaymentStatus, tradeNo string, paidAmount float64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return tx.Model(&model.Payment{}).
			Where("out_trade_no = ?", outTradeNo).
			Updates(map[string]interface{}{
				"status":      status,
				"trade_no":    tradeNo,
				"paid_amount": paidAmount,
				"paid_at":     gorm.Expr("CASE WHEN ? = ? THEN NOW() ELSE paid_at END", status, model.PaymentStatusPaid),
				"updated_at":  gorm.Expr("NOW()"),
			}).Error
	})
}
