import { useEffect, useState, useCallback } from 'react'
import adminService from '@/services/admin'
import type { AdminCategory, AdminCategoryFormData } from '@/types/admin'
import { Modal, ConfirmDialog, StatusBadge } from '@/components/admin/AdminComponents'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils'

// 分类状态配置
const CATEGORY_STATUS_LABELS: Record<string, string> = {
  active: '启用',
  inactive: '禁用',
}

const CATEGORY_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null)
  const [formData, setFormData] = useState<AdminCategoryFormData>({
    name: '',
    parent_id: undefined,
    icon: '',
    sort: 0,
    status: 'active',
  })
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.getCategories()
      setCategories(res)
    } catch (error) {
      console.error('获取分类列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // 切换展开/收起
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 获取所有父级分类（用于选择父级）
  const getParentOptions = (excludeId?: number): AdminCategory[] => {
    return categories.filter((cat) => {
      if (cat.id === excludeId) return false
      return !cat.parent_id // 只能选择顶级分类作为父级
    })
  }

  // 打开编辑弹窗
  const openEditModal = (category?: AdminCategory, parentId?: number) => {
    if (category) {
      setSelectedCategory(category)
      setFormData({
        name: category.name,
        parent_id: category.parent_id || undefined,
        icon: category.icon || '',
        sort: category.sort,
        status: category.status,
      })
    } else {
      setSelectedCategory(null)
      setFormData({
        name: '',
        parent_id: parentId,
        icon: '',
        sort: 0,
        status: 'active',
      })
    }
    setEditModalOpen(true)
  }

  // 保存分类
  const handleSave = async () => {
    if (!formData.name) {
      alert('请填写分类名称')
      return
    }

    setSaving(true)
    try {
      if (selectedCategory) {
        await adminService.updateCategory(selectedCategory.id, formData)
      } else {
        await adminService.createCategory(formData)
      }
      setEditModalOpen(false)
      fetchCategories()
    } catch (error) {
      console.error('保存分类失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 删除分类
  const handleDelete = async () => {
    if (!selectedCategory) return

    setSaving(true)
    try {
      await adminService.deleteCategory(selectedCategory.id)
      setDeleteDialogOpen(false)
      setSelectedCategory(null)
      fetchCategories()
    } catch (error) {
      console.error('删除分类失败:', error)
      alert('删除失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 渲染分类树节点
  const renderCategoryNode = (category: AdminCategory, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedIds.has(category.id)

    return (
      <div key={category.id}>
        <div
          className={cn(
            'flex items-center gap-3 py-3 px-4 hover:bg-cream-50 border-b border-cream-100',
            level > 0 && 'pl-12'
          )}
        >
          {/* 展开/收起按钮 */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="p-1 hover:bg-cream-200 rounded transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn('transition-transform', isExpanded && 'rotate-90')}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : (
            <div className="w-8" />
          )}

          {/* 分类信息 */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{category.name}</span>
              <StatusBadge
                status={category.status}
                labels={CATEGORY_STATUS_LABELS}
                colors={CATEGORY_STATUS_COLORS}
              />
            </div>
            <p className="text-xs text-stone mt-0.5">
              {category.product_count} 个商品
              {category.parent_name && ` · 父级：${category.parent_name}`}
            </p>
          </div>

          {/* 排序 */}
          <span className="text-sm text-stone">排序: {category.sort}</span>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            {level === 0 && (
              <button
                onClick={() => openEditModal(undefined, category.id)}
                className="px-2 py-1 text-xs bg-forest-50 text-forest-600 rounded hover:bg-forest-100 transition-colors"
              >
                添加子分类
              </button>
            )}
            <button
              onClick={() => openEditModal(category)}
              className="px-2 py-1 text-xs bg-cream-100 text-charcoal rounded hover:bg-cream-200 transition-colors"
            >
              编辑
            </button>
            <button
              onClick={() => {
                setSelectedCategory(category)
                setDeleteDialogOpen(true)
              }}
              disabled={category.product_count > 0 || hasChildren}
              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={category.product_count > 0 || hasChildren ? '该分类下存在商品或子分类，无法删除' : ''}
            >
              删除
            </button>
          </div>
        </div>

        {/* 子分类 */}
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone">
          共 {categories.length} 个顶级分类
        </p>
        <Button onClick={() => openEditModal()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          添加分类
        </Button>
      </div>

      {/* 分类树 */}
      <div className="bg-white rounded-xl border border-cream-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-600" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-stone">暂无分类数据</div>
        ) : (
          <div>
            {/* 表头 */}
            <div className="flex items-center gap-3 py-3 px-4 bg-cream-50 border-b border-cream-200 text-sm font-medium text-charcoal">
              <div className="w-8" />
              <div className="flex-1">分类名称</div>
              <div className="w-20 text-right">排序</div>
              <div className="w-32 text-right">操作</div>
            </div>
            {/* 分类列表 */}
            {categories.map((category) => renderCategoryNode(category))}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={selectedCategory ? '编辑分类' : '添加分类'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              分类名称 <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="请输入分类名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              父级分类
            </label>
            <select
              value={formData.parent_id || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, parent_id: Number(e.target.value) || undefined }))}
              className="w-full px-3 py-2 text-sm border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
              disabled={!!selectedCategory?.parent_id} // 子分类不能更改父级
            >
              <option value="">无（顶级分类）</option>
              {getParentOptions(selectedCategory?.id).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {selectedCategory?.parent_id && (
              <p className="text-xs text-stone mt-1">子分类不能更改父级分类</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                排序
              </label>
              <Input
                type="number"
                value={formData.sort}
                onChange={(e) => setFormData((prev) => ({ ...prev, sort: Number(e.target.value) }))}
                placeholder="0"
              />
              <p className="text-xs text-stone mt-1">数值越小越靠前</p>
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
                <option value="inactive">禁用</option>
              </select>
            </div>
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
        message={`确定要删除分类「${selectedCategory?.name}」吗？此操作不可恢复。`}
        confirmText="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setSelectedCategory(null)
        }}
        loading={saving}
      />
    </div>
  )
}

export default AdminCategoriesPage
