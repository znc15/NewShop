import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  ShoppingBag,
  Users,
  Grid3X3,
  Ticket,
  Home,
  PanelBottom,
  Search,
  Settings,
  Shield,
  UserCircle,
  ArrowLeft,
  ChevronLeft,
  LogOut,
} from 'lucide-react'
import { cn } from '@/utils'

const navItems = [
  { title: '仪表盘', href: '/admin', icon: LayoutDashboard },
  { title: '商品管理', href: '/admin/products', icon: Package },
  { title: '评价管理', href: '/admin/reviews', icon: MessageSquare },
  { title: '订单管理', href: '/admin/orders', icon: ShoppingBag },
  { title: '用户管理', href: '/admin/users', icon: Users },
  { title: '分类管理', href: '/admin/categories', icon: Grid3X3 },
  { title: '优惠券管理', href: '/admin/coupons', icon: Ticket },
  { title: '首页设置', href: '/admin/homepage', icon: Home },
  { title: '页脚设置', href: '/admin/footer', icon: PanelBottom },
  { title: 'SEO 设置', href: '/admin/seo', icon: Search },
  { title: '系统设置', href: '/admin/settings', icon: Settings },
  { title: '管理员管理', href: '/admin/admins', icon: Shield },
  { title: '个人资料', href: '/admin/profile', icon: UserCircle },
]

export function AdminLayout({ children }: { children?: ReactNode }) {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(href)
  }

  const handleLogout = () => {
    localStorage.removeItem('admin-auth-storage')
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen flex flex-col bg-slate-900 text-slate-300 transition-all duration-300',
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {/* Logo 区域 */}
        <div className="flex items-center h-16 px-4 border-b border-slate-800 shrink-0">
          <Link
            to="/admin"
            className={cn(
              'flex items-center gap-2.5 overflow-hidden whitespace-nowrap',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-semibold text-white text-base tracking-tight">管理后台</span>
            )}
          </Link>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="ml-auto p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  sidebarCollapsed && 'justify-center px-2',
                  active
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
                title={sidebarCollapsed ? item.title : undefined}
              >
                <Icon className={cn('h-5 w-5 shrink-0', active && 'text-blue-400')} />
                {!sidebarCollapsed && <span>{item.title}</span>}
              </Link>
            )
          })}
        </nav>

        {/* 底部分组 */}
        <div className="p-3 border-t border-slate-800 space-y-0.5 shrink-0">
          {/* 返回前台 */}
          <Link
            to="/"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors',
              sidebarCollapsed && 'justify-center px-2'
            )}
            title={sidebarCollapsed ? '返回前台' : undefined}
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>返回前台</span>}
          </Link>

          {/* 退出登录 */}
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors',
              sidebarCollapsed && 'justify-center px-2'
            )}
            title={sidebarCollapsed ? '退出登录' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>退出登录</span>}
          </button>

          {/* 展开按钮（仅在折叠时显示） */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              title="展开侧边栏"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-[72px]' : 'ml-64'
        )}
      >
        {/* 顶部栏 */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">
            {navItems.find((item) => isActive(item.href))?.title || '管理后台'}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">管理员</span>
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium ring-2 ring-blue-100">
              A
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout
