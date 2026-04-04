// 订单服务
import http from './http'
import type {
  Order,
  CreateOrderRequest,
  CreateOrderResponse,
  OrderListParams,
  OrderListResponse,
  CancelOrderRequest,
  CheckoutPreviewResponse,
} from '@/types/order'

// 物流信息类型
interface LogisticsInfo {
  company: string
  tracking_no: string
  status: string
  traces: {
    time: string
    description: string
  }[]
}

export const orderService = {
  // 创建订单
  createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
    return http.post('/orders', data)
  },

  // 获取订单列表
  getOrderList(params: OrderListParams): Promise<OrderListResponse> {
    return http.get('/orders', params as Record<string, unknown>)
  },

  // 获取订单详情
  getOrderDetail(orderId: number): Promise<Order> {
    return http.get(`/orders/${orderId}`)
  },

  // 根据订单号获取订单详情
  getOrderByNo(orderNo: string): Promise<Order> {
    return http.get(`/orders/no/${orderNo}`)
  },

  // 取消订单
  cancelOrder(orderId: number, data: CancelOrderRequest): Promise<void> {
    return http.put(`/orders/${orderId}/cancel`, data)
  },

  // 确认收货
  confirmReceive(orderId: number): Promise<void> {
    return http.put(`/orders/${orderId}/confirm`)
  },

  // 删除订单
  deleteOrder(orderId: number): Promise<void> {
    return http.delete(`/orders/${orderId}`)
  },

  // 获取结算预览
  async getCheckoutPreview(params: {
    address_id: number
    item_ids: number[]
  }): Promise<CheckoutPreviewResponse> {
    type RawCheckoutPreviewItem = {
      product_id: number
      sku_id: number
      product_name: string
      sku_name: string
      image: string
      price: number
      quantity: number
      total_amount: number
    }

    type RawCheckoutPreviewResponse = {
      items?: RawCheckoutPreviewItem[]
      total_amount?: number
      freight_amount?: number
      pay_amount?: number
    }

    const res = await http.post<RawCheckoutPreviewResponse>('/orders/checkout/preview', {
      address_id: params.address_id,
      item_ids: params.item_ids,
    })

    const items = (res.items || []).map((item, index) => ({
      cart_item_id: params.item_ids[index] ?? index + 1,
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.image || '',
      sku_id: item.sku_id,
      sku_specs: item.sku_name || '',
      price: item.price,
      quantity: item.quantity,
      subtotal: item.total_amount,
      stock: 0,
    }))

    return {
      items,
      total_amount: res.total_amount || 0,
      freight_amount: res.freight_amount || 0,
      shipping_fee: res.freight_amount || 0,
      discount_amount: 0,
      pay_amount: res.pay_amount || 0,
      default_address: null,
      available_coupons: [],
      user_points: 0,
      max_points_usable: 0,
    }
  },

  // 申请退款
  refundOrder(orderId: number, data: { reason: string }): Promise<void> {
    return http.post(`/orders/${orderId}/refund`, data)
  },

  // 获取订单物流信息
  getOrderLogistics(orderId: number): Promise<LogisticsInfo> {
    return http.get(`/orders/${orderId}/logistics`)
  },

  // 再次购买
  reorder(orderId: number): Promise<{ added_count: number }> {
    return http.post(`/orders/${orderId}/reorder`)
  },
}

export default orderService
