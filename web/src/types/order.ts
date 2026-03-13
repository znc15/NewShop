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

// 订单商品
export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  sku_id: number
  product_name: string
  sku_specs: string
  sku_code: string
  price: number
  quantity: number
  total_price: number
  product_image: string
}

// 收货地址
export interface OrderAddress {
  name: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  full_address: string
}

// 订单详情
export interface Order {
  id: number
  order_no: string
  user_id: number
  status: OrderStatusType
  total_amount: number
  discount_amount: number
  shipping_fee: number
  pay_amount: number
  coupon_id: number | null
  coupon_code: string | null
  coupon_discount: number
  points_used: number
  points_discount: number
  address: OrderAddress
  remark: string
  cancel_reason: string
  paid_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  completed_at: string | null
  cancelled_at: string | null
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
  items: {
    product_id: number
    product_name: string
    product_image: string
    quantity: number
    price: number
  }[]
  created_at: string
}

// 创建订单请求
export interface CreateOrderRequest {
  address_id: number
  cart_item_ids?: number[]
  buy_now_item?: {
    product_id: number
    sku_id: number
    quantity: number
  }
  coupon_id?: number
  use_points?: number
  remark?: string
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
  shipping_fee: number
  default_address: OrderAddress | null
  available_coupons: {
    id: number
    code: string
    name: string
    discount: number
    min_amount: number
  }[]
  user_points: number
  max_points_usable: number
}
