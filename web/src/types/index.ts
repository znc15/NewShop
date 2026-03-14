// 用户相关类型（与后端 User 模型一致）
export interface User {
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

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  nickname: string
  email: string
  password: string
  phone?: string
}

export interface AuthResponse {
  user: User
  token: string
}

// 商品相关类型（与后端 Product 模型一致）
export interface Product {
  id: number
  name: string
  description: string
  detail: string | null
  price: number
  original_price: number
  main_image: string
  images: string[]
  category_id: number
  category?: Category
  brand_id: number | null
  brand?: Brand
  skus: ProductSku[]
  attrs?: ProductAttr[]
  status: ProductStatus
  stock: number
  sales: number
  sort: number
  created_at: string
  updated_at: string
}

export interface ProductSku {
  id: number
  product_id: number
  sku_code: string
  specs: Record<string, string> | string  // 兼容后端 JSON 字符串和前端解析后的对象
  price: number
  original_price?: number
  stock: number
  image: string | null
  created_at: string
  updated_at: string
}

export interface ProductAttr {
  id: number
  product_id: number
  name: string
  value: string
  sort: number
}

// 前端规格展示用类型（从 SKU 聚合生成）
export interface ProductSpec {
  id: number
  product_id: number
  name: string
  values: string[]
}

export interface Category {
  id: number
  name: string
  parent_id: number | null
  parent?: Category
  children?: Category[]
  level: number
  icon: string | null
  sort: number
  status: string
  created_at: string
  updated_at: string
}

export interface Brand {
  id: number
  name: string
  logo: string | null
  description: string | null
  sort: number
  status: string
  created_at: string
  updated_at: string
}

export type ProductStatus = 'draft' | 'active' | 'inactive'

// 商品列表请求参数
export interface ProductListParams {
  page?: number
  page_size?: number
  category_id?: number
  brand_id?: number
  keyword?: string
  min_price?: number
  max_price?: number
  sort_by?: 'price' | 'sales' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// 搜索相关
export interface SearchResult {
  products: Product[]
  categories: Category[]
  total: number
}

export interface SearchSuggestion {
  keyword: string
  type: 'product' | 'category' | 'history'
}

// API 响应通用类型
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface ApiError {
  code: number
  message: string
  details?: Record<string, string[]>
}

// 重新导出购物车和订单类型
export * from './cart'
export * from './order'
export * from './user'

// 优惠券相关类型
export interface Coupon {
  id: number | string
  name: string
  code: string
  type: 'fixed' | 'percent' | 'no_threshold'
  discount_value: number
  min_order_amount: number
  max_discount?: number
  valid_from: string
  valid_to: string
  status: 'active' | 'expired' | 'used' | 'claimed'
}

// 积分记录类型
export interface PointRecord {
  id: number
  user_id: number
  points: number
  type: 'earn' | 'spend'
  remark: string
  created_at: string
}
