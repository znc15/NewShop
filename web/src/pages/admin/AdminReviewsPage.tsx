import { useCallback, useEffect, useState } from 'react'
import adminService from '@/services/admin'
import type { AdminProduct, AdminReview, AdminReviewFormData, AdminReviewListParams } from '@/types/admin'
import { DataTable, Pagination, SearchInput, Select, Modal, ConfirmDialog, StatusBadge } from '@/components/admin/AdminComponents'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn, truncate } from '@/utils'

const REVIEW_STATUS_LABELS: Record<string, string> = {
  active: '展示中',
  inactive: '已隐藏',
}

const REVIEW_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
}

const INITIAL_FORM_DATA: AdminReviewFormData = {
  product_id: 0,
  author: '',
  handle: '',
  avatar: '',
  content: '',
  rating: 5,
  sort: 0,
  status: 'active',
}

function renderStars(rating: number) {
  const safe = Math.max(1, Math.min(5, rating))
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={`star-${safe}-${index}`}
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="currentColor"
          style={{ opacity: index < safe ? 1 : 0.25 }}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const [params, setParams] = useState<AdminReviewListParams>({
    page: 1,
    page_size: 10,
  })

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null)
  const [formData, setFormData] = useState<AdminReviewFormData>(INITIAL_FORM_DATA)
  const [saving, setSaving] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.getReviews(params)
      setReviews(res.items)
      setTotal(res.total)
    } catch (error) {
      console.error('获取评价列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [params])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await adminService.getProducts({
        page: 1,
        page_size: 200,
      })
      setProducts(res.items)
    } catch (error) {
      console.error('获取商品列表失败:', error)
      setProducts([])
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSearch = (keyword: string) => {
    setParams((prev) => ({ ...prev, page: 1, keyword }))
  }

  const handleStatusChange = (status: string) => {
    setParams((prev) => ({ ...prev, page: 1, status: status || undefined }))
  }

  const handleProductFilterChange = (productId: string) => {
    const value = Number(productId)
    setParams((prev) => ({ ...prev, page: 1, product_id: value > 0 ? value : undefined }))
  }

  const openEditModal = (review?: AdminReview) => {
    if (review) {
      setSelectedReview(review)
      setFormData({
        product_id: review.product_id,
        author: review.author,
        handle: review.handle,
        avatar: review.avatar,
        content: review.content,
        rating: review.rating,
        sort: review.sort,
        status: review.status,
      })
    } else {
      setSelectedReview(null)
      setFormData(INITIAL_FORM_DATA)
    }
    setEditModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.product_id) {
      alert('请选择商品')
      return
    }
    if (!formData.author.trim() || !formData.content.trim()) {
      alert('请填写作者和评价内容')
      return
    }

    setSaving(true)
    try {
      const payload: AdminReviewFormData = {
        ...formData,
        author: formData.author.trim(),
        handle: formData.handle?.trim(),
        avatar: formData.avatar?.trim(),
        content: formData.content.trim(),
      }

      if (selectedReview) {
        await adminService.updateReview(selectedReview.id, payload)
      } else {
        await adminService.createReview(payload)
      }

      setEditModalOpen(false)
      fetchReviews()
    } catch (error) {
      console.error('保存评价失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedReview) return

    setSaving(true)
    try {
      await adminService.deleteReview(selectedReview.id)
      setDeleteDialogOpen(false)
      setSelectedReview(null)
      fetchReviews()
    } catch (error) {
      console.error('删除评价失败:', error)
      alert('删除失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'product_name',
      title: '商品',
      render: (item: AdminReview) => (
        <div>
          <p className="font-medium">{item.product_name || `商品 #${item.product_id}`}</p>
          <p className="text-xs text-stone">ID: {item.product_id}</p>
        </div>
      ),
    },
    {
      key: 'author',
      title: '用户',
      render: (item: AdminReview) => (
        <div>
          <p className="font-medium">{item.author}</p>
          <p className="text-xs text-stone">{item.handle || '-'}</p>
        </div>
      ),
    },
    {
      key: 'rating',
      title: '评分',
      render: (item: AdminReview) => (
        <div className="space-y-1">
          {renderStars(item.rating)}
          <p className="text-xs text-stone">{item.rating}.0 分</p>
        </div>
      ),
    },
    {
      key: 'content',
      title: '评价内容',
      render: (item: AdminReview) => (
        <p className="max-w-[320px] whitespace-pre-wrap text-sm text-charcoal">
          {truncate(item.content, 80)}
        </p>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (item: AdminReview) => (
        <StatusBadge
          status={item.status}
          labels={REVIEW_STATUS_LABELS}
          colors={REVIEW_STATUS_COLORS}
        />
      ),
    },
    {
      key: 'sort',
      title: '排序',
    },
    {
      key: 'actions',
      title: '操作',
      render: (item: AdminReview) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(item)}
            className="px-2 py-1 text-xs bg-forest-100 text-forest-700 rounded hover:bg-forest-200 transition-colors"
          >
            编辑
          </button>
          <button
            onClick={() => {
              setSelectedReview(item)
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SearchInput
            value={params.keyword || ''}
            onChange={handleSearch}
            placeholder="搜索作者或评价内容..."
            className="w-64"
          />
          <Select
            value={params.status || ''}
            onChange={handleStatusChange}
            options={[
              { value: 'active', label: '展示中' },
              { value: 'inactive', label: '已隐藏' },
            ]}
            placeholder="全部状态"
          />
          <select
            value={params.product_id || ''}
            onChange={(e) => handleProductFilterChange(e.target.value)}
            className={cn(
              'px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white',
              'min-w-[220px]'
            )}
          >
            <option value="">全部商品</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={() => openEditModal()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新增评价
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-cream-200">
        <DataTable
          columns={columns}
          data={reviews}
          loading={loading}
          emptyText="暂无商品评价"
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

      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedReview ? '编辑评价' : '新增评价'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              关联商品 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, product_id: Number(e.target.value) }))}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            >
              <option value={0}>请选择商品</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                作者 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))}
                placeholder="请输入作者昵称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                用户标识
              </label>
              <Input
                value={formData.handle || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, handle: e.target.value }))}
                placeholder="例如 @newshop_user"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                头像文本
              </label>
              <Input
                value={formData.avatar || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, avatar: e.target.value }))}
                placeholder="例如 凛"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                评分
              </label>
              <select
                value={formData.rating}
                onChange={(e) => setFormData((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              >
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} 星
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                状态
              </label>
              <select
                value={formData.status || 'active'}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              >
                <option value="active">展示中</option>
                <option value="inactive">已隐藏</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              排序值
            </label>
            <Input
              type="number"
              value={formData.sort ?? 0}
              onChange={(e) => setFormData((prev) => ({ ...prev, sort: Number(e.target.value) || 0 }))}
              placeholder="数值越小越靠前"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              评价内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="请输入评价内容"
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
              rows={5}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              取消
            </Button>
            <Button onClick={() => { void handleSave() }} loading={saving}>
              {saving ? '保存中...' : selectedReview ? '保存修改' : '创建评价'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="确认删除"
        message={`确定要删除评价「${truncate(selectedReview?.content || '', 24)}」吗？此操作不可恢复。`}
        confirmText="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setSelectedReview(null)
        }}
        loading={saving}
      />
    </div>
  )
}

export default AdminReviewsPage
