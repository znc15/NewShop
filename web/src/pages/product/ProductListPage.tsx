import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductFilter } from '@/components/product/ProductFilter'
import { productService } from '@/services'
import { Spinner } from '@/components/ui/Loading'
import type { Product, Category, Brand, PaginatedResponse } from '@/types'

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('category') ? parseInt(searchParams.get('category')!) : undefined
  const sortBy = searchParams.get('sort') || 'default'
  const sortOrder = searchParams.get('order') as 'asc' | 'desc' || 'desc'

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands] = useState<Brand[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 获取分类列表
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await productService.getCategories()
        setCategories(categoriesData)
      } catch (error) {
        console.error('获取分类失败:', error)
      }
    }

    fetchCategories()
  }, [])

  // 获取商品列表
  const fetchProducts = useCallback(async (pageNum: number) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {
        page: pageNum,
        pageSize: 20,
      }

      if (categoryId) params.categoryId = categoryId
      if (sortBy !== 'default') {
        params.sortBy = sortBy
        params.sortOrder = sortOrder
      }

      const response: PaginatedResponse<Product> = await productService.getProducts(params)
      if (pageNum === 1) {
        setProducts(response.data)
      } else {
        setProducts((prev) => [...prev, ...response.data])
      }
      setTotalPages(response.totalPages)
    } catch (error) {
      console.error('获取商品列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [categoryId, sortBy, sortOrder])

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

  // 筛选处理
  const handleCategoryChange = (catId?: number) => {
    if (catId) {
      setSearchParams({ category: String(catId) })
    } else {
      setSearchParams({})
    }
  }

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    if (field === 'default') {
      setSearchParams({})
    } else {
      setSearchParams({ sort: field, order })
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* 左侧筛选 */}
        <div className="w-64 flex-shrink-0">
          <ProductFilter
            categories={categories}
            brands={brands}
            priceRanges={priceRanges}
            selectedCategory={categoryId}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onCategoryChange={handleCategoryChange}
            onBrandChange={() => {}}
            onPriceRangeChange={() => {}}
            onSortChange={handleSortChange}
            onReset={handleReset}
          />
        </div>

        {/* 右侧商品列表 */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-charcoal">
              {categoryId
                ? categories.find((c) => c.id === categoryId)?.name || '商品列表'
                : '全部商品'}
            </h1>
            <span className="text-sm text-stone">
              共 {products.length} 件商品
            </span>
          </div>

          {loading && products.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-stone text-lg">暂无商品</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* 加载更多 */}
              {page < totalPages && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-8 py-3 border-2 border-forest-700 text-forest-700 rounded-lg hover:bg-forest-700 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {loading ? '加载中...' : '加载更多'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
