// Admin 管理后台专用 HTTP 客户端
import axios, { AxiosError } from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { ApiResponse, ApiError } from '@/types'

const ADMIN_BASE_URL = '/api/admin'

// Admin 登录页面路径（不需要重定向）
const ADMIN_AUTH_PAGES = ['/auth/login']

function clearAdminAuthState() {
  localStorage.removeItem('admin-auth-storage')
}

function shouldRedirectToAdminLogin(error: AxiosError<ApiResponse>): boolean {
  if (error.response?.status !== 401) {
    return false
  }

  const requestUrl = error.config?.url ?? ''
  return !ADMIN_AUTH_PAGES.some((path) => requestUrl.includes(path))
}

const instance: AxiosInstance = axios.create({
  baseURL: ADMIN_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 从 adminAuth store 读取 token
instance.interceptors.request.use(
  (config) => {
    const adminAuthStorage = localStorage.getItem('admin-auth-storage')
    const token = adminAuthStorage ? JSON.parse(adminAuthStorage)?.state?.token : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse
    if (data.code === 0) {
      return data.data as unknown as AxiosResponse
    }
    // 业务错误
    const error: ApiError = {
      code: data.code,
      message: data.message,
    }
    return Promise.reject(error)
  },
  (error: AxiosError<ApiResponse>) => {
    if (error.response) {
      const { status, data } = error.response
      let message = '请求失败'

      switch (status) {
        case 400:
          message = data?.message || '请求参数错误'
          break
        case 401:
          message = data?.message || '管理员登录已过期，请重新登录'
          if (shouldRedirectToAdminLogin(error)) {
            clearAdminAuthState()
            window.location.href = '/admin/login'
          }
          break
        case 403:
          message = '没有管理员权限访问'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 500:
          message = '服务器错误'
          break
        default:
          message = data?.message || `请求失败 (${status})`
      }

      const apiError: ApiError = {
        code: status,
        message,
      }
      return Promise.reject(apiError)
    }

    if (error.request) {
      return Promise.reject({
        code: -1,
        message: '网络错误，请检查网络连接',
      } as ApiError)
    }

    return Promise.reject({
      code: -1,
      message: error.message || '未知错误',
    } as ApiError)
  }
)

// 封装请求方法
async function request<T>(config: AxiosRequestConfig): Promise<T> {
  return instance.request<unknown, T>(config)
}

export const adminHttp = {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>({ method: 'GET', url, params })
  },

  post<T>(url: string, data?: unknown): Promise<T> {
    return request<T>({ method: 'POST', url, data })
  },

  put<T>(url: string, data?: unknown): Promise<T> {
    return request<T>({ method: 'PUT', url, data })
  },

  patch<T>(url: string, data?: unknown): Promise<T> {
    return request<T>({ method: 'PATCH', url, data })
  },

  delete<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>({ method: 'DELETE', url, params })
  },
}

export default adminHttp