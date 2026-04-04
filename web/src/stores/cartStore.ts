// 购物车状态管理
import { create } from 'zustand';
import type { CartItem, CartResponse } from '../types/cart';
import cartService from '../services/cart';

interface CartState {
  items: CartItem[];
  totalCount: number;
  selectedCount: number;
  totalPrice: number;
  selectedPrice: number;
  loading: boolean;
  error: string | null;

  // 操作
  fetchCart: () => Promise<void>;
  addItem: (productId: number, skuId: number | undefined, quantity: number) => Promise<CartItem>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  removeItems: (itemIds: number[]) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleSelect: (itemId: number, selected: boolean) => Promise<void>;
  selectAll: (selected: boolean) => Promise<void>;
  getSelectedItems: () => CartItem[];
  resetCart: () => void;
}

const emptyCartState = {
  items: [],
  totalCount: 0,
  selectedCount: 0,
  totalPrice: 0,
  selectedPrice: 0,
  loading: false,
  error: null,
}

// 辅助函数：更新状态
function updateStateFromCart(set: (partial: Partial<CartState>) => void, cart: CartResponse) {
  set({
    items: cart.items,
    totalCount: cart.total_count,
    selectedCount: cart.selected_count,
    totalPrice: cart.total_price,
    selectedPrice: cart.selected_price,
  });
}

async function syncCart(set: (partial: Partial<CartState>) => void) {
  const cart = await cartService.getCart()
  updateStateFromCart(set, cart)
}

export const useCartStore = create<CartState>((set, get) => ({
  ...emptyCartState,

  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      await syncCart(set);
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取购物车失败',
        loading: false,
      });
    }
  },

  addItem: async (productId, skuId, quantity) => {
    set({ loading: true, error: null });
    try {
      const addedItem = await cartService.addToCart({
        product_id: productId,
        sku_id: skuId ?? undefined,
        quantity,
      });
      await syncCart(set);
      set({ loading: false });
      return addedItem;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '添加购物车失败',
        loading: false,
      });
      throw error;
    }
  },

  updateQuantity: async (itemId, quantity) => {
    try {
      await cartService.updateCartItem(itemId, { quantity });
      await syncCart(set);
      set({ error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新失败',
      });
    }
  },

  removeItem: async (itemId) => {
    try {
      await cartService.removeFromCart(itemId);
      await syncCart(set);
      set({ error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除失败',
      });
    }
  },

  removeItems: async (itemIds) => {
    try {
      await cartService.batchRemove(itemIds);
      await syncCart(set);
      set({ error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除失败',
      });
    }
  },

  clearCart: async () => {
    set({ loading: true, error: null });
    try {
      await cartService.clearCart();
      set(emptyCartState);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '清空购物车失败',
        loading: false,
      });
    }
  },

  toggleSelect: async (itemId, selected) => {
    try {
      await cartService.selectCartItem(itemId, selected);
      await syncCart(set);
      set({ error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '操作失败',
      });
    }
  },

  selectAll: async (selected) => {
    try {
      await cartService.selectAllCart(selected);
      await syncCart(set);
      set({ error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '操作失败',
      });
    }
  },

  getSelectedItems: () => {
    return get().items.filter((item) => item.selected);
  },

  resetCart: () => {
    set(emptyCartState)
  },
}));
