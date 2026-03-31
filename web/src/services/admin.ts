// 管理后台服务
import adminHttp from './adminHttp'
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
  AdminConfigItem,
  AdminConfigPayload,
} from '@/types/admin'

export const adminService = {
  // ==================== 仪表盘 ====================
  getDashboardStats(): Promise<DashboardStats> {
    return adminHttp.get('/stats/overview')
  },

  // ==================== 商品管理 ====================
  getProducts(params: AdminProductListParams): Promise<AdminPaginatedResponse<AdminProduct>> {
    return adminHttp.get('/products', params as Record<string, unknown>)
  },

  getProduct(id: number): Promise<AdminProduct> {
    return adminHttp.get(`/products/${id}`)
  },

  createProduct(data: AdminProductFormData): Promise<AdminProduct> {
    return adminHttp.post('/products', data)
  },

  updateProduct(id: number, data: Partial<AdminProductFormData>): Promise<AdminProduct> {
    return adminHttp.put(`/products/${id}`, data)
  },

  deleteProduct(id: number): Promise<void> {
    return adminHttp.delete(`/products/${id}`)
  },

  updateProductStatus(id: number, status: 'draft' | 'active' | 'inactive'): Promise<void> {
    return adminHttp.put(`/products/${id}/status`, { status })
  },

  // ==================== 订单管理 ====================
  getOrders(params: AdminOrderListParams): Promise<AdminPaginatedResponse<AdminOrder>> {
    return adminHttp.get('/orders', params as Record<string, unknown>)
  },

  getOrder(id: number): Promise<AdminOrder> {
    return adminHttp.get(`/orders/${id}`)
  },

  shipOrder(id: number, data: ShipOrderRequest): Promise<void> {
    return adminHttp.put(`/orders/${id}/ship`, data)
  },

  refundOrder(id: number, data: RefundOrderRequest): Promise<void> {
    return adminHttp.put(`/orders/${id}/refund`, data)
  },

  // ==================== 用户管理 ====================
  getUsers(params: AdminUserListParams): Promise<AdminPaginatedResponse<AdminUser>> {
    return adminHttp.get('/users', params as Record<string, unknown>)
  },

  getUser(id: number): Promise<AdminUser> {
    return adminHttp.get(`/users/${id}`)
  },

  disableUser(id: number): Promise<void> {
    return adminHttp.put(`/users/${id}/disable`)
  },

  enableUser(id: number): Promise<void> {
    return adminHttp.put(`/users/${id}/enable`)
  },

  // ==================== 分类管理 ====================
  getCategories(): Promise<AdminCategory[]> {
    return adminHttp.get('/categories')
  },

  getCategory(id: number): Promise<AdminCategory> {
    return adminHttp.get(`/categories/${id}`)
  },

  createCategory(data: AdminCategoryFormData): Promise<AdminCategory> {
    return adminHttp.post('/categories', data)
  },

  updateCategory(id: number, data: Partial<AdminCategoryFormData>): Promise<AdminCategory> {
    return adminHttp.put(`/categories/${id}`, data)
  },

  deleteCategory(id: number): Promise<void> {
    return adminHttp.delete(`/categories/${id}`)
  },

  // ==================== 优惠券管理 ====================
  getCoupons(params: AdminCouponListParams): Promise<AdminPaginatedResponse<AdminCoupon>> {
    return adminHttp.get('/coupons', params as Record<string, unknown>)
  },

  getCoupon(id: number): Promise<AdminCoupon> {
    return adminHttp.get(`/coupons/${id}`)
  },

  createCoupon(data: AdminCouponFormData): Promise<AdminCoupon> {
    return adminHttp.post('/coupons', data)
  },

  updateCoupon(id: number, data: Partial<AdminCouponFormData>): Promise<AdminCoupon> {
    return adminHttp.put(`/coupons/${id}`, data)
  },

  deleteCoupon(id: number): Promise<void> {
    return adminHttp.delete(`/coupons/${id}`)
  },

  // ==================== 配置管理 ====================
  getConfigs(category?: string): Promise<AdminConfigItem[]> {
    return adminHttp.get('/configs', category ? { category } : undefined)
  },

  upsertConfig(data: AdminConfigPayload): Promise<AdminConfigItem> {
    return adminHttp.post('/configs', data)
  },

  updateConfig(key: string, value: string, description?: string): Promise<void> {
    return adminHttp.put(`/configs/${key}`, { value, description })
  },
}

export default adminService