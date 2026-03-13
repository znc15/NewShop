// Package service 提供业务逻辑处理
package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"newshop/api/internal/pkg/alipay"

	"go.uber.org/zap"
)

// PaymentStatus 支付状态
type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "pending"   // 待支付
	PaymentStatusPaid      PaymentStatus = "paid"      // 已支付
	PaymentStatusFailed    PaymentStatus = "failed"    // 支付失败
	PaymentStatusClosed    PaymentStatus = "closed"    // 已关闭
	PaymentStatusRefunded  PaymentStatus = "refunded"  // 已退款
	PaymentStatusRefunding PaymentStatus = "refunding" // 退款中
)

var (
	ErrPaymentNotFound      = errors.New("支付记录不存在")
	ErrPaymentAlreadyPaid   = errors.New("订单已支付")
	ErrPaymentNotPaid       = errors.New("订单未支付")
	ErrPaymentAlreadyRefund = errors.New("订单已退款")
	ErrRefundAmountExceed   = errors.New("退款金额超过可退金额")
)

// PaymentRecord 支付记录（内存存储，生产环境应使用数据库）
type PaymentRecord struct {
	OutTradeNo     string        // 商户订单号
	TradeNo        string        // 支付宝交易号
	UserID         uint64        // 用户ID
	TotalAmount    string        // 订单金额
	PaidAmount     string        // 实付金额
	Status         PaymentStatus // 支付状态
	Subject        string        // 订单标题
	Passback       string        // 回传参数
	CreatedAt      time.Time     // 创建时间
	PaidAt         *time.Time    // 支付时间
	RefundedAmount string        // 已退款金额
	RefundedAt     *time.Time    // 退款时间
}

// RefundRecord 退款记录
type RefundRecord struct {
	OutRequestNo string    // 退款请求单号
	OutTradeNo   string    // 商户订单号
	RefundAmount string    // 退款金额
	RefundReason string    // 退款原因
	Status       string    // 退款状态
	CreatedAt    time.Time // 创建时间
}

// PaymentService 支付服务
type PaymentService struct {
	alipayClient   *alipay.Client
	logger         *zap.Logger
	payments       map[string]*PaymentRecord
	refunds        map[string]*RefundRecord
	mu             sync.RWMutex
	refundCounter  int64
}

// NewPaymentService 创建支付服务
func NewPaymentService(alipayClient *alipay.Client, logger *zap.Logger) *PaymentService {
	return &PaymentService{
		alipayClient: alipayClient,
		logger:       logger,
		payments:     make(map[string]*PaymentRecord),
		refunds:      make(map[string]*RefundRecord),
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
	s.mu.RLock()
	if existing, ok := s.payments[req.OutTradeNo]; ok {
		s.mu.RUnlock()
		if existing.Status == PaymentStatusPaid {
			return nil, ErrPaymentAlreadyPaid
		}
		// 如果订单存在但未支付，返回已有的支付链接
	} else {
		s.mu.RUnlock()
		// 创建新的支付记录
		record := &PaymentRecord{
			OutTradeNo:  req.OutTradeNo,
			UserID:      req.UserID,
			TotalAmount: req.Amount,
			Status:      PaymentStatusPending,
			Subject:     req.Subject,
			Passback:    req.Passback,
			CreatedAt:   time.Now(),
		}
		s.mu.Lock()
		s.payments[req.OutTradeNo] = record
		s.mu.Unlock()
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
	var err error

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

	// 更新支付记录
	s.mu.Lock()
	defer s.mu.Unlock()

	record, ok := s.payments[notifyData.OutTradeNo]
	if !ok {
		s.logger.Warn("收到未知订单的支付回调",
			zap.String("out_trade_no", notifyData.OutTradeNo),
		)
		return nil // 返回 success 避免支付宝重复通知
	}

	// 根据交易状态更新记录
	switch notifyData.TradeStatus {
	case "TRADE_SUCCESS", "TRADE_FINISHED":
		if record.Status == PaymentStatusPaid {
			return nil // 已处理过
		}
		record.Status = PaymentStatusPaid
		record.TradeNo = notifyData.TradeNo
		record.PaidAmount = notifyData.TotalAmount
		now := time.Now()
		record.PaidAt = &now
		s.logger.Info("支付成功",
			zap.String("out_trade_no", notifyData.OutTradeNo),
			zap.String("trade_no", notifyData.TradeNo),
			zap.String("amount", notifyData.TotalAmount),
		)
	case "TRADE_CLOSED":
		record.Status = PaymentStatusClosed
		s.logger.Info("交易关闭",
			zap.String("out_trade_no", notifyData.OutTradeNo),
		)
	}

	return nil
}

// QueryPayment 查询支付状态
func (s *PaymentService) QueryPayment(ctx context.Context, outTradeNo string) (*PaymentRecord, error) {
	// 先查本地记录
	s.mu.RLock()
	record, ok := s.payments[outTradeNo]
	s.mu.RUnlock()

	if !ok {
		return nil, ErrPaymentNotFound
	}

	// 如果本地状态是待支付，主动查询支付宝
	if record.Status == PaymentStatusPending {
		queryResult, err := s.alipayClient.QueryPayment(ctx, outTradeNo)
		if err != nil {
			s.logger.Warn("查询支付宝状态失败", zap.Error(err))
			return record, nil // 返回本地记录
		}

		// 更新本地状态
		s.mu.Lock()
		switch queryResult.TradeStatus {
		case "TRADE_SUCCESS", "TRADE_FINISHED":
			record.Status = PaymentStatusPaid
			record.TradeNo = queryResult.TradeNo
			record.PaidAmount = queryResult.TotalAmount
			now := time.Now()
			record.PaidAt = &now
		case "TRADE_CLOSED":
			record.Status = PaymentStatusClosed
		}
		s.mu.Unlock()
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
	s.mu.Lock()
	defer s.mu.Unlock()

	record, ok := s.payments[req.OutTradeNo]
	if !ok {
		return nil, ErrPaymentNotFound
	}

	if record.Status != PaymentStatusPaid {
		return nil, ErrPaymentNotPaid
	}

	// 生成退款请求单号
	s.refundCounter++
	outRequestNo := fmt.Sprintf("%s_R%06d", req.OutTradeNo, s.refundCounter)

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

	// 记录退款信息
	refundRecord := &RefundRecord{
		OutRequestNo: outRequestNo,
		OutTradeNo:   req.OutTradeNo,
		RefundAmount: req.RefundAmount,
		RefundReason: req.RefundReason,
		Status:       "SUCCESS",
		CreatedAt:    time.Now(),
	}
	s.refunds[outRequestNo] = refundRecord

	// 更新支付记录
	record.RefundedAmount = result.RefundFee
	now := time.Now()
	record.RefundedAt = &now
	record.Status = PaymentStatusRefunded

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

// GetPaymentRecord 获取支付记录
func (s *PaymentService) GetPaymentRecord(outTradeNo string) (*PaymentRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	record, ok := s.payments[outTradeNo]
	if !ok {
		return nil, ErrPaymentNotFound
	}

	return record, nil
}
