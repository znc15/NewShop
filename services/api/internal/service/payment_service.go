// Package service 提供业务逻辑处理
package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/pkg/alipay"
	"newshop/api/internal/repository"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

var (
	ErrPaymentNotFound      = errors.New("支付记录不存在")
	ErrPaymentAlreadyPaid   = errors.New("订单已支付")
	ErrPaymentNotPaid       = errors.New("订单未支付")
	ErrPaymentAlreadyRefund = errors.New("订单已退款")
	ErrRefundAmountExceed   = errors.New("退款金额超过可退金额")
)

// PaymentService 支付服务
type PaymentService struct {
	alipayClient *alipay.Client
	paymentRepo  *repository.PaymentRepo
	logger       *zap.Logger
}

// NewPaymentService 创建支付服务
func NewPaymentService(alipayClient *alipay.Client, paymentRepo *repository.PaymentRepo, logger *zap.Logger) *PaymentService {
	return &PaymentService{
		alipayClient: alipayClient,
		paymentRepo:  paymentRepo,
		logger:       logger,
	}
}

// CreatePaymentRequest 创建支付请求
type CreatePaymentRequest struct {
	OutTradeNo string // 商户订单号
	UserID     uint64 // 用户ID
	Amount     string // 金额
	Subject    string // 订单标题
	Body       string // 订单描述
	Passback   string // 回传参数
	PayType    string // 支付类型: page(电脑网站) / wap(手机网站)
}

// CreatePaymentResult 创建支付结果
type CreatePaymentResult struct {
	PayURL     string // 支付 URL
	OutTradeNo string // 商户订单号
}

// CreatePayment 创建支付
func (s *PaymentService) CreatePayment(ctx context.Context, req CreatePaymentRequest) (*CreatePaymentResult, error) {
	// 检查订单是否已存在
	existing, err := s.paymentRepo.GetByOutTradeNo(ctx, req.OutTradeNo)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		s.logger.Error("查询支付记录失败", zap.Error(err))
		return nil, fmt.Errorf("查询支付记录失败: %w", err)
	}

	if existing != nil {
		if existing.Status == model.PaymentStatusPaid {
			return nil, ErrPaymentAlreadyPaid
		}
		// 如果订单存在但未支付，返回已有的支付链接
	} else {
		// 解析金额
		amount, err := strconv.ParseFloat(req.Amount, 64)
		if err != nil {
			return nil, fmt.Errorf("金额格式错误: %w", err)
		}

		// 确定支付方式
		paymentMethod := model.PaymentMethodAlipayPage
		if req.PayType == "wap" {
			paymentMethod = model.PaymentMethodAlipayWap
		}

		// 创建新的支付记录
		record := &model.Payment{
			OutTradeNo:    req.OutTradeNo,
			UserID:        req.UserID,
			TotalAmount:   amount,
			Status:        model.PaymentStatusPending,
			Subject:       req.Subject,
			Body:          req.Body,
			Passback:      req.Passback,
			PaymentMethod: paymentMethod,
		}

		if err := s.paymentRepo.Create(ctx, record); err != nil {
			s.logger.Error("创建支付记录失败", zap.Error(err))
			return nil, fmt.Errorf("创建支付记录失败: %w", err)
		}
	}

	// 创建支付宝支付请求
	alipayReq := alipay.CreatePaymentRequest{
		OutTradeNo:  req.OutTradeNo,
		TotalAmount: req.Amount,
		Subject:     req.Subject,
		Body:        req.Body,
		Passback:    req.Passback,
	}

	var result *alipay.CreatePaymentResult

	switch req.PayType {
	case "wap":
		result, err = s.alipayClient.CreateWapPayment(ctx, alipayReq)
	default:
		result, err = s.alipayClient.CreatePagePayment(ctx, alipayReq)
	}

	if err != nil {
		s.logger.Error("创建支付失败",
			zap.String("out_trade_no", req.OutTradeNo),
			zap.Error(err),
		)
		return nil, fmt.Errorf("创建支付失败: %w", err)
	}

	s.logger.Info("创建支付成功",
		zap.String("out_trade_no", req.OutTradeNo),
		zap.String("amount", req.Amount),
		zap.Uint64("user_id", req.UserID),
	)

	return &CreatePaymentResult{
		PayURL:     result.PayURL,
		OutTradeNo: req.OutTradeNo,
	}, nil
}

// HandleNotify 处理支付回调
func (s *PaymentService) HandleNotify(ctx context.Context, r *http.Request) error {
	// 验证签名并解析通知数据
	notifyData, err := s.alipayClient.VerifyNotify(ctx, r)
	if err != nil {
		s.logger.Error("验证支付回调签名失败", zap.Error(err))
		return fmt.Errorf("验证签名失败: %w", err)
	}

	s.logger.Info("收到支付回调",
		zap.String("out_trade_no", notifyData.OutTradeNo),
		zap.String("trade_no", notifyData.TradeNo),
		zap.String("trade_status", notifyData.TradeStatus),
	)

	// 查询支付记录
	record, err := s.paymentRepo.GetByOutTradeNo(ctx, notifyData.OutTradeNo)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.logger.Warn("收到未知订单的支付回调",
				zap.String("out_trade_no", notifyData.OutTradeNo),
			)
			return nil // 返回 success 避免支付宝重复通知
		}
		return fmt.Errorf("查询支付记录失败: %w", err)
	}

	// 根据交易状态更新记录
	switch notifyData.TradeStatus {
	case "TRADE_SUCCESS", "TRADE_FINISHED":
		if record.Status == model.PaymentStatusPaid {
			return nil // 已处理过
		}
		paidAmount, _ := strconv.ParseFloat(notifyData.TotalAmount, 64)
		record.TradeNo = notifyData.TradeNo
		record.PaidAmount = paidAmount
		record.Status = model.PaymentStatusPaid
		now := time.Now()
		record.PaidAt = &now

		if err := s.paymentRepo.Update(ctx, record); err != nil {
			s.logger.Error("更新支付记录失败", zap.Error(err))
			return fmt.Errorf("更新支付记录失败: %w", err)
		}

		s.logger.Info("支付成功",
			zap.String("out_trade_no", notifyData.OutTradeNo),
			zap.String("trade_no", notifyData.TradeNo),
			zap.String("amount", notifyData.TotalAmount),
		)
	case "TRADE_CLOSED":
		record.Status = model.PaymentStatusClosed
		if err := s.paymentRepo.Update(ctx, record); err != nil {
			s.logger.Error("更新支付记录失败", zap.Error(err))
			return fmt.Errorf("更新支付记录失败: %w", err)
		}
		s.logger.Info("交易关闭",
			zap.String("out_trade_no", notifyData.OutTradeNo),
		)
	}

	return nil
}

