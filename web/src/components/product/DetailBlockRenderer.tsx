import { cn } from '@/utils'
import type { DetailBlock } from '@/types'

interface DetailBlockRendererProps {
  blocks: DetailBlock[]
  className?: string
}

export function DetailBlockRenderer({ blocks, className }: DetailBlockRendererProps) {
  if (blocks.length === 0) {
    return (
      <div className="py-10 text-center text-stone">
        暂无商品详情
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {blocks.map((block) => {
        switch (block.type) {
          case 'text':
            return (
              <div key={block.id}>
                {block.title && (
                  <h3 className="text-base font-medium text-charcoal mb-2">
                    {block.title}
                  </h3>
                )}
                {block.content && (
                  <p className="text-sm leading-7 text-charcoal/90 whitespace-pre-line">
                    {block.content}
                  </p>
                )}
              </div>
            )

          case 'image':
            return block.content ? (
              <img
                key={block.id}
                src={block.content}
                alt={block.alt || '商品详情图'}
                loading="lazy"
                className="w-full rounded-lg border border-slate-200 bg-white object-contain"
              />
            ) : null

          case 'divider':
            return (
              <hr
                key={block.id}
                className="border-t border-slate-200"
              />
            )

          default:
            return null
        }
      })}
    </div>
  )
}
