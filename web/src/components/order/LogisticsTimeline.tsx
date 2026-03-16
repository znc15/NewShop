import { motion } from 'framer-motion'
import type { OrderLogistics, LogisticsTrace } from '@/types/logistics'

// 物流状态颜色映射
const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-cream-200', text: 'text-charcoal', dot: 'bg-copper-500' },
  shipped: { bg: 'bg-forest-100', text: 'text-forest-700', dot: 'bg-forest-500' },
  transit: { bg: 'bg-forest-100', text: 'text-forest-700', dot: 'bg-forest-500' },
  delivered: { bg: 'bg-forest-200', text: 'text-forest-800', dot: 'bg-forest-600' },
  exception: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}

// 物流状态标签
const statusLabels: Record<string, string> = {
  pending: '待发货',
  shipped: '已发货',
  transit: '运输中',
  delivered: '已签收',
  exception: '异常',
}

interface LogisticsTimelineProps {
  logistics: OrderLogistics
  className?: string
}

// 单条轨迹动画变体
const traceVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  }),
}

// 格式化时间
function formatTime(timeStr: string): string {
  const date = new Date(timeStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

// 轨迹项组件
function TraceItem({
  trace,
  index,
  isLast,
  isFirst,
}: {
  trace: LogisticsTrace
  index: number
  isLast: boolean
  isFirst: boolean
}) {
  const colors = statusColors[trace.status] || statusColors.transit

  return (
    <motion.div
      custom={index}
      variants={traceVariants}
      initial="hidden"
      animate="visible"
      className="relative flex gap-4"
    >
      {/* 时间线 */}
      <div className="flex flex-col items-center">
        {/* 状态点 */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 + 0.1, type: 'spring', stiffness: 300 }}
          className={`relative z-10 w-3 h-3 rounded-full ${colors.dot} ${
            isFirst ? 'ring-4 ring-copper/20' : ''
          }`}
        >
          {/* 最新状态脉冲动画 */}
          {isFirst && (
            <span className="absolute inset-0 rounded-full animate-ping bg-copper/40" />
          )}
        </motion.div>

        {/* 连接线 */}
        {!isLast && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
            className="w-0.5 flex-1 bg-forest-200 mt-1"
          />
        )}
      </div>

      {/* 内容区 */}
      <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
            {statusLabels[trace.status] || trace.status}
          </span>
          <span className="text-xs text-gray-400">{formatTime(trace.time)}</span>
        </div>
        <p className="text-sm text-charcoal">{trace.description}</p>
        {trace.location && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {trace.location}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// 物流时间线组件
export function LogisticsTimeline({ logistics, className = '' }: LogisticsTimelineProps) {
  const { company, tracking_no, status, traces } = logistics
  const currentStatus = statusColors[status] || statusColors.transit

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-cream-50 rounded-lg p-4 ${className}`}
    >
      {/* 物流头部信息 */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-forest-100">
        <div className="flex items-center gap-3">
          {/* 物流图标 */}
          <div className={`w-10 h-10 rounded-lg ${currentStatus.bg} flex items-center justify-center`}>
            <svg
              className={`w-5 h-5 ${currentStatus.text}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-charcoal">{company.name}</p>
            <p className="text-xs text-gray-500">运单号: {tracking_no}</p>
          </div>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${currentStatus.bg} ${currentStatus.text}`}>
          {statusLabels[status] || status}
        </span>
      </div>

      {/* 物流轨迹 */}
      {traces.length > 0 ? (
        <div className="pl-2">
          {traces.map((trace, index) => (
            <TraceItem
              key={trace.id}
              trace={trace}
              index={index}
              isFirst={index === 0}
              isLast={index === traces.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-2 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-sm">暂无物流信息</p>
        </div>
      )}

      {/* 查看更多 */}
      {company.website && (
        <motion.a
          href={`${company.website}?track=${tracking_no}`}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ x: 4 }}
          className="mt-4 pt-4 border-t border-forest-100 flex items-center justify-between text-sm text-copper hover:text-copper-600 transition-colors"
        >
          <span>前往官网查看详细物流</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.a>
      )}
    </motion.div>
  )
}

export default LogisticsTimeline
