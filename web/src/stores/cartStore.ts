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
  addItem: (productId: number, skuId: number | undefined, quantity: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  removeItems: (itemIds: number[]) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleSelect: (itemId: number, selected: boolean) => Promise<void>;
  selectAll: (selected: boolean) => Promise<void>;
  getSelectedItems: () => CartItem[];
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

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalCount: 0,
  selectedCount: 0,
  totalPrice: 0,
  selectedPrice: 0,
  loading: false,
  error: null,

  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      const cart = await cartService.getCart();
      set({ loading: false });
      updateStateFromCart(set, cart);
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
      await cartService.addToCart({
        product_id: productId,
        sku_id: skuId ?? undefined,
        quantity,
      });
      const cart = await cartService.getCart();
      set({ loading: false });
      updateStateFromCart(set, cart);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '添加购物车失败',
        loading: false,
      });
      throw error;
    }
  },

  updateQuantity: async (itemId, quantity) => {
    const prevItems = get().items;
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    }));

    try {
      await cartService.updateCartItem(itemId, { quantity });
      const cart = await cartService.getCart();
      updateStateFromCart(set, cart);
      set({ error: null });
    } catch (error) {
      set({
        items: prevItems,
        error: error instanceof Error ? error.message : '更新失败',
      });
    }
  },

  removeItem: async (itemId) => {
    const prevItems = get().items;
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    }));

    try {
      await cartService.removeFromCart(itemId);
      const cart = await cartService.getCart();
      updateStateFromCart(set, cart);
      set({ error: null });
    } catch (error) {
      set({
        items: prevItems,
        error: error instanceof Error ? error.message : '删除失败',
      });
    }
  },

  removeItems: async (itemIds) => {
    const prevItems = get().items;
    set((state) => ({
      items: state.items.filter((item) => !itemIds.includes(item.id)),
    }));

    try {
      await cartService.batchRemove(itemIds);
      const cart = await cartService.getCart();
      updateStateFromCart(set, cart);
      set({ error: null });
    } catch (error) {
      set({
        items: prevItems,
        error: error instanceof Error ? error.message : '删除失败',
      });
    }
  },

  clearCart: async () => {
    set({ loading: true, error: null });
    try {
      await cartService.clearCart();
      set({
        items: [],
        totalCount: 0,
        selectedCount: 0,
        totalPrice: 0,
        selectedPrice: 0,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '清空购物车失败',
        loading: false,
      });
    }
  },

  toggleSelect: async (itemId, selected) => {
    const prevItems = get().items;
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, selected } : item
      ),
    }));

    try {
      await cartService.selectCartItem(itemId, selected);
      const cart = await cartService.getCart();
      set({
        selectedCount: cart.selected_count,
        selectedPrice: cart.selected_price,
        error: null,
      });
    } catch (error) {
      set({
        items: prevItems,
        error: error instanceof Error ? error.message : '操作失败',
      });
    }
  },

  selectAll: async (selected) => {
    const prevItems = get().items;
    set((state) => ({
      items: state.items.map((item) => ({ ...item, selected })),
    }));

    try {
      await cartService.selectAllCart(selected);
      const cart = await cartService.getCart();
      set({
        selectedCount: cart.selected_count,
        selectedPrice: cart.selected_price,
        error: null,
      });
    } catch (error) {
      set({
        items: prevItems,
        error: error instanceof Error ? error.message : '操作失败',
      });
    }
  },

  getSelectedItems: () => {
    return get().items.filter((item) => item.selected);
  },
}));
