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
  AdminReview,
  AdminReviewListParams,
  AdminReviewFormData,
  AdminPaginatedResponse,
  DashboardStats,
  AdminConfigItem,
  AdminConfigPayload,
  AdminDetail,
  AdminListResponse,
  AdminFormData,
  AdminProfile,
} from '@/types/admin'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  return value as UnknownRecord
}

function toNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

function toString(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string') {
    return value
  }
  return fallback
}

function toNullableString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }
  return null
}

function toBool(value: unknown, fallback: boolean = false): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  return fallback
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  return []
}

function pickArray(source: UnknownRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = source[key]
    if (Array.isArray(value)) {
      return value
    }
  }
  return []
}

function normalizePaginated<T>(
  raw: unknown,
  mapper: (item: unknown) => T
): AdminPaginatedResponse<T> {
  const source = asRecord(raw) ?? {}
  const items = pickArray(source, ['items', 'list']).map(mapper)
  const total = toNumber(source.total, items.length)
  const page = toNumber(source.page, 1)
  const pageSize = toNumber(source.page_size, items.length > 0 ? items.length : 20)
  const fallbackPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const totalPages = toNumber(source.total_pages, fallbackPages)

  return {
    items,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  }
}

function mapProduct(item: unknown): AdminProduct {
  const record = asRecord(item) ?? {}
  const sales = toNumber(record.sales)
  const statusValue = toString(record.status, 'draft')
  const status: 'draft' | 'active' | 'inactive' =
    statusValue === 'active' || statusValue === 'inactive' || statusValue === 'draft'
      ? statusValue
      : 'draft'

  return {
    id: toNumber(record.id),
    name: toString(record.name),
    description: toString(record.description),
    detail: toNullableString(record.detail),
    detail_images: toStringArray(record.detail_images),
    price: toNumber(record.price),
    original_price: toNumber(record.original_price),
    main_image: toString(record.main_image),
    images: typeof record.images === 'string' ? record.images : null,
    category_id: toNumber(record.category_id),
    category_name: toString(record.category_name),
    brand_id: record.brand_id === null ? null : toNumber(record.brand_id, 0),
    brand_name: toNullableString(record.brand_name),
    status,
    stock: toNumber(record.stock),
    sales,
    sales_count: toNumber(record.sales_count, sales),
    is_hot: toBool(record.is_hot),
    is_sale: toBool(record.is_sale),
    sort: toNumber(record.sort),
    skus: toArray(record.skus) as AdminProduct['skus'],
    attrs: toArray(record.attrs) as AdminProduct['attrs'],
    created_at: toString(record.created_at),
    updated_at: toString(record.updated_at),
  }
}

function mapOrder(item: unknown): AdminOrder {
  const record = asRecord(item) ?? {}
  const statusValue = toString(record.status, 'pending')
  const status: AdminOrder['status'] =
    statusValue === 'pending' ||
    statusValue === 'paid' ||
    statusValue === 'shipped' ||
    statusValue === 'delivered' ||
    statusValue === 'completed' ||
    statusValue === 'cancelled' ||
    statusValue === 'refunded'
      ? statusValue
      : 'pending'

  return {
    id: toNumber(record.id),
    order_no: toString(record.order_no),
    user_id: toNumber(record.user_id),
    user_name: toNullableString(record.user_name),
    user_email: toNullableString(record.user_email),
    status,
    total_amount: toNumber(record.total_amount),
    discount_amount: toNumber(record.discount_amount),
    shipping_fee: toNumber(record.shipping_fee),
    pay_amount: toNumber(record.pay_amount),
    payment_method: toNullableString(record.payment_method),
    receiver_name: toString(record.receiver_name),
    receiver_phone: toString(record.receiver_phone),
    receiver_address: toString(record.receiver_address),
    items_count: toNumber(record.items_count),
    remark: toString(record.remark),
    cancel_reason: toNullableString(record.cancel_reason),
    refund_reason: toNullableString(record.refund_reason),
    tracking_company: toNullableString(record.tracking_company),
    tracking_no: toNullableString(record.tracking_no),
    paid_at: toNullableString(record.paid_at),
    shipped_at: toNullableString(record.shipped_at),
    delivered_at: toNullableString(record.delivered_at),
    completed_at: toNullableString(record.completed_at),
    cancelled_at: toNullableString(record.cancelled_at),
    refunded_at: toNullableString(record.refunded_at),
    created_at: toString(record.created_at),
    updated_at: toString(record.updated_at),
    items: toArray(record.items) as AdminOrder['items'],
  }
}

