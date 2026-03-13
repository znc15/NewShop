package model

import (
	"time"

	"gorm.io/gorm"
)

// OrderStatus 订单状态枚举
type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"   // 待支付
	OrderStatusPaid      OrderStatus = "paid"      // 已支付
	OrderStatusShipped   OrderStatus = "shipped"   // 已发货
	OrderStatusDelivered OrderStatus = "delivered" // 已送达
	OrderStatusCancelled OrderStatus = "cancelled" // 已取消
	OrderStatusRefunded  OrderStatus = "refunded"  // 已退款
)

// Order 订单模型
type Order struct {
	ID              uint64         `gorm:"primaryKey" json:"id"`
	OrderNo         string         `gorm:"uniqueIndex;size:32;not null" json:"order_no"`
	UserID          uint64         `gorm:"not null;index" json:"user_id"`
	AddressID       uint64         `gorm:"not null" json:"address_id"`
	TotalAmount     float64        `gorm:"type:decimal(10,2);not null" json:"total_amount"`
	PayAmount       float64        `gorm:"type:decimal(10,2);not null" json:"pay_amount"`
	DiscountAmount  float64        `gorm:"type:decimal(10,2);default:0" json:"discount_amount"`
	FreightAmount   float64        `gorm:"type:decimal(10,2);default:0" json:"freight_amount"`
	Status          OrderStatus    `gorm:"size:20;default:pending;index" json:"status"`
	PaymentMethod   string         `gorm:"size:50" json:"payment_method"`
	PaymentTime     *time.Time     `json:"payment_time"`
	ShipTime        *time.Time     `json:"ship_time"`
	ReceiveTime     *time.Time     `json:"receive_time"`
	// 物流信息
	ExpressCompany string `gorm:"size:100" json:"express_company"` // 物流公司
	ExpressNo      string `gorm:"size:100" json:"express_no"`      // 物流单号
	// 退款信息
	RefundAmount float64    `gorm:"type:decimal(10,2);default:0" json:"refund_amount"` // 退款金额
	RefundReason string     `gorm:"size:500" json:"refund_reason"`                     // 退款原因
	RefundTime   *time.Time `json:"refund_time"`                                       // 退款时间
	// 收货人信息
	ReceiverName    string         `gorm:"size:100;not null" json:"receiver_name"`
	ReceiverPhone   string         `gorm:"size:50;not null" json:"receiver_phone"`
	ReceiverAddress string         `gorm:"size:500;not null" json:"receiver_address"`
	Remark          string         `gorm:"size:500" json:"remark"`
	Items           []OrderItem    `gorm:"foreignKey:OrderID" json:"items"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (Order) TableName() string {
	return "orders"
}

// OrderItem 订单商品明细
type OrderItem struct {
	ID          uint64         `gorm:"primaryKey" json:"id"`
	OrderID     uint64         `gorm:"not null;index" json:"order_id"`
	ProductID   uint64         `gorm:"not null" json:"product_id"`
	SkuID       uint64         `gorm:"not null" json:"sku_id"`
	ProductName string         `gorm:"size:200;not null" json:"product_name"`
	SkuName     string         `gorm:"size:200" json:"sku_name"`
	Image       string         `gorm:"size:500" json:"image"`
	Price       float64        `gorm:"type:decimal(10,2);not null" json:"price"`
	Quantity    int            `gorm:"not null" json:"quantity"`
	TotalAmount float64        `gorm:"type:decimal(10,2);not null" json:"total_amount"`
	Attributes  JSONB          `gorm:"type:jsonb" json:"attributes"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名
func (OrderItem) TableName() string {
	return "order_items"
}

// CreateOrderRequest 创建订单请求
type CreateOrderRequest struct {
	AddressID uint64               `json:"address_id" binding:"required"`
	Items     []CreateOrderItemReq `json:"items" binding:"required,min=1"`
	Remark    string               `json:"remark"`
	CouponID  uint64               `json:"coupon_id"`
}

// CreateOrderItemReq 创建订单商品项请求
type CreateOrderItemReq struct {
	ProductID uint64 `json:"product_id" binding:"required"`
	SkuID     uint64 `json:"sku_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,min=1"`
}

// OrderStatusTransition 订单状态流转记录
type OrderStatusTransition struct {
	ID           uint64    `gorm:"primaryKey" json:"id"`
	OrderID      uint64    `gorm:"not null;index" json:"order_id"`
	FromStatus   string    `gorm:"size:20" json:"from_status"`
	ToStatus     string    `gorm:"size:20;not null" json:"to_status"`
	OperatorID   uint64    `json:"operator_id"`
	OperatorType string    `gorm:"size:20" json:"operator_type"`
	Remark       string    `gorm:"size:500" json:"remark"`
	CreatedAt    time.Time `json:"created_at"`
}

// TableName 指定表名
func (OrderStatusTransition) TableName() string {
	return "order_status_transitions"
}

// OrderLog 订单日志
type OrderLog struct {
	ID        uint64    `gorm:"primaryKey" json:"id"`
	OrderID   uint64    `gorm:"not null;index" json:"order_id"`
	Action    string    `gorm:"size:50;not null" json:"action"`
	Content   string    `gorm:"size:500" json:"content"`
	Operator  string    `gorm:"size:100" json:"operator"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName 指定表名
func (OrderLog) TableName() string {
	return "order_logs"
}

// CanTransitionTo 检查订单是否可以转换到目标状态
func (o *Order) CanTransitionTo(target OrderStatus) bool {
	transitions := map[OrderStatus][]OrderStatus{
		OrderStatusPending:   {OrderStatusPaid, OrderStatusCancelled},
		OrderStatusPaid:      {OrderStatusShipped, OrderStatusCancelled, OrderStatusRefunded},
		OrderStatusShipped:   {OrderStatusDelivered, OrderStatusRefunded},
		OrderStatusDelivered: {OrderStatusRefunded},
		OrderStatusCancelled: {},
		OrderStatusRefunded:  {},
	}

	allowed, exists := transitions[o.Status]
	if !exists {
		return false
	}

	for _, s := range allowed {
		if s == target {
			return true
		}
	}
	return false
}
