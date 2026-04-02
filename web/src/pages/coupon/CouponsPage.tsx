import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'motion/react'
import { Spinner } from '@/components/ui/Loading'
import type { Coupon } from '@/types'

const couponTypes = [
  { value: 'fixed', label: '满减' },
  { value: 'percent', label: '折扣' },
  { value: 'no_threshold', label: '无门槛' },
]

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
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
}

const headerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
    },
  },
}

export default function CouponsPage() {
  const [loading, setLoading] = useState(true)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [myCoupons, setMyCoupons] = useState<Coupon[]>([])
  const [activeTab, setActiveTab] = useState<'available' | 'my'>('available')
  const [claimingId, setClaimingId] = useState<number | null>(null)

  useEffect(() => {
    const fetchCoupons = async () => {
      setLoading(true)
      try {
        if (activeTab === 'available') {
          // 暂时模拟优惠券数据
          const mockCoupons: Coupon[] = [
            {
              id: 1,
              name: '新用户专享',
              code: 'NEWUSER50',
              type: 'fixed',
              discount_value: 5000,
              min_order_amount: 50000,
              max_discount: 5000,
              valid_from: '2024-01-01',
              valid_to: '2024-12-31',
              status: 'active',
            },
            {
              id: 2,
              name: '满200减20',
              code: 'SAVE20',
              type: 'fixed',
              discount_value: 2000,
              min_order_amount: 20000,
              max_discount: 2000,
              valid_from: '2024-01-01',
              valid_to: '2024-12-31',
              status: 'active',
            },
            {
              id: 3,
              name: '会员9折券',
              code: 'VIP10',
              type: 'percent',
              discount_value: 90,
              min_order_amount: 10000,
              valid_from: '2024-01-01',
              valid_to: '2024-12-31',
              status: 'active',
            },
          ]
          setCoupons(mockCoupons)
        } else {
          // 我的优惠券
          setMyCoupons([])
        }
      } catch (error) {
        console.error('获取优惠券失败:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchCoupons()
  }, [activeTab])

  const handleClaim = async (couponId: number) => {
    setClaimingId(couponId)
    try {
      // 模拟领取成功
      const coupon = coupons.find(c => c.id === couponId)
      if (coupon) {
        setMyCoupons([...myCoupons, { ...coupon, status: 'claimed' }])
        setCoupons(coupons.filter(c => c.id !== couponId))
      }
    } catch (error) {
      console.error('领取失败:', error)
    } finally {
      setClaimingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN')
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
        <Link to="/" className="text-stone hover:text-blue-600">
          首页
        </Link>
        <span className="text-stone">/</span>
        <span className="text-charcoal font-medium">优惠券中心</span>
      </motion.div>

      <motion.div
        className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-8 mb-8 text-white overflow-hidden relative"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <div className="relative z-10">
          <motion.h1
            className="text-3xl font-semibold mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            优惠券中心
          </motion.h1>
          <motion.p
            className="text-blue-50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            领取优惠券，享受更多优惠
          </motion.p>
        </div>
      </motion.div>

      {/* Tab 切换 */}
      <motion.div
        className="flex gap-4 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        {['available', 'my'].map((tab) => (
          <motion.button
            key={tab}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 text-charcoal hover:bg-slate-200'
            }`}
            onClick={() => setActiveTab(tab as 'available' | 'my')}
          >
            {tab === 'available' ? '可领取' : '我的优惠券'}
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'available' ? (
          coupons.length === 0 ? (
            <motion.div
              key="empty-available"
              className="flex flex-col items-center justify-center py-20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-stone text-lg">暂无可领取的优惠券</p>
            </motion.div>
          ) : (
            <motion.div
              key="available-list"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <AnimatePresence>
                {coupons.map((coupon) => (
                  <motion.div
                    key={coupon.id}
                    variants={itemVariants}
                    layout
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-xl border border-slate-300 p-4 hover:shadow-lg overflow-hidden relative"
                  >
                    <motion.div
                      className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-full -translate-y-1/2 translate-x-1/2"
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-charcoal">{coupon.name}</h3>
                        <motion.span
                          className={`px-2 py-1 rounded text-xs ${
                            coupon.type === 'fixed' ? 'bg-blue-100 text-blue-700' :
                            coupon.type === 'percent' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}
                          whileHover={{ scale: 1.1 }}
                        >
                          {couponTypes.find(t => t.value === coupon.type)?.label || coupon.type}
                        </motion.span>
                      </div>
                      <p className="text-sm text-stone mb-3">{coupon.code}</p>
                      <div className="flex items-baseline gap-2 mb-3">
                        <motion.span
                          className="text-2xl font-bold text-blue-600"
                          whileHover={{ scale: 1.1 }}
                        >
                          {coupon.type === 'percent'
                            ? `${coupon.discount_value}折`
                            : `¥${coupon.discount_value / 100}`
                          }
                        </motion.span>
                        {coupon.min_order_amount > 0 && (
                          <span className="text-sm text-stone">
                            满¥{coupon.min_order_amount / 100}可用
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-stone mb-4">
                        <span>有效期：{formatDate(coupon.valid_from)} - {formatDate(coupon.valid_to)}</span>
                      </div>
                      <motion.button
                        onClick={() => handleClaim(typeof coupon.id === 'number' ? coupon.id : parseInt(coupon.id as string))}
                        disabled={claimingId !== null}
                        className="w-full py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {claimingId === coupon.id ? '领取中...' : '立即领取'}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )
        ) : (
          myCoupons.length === 0 ? (
            <motion.div
              key="empty-my"
              className="flex flex-col items-center justify-center py-20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-stone text-lg mb-4">暂无优惠券</p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/coupons"
                  onClick={() => setActiveTab('available')}
                  className="px-4 py-2 bg-blue-700 text-white rounded-lg"
                >
                  去领取优惠券
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="my-list"
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {myCoupons.map((coupon) => (
                <motion.div
                  key={coupon.id}
                  variants={itemVariants}
                  whileHover={{ x: 5 }}
                  className="bg-white rounded-xl border border-blue-300 p-4"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-charcoal">{coupon.name}</h3>
                    <motion.span
                      className={`px-2 py-1 rounded text-xs ${
                        coupon.status === 'claimed' ? 'bg-blue-100 text-blue-700' :
                        coupon.status === 'used' ? 'bg-stone-100 text-stone' :
                        'bg-amber-100 text-amber-700'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {coupon.status === 'claimed' ? '待使用' : '已使用'}
                    </motion.span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {coupon.type === 'percent'
                        ? `${coupon.discount_value}折`
                        : `¥${coupon.discount_value / 100}`
                      }
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}
