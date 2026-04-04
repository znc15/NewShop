import { useEffect, useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { Heart, Share2, ShoppingCart, ChevronLeft } from 'lucide-react'
import { motion, type Variants } from 'motion/react'
import { productService } from '@/services'
import { useCartStore } from '@/stores/cartStore'
import { ImageGallery } from '@/components/product/ImageGallery'
import { SkuSelector } from '@/components/product/SkuSelector'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Loading'
import { cn } from '@/utils'
import type { Product, ProductReview, ProductSku, ProductSpec } from '@/types'

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

function parseDetailImageUrls(product: Product): string[] {
  const explicitUrls = parseImageCollection((product as Product & { detail_images?: unknown }).detail_images)
  if (explicitUrls.length > 0) {
    return explicitUrls
  }

  const detailText = product.detail || ''
  const urlRegex = /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s]*)?/gi
  const matches = detailText.match(urlRegex)
  if (!matches) {
    return []
  }

  return Array.from(new Set(matches.map((item) => item.trim()).filter((item) => item.length > 0)))
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
  const detailImageUrls = parseDetailImageUrls(product)
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

      {/* 商品评价 */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
      >
        <motion.div
          className="bg-white rounded-xl shadow-sm p-6"
          whileHover={{ boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-semibold text-charcoal">宝贝评价</h2>
            <div className="text-sm text-stone">
              平均评分
              <span className="ml-2 text-base font-semibold text-amber-500">{averageRating}</span>
              <span className="ml-2">({reviews.length} 条)</span>
            </div>
          </div>

          {reviewsLoading ? (
            <div className="py-10 text-center text-stone">评价加载中...</div>
          ) : reviews.length === 0 ? (
            <div className="py-10 text-center text-stone">当前商品暂无评价，欢迎购买后分享体验。</div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const safeRating = Math.max(1, Math.min(5, review.rating))

                return (
                  <article key={review.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-charcoal">{review.author}</p>
                        <p className="text-xs text-stone mt-0.5">{review.handle || '匿名用户'}</p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500" aria-label={`${safeRating} 星评价`}>
                        {Array.from({ length: 5 }).map((_, starIndex) => (
                          <svg
                            key={`${review.id}-star-${starIndex}`}
                            width="14"
                            height="14"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            style={{ opacity: starIndex < safeRating ? 1 : 0.25 }}
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-charcoal/90 whitespace-pre-line">{review.content}</p>
                  </article>
                )
              })}
            </div>
          )}
        </motion.div>
      </motion.div>

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
          {detailImageUrls.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-charcoal">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                淘宝导入详情图
              </div>
              <div className="space-y-3">
                {detailImageUrls.map((url, index) => (
                  <img
                    key={`${url}-${index}`}
                    src={url}
                    alt={`详情图 ${index + 1}`}
                    loading="lazy"
                    className="w-full rounded-lg border border-slate-200 bg-white object-contain"
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
