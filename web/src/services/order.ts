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
  getCheckoutPreview(params: {
    cart_item_ids?: number[]
    product_id?: number
    sku_id?: number
    quantity?: number
  }): Promise<CheckoutPreviewResponse> {
    return http.get('/orders/checkout/preview', params as Record<string, unknown>)
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
