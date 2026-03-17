import { useState, useEffect } from 'react'
import { cn } from '@/utils'
import type { ProductSpec, ProductSku } from '@/types'

interface SkuSelectorProps {
  specs: ProductSpec[]
  skus: ProductSku[]
  selectedSku?: ProductSku
  onSkuChange: (sku: ProductSku) => void
  quantity: number
  onQuantityChange: (quantity: number) => void
  maxQuantity?: number
}

// 辅助函数：解析 SKU 的 specs 字段
function parseSkuSpecs(specs: Record<string, string> | string): Record<string, string> {
  if (typeof specs === 'string') {
    try {
      return JSON.parse(specs)
    } catch {
      return {}
    }
  }
  return specs
}

export function SkuSelector({
  specs,
  skus,
  selectedSku,
  onSkuChange,
  quantity,
  onQuantityChange,
  maxQuantity = 99,
}: SkuSelectorProps) {
  // 当前选择的规格值
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({})

  // 根据 sku 的 specs 字段初始化 selectedSpecs
  useEffect(() => {
    if (selectedSku?.specs) {
      setSelectedSpecs(parseSkuSpecs(selectedSku.specs))
    }
  }, [selectedSku])

  // 处理规格值选择
  const handleSpecSelect = (specName: string, value: string) => {
    const newSpecs = { ...selectedSpecs, [specName]: value }
    setSelectedSpecs(newSpecs)

    // 查找匹配的 SKU
    const matchedSku = skus.find((sku) => {
      const skuSpecs = parseSkuSpecs(sku.specs)
      return Object.entries(newSpecs).every(([key, val]) => skuSpecs[key] === val)
    })

    if (matchedSku) {
      onSkuChange(matchedSku)
    }
  }

  // 检查规格值是否可选
  const isSpecValueAvailable = (specName: string, value: string) => {
    const testSpecs = { ...selectedSpecs, [specName]: value }
    return skus.some((sku) => {
      const skuSpecs = parseSkuSpecs(sku.specs)
      return (
        Object.entries(testSpecs).every(([key, val]) => skuSpecs[key] === val) &&
        sku.stock > 0
      )
    })
  }

  // 检查规格值是否被选中
  const isSpecValueSelected = (specName: string, value: string) => {
    return selectedSpecs[specName] === value
  }

  // 数量控制
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(maxQuantity, quantity + delta))
    onQuantityChange(newQuantity)
  }

  const currentStock = selectedSku?.stock ?? 0
  const effectiveMaxQuantity = Math.min(maxQuantity, currentStock)

  return (
    <div className="space-y-6">
      {/* 规格选择 */}
      {specs.map((spec) => (
        <div key={spec.id}>
          <h4 className="text-sm font-medium text-charcoal mb-3">{spec.name}</h4>
          <div className="flex flex-wrap gap-2">
            {spec.values.map((value: string, index: number) => {
              const isAvailable = isSpecValueAvailable(spec.name, value)
              const isSelected = isSpecValueSelected(spec.name, value)

              return (
                <button
                  key={`${spec.name}-${index}`}
                  onClick={() => isAvailable && handleSpecSelect(spec.name, value)}
                  disabled={!isAvailable}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isSelected
                      ? 'bg-blue-700 text-white shadow-md'
                      : isAvailable
                        ? 'bg-blue-50 text-charcoal hover:bg-slate-100 border border-slate-300'
                        : 'bg-blue-50 text-stone/40 cursor-not-allowed line-through'
                  )}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* 数量选择 */}
      <div>
        <h4 className="text-sm font-medium text-charcoal mb-3">数量</h4>
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
              className={cn(
                'w-10 h-10 flex items-center justify-center text-charcoal',
                quantity <= 1 ? 'text-stone/40' : 'hover:bg-blue-50'
              )}
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              min={1}
              max={effectiveMaxQuantity}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                if (val > 0 && val <= effectiveMaxQuantity) {
                  onQuantityChange(val)
                }
              }}
              className="w-16 h-10 text-center border-x border-slate-300 focus:outline-none"
            />
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={!selectedSku || quantity >= effectiveMaxQuantity}
              className={cn(
                'w-10 h-10 flex items-center justify-center text-charcoal',
                (!selectedSku || quantity >= effectiveMaxQuantity) ? 'text-stone/40' : 'hover:bg-blue-50'
              )}
            >
              +
            </button>
          </div>

          <span className="text-sm text-stone">
            {selectedSku ? (
              currentStock > 10 ? (
                '库存充足'
              ) : currentStock > 0 ? (
                <span className="text-blue-500">仅剩 {currentStock} 件</span>
              ) : (
                <span className="text-red-500">已售罄</span>
              )
            ) : (
              '请先选择规格'
            )}
          </span>
        </div>
      </div>

      {/* 选中信息 */}
      {selectedSku && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-charcoal">
            已选：
            <span className="font-medium">
              {Object.entries(selectedSpecs).map(([key, val]) => `${key}: ${val}`).join(' / ')}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

export default SkuSelector
