import { Routes, Route } from 'react-router-dom'
import CartPage from './pages/cart/CartPage'
import CheckoutPage from './pages/order/CheckoutPage'
import OrderListPage from './pages/order/OrderListPage'
import OrderDetailPage from './pages/order/OrderDetailPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import HomePage from './pages/home/HomePage'
import ProductListPage from './pages/product/ProductListPage'
import ProductDetailPage from './pages/product/ProductDetailPage'
import SearchPage from './pages/product/SearchPage'
import { UserProfilePage, UserAddressesPage } from './pages/user'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-cream-100/95 backdrop-blur-sm border-b border-cream-300">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <a href="/" className="font-display text-2xl font-semibold text-forest-700">
                NewShop
              </a>
              <div className="hidden md:flex items-center gap-6">
                <a href="/products" className="text-sm text-charcoal hover:text-forest-600 transition-colors">
                  全部商品
                </a>
                <a href="/categories" className="text-sm text-charcoal hover:text-forest-600 transition-colors">
                  分类
                </a>
                <a href="/new" className="text-sm text-charcoal hover:text-forest-600 transition-colors">
                  新品
                </a>
                <a href="/sale" className="text-sm text-charcoal hover:text-forest-600 transition-colors">
                  特惠
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-charcoal hover:text-forest-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.3-4.3"/>
                </svg>
              </button>
              <a href="/cart" className="p-2 text-charcoal hover:text-forest-600 transition-colors relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="21" r="1"/>
                  <circle cx="19" cy="21" r="1"/>
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                </svg>
                <span className="absolute -top-1 -right-1 bg-copper-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  0
                </span>
              </a>
              <a href="/login" className="p-2 text-charcoal hover:text-forest-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </a>
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrderListPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/user/profile" element={<UserProfilePage />} />
          <Route path="/user/addresses" element={<UserAddressesPage />} />
        </Routes>
      </main>

      <footer className="bg-forest-700 text-cream-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-display text-xl font-semibold mb-4">NewShop</h3>
              <p className="text-sm text-cream-200 opacity-80">
                精选好物，品质生活
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">购物指南</h4>
              <ul className="space-y-2 text-sm text-cream-200 opacity-80">
                <li><a href="#" className="hover:opacity-100 transition-opacity">购物流程</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">配送说明</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">退换货政策</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">关于我们</h4>
              <ul className="space-y-2 text-sm text-cream-200 opacity-80">
                <li><a href="#" className="hover:opacity-100 transition-opacity">品牌故事</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">联系我们</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">加入我们</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">客户服务</h4>
              <ul className="space-y-2 text-sm text-cream-200 opacity-80">
                <li><a href="#" className="hover:opacity-100 transition-opacity">在线客服</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">帮助中心</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">意见反馈</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-forest-600 text-center text-sm text-cream-200 opacity-60">
            <p>&copy; 2024 NewShop. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
