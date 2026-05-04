import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { Heart, Share2, ShoppingCart, ChevronLeft } from 'lucide-react'
import { motion, type Variants } from 'motion/react'
import { productService } from '@/services'
import { useCartStore } from '@/stores/cartStore'
import { ImageGallery } from '@/components/product/ImageGallery'
import { SkuSelector } from '@/components/product/SkuSelector'
import { DetailTabs } from '@/components/product/DetailTabs'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Loading'
import { cn } from '@/utils'
import type { Product, ProductReview, ProductSku, ProductSpec, DetailBlock, DetailBlocks } from '@/types'

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

function parseImageCollection(rawValue: unknown): string[] {
  if (Array.isArray(rawValue)) {
    return rawValue
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  if (typeof rawValue === 'string') {
    const raw = rawValue.trim()
    if (!raw) {
      return []
    }

    if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('"') && raw.endsWith('"'))) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        }
      } catch {
        // 忽略 JSON 解析失败，降级为分隔符解析。
      }
    }

    return raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  return []
}

function getAverageRating(reviews: ProductReview[]): string {
  if (reviews.length === 0) {
    return '暂无评分'
  }

  const total = reviews.reduce((sum, review) => sum + Math.max(1, Math.min(5, review.rating)), 0)
  return (total / reviews.length).toFixed(1)
}

