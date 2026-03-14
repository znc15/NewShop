// 用户中心相关类型定义（与后端模型一致）

// 用户地址（与后端 UserAddress 模型一致）
export interface UserAddress {
  id: number
  user_id: number
  name: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  full_address: string  // 完整地址（后端生成）
  is_default: boolean
  created_at: string
  updated_at: string
}

// 创建地址请求
export interface CreateAddressRequest {
  name: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  is_default?: boolean
}

// 更新地址请求
export interface UpdateAddressRequest {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  address?: string
  is_default?: boolean
}

// 用户资料（与后端 User 模型一致，包含关联统计字段）
export interface UserProfile {
  id: number
  email: string
  phone: string | null
  username: string | null
  nickname: string | null
  avatar: string | null
  member_level: number
  level: number  // 别名，兼容前端
  points: number
  status: string
  order_count: number  // 订单数量（关联统计）
  total_spent: number  // 总消费（关联统计）
  created_at: string
  updated_at: string
}

// 更新用户资料请求
export interface UpdateProfileRequest {
  username?: string
  nickname?: string
  phone?: string
  avatar?: string
}

// 修改密码请求
export interface ChangePasswordRequest {
  old_password: string
  new_password: string
  confirm_password: string
}

// 会员等级信息
export interface MemberLevel {
  level: number
  name: string
  min_points: number
  max_points: number
  discount: number
  benefits: string[]
}

// 会员等级常量
export const MemberLevels: MemberLevel[] = [
  { level: 1, name: '普通会员', min_points: 0, max_points: 999, discount: 100, benefits: ['基础优惠'] },
  { level: 2, name: '铜牌会员', min_points: 1000, max_points: 4999, discount: 98, benefits: ['专属折扣', '生日礼券'] },
  { level: 3, name: '银牌会员', min_points: 5000, max_points: 19999, discount: 95, benefits: ['专属折扣', '生日礼券', '优先发货'] },
  { level: 4, name: '金牌会员', min_points: 20000, max_points: 49999, discount: 92, benefits: ['专属折扣', '生日礼券', '优先发货', '专属客服'] },
  { level: 5, name: '钻石会员', min_points: 50000, max_points: Infinity, discount: 88, benefits: ['专属折扣', '生日礼券', '优先发货', '专属客服', '免费包邮'] },
]
