import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, X, TrendingUp } from 'lucide-react'
import { productService } from '@/services'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Loading'
import type { Product } from '@/types'

const hotKeywords = ['手机', '电脑', '耳机', '键盘', '鼠标', '显示器']

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('q') || ''

  const [searchTerm, setSearchTerm] = useState(keyword)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // 加载搜索历史
  useEffect(() => {
    const savedHistory = localStorage.getItem('search_history')
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory))
      } catch {
        // ignore
      }
    }
  }, [])

  // 同步 URL 参数
  useEffect(() => {
    if (keyword) {
      setSearchTerm(keyword)
      handleSearch(keyword)
    }
  }, [keyword])

  // 保存搜索历史
  const saveToHistory = (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return

    const newHistory = [trimmed, ...searchHistory.filter((h) => h !== trimmed)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem('search_history', JSON.stringify(newHistory))
  }

  // 执行搜索
  const handleSearch = async (term?: string) => {
    const searchValue = term || searchTerm
    if (!searchValue.trim()) return

    setLoading(true)
    setSearched(true)
    setSearchParams({ q: searchValue })
    saveToHistory(searchValue)

    try {
      const data = await productService.search(searchValue)
      setResults(data.products || [])
    } catch (error) {
      console.error('搜索失败:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // 清空搜索历史
  const clearHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('search_history')
  }

  // 删除单条历史记录
  const removeHistoryItem = (item: string) => {
    const newHistory = searchHistory.filter((h) => h !== item)
    setSearchHistory(newHistory)
    localStorage.setItem('search_history', JSON.stringify(newHistory))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 搜索框 */}
      <div className="relative mb-8">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索商品、品牌、分类"
              className="w-full h-12 pl-10 pr-4 border border-cream-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5 text-stone hover:text-charcoal" />
              </button>
            )}
          </div>
          <button
            onClick={() => handleSearch()}
            className="h-12 px-6 bg-forest-700 text-white rounded-xl hover:bg-forest-600 transition-colors"
          >
            搜索
          </button>
        </div>
      </div>

      {/* 搜索结果 */}
      {searched ? (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : results.length > 0 ? (
          <div>
            <p className="text-sm text-stone mb-4">
              找到 {results.length} 件与 "{keyword}" 相关的商品
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-stone text-lg mb-2">未找到相关商品</p>
            <p className="text-sm text-stone/60 mb-6">换个关键词试试吧</p>
            <Link
              to="/products"
              className="text-forest-600 hover:text-forest-700 text-sm"
            >
              浏览全部商品
            </Link>
          </div>
        )
      ) : (
        <div className="space-y-8">
          {/* 搜索历史 */}
          {searchHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-charcoal">搜索历史</h3>
                <button
                  onClick={clearHistory}
                  className="text-sm text-stone hover:text-charcoal"
                >
                  清空
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-1 px-3 py-1.5 bg-cream-100 rounded-full text-sm"
                  >
                    <button onClick={() => handleSearch(item)}>{item}</button>
                    <button
                      onClick={() => removeHistoryItem(item)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 热门搜索 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-copper-500" />
              <h3 className="font-medium text-charcoal">热门搜索</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {hotKeywords.map((keyword) => (
                <button
                  key={keyword}
                  onClick={() => handleSearch(keyword)}
                  className="px-3 py-1.5 bg-cream-100 hover:bg-cream-200 rounded-full text-sm text-charcoal transition-colors"
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