export default function ProductDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSku, setSelectedSku] = useState<ProductSku | undefined>(undefined)
  const [quantity, setQuantity] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)
  const [buyingNow, setBuyingNow] = useState(false)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  const { addItem } = useCartStore()

  const resolveSkuIdForAction = (target: Product | null, sku: ProductSku | undefined): number | null => {
    if (!target) {
      return null
    }

    if (sku?.id) {
      return sku.id
    }

    // 商品存在 SKU 但未选中时，仍要求用户先选择规格。
    const hasSkuOptions = Array.isArray(target.skus) && target.skus.length > 0
    if (hasSkuOptions) {
      return null
    }

    // 无 SKU 商品统一使用 0 作为默认规格占位。
    return 0
  }

  useEffect(() => {
    const fetchProduct = async () => {
      const productId = id ? Number(id) : NaN
      if (!Number.isInteger(productId) || productId <= 0) {
        setError('商品ID无效')
        setLoading(false)
        return
      }
      setLoading(true)
      setReviewsLoading(true)
      setError(null)
      try {
        const [productData, reviewData] = await Promise.all([
          productService.getProduct(productId),
          productService.getProductReviews(productId).catch(() => []),
        ])
        const normalizedSkus = Array.isArray(productData.skus) ? productData.skus : []
        const normalizedImages = parseImageCollection((productData as Product & { images?: unknown }).images)
        const normalizedDetailImages = parseImageCollection((productData as Product & { detail_images?: unknown }).detail_images)
        const normalizedAttrs = Array.isArray(productData.attrs) ? productData.attrs : []
        const normalizedProduct: Product = {
          ...productData,
          skus: normalizedSkus,
          images: normalizedImages,
          detail_images: normalizedDetailImages,
          attrs: normalizedAttrs,
        }

        setProduct(normalizedProduct)
        setReviews(Array.isArray(reviewData) ? reviewData : [])
        if (normalizedSkus.length > 0) {
          setSelectedSku(normalizedSkus[0])
        } else {
          setSelectedSku(undefined)
        }
      } catch (err) {
        const message =
          typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          typeof (err as { message?: unknown }).message === 'string'
            ? ((err as { message: string }).message || '').trim()
            : ''

        setError(message || '商品不存在或已下架')
        setReviews([])
      } finally {
        setLoading(false)
        setReviewsLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  const handleAddToCart = async () => {
    const skuId = resolveSkuIdForAction(product, selectedSku)
    if (skuId === null) {
      alert('请先选择商品规格')
      return
    }

    setAddingToCart(true)
    try {
      await addItem(product!.id, skuId, quantity)
      navigate('/cart')
    } catch (err) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message?: unknown }).message === 'string'
          ? ((err as { message: string }).message || '').trim()
          : ''
      alert(message || '添加失败，请重试')
    } finally {
      setAddingToCart(false)
    }
  }

  const handleBuyNow = async () => {
    const skuId = resolveSkuIdForAction(product, selectedSku)
    if (skuId === null) {
      alert('请先选择商品规格')
      return
    }

    setBuyingNow(true)
    try {
      const addedItem = await addItem(product!.id, skuId, quantity)
      if (addedItem?.id) {
        navigate('/checkout', {
          state: { cartItemIds: [addedItem.id] },
        })
      } else {
        navigate('/cart')
      }
    } catch (err) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message?: unknown }).message === 'string'
          ? ((err as { message: string }).message || '').trim()
          : ''
      alert(message || '立即购买失败，请重试')
    } finally {
      setBuyingNow(false)
    }
  }

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
  }

  // 解析商品详情为模块化区块 - 在早期返回之前调用以符合 Hooks 规则
  const detailBlocks = useMemo<DetailBlock[]>(() => {
    if (!product) {
      return []
    }

    const blocks: DetailBlock[] = []
    let blockIndex = 0

    // 尝试将 product.detail 解析为 JSON（DetailBlocks 格式）
    const detailText = product.detail || ''
    let parsedAsBlocks = false

    if (detailText.trim()) {
      try {
        const parsed = JSON.parse(detailText)
        if (parsed && parsed.type === 'blocks' && Array.isArray(parsed.blocks)) {
          const detailBlocksData = parsed as DetailBlocks
          for (const block of detailBlocksData.blocks) {
            if (block.type && block.id) {
              blocks.push(block)
            }
          }
          parsedAsBlocks = true
        }
      } catch {
        // 非 JSON 格式，降级为纯文本区块
      }

      if (!parsedAsBlocks) {
        blocks.push({
          id: `text-${blockIndex++}`,
          type: 'text',
          content: detailText,
        })
      }
    }

    return blocks
  }, [product])

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
  const productSkus = Array.isArray(product.skus) ? product.skus : []
  const productImages = Array.isArray(product.images) ? product.images : []
  const galleryImages = productImages.length > 0 ? productImages : [product.main_image || '/placeholder.png']
  const specs = generateSpecsFromSkus(productSkus)
  const averageRating = getAverageRating(reviews)

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
            images={galleryImages}
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

          {/* SKU 概览 */}
          {productSkus.length > 0 && (
            <motion.div className="space-y-2" variants={itemVariants}>
              {productSkus.map((sku) => {
                let specLabel = ''
                if (sku.specs) {
                  try {
                    const raw = typeof sku.specs === 'string' ? JSON.parse(sku.specs) : sku.specs
                    if (raw && typeof raw === 'object') {
                      specLabel = Object.values(raw as Record<string, string>).join(' / ')
                    }
                  } catch {
                    specLabel = typeof sku.specs === 'string' ? sku.specs : ''
                  }
                }
                const active = selectedSku?.id === sku.id
                return (
                  <button
                    key={sku.id}
                    type="button"
                    onClick={() => setSelectedSku(sku)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{specLabel || sku.sku_code}</span>
                    <span className="font-medium text-red-500">¥{(sku.price / 100).toFixed(2)}</span>
                  </button>
                )
              })}
            </motion.div>
          )}

          {/* SKU 选择器 */}
          {specs.length > 0 && (
            <motion.div className="border-t border-slate-200 pt-6" variants={itemVariants}>
              <SkuSelector
                specs={specs}
                skus={productSkus}
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
                onClick={handleAddToCart}
                disabled={addingToCart || buyingNow}
                className="w-full flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                {addingToCart ? '添加中...' : '加入购物车'}
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
                disabled={addingToCart || buyingNow}
                className="w-full"
              >
                {addingToCart ? '添加中...' : '加入购物车'}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                size="lg"
                onClick={handleBuyNow}
                disabled={addingToCart || buyingNow}
                className="w-full"
              >
                {buyingNow ? '处理中...' : '立即购买'}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* 商品详情 / 规格参数 / 商品评价 Tab 区 */}
      <motion.div
        className="mt-0"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
      >
        <motion.div
          className="bg-white rounded-xl shadow-sm overflow-hidden"
          whileHover={{ boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
          transition={{ duration: 0.3 }}
        >
          <DetailTabs
            blocks={detailBlocks}
            attrs={product.attrs}
            reviews={reviews}
            reviewsLoading={reviewsLoading}
            averageRating={averageRating}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
