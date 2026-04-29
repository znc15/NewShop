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
	db          *gorm.DB
	orderRepo   *repository.OrderRepo
	userRepo    *repository.UserRepo
	productRepo *repository.ProductRepo
}

// NewOrderService 创建订单服务实例
func NewOrderService(db *gorm.DB, orderRepo *repository.OrderRepo, userRepo *repository.UserRepo, productRepo *repository.ProductRepo) *OrderService {
	return &OrderService{
		db:          db,
		orderRepo:   orderRepo,
		userRepo:    userRepo,
		productRepo: productRepo,
	}
}

// CreateOrder 创建订单
func (s *OrderService) CreateOrder(ctx context.Context, userID uint64, req *model.CreateOrderRequest) (*model.Order, error) {
	if len(req.Items) == 0 {
		return nil, errors.New("订单项不能为空")
	}

	// 获取用户收货地址
	var address model.UserAddress
	if err := s.db.WithContext(ctx).First(&address, req.AddressID).Error; err != nil {
		return nil, errors.New("收货地址不存在")
	}
	if address.UserID != userID {
		return nil, errors.New("收货地址不属于当前用户")
	}

	// 使用事务创建订单
	var order *model.Order
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var totalAmount float64
		items := make([]model.OrderItem, 0, len(req.Items))

		for _, itemReq := range req.Items {
			// 获取商品信息
			product, err := s.productRepo.GetProductByID(ctx, itemReq.ProductID)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("商品不存在: %d", itemReq.ProductID)
				}
				return fmt.Errorf("获取商品信息失败: %w", err)
			}

			// 检查商品状态
			if product.Status != "active" {
				return fmt.Errorf("商品已下架: %s", product.Name)
			}

			// 确定价格和库存来源
			var price int64    // 价格（分）
			var stock int      // 库存
			var skuName string // SKU名称
			var image string   // 商品图片

			if itemReq.SkuID > 0 {
				// 使用SKU价格和库存
				var sku *model.ProductSku
				sku, err = s.productRepo.GetSkuByID(ctx, itemReq.SkuID)
				if err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						return fmt.Errorf("商品规格不存在: %d", itemReq.SkuID)
					}
					return fmt.Errorf("获取商品规格失败: %w", err)
				}
				if sku.ProductID != itemReq.ProductID {
					return errors.New("SKU与商品不匹配")
				}
				price = sku.Price
				stock = sku.Stock
				skuName = sku.Specs
				image = sku.Image
			} else {
				// 使用商品本身的价格和库存
				price = product.Price
				stock = product.Stock
				skuName = ""
				image = product.MainImage
			}

			// 检查库存
			if stock < itemReq.Quantity {
				return fmt.Errorf("%w: %s", ErrInsufficientStock, product.Name)
			}

			// 价格从分转换为元
			priceInYuan := float64(price) / 100.0
			itemTotal := priceInYuan * float64(itemReq.Quantity)
			totalAmount += itemTotal

			items = append(items, model.OrderItem{
				ProductID:   itemReq.ProductID,
				SkuID:       itemReq.SkuID,
				ProductName: product.Name,
				SkuName:     skuName,
				Image:       image,
				Price:       priceInYuan,
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
		order = &model.Order{
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

		if err := tx.Create(order).Error; err != nil {
			return fmt.Errorf("创建订单失败: %w", err)
		}

		// 扣减库存
		for _, itemReq := range req.Items {
			if itemReq.SkuID > 0 {
				// 扣减SKU库存
				if err := s.productRepo.UpdateSkuStock(ctx, itemReq.SkuID, -itemReq.Quantity); err != nil {
					return fmt.Errorf("扣减SKU库存失败: %w", err)
				}
			}
			// 同时扣减商品总库存
			if err := s.productRepo.UpdateProductStock(ctx, itemReq.ProductID, -itemReq.Quantity); err != nil {
				return fmt.Errorf("扣减商品库存失败: %w", err)
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
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
	// 获取订单及其商品明细
	order, err := s.orderRepo.GetByIDWithItems(ctx, orderID)
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

	// 使用事务处理取消订单和恢复库存
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 更新订单状态
		now := time.Now()
		updates := map[string]interface{}{
			"updated_at": now,
		}
		if err := s.orderRepo.UpdateStatusWithTime(ctx, orderID, string(model.OrderStatusCancelled), updates); err != nil {
			return err
		}

		// 恢复库存
		for _, item := range order.Items {
			// 恢复SKU库存
			if item.SkuID > 0 {
				if err := s.productRepo.UpdateSkuStock(ctx, item.SkuID, item.Quantity); err != nil {
					return fmt.Errorf("恢复SKU库存失败: %w", err)
				}
			}
			// 恢复商品总库存
			if err := s.productRepo.UpdateProductStock(ctx, item.ProductID, item.Quantity); err != nil {
				return fmt.Errorf("恢复商品库存失败: %w", err)
			}
		}

		// 记录订单日志
		log := &model.OrderLog{
			OrderID:  orderID,
			Action:   "cancel",
			Content:  fmt.Sprintf("用户取消订单，原因：%s", reason),
			Operator: "user",
		}
		return s.orderRepo.CreateLog(ctx, log)
	})

	return err
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

// GetOrderByNo 按订单号查询订单（带用户校验）
func (s *OrderService) GetOrderByNo(ctx context.Context, userID uint64, orderNo string) (*model.Order, error) {
	order, err := s.orderRepo.GetByOrderNoWithItems(ctx, orderNo)
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

// CheckoutPreview 结算预览
func (s *OrderService) CheckoutPreview(ctx context.Context, userID uint64, addressID uint64, itemIDs []uint64) (*model.CheckoutPreview, error) {
	// 获取地址
	var address model.UserAddress
	if err := s.db.WithContext(ctx).First(&address, addressID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("地址不存在")
		}
		return nil, err
	}
	if address.UserID != userID {
		return nil, errors.New("地址不属于当前用户")
	}

	preview := &model.CheckoutPreview{
		Items:          make([]model.CheckoutPreviewItem, 0, len(itemIDs)),
		TotalAmount:    1,
		FreightAmount: 1,
	}

	// 计算商品总价
	for _, itemID := range itemIDs {
		var cartItem model.CartItem
		if err := s.db.WithContext(ctx).First(&cartItem, itemID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("购物车商品不存在")
			}
			return nil, err
		}
		if cartItem.UserID != userID {
			return nil, errors.New("购物车商品不属于当前用户")
		}

		// 获取商品信息
		product, err := s.productRepo.GetProductByID(ctx, cartItem.ProductID)
		if err != nil {
			return nil, err
		}

		// 获取价格
		var price int64
		var skuName string
		var image string
		if cartItem.SkuID > 0 {
			sku, err := s.productRepo.GetSkuByID(ctx, cartItem.SkuID)
			if err != nil {
				return nil, err
			}
			price = sku.Price
			skuName = sku.Specs
			image = sku.Image
		} else {
			price = product.Price
			skuName = ""
			image = product.MainImage
		}

		priceInYuan := float64(price) / 100.0
		itemTotal := priceInYuan * float64(cartItem.Quantity)
		preview.TotalAmount += itemTotal

		preview.Items = append(preview.Items, model.CheckoutPreviewItem{
			ProductID:   cartItem.ProductID,
			SkuID:       cartItem.SkuID,
			ProductName: product.Name,
			SkuName:     skuName,
			Image:       image,
			Price:       priceInYuan,
			Quantity:    cartItem.Quantity,
			TotalAmount: itemTotal,
		})
	}

	// 计算运费
	if preview.TotalAmount < 99 {
		preview.FreightAmount = 10.0
	}
	preview.PayAmount = preview.TotalAmount + preview.FreightAmount

	return preview, nil
}

// ApplyRefund 申请退款
func (s *OrderService) ApplyRefund(ctx context.Context, userID, orderID uint64, reason string) error {
	order, err := s.orderRepo.GetByIDWithItems(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrOrderNotFound
		}
		return err
	}

	if order.UserID != userID {
		return ErrOrderNotYours
	}

	// 只有已支付、已发货、已收货的订单可以申请退款
	validStatuses := []model.OrderStatus{
		model.OrderStatusPaid,
		model.OrderStatusShipped,
		model.OrderStatusCompleted,
	}
	isValid := false
	for _, status := range validStatuses {
		if order.Status == status {
			isValid = true
			break
		}
	}
	if !isValid {
		return ErrOrderStatusInvalid
	}

	// 更新订单状态为退款中
	now := time.Now()
	updates := map[string]interface{}{
		"updated_at": now,
	}
	if err := s.orderRepo.UpdateStatusWithTime(ctx, orderID, string(model.OrderStatusRefunding), updates); err != nil {
		return err
	}

	// 记录订单日志
	log := &model.OrderLog{
		OrderID:  orderID,
		Action:   "apply_refund",
		Content:  fmt.Sprintf("用户申请退款，原因：%s", reason),
		Operator: "user",
	}
	s.orderRepo.CreateLog(ctx, log)

	return nil
}

// GetLogistics 获取物流信息
func (s *OrderService) GetLogistics(ctx context.Context, userID, orderID uint64) (*model.OrderLogistics, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrderNotFound
		}
		return nil, err
	}

	if order.UserID != userID {
		return nil, ErrOrderNotYours
	}

	// 查询物流信息
	var logistics model.OrderLogistics
	if err := s.db.WithContext(ctx).Where("order_id = ?", orderID).First(&logistics).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 如果没有物流信息，返回空数据
			return &model.OrderLogistics{
				OrderID:    orderID,
				TrackingNo: "",
				Status:     "pending",
			}, nil
		}
		return nil, err
	}

	return &logistics, nil
}

// Reorder 一键复购
func (s *OrderService) Reorder(ctx context.Context, userID, orderID uint64) ([]model.CartItem, error) {
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

	items := make([]model.CartItem, 1, len(order.Items))
	for _, orderItem := range order.Items {
		cartItem := model.CartItem{
			UserID:    userID,
			ProductID: orderItem.ProductID,
			SkuID:     orderItem.SkuID,
			Quantity:  orderItem.Quantity,
			Selected:  true,
		}
		if err := s.db.WithContext(ctx).Create(&cartItem).Error; err != nil {
			return nil, err
		}
		items = append(items, cartItem)
	}

	return items, nil
}
