import { motion, type HTMLMotionProps, type Variants, type Transition, type Easing } from 'motion/react'
import { cn } from '@/utils'

// 动画预设变体
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
}

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 14 },
}

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -14 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 14 },
}

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 14 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -14 },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

export const slideInFromBottom: Variants = {
  initial: { opacity: 0, y: 72 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 72 },
}

// 交错动画变体
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 14 },
}

// 弹性动画变体
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 26,
}

// 缓动函数
export const easeOut: Easing = [0.16, 1, 0.3, 1] as const
export const easeInOut: Easing = [0.65, 0, 0.35, 1] as const

// MotionDiv 组件 - 带预设动画的 div
interface MotionDivProps extends HTMLMotionProps<'div'> {
  animation?: 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideInFromBottom'
  delay?: number
  duration?: number
}

const animationVariants = {
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  slideInFromBottom,
}

export function MotionDiv({
  animation = 'fadeInUp',
  delay = 0,
  duration = 0.4,
  className,
  children,
  ...props
}: MotionDivProps) {
  const variants = animationVariants[animation]

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ duration, delay, ease: easeOut }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// StaggerContainer - 交错动画容器
interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  staggerDelay?: number
}

export function StaggerContainer({
  staggerDelay = 0.1,
  className,
  children,
  ...props
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// StaggerItem - 交错动画子项
export function StaggerItem({
  className,
  children,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      variants={staggerItem}
      transition={{ duration: 0.4, ease: easeOut }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// HoverScale - 悬停缩放效果
interface HoverScaleProps extends HTMLMotionProps<'div'> {
  scale?: number
}

export function HoverScale({
  scale = 1.01,
  className,
  children,
  ...props
}: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// HoverLift - 悬停抬起效果
export function HoverLift({
  className,
  children,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      whileHover={{
        y: -2,
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
      }}
      whileTap={{ y: 0 }}
      transition={springTransition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// AnimatedCard - 带动画的卡片
interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  hoverEffect?: 'scale' | 'lift' | 'glow' | 'none'
}

export function AnimatedCard({
  hoverEffect = 'lift',
  className,
  children,
  ...props
}: AnimatedCardProps) {
  const hoverVariants = {
    scale: { scale: 1.01 },
    lift: { y: -2, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)' },
    glow: { boxShadow: '0 0 30px rgba(184, 115, 51, 0.3)' },
    none: {},
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverVariants[hoverEffect]}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ...springTransition }}
      className={cn('transition-shadow duration-300', className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// AnimatedButton - 带动画的按钮包装器
export function AnimatedButton({
  className,
  children,
  ...props
}: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// AnimatedLink - 带动画的链接包装器
export function AnimatedLink({
  className,
  children,
  ...props
}: HTMLMotionProps<'a'>) {
  return (
    <motion.a
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
      className={className}
      {...props}
    >
      {children}
    </motion.a>
  )
}

// PageTransition - 页面过渡动画
export function PageTransition({
  className,
  children,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.24, ease: easeOut }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Skeleton - 骨架屏加载动画
interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={cn('bg-cream-200 rounded', className)}
    />
  )
}

// NumberCounter - 数字动画
interface NumberCounterProps {
  value: number
  duration?: number
  className?: string
}

export function NumberCounter({ value, duration = 1, className }: NumberCounterProps) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration }}
      >
        {value}
      </motion.span>
    </motion.span>
  )
}

// AnimatedList - 动画列表
interface AnimatedListProps extends HTMLMotionProps<'div'> {
  items: React.ReactNode[]
  itemClassName?: string
}

export function AnimatedList({ items, itemClassName, className, ...props }: AnimatedListProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {items.map((item, index) => (
        <motion.div
          key={index}
          variants={staggerItem}
          transition={{ duration: 0.4, ease: easeOut }}
          className={itemClassName}
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
  )
}

// Ripple - 波纹效果
export function Ripple({
  className,
  children,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      whileTap={{
        backgroundColor: 'rgba(184, 115, 51, 0.1)',
      }}
      transition={{ duration: 0.1 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// SlideIn - 滑入动画
interface SlideInProps extends HTMLMotionProps<'div'> {
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
}

export function SlideIn({
  direction = 'up',
  delay = 0,
  className,
  children,
  ...props
}: SlideInProps) {
  const directionVariants = {
    up: { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } },
    down: { initial: { opacity: 0, y: -30 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: 30 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: -30 }, animate: { opacity: 1, x: 0 } },
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={directionVariants[direction]}
      transition={{ duration: 0.5, delay, ease: easeOut }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// RotateIn - 旋转进入动画
export function RotateIn({
  className,
  children,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -10, scale: 0.9 }}
      animate={{ opacity: 1, rotate: 0, scale: 1 }}
      exit={{ opacity: 0, rotate: 10, scale: 0.9 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// BounceIn - 弹跳进入动画
export function BounceIn({
  className,
  children,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 25,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// TextReveal - 文字揭示动画
export function TextReveal({
  className,
  children,
  ...props
}: HTMLMotionProps<'span'>) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className={className}
      {...props}
    >
      {children}
    </motion.span>
  )
}

// Pulse - 脉冲动画
export function Pulse({
  className,
  children,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export { motion }