function mapUser(item: unknown): AdminUser {
  const record = asRecord(item) ?? {}
  const memberLevel = toNumber(record.member_level, 1)
  const fallbackUsername = toString(record.email).split('@')[0] || ''
  const username = toNullableString(record.username) ?? (fallbackUsername || null)
  const statusRaw = toString(record.status, 'active')
  const status = statusRaw === 'disabled' ? 'inactive' : statusRaw

  return {
    id: toNumber(record.id),
    email: toString(record.email),
    phone: toNullableString(record.phone),
    username,
    nickname: toNullableString(record.nickname),
    avatar: toNullableString(record.avatar),
    member_level: memberLevel,
    level: toNumber(record.level, memberLevel),
    points: toNumber(record.points),
    status,
    order_count: toNumber(record.order_count),
    total_spent: toNumber(record.total_spent),
    created_at: toString(record.created_at),
    updated_at: toString(record.updated_at),
  }
}

function mapCategory(item: unknown): AdminCategory {
  const record = asRecord(item) ?? {}
  const rawParentID = record.parent_id
  const parentID = rawParentID === null ? null : toNumber(rawParentID, 0)
  const normalizedParentID = parentID === 0 ? null : parentID
  const children = toArray(record.children).map(mapCategory)

  return {
    id: toNumber(record.id),
    name: toString(record.name),
    parent_id: normalizedParentID,
    parent_name: toNullableString(record.parent_name),
    level: toNumber(record.level, 1),
    icon: toNullableString(record.icon),
    sort: toNumber(record.sort),
    status: toString(record.status, 'active'),
    product_count: toNumber(record.product_count),
    children,
    created_at: toString(record.created_at),
    updated_at: toString(record.updated_at),
  }
}

function mapCoupon(item: unknown): AdminCoupon {
  const record = asRecord(item) ?? {}

  return {
    id: toNumber(record.id),
    code: toString(record.code),
    name: toString(record.name),
    type: toString(record.type, 'fixed') as AdminCoupon['type'],
    value: toNumber(record.value),
    min_amount: toNumber(record.min_amount),
    max_discount: record.max_discount === null ? null : toNumber(record.max_discount, 0),
    total_count: toNumber(record.total_count),
    used_count: toNumber(record.used_count),
    start_time: toString(record.start_time),
    end_time: toString(record.end_time),
    status: toString(record.status),
    created_at: toString(record.created_at),
    updated_at: toString(record.updated_at),
  }
}

function mapReview(item: unknown): AdminReview {
  const record = asRecord(item) ?? {}
  const statusValue = toString(record.status, 'active')
  const status: AdminReview['status'] = statusValue === 'inactive' ? 'inactive' : 'active'

  return {
    id: toNumber(record.id),
    product_id: toNumber(record.product_id),
    product_name: toString(record.product_name),
    author: toString(record.author),
    handle: toString(record.handle),
    avatar: toString(record.avatar),
    content: toString(record.content),
    rating: toNumber(record.rating, 5),
    sort: toNumber(record.sort),
    status,
    created_at: toString(record.created_at),
    updated_at: toString(record.updated_at),
  }
}

