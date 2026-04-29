import { useState, useMemo } from 'react'
import { cn } from '@/utils'
import { DetailBlockRenderer } from './DetailBlockRenderer'
import type { DetailBlock, ProductAttr, ProductReview } from '@/types'

interface DetailTabsProps {
  blocks: DetailBlock[]
  attrs?: ProductAttr[]
  reviews: ProductReview[]
  reviewsLoading: boolean
  averageRating: string
}

const TAB_ITEMS = [
  { key: 'detail', label: '商品详情' },
  { key: 'specs', label: '规格参数' },
  { key: 'reviews', label: '商品评价' },
] as const

type TabKey = (typeof TAB_ITEMS)[number]['key']

export function DetailTabs({ blocks, attrs, reviews, reviewsLoading, averageRating }: DetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('detail')

  const sortedAttrs = useMemo(
    () => (Array.isArray(attrs) ? [...attrs].sort((a, b) => a.sort - b.sort) : []),
    [attrs],
  )

  return (
    <div>
      {/* Tab 导航栏 */}
      <nav className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="flex">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative px-6 py-3 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'text-blue-600'
                  : 'text-stone hover:text-charcoal',
              )}
            >
              {tab.label}
              {tab.key === 'reviews' && (
                <span className="ml-1.5 text-xs text-stone">({reviews.length})</span>
              )}
              {/* Active 指示器 */}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab 内容区 */}
      <div className="p-6">
        {activeTab === 'detail' && (
          <DetailBlockRenderer blocks={blocks} />
        )}

        {activeTab === 'specs' && (
          sortedAttrs.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  {sortedAttrs.map((attr, index) => (
                    <tr
                      key={attr.id}
                      className={cn(
                        'border-b border-slate-100 last:border-b-0',
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                      )}
                    >
                      <td className="w-1/3 px-4 py-3 font-medium text-charcoal bg-slate-50/80 border-r border-slate-200">
                        {attr.name}
                      </td>
                      <td className="w-2/3 px-4 py-3 text-charcoal/90">
                        {attr.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-stone">
              暂无规格参数
            </div>
          )
        )}

        {activeTab === 'reviews' && (
          reviewsLoading ? (
            <div className="py-10 text-center text-stone">评价加载中...</div>
          ) : reviews.length === 0 ? (
            <div className="py-10 text-center text-stone">
              当前商品暂无评价，欢迎购买后分享体验。
            </div>
          ) : (
            <div>
              {/* 评分摘要 */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                <span className="text-sm text-stone">平均评分</span>
                <span className="text-base font-semibold text-amber-500">{averageRating}</span>
                <span className="text-sm text-stone">({reviews.length} 条)</span>
              </div>

              {/* 评价列表 */}
              <div className="space-y-4">
                {reviews.map((review) => {
                  const safeRating = Math.max(1, Math.min(5, review.rating))

                  return (
                    <article key={review.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-charcoal">{review.author}</p>
                          <p className="text-xs text-stone mt-0.5">{review.handle || '匿名用户'}</p>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500" aria-label={`${safeRating} 星评价`}>
                          {Array.from({ length: 5 }).map((_, starIndex) => (
                            <svg
                              key={`${review.id}-star-${starIndex}`}
                              width="14"
                              height="14"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              style={{ opacity: starIndex < safeRating ? 1 : 0.25 }}
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-charcoal/90 whitespace-pre-line">{review.content}</p>
                    </article>
                  )
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
