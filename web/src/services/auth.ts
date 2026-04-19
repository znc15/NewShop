import http from './http'
import type { User, LoginRequest, RegisterRequest, AuthResponse, SendCodeRequest, ResetPasswordRequest } from '@/types'

export const authService = {
  // 登录
  login(data: LoginRequest): Promise<AuthResponse> {
    return http.post('/auth/login', data)
  },

  // 注册
  register(data: RegisterRequest): Promise<AuthResponse> {
    return http.post('/auth/register', data)
  },

  // 获取当前用户信息
  getCurrentUser(): Promise<User> {
    return http.get('/auth/me')
  },

  // 退出登录
  logout(): Promise<void> {
    return http.post('/auth/logout')
  },

  // 发送验证码
  sendCode(data: SendCodeRequest): Promise<void> {
    return http.post('/auth/send-code', data)
  },

  // 重置密码
  resetPassword(data: ResetPasswordRequest): Promise<void> {
    return http.post('/auth/reset-password', data)
  },
}

export default authService
