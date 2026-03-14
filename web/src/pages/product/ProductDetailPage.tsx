import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Heart, Share2, ShoppingCart, ChevronLeft } from 'lucide-react'
import { productService } from '@/services'
import { useCartStore } from '@/stores/cartStore'
import { ImageGallery } from '@/components/product/ImageGallery'
import { SkuSelector } from '@/components/product/SkuSelector'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Loading'
import { cn } from '@/utils'
import type { Product, ProductSku, ProductSpec } from '@/types'

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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
      if (!id) return
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
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-stone text-lg">{error || '商品不存在'}</p>
          <Button onClick={() => navigate('/products')} className="mt-4">
            返回商品列表
          </Button>
        </div>
      </div>
    )
  }

  const currentPrice = selectedSku?.price ?? product?.price ?? 0
  const originalPrice = selectedSku?.original_price ?? product?.original_price
  const specs = generateSpecsFromSkus(product.skus)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm text-stone mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-charcoal">
          <ChevronLeft className="w-4 h-4" />
          返回
        </button>
        <span>/</span>
        <Link to="/products" className="hover:text-charcoal">全部商品</Link>
        <span>/</span>
        <span className="text-charcoal">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：图片和选择 */}
        <div className="lg:sticky lg:top-24">
          <ImageGallery
            images={product.images.length > 0 ? product.images : [product.main_image]}
            selectedIndex={0}
            onSelect={() => {}}
          />
        </div>

        {/* 右侧：商品信息 */}
        <div className="space-y-6">
          {/* 商品标题 */}
          <div>
            <h1 className="font-display text-2xl font-semibold text-charcoal">
              {product.name}
            </h1>
            <p className="text-stone mt-2">{product.description}</p>
          </div>

          {/* 价格 - 后端价格单位为分 */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-red-500">
              ¥{((currentPrice) / 100).toFixed(2)}
            </span>
            {originalPrice && originalPrice > currentPrice && (
              <span className="text-lg text-stone line-through">
                ¥{((originalPrice) / 100).toFixed(2)}
              </span>
            )}
          </div>

          {/* 销量 */}
          <div className="flex items-center gap-6 text-sm">
            <span className="text-stone">已售 {product.sales || 0}</span>
          </div>

          {/* SKU 选择器 */}
          {specs.length > 0 && (
            <div className="border-t border-cream-200 pt-6">
              <SkuSelector
                specs={specs}
                skus={product.skus}
                selectedSku={selectedSku}
                onSkuChange={setSelectedSku}
                quantity={quantity}
                onQuantityChange={setQuantity}
                maxQuantity={selectedSku?.stock ?? 99}
              />
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-4 pt-6">
            <Button
              variant="outline"
              onClick={toggleFavorite}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Heart
                className={cn(
                  'w-5 h-5',
                  isFavorite ? 'fill-red-500 text-red-500' : 'text-stone'
                )}
              />
              {isFavorite ? '已收藏' : '收藏'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              分享
            </Button>
            <Button
              variant="outline"
              onClick={() => {}}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              加入购物车
            </Button>
          </div>

          {/* 购买按钮 */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="copper"
              size="lg"
              onClick={handleAddToCart}
              disabled={!selectedSku || addingToCart}
              className="flex-1"
            >
              {addingToCart ? '添加中...' : '加入购物车'}
            </Button>
            <Button
              size="lg"
              onClick={handleBuyNow}
              disabled={!selectedSku}
              className="flex-1"
            >
              立即购买
            </Button>
          </div>
        </div>
      </div>

      {/* 商品详情 */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-display text-xl font-semibold text-charcoal mb-4">商品详情</h2>
          <div className="prose text-stone whitespace-pre-line">
            {product.detail || product.description}
          </div>
        </div>
      </div>
    </div>
  )
}
