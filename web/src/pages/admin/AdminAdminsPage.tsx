import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Shield, ShieldAlert, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import adminService from '@/services/admin'
import type { AdminDetail } from '@/types/admin'
import { getApiErrorMessage } from '@/utils'
import { cn } from '@/utils'

// 角色标签映射
const ROLE_CONFIG: Record<string, { label: string; className: string; icon: typeof Shield }> = {
  super_admin: { label: '超级管理员', className: 'bg-red-100 text-red-700 border-red-200', icon: ShieldAlert },
  admin: { label: '管理员', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Shield },
  operator: { label: '运营', className: 'bg-gray-100 text-gray-700 border-gray-200', icon: ShieldCheck },
}

// 状态标签映射
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: '正常', className: 'bg-green-100 text-green-700' },
  disabled: { label: '已禁用', className: 'bg-red-100 text-red-700' },
}

// 对话框模式
type ModalMode = 'create' | 'edit' | null

// 表单状态
interface AdminFormState {
  username: string
  password: string
  nickname: string
  role: 'admin' | 'super_admin' | 'operator'
  status: 'active' | 'disabled'
}

const EMPTY_FORM: AdminFormState = {
  username: '',
  password: '',
  nickname: '',
  role: 'admin',
  status: 'active',
}

export function AdminAdminsPage() {
  const [admins, setAdmins] = useState<AdminDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<AdminFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null)
  const PAGE_SIZE = 20

  useEffect(() => {
    // 获取当前管理员 ID（从 localStorage 解析）
    try {
      const storage = localStorage.getItem('admin-auth-storage')
      if (storage) {
        const parsed = JSON.parse(storage)
        if (parsed?.state?.admin?.id) {
          setCurrentAdminId(parsed.state.admin.id)
        }
      }
    } catch {
      // 忽略解析错误
    }
  }, [])

  const fetchAdmins = async (pageNum: number) => {
    setLoading(true)
    try {
      const data = await adminService.getAdmins(pageNum, PAGE_SIZE)
      setAdmins(data.admins || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('获取管理员列表失败:', error)
      alert(getApiErrorMessage(error, '获取管理员列表失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins(page)
  }, [page])

  const validateForm = (mode: 'create' | 'edit'): boolean => {
    const newErrors: Record<string, string> = {}

    if (mode === 'create') {
      if (!form.username.trim() || form.username.trim().length < 3) {
        newErrors.username = '用户名至少 3 个字符'
      }
      if (!form.password.trim() || form.password.trim().length < 6) {
        newErrors.password = '密码至少 6 个字符'
      }
    } else if (mode === 'edit') {
      if (form.password.trim() && form.password.trim().length < 6) {
        newErrors.password = '密码至少 6 个字符（留空则不修改）'
      }
    }

    if (!form.nickname.trim()) {
      newErrors.nickname = '请输入昵称'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const openCreateModal = () => {
    setModalMode('create')
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const openEditModal = (admin: AdminDetail) => {
    setModalMode('edit')
    setEditingId(admin.id)
    setForm({
      username: admin.username,
      password: '',
      nickname: admin.nickname,
      role: admin.role,
      status: admin.status,
    })
    setErrors({})
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!modalMode) return

    if (!validateForm(modalMode)) return

    setSubmitting(true)
    try {
      if (modalMode === 'create') {
        await adminService.createAdmin({
          username: form.username.trim(),
          password: form.password,
          nickname: form.nickname.trim(),
          role: form.role,
        })
        alert('管理员创建成功')
      } else if (modalMode === 'edit' && editingId) {
        const updateData: Record<string, string> = {
          nickname: form.nickname.trim(),
        }
        if (form.password.trim()) {
          updateData.password = form.password.trim()
        }
        if (form.role) {
          updateData.role = form.role
        }
        if (form.status) {
          updateData.status = form.status
        }
        await adminService.updateAdmin(editingId, updateData)
        alert('管理员信息更新成功')
      }

      closeModal()
      fetchAdmins(page)
    } catch (error) {
      console.error('操作失败:', error)
      alert(getApiErrorMessage(error, '操作失败，请稍后重试'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (admin: AdminDetail) => {
    if (admin.id === currentAdminId) {
      alert('不能删除自己的账号')
      return
    }

    if (!confirm(`确定要删除管理员「${admin.nickname || admin.username}」吗？此操作不可撤销。`)) {
      return
    }

    try {
      await adminService.deleteAdmin(admin.id)
      alert('管理员已删除')
      fetchAdmins(page)
    } catch (error) {
      console.error('删除管理员失败:', error)
      alert(getApiErrorMessage(error, '删除管理员失败，请稍后重试'))
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (loading && admins.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">管理员管理</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            管理系统后台管理员账号，包括创建、编辑、禁用和删除操作。
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          添加管理员
        </Button>
      </div>

      {/* 管理员表格 */}
      <Card className="overflow-hidden border-slate-200/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3.5 font-medium text-slate-500 text-xs">用户名</th>
                <th className="text-left px-6 py-3.5 font-medium text-slate-500 text-xs">昵称</th>
                <th className="text-left px-6 py-3.5 font-medium text-slate-500 text-xs">角色</th>
                <th className="text-left px-6 py-3.5 font-medium text-slate-500 text-xs">状态</th>
                <th className="text-left px-6 py-3.5 font-medium text-slate-500 text-xs">最后登录</th>
                <th className="text-right px-6 py-3.5 font-medium text-slate-500 text-xs">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Shield className="h-8 w-8 opacity-40" />
                      <p className="text-sm">暂无管理员数据</p>
                    </div>
                  </td>
                </tr>
              ) : (
                admins.map((admin) => {
                  const RoleIcon = ROLE_CONFIG[admin.role]?.icon || Shield
                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{admin.username}</td>
                      <td className="px-6 py-4 text-slate-600">{admin.nickname || '-'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                            ROLE_CONFIG[admin.role]?.className || 'bg-gray-100 text-gray-700 border-gray-200'
                          )}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {ROLE_CONFIG[admin.role]?.label || admin.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                            STATUS_CONFIG[admin.status]?.className || 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {admin.status === 'active' ? (
                            <UserCheck className="h-3 w-3" />
                          ) : (
                            <UserX className="h-3 w-3" />
                          )}
                          {STATUS_CONFIG[admin.status]?.label || admin.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {admin.last_login_at
                          ? new Date(admin.last_login_at).toLocaleString('zh-CN')
                          : '从未登录'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(admin)}
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(admin)}
                            className={cn(
                              'p-2 rounded-lg transition-colors',
                              admin.id === currentAdminId
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                            )}
                            title={admin.id === currentAdminId ? '不能删除自己' : '删除'}
                            disabled={admin.id === currentAdminId}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-sm text-slate-500">
              共 {total} 条，第 {page} / {totalPages} 页
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 创建/编辑弹窗 */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 遮罩 */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          {/* 弹窗卡片 */}
          <Card className="relative z-10 w-full max-w-md mx-auto shadow-xl border-slate-200/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                {modalMode === 'create' ? '添加管理员' : '编辑管理员'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">用户名</label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="请输入用户名"
                  disabled={modalMode === 'edit'}
                  error={errors.username}
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-red-500">{errors.username}</p>
                )}
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {modalMode === 'create' ? '密码' : '新密码（留空则不修改）'}
                </label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={modalMode === 'create' ? '请输入密码（至少 6 位）' : '留空不修改密码'}
                  error={errors.password}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              {/* 昵称 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">昵称</label>
                <Input
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  placeholder="请输入昵称"
                  error={errors.nickname}
                />
                {errors.nickname && (
                  <p className="mt-1 text-xs text-red-500">{errors.nickname}</p>
                )}
              </div>

              {/* 角色 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">角色</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as AdminFormState['role'] })}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="super_admin">超级管理员</option>
                  <option value="admin">管理员</option>
                  <option value="operator">运营</option>
                </select>
              </div>

              {/* 状态（仅编辑模式） */}
              {modalMode === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'disabled' })}
                    className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">正常</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={closeModal}>
                  取消
                </Button>
                <Button onClick={handleSubmit} loading={submitting}>
                  {modalMode === 'create' ? '创建' : '保存'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default AdminAdminsPage
