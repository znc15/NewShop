import axios, { AxiosError } from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { ApiResponse, ApiError } from '@/types'

const BASE_URL = '/api/v1'

const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage')
    const token = authStorage ? JSON.parse(authStorage)?.state?.token : null
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
          message = '登录已过期，请重新登录'
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 403:
          message = '没有权限访问'
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

export const http = {
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

export default http
