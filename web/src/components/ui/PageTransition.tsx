import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'motion/react'

// 页面切换动画变体
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

// 容器动画变体
const containerVariants: Variants = {
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
}

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

/**
 * 页面切换动画包装器
 * 用于包装页面内容，添加淡入淡出和滑动动画效果
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation()
  const isFirstRender = useRef(true)

  useEffect(() => {
    isFirstRender.current = false
  }, [])

  // 首次渲染不显示动画
  if (isFirstRender.current) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className={className}
        variants={containerVariants}
        initial="exit"
        animate="enter"
        exit="exit"
      >
        <motion.div variants={pageVariants}>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * 页面内容淡入动画组件
 * 用于页面内部内容的渐进式加载
 */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

export default PageTransition
