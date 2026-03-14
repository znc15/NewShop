import { Suspense, lazy } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { PageLoader } from '@/components/ui/PageLoader'
import { PageSkeleton } from '@/components/ui/Skeleton'

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

// 页面切换动画配置
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
}

// 导航链接动画
const navLinkVariants = {
  hover: { scale: 1.02, y: -1 },
  tap: { scale: 0.98 },
}

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      {/* 页面加载进度条 */}
      <PageLoader />

      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-cream-100/95 backdrop-blur-sm border-b border-cream-300">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="font-display text-2xl font-semibold text-forest-700 hover:text-forest-600 transition-colors"
              >
                NewShop
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
                      className="text-sm text-charcoal hover:text-forest-600 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <motion.button
                className="p-2 text-charcoal hover:text-forest-600 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
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
              </motion.button>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Link
                  to="/cart"
                  className="p-2 text-charcoal hover:text-forest-600 transition-colors relative inline-block"
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
                  <span className="absolute -top-1 -right-1 bg-copper-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    0
                  </span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Link
                  to="/login"
                  className="p-2 text-charcoal hover:text-forest-600 transition-colors inline-block"
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

      {/* 主要内容区域 */}
      <main className="flex-1 min-h-[calc(100vh-64px)]">
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
                // 路由匹配
                const path = location.pathname

                if (path === '/') return <HomePage />
                if (path === '/products') return <ProductListPage />
                if (path.startsWith('/products/')) return <ProductDetailPage />
                if (path === '/categories') return <CategoriesPage />
                if (path === '/new') return <NewProductsPage />
                if (path === '/sale') return <SalePage />
                if (path === '/search') return <SearchPage />
                if (path === '/brands') return <BrandsPage />
                if (path === '/preorder') return <PreorderPage />
                if (path === '/coupons') return <CouponsPage />
                if (path === '/points') return <PointsPage />
                if (path === '/member') return <MemberPage />
                if (path === '/cart') return <CartPage />
                if (path === '/checkout') return <CheckoutPage />
                if (path === '/orders') return <OrderListPage />
                if (path.startsWith('/orders/')) return <OrderDetailPage />
                if (path === '/login') return <LoginPage />
                if (path === '/register') return <RegisterPage />
                if (path === '/forgot-password') return <ForgotPasswordPage />
                if (path === '/user/profile') return <UserProfilePage />
                if (path === '/user/addresses') return <UserAddressesPage />

                return <HomePage />
              })()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 底部页脚 */}
      <footer className="bg-forest-700 text-cream-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="font-display text-xl font-semibold mb-4">NewShop</h3>
              <p className="text-sm text-cream-200 opacity-80">精选好物，品质生活</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <h4 className="font-semibold mb-4">购物指南</h4>
              <ul className="space-y-2 text-sm text-cream-200 opacity-80">
                <li>
                  <Link to="#" className="hover:opacity-100 transition-opacity">
                    购物流程
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:opacity-100 transition-opacity">
                    配送说明
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:opacity-100 transition-opacity">
                    退换货政策
                  </Link>
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="font-semibold mb-4">关于我们</h4>
              <ul className="space-y-2 text-sm text-cream-200 opacity-80">
                <li>
                  <Link to="#" className="hover:opacity-100 transition-opacity">
                    品牌故事
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:opacity-100 transition-opacity">
                    联系我们
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:opacity-100 transition-opacity">
                    加入我们
                  </Link>
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <h4 className="font-semibold mb-4">客户服务</h4>
              <ul className="space-y-2 text-sm text-cream-200 opacity-80">
                <li>
                  <Link to="#" className="hover:opacity-100 transition-opacity">
                    在线客服
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:opacity-100 transition-opacity">
                    帮助中心
                  </Link>
                </li>
                <li>
                  <Link to="#" className="hover:opacity-100 transition-opacity">
                    意见反馈
                  </Link>
                </li>
              </ul>
            </motion.div>
          </div>
          <motion.div
            className="mt-12 pt-8 border-t border-forest-600 text-center text-sm text-cream-200 opacity-60"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.6 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <p>&copy; 2024 NewShop. All rights reserved.</p>
          </motion.div>
        </div>
      </footer>
    </div>
  )
}

export default App
