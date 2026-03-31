import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Heart, Share2, ShoppingCart, ChevronLeft } from 'lucide-react'
import { motion, type Variants } from 'motion/react'
import { productService } from '@/services'
import { useCartStore } from '@/stores/cartStore'
import { ImageGallery } from '@/components/product/ImageGallery'
import { SkuSelector } from '@/components/product/SkuSelector'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Loading'
import { cn } from '@/utils'
import type { Product, ProductSku, ProductSpec } from '@/types'

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
    transition: { duration: 0.5 },
  },
}

const slideVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 },
  },
}

const imageVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6 },
  },
}

// 辅助函数：从 SKU 列表生成规格选项
function generateSpecsFromSkus(skus: ProductSku[]): ProductSpec[] {
  const specMap = new Map<string, Set<string>>()

  skus.forEach(sku => {
    let specs: Record<string, string> = {}
    if (typeof sku.specs === 'string') {
      try {
        specs = JSON.parse(sku.specs)
      } catch {
        return
      }
    } else {
      specs = sku.specs
    }

    Object.entries(specs).forEach(([key, value]) => {
      if (!specMap.has(key)) {
        specMap.set(key, new Set())
      }
      specMap.get(key)!.add(value)
    })
  })

  return Array.from(specMap.entries()).map(([name, values], index) => ({
    id: index + 1,
    product_id: skus[0]?.product_id || 0,
    name,
    values: Array.from(values)
  }))
}

export default function ProductDetailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const id = location.pathname.split('/').pop()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSku, setSelectedSku] = useState<ProductSku | undefined>(undefined)
  const [quantity, setQuantity] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  const { addItem } = useCartStore()

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError('商品ID无效')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const productData = await productService.getProduct(parseInt(id))
        setProduct(productData)
        if (productData.skus.length > 0) {
          setSelectedSku(productData.skus[0])
        }
      } catch (err) {
        setError('商品不存在或已下架')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  const handleAddToCart = async () => {
    if (!selectedSku) {
      alert('请先选择商品规格')
      return
    }

    setAddingToCart(true)
    try {
      await addItem(product!.id, selectedSku.id, quantity)
      navigate('/cart')
    } catch (err) {
      alert('添加失败，请重试')
    } finally {
      setAddingToCart(false)
    }
  }

  const handleBuyNow = () => {
    if (!selectedSku) {
      alert('请先选择商品规格')
      return
    }
    navigate('/checkout', {
      state: {
        buyNow: {
          productId: product!.id,
          skuId: selectedSku.id,
          quantity,
        }
      }
    })
  }

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Spinner size="lg" />
        </motion.div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          className="text-center py-20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-stone text-lg">{error || '商品不存在'}</p>
          <Button onClick={() => navigate('/products')} className="mt-4">
            返回商品列表
          </Button>
        </motion.div>
      </div>
    )
  }

  const currentPrice = selectedSku?.price ?? product?.price ?? 0
  const originalPrice = selectedSku?.original_price ?? product?.original_price
  const specs = generateSpecsFromSkus(product.skus)

  return (
    <motion.div
      className="max-w-7xl mx-auto px-4 py-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 面包屑导航 */}
      <motion.nav
        className="flex items-center gap-2 text-sm text-stone mb-6"
        variants={slideVariants}
      >
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-charcoal">
          <ChevronLeft className="w-4 h-4" />
          返回
        </button>
        <span>/</span>
        <Link to="/products" className="hover:text-charcoal">全部商品</Link>
        <span>/</span>
        <span className="text-charcoal">{product.name}</span>
      </motion.nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：图片和选择 */}
        <motion.div className="lg:sticky lg:top-24" variants={imageVariants}>
          <ImageGallery
            images={product.images.length > 0 ? product.images : [product.main_image]}
            selectedIndex={0}
            onSelect={() => {}}
          />
        </motion.div>

        {/* 右侧：商品信息 */}
        <motion.div className="space-y-6" variants={containerVariants}>
          {/* 商品标题 */}
          <motion.div variants={itemVariants}>
            <h1 className="font-display text-2xl font-semibold text-charcoal">
              {product.name}
            </h1>
            <p className="text-stone mt-2">{product.description}</p>
          </motion.div>

          {/* 价格 - 后端价格单位为分 */}
          <motion.div className="flex items-baseline gap-3" variants={itemVariants}>
            <span className="text-3xl font-bold text-red-500">
              ¥{((currentPrice) / 100).toFixed(2)}
            </span>
            {originalPrice && originalPrice > currentPrice && (
              <span className="text-lg text-stone line-through">
                ¥{((originalPrice) / 100).toFixed(2)}
              </span>
            )}
          </motion.div>

          {/* 销量 */}
          <motion.div className="flex items-center gap-6 text-sm" variants={itemVariants}>
            <span className="text-stone">已售 {product.sales || 0}</span>
          </motion.div>

          {/* SKU 选择器 */}
          {specs.length > 0 && (
            <motion.div className="border-t border-slate-200 pt-6" variants={itemVariants}>
              <SkuSelector
                specs={specs}
                skus={product.skus}
                selectedSku={selectedSku}
                onSkuChange={setSelectedSku}
                quantity={quantity}
                onQuantityChange={setQuantity}
                maxQuantity={selectedSku?.stock ?? 99}
              />
            </motion.div>
          )}

          {/* 操作按钮 */}
          <motion.div className="flex gap-4 pt-6" variants={itemVariants}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                variant="outline-thick"
                onClick={toggleFavorite}
                className="w-full flex items-center justify-center gap-2"
              >
                <Heart
                  className={cn(
                    'w-5 h-5',
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-stone'
                  )}
                />
                {isFavorite ? '已收藏' : '收藏'}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                variant="outline-thick"
                className="w-full flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                分享
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                variant="outline-thick"
                onClick={() => {}}
                className="w-full flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                加入购物车
              </Button>
            </motion.div>
          </motion.div>

          {/* 购买按钮 */}
          <motion.div className="flex gap-4 pt-4" variants={itemVariants}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                variant="default"
                size="lg"
                onClick={handleAddToCart}
                disabled={!selectedSku || addingToCart}
                className="w-full"
              >
                {addingToCart ? '添加中...' : '加入购物车'}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                size="lg"
                onClick={handleBuyNow}
                disabled={!selectedSku}
                className="w-full"
              >
                立即购买
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* 商品详情 */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <motion.div
          className="bg-white rounded-xl shadow-sm p-6"
          whileHover={{ boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-display text-xl font-semibold text-charcoal mb-4">商品详情</h2>
          <div className="prose text-stone whitespace-pre-line">
            {product.detail || product.description}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