// QueryPayment 查询支付状态
func (s *PaymentService) QueryPayment(ctx context.Context, outTradeNo string) (*model.Payment, error) {
	// 查询数据库记录
	record, err := s.paymentRepo.GetByOutTradeNo(ctx, outTradeNo)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPaymentNotFound
		}
		return nil, fmt.Errorf("查询支付记录失败: %w", err)
	}

	// 如果状态是待支付，主动查询支付宝同步状态
	if record.Status == model.PaymentStatusPending {
		queryResult, err := s.alipayClient.QueryPayment(ctx, outTradeNo)
		if err != nil {
			s.logger.Warn("查询支付宝状态失败", zap.Error(err))
			return record, nil // 返回数据库记录
		}

		// 更新数据库状态
		switch queryResult.TradeStatus {
		case "TRADE_SUCCESS", "TRADE_FINISHED":
			paidAmount, _ := strconv.ParseFloat(queryResult.TotalAmount, 64)
			record.Status = model.PaymentStatusPaid
			record.TradeNo = queryResult.TradeNo
			record.PaidAmount = paidAmount
			now := time.Now()
			record.PaidAt = &now
		case "TRADE_CLOSED":
			record.Status = model.PaymentStatusClosed
		}

		if err := s.paymentRepo.Update(ctx, record); err != nil {
			s.logger.Warn("更新支付状态失败", zap.Error(err))
		}
	}

	return record, nil
}

// RefundRequest 退款请求
type RefundRequest struct {
	OutTradeNo   string // 商户订单号
	RefundAmount string // 退款金额
	RefundReason string // 退款原因
}

// RefundResult 退款结果
type RefundResult struct {
	TradeNo    string // 支付宝交易号
	OutTradeNo string // 商户订单号
	RefundFee  string // 退款金额
}

// RefundPayment 申请退款
func (s *PaymentService) RefundPayment(ctx context.Context, req RefundRequest) (*RefundResult, error) {
	// 查询支付记录
	record, err := s.paymentRepo.GetByOutTradeNo(ctx, req.OutTradeNo)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPaymentNotFound
		}
		return nil, fmt.Errorf("查询支付记录失败: %w", err)
	}

	if record.Status != model.PaymentStatusPaid {
		return nil, ErrPaymentNotPaid
	}

	// 解析退款金额
	refundAmount, err := strconv.ParseFloat(req.RefundAmount, 64)
	if err != nil {
		return nil, fmt.Errorf("退款金额格式错误: %w", err)
	}

	// 检查可退款金额
	if refundAmount > record.CanRefund() {
		return nil, ErrRefundAmountExceed
	}

	// 生成退款请求单号
	outRequestNo := fmt.Sprintf("%s_R%d", req.OutTradeNo, time.Now().UnixNano())

	// 调用支付宝退款接口
	alipayReq := alipay.RefundRequest{
		OutTradeNo:   req.OutTradeNo,
		RefundAmount: req.RefundAmount,
		RefundReason: req.RefundReason,
		OutRequestNo: outRequestNo,
	}

	result, err := s.alipayClient.RefundPayment(ctx, alipayReq)
	if err != nil {
		s.logger.Error("退款失败",
			zap.String("out_trade_no", req.OutTradeNo),
			zap.Error(err),
		)
		return nil, err
	}

	// 创建退款记录
	refundRecord := &model.PaymentRefund{
		PaymentID:    record.ID,
		OutRequestNo: outRequestNo,
		OutTradeNo:   req.OutTradeNo,
		RefundAmount: refundAmount,
		RefundReason: req.RefundReason,
		Status:       "SUCCESS",
	}

	if err := s.paymentRepo.CreateRefund(ctx, refundRecord); err != nil {
		s.logger.Error("创建退款记录失败", zap.Error(err))
	}

	// 更新支付记录
	record.RefundedAmount += refundAmount
	now := time.Now()
	record.RefundedAt = &now
	if record.RefundedAmount >= record.PaidAmount {
		record.Status = model.PaymentStatusRefunded
	} else {
		record.Status = model.PaymentStatusRefunding
	}

	if err := s.paymentRepo.Update(ctx, record); err != nil {
		s.logger.Error("更新支付记录失败", zap.Error(err))
	}

	s.logger.Info("退款成功",
		zap.String("out_trade_no", req.OutTradeNo),
		zap.String("refund_amount", req.RefundAmount),
	)

	return &RefundResult{
		TradeNo:    result.TradeNo,
		OutTradeNo: result.OutTradeNo,
		RefundFee:  result.RefundFee,
	}, nil
}
