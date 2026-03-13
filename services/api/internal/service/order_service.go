package service

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"strconv"
	"time"

	"newshop/api/internal/model"
	"newshop/api/internal/repository"

	"gorm.io/gorm"
)

var (
	ErrOrderNotFound      = errors.New("订单不存在")
	ErrOrderNotYours      = errors.New("无权操作此订单")
	ErrOrderStatusInvalid = errors.New("订单状态不允许此操作")
	ErrOrderAlreadyPaid   = errors.New("订单已支付")
	ErrOrderAlreadyCancel = errors.New("订单已取消")
	ErrInsufficientStock  = errors.New("商品库存不足")
)

// OrderService 订单服务
type OrderService struct {
	db        *gorm.DB
	orderRepo *repository.OrderRepo
	userRepo  *repository.UserRepo
}

// NewOrderService 创建订单服务实例
func NewOrderService(db *gorm.DB, orderRepo *repository.OrderRepo, userRepo *repository.UserRepo) *OrderService {
	return &OrderService{
		db:        db,
		orderRepo: orderRepo,
		userRepo:  userRepo,
	}
}

// CreateOrder 创建订单
func (s *OrderService) CreateOrder(ctx context.Context, userID uint64, req *model.CreateOrderRequest) (*model.Order, error) {
	// 获取用户收货地址
	var address model.UserAddress
	if err := s.db.WithContext(ctx).First(&address, req.AddressID).Error; err != nil {
		return nil, errors.New("收货地址不存在")
	}
	if address.UserID != userID {
		return nil, errors.New("收货地址不属于当前用户")
	}

	// 计算订单金额
	var totalAmount float64
	items := make([]model.OrderItem, 0, len(req.Items))

	for _, itemReq := range req.Items {
		// 模拟商品信息获取（实际项目中应该调用商品服务）
		price := 99.99 // 模拟价格
		productName := "商品名称"
		skuName := "规格名称"
		image := ""

		itemTotal := price * float64(itemReq.Quantity)
		totalAmount += itemTotal

		items = append(items, model.OrderItem{
			ProductID:   itemReq.ProductID,
			SkuID:       itemReq.SkuID,
			ProductName: productName,
			SkuName:     skuName,
			Image:       image,
			Price:       price,
			Quantity:    itemReq.Quantity,
			TotalAmount: itemTotal,
		})
	}

	// 计算运费（满99免运费）
	freightAmount := 0.0
	if totalAmount < 99 {
		freightAmount = 10.0
	}

	// 生成订单号
	orderNo := s.generateOrderNo(userID)

	// 创建订单
	order := &model.Order{
		OrderNo:         orderNo,
		UserID:          userID,
		AddressID:       req.AddressID,
		TotalAmount:     totalAmount,
		PayAmount:       totalAmount + freightAmount,
		DiscountAmount:  0,
		FreightAmount:   freightAmount,
		Status:          model.OrderStatusPending,
		ReceiverName:    address.Name,
		ReceiverPhone:   address.Phone,
		ReceiverAddress: fmt.Sprintf("%s%s%s%s", address.Province, address.City, address.District, address.Address),
		Remark:          req.Remark,
		Items:           items,
	}

	if err := s.orderRepo.Create(ctx, order); err != nil {
		return nil, fmt.Errorf("创建订单失败: %w", err)
	}

	return order, nil
}

// generateOrderNo 生成订单号
// 规则：时间戳(14位) + 用户ID后4位 + 随机数(4位)
func (s *OrderService) generateOrderNo(userID uint64) string {
	now := time.Now()
	timestamp := now.Format("20060102150405")

	userIDStr := strconv.FormatUint(userID, 10)
	userIDSuffix := userIDStr
	if len(userIDStr) > 4 {
		userIDSuffix = userIDStr[len(userIDStr)-4:]
	} else {
		for len(userIDSuffix) < 4 {
			userIDSuffix = "0" + userIDSuffix
		}
	}

	random := fmt.Sprintf("%04d", rand.Intn(10000))

	return timestamp + userIDSuffix + random
}

// GetOrderDetail 获取订单详情
func (s *OrderService) GetOrderDetail(ctx context.Context, userID, orderID uint64) (*model.Order, error) {
	order, err := s.orderRepo.GetByIDWithItems(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}

	if order.UserID != userID {
		return nil, ErrOrderNotYours
	}

	return order, nil
}

