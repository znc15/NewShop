import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, type Variants } from 'motion/react'
import { Spinner } from '@/components/ui/Loading'
import type { PointRecord } from '@/types'

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
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
}

const numberVariants: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.3 },
  },
}

const calendarDayVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
}

export default function PointsPage() {
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState(0)
  const [_records, _setRecords] = useState<PointRecord[]>([])
  const [checkedIn, setCheckedIn] = useState(false)
  const [streakDays, setStreakDays] = useState(0)
  const [isCheckingIn, setIsCheckingIn] = useState(false)

  useEffect(() => {
    // 模拟数据
    setPoints(1580)
    setStreakDays(3)
    setLoading(false)
  }, [])

  const handleCheckIn = async () => {
    if (checkedIn || isCheckingIn) return

    setIsCheckingIn(true)
    // 模拟签到
    setTimeout(() => {
      setPoints(prev => prev + 10)
      setStreakDays(prev => prev + 1)
      setCheckedIn(true)
      setIsCheckingIn(false)
    }, 1000)
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
        <span className="text-charcoal font-medium">积分中心</span>
      </motion.div>

      <motion.div
        className="bg-gradient-to-r from-blue-600 to-slate-800 rounded-xl p-8 mb-8 text-white overflow-hidden relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="absolute right-10 top-1/2 -translate-y-1/2 w-40 h-40 bg-white/10 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
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
            积分中心
          </motion.h1>
          <motion.p
            className="text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            签到领积分，兑换好礼
          </motion.p>
        </div>
      </motion.div>

      {/* 积分概览 */}
      <motion.div
        className="grid grid-cols-3 gap-4 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl border border-slate-200 p-6 text-center overflow-hidden relative"
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 rounded-full"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="relative z-10">
            <p className="text-sm text-stone mb-1">当前积分</p>
            <motion.p
              className="text-3xl font-bold text-blue-700"
              key={points}
              variants={numberVariants}
              initial="initial"
              animate="animate"
            >
              {points}
            </motion.p>
          </div>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl border border-slate-200 p-6 text-center overflow-hidden relative"
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute -right-10 -top-10 w-32 h-32 bg-blue-50 rounded-full"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
          />
          <div className="relative z-10">
            <p className="text-sm text-stone mb-1">连续签到</p>
            <motion.p
              className="text-3xl font-bold text-blue-600"
              key={streakDays}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3 }}
            >
              {streakDays}天
            </motion.p>
          </div>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl border border-slate-200 p-6 text-center overflow-hidden relative"
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative z-10">
            <p className="text-sm text-stone mb-1">今日签到</p>
            <p className="text-sm">
              {checkedIn ? (
                <motion.span
                  className="text-blue-600"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  已签到
                </motion.span>
              ) : (
                <motion.button
                  onClick={handleCheckIn}
                  disabled={checkedIn || isCheckingIn}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isCheckingIn ? '签到中...' : '签到 +10'}
                </motion.button>
              )
              }
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* 签到日历 */}
      <motion.div
        className="bg-white rounded-xl border border-slate-200 p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h3 className="font-semibold text-charcoal mb-4">签到日历</h3>
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              variants={calendarDayVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className={`aspect-square rounded-lg flex items-center justify-center cursor-default ${
                i < streakDays
                  ? 'bg-blue-100 text-blue-600'
                  : i === streakDays && !checkedIn
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-blue-50 text-stone'
              }`}
            >
              <span className="text-sm">第{i + 1}天</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 积分记录 */}
      <motion.div
        className="bg-white rounded-xl border border-slate-200 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h3 className="font-semibold text-charcoal mb-4">积分记录</h3>
        {_records.length === 0 ? (
          <motion.div
            className="text-center py-8 text-stone"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p>暂无积分记录</p>
            <p className="text-sm">签到或消费可获得积分</p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {_records.map((record) => (
              <motion.div
                key={record.id}
                variants={itemVariants}
                whileHover={{ x: 5 }}
                className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    record.points > 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                  }`}>
                    <span className="text-lg">{record.points > 0 ? '+' : '-'}</span>
                  </div>
                  <div>
                    <p className="font-medium text-charcoal">{record.remark || '积分变动'}</p>
                    <p className="text-xs text-stone">{new Date(record.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                </div>
                <span className={`font-semibold ${record.points > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {record.points > 0 ? '+' : ''}{record.points}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )
        }
      </motion.div>
    </div>
  )
}
