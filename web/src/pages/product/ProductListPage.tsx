import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, type Variants, AnimatePresence } from 'motion/react'
import { Filter, X } from 'lucide-react'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductFilter } from '@/components/product/ProductFilter'
import { productService } from '@/services'
import { Spinner } from '@/components/ui/Loading'
import type { Product, Category, Brand, PaginatedResponse } from '@/types'

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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

const fadeVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

function flattenCategories(nodes: Category[]): Category[] {
  const result: Category[] = []

  const walk = (items: Category[]) => {
    items.forEach((item) => {
      result.push(item)
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children)
      }
    })
  }

  walk(nodes)
  return result
}

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const parseNumberParam = (key: string): number | undefined => {
    const raw = searchParams.get(key)
    if (!raw) {
      return undefined
    }
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }

  const categoryId = parseNumberParam('category')
  const brandId = parseNumberParam('brand')
  const minPrice = parseNumberParam('minPrice')
  const maxPrice = parseNumberParam('maxPrice')
  const sortBy = searchParams.get('sort') || 'default'
  const sortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const selectedPriceRange =
    minPrice !== undefined || maxPrice !== undefined
      ? { min: minPrice || 0, max: maxPrice ?? Infinity }
      : undefined

  // 获取筛选项（分类、品牌）
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [categoriesData, brandsData] = await Promise.all([
          productService.getCategories(),
          productService.getBrands(),
        ])
        setCategories(flattenCategories(categoriesData))
        setBrands(brandsData)
      } catch (error) {
        console.error('获取筛选项失败:', error)
      }
    }

    fetchFilterOptions()
  }, [])

  // 获取商品列表
  const fetchProducts = useCallback(async (pageNum: number) => {
    setLoading(true)
    if (pageNum === 1) {
      setError(null)
    }
    try {
      const params: Record<string, unknown> = {
        page: pageNum,
        page_size: 20,
      }

      if (categoryId) params.category_id = categoryId
      if (brandId) params.brand_id = brandId
      if (minPrice !== undefined) params.min_price = minPrice * 100
      if (maxPrice !== undefined) params.max_price = maxPrice * 100
      if (sortBy !== 'default') {
        params.sort_by = sortBy
        params.sort_order = sortOrder
      }

      const response: PaginatedResponse<Product> = await productService.getProducts(params)
      if (pageNum === 1) {
        setProducts(response.data)
      } else {
        setProducts((prev) => [...prev, ...response.data])
      }
      setTotalPages(response.total_pages)
    } catch (err) {
      console.error('获取商品列表失败:', err)
      if (pageNum === 1) {
        setProducts([])
        setError('获取商品列表失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }, [brandId, categoryId, maxPrice, minPrice, sortBy, sortOrder])

  useEffect(() => {
    setPage(1)
    fetchProducts(1)
  }, [fetchProducts])

  // 加载更多
  const loadMore = () => {
    if (page < totalPages) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchProducts(nextPage)
    }
  }

  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    })

    setSearchParams(next)
  }

  // 筛选处理
  const handleCategoryChange = (catId?: number) => {
    updateSearchParams({ category: catId ? String(catId) : undefined })
  }

  const handleBrandChange = (nextBrandId?: number) => {
    updateSearchParams({ brand: nextBrandId ? String(nextBrandId) : undefined })
  }

  const handlePriceRangeChange = (range?: { min: number; max: number }) => {
    if (!range) {
      updateSearchParams({ minPrice: undefined, maxPrice: undefined })
      return
    }

    updateSearchParams({
      minPrice: String(range.min),
      maxPrice: Number.isFinite(range.max) ? String(range.max) : undefined,
    })
  }

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    if (field === 'default') {
      updateSearchParams({ sort: undefined, order: undefined })
    } else {
      updateSearchParams({ sort: field, order })
    }
  }

  const handleReset = () => {
    setSearchParams({})
  }

  const priceRanges = [
    { label: '全部价格', min: 0, max: Infinity },
    { label: '0-100', min: 0, max: 100 },
    { label: '100-500', min: 100, max: 500 },
    { label: '500-1000', min: 500, max: 1000 },
    { label: '1000以上', min: 1000, max: Infinity },
  ]

  return (
    <motion.div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* 移动端筛选按钮 */}
      <motion.button
        onClick={() => setShowMobileFilter(true)}
        className="md:hidden flex items-center gap-2 mb-4 px-4 py-2 bg-white border border-slate-200 rounded-lg text-charcoal hover:bg-slate-50 transition-colors"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Filter className="w-4 h-4" />
        <span>筛选</span>
        {(categoryId || brandId || selectedPriceRange) && (
          <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
            已选
          </span>
        )}
      </motion.button>

      {/* 移动端筛选弹窗 */}
      <AnimatePresence>
        {showMobileFilter && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilter(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 md:hidden overflow-y-auto"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-charcoal">筛选条件</h3>
                <button
                  onClick={() => setShowMobileFilter(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <ProductFilter
                  categories={categories}
                  brands={brands}
                  priceRanges={priceRanges}
                  selectedCategory={categoryId}
                  selectedBrand={brandId}
                  selectedPriceRange={selectedPriceRange}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onCategoryChange={(catId) => {
                    handleCategoryChange(catId)
                    setShowMobileFilter(false)
                  }}
                  onBrandChange={(nextBrandId) => {
                    handleBrandChange(nextBrandId)
                    setShowMobileFilter(false)
                  }}
                  onPriceRangeChange={(range) => {
                    handlePriceRangeChange(range)
                    setShowMobileFilter(false)
                  }}
                  onSortChange={(field, order) => {
                    handleSortChange(field, order)
                    setShowMobileFilter(false)
                  }}
                  onReset={() => {
                    handleReset()
                    setShowMobileFilter(false)
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* 左侧筛选 - 桌面端 */}
        <motion.div
          className="hidden md:block w-64 flex-shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <ProductFilter
            categories={categories}
            brands={brands}
            priceRanges={priceRanges}
            selectedCategory={categoryId}
            selectedBrand={brandId}
            selectedPriceRange={selectedPriceRange}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onCategoryChange={handleCategoryChange}
            onBrandChange={handleBrandChange}
            onPriceRangeChange={handlePriceRangeChange}
            onSortChange={handleSortChange}
            onReset={handleReset}
          />
        </motion.div>

        {/* 右侧商品列表 */}
        <motion.div
          className="flex-1"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="flex items-center justify-between mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-2xl font-semibold text-charcoal">
              {categoryId
                ? categories.find((c) => c.id === categoryId)?.name || '商品列表'
                : '全部商品'}
            </h1>
            <span className="text-sm text-stone">
              共 {products.length} 件商品
            </span>
          </motion.div>

          {loading && products.length === 0 && !error ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <motion.div
              className="flex flex-col items-center justify-center py-20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-red-600 text-lg mb-4">{error}</p>
              <motion.button
                onClick={() => fetchProducts(1)}
                className="px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                重试
              </motion.button>
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center py-20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-stone text-lg">暂无商品</p>
            </motion.div>
          ) : (
            <>
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

              {/* 加载更多 */}
              {page < totalPages && (
                <motion.div
                  className="mt-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-8 py-3 border-2 border-blue-700 text-blue-700 rounded-lg hover:bg-blue-700 hover:text-white transition-colors disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? '加载中...' : '加载更多'}
                  </motion.button>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}