export const adminService = {
  // ==================== 仪表盘 ====================
  getDashboardStats(): Promise<DashboardStats> {
    return adminHttp.get('/stats/overview')
  },

  // ==================== 商品管理 ====================
  async getProducts(params: AdminProductListParams): Promise<AdminPaginatedResponse<AdminProduct>> {
    const data = await adminHttp.get<unknown>('/products', params as Record<string, unknown>)
    return normalizePaginated(data, mapProduct)
  },

  async getProduct(id: number): Promise<AdminProduct> {
    const data = await adminHttp.get<unknown>(`/products/${id}`)
    return mapProduct(data)
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
  async getOrders(params: AdminOrderListParams): Promise<AdminPaginatedResponse<AdminOrder>> {
    const data = await adminHttp.get<unknown>('/orders', params as Record<string, unknown>)
    return normalizePaginated(data, mapOrder)
  },

  async getOrder(id: number): Promise<AdminOrder> {
    const data = await adminHttp.get<unknown>(`/orders/${id}`)
    return mapOrder(data)
  },

  shipOrder(id: number, data: ShipOrderRequest): Promise<void> {
    return adminHttp.put(`/orders/${id}/ship`, {
      tracking_company: data.tracking_company,
      tracking_no: data.tracking_no,
    })
  },

  refundOrder(id: number, data: RefundOrderRequest): Promise<void> {
    return adminHttp.put(`/orders/${id}/refund`, {
      refund_amount: data.refund_amount,
      refund_reason: data.refund_reason,
    })
  },

  // ==================== 用户管理 ====================
  async getUsers(params: AdminUserListParams): Promise<AdminPaginatedResponse<AdminUser>> {
    const data = await adminHttp.get<unknown>('/users', params as Record<string, unknown>)
    return normalizePaginated(data, mapUser)
  },

  async getUser(id: number): Promise<AdminUser> {
    const data = await adminHttp.get<unknown>(`/users/${id}`)
    return mapUser(data)
  },

  disableUser(id: number): Promise<void> {
    return adminHttp.put(`/users/${id}`, { status: 'inactive' })
  },

  enableUser(id: number): Promise<void> {
    return adminHttp.put(`/users/${id}`, { status: 'active' })
  },

  // ==================== 分类管理 ====================
  async getCategories(): Promise<AdminCategory[]> {
    const data = await adminHttp.get<unknown>('/categories')
    const record = asRecord(data)
    if (!record) {
      return []
    }

    const list = pickArray(record, ['items', 'list'])
    return list.map(mapCategory)
  },

  async getCategory(id: number): Promise<AdminCategory> {
    const data = await adminHttp.get<unknown>(`/categories/${id}`)
    return mapCategory(data)
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
  async getCoupons(params: AdminCouponListParams): Promise<AdminPaginatedResponse<AdminCoupon>> {
    const data = await adminHttp.get<unknown>('/coupons', params as Record<string, unknown>)
    return normalizePaginated(data, mapCoupon)
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

  // ==================== 评价管理 ====================
  async getReviews(params: AdminReviewListParams): Promise<AdminPaginatedResponse<AdminReview>> {
    const data = await adminHttp.get<unknown>('/reviews', params as Record<string, unknown>)
    return normalizePaginated(data, mapReview)
  },

  async getReview(id: number): Promise<AdminReview> {
    const data = await adminHttp.get<unknown>(`/reviews/${id}`)
    return mapReview(data)
  },

  createReview(data: AdminReviewFormData): Promise<AdminReview> {
    return adminHttp.post('/reviews', data)
  },

  updateReview(id: number, data: Partial<AdminReviewFormData>): Promise<AdminReview> {
    return adminHttp.put(`/reviews/${id}`, data)
  },

  deleteReview(id: number): Promise<void> {
    return adminHttp.delete(`/reviews/${id}`)
  },

  // ==================== 配置管理 ====================
  async getConfigs(category?: string): Promise<AdminConfigItem[]> {
    const data = await adminHttp.get<unknown>('/configs', category ? { category } : undefined)
    if (Array.isArray(data)) {
      return data as AdminConfigItem[]
    }

    const record = asRecord(data)
    if (!record) {
      return []
    }

    return pickArray(record, ['items', 'list']) as AdminConfigItem[]
  },

  upsertConfig(data: AdminConfigPayload): Promise<AdminConfigItem> {
    return adminHttp.post('/configs', data)
  },

  updateConfig(key: string, value: string, description?: string): Promise<void> {
    return adminHttp.put(`/configs/${key}`, { value, description })
  },

  // ==================== 管理员管理 ====================
  async getAdmins(page = 1, pageSize = 20): Promise<AdminListResponse> {
    const data = await adminHttp.get<AdminListResponse>('/admins', { page, page_size: pageSize })
    return data
  },

  getAdminProfile(): Promise<AdminProfile> {
    return adminHttp.get<AdminProfile>('/profile')
  },

  createAdmin(formData: AdminFormData): Promise<AdminDetail> {
    return adminHttp.post<AdminDetail>('/admins', formData)
  },

  updateAdmin(id: number, formData: Partial<AdminFormData>): Promise<AdminDetail> {
    return adminHttp.put<AdminDetail>(`/admins/${id}`, formData)
  },

  deleteAdmin(id: number): Promise<void> {
    return adminHttp.delete(`/admins/${id}`)
  },
}

export default adminService