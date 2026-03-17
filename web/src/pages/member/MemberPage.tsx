import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'motion/react'
import { Spinner } from '@/components/ui/Loading'

const memberTiers = [
  { level: 1, name: '普通会员', min_points: 0, icon: '🥉', benefits: ['生日优惠券', '积分兑换'], color: 'from-stone-400 to-stone-500' },
  { level: 2, name: '银卡会员', min_points: 1000, icon: '🥈', benefits: ['生日优惠券', '积分兑换', '专属折扣', '优先发货'], color: 'from-slate-400 to-slate-500' },
  { level: 3, name: '金卡会员', min_points: 5000, icon: '🥇', benefits: ['生日优惠券', '积分兑换', '专属折扣', '优先发货', '免费退换货', '专属客服'], color: 'from-amber-400 to-amber-500' },
  { level: 4, name: '钻石会员', min_points: 20000, icon: '💎', benefits: ['生日优惠券', '积分兑换', '专属折扣', '优先发货', '免费退换货', '专属客服', '新品试用', 'VIP活动'], color: 'from-purple-400 to-purple-500' },
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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    },
  },
}

const progressVariants: Variants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${Math.min(100, progress)}%`,
    transition: {
      duration: 1
    },
  }),
}

export default function MemberPage() {
  const [loading, setLoading] = useState(true)
  const [currentLevel, setCurrentLevel] = useState(1)
  const [points] = useState(1580)

  useEffect(() => {
    // 模拟数据
    setTimeout(() => {
      setCurrentLevel(2) // 银卡会员
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const currentTier = memberTiers.find(t => t.level === currentLevel)!
  const nextTier = memberTiers.find(t => t.level === currentLevel + 1)

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
        <span className="text-charcoal font-medium">会员中心</span>
      </motion.div>

      <motion.div
        className={`bg-gradient-to-r ${currentTier.color} rounded-xl p-8 mb-8 text-white overflow-hidden relative`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="absolute right-10 top-1/2 -translate-y-1/2"
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <span className="text-8xl opacity-20">{currentTier.icon}</span>
        </motion.div>
        <div className="flex items-center justify-between relative z-10">
          <div>
            <motion.h1
              className="text-3xl font-semibold mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              会员中心
            </motion.h1>
            <motion.p
              className="text-white"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              尊享专属权益，开启品质生活
            </motion.p>
          </div>
          <motion.div
            className="text-6xl"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {currentTier.icon}
          </motion.div>
        </div>
      </motion.div>

      {/* 当前等级 */}
      <motion.div
        className="bg-white rounded-xl border border-slate-200 p-6 mb-8"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between mb-6">
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: 10 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-3xl">{currentTier.icon}</span>
            </motion.div>
            <div>
              <h2 className="text-xl font-semibold text-charcoal">{currentTier.name}</h2>
              <p className="text-stone">当前积分：{points}</p>
            </div>
          </motion.div>
          {nextTier && (
            <motion.div
              className="text-right"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="text-sm text-stone">距离 {nextTier.name}</p>
              <p className="text-sm text-blue-600">
                还需 {nextTier.min_points - points} 积分
              </p>
            </motion.div>
          )}
        </div>

        {/* 进度条 */}
        {nextTier && (
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full"
              variants={progressVariants}
              initial="initial"
              animate="animate"
              custom={(points / nextTier.min_points) * 100}
            />
          </div>
        )}
      </motion.div>

      {/* 会员等级 */}
      <motion.div
        className="bg-white rounded-xl border border-slate-200 p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <h3 className="font-semibold text-charcoal mb-6">会员等级</h3>
        <div className="grid grid-cols-4 gap-4">
          {memberTiers.map((tier, index) => (
            <motion.div
              key={tier.level}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`p-4 rounded-xl border-2 transition-all cursor-default ${
                currentLevel >= tier.level
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200'
              }`}
            >
              <div className="text-center">
                <motion.div
                  className="text-3xl mb-2"
                  animate={currentLevel === tier.level ? {
                    scale: [1, 1.2, 1],
                  } : {}}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {tier.icon}
                </motion.div>
                <h4 className="font-semibold text-charcoal">{tier.name}</h4>
                <p className="text-xs text-stone mt-1">
                  {tier.min_points === 0 ? '注册即可获得' : `${tier.min_points} 积分`}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 会员权益 */}
      <motion.div
        className="bg-white rounded-xl border border-slate-200 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h3 className="font-semibold text-charcoal mb-6">当前权益</h3>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {currentTier.benefits.map((benefit) => (
            <motion.div
              key={benefit}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -3 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg"
            >
              <motion.div
                className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-blue-600">✓</span>
              </motion.div>
              <span className="text-charcoal">{benefit}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
