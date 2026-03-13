// 购物车相关类型定义

// 购物车商品 SKU 信息
export interface CartItemSku {
  id: number;
  sku_code: string;
  specs: string;
  price: number;
  stock: number;
  image: string;
}

// 购物车商品
export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  sku_id: number;
  quantity: number;
  selected: boolean;
  product: {
    id: number;
    name: string;
    main_image: string;
    price: number;
    original_price: number;
    stock: number;
    status: string;
  };
  sku: CartItemSku | null;
  created_at: string;
  updated_at: string;
}

// 购物车响应
export interface CartResponse {
  items: CartItem[];
  total_count: number;
  selected_count: number;
  total_price: number;
  selected_price: number;
}

// 添加购物车请求
export interface AddCartRequest {
  product_id: number;
  sku_id?: number;
  quantity: number;
}

// 更新购物车请求
export interface UpdateCartRequest {
  quantity: number;
}

// 批量操作请求
export interface BatchSelectRequest {
  item_ids: number[];
  selected: boolean;
}
