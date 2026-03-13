import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/product/ProductCard'
import { productService } from '@/services'
import type { Product, Category } from '@/types'

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [hotProducts, setHotProducts] = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [categoriesRes, hotRes, newRes] = await Promise.all([
          productService.getCategoryTree(),
          productService.getHotProducts(8),
          productService.getNewProducts(8),
        ])
        setCategories(categoriesRes)
        setHotProducts(hotRes)
        setNewProducts(newRes)
      } catch (error) {
        console.error('获取首页数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-forest-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Hero 区域 */}
      <section className="relative h-80 md:h-96 bg-gradient-to-br from-forest-700 to-forest-900 flex items-center justify-center">
        <div className="text-center text-cream-100">
          <h1 className="font-display text-5xl font-semibold mb-4">发现美好生活</h1>
          <p className="text-lg text-cream-200 mb-8">精选好物，品质之选</p>
          <Link
            to="/products"
            className="inline-flex items-center px-6 py-3 bg-copper-500 text-white rounded-lg hover:bg-copper-600 transition-colors"
          >
            立即探索
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>

      {/* 热门分类 */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-semibold text-forest-700">热门分类</h2>
            <Link to="/categories" className="text-sm text-copper-500 hover:text-copper-600">
              查看全部
            </Link>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.id}`}
                className="flex flex-col items-center p-4 bg-white rounded-xl hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-forest-100 rounded-full flex items-center justify-center mb-2">
                  <span className="text-forest-700 text-lg font-bold">
                    {category.name.charAt(0)}
                  </span>
                </div>
                <span className="text-sm text-charcoal text-center">{category.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 热销商品 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold text-forest-700">热销商品</h2>
          <Link to="/products?sort=sales" className="text-sm text-copper-500 hover:text-copper-600">
            查看更多
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {hotProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 新品推荐 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-cream-200 -mx-4 px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold text-forest-700">新品推荐</h2>
          <Link to="/products?sort=new" className="text-sm text-copper-500 hover:text-copper-600">
            查看更多
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {newProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}
