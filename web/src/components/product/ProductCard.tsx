import { Link } from 'react-router-dom'
import { cn } from '@/utils'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const firstSku = product.skus?.[0]
  const price = firstSku?.price ?? product.price
  const originalPrice = firstSku?.original_price ?? product.original_price

  return (
    <Link
      to={`/products/${product.id}`}
      className={cn(
        'group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden',
        className
      )}
    >
      {/* 商品图片 */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.main_image || (Array.isArray(product.images) ? product.images?.[0] : '/placeholder.png') || '/placeholder.png'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* 标签 */}
        {product.sales > 100 && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
            热卖
          </span>
        )}
        {originalPrice && originalPrice > price && (
          <span className="absolute top-2 right-2 px-2 py-1 bg-amber-500 text-white text-xs rounded">
            特惠
          </span>
        )}
      </div>

      {/* 商品信息 */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* 价格 - 后端价格单位为分，需要除以100 */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-red-500">
            ¥{(price / 100).toFixed(2)}
          </span>
          {originalPrice && originalPrice > price && (
            <span className="text-sm text-gray-400 line-through">
              ¥{(originalPrice / 100).toFixed(2)}
            </span>
          )}
        </div>

        {/* 销量 */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>已售 {product.sales || 0}</span>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard
