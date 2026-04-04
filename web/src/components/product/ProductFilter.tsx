import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/utils'
import type { Category, Brand } from '@/types'

interface ProductFilterProps {
  categories: Category[]
  brands: Brand[]
  priceRanges: { label: string; min: number; max: number }[]
  selectedCategory?: number
  selectedBrand?: number
  selectedPriceRange?: { min: number; max: number }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onCategoryChange: (categoryId?: number) => void
  onBrandChange: (brandId?: number) => void
  onPriceRangeChange: (range?: { min: number; max: number }) => void
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  onReset: () => void
}

const defaultPriceRanges = [
  { label: '全部价格', min: 0, max: Infinity },
  { label: '0-100', min: 0, max: 100 },
  { label: '100-500', min: 100, max: 500 },
  { label: '500-1000', min: 500, max: 1000 },
  { label: '1000以上', min: 1000, max: Infinity },
]

const sortOptions = [
  { label: '综合排序', value: 'default' },
  { label: '价格从低到高', value: 'price_asc' },
  { label: '价格从高到低', value: 'price_desc' },
  { label: '销量优先', value: 'sales_desc' },
  { label: '新品优先', value: 'created_at_desc' },
]

function parseSortValue(value: string): { field: string; order: 'asc' | 'desc' } {
  if (value === 'default') {
    return { field: 'default', order: 'desc' }
  }

  const separatorIndex = value.lastIndexOf('_')
  const field = value.slice(0, separatorIndex)
  const order = value.slice(separatorIndex + 1) as 'asc' | 'desc'
  return { field, order }
}

export function ProductFilter({
  categories,
  brands,
  priceRanges = defaultPriceRanges,
  selectedCategory,
  selectedBrand,
  selectedPriceRange,
  sortBy = 'default',
  sortOrder = 'desc',
  onCategoryChange,
  onBrandChange,
  onPriceRangeChange,
  onSortChange,
  onReset,
}: ProductFilterProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('category')

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleSortChange = (value: string) => {
    const { field, order } = parseSortValue(value)
    if (field === 'default') {
      onSortChange('default', 'desc')
    } else {
      onSortChange(field, order)
    }
  }

  const hasActiveFilters = selectedCategory || selectedBrand || selectedPriceRange

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      {/* 排序选项 */}
      <div className="flex items-center gap-4 flex-wrap">
        {sortOptions.map((option) => {
          const { field, order } = parseSortValue(option.value)
          const isActive =
            option.value === 'default'
              ? sortBy === 'default'
              : sortBy === field && sortOrder === order

          return (
            <button
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-50 text-slate-700 hover:bg-slate-100'
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {/* 分类筛选 */}
      <div className="border-t border-slate-200 pt-4">
        <button
          onClick={() => toggleSection('category')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-medium text-slate-700">分类</span>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-stone transition-transform',
              expandedSection === 'category' && 'rotate-180'
            )}
          />
        </button>
        {expandedSection === 'category' && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onCategoryChange(undefined)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                !selectedCategory
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-50 text-slate-700 hover:bg-slate-100'
              )}
            >
              全部
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  selectedCategory === category.id
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 text-slate-700 hover:bg-slate-100'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 品牌筛选 */}
      {brands.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <button
            onClick={() => toggleSection('brand')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium text-slate-700">品牌</span>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-stone transition-transform',
                expandedSection === 'brand' && 'rotate-180'
              )}
            />
          </button>
          {expandedSection === 'brand' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => onBrandChange(undefined)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  !selectedBrand
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 text-slate-700 hover:bg-slate-100'
                )}
              >
                全部
              </button>
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => onBrandChange(brand.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-colors',
                    selectedBrand === brand.id
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 价格区间 */}
      <div className="border-t border-slate-200 pt-4">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-medium text-slate-700">价格区间</span>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-stone transition-transform',
              expandedSection === 'price' && 'rotate-180'
            )}
          />
        </button>
        {expandedSection === 'price' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {priceRanges.map((range, index) => (
              <button
                key={index}
                onClick={() =>
                  onPriceRangeChange(
                    index === 0 ? undefined : { min: range.min, max: range.max }
                  )
                }
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  (index === 0 && !selectedPriceRange) ||
                    (selectedPriceRange &&
                      selectedPriceRange.min === range.min &&
                      selectedPriceRange.max === range.max)
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 text-slate-700 hover:bg-slate-100'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 重置筛选 */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
        >
          <X className="w-4 h-4" />
          清除筛选
        </button>
      )}
    </div>
  )
}

export default ProductFilter
