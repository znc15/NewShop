import { motion } from 'motion/react'

/**
 * 页面加载骨架屏
 * 用于页面懒加载时的占位显示
 */
export function PageSkeleton() {
  return (
    <div className="min-h-[60vh] px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 标题骨架 */}
        <motion.div
          className="h-8 bg-cream-200 rounded-lg w-1/4"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* 内容骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="bg-cream-100 rounded-xl overflow-hidden"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            >
              <div className="aspect-square bg-cream-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-cream-200 rounded w-3/4" />
                <div className="h-3 bg-cream-200 rounded w-1/2" />
                <div className="h-5 bg-cream-200 rounded w-1/3" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 简单的居中加载指示器
 */
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <motion.div
        className={`${sizeMap[size]} border-4 border-cream-200 border-t-forest-600 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  )
}

/**
 * 全屏加载遮罩
 */
export function FullscreenLoader() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cream-100/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <motion.div
          className="w-12 h-12 border-4 border-cream-200 border-t-forest-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.p
          className="text-stone text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          加载中...
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

export default PageSkeleton
