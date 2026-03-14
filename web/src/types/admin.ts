// 管理后台相关类型定义（与后端模型一致）

// 订单状态类型
export type OrderStatusType = 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded'

// 管理后台商品类型（与后端 Product 模型一致）
export interface AdminProduct {
  id: number
  name: string
  description: string
  detail: string | null
  price: number
  original_price: number
  main_image: string
  images: string
  category_id: number
  category_name?: string
  brand_id: number | null
  brand_name?: string | null
  status: 'draft' | 'active' | 'inactive'
  stock: number
  sales: number
  sort: number
  skus?: AdminProductSku[]
  attrs?: AdminProductAttr[]
  created_at: string
  updated_at: string
}

export interface AdminProductSku {
  id: number
  product_id: number
  sku_code: string
  specs: string
  price: number
  stock: number
  image: string | null
  created_at: string
  updated_at: string
}

export interface AdminProductAttr {
  id: number
  product_id: number
  name: string
  value: string
  sort: number
}

export interface AdminProductListParams {
  page?: number
  page_size?: number
  keyword?: string
  category_id?: number
  status?: string
  sort_by?: 'created_at' | 'price' | 'sales' | 'stock'
  sort_order?: 'asc' | 'desc'
}

export interface AdminProductFormData {
  name: string
  description: string
  detail?: string
  price: number
  original_price?: number
  category_id: number
  brand_id?: number
  status?: 'draft' | 'active' | 'inactive'
  stock?: number
  sort?: number
  images: string[]
  skus: {
    sku_code: string
    specs: string
    price: number
    stock: number
    image?: string
  }[]
  attrs?: {
    name: string
    value: string
    sort?: number
  }[]
}

// 管理后台订单类型（与后端 Order 模型一致）
export interface AdminOrder {
  id: number
  order_no: string
  user_id: number
  status: OrderStatusType
  total_amount: number
  pay_amount: number
  discount_amount: number
  freight_amount: number
  payment_method: string | null
  payment_time: string | null
  ship_time: string | null
  receive_time: string | null
  express_company: string | null
  express_no: string | null
  refund_amount: number
  refund_reason: string | null
  refund_time: string | null
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  remark: string
  items?: AdminOrderItem[]
  created_at: string
  updated_at: string
}

export interface AdminOrderItem {
  id: number
  order_id: number
  product_id: number
  sku_id: number
  product_name: string
  sku_name: string | null
  image: string | null
  price: number
  quantity: number
  total_amount: number
  attributes: Record<string, unknown> | null
  created_at: string
}

export interface AdminOrderListParams {
  page?: number
  page_size?: number
  order_no?: string
  status?: string
  user_id?: number
  start_date?: string
  end_date?: string
}

export interface ShipOrderRequest {
  express_company: string
  express_no: string
}

export interface RefundOrderRequest {
  reason: string
}

// 管理后台用户类型（与后端 User 模型一致）
export interface AdminUser {
  id: number
  email: string
  phone: string | null
  nickname: string | null
  avatar: string | null
  member_level: number
  points: number
  status: string
  created_at: string
  updated_at: string
}

export interface AdminUserListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
}

// 管理后台分类类型（与后端 Category 模型一致）
export interface AdminCategory {
  id: number
  name: string
  parent_id: number | null
  level: number
  icon: string | null
  sort: number
  status: string
  children?: AdminCategory[]
  created_at: string
  updated_at: string
}

export interface AdminCategoryFormData {
  name: string
  parent_id?: number
  level?: number
  icon?: string
  sort: number
  status?: string
}

// 管理后台优惠券类型（与后端 Coupon 模型一致）
export interface AdminCoupon {
  id: number
  code: string
  name: string
  type: 'fixed' | 'percent'
  value: number
  min_amount: number
  max_discount: number | null
  total_count: number
  used_count: number
  start_time: string
  end_time: string
  status: string
  created_at: string
  updated_at: string
}

export interface AdminCouponListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
}

export interface AdminCouponFormData {
  code: string
  name: string
  type: 'fixed' | 'percent'
  value: number
  min_amount: number
  max_discount?: number
  total_count: number
  start_time: string
  end_time: string
  status?: string
}

// 分页响应类型
export interface AdminPaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// 仪表盘统计数据
export interface DashboardStats {
  today_orders: number
  today_sales: number
  new_users: number
  pending_orders: number
  product_count: number
  user_count: number
  recent_orders: AdminOrder[]
  sales_chart: {
    date: string
    amount: number
  }[]
}
