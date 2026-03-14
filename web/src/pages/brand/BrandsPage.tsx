import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'motion/react'
import { productService } from '@/services'
import { Spinner } from '@/components/ui/Loading'
import type { Brand } from '@/types'

// 动画变体配置
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
}

const headerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
}

export default function BrandsPage() {
  const [loading, setLoading] = useState(true)
  const [brands, setBrands] = useState<Brand[]>([])

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    setLoading(true)
    try {
      await productService.getCategories()
      // 模拟品牌数据
      const mockBrands: Brand[] = [
        { id: 1, name: 'Apple', logo: 'https://picsum.photos/seed/apple/200/200', description: 'Think Different', sort: 100, status: 'active', created_at: '', updated_at: '' },
        { id: 2, name: 'Huawei', logo: 'https://picsum.photos/seed/huawei/200/200', description: '构建万物互联的智能世界', sort: 99, status: 'active', created_at: '', updated_at: '' },
        { id: 3, name: 'Xiaomi', logo: 'https://picsum.photos/seed/xiaomi/200/200', description: '让每个人都能享受科技的乐趣', sort: 98, status: 'active', created_at: '', updated_at: '' },
        { id: 4, name: 'Sony', logo: 'https://picsum.photos/seed/sony/200/200', description: 'make.believe', sort: 97, status: 'active', created_at: '', updated_at: '' },
        { id: 5, name: 'Dell', logo: 'https://picsum.photos/seed/dell/200/200', description: '直接面对客户', sort: 96, status: 'active', created_at: '', updated_at: '' },
        { id: 6, name: 'Dyson', logo: 'https://picsum.photos/seed/dyson/200/200', description: '解决他人忽视的问题', sort: 95, status: 'active', created_at: '', updated_at: '' },
        { id: 7, name: 'Samsung', logo: 'https://picsum.photos/seed/samsung/200/200', description: 'Do What You Can\'t', sort: 94, status: 'active', created_at: '', updated_at: '' },
        { id: 8, name: 'Lenovo', logo: 'https://picsum.photos/seed/lenovo/200/200', description: 'Never Stand Still', sort: 93, status: 'active', created_at: '', updated_at: '' },
      ]
      setBrands(mockBrands)
    } catch (error) {
      console.error('获取品牌失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 面包屑导航 */}
      <motion.div
        className="flex items-center gap-2 mb-8"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link to="/" className="text-stone hover:text-forest-600">
          首页
        </Link>
        <span className="text-stone">/</span>
        <span className="text-charcoal font-medium">品牌专区</span>
      </motion.div>

      {/* 头部横幅 */}
      <motion.div
        className="bg-gradient-to-r from-forest-600 to-forest-700 rounded-xl p-8 mb-8 text-white overflow-hidden relative"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent"
          animate={{
            x: [0, 20, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="relative z-10">
          <motion.h1
            className="text-3xl font-semibold mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            品牌专区
          </motion.h1>
          <motion.p
            className="text-cream-100"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            精选品牌，品质保证
          </motion.p>
        </div>
      </motion.div>

      {brands.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-stone text-lg">暂无品牌</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {brands.map((brand) => (
            <motion.div
              key={brand.id}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02, rotate: 2 }}
              transition={{ duration: 0.3 }}
            >
              <Link
                to={`/products?brand=${brand.id}`}
                className="group block bg-white rounded-xl border border-cream-300 overflow-hidden hover:shadow-lg hover:border-forest-400 transition-shadow"
              >
                <div className="aspect-square bg-cream-50 flex items-center justify-center p-8 overflow-hidden">
                  {brand.logo ? (
                    <motion.img
                      src={brand.logo}
                      alt={brand.name}
                      className="w-full h-full object-contain"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.4 }}
                    />
                  ) : (
                    <motion.div
                      className="w-full h-full bg-forest-100 rounded-full flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-4xl font-semibold text-forest-600">
                        {brand.name.charAt(0)}
                      </span>
                    </motion.div>
                  )}
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-semibold text-charcoal group-hover:text-forest-600 transition-colors">
                    {brand.name}
                  </h3>
                  {brand.description && (
                    <p className="text-sm text-stone mt-1 line-clamp-2">
                      {brand.description}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}