import { useEffect, useState } from 'react'
import adminService from '@/services/admin'
import type { DashboardStats } from '@/types/admin'
import { cn } from '@/utils'

// 统计卡片组件
function StatCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  trendLabel?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-cream-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone">{title}</p>
          <p className="text-2xl font-semibold text-charcoal mt-1">{value}</p>
          {trend !== undefined && (
            <p
              className={cn(
                'text-xs mt-2',
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend >= 0 ? '+' : ''}{trend}% {trendLabel}
            </p>
          )}
        </div>
        <div className="p-3 bg-forest-50 rounded-lg text-forest-600">{icon}</div>
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminService.getDashboardStats()
        setStats(data)
      } catch (error) {
        console.error('获取统计数据失败:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-600" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-stone">加载失败</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="今日订单"
          value={stats.today_orders}
          trend={12.5}
          trendLabel="较昨日"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
            </svg>
          }
        />
        <StatCard
          title="今日销售额"
          value={`¥${stats.today_sales.toLocaleString()}`}
          trend={8.3}
          trendLabel="较昨日"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          title="新增用户"
          value={stats.today_users}
          trend={5.2}
          trendLabel="较昨日"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          }
        />
        <StatCard
          title="待处理订单"
          value={stats.pending_orders}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          }
        />
      </div>

      {/* 快捷操作和数据概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快捷入口 */}
        <div className="bg-white rounded-xl border border-cream-200 p-6">
          <h3 className="font-semibold text-charcoal mb-4">快捷入口</h3>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/admin/products"
              className="flex flex-col items-center justify-center p-4 bg-cream-50 rounded-lg hover:bg-cream-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-forest-600 mb-2">
                <path d="m7.5 4.27 9 5.15" />
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
              <span className="text-sm text-charcoal">商品管理</span>
              <span className="text-xs text-stone mt-1">{stats.total_products} 件商品</span>
            </a>
            <a
              href="/admin/orders"
              className="flex flex-col items-center justify-center p-4 bg-cream-50 rounded-lg hover:bg-cream-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-forest-600 mb-2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
              </svg>
              <span className="text-sm text-charcoal">订单管理</span>
              <span className="text-xs text-stone mt-1">{stats.pending_orders} 待处理</span>
            </a>
            <a
              href="/admin/users"
              className="flex flex-col items-center justify-center p-4 bg-cream-50 rounded-lg hover:bg-cream-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-forest-600 mb-2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="text-sm text-charcoal">用户管理</span>
              <span className="text-xs text-stone mt-1">{stats.total_users} 位用户</span>
            </a>
            <a
              href="/admin/coupons"
              className="flex flex-col items-center justify-center p-4 bg-cream-50 rounded-lg hover:bg-cream-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-forest-600 mb-2">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              <span className="text-sm text-charcoal">优惠券</span>
              <span className="text-xs text-stone mt-1">促销活动</span>
            </a>
          </div>
        </div>

        {/* 最近订单 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-cream-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-charcoal">最近订单</h3>
            <a href="/admin/orders" className="text-sm text-forest-600 hover:underline">
              查看全部
            </a>
          </div>
          {(stats.recent_orders?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {stats.recent_orders?.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-cream-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-charcoal">{order.order_no}</p>
                    <p className="text-xs text-stone">{order.user_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-charcoal">¥{order.pay_amount}</p>
                    <p className="text-xs text-stone">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-stone">暂无订单数据</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
