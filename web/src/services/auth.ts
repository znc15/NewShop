import http from './http'
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types'

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
  sendVerifyCode(email: string): Promise<void> {
    return http.post('/auth/send-code', { email })
  },

  // 重置密码
  resetPassword(email: string, code: string, password: string): Promise<void> {
    return http.post('/auth/reset-password', { email, code, password })
  },
}

export default authService
