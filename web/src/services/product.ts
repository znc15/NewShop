import http from './http'
import type { Product, ProductListParams, PaginatedResponse, Category, SearchResult } from '@/types'

export const productService = {
  // 获取商品列表
  getProducts(params: ProductListParams): Promise<PaginatedResponse<Product>> {
    return http.get('/products', params as Record<string, unknown>)
  },

  // 获取商品详情
  getProduct(id: number): Promise<Product> {
    return http.get(`/products/${id}`)
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
