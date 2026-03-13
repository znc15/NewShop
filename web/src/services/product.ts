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
  getCategories(): Promise<Category[]> {
    return http.get('/categories')
  },

  // 获取分类树
  getCategoryTree(): Promise<Category[]> {
    return http.get('/categories/tree')
  },

  // 搜索商品
  search(keyword: string, params?: ProductListParams): Promise<SearchResult> {
    return http.get('/products/search', { keyword, ...params } as Record<string, unknown>)
  },

  // 获取热门商品
  getHotProducts(limit?: number): Promise<Product[]> {
    return http.get('/products/hot', { limit })
  },

  // 获取新品推荐
  getNewProducts(limit?: number): Promise<Product[]> {
    return http.get('/products/new', { limit })
  },

  // 获取相关商品
  getRelatedProducts(productId: number, limit?: number): Promise<Product[]> {
    return http.get(`/products/${productId}/related`, { limit })
  },
}

export default productService
