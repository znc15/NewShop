import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'motion/react'
import { ProductCard } from '@/components/product/ProductCard'
import { productService } from '@/services'
import { Spinner } from '@/components/ui/Loading'
import type { Product } from '@/types'

// 动画变体配置
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export default function NewProductsPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsData = await productService.getNewProducts(20)
        setProducts(productsData)
      } catch (error) {
        console.error('获取新品失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  return (
    <motion.div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex items-center gap-2 mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link to="/" className="text-stone hover:text-forest-600">
          首页
        </Link>
        <span className="text-stone">/</span>
        <span className="text-charcoal font-medium">新品上市</span>
      </motion.div>

      <motion.div
        className="bg-gradient-to-r from-forest-600 to-forest-700 rounded-xl p-8 mb-8 text-white overflow-hidden relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.div
          className="absolute right-10 top-1/2 -translate-y-1/2 w-40 h-40 bg-white/10 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <div className="relative z-10">
          <h1 className="text-3xl font-semibold mb-2">新品上市</h1>
          <p className="text-cream-100">最新上架的精选好物，抢先体验</p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : products.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-stone text-lg">暂无新品</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={itemVariants}>
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
