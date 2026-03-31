import http from './http'
import type {
  UserAddress,
  CreateAddressRequest,
  UpdateAddressRequest,
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '@/types/user'

type AddressPayload = Omit<UserAddress, 'full_address'> & {
  full_address?: string
}

type AddressListPayload = {
  addresses?: AddressPayload[]
}

function buildFullAddress(address: Pick<UserAddress, 'province' | 'city' | 'district' | 'address'>): string {
  return [address.province, address.city, address.district, address.address].filter(Boolean).join(' ')
}

function normalizeAddress(address: AddressPayload): UserAddress {
  return {
    ...address,
    full_address: address.full_address || buildFullAddress(address),
  }
}

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
  async getAddresses(): Promise<UserAddress[]> {
    const response = await http.get<AddressListPayload | AddressPayload[]>('/user/addresses')
    const addresses = Array.isArray(response) ? response : response.addresses || []
    return addresses.map(normalizeAddress)
  },

  // 获取单个地址
  async getAddress(id: number): Promise<UserAddress> {
    const response = await http.get<AddressPayload>(`/user/addresses/${id}`)
    return normalizeAddress(response)
  },

  // 创建地址
  async createAddress(data: CreateAddressRequest): Promise<UserAddress> {
    const response = await http.post<AddressPayload>('/user/addresses', data)
    return normalizeAddress(response)
  },

  // 更新地址
  async updateAddress(id: number, data: UpdateAddressRequest): Promise<UserAddress> {
    const response = await http.put<AddressPayload>(`/user/addresses/${id}`, data)
    return normalizeAddress(response)
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
