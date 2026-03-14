// 管理后台服务
import http from './http'
import type {
  AdminProduct,
  AdminProductListParams,
  AdminProductFormData,
  AdminOrder,
  AdminOrderListParams,
  ShipOrderRequest,
  RefundOrderRequest,
  AdminUser,
  AdminUserListParams,
  AdminCategory,
  AdminCategoryFormData,
  AdminCoupon,
  AdminCouponListParams,
  AdminCouponFormData,
  AdminPaginatedResponse,
  DashboardStats,
} from '@/types/admin'

const ADMIN_BASE = '/admin'

export const adminService = {
  // ==================== 仪表盘 ====================
  // 获取仪表盘统计数据
  getDashboardStats(): Promise<DashboardStats> {
    return http.get(`${ADMIN_BASE}/dashboard/stats`)
  },

  // ==================== 商品管理 ====================
  // 获取商品列表
  getProducts(params: AdminProductListParams): Promise<AdminPaginatedResponse<AdminProduct>> {
    return http.get(`${ADMIN_BASE}/products`, params as Record<string, unknown>)
  },

  // 获取商品详情
  getProduct(id: number): Promise<AdminProduct> {
    return http.get(`${ADMIN_BASE}/products/${id}`)
  },

  // 创建商品
  createProduct(data: AdminProductFormData): Promise<AdminProduct> {
    return http.post(`${ADMIN_BASE}/products`, data)
  },

  // 更新商品
  updateProduct(id: number, data: Partial<AdminProductFormData>): Promise<AdminProduct> {
    return http.put(`${ADMIN_BASE}/products/${id}`, data)
  },

  // 删除商品
  deleteProduct(id: number): Promise<void> {
    return http.delete(`${ADMIN_BASE}/products/${id}`)
  },

  // 更新商品状态
  updateProductStatus(id: number, status: 'draft' | 'active' | 'inactive'): Promise<void> {
    return http.put(`${ADMIN_BASE}/products/${id}/status`, { status })
  },

  // ==================== 订单管理 ====================
  // 获取订单列表
  getOrders(params: AdminOrderListParams): Promise<AdminPaginatedResponse<AdminOrder>> {
    return http.get(`${ADMIN_BASE}/orders`, params as Record<string, unknown>)
  },

  // 获取订单详情
  getOrder(id: number): Promise<AdminOrder> {
    return http.get(`${ADMIN_BASE}/orders/${id}`)
  },

  // 发货
  shipOrder(id: number, data: ShipOrderRequest): Promise<void> {
    return http.put(`${ADMIN_BASE}/orders/${id}/ship`, data)
  },

  // 退款
  refundOrder(id: number, data: RefundOrderRequest): Promise<void> {
    return http.put(`${ADMIN_BASE}/orders/${id}/refund`, data)
  },

  // ==================== 用户管理 ====================
  // 获取用户列表
  getUsers(params: AdminUserListParams): Promise<AdminPaginatedResponse<AdminUser>> {
    return http.get(`${ADMIN_BASE}/users`, params as Record<string, unknown>)
  },

  // 获取用户详情
  getUser(id: number): Promise<AdminUser> {
    return http.get(`${ADMIN_BASE}/users/${id}`)
  },

  // 禁用用户
  disableUser(id: number): Promise<void> {
    return http.put(`${ADMIN_BASE}/users/${id}/disable`)
  },

  // 启用用户
  enableUser(id: number): Promise<void> {
    return http.put(`${ADMIN_BASE}/users/${id}/enable`)
  },

  // ==================== 分类管理 ====================
  // 获取分类列表（树形）
  getCategories(): Promise<AdminCategory[]> {
    return http.get(`${ADMIN_BASE}/categories`)
  },

  // 获取分类详情
  getCategory(id: number): Promise<AdminCategory> {
    return http.get(`${ADMIN_BASE}/categories/${id}`)
  },

  // 创建分类
  createCategory(data: AdminCategoryFormData): Promise<AdminCategory> {
    return http.post(`${ADMIN_BASE}/categories`, data)
  },

  // 更新分类
  updateCategory(id: number, data: Partial<AdminCategoryFormData>): Promise<AdminCategory> {
    return http.put(`${ADMIN_BASE}/categories/${id}`, data)
  },

  // 删除分类
  deleteCategory(id: number): Promise<void> {
    return http.delete(`${ADMIN_BASE}/categories/${id}`)
  },

  // ==================== 优惠券管理 ====================
  // 获取优惠券列表
  getCoupons(params: AdminCouponListParams): Promise<AdminPaginatedResponse<AdminCoupon>> {
    return http.get(`${ADMIN_BASE}/coupons`, params as Record<string, unknown>)
  },

  // 获取优惠券详情
  getCoupon(id: number): Promise<AdminCoupon> {
    return http.get(`${ADMIN_BASE}/coupons/${id}`)
  },

  // 创建优惠券
  createCoupon(data: AdminCouponFormData): Promise<AdminCoupon> {
    return http.post(`${ADMIN_BASE}/coupons`, data)
  },

  // 更新优惠券
  updateCoupon(id: number, data: Partial<AdminCouponFormData>): Promise<AdminCoupon> {
    return http.put(`${ADMIN_BASE}/coupons/${id}`, data)
  },

  // 删除优惠券
  deleteCoupon(id: number): Promise<void> {
    return http.delete(`${ADMIN_BASE}/coupons/${id}`)
  },
}

export default adminService
