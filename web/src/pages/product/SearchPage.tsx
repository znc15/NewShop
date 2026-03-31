import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, X, TrendingUp } from 'lucide-react'
import { motion, type Variants } from 'motion/react'
import { productService } from '@/services'
import { ProductCard } from '@/components/product/ProductCard'
import { Spinner } from '@/components/ui/Loading'
import type { Product } from '@/types'

// 动画变体配置
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
}

const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4 },
  },
}

const hotKeywords = ['手机', '电脑', '耳机', '键盘', '鼠标', '显示器']

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('q') || ''

  const [searchTerm, setSearchTerm] = useState(keyword)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    if (!searchValue.trim()) {
      setError('请输入搜索关键词')
      return
    }

    setLoading(true)
    setSearched(true)
    setError(null)
    setSearchParams({ q: searchValue })
    saveToHistory(searchValue)

    try {
      const data = await productService.search(searchValue)
      setResults(data.products || [])
    } catch (err) {
      console.error('搜索失败:', err)
      setError('搜索失败，请稍后重试')
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
    <motion.div
      className="max-w-4xl mx-auto px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* 搜索框 */}
      <motion.div
        className="relative mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone" />
            <motion.input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索商品、品牌、分类"
              className="w-full h-12 pl-10 pr-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            />
            {searchTerm && (
              <motion.button
                onClick={() => {
                  setSearchTerm('')
                  if (error) setError(null)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-stone hover:text-charcoal" />
              </motion.button>
            )}
          </div>
          <motion.button
            onClick={() => handleSearch()}
            className="h-12 px-6 bg-blue-700 text-white rounded-xl hover:bg-blue-600 transition-colors flex-shrink-0 flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            搜索
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <motion.div
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {error}
        </motion.div>
      )}

      {/* 搜索结果 */}
      {searched ? (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : results.length > 0 ? (
          <motion.div
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
          >
            <p className="text-sm text-stone mb-4">
              找到 {results.length} 件与 "{keyword}" 相关的商品
            </p>
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {results.map((product) => (
                <motion.div key={product.id} variants={itemVariants}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-stone text-lg mb-2">未找到相关商品</p>
            <p className="text-sm text-stone/60 mb-6">换个关键词试试吧</p>
            <Link
              to="/products"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              浏览全部商品
            </Link>
          </motion.div>
        )
      ) : (
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {/* 搜索历史 */}
          {searchHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-charcoal">搜索历史</h3>
                <motion.button
                  onClick={clearHistory}
                  className="text-sm text-stone hover:text-charcoal"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  清空
                </motion.button>
              </div>
              <motion.div
                className="flex flex-wrap gap-2"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {searchHistory.map((item) => (
                  <motion.div
                    key={item}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-full text-sm"
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, backgroundColor: '#e8e4de' }}
                  >
                    <button onClick={() => handleSearch(item)}>{item}</button>
                    <motion.button
                      onClick={() => removeHistoryItem(item)}
                      className="hover:text-red-500"
                     whileHover={{ scale: 1.06 }}
                     whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-3 h-3" />
                    </motion.button>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* 热门搜索 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="font-medium text-charcoal">热门搜索</h3>
            </div>
            <motion.div
              className="flex flex-wrap gap-2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {hotKeywords.map((keyword) => (
                <motion.button
                  key={keyword}
                  onClick={() => handleSearch(keyword)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-slate-100 rounded-full text-sm text-charcoal transition-colors"
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, backgroundColor: '#e8e4de' }}
                  whileTap={{ scale: 0.95 }}
                >
                  {keyword}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}
