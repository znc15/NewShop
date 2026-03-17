import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { cn } from '@/utils'

interface ImageGalleryProps {
  images: string[]
  selectedIndex?: number
  onSelect?: (index: number) => void
}

export function ImageGallery({
  images,
  selectedIndex = 0,
  onSelect,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex)
  const [showZoom, setShowZoom] = useState(false)

  // 同步外部 selectedIndex
  useEffect(() => {
    setCurrentIndex(selectedIndex)
  }, [selectedIndex])

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center">
        <span className="text-stone">暂无图片</span>
      </div>
    )
  }

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
    setCurrentIndex(newIndex)
    onSelect?.(newIndex)
  }

  const goToNext = () => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
    setCurrentIndex(newIndex)
    onSelect?.(newIndex)
  }

  return (
    <div className="flex gap-4">
      {/* 缩略图列表 */}
      <div className="flex flex-col gap-2">
        {images.slice(0, 5).map((image, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index)
              onSelect?.(index)
            }}
            className={cn(
              'relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors',
              currentIndex === index
                ? 'border-blue-500'
                : 'border-slate-300 hover:border-slate-400'
            )}
          >
            <img
              src={image}
              alt={`缩略图 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {index === 4 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">
                +{images.length - 5}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* 主图区域 */}
      <div className="flex-1 relative">
        <div
          className="relative aspect-square bg-blue-50 rounded-xl overflow-hidden cursor-zoom-in"
          onClick={() => setShowZoom(true)}
        >
          <img
            src={images[currentIndex]}
            alt={`商品图片 ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />

          {/* 放大图标 */}
          <div className="absolute top-2 right-2 p-2 bg-white/80 rounded-lg">
            <ZoomIn className="w-4 h-4 text-stone" />
          </div>

          {/* 导航按钮 */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToPrevious()
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 rounded-full shadow-md hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToNext()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 rounded-full shadow-md hover:bg-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* 指示器 */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex(index)
                    onSelect?.(index)
                  }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    currentIndex === index
                      ? 'bg-blue-500'
                      : 'bg-slate-200'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 放大查看弹窗 */}
      {showZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setShowZoom(false)}
        >
          <button
            onClick={() => setShowZoom(false)}
            className="absolute top-4 right-4 p-2 text-white hover:text-slate-100"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={images[currentIndex]}
            alt="放大图片"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(index)
                }}
                className={cn(
                  'w-3 h-3 rounded-full transition-colors',
                  currentIndex === index ? 'bg-white' : 'bg-white/40'
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 导入缺失的图标
import { X } from 'lucide-react'

export default ImageGallery
