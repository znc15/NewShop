import { useState } from 'react'
import type { DetailBlock } from '@/types'
import { Button } from '@/components/ui/Button'

// 生成唯一 id
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface DetailBlockEditorProps {
  value: DetailBlock[]
  onChange: (blocks: DetailBlock[]) => void
}

// 文本区块编辑器
function TextBlockEdit({
  block,
  onChange,
}: {
  block: DetailBlock
  onChange: (updated: DetailBlock) => void
}) {
  return (
    <div className="space-y-2 pl-2">
      <div>
        <label className="block text-xs text-stone mb-1">标题（可选）</label>
        <input
          type="text"
          value={block.title || ''}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="输入区块标题"
          className="w-full px-3 py-1.5 text-sm border border-cream-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-xs text-stone mb-1">内容</label>
        <textarea
          value={block.content || ''}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
          placeholder="输入文本内容"
          className="w-full px-3 py-1.5 text-sm border border-cream-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
          rows={4}
        />
      </div>
    </div>
  )
}

// 图片区块编辑器
function ImageBlockEdit({
  block,
  onChange,
}: {
  block: DetailBlock
  onChange: (updated: DetailBlock) => void
}) {
  return (
    <div className="space-y-2 pl-2">
      <div>
        <label className="block text-xs text-stone mb-1">图片 URL</label>
        <input
          type="text"
          value={block.content || ''}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
          placeholder="输入图片地址"
          className="w-full px-3 py-1.5 text-sm border border-cream-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-xs text-stone mb-1">替代文本（alt）</label>
        <input
          type="text"
          value={block.alt || ''}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
          placeholder="输入图片描述"
          className="w-full px-3 py-1.5 text-sm border border-cream-300 rounded-md focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
      </div>
      {block.content && (
        <div className="mt-2">
          <img
            src={block.content}
            alt={block.alt || '预览'}
            className="max-w-full max-h-40 rounded border border-cream-200 object-contain"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      )}
    </div>
  )
}

// 区块预览文字
function getBlockPreview(block: DetailBlock): string {
  switch (block.type) {
    case 'text':
      if (block.title) return block.title
      if (block.content) {
        const text = block.content.replace(/\n/g, ' ')
        return text.length > 40 ? text.slice(0, 40) + '...' : text
      }
      return '空文本区块'
    case 'image':
      if (block.content) return block.alt || block.content
      return '空图片区块'
    case 'divider':
      return '分割线'
    default:
      return '未知区块'
  }
}

// 区块类型图标
function BlockTypeIcon({ type }: { type: DetailBlock['type'] }) {
  switch (type) {
    case 'text':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-forest-600 shrink-0">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </svg>
      )
    case 'image':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 shrink-0">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      )
    case 'divider':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone shrink-0">
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      )
    default:
      return null
  }
}

export function DetailBlockEditor({ value, onChange }: DetailBlockEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const addBlock = (type: DetailBlock['type']) => {
    const newBlock: DetailBlock = {
      id: generateId(),
      type,
      ...(type === 'text' ? { title: '', content: '' } : {}),
      ...(type === 'image' ? { content: '', alt: '' } : {}),
    }
    onChange([...value, newBlock])
    setExpandedId(newBlock.id)
  }

  const removeBlock = (id: string) => {
    onChange(value.filter((b) => b.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= value.length) return
    const newBlocks = [...value]
    const temp = newBlocks[index]
    newBlocks[index] = newBlocks[targetIndex]
    newBlocks[targetIndex] = temp
    onChange(newBlocks)
  }

  const updateBlock = (updated: DetailBlock) => {
    onChange(value.map((b) => (b.id === updated.id ? updated : b)))
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="space-y-3">
      {/* 区块列表 */}
      {value.length === 0 && (
        <div className="text-center py-6 text-sm text-stone">
          暂无区块，点击下方按钮添加
        </div>
      )}

      {value.map((block, index) => (
        <div key={block.id} className="border border-cream-200 rounded-lg overflow-hidden">
          {/* 区块头部 - 始终可见 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white">
            <BlockTypeIcon type={block.type} />
            <button
              type="button"
              onClick={() => toggleExpand(block.id)}
              className="flex-1 text-left text-sm text-charcoal truncate hover:text-forest-600 transition-colors"
            >
              {getBlockPreview(block)}
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => moveBlock(index, 'up')}
                disabled={index === 0}
                className="p-1 text-stone hover:text-charcoal hover:bg-cream-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="上移"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveBlock(index, 'down')}
                disabled={index === value.length - 1}
                className="p-1 text-stone hover:text-charcoal hover:bg-cream-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="下移"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="p-1 text-stone hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="删除"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>

          {/* 展开编辑区域 */}
          {expandedId === block.id && block.type !== 'divider' && (
            <div className="px-3 py-3 bg-cream-50 border-t border-cream-200">
              {block.type === 'text' && (
                <TextBlockEdit block={block} onChange={updateBlock} />
              )}
              {block.type === 'image' && (
                <ImageBlockEdit block={block} onChange={updateBlock} />
              )}
            </div>
          )}

          {/* 分割线视觉预览 */}
          {block.type === 'divider' && (
            <div className="px-3 py-2 bg-cream-50 border-t border-cream-200">
              <hr className="border-cream-300" />
            </div>
          )}
        </div>
      ))}

      {/* 添加按钮组 */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock('text')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
          </svg>
          添加文本区块
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock('image')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          添加图片区块
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock('divider')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
          添加分割线
        </Button>
      </div>
    </div>
  )
}
