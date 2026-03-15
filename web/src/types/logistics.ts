// 物流公司信息
export interface LogisticsCompany {
  id: number
  name: string
  code: string
  website: string
  phone: string
}

// 物流轨迹节点
export interface LogisticsTrace {
  id: number
  time: string
  status: string
  description: string
  location: string
}

// 订单物流信息
export interface OrderLogistics {
  id: number
  order_id: number
  company: LogisticsCompany
  tracking_no: string
  status: string
  traces: LogisticsTrace[]
  created_at: string
  updated_at: string
}
