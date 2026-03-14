import http from './http'
import type {
  UserAddress,
  CreateAddressRequest,
  UpdateAddressRequest,
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '@/types/user'

export const userService = {
  // 获取用户资料
  getProfile(): Promise<UserProfile> {
    return http.get('/auth/profile')
  },

  // 更新用户资料
  updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    return http.put('/auth/profile', data)
  },

  // 修改密码
  changePassword(data: ChangePasswordRequest): Promise<void> {
    return http.put('/auth/password', data)
  },

  // 获取地址列表
  getAddresses(): Promise<UserAddress[]> {
    return http.get('/user/addresses')
  },

  // 获取单个地址
  getAddress(id: number): Promise<UserAddress> {
    return http.get(`/user/addresses/${id}`)
  },

  // 创建地址
  createAddress(data: CreateAddressRequest): Promise<UserAddress> {
    return http.post('/user/addresses', data)
  },

  // 更新地址
  updateAddress(id: number, data: UpdateAddressRequest): Promise<UserAddress> {
    return http.put(`/user/addresses/${id}`, data)
  },

  // 删除地址
  deleteAddress(id: number): Promise<void> {
    return http.delete(`/user/addresses/${id}`)
  },

  // 设置默认地址
  setDefaultAddress(id: number): Promise<void> {
    return http.put(`/user/addresses/${id}/default`)
  },
}

export default userService
