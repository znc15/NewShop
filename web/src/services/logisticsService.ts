// 物流服务
import { http } from './http'
import type { LogisticsCompany, OrderLogistics } from '@/types/logistics'

export const logisticsService = {
  // 获取物流公司列表
  getLogisticsCompanies(): Promise<LogisticsCompany[]> {
    return http.get('/logistics/companies')
  },

  // 获取订单物流信息
  getOrderLogistics(orderId: number): Promise<OrderLogistics> {
    return http.get(`/logistics/${orderId}`)
  },
}

export default logisticsService
