import { Suspense, lazy, useEffect, useState, type CSSProperties } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { PageLoader } from '@/components/ui/PageLoader'
import { PageSkeleton } from '@/components/ui/Skeleton'
import SiteFooter from '@/components/site/SiteFooter'
import { useScrollPosition } from '@/hooks'
import { resolveHomeDisplayConfig } from '@/lib/homeConfig'
import {
  AdminCategoriesPage,
  AdminCouponsPage,
  AdminDashboard,
  AdminFooterSettingsPage,
  AdminHomepageSettingsPage,
  AdminLayout,
  AdminOrdersPage,
  AdminProductsPage,
  AdminSeoPage,
  AdminUsersPage,
} from '@/pages/admin'
import configService from '@/services/config'
import AdminProtectedRoute from '@/components/admin/AdminProtectedRoute'
import { useAuthStore, useCartStore } from '@/stores'

const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))

// 懒加载页面组件
const HomePage = lazy(() => import('./pages/home/HomePage'))
const ProductListPage = lazy(() => import('./pages/product/ProductListPage'))
const ProductDetailPage = lazy(() => import('./pages/product/ProductDetailPage'))
const SearchPage = lazy(() => import('./pages/product/SearchPage'))
const NewProductsPage = lazy(() => import('./pages/product/NewProductsPage'))
const SalePage = lazy(() => import('./pages/product/SalePage'))
const CategoriesPage = lazy(() => import('./pages/category/CategoriesPage'))
const BrandsPage = lazy(() => import('./pages/brand/BrandsPage'))
const PreorderPage = lazy(() => import('./pages/preorder/PreorderPage'))
const CouponsPage = lazy(() => import('./pages/coupon/CouponsPage'))
const PointsPage = lazy(() => import('./pages/points/PointsPage'))
const MemberPage = lazy(() => import('./pages/member/MemberPage'))
const CartPage = lazy(() => import('./pages/cart/CartPage'))
const CheckoutPage = lazy(() => import('./pages/order/CheckoutPage'))
const OrderListPage = lazy(() => import('./pages/order/OrderListPage'))
const OrderDetailPage = lazy(() => import('./pages/order/OrderDetailPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const UserProfilePage = lazy(() => import('./pages/user/UserProfilePage'))
const UserAddressesPage = lazy(() => import('./pages/user/UserAddressesPage'))
const ContentPage = lazy(() => import('./pages/content/ContentPage'))

// 页面切换动画配置
const pageVariants = {
  initial: {
    opacity: 0,
    y: 4,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.16,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
}

// 导航链接动画
const navLinkVariants = {
  hover: { scale: 1.01, y: -1 },
  tap: { scale: 0.98 },
}

const HEADER_TRANSITION_DISTANCE = 96

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function blendChannel(from: number, to: number, progress: number) {
  return Math.round(from + (to - from) * progress)
}

function blendColor(from: [number, number, number], to: [number, number, number], progress: number, alpha = 1) {
  const red = blendChannel(from[0], to[0], progress)
  const green = blendChannel(from[1], to[1], progress)
  const blue = blendChannel(from[2], to[2], progress)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function App() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const cartTotalCount = useCartStore((state) => state.totalCount)
  const fetchCart = useCartStore((state) => state.fetchCart)
  const [publicConfigs, setPublicConfigs] = useState<Record<string, unknown>>({})
  const [failedBrandLogoUrl, setFailedBrandLogoUrl] = useState('')
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false)
  const scrollY = useScrollPosition()
  const path = location.pathname
  const isHomePage = path === '/'
  const isHomeHeaderScrolled = isHomePage && scrollY > 60
  const homeDisplayConfig = resolveHomeDisplayConfig(publicConfigs)
  const showBrandLogo = Boolean(homeDisplayConfig.brandLogo) && failedBrandLogoUrl !== homeDisplayConfig.brandLogo
  const homeNavLinks: Array<{ label: string; to?: string; href?: string }> = [
    { to: '/products', label: '全部商品' },
    { to: '/categories', label: '分类' },
    { to: '/new', label: '新品' },
    { to: '/sale', label: '特惠' },
    { href: '#reviews', label: '评价' },
  ]
  const headerTransitionProgress = isHomePage ? clamp(scrollY / HEADER_TRANSITION_DISTANCE, 0, 1) : 1
  const headerBrandColor = isHomePage
    ? blendColor([255, 255, 255], [37, 99, 235], headerTransitionProgress)
    : 'rgb(37, 99, 235)'
  const headerBrandHoverColor = isHomePage
    ? blendColor([255, 255, 255], [29, 78, 216], headerTransitionProgress)
    : 'rgb(29, 78, 216)'
  const headerLinkColor = isHomePage
    ? blendColor([255, 255, 255], [51, 65, 85], headerTransitionProgress, 0.94)
    : 'rgb(51, 65, 85)'
  const headerLinkHoverColor = isHomePage
    ? blendColor([255, 255, 255], [29, 78, 216], headerTransitionProgress)
    : 'rgb(29, 78, 216)'
  const headerStyle: CSSProperties & Record<string, string> = {
    backgroundColor: isHomePage
      ? `rgba(255, 255, 255, ${0.96 * headerTransitionProgress})`
      : 'rgba(255, 255, 255, 0.95)',
    borderColor: isHomePage
      ? `rgba(226, 232, 240, ${headerTransitionProgress})`
      : 'rgba(226, 232, 240, 1)',
    boxShadow: isHomePage
      ? `0 1px 0 rgba(226, 232, 240, ${0.85 * headerTransitionProgress}), 0 14px 34px rgba(15, 23, 42, ${0.08 * headerTransitionProgress})`
      : '0 1px 0 rgba(226, 232, 240, 0.9), 0 14px 34px rgba(15, 23, 42, 0.08)',
    backdropFilter: isHomePage ? `blur(${8 * headerTransitionProgress}px)` : 'blur(8px)',
    color: headerLinkColor,
    ['--nav-brand-color']: headerBrandColor,
    ['--nav-brand-hover-color']: headerBrandHoverColor,
    ['--nav-link-color']: headerLinkColor,
    ['--nav-link-hover-color']: headerLinkHoverColor,
    ['--nav-icon-color']: headerLinkColor,
    ['--nav-icon-hover-color']: headerLinkHoverColor,
  }

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    void fetchCart()
  }, [fetchCart, isAuthenticated])

  useEffect(() => {
    let active = true

    const fetchPublicConfigs = async () => {
      try {
        const data = await configService.getPublicConfigs()
        if (active) {
          setPublicConfigs(data)
        }
      } catch {
        if (active) {
          setPublicConfigs({})
        }
      }
    }

    void fetchPublicConfigs()

    return () => {
      active = false
    }
  }, [])

  const renderAdminPage = () => {
    if (path === '/admin') return <AdminDashboard />
    if (path === '/admin/products') return <AdminProductsPage />
    if (path === '/admin/orders') return <AdminOrdersPage />
    if (path === '/admin/users') return <AdminUsersPage />
    if (path === '/admin/categories') return <AdminCategoriesPage />
    if (path === '/admin/coupons') return <AdminCouponsPage />
    if (path === '/admin/homepage') return <AdminHomepageSettingsPage />
    if (path === '/admin/footer') return <AdminFooterSettingsPage />
    if (path === '/admin/seo') return <AdminSeoPage />
    return <AdminDashboard />
  }

  if (path === '/admin/login') {
    return <AdminLoginPage />
  }

  if (path === '/admin' || (path.startsWith('/admin/') && path !== '/admin/login')) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>{renderAdminPage()}</AdminLayout>
      </AdminProtectedRoute>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 页面加载进度条 */}
      <PageLoader />

      {/* 顶部导航 */}
      {isHomePage ? (
        <header
          className="fixed inset-x-0 top-0 z-[100] px-4 transition-all duration-300 sm:px-6 lg:px-10"
          style={{
            background: isHomeHeaderScrolled ? 'rgba(51, 64, 39, 0.95)' : 'transparent',
            boxShadow: isHomeHeaderScrolled ? '0 2px 30px rgba(0, 0, 0, 0.2)' : 'none',
            backdropFilter: isHomeHeaderScrolled ? 'blur(16px)' : 'none',
          }}
        >
          <nav
            className="mx-auto flex h-[72px] w-full items-center justify-between"
            style={{ maxWidth: `${homeDisplayConfig.layoutMaxWidth}px` }}
          >
            <Link to="/" className="home-nav-logo font-display text-2xl font-semibold text-white">
              {showBrandLogo ? (
                <img
                  src={homeDisplayConfig.brandLogo}
                  alt={homeDisplayConfig.brandText}
                  className="h-8 w-auto max-w-[180px] object-contain"
                  onError={() => {
                    setFailedBrandLogoUrl(homeDisplayConfig.brandLogo)
                  }}
                />
              ) : (
                homeDisplayConfig.brandText
              )}
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              {homeNavLinks.map((link) => (
                link.to ? (
                  <Link key={link.to} to={link.to} className="home-nav-link text-sm font-medium tracking-[0.1em]">
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.href} href={link.href} className="home-nav-link text-sm font-medium tracking-[0.1em]">
                    {link.label}
                  </a>
                )
              ))}
            </div>

            <div className="flex items-center gap-4">
              <motion.div className="hidden md:block" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/search"
                  className="inline-flex items-center justify-center p-2 text-white/80 transition-colors hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </Link>
              </motion.div>
              <motion.div className="hidden md:block" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/cart"
                  className="relative inline-flex items-center justify-center p-2 text-white/80 transition-colors hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  {cartTotalCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-[12px] bg-[#9ab17a] px-1 text-xs text-white">
                      {cartTotalCount > 99 ? '99+' : cartTotalCount}
                    </span>
                  )}
                </Link>
              </motion.div>
              <motion.div className="hidden md:block" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to={isAuthenticated ? '/user/profile' : '/login'}
                  className="inline-flex items-center justify-center p-2 text-white/80 transition-colors hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </Link>
              </motion.div>
              <button
                type="button"
                className={['home-nav-hamburger md:hidden', isHomeMenuOpen ? 'is-open' : ''].join(' ')}
                aria-label="打开首页导航菜单"
                aria-expanded={isHomeMenuOpen}
                onClick={() => setIsHomeMenuOpen((prev) => !prev)}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </nav>

          {isHomeMenuOpen && (
            <div className="pb-4 md:hidden">
              <div
                className="mx-auto w-full rounded-[12px] border border-white/20 bg-[rgba(51,64,39,0.96)] p-4 shadow-2xl backdrop-blur-xl"
                style={{ maxWidth: `${homeDisplayConfig.layoutMaxWidth}px` }}
              >
                <div className="flex flex-col gap-3">
                  {homeNavLinks.map((link) => (
                    link.to ? (
                      <Link
                        key={`mobile-${link.to}`}
                        to={link.to}
                        className="home-nav-mobile-link"
                        onClick={() => setIsHomeMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        key={`mobile-${link.href}`}
                        href={link.href}
                        className="home-nav-mobile-link"
                        onClick={() => setIsHomeMenuOpen(false)}
                      >
                        {link.label}
                      </a>
                    )
                  ))}
                  <div className="mt-1 h-px w-full bg-white/15" />
                  <Link
                    to="/search"
                    className="home-nav-mobile-link"
                    onClick={() => setIsHomeMenuOpen(false)}
                  >
                    搜索
                  </Link>
                  <Link
                    to="/cart"
                    className="home-nav-mobile-link flex items-center justify-between"
                    onClick={() => setIsHomeMenuOpen(false)}
                  >
                    <span>购物车</span>
                    {cartTotalCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#9ab17a] px-1.5 text-xs text-white">
                        {cartTotalCount > 99 ? '99+' : cartTotalCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to={isAuthenticated ? '/user/profile' : '/login'}
                    className="home-nav-mobile-link"
                    onClick={() => setIsHomeMenuOpen(false)}
                  >
                    {isAuthenticated ? '个人中心' : '登录 / 注册'}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </header>
      ) : (
        <header
          className="sticky top-0 z-50 border-b px-4 transition-all duration-300 ease-out sm:px-6 lg:px-10"
          style={headerStyle}
        >
          <nav
            className="mx-auto w-full"
            style={{ maxWidth: `${homeDisplayConfig.layoutMaxWidth}px` }}
          >
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <Link
                  to="/"
                  className="nav-header-brand font-display text-2xl font-semibold"
                >
                  {showBrandLogo ? (
                    <img
                      src={homeDisplayConfig.brandLogo}
                      alt={homeDisplayConfig.brandText}
                      className="h-8 w-auto max-w-[180px] object-contain"
                      onError={() => {
                        setFailedBrandLogoUrl(homeDisplayConfig.brandLogo)
                      }}
                    />
                  ) : (
                    homeDisplayConfig.brandText
                  )}
                </Link>
                <div className="hidden md:flex items-center gap-6">
                  {[
                    { to: '/products', label: '全部商品' },
                    { to: '/categories', label: '分类' },
                    { to: '/new', label: '新品' },
                    { to: '/sale', label: '特惠' },
                  ].map((link) => (
                    <motion.div key={link.to} variants={navLinkVariants} whileHover="hover" whileTap="tap">
                      <Link
                        to={link.to}
                        className="nav-header-link text-sm"
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    to="/search"
                    className="nav-header-icon inline-flex items-center justify-center p-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    to="/cart"
                    className="nav-header-icon relative inline-flex items-center justify-center p-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                    {cartTotalCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-xs text-white">
                        {cartTotalCount > 99 ? '99+' : cartTotalCount}
                      </span>
                    )}
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    to={isAuthenticated ? '/user/profile' : '/login'}
                    className="nav-header-icon inline-flex items-center justify-center p-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </Link>
                </motion.div>
              </div>
            </div>
          </nav>
        </header>
      )}

      {/* 主要内容区域 */}
      <main className={isHomePage ? 'flex-1 min-h-screen' : 'flex-1 min-h-[calc(100vh-64px)]'}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="min-h-full"
          >
            <Suspense fallback={<PageSkeleton />}>
              {(() => {
                return (
                  <Routes location={location}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<ProductListPage />} />
                    <Route path="/products/:id" element={<ProductDetailPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/new" element={<NewProductsPage />} />
                    <Route path="/sale" element={<SalePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/brands" element={<BrandsPage />} />
                    <Route path="/preorder" element={<PreorderPage />} />
                    <Route path="/coupons" element={<CouponsPage />} />
                    <Route path="/points" element={<PointsPage />} />
                    <Route path="/member" element={<MemberPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/orders" element={<OrderListPage />} />
                    <Route path="/orders/:id" element={<OrderDetailPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/user/profile" element={<UserProfilePage />} />
                    <Route path="/user/addresses" element={<UserAddressesPage />} />
                    <Route path="/address/select" element={<UserAddressesPage />} />
                    <Route path="/page/:slug" element={<ContentPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                )
              })()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <SiteFooter configSource={publicConfigs} />
    </div>
  )
}

export default App
