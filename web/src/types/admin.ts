// 管理后台相关类型定义（与后端模型一致）

// 管理员认证类型
export interface AdminInfo {
  id: number
  username: string
  nickname: string
  role: 'admin' | 'super_admin' | 'operator'
}

export interface AdminLoginRequest {
  username: string
  password: string
}

export interface AdminLoginResponse {
  access_token: string
  admin: AdminInfo
}

// 管理员详情（用于列表和详情页）
export interface AdminDetail {
  id: number
  username: string
  nickname: string
  role: 'super_admin' | 'admin' | 'operator'
  status: 'active' | 'disabled'
  last_login_at: string | null
  last_login_ip: string | null
  created_at: string
}

// 管理员列表响应
export interface AdminListResponse {
  admins: AdminDetail[]
  total: number
  page: number
}

// 管理员创建/更新表单
export interface AdminFormData {
  username: string
  password?: string
  nickname: string
  role: 'super_admin' | 'admin' | 'operator'
  status?: 'active' | 'disabled'
}

// 管理员个人信息（/admin/profile 响应）
export interface AdminProfile {
  id: number
  username: string
  nickname: string
  role: string
  status: string
  last_login_at: string | null
  last_login_ip: string | null
  created_at: string
}

// 修改密码表单
export interface ChangePasswordForm {
  old_password: string
  new_password: string
  confirm_password: string
}

// 订单状态类型
export type OrderStatusType = 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded'

// 管理后台商品类型（与后端 Product 模型一致，包含关联统计）
export interface AdminProduct {
  id: number
  name: string
  description: string
  detail: string | null
  detail_images?: string[]
  price: number
  original_price: number
  main_image: string
  images: string | null
  category_id: number
  category_name?: string
  brand_id: number | null
  brand_name?: string | null
  status: 'draft' | 'active' | 'inactive'
  stock: number
  sales: number
  sales_count: number  // 别名
  is_hot: boolean
  is_sale: boolean
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
  detail_images?: string[]
  main_image: string
  price: number
  original_price?: number
  category_id: number
  brand_id?: number
  status?: 'draft' | 'active' | 'inactive'
  stock?: number
  is_hot: boolean
  is_sale: boolean
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

// 管理后台订单类型（与后端 Order 模型一致，包含关联统计）
export interface AdminOrder {
  id: number
  order_no: string
  user_id: number
  user_name: string | null  // 用户名（关联查询）
  user_email: string | null  // 用户邮箱（关联查询）
  status: OrderStatusType
  total_amount: number
  discount_amount: number
  shipping_fee: number  // 运费
  pay_amount: number
  payment_method: string | null
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  items_count: number  // 商品数量（关联统计）
  remark: string
  cancel_reason: string | null  // 取消原因
  refund_reason: string | null  // 退款原因
  tracking_company: string | null  // 物流公司
  tracking_no: string | null  // 物流单号
  paid_at: string | null  // 支付时间
  shipped_at: string | null  // 发货时间
  delivered_at: string | null  // 送达时间
  completed_at: string | null  // 完成时间
  cancelled_at: string | null  // 取消时间
  refunded_at: string | null  // 退款时间
  created_at: string
  updated_at: string
  items?: AdminOrderItem[]
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
  tracking_company: string
  tracking_no: string
}

export interface RefundOrderRequest {
  refund_amount: number
  refund_reason: string
}

// 管理后台用户类型（与后端 User 模型一致，包含关联统计）
export interface AdminUser {
  id: number
  email: string
  phone: string | null
  username: string | null
  nickname: string | null
  avatar: string | null
  member_level: number  // 会员等级
  level: number  // 别名，兼容前端
  points: number
  status: string
  order_count: number  // 订单数量
  total_spent: number  // 总消费
  created_at: string
  updated_at: string
}

export interface AdminUserListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
}

// 管理后台分类类型（与后端 Category 模型一致，包含关联统计）
export interface AdminCategory {
  id: number
  name: string
  parent_id: number | null
  parent_name: string | null  // 父分类名称（关联查询）
  level: number
  icon: string | null
  sort: number
  status: string
  product_count: number  // 商品数量（关联统计）
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
  today_users: number
  pending_orders: number
  total_products: number
  total_users: number
  recent_orders?: AdminOrder[]
  sales_chart?: {
    date: string
    amount: number
  }[]
}

export interface AdminConfigItem {
  id: number
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'array'
  category: string
  description: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface AdminConfigPayload {
  key: string
  value: string
  type: AdminConfigItem['type']
  category: string
  description: string
  is_public: boolean
}

export interface AdminReview {
  id: number
  product_id: number
  product_name: string
  author: string
  handle: string
  avatar: string
  content: string
  rating: number
  sort: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface AdminReviewListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
  product_id?: number
}

export interface AdminReviewFormData {
  product_id: number
  author: string
  handle?: string
  avatar?: string
  content: string
  rating: number
  sort?: number
  status?: 'active' | 'inactive'
}