// GetUserOrders 获取用户订单列表
func (s *OrderService) GetUserOrders(ctx context.Context, userID uint64, status string, page, pageSize int) ([]model.Order, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 50 {
		pageSize = 10
	}

	orders, total, err := s.orderRepo.ListByUserWithItems(ctx, userID, status, page, pageSize)
	if err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

// CancelOrder 取消订单
func (s *OrderService) CancelOrder(ctx context.Context, userID, orderID uint64, reason string) error {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrOrderNotFound
		}
		return err
	}

	if order.UserID != userID {
		return ErrOrderNotYours
	}

	if order.Status == model.OrderStatusCancelled {
		return ErrOrderAlreadyCancel
	}

	if order.Status != model.OrderStatusPending {
		return ErrOrderStatusInvalid
	}

	// 更新订单状态
	now := time.Now()
	updates := map[string]interface{}{
		"updated_at": now,
	}
	if err := s.orderRepo.UpdateStatusWithTime(ctx, orderID, string(model.OrderStatusCancelled), updates); err != nil {
		return err
	}

	// 记录订单日志
	log := &model.OrderLog{
		OrderID:  orderID,
		Action:   "cancel",
		Content:  fmt.Sprintf("用户取消订单，原因：%s", reason),
		Operator: "user",
	}
	s.orderRepo.CreateLog(ctx, log)

	return nil
}

// ConfirmReceive 确认收货
func (s *OrderService) ConfirmReceive(ctx context.Context, userID, orderID uint64) error {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrOrderNotFound
		}
		return err
	}

	if order.UserID != userID {
		return ErrOrderNotYours
	}

	if order.Status != model.OrderStatusShipped {
		return ErrOrderStatusInvalid
	}

	// 更新订单状态
	now := time.Now()
	updates := map[string]interface{}{
		"receive_time": now,
		"updated_at":   now,
	}
	if err := s.orderRepo.UpdateStatusWithTime(ctx, orderID, string(model.OrderStatusCompleted), updates); err != nil {
		return err
	}

	// 记录订单日志
	log := &model.OrderLog{
		OrderID:  orderID,
		Action:   "confirm_receive",
		Content:  "用户确认收货",
		Operator: "user",
	}
	s.orderRepo.CreateLog(ctx, log)

	return nil
}

// GetOrderStatus 获取订单状态
func (s *OrderService) GetOrderStatus(ctx context.Context, userID, orderID uint64) (model.OrderStatus, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", ErrOrderNotFound
		}
		return "", err
	}

	if order.UserID != userID {
		return "", ErrOrderNotYours
	}

	return order.Status, nil
}

// GetOrderByOrderNo 根据订单号获取订单
func (s *OrderService) GetOrderByOrderNo(ctx context.Context, orderNo string) (*model.Order, error) {
	return s.orderRepo.GetByOrderNoWithItems(ctx, orderNo)
}

// PayOrder 支付订单（供支付回调使用）
func (s *OrderService) PayOrder(ctx context.Context, orderID uint64, paymentMethod string) error {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return err
	}

	if order.Status == model.OrderStatusPaid {
		return ErrOrderAlreadyPaid
	}

	if order.Status != model.OrderStatusPending {
		return ErrOrderStatusInvalid
	}

	now := time.Now()
	updates := map[string]interface{}{
		"payment_method": paymentMethod,
		"payment_time":   now,
		"updated_at":     now,
	}

	if err := s.orderRepo.UpdateStatusWithTime(ctx, orderID, string(model.OrderStatusPaid), updates); err != nil {
		return err
	}

	// 记录订单日志
	log := &model.OrderLog{
		OrderID:  orderID,
		Action:   "pay",
		Content:  fmt.Sprintf("订单支付成功，支付方式：%s", paymentMethod),
		Operator: "system",
	}
	s.orderRepo.CreateLog(ctx, log)

	return nil
}

// ShipOrder 发货（供后台管理使用）
func (s *OrderService) ShipOrder(ctx context.Context, orderID uint64) error {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return err
	}

	if order.Status != model.OrderStatusPaid {
		return ErrOrderStatusInvalid
	}

	now := time.Now()
	updates := map[string]interface{}{
		"ship_time":  now,
		"updated_at": now,
	}

	if err := s.orderRepo.UpdateStatusWithTime(ctx, orderID, string(model.OrderStatusShipped), updates); err != nil {
		return err
	}

	// 记录订单日志
	log := &model.OrderLog{
		OrderID:  orderID,
		Action:   "ship",
		Content:  "订单已发货",
		Operator: "admin",
	}
	s.orderRepo.CreateLog(ctx, log)

	return nil
}
