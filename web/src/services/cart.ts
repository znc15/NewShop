import http from './http'
import { productService } from './product'
import type {
  CartApiResponse,
  CartResponse,
  CartItem,
  CartItemProduct,
  CartItemRaw,
  CartItemSku,
  AddCartRequest,
  UpdateCartRequest,
  BatchSelectRequest,
} from '@/types/cart'
import type { Product, ProductSku } from '@/types'

function formatSkuSpecs(specs: ProductSku['specs']): string {
  if (typeof specs === 'string') {
    return specs
  }

  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' / ')
}

function buildFallbackProduct(productId: number): CartItemProduct {
  return {
    id: productId,
    name: `商品 #${productId}`,
    main_image: '/placeholder.png',
    price: 0,
    original_price: 0,
    stock: 0,
    status: 'unknown',
  }
}

function buildCartSku(sku: ProductSku | undefined): CartItemSku | null {
  if (!sku) {
    return null
  }

  return {
    id: sku.id,
    sku_code: sku.sku_code,
    specs: formatSkuSpecs(sku.specs),
    price: sku.price,
    stock: sku.stock,
    image: sku.image,
  }
}

function buildCartItem(rawItem: CartItemRaw, product?: Product): CartItem {
  const matchedSku = product?.skus?.find((sku) => sku.id === rawItem.sku_id)

  return {
    id: rawItem.id,
    user_id: rawItem.user_id,
    product_id: rawItem.product_id,
    sku_id: rawItem.sku_id,
    quantity: rawItem.quantity,
    selected: rawItem.selected,
    product: product
      ? {
          id: product.id,
          name: product.name,
          main_image: product.main_image || '/placeholder.png',
          price: product.price,
          original_price: product.original_price,
          stock: product.stock,
          status: String(product.status),
        }
      : buildFallbackProduct(rawItem.product_id),
    sku: buildCartSku(matchedSku),
    created_at: rawItem.created_at || '',
    updated_at: rawItem.updated_at || '',
  }
}

function calculateCartSummary(items: CartItem[], countFromApi?: number): CartResponse {
  const totalCount = typeof countFromApi === 'number'
    ? countFromApi
    : items.reduce((sum, item) => sum + item.quantity, 0)
  const selectedItems = items.filter((item) => item.selected)
  const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + (item.sku?.price ?? item.product.price) * item.quantity, 0)
  const selectedPrice = selectedItems.reduce((sum, item) => sum + (item.sku?.price ?? item.product.price) * item.quantity, 0)

  return {
    items,
    total_count: totalCount,
    selected_count: selectedCount,
    total_price: totalPrice,
    selected_price: selectedPrice,
  }
}

async function hydrateCartItems(items: CartItemRaw[]): Promise<CartItem[]> {
  const productIds = [...new Set(items.map((item) => item.product_id))]
  const productResults = await Promise.allSettled(productIds.map((productId) => productService.getProduct(productId)))
  const productMap = new Map<number, Product>()

  productResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      productMap.set(productIds[index], result.value)
    }
  })

  return items.map((item) => buildCartItem(item, productMap.get(item.product_id)))
}

export const cartService = {
  // 获取购物车
  async getCart(): Promise<CartResponse> {
    const response = await http.get<CartApiResponse>('/cart')
    const items = await hydrateCartItems(response.items || [])
    return calculateCartSummary(items, response.count)
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
    return http.post('/cart/batch-remove', { ids: itemIds })
  },

  // 批量删除购物车商品（别名）
  batchDelete(itemIds: number[]): Promise<void> {
    return this.batchRemove(itemIds)
  },

  // 清空购物车
  clearCart(): Promise<void> {
    return http.delete('/cart')
  },

  // 选中/取消选中商品
  selectCartItem(itemId: number, selected: boolean): Promise<void> {
    return http.put(`/cart/${itemId}/selected`, { selected })
  },

  // 批量选中/取消选中
  batchSelect(data: BatchSelectRequest): Promise<void> {
    return http.post('/cart/batch-select', { ids: data.item_ids })
  },

  // 全选/取消全选
  selectAllCart(selected: boolean): Promise<void> {
    return http.post('/cart/select-all', { selected })
  },

  // 获取购物车商品数量
  getCartCount(): Promise<{ count: number }> {
    return http.get('/cart/count')
  },
}

export default cartService
