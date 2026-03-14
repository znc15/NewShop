import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Spinner } from '@/components/ui/Loading'
import type { Product } from '@/types'

const discountModes = [
  { value: 'fixed_ratio', label: '固定比例' },
  { value: 'tiered', label: '阶梯折扣' },
  { value: 'product_config', label: '商品配置' },
]

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'depositing', label: '定金中' },
  { value: 'balance_due', label: '待付尾款' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
]

// 定义预售活动类型
interface PreorderCampaign {
  id: number
  name: string
  product?: Product
  discount_mode: string
  status: string
}

export default function PreorderPage() {
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<PreorderCampaign[]>([])

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      // 模拟预售活动数据
      const mockCampaigns: PreorderCampaign[] = [
        {
          id: 1,
          name: 'iPhone 15 预售',
          product: {
            id: 1,
            name: 'iPhone 15',
            description: '全新 iPhone 15，A17 芯片',
            price: 699900,
            original_price: 799900,
            main_image: 'https://picsum.photos/seed/iphone15/400/400',
          } as Product,
          discount_mode: 'fixed_ratio',
          status: 'depositing',
        },
        {
          id: 2,
          name: 'MacBook Pro 预售',
          product: {
            id: 2,
            name: 'MacBook Pro',
            description: 'M3 芯片，专业性能',
            price: 1499900,
            original_price: 1699900,
            main_image: 'https://picsum.photos/seed/macbook/400/400',
          } as Product,
          discount_mode: 'tiered',
          status: 'depositing',
        },
        {
          id: 3,
          name: 'AirPods Pro 预售',
          product: {
            id: 3,
            name: 'AirPods Pro',
            description: '主动降噪，空间音频',
            price: 189900,
            original_price: 199900,
            main_image: 'https://picsum.photos/seed/airpods/400/400',
          } as Product,
          discount_mode: 'product_config',
          status: 'balance_due',
        },
      ]
      setCampaigns(mockCampaigns)
    } catch (error) {
      console.error('获取预售活动失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        className="flex items-center gap-2 mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link to="/" className="text-stone hover:text-forest-600">
          首页
        </Link>
        <span className="text-stone">/</span>
        <span className="text-charcoal font-medium">预售专区</span>
      </motion.div>

      <motion.div
        className="bg-gradient-to-r from-copper-500 to-copper-600 rounded-xl p-8 mb-8 text-white overflow-hidden relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent"
          animate={{
            x: [0, 20, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="relative z-10">
          <h1 className="text-3xl font-semibold mb-2">预售专区</h1>
          <p className="text-cream-100">抢先预订，享受专属折扣</p>
        </div>
      </motion.div>

      {campaigns.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-stone text-lg">暂无预售活动</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
        >
          {campaigns.map((campaign, index) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="bg-white rounded-xl border border-cream-300 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-cream-100 overflow-hidden">
                <motion.img
                  src={campaign.product?.main_image || 'https://picsum.photos/seed/product/400/400'}
                  alt={campaign.name}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-charcoal mb-1">{campaign.name}</h3>
                <p className="text-sm text-stone mb-2 line-clamp-2">{campaign.product?.description}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-copper-600">
                    ¥{(campaign.product?.price || 0) / 100}
                  </span>
                  {(campaign.product?.original_price || 0) > (campaign.product?.price || 0) && (
                    <span className="text-sm text-stone line-through">
                      ¥{(campaign.product?.original_price || 0) / 100}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-forest-100 text-forest-700 rounded">
                    {discountModes.find(m => m.value === campaign.discount_mode)?.label || campaign.discount_mode}
                  </span>
                  <span className={`px-2 py-1 rounded ${
                    campaign.status === 'depositing' ? 'bg-copper-100 text-copper-700' :
                    campaign.status === 'balance_due' ? 'bg-amber-100 text-amber-700' :
                    'bg-stone-100 text-stone'
                  }`}>
                    {statusOptions.find(s => s.value === campaign.status)?.label || campaign.status}
                  </span>
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to={`/preorder/${campaign.id}`}
                    className="block mt-3 text-center py-2 bg-forest-700 text-white rounded-lg hover:bg-forest-600 transition-colors"
                  >
                    立即预订
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
