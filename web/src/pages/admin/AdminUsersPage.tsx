import { useEffect, useState, useCallback } from 'react'
import adminService from '@/services/admin'
import type { AdminUser, AdminUserListParams } from '@/types/admin'
import { DataTable, Pagination, SearchInput, Select, Modal, StatusBadge } from '@/components/admin/AdminComponents'
import { Button } from '@/components/ui/Button'

// 用户状态配置
const USER_STATUS_LABELS: Record<string, string> = {
  active: '正常',
  disabled: '已禁用',
}

const USER_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  disabled: 'bg-red-100 text-red-800',
}

// 会员等级配置
const MEMBER_LEVELS = [
  { level: 1, name: '普通会员' },
  { level: 2, name: '铜牌会员' },
  { level: 3, name: '银牌会员' },
  { level: 4, name: '金牌会员' },
  { level: 5, name: '钻石会员' },
]

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [params, setParams] = useState<AdminUserListParams>({
    page: 1,
    page_size: 10,
  })

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.getUsers(params)
      setUsers(res.items)
      setTotal(res.total)
    } catch (error) {
      console.error('获取用户列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (keyword: string) => {
    setParams((prev) => ({ ...prev, page: 1, keyword: keyword || undefined }))
  }

  const handleStatusChange = (status: string) => {
    setParams((prev) => ({ ...prev, page: 1, status: status || undefined }))
  }

  const openDetailModal = async (user: AdminUser) => {
    try {
      const detail = await adminService.getUser(user.id)
      setSelectedUser(detail)
    } catch (error) {
      console.error('获取用户详情失败:', error)
      setSelectedUser(user)
    }
    setDetailModalOpen(true)
  }

  const handleToggleStatus = async (user: AdminUser) => {
    const action = user.status === 'active' ? '禁用' : '启用'
    if (!confirm(`确定要${action}用户「${user.nickname || user.username}」吗？`)) {
      return
    }

    setSaving(true)
    try {
      if (user.status === 'active') {
        await adminService.disableUser(user.id)
      } else {
        await adminService.enableUser(user.id)
      }
      fetchUsers()
    } catch (error) {
      console.error(`${action}用户失败:`, error)
      alert(`${action}失败，请重试`)
    } finally {
      setSaving(false)
    }
  }

  const getMemberLevelName = (level: number) => {
    return MEMBER_LEVELS.find((l) => l.level === level)?.name || '普通会员'
  }

  const columns = [
    {
      key: 'avatar',
      title: '头像',
      render: (item: AdminUser) => (
        <img
          src={item.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nickname ?? item.username ?? 'User')}&background=2D5A3D&color=fff`}
          alt={item.nickname ?? item.username ?? 'User'}
          className="w-10 h-10 rounded-full object-cover"
        />
      ),
    },
    {
      key: 'user',
      title: '用户信息',
      render: (item: AdminUser) => (
        <div>
          <p className="font-medium">{item.nickname || item.username}</p>
          <p className="text-xs text-stone">{item.email}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      title: '手机号',
      render: (item: AdminUser) => <span className="text-sm">{item.phone || '-'}</span>,
    },
    {
      key: 'level',
      title: '会员等级',
      render: (item: AdminUser) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-forest-100 text-forest-700">
          {getMemberLevelName(item.level)}
        </span>
      ),
    },
    {
      key: 'points',
      title: '积分',
      render: (item: AdminUser) => <span>{item.points.toLocaleString()}</span>,
    },
    {
      key: 'total_spent',
      title: '累计消费',
      render: (item: AdminUser) => (
        <span className="font-medium text-copper-600">¥{item.total_spent.toLocaleString()}</span>
      ),
    },
    {
      key: 'order_count',
      title: '订单数',
      render: (item: AdminUser) => <span>{item.order_count}</span>,
    },
    {
      key: 'status',
      title: '状态',
      render: (item: AdminUser) => (
        <StatusBadge
          status={item.status}
          labels={USER_STATUS_LABELS}
          colors={USER_STATUS_COLORS}
        />
      ),
    },
    {
      key: 'created_at',
      title: '注册时间',
      render: (item: AdminUser) => (
        <span className="text-sm text-stone">{item.created_at}</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (item: AdminUser) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDetailModal(item)}
            className="px-2 py-1 text-xs bg-cream-100 text-charcoal rounded hover:bg-cream-200 transition-colors"
          >
            详情
          </button>
          <button
            onClick={() => handleToggleStatus(item)}
            disabled={saving}
            className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
              item.status === 'active'
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {item.status === 'active' ? '禁用' : '启用'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={params.keyword || ''}
          onChange={handleSearch}
          placeholder="搜索用户名/邮箱/手机..."
          className="w-72"
        />
        <Select
          value={params.status || ''}
          onChange={handleStatusChange}
          options={Object.entries(USER_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          placeholder="全部状态"
        />
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl border border-cream-200">
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          emptyText="暂无用户数据"
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

      {/* 用户详情弹窗 */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`用户详情 - ${selectedUser?.nickname || selectedUser?.username || ''}`}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="flex items-start gap-4">
              <img
                src={selectedUser.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.nickname ?? selectedUser.username ?? 'User')}&background=2D5A3D&color=fff&size=80`}
                alt={selectedUser.nickname ?? selectedUser.username ?? 'User'}
                className="w-20 h-20 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">{selectedUser.nickname || selectedUser.username}</h3>
                  <StatusBadge
                    status={selectedUser.status}
                    labels={USER_STATUS_LABELS}
                    colors={USER_STATUS_COLORS}
                  />
                </div>
                <p className="text-sm text-stone">{selectedUser.email}</p>
                {selectedUser.phone && (
                  <p className="text-sm text-stone">{selectedUser.phone}</p>
                )}
              </div>
            </div>

            {/* 会员信息 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-cream-50 rounded-lg p-4 text-center">
                <p className="text-xs text-stone mb-1">会员等级</p>
                <p className="font-medium text-forest-600">{getMemberLevelName(selectedUser.level)}</p>
              </div>
              <div className="bg-cream-50 rounded-lg p-4 text-center">
                <p className="text-xs text-stone mb-1">当前积分</p>
                <p className="font-medium">{selectedUser.points.toLocaleString()}</p>
              </div>
              <div className="bg-cream-50 rounded-lg p-4 text-center">
                <p className="text-xs text-stone mb-1">累计消费</p>
                <p className="font-medium text-copper-600">¥{selectedUser.total_spent.toLocaleString()}</p>
              </div>
              <div className="bg-cream-50 rounded-lg p-4 text-center">
                <p className="text-xs text-stone mb-1">订单数量</p>
                <p className="font-medium">{selectedUser.order_count}</p>
              </div>
            </div>

            {/* 时间信息 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone">注册时间</span>
                <span>{selectedUser.created_at}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone">最后更新</span>
                <span>{selectedUser.updated_at}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant={selectedUser.status === 'active' ? 'destructive' : 'default'}
                onClick={() => {
                  setDetailModalOpen(false)
                  handleToggleStatus(selectedUser)
                }}
              >
                {selectedUser.status === 'active' ? '禁用用户' : '启用用户'}
              </Button>
              <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AdminUsersPage
