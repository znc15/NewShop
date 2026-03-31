import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion, type Variants } from 'motion/react'
import { productService } from '@/services'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product, Category } from '@/types'

// 动画变体配置
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

const heroVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: 'easeOut',
    },
  },
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [hotProducts, setHotProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [categoriesRes, hotRes] = await Promise.all([
          productService.getCategoryTree(),
          productService.getHotProducts(8),
        ])
        setCategories(categoriesRes)
        setHotProducts(hotRes)
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
        <motion.div
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Hero 区域 */}
      <motion.section
        variants={heroVariants}
        className="relative min-h-[420px] md:min-h-[520px] overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(to right, #f0f9ff, #e0f2fe)',
        }}
      >
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-block px-3 py-1 mb-4 text-xs font-medium tracking-wider uppercase text-blue-600 border border-blue-200 rounded-full bg-blue-50"
            >
              新品上市
            </motion.div>
            <motion.h1
              className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-slate-800 leading-tight mb-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              发现美好生活
            </motion.h1>
            <motion.p
              className="text-lg md:text-xl text-slate-600 mb-8 max-w-md mx-auto md:mx-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              精选好物，品质之选
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Link
                to="/products"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
              >
                立即探索
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/categories"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                浏览分类
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* 热门分类 */}
      {categories.length > 0 && (
        <motion.section
          variants={itemVariants}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        >
          <motion.div
            className="flex items-center justify-between mb-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
          <h2 className="font-display text-2xl font-semibold text-blue-700">热门分类</h2>
            <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
              <Link to="/categories" className="text-sm text-blue-500 hover:text-blue-600 px-4 py-2 border-2 border-blue-500 rounded-lg hover:bg-blue-50">
                查看全部
              </Link>
            </motion.div>
          </motion.div>
          <motion.div
            className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {categories.slice(0, 8).map((category) => (
              <motion.div
                key={category.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  to={`/products?category=${category.id}`}
                  className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all"
                >
                  <motion.div
                    className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full border border-blue-200 flex items-center justify-center mb-2"
                      whileHover={{ rotate: 4 }}
                      transition={{ duration: 0.2 }}
                  >
                    <span className="text-blue-700 text-lg font-bold">
                      {category.name.charAt(0)}
                    </span>
                  </motion.div>
                  <span className="text-sm text-charcoal text-center">{category.name}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* 热销商品 */}
      <motion.section
        variants={itemVariants}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-2xl font-semibold text-blue-700">热销商品</h2>
          <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
            <Link to="/products?sort=sales" className="text-sm text-blue-500 hover:text-blue-600 px-4 py-2 border-2 border-blue-500 rounded-lg hover:bg-blue-50">
              查看更多
            </Link>
          </motion.div>
        </motion.div>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {hotProducts.map((product) => (
            <motion.div
              key={product.id}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>
    </motion.div>
  )
}
