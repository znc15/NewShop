import { useEffect, useState, useCallback } from 'react'
import adminService from '@/services/admin'
import type { AdminProduct, AdminProductListParams, AdminProductFormData } from '@/types/admin'
import type { Category } from '@/types'
import { DataTable, Pagination, SearchInput, Select, Modal, ConfirmDialog, StatusBadge } from '@/components/admin/AdminComponents'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils'

// 商品状态配置
const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  active: '上架',
  inactive: '下架',
  sold_out: '售罄',
}

const PRODUCT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-yellow-100 text-yellow-800',
  sold_out: 'bg-red-100 text-red-800',
}

const INITIAL_FORM_DATA: AdminProductFormData = {
  name: '',
  description: '',
  detail: '',
  detail_images: [],
  price: 0,
  category_id: 0,
  status: 'draft',
  stock: 0,
  is_hot: false,
  is_sale: false,
  sort: 0,
  images: [],
  skus: [],
}

function parseImageList(images: string | null): string[] {
  if (!images) {
    return []
  }

  return images
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function parseLineImageList(images: string): string[] {
  if (!images) {
    return []
  }

  return images
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function formatImageList(images: string[] | undefined): string {
  if (!images || images.length === 0) {
    return ''
  }

  return images.join('\n')
}

export function AdminProductsPage() {
  // 列表数据
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // 筛选参数
  const [params, setParams] = useState<AdminProductListParams>({
    page: 1,
    page_size: 10,
  })

  // 弹窗状态
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null)
  const [formData, setFormData] = useState<AdminProductFormData>(INITIAL_FORM_DATA)
  const [saving, setSaving] = useState(false)

  // 获取商品列表
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.getProducts(params)
      setProducts(res.items)
      setTotal(res.total)
    } catch (error) {
      console.error('获取商品列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [params])

  // 获取分类列表
  const fetchCategories = useCallback(async () => {
    try {
      const res = await adminService.getCategories()
      setCategories(res)
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  // 搜索防抖
  const handleSearch = (keyword: string) => {
    setParams((prev) => ({ ...prev, page: 1, keyword }))
  }

  // 状态筛选
  const handleStatusChange = (status: string) => {
    setParams((prev) => ({ ...prev, page: 1, status: status || undefined }))
  }

  // 打开编辑弹窗
  const openEditModal = (product?: AdminProduct) => {
    if (product) {
      setSelectedProduct(product)
      setFormData({
        name: product.name,
        description: product.description,
        detail: product.detail || '',
        detail_images: product.detail_images || [],
        price: product.price,
        original_price: product.original_price || undefined,
        category_id: product.category_id,
        status: product.status,
        stock: product.stock,
        is_hot: product.is_hot,
        is_sale: product.is_sale,
        sort: product.sort,
        images: parseImageList(product.images),
        skus: [],
      })
    } else {
      setSelectedProduct(null)
      setFormData(INITIAL_FORM_DATA)
    }
    setEditModalOpen(true)
  }

  // 保存商品
  const handleSave = async (continueCreate = false) => {
    if (!formData.name || !formData.category_id) {
      alert('请填写必填项')
      return
    }

    setSaving(true)
    try {
      if (selectedProduct) {
        await adminService.updateProduct(selectedProduct.id, formData)
      } else {
        await adminService.createProduct(formData)

        if (continueCreate) {
          setFormData((prev) => ({
            ...INITIAL_FORM_DATA,
            category_id: prev.category_id,
            status: prev.status,
            is_hot: prev.is_hot,
            is_sale: prev.is_sale,
          }))
          fetchProducts()
          return
        }
      }

      setEditModalOpen(false)
      fetchProducts()
    } catch (error) {
      console.error('保存商品失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 删除商品
  const handleDelete = async () => {
    if (!selectedProduct) return

    setSaving(true)
    try {
      await adminService.deleteProduct(selectedProduct.id)
      setDeleteDialogOpen(false)
      setSelectedProduct(null)
      fetchProducts()
    } catch (error) {
      console.error('删除商品失败:', error)
      alert('删除失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 切换上架/下架状态
  const toggleStatus = async (product: AdminProduct) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active'
    try {
      await adminService.updateProductStatus(product.id, newStatus)
      fetchProducts()
    } catch (error) {
      console.error('更新状态失败:', error)
      alert('操作失败，请重试')
    }
  }

  // 表格列定义
  const columns = [
    {
      key: 'main_image',
      title: '图片',
      render: (item: AdminProduct) => (
        <img
          src={item.main_image}
          alt={item.name}
          className="w-12 h-12 object-cover rounded"
        />
      ),
    },
    {
      key: 'name',
      title: '商品名称',
      render: (item: AdminProduct) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-stone">{item.category_name}</p>
        </div>
      ),
    },
    {
      key: 'price',
      title: '价格',
      render: (item: AdminProduct) => (
        <div>
          <p className="font-medium text-copper-600">¥{item.price}</p>
          {item.original_price && (
            <p className="text-xs text-stone line-through">¥{item.original_price}</p>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      title: '库存',
      render: (item: AdminProduct) => (
        <span className={cn(item.stock < 10 ? 'text-red-600' : '')}>
          {item.stock}
        </span>
      ),
    },
    {
      key: 'sales_count',
      title: '销量',
    },
    {
      key: 'status',
      title: '状态',
      render: (item: AdminProduct) => (
        <StatusBadge
          status={item.status}
          labels={PRODUCT_STATUS_LABELS}
          colors={PRODUCT_STATUS_COLORS}
        />
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (item: AdminProduct) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleStatus(item)}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors',
              item.status === 'active'
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            )}
          >
            {item.status === 'active' ? '下架' : '上架'}
          </button>
          <button
            onClick={() => openEditModal(item)}
            className="px-2 py-1 text-xs bg-forest-100 text-forest-700 rounded hover:bg-forest-200 transition-colors"
          >
            编辑
          </button>
          <button
            onClick={() => {
              setSelectedProduct(item)
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
            placeholder="搜索商品名称..."
            className="w-64"
          />
          <Select
            value={params.status || ''}
            onChange={handleStatusChange}
            options={[
              { value: 'active', label: '上架' },
              { value: 'inactive', label: '下架' },
              { value: 'draft', label: '草稿' },
              { value: 'sold_out', label: '售罄' },
            ]}
            placeholder="全部状态"
          />
        </div>
        <Button onClick={() => openEditModal()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          添加商品
        </Button>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border border-cream-200">
        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          emptyText="暂无商品数据"
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
        title={selectedProduct ? '编辑商品' : '添加商品'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              商品名称 <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="请输入商品名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              商品描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="请输入商品描述"
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              商品说明
            </label>
            <textarea
              value={formData.detail || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, detail: e.target.value }))}
              placeholder="请输入商品说明（如材质、规格、卖点等）"
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              轮播图 URL 列表
            </label>
            <textarea
              value={formatImageList(formData.images)}
              onChange={(e) => setFormData((prev) => ({ ...prev, images: parseLineImageList(e.target.value) }))}
              placeholder="每行一个图片地址，可直接粘贴淘宝图床链接"
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              详情导入图片 URL 列表
            </label>
            <textarea
              value={formatImageList(formData.detail_images)}
              onChange={(e) => setFormData((prev) => ({ ...prev, detail_images: parseLineImageList(e.target.value) }))}
              placeholder="支持淘宝详情图导入，每行一个图片地址"
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                分类 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, category_id: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              >
                <option value={0}>请选择分类</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as 'draft' | 'active' | 'inactive' }))}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              >
                <option value="draft">草稿</option>
                <option value="active">上架</option>
                <option value="inactive">下架</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                销售价格 <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                placeholder="请输入销售价格"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                原价
              </label>
              <Input
                type="number"
                value={formData.original_price || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, original_price: Number(e.target.value) || undefined }))}
                placeholder="请输入原价（可选）"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              库存
            </label>
            <Input
              type="number"
              value={formData.stock ?? 0}
              onChange={(e) => setFormData((prev) => ({ ...prev, stock: Number(e.target.value) || 0 }))}
              placeholder="请输入库存"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 rounded-lg border border-cream-300 px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_hot}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_hot: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-charcoal">热卖</span>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-cream-300 px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_sale}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_sale: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-charcoal">特惠</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              取消
            </Button>
            {!selectedProduct && (
              <Button variant="secondary" onClick={() => { void handleSave(true) }} loading={saving}>
                {saving ? '保存中...' : '保存并继续新增'}
              </Button>
            )}
            <Button onClick={() => { void handleSave(false) }} loading={saving}>
              {saving ? '保存中...' : selectedProduct ? '保存修改' : '保存并关闭'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 删除确认框 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="确认删除"
        message={`确定要删除商品「${selectedProduct?.name}」吗？此操作不可恢复。`}
        confirmText="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setSelectedProduct(null)
        }}
        loading={saving}
      />
    </div>
  )
}

export default AdminProductsPage
