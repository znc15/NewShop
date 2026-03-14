import { useState, useEffect } from 'react'
import { Plus, MapPin, Edit2, Trash2, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { userService } from '@/services/user'
import type { UserAddress, CreateAddressRequest } from '@/types/user'
import { cn } from '@/utils'

// 省份列表（简化版）
const PROVINCES = [
  '北京市', '上海市', '天津市', '重庆市',
  '广东省', '浙江省', '江苏省', '山东省', '河南省', '四川省',
  '湖北省', '湖南省', '福建省', '安徽省', '河北省', '陕西省',
  '辽宁省', '江西省', '云南省', '广西壮族自治区', '山西省',
  '贵州省', '黑龙江省', '吉林省', '甘肃省', '内蒙古自治区',
  '新疆维吾尔自治区', '宁夏回族自治区', '海南省', '青海省',
  '西藏自治区', '香港特别行政区', '澳门特别行政区', '台湾省'
]

// 地址表单组件
function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  loading,
}: {
  initialData?: UserAddress
  onSubmit: (data: CreateAddressRequest) => Promise<void>
  onCancel: () => void
  loading: boolean
}) {
  const [formData, setFormData] = useState<CreateAddressRequest>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    province: initialData?.province || '',
    city: initialData?.city || '',
    district: initialData?.district || '',
    address: initialData?.address || '',
    is_default: initialData?.is_default || false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入收货人姓名'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '请输入手机号'
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '请输入有效的手机号'
    }

    if (!formData.province) {
      newErrors.province = '请选择省份'
    }

    if (!formData.city.trim()) {
      newErrors.city = '请输入城市'
    }

    if (!formData.district.trim()) {
      newErrors.district = '请输入区/县'
    }

    if (!formData.address.trim()) {
      newErrors.address = '请输入详细地址'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    await onSubmit(formData)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-charcoal">
            收货人 <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            error={errors.name}
            placeholder="请输入收货人姓名"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-charcoal">
            手机号 <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            error={errors.phone}
            placeholder="请输入手机号"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-charcoal">
            省份 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.province}
            onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-charcoal transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent',
              errors.province ? 'border-red-500' : 'border-cream-300'
            )}
          >
            <option value="">请选择省份</option>
            {PROVINCES.map(province => (
              <option key={province} value={province}>{province}</option>
            ))}
          </select>
          {errors.province && <p className="text-xs text-red-500">{errors.province}</p>}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-charcoal">
            城市 <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            error={errors.city}
            placeholder="如：杭州市"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-charcoal">
            区/县 <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.district}
            onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
            error={errors.district}
            placeholder="如：西湖区"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-charcoal">
          详细地址 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder="请输入详细地址，如道路、门牌号、小区、楼栋号等"
          rows={3}
          className={cn(
            'flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-charcoal transition-colors duration-200 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent',
            errors.address ? 'border-red-500' : 'border-cream-300'
          )}
        />
        {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
          className="w-4 h-4 rounded border-cream-300 text-forest-600 focus:ring-forest-500"
        />
        <label htmlFor="is_default" className="text-sm text-charcoal">
          设为默认地址
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSubmit} loading={loading}>
          保存
        </Button>
      </div>
    </div>
  )
}

// 地址卡片组件
function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: UserAddress
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}) {
  return (
    <div className={cn(
      'relative p-4 rounded-xl border-2 transition-colors',
      address.is_default
        ? 'border-forest-500 bg-forest-50'
        : 'border-cream-200 hover:border-cream-300 bg-white'
    )}>
      {address.is_default && (
        <div className="absolute top-0 right-0 -translate-y-1/2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-forest-500 text-white text-xs rounded-full">
            <Check className="w-3 h-3" />
            默认
          </span>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium text-charcoal">{address.name}</span>
            <span className="text-stone">{address.phone}</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-stone">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{address.full_address}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-stone hover:text-forest-600 hover:bg-forest-50 rounded-lg transition-colors"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {!address.is_default && (
            <>
              <button
                onClick={onSetDefault}
                className="p-2 text-stone hover:text-forest-600 hover:bg-forest-50 rounded-lg transition-colors"
                title="设为默认"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-stone hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UserAddressesPage() {
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    try {
      const data = await userService.getAddresses()
      setAddresses(data)
    } catch (error) {
      console.error('获取地址列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: CreateAddressRequest) => {
    setSaving(true)
    try {
      const newAddress = await userService.createAddress(data)
      setAddresses(prev => [...prev, newAddress])
      setShowForm(false)
    } catch (error) {
      console.error('创建地址失败:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (data: CreateAddressRequest) => {
    if (!editingAddress) return

    setSaving(true)
    try {
      const updated = await userService.updateAddress(editingAddress.id, data)
      setAddresses(prev => prev.map(addr =>
        addr.id === editingAddress.id ? updated : addr
      ))
      setEditingAddress(null)
    } catch (error) {
      console.error('更新地址失败:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await userService.deleteAddress(id)
      setAddresses(prev => prev.filter(addr => addr.id !== id))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('删除地址失败:', error)
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await userService.setDefaultAddress(id)
      setAddresses(prev => prev.map(addr => ({
        ...addr,
        is_default: addr.id === id
      })))
    } catch (error) {
      console.error('设置默认地址失败:', error)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-cream-200 rounded-xl" />
          <div className="h-32 bg-cream-200 rounded-xl" />
          <div className="h-32 bg-cream-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">收货地址</h1>
          <p className="text-sm text-stone mt-1">管理您的收货地址，最多可添加 20 个</p>
        </div>
        {!showForm && !editingAddress && (
          <Button onClick={() => setShowForm(true)} disabled={addresses.length >= 20}>
            <Plus className="w-4 h-4 mr-1" />
            添加地址
          </Button>
        )}
      </div>

      {/* 添加新地址表单 */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>添加新地址</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              loading={saving}
            />
          </CardContent>
        </Card>
      )}

      {/* 编辑地址表单 */}
      {editingAddress && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>编辑地址</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressForm
              initialData={editingAddress}
              onSubmit={handleUpdate}
              onCancel={() => setEditingAddress(null)}
              loading={saving}
            />
          </CardContent>
        </Card>
      )}

      {/* 地址列表 */}
      {addresses.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-cream-100 rounded-full">
              <MapPin className="w-8 h-8 text-stone" />
            </div>
            <p className="text-charcoal font-medium mb-2">暂无收货地址</p>
            <p className="text-sm text-stone mb-4">添加收货地址，方便购物时快速选择</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              添加地址
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {addresses.map(address => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => setEditingAddress(address)}
              onDelete={() => setDeleteConfirm(address.id)}
              onSetDefault={() => handleSetDefault(address.id)}
            />
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-sm mx-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-red-100 rounded-full">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-medium text-charcoal">确认删除</p>
                  <p className="text-sm text-stone">删除后无法恢复</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(deleteConfirm)}
                >
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
