// 用户相关类型
export interface User {
  id: number
  username: string
  email: string
  phone?: string
  avatar?: string
  nickname?: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  phone?: string
}

export interface AuthResponse {
  user: User
  token: string
}

// 商品相关类型
export interface Product {
  id: number
  name: string
  description: string
  price: number
  originalPrice?: number
  images: string[]
  mainImage: string
  categoryId: number
  category?: Category
  brandId?: number
  brand?: Brand
  skus: ProductSku[]
  specs: ProductSpec[]
  status: ProductStatus
  salesCount: number
  rating: number
  reviewCount: number
  createdAt: string
  updatedAt: string
}

export interface ProductSku {
  id: number
  productId: number
  skuCode: string
  specs: Record<string, string>
  price: number
  originalPrice?: number
  stock: number
  image?: string
}

export interface ProductSpec {
  id: number
  productId: number
  name: string
  values: string[]
}

export interface Category {
  id: number
  name: string
  parentId?: number
  parent?: Category
  children?: Category[]
  icon?: string
  sort: number
}

export interface Brand {
  id: number
  name: string
  logo?: string
  description?: string
}

export type ProductStatus = 'draft' | 'active' | 'inactive' | 'sold_out'

// 商品列表请求参数
export interface ProductListParams {
  page?: number
  pageSize?: number
  categoryId?: number
  brandId?: number
  keyword?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price' | 'sales' | 'rating' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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
