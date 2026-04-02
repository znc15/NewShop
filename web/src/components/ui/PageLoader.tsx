import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 配置 NProgress
NProgress.configure({
  showSpinner: false,
  speed: 300,
  minimum: 0.1,
  trickleSpeed: 200,
})

// 自定义样式
const customStyles = `
  #nprogress {
    pointer-events: none;
  }

  #nprogress .bar {
    background: linear-gradient(90deg, #2F5233 0%, #8B5E3C 100%);
    position: fixed;
    z-index: 9999;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
  }

  #nprogress .peg {
    display: block;
    position: absolute;
    right: 0px;
    width: 100px;
    height: 100%;
    box-shadow: 0 0 10px #2F5233, 0 0 5px #8B5E3C;
    opacity: 1;
    transform: rotate(3deg) translate(0px, -4px);
  }
`

// 将自定义样式注入到页面
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.id = 'nprogress-custom-styles'
  styleElement.textContent = customStyles
  document.head.appendChild(styleElement)
}

/**
 * 页面加载进度条组件
 * 自动监听路由变化并显示/隐藏进度条
 */
export function PageLoader() {
  const location = useLocation()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // 首次渲染不显示进度条
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // 路由变化时显示进度条
    NProgress.start()

    // 模拟加载完成（实际项目中可以根据数据加载状态来控制）
    const timer = setTimeout(() => {
      NProgress.done()
    }, 300)

    return () => {
      clearTimeout(timer)
      NProgress.done()
    }
  }, [location.pathname])

  return null
}

export default PageLoader
