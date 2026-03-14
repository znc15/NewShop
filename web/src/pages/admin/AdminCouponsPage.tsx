import { useEffect, useState, useCallback } from 'react'
import adminService from '@/services/admin'
import type { AdminCoupon, AdminCouponListParams, AdminCouponFormData } from '@/types/admin'
import { DataTable, Pagination, SearchInput, Select, Modal, ConfirmDialog, StatusBadge } from '@/components/admin/AdminComponents'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils'

// 优惠券状态配置
const COUPON_STATUS_LABELS: Record<string, string> = {
  active: '有效',
  inactive: '已停用',
  expired: '已过期',
}

const COUPON_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
}

// 优惠券类型配置
const COUPON_TYPE_LABELS: Record<string, string> = {
  fixed: '满减券',
  percent: '折扣券',
}

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [params, setParams] = useState<AdminCouponListParams>({
    page: 1,
    page_size: 10,
  })

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<AdminCoupon | null>(null)
  const [formData, setFormData] = useState<AdminCouponFormData>({
    code: '',
    name: '',
    type: 'fixed',
    value: 0,
    min_amount: 0,
    max_discount: undefined,
    total_count: 100,
    start_time: '',
    end_time: '',
    status: 'active',
  })
  const [saving, setSaving] = useState(false)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.getCoupons(params)
      setCoupons(res.items)
      setTotal(res.total)
    } catch (error) {
      console.error('获取优惠券列表失败:', error)
      // 模拟数据
      setCoupons([
        {
          id: 1,
          code: 'NEWYEAR2024',
          name: '新年满减券',
          type: 'fixed',
          value: 50,
          min_amount: 299,
          max_discount: null,
          total_count: 1000,
          used_count: 356,
          start_time: '2024-01-01 00:00:00',
          end_time: '2024-02-28 23:59:59',
          status: 'active',
          created_at: '2023-12-25 10:00:00',
          updated_at: '2024-01-15 15:30:00',
        },
        {
          id: 2,
          code: 'VIP10',
          name: 'VIP专享折扣',
          type: 'percent',
          value: 10,
          min_amount: 0,
          max_discount: 100,
          total_count: 500,
          used_count: 89,
          start_time: '2024-01-01 00:00:00',
          end_time: '2024-12-31 23:59:59',
          status: 'active',
          created_at: '2023-12-20 14:00:00',
          updated_at: '2024-01-10 09:15:00',
        },
        {
          id: 3,
          code: 'SUMMER2023',
          name: '夏季促销券',
          type: 'fixed',
          value: 30,
          min_amount: 199,
          max_discount: null,
          total_count: 2000,
          used_count: 2000,
          start_time: '2023-06-01 00:00:00',
          end_time: '2023-08-31 23:59:59',
          status: 'expired',
          created_at: '2023-05-25 10:00:00',
          updated_at: '2023-09-01 00:00:00',
        },
      ])
      setTotal(3)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  const handleSearch = (keyword: string) => {
    setParams((prev) => ({ ...prev, page: 1, keyword: keyword || undefined }))
  }

  const handleStatusChange = (status: string) => {
    setParams((prev) => ({ ...prev, page: 1, status: status || undefined }))
  }

  const openEditModal = (coupon?: AdminCoupon) => {
    if (coupon) {
      setSelectedCoupon(coupon)
      setFormData({
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        min_amount: coupon.min_amount,
        max_discount: coupon.max_discount || undefined,
        total_count: coupon.total_count,
        start_time: coupon.start_time,
        end_time: coupon.end_time,
        status: coupon.status,
      })
    } else {
      setSelectedCoupon(null)
      // 默认时间范围：今天到一个月后
      const now = new Date()
      const later = new Date()
      later.setMonth(later.getMonth() + 1)
      setFormData({
        code: '',
        name: '',
        type: 'fixed',
        value: 0,
        min_amount: 0,
        max_discount: undefined,
        total_count: 100,
        start_time: now.toISOString().slice(0, 16),
        end_time: later.toISOString().slice(0, 16),
        status: 'active',
      })
    }
    setEditModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.start_time || !formData.end_time) {
      alert('请填写必填项')
      return
    }

    if (formData.value <= 0) {
      alert('优惠值必须大于0')
      return
    }

    setSaving(true)
    try {
      if (selectedCoupon) {
        await adminService.updateCoupon(selectedCoupon.id, formData)
      } else {
        await adminService.createCoupon(formData)
      }
      setEditModalOpen(false)
      fetchCoupons()
    } catch (error) {
      console.error('保存优惠券失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCoupon) return

    setSaving(true)
    try {
      await adminService.deleteCoupon(selectedCoupon.id)
      setDeleteDialogOpen(false)
      setSelectedCoupon(null)
      fetchCoupons()
    } catch (error) {
      console.error('删除优惠券失败:', error)
      alert('删除失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 生成随机优惠券码
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData((prev) => ({ ...prev, code }))
  }

  const columns = [
    {
      key: 'code',
      title: '优惠券码',
      render: (item: AdminCoupon) => (
        <span className="font-mono font-medium">{item.code}</span>
      ),
    },
    {
      key: 'name',
      title: '名称',
      render: (item: AdminCoupon) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-stone">{COUPON_TYPE_LABELS[item.type]}</p>
        </div>
      ),
    },
    {
      key: 'value',
      title: '优惠内容',
      render: (item: AdminCoupon) => (
        <span className="font-medium text-copper-600">
          {item.type === 'fixed' ? `¥${item.value}` : `${item.value}%`}
          {item.type === 'percent' && item.max_discount && (
            <span className="text-xs text-stone ml-1">（最高¥{item.max_discount}）</span>
          )}
        </span>
      ),
    },
    {
      key: 'min_amount',
      title: '使用门槛',
      render: (item: AdminCoupon) => (
        <span>{item.min_amount > 0 ? `满¥${item.min_amount}可用` : '无门槛'}</span>
      ),
    },
    {
      key: 'usage',
      title: '使用情况',
      render: (item: AdminCoupon) => (
        <div>
          <p className="font-medium">{item.used_count}/{item.total_count}</p>
          <div className="w-16 h-1.5 bg-cream-200 rounded-full mt-1">
            <div
              className="h-full bg-forest-500 rounded-full"
              style={{ width: `${Math.min(100, (item.used_count / item.total_count) * 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'time',
      title: '有效期',
      render: (item: AdminCoupon) => (
        <div className="text-xs">
          <p>{item.start_time.slice(0, 10)}</p>
          <p className="text-stone">至 {item.end_time.slice(0, 10)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (item: AdminCoupon) => (
        <StatusBadge
          status={item.status}
          labels={COUPON_STATUS_LABELS}
          colors={COUPON_STATUS_COLORS}
        />
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (item: AdminCoupon) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(item)}
            className="px-2 py-1 text-xs bg-forest-100 text-forest-700 rounded hover:bg-forest-200 transition-colors"
          >
            编辑
          </button>
          <button
            onClick={() => {
              setSelectedCoupon(item)
              setDeleteDialogOpen(true)
            }}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            删除
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SearchInput
            value={params.keyword || ''}
            onChange={handleSearch}
            placeholder="搜索优惠券码/名称..."
            className="w-64"
          />
          <Select
            value={params.status || ''}
            onChange={handleStatusChange}
            options={Object.entries(COUPON_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            placeholder="全部状态"
          />
        </div>
        <Button onClick={() => openEditModal()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          添加优惠券
        </Button>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border border-cream-200">
        <DataTable
          columns={columns}
          data={coupons}
          loading={loading}
          emptyText="暂无优惠券数据"
        />
        {total > 0 && (
          <div className="px-4 py-4 border-t border-cream-200">
            <Pagination
              page={params.page || 1}
              pageSize={params.page_size || 10}
              total={total}
              onChange={(page) => setParams((prev) => ({ ...prev, page }))}
            />
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedCoupon ? '编辑优惠券' : '添加优惠券'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                优惠券码 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="如：NEWYEAR2024"
                  className="flex-1"
                />
                <Button variant="secondary" onClick={generateCode}>
                  生成
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="如：新年满减券"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                类型
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as 'fixed' | 'percent' }))}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
              >
                <option value="fixed">满减券</option>
                <option value="percent">折扣券</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                优惠值 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, value: Number(e.target.value) }))}
                  placeholder={formData.type === 'fixed' ? '50' : '10'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone">
                  {formData.type === 'fixed' ? '元' : '%'}
                </span>
              </div>
            </div>

            {formData.type === 'percent' && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  最高优惠
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.max_discount || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, max_discount: Number(e.target.value) || undefined }))}
                    placeholder="100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone">元</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                使用门槛
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.min_amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, min_amount: Number(e.target.value) }))}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone">元</span>
              </div>
              <p className="text-xs text-stone mt-1">0 表示无门槛</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                发放数量
              </label>
              <Input
                type="number"
                value={formData.total_count}
                onChange={(e) => setFormData((prev) => ({ ...prev, total_count: Number(e.target.value) }))}
                placeholder="100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                开始时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                结束时间 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              状态
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
            >
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 删除确认框 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="确认删除"
        message={`确定要删除优惠券「${selectedCoupon?.code}」吗？此操作不可恢复。`}
        confirmText="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setSelectedCoupon(null)
        }}
        loading={saving}
      />
    </div>
  )
}

export default AdminCouponsPage
