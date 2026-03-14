// 管理后台相关类型定义

// 管理后台商品类型
export interface AdminProduct {
  id: number
  name: string
  description: string
  price: number
  original_price: number | null
  main_image: string
  category_id: number
  category_name: string
  brand_id: number | null
  brand_name: string | null
  status: 'draft' | 'active' | 'inactive' | 'sold_out'
  stock: number
  sales_count: number
  created_at: string
  updated_at: string
}

export interface AdminProductListParams {
  page?: number
  page_size?: number
  keyword?: string
  category_id?: number
  status?: string
  sort_by?: 'created_at' | 'price' | 'sales_count' | 'stock'
  sort_order?: 'asc' | 'desc'
}

export interface AdminProductFormData {
  name: string
  description: string
  price: number
  original_price?: number
  category_id: number
  brand_id?: number
  status: 'draft' | 'active' | 'inactive'
  images: string[]
  skus: {
    sku_code: string
    specs: Record<string, string>
    price: number
    original_price?: number
    stock: number
    image?: string
  }[]
}

// 管理后台订单类型
export interface AdminOrder {
  id: number
  order_no: string
  user_id: number
  user_name: string
  user_email: string
  status: string
  total_amount: number
  discount_amount: number
  shipping_fee: number
  pay_amount: number
  payment_method: string | null
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  items_count: number
  remark: string
  cancel_reason: string | null
  refund_reason: string | null
  tracking_company: string | null
  tracking_no: string | null
  paid_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  refunded_at: string | null
  created_at: string
  updated_at: string
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
  tracking_company: string
  tracking_no: string
}

export interface RefundOrderRequest {
  reason: string
}

// 管理后台用户类型
export interface AdminUser {
  id: number
  username: string
  email: string
  phone: string | null
  avatar: string | null
  nickname: string | null
  status: 'active' | 'disabled'
  level: number
  points: number
  total_spent: number
  order_count: number
  created_at: string
  updated_at: string
}

export interface AdminUserListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
}

// 管理后台分类类型
export interface AdminCategory {
  id: number
  name: string
  parent_id: number | null
  parent_name: string | null
  icon: string | null
  sort: number
  status: 'active' | 'inactive'
  children?: AdminCategory[]
  product_count: number
  created_at: string
  updated_at: string
}

export interface AdminCategoryFormData {
  name: string
  parent_id?: number
  icon?: string
  sort: number
  status: 'active' | 'inactive'
}

// 管理后台优惠券类型
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
  status: 'active' | 'inactive' | 'expired'
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
  status: 'active' | 'inactive'
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
