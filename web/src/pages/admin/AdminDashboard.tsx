import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  DollarSign,
  UserPlus,
  Clock,
  Package,
  Users,
  Ticket,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import adminService from '@/services/admin'
import type { DashboardStats } from '@/types/admin'
import { cn } from '@/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: number
  trendLabel?: string
}) {
  return (
    <Card className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp
                  className={cn('h-3.5 w-3.5', trend >= 0 ? 'text-emerald-500' : 'text-red-500')}
                />
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {trend >= 0 ? '+' : ''}
                  {trend}% {trendLabel}
                </span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickLink({
  to,
  icon: Icon,
  label,
  desc,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  desc: string
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
    >
      <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-xs text-slate-400 mt-0.5">{desc}</span>
    </Link>
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <ShoppingBag className="h-12 w-12 mb-4 opacity-40" />
        <p>加载失败，请刷新重试</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="今日订单"
          value={stats.today_orders}
          icon={ShoppingBag}
          trend={12.5}
          trendLabel="较昨日"
        />
        <StatCard
          title="今日销售额"
          value={`¥${stats.today_sales.toLocaleString()}`}
          icon={DollarSign}
          trend={8.3}
          trendLabel="较昨日"
        />
        <StatCard
          title="新增用户"
          value={stats.today_users}
          icon={UserPlus}
          trend={5.2}
          trendLabel="较昨日"
        />
        <StatCard
          title="待处理订单"
          value={stats.pending_orders}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快捷入口 */}
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">快捷入口</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="grid grid-cols-2 gap-3">
              <QuickLink
                to="/admin/products"
                icon={Package}
                label="商品管理"
                desc={`${stats.total_products} 件商品`}
              />
              <QuickLink
                to="/admin/orders"
                icon={ShoppingBag}
                label="订单管理"
                desc={`${stats.pending_orders} 待处理`}
              />
              <QuickLink
                to="/admin/users"
                icon={Users}
                label="用户管理"
                desc={`${stats.total_users} 位用户`}
              />
              <QuickLink
                to="/admin/coupons"
                icon={Ticket}
                label="优惠券"
                desc="促销活动"
              />
            </div>
          </CardContent>
        </Card>

        {/* 最近订单 */}
        <Card className="lg:col-span-2 border-slate-200/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">最近订单</CardTitle>
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="pb-6">
            {(stats.recent_orders?.length ?? 0) > 0 ? (
              <div className="space-y-1">
                {stats.recent_orders?.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{order.order_no}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{order.user_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-800">
                        ¥{order.pay_amount}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ShoppingBag className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">暂无订单数据</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
