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

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className={className}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        {children}
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
