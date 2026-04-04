import http from './http'
import type { Product, ProductListParams, PaginatedResponse, Category, Brand, SearchResult, ProductReview } from '@/types'

export const productService = {
  // 获取商品列表
  async getProducts(params: ProductListParams): Promise<PaginatedResponse<Product>> {
    const res = await http.get<{ products: Product[]; page: number; page_size: number; total: number }>('/products', params as Record<string, unknown>)
    return {
      data: res.products || [],
      total: res.total || 0,
      page: res.page || 1,
      page_size: res.page_size || 20,
      total_pages: Math.ceil((res.total || 0) / (res.page_size || 20)),
    }
  },

  // 获取商品详情
  getProduct(id: number): Promise<Product> {
    return http.get(`/products/${id}`)
  },

  // 获取商品评价
  async getProductReviews(id: number, limit: number = 20): Promise<ProductReview[]> {
    const res = await http.get<{ reviews: ProductReview[] }>(`/products/${id}/reviews`, { limit })
    return res.reviews || []
  },

  // 获取分类列表
  async getCategories(): Promise<Category[]> {
    const res = await http.get<{ categories: Category[] }>('/categories')
    return res.categories || []
  },

  // 获取分类树
  async getCategoryTree(): Promise<Category[]> {
    const res = await http.get<{ categories: Category[] }>('/categories/tree')
    return res.categories || []
  },

  // 获取品牌列表
  async getBrands(): Promise<Brand[]> {
    const res = await http.get<{ brands: Brand[] }>('/brands', { page: 1, page_size: 200 })
    return res.brands || []
  },

  // 搜索商品
  search(keyword: string, params?: ProductListParams): Promise<SearchResult> {
    return http.get('/products/search', { keyword, ...params } as Record<string, unknown>)
  },

  // 获取热门商品
  async getHotProducts(limit?: number): Promise<Product[]> {
    const res = await http.get<{ products: Product[] }>('/products/hot', { limit })
    return res.products || []
  },

  // 获取新品推荐
  async getNewProducts(limit?: number): Promise<Product[]> {
    const res = await http.get<{ products: Product[] }>('/products/new', { limit })
    return res.products || []
  },

  // 获取相关商品
  getRelatedProducts(productId: number, limit?: number): Promise<Product[]> {
    return http.get(`/products/${productId}/related`, { limit })
  },
}

export default productService
