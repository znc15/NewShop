import http from './http'
import type {
  CartResponse,
  CartItem,
  AddCartRequest,
  UpdateCartRequest,
  BatchSelectRequest,
} from '@/types/cart'

export const cartService = {
  // 获取购物车
  getCart(): Promise<CartResponse> {
    return http.get('/cart')
  },

  // 添加商品到购物车
  addToCart(data: AddCartRequest): Promise<CartItem> {
    return http.post('/cart', data)
  },

  // 更新购物车商品
  updateCartItem(itemId: number, data: UpdateCartRequest): Promise<CartItem> {
    return http.put(`/cart/${itemId}`, data)
  },

  // 删除购物车商品
  removeFromCart(itemId: number): Promise<void> {
    return http.delete(`/cart/${itemId}`)
  },

  // 批量删除购物车商品
  batchRemove(itemIds: number[]): Promise<void> {
    return http.post('/cart/batch-delete', { item_ids: itemIds })
  },

  // 批量删除购物车商品（别名）
  batchDelete(itemIds: number[]): Promise<void> {
    return this.batchRemove(itemIds)
  },

  // 清空购物车
  clearCart(): Promise<void> {
    return http.delete('/cart/clear')
  },

  // 选中/取消选中商品
  selectCartItem(itemId: number, selected: boolean): Promise<void> {
    return http.put(`/cart/${itemId}/select`, { selected })
  },

  // 批量选中/取消选中
  batchSelect(data: BatchSelectRequest): Promise<void> {
    return http.post('/cart/batch-select', data)
  },

  // 全选/取消全选
  selectAllCart(selected: boolean): Promise<void> {
    return http.put('/cart/select-all', { selected })
  },

  // 获取购物车商品数量
  getCartCount(): Promise<{ count: number }> {
    return http.get('/cart/count')
  },
}

export default cartService
