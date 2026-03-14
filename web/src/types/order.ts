// 订单相关类型定义

// 订单状态常量
export const OrderStatus = {
  Pending: 'pending',       // 待支付
  Paid: 'paid',             // 已支付
  Shipped: 'shipped',       // 已发货
  Delivered: 'delivered',   // 已送达
  Completed: 'completed',   // 已完成
  Cancelled: 'cancelled',   // 已取消
  Refunded: 'refunded',     // 已退款
} as const

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus]

// 订单状态显示名称
export const OrderStatusLabels: Record<string, string> = {
  [OrderStatus.Pending]: '待支付',
  [OrderStatus.Paid]: '已支付',
  [OrderStatus.Shipped]: '已发货',
  [OrderStatus.Delivered]: '已送达',
  [OrderStatus.Completed]: '已完成',
  [OrderStatus.Cancelled]: '已取消',
  [OrderStatus.Refunded]: '已退款',
}

// 订单状态颜色
export const OrderStatusColors: Record<string, string> = {
  [OrderStatus.Pending]: 'text-yellow-600 bg-yellow-50',
  [OrderStatus.Paid]: 'text-blue-600 bg-blue-50',
  [OrderStatus.Shipped]: 'text-indigo-600 bg-indigo-50',
  [OrderStatus.Delivered]: 'text-purple-600 bg-purple-50',
  [OrderStatus.Completed]: 'text-green-600 bg-green-50',
  [OrderStatus.Cancelled]: 'text-gray-600 bg-gray-50',
  [OrderStatus.Refunded]: 'text-red-600 bg-red-50',
}

// 订单商品（与后端 OrderItem 模型一致）
export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  sku_id: number
  product_name: string
  sku_name: string | null
  sku_specs: string | null  // 规格描述
  sku_code: string | null  // SKU 编码
  image: string | null
  product_image: string | null  // 别名
  price: number
  quantity: number
  total_amount: number
  total_price: number  // 别名
  attributes: Record<string, unknown> | null
  created_at: string
}

// 收货地址（用于结算预览，非订单内嵌）
export interface OrderAddress {
  name: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  full_address: string
}

// 收货地址（嵌套在订单中）
export interface OrderReceiver {
  name: string
  phone: string
  address: string
}

// 订单详情（与后端 Order 模型一致）
export interface Order {
  id: number
  order_no: string
  user_id: number
  address_id: number
  status: OrderStatusType
  total_amount: number
  pay_amount: number
  discount_amount: number
  freight_amount: number
  shipping_fee: number  // 别名，兼容 freight_amount
  coupon_discount: number  // 优惠券折扣
  points_discount: number  // 积分抵扣
  payment_method: string | null
  payment_time: string | null
  paid_at: string | null  // 别名
  ship_time: string | null
  shipped_at: string | null  // 别名
  receive_time: string | null
  delivered_at: string | null  // 别名
  completed_at: string | null  // 完成时间
  cancelled_at: string | null  // 取消时间
  express_company: string | null
  express_no: string | null
  refund_amount: number
  refund_reason: string | null
  cancel_reason: string | null  // 取消原因
  refund_time: string | null
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  address: OrderAddress  // 收货地址详情（前端聚合）
  remark: string
  items: OrderItem[]
  created_at: string
  updated_at: string
}

// 订单列表项（简化版）
export interface OrderListItem {
  id: number
  order_no: string
  status: OrderStatusType
  total_amount: number
  pay_amount: number
  freight_amount: number
  items: {
    product_id: number
    product_name: string
    product_image: string  // 别名
    image: string
    quantity: number
    price: number
  }[]
  created_at: string
}

// 创建订单请求（与后端 CreateOrderRequest 一致）
export interface CreateOrderRequest {
  address_id: number
  items: {
    product_id: number
    sku_id: number
    quantity: number
  }[]
  remark?: string
  coupon_id?: number
}

// 创建订单响应
export interface CreateOrderResponse {
  order_id: number
  order_no: string
  pay_amount: number
}

// 订单列表请求参数
export interface OrderListParams {
  status?: OrderStatusType | ''
  page?: number
  page_size?: number
}

// 订单列表响应
export interface OrderListResponse {
  items: OrderListItem[]
  total: number
  page: number
  page_size: number
}

// 取消订单请求
export interface CancelOrderRequest {
  reason: string
}

// 结算预览商品项
export interface CheckoutItem {
  cart_item_id: number
  product_id: number
  product_name: string
  product_image: string
  sku_id: number
  sku_specs: string
  price: number
  quantity: number
  subtotal: number
  stock: number
}

// 结算预览响应
export interface CheckoutPreviewResponse {
  items: CheckoutItem[]
  total_amount: number
  freight_amount: number
  shipping_fee: number  // 别名
  discount_amount: number
  pay_amount: number
  default_address: OrderAddress | null
  available_coupons: {
    id: number
    code: string
    name: string
    type: string
    value: number
    min_amount: number
    discount: number
  }[]
  user_points: number
  max_points_usable: number
}
