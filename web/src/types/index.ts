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
  geetest_challenge?: string
  geetest_validate?: string
  geetest_seccode?: string
  gen_time?: string
}

export interface RegisterRequest {
  nickname: string
  email: string
  password: string
  phone?: string
  geetest_challenge?: string
  geetest_validate?: string
  geetest_seccode?: string
  gen_time?: string
}

export interface SendCodeRequest {
  email: string
  type: 'register' | 'login' | 'reset'
  geetest_challenge?: string
  geetest_validate?: string
  geetest_seccode?: string
  gen_time?: string
}

export interface ResetPasswordRequest {
  email: string
  code: string
  password?: string
  geetest_challenge?: string
  geetest_validate?: string
  geetest_seccode?: string
  gen_time?: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

// 商品相关类型（与后端 Product 模型一致）
export interface Product {
  id: number
  name: string
  description: string
  detail: string | null
  detail_images?: string[] | string | null
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
  is_hot: boolean
  is_sale: boolean
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

// 商品详情区块类型
export type DetailBlockType = 'text' | 'image' | 'divider'

export interface DetailBlock {
  id: string
  type: DetailBlockType
  title?: string
  content?: string  // text 类型为文本内容，image 类型为图片 URL
  alt?: string      // image 类型的 alt 文本
}

export interface DetailBlocks {
  type: 'blocks'
  blocks: DetailBlock[]
}

export interface ProductAttr {
  id: number
  product_id: number
  name: string
  value: string
  sort: number
}

export interface ProductReview {
  id: number
  product_id: number
  author: string
  handle: string
  avatar: string
  content: string
  rating: number
  created_at: string
  updated_at: string
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
  response?: {
    data?: Partial<ApiResponse>
  }
}

export interface SeoConfig {
  siteTitle: string
  siteDescription: string
  siteKeywords: string
  ogImage: string
  googleVerify: string
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
