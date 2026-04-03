import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { homepageService, productService } from '@/services'
import { resolveHomeDisplayConfig } from '@/lib/homeConfig'
import configService from '@/services/config'
import type { Product } from '@/types'
import type { HomeBanner, HomeReview } from '@/types/home'
import './homepage.css'

const fallbackBannerImage = 'https://images.unsplash.com/photo-1542259009477-d625272157b7?q=80&w=1920&auto=format&fit=crop'

const fallbackHotProducts: Product[] = [
  {
    id: 9001,
    name: '博丽灵梦 Fumo 玩偶',
    description: '幻想乡的无节操巫女，红白相间的经典装扮。柔软手感，呆萌眼神，是最受欢迎的镇宅之宝。',
    detail: null,
    price: 36800,
    original_price: 39800,
    main_image: 'https://images.unsplash.com/photo-1556012018-50c5c0da73bf?q=80&w=800&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1556012018-50c5c0da73bf?q=80&w=800&auto=format&fit=crop'],
    category_id: 0,
    brand_id: null,
    skus: [],
    attrs: [
      { id: 1, product_id: 9001, name: '角色标签', value: 'Reimu · 红白巫女', sort: 0 },
      { id: 2, product_id: 9001, name: '首页徽章', value: '热销', sort: 1 },
    ],
    status: 'active',
    stock: 500,
    sales: 200,
    is_hot: true,
    is_sale: false,
    sort: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: 9002,
    name: '雾雨魔理沙 Fumo 玩偶',
    description: '普通的黑白魔法使！带着标志性的大帽子和星星道具，DA☆ZE 的元气系最强代表。',
    detail: null,
    price: 36800,
    original_price: 39800,
    main_image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop'],
    category_id: 0,
    brand_id: null,
    skus: [],
    attrs: [
      { id: 3, product_id: 9002, name: '角色标签', value: 'Marisa · 黑白魔法使', sort: 0 },
      { id: 4, product_id: 9002, name: '首页徽章', value: '新货', sort: 1 },
    ],
    status: 'active',
    stock: 420,
    sales: 160,
    is_hot: false,
    is_sale: false,
    sort: 1,
    created_at: '',
    updated_at: '',
  },
  {
    id: 9003,
    name: '琪露诺 Fumo 玩偶',
    description: '完美的算数⑨号！虽然有点笨笨的，但她永远自信满满，是幻想乡里最有魅力的妖精。',
    detail: null,
    price: 39800,
    original_price: 42800,
    main_image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?q=80&w=800&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1584992236310-6edddc08acff?q=80&w=800&auto=format&fit=crop'],
    category_id: 0,
    brand_id: null,
    skus: [],
    attrs: [
      { id: 5, product_id: 9003, name: '角色标签', value: 'Cirno · 最强冰妖精', sort: 0 },
      { id: 6, product_id: 9003, name: '首页徽章', value: '限量', sort: 1 },
    ],
    status: 'active',
    stock: 300,
    sales: 140,
    is_hot: false,
    is_sale: false,
    sort: 2,
    created_at: '',
    updated_at: '',
  },
  {
    id: 9004,
    name: '十六夜咲夜 Fumo 玩偶',
    description: '红魔馆的完美女仆，时间停止能力的持有者。银发银眼，时刻散发着优雅与从容气质。',
    detail: null,
    price: 36800,
    original_price: 39800,
    main_image: 'https://images.unsplash.com/photo-1618666012174-83b441c0bc76?q=80&w=800&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1618666012174-83b441c0bc76?q=80&w=800&auto=format&fit=crop'],
    category_id: 0,
    brand_id: null,
    skus: [],
    attrs: [{ id: 7, product_id: 9004, name: '角色标签', value: 'Sakuya · 完美女仆', sort: 0 }],
    status: 'active',
    stock: 280,
    sales: 120,
    is_hot: false,
    is_sale: false,
    sort: 3,
    created_at: '',
    updated_at: '',
  },
  {
    id: 9005,
    name: '古明地觉 Fumo 玩偶',
    description: '地灵殿的神秘读心少女，拥有第三只眼。传说她能看穿一切心思。',
    detail: null,
    price: 42800,
    original_price: 45800,
    main_image: 'https://images.unsplash.com/photo-1607513746994-51f730a44832?q=80&w=800&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1607513746994-51f730a44832?q=80&w=800&auto=format&fit=crop'],
    category_id: 0,
    brand_id: null,
    skus: [],
    attrs: [
      { id: 8, product_id: 9005, name: '角色标签', value: 'Satori · 读心少女', sort: 0 },
      { id: 9, product_id: 9005, name: '首页徽章', value: '新货', sort: 1 },
    ],
    status: 'active',
    stock: 220,
    sales: 96,
    is_hot: false,
    is_sale: false,
    sort: 4,
    created_at: '',
    updated_at: '',
  },
  {
    id: 9006,
    name: '东风谷早苗 Fumo 玩偶',
    description: '守矢神社的现人神与风祝，元气满满的外来人。绿色飘带在风中飞舞。',
    detail: null,
    price: 39800,
    original_price: 42800,
    main_image: 'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?q=80&w=800&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1518049362265-d5b2a6467637?q=80&w=800&auto=format&fit=crop'],
    category_id: 0,
    brand_id: null,
    skus: [],
    attrs: [
      { id: 10, product_id: 9006, name: '角色标签', value: 'Sanae · 现人神', sort: 0 },
      { id: 11, product_id: 9006, name: '首页徽章', value: '预约中', sort: 1 },
    ],
    status: 'active',
    stock: 200,
    sales: 80,
    is_hot: false,
    is_sale: false,
    sort: 5,
    created_at: '',
    updated_at: '',
  },
]

const fallbackShowcaseBanners: HomeBanner[] = [
  {
    id: 7001,
    title: '博丽灵梦\n红白经典款',
    subtitle: 'Bestseller ✦ 灵梦系列',
    description: '幻想乡的无节操巫女，以博丽神社为据点，保护幻想乡的和平。她的 Fumo 玩偶是所有系列中销售最稳定的一款。',
    image_url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1920&auto=format&fit=crop',
    link: '/products',
    button_text: '立即领养',
    sort: 0,
    status: 'active',
  },
  {
    id: 7002,
    title: '雾雨魔理沙\n黑白经典款',
    subtitle: 'New Arrival ✦ 魔理沙系列',
    description: '普通的黑白魔法使，个性鲜明，战斗力爆表。最新一批正品现货已到仓，抢购前请提前锁定名额。',
    image_url: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?q=80&w=1920&auto=format&fit=crop',
    link: '/products',
    button_text: '立即领养',
    sort: 1,
    status: 'active',
  },
  {
    id: 7003,
    title: '琪露诺\n最强冰妖精',
    subtitle: 'Limited ✦ 琪露诺系列',
    description: '最强、最笨、最可爱的冰之妖精现已在库，数量有限，错过再等一年。',
    image_url: 'https://images.unsplash.com/photo-1578469645760-b8ba6b42b260?q=80&w=1920&auto=format&fit=crop',
    link: '/products',
    button_text: '立即预约',
    sort: 2,
    status: 'active',
  },
]

const fallbackReviews: HomeReview[] = [
  {
    id: 8001,
    author: '凛华💮',
    handle: '@rinkaaa · 已领养：灵梦 · 魔理沙',
    avatar: '',
    content: '终于收到梦寐以求的灵梦 Fumo 了！包装超级严实，吊牌完好无损。客服也很懂车万，沟通体验非常好。',
    rating: 5,
    sort: 0,
    status: 'active',
  },
  {
    id: 8002,
    author: '苍波 Aoba',
    handle: '@aobawave · 已领养：绮罗人（代寻）',
    avatar: '',
    content: '托代寻服务找到了绝版款，价格透明，进度同步很及时。开箱那一刻真的很感动。',
    rating: 5,
    sort: 1,
    status: 'active',
  },
  {
    id: 8003,
    author: '冰见千夏',
    handle: '@chinatsu_ice · 已领养：琪露诺 · 灵梦 · 咲夜',
    avatar: '',
    content: '第三次回购了！这次限定款发货很快，包装依旧稳，玩偶和吊牌状态都非常完美。',
    rating: 5,
    sort: 2,
    status: 'active',
  },
]

function toCurrency(value: number): string {
  return `¥ ${(value / 100).toFixed(0)}`
}

const showcaseStartPrices = ['368', '368', '398']

const ABOUT_FEATURE_ICON_PATHS = [
  'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z',
  'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  'M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z',
  'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
]

function getAuthorInitial(author: string): string {
  const normalized = author.trim()
  if (!normalized) {
    return '匿'
  }

  return normalized[0]
}

function getProductAttrValue(product: Product, keys: string[]): string {
  if (!Array.isArray(product.attrs)) {
    return ''
  }

  const normalizedKeys = keys.map((key) => key.toLowerCase())
  const match = product.attrs.find((attr) => normalizedKeys.includes(attr.name.trim().toLowerCase()))
  return match?.value?.trim() || ''
}

function resolveCharacterLabel(product: Product): string {
  const attrCharacterLabel = getProductAttrValue(product, ['角色标签', '角色', 'character_label', 'character'])
  if (attrCharacterLabel) {
    return attrCharacterLabel
  }

  const brandName = product.brand?.name?.trim() || ''
  const categoryName = product.category?.name?.trim() || ''

  if (brandName && categoryName) {
    return `${brandName} · ${categoryName}`
  }

  return brandName || categoryName || '幻想乡角色'
}

function resolveBadgeMeta(product: Product): { className: 'badge-hot' | 'badge-new' | 'badge-limited'; text: string } | null {
  const attrBadge = getProductAttrValue(product, ['首页徽章', '徽章', 'badge_label', 'badge'])
  const fallbackBadge = product.is_hot ? '热销' : product.is_sale ? '特惠' : ''
  const badgeText = attrBadge || fallbackBadge

  if (!badgeText) {
    return null
  }

  const lowerBadgeText = badgeText.toLowerCase()
  if (badgeText.includes('热') || lowerBadgeText.includes('hot')) {
    return { className: 'badge-hot', text: badgeText }
  }

  if (badgeText.includes('限') || badgeText.includes('预约') || lowerBadgeText.includes('limit') || lowerBadgeText.includes('pre')) {
    return { className: 'badge-limited', text: badgeText }
  }

  return { className: 'badge-new', text: badgeText }
}

function splitHeroStatValue(value: string): { main: string; suffix: string } {
  const normalized = value.trim()
  if (!normalized) {
    return { main: '', suffix: '' }
  }

  const match = normalized.match(/^(.+?)([+%])$/)
  if (!match) {
    return { main: normalized, suffix: '' }
  }

  return {
    main: match[1],
    suffix: match[2],
  }
}

export default function HomePage() {
  const [hotProducts, setHotProducts] = useState<Product[]>([])
  const [configuredProducts, setConfiguredProducts] = useState<Product[]>([])
  const [banners, setBanners] = useState<HomeBanner[]>([])
  const [reviews, setReviews] = useState<HomeReview[]>([])
  const [publicConfigs, setPublicConfigs] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [likedProductIds, setLikedProductIds] = useState<Record<number, boolean>>({})
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      setLoading(true)
      try {
        const [productsRes, bannersRes, reviewsRes, publicConfigRes] = await Promise.allSettled([
          productService.getHotProducts(6),
          homepageService.getBanners(3),
          homepageService.getFeaturedReviews(3),
          configService.getPublicConfigs().catch(() => ({})),
        ])

        if (!mounted) {
          return
        }

        setHotProducts(productsRes.status === 'fulfilled' ? productsRes.value : [])
        setBanners(bannersRes.status === 'fulfilled' ? bannersRes.value : [])
        setReviews(reviewsRes.status === 'fulfilled' ? reviewsRes.value : [])
        setPublicConfigs(publicConfigRes.status === 'fulfilled' ? publicConfigRes.value : {})
      } catch (error) {
        console.error('获取首页数据失败:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.12 }
    )

    document.querySelectorAll('.fumo-home .reveal').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [loading])

  const homeDisplayConfig = useMemo(() => resolveHomeDisplayConfig(publicConfigs), [publicConfigs])
  const aboutFeatureItems = useMemo(
    () =>
      homeDisplayConfig.aboutFeatures.map((feature, index) => ({
        ...feature,
        iconPath: ABOUT_FEATURE_ICON_PATHS[index % ABOUT_FEATURE_ICON_PATHS.length],
      })),
    [homeDisplayConfig.aboutFeatures]
  )

  useEffect(() => {
    let active = true

    const fetchConfiguredProducts = async () => {
      const targetProductIds = homeDisplayConfig.productsDisplayIds.slice(0, 12)

      if (targetProductIds.length === 0) {
        setConfiguredProducts([])
        return
      }

      try {
        const result = await Promise.allSettled(targetProductIds.map((productId) => productService.getProduct(productId)))
        if (!active) {
          return
        }

        const nextConfiguredProducts = result
          .filter((item): item is PromiseFulfilledResult<Product> => item.status === 'fulfilled')
          .map((item) => item.value)

        setConfiguredProducts(nextConfiguredProducts)
      } catch (error) {
        if (active) {
          console.error('获取首页配置商品失败:', error)
          setConfiguredProducts([])
        }
      }
    }

    void fetchConfiguredProducts()

    return () => {
      active = false
    }
  }, [homeDisplayConfig.productsDisplayIds])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    type Particle = {
      x: number
      y: number
      size: number
      speed: number
      wind: number
      rotation: number
      rotSpeed: number
      alpha: number
      color: string
      reset: () => void
      update: () => void
      draw: () => void
    }

    const particles: Particle[] = []
    const particleCount = 36
    let rafId = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createParticle = (): Particle => {
      const particle = {
        x: 0,
        y: 0,
        size: 0,
        speed: 0,
        wind: 0,
        rotation: 0,
        rotSpeed: 0,
        alpha: 0,
        color: '',
        reset() {
          this.x = Math.random() * canvas.width
          this.y = Math.random() * -canvas.height
          this.size = Math.random() * 6 + 4
          this.speed = Math.random() * 1.5 + 0.4
          this.wind = Math.random() * 1 - 0.5
          this.rotation = Math.random() * Math.PI * 2
          this.rotSpeed = (Math.random() - 0.5) * 0.04
          this.alpha = Math.random() * 0.5 + 0.2
          const hue = Math.random() > 0.5 ? 85 : 70
          const sat = Math.random() * 20 + 40
          const lit = Math.random() * 20 + 60
          this.color = `hsla(${hue},${sat}%,${lit}%,${this.alpha})`
        },
        update() {
          this.y += this.speed
          this.x += this.wind + Math.sin(this.y * 0.02) * 0.4
          this.rotation += this.rotSpeed
          if (this.y > canvas.height + 10) {
            this.reset()
          }
        },
        draw() {
          ctx.save()
          ctx.translate(this.x, this.y)
          ctx.rotate(this.rotation)
          ctx.fillStyle = this.color
          ctx.beginPath()
          ctx.ellipse(0, 0, this.size, this.size * 0.55, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        },
      }
      particle.reset()
      return particle
    }

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((particle) => {
        particle.update()
        particle.draw()
      })
      rafId = requestAnimationFrame(loop)
    }

    resize()
    for (let i = 0; i < particleCount; i += 1) {
      const particle = createParticle()
      particle.y = Math.random() * canvas.height
      particles.push(particle)
    }

    window.addEventListener('resize', resize)
    loop()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const displayHotProducts = useMemo(() => {
    if (homeDisplayConfig.productsDisplayIds.length > 0 && configuredProducts.length > 0) {
      return configuredProducts
    }

    const primaryProducts = hotProducts.slice(0, 6)
    if (primaryProducts.length >= 6) {
      return primaryProducts
    }

    const selectedIds = new Set(primaryProducts.map((product) => product.id))
    const fallbackProducts = fallbackHotProducts
      .filter((product) => !selectedIds.has(product.id))
      .slice(0, 6 - primaryProducts.length)

    return [...primaryProducts, ...fallbackProducts]
  }, [configuredProducts, homeDisplayConfig.productsDisplayIds.length, hotProducts])
  const featuredBanners = useMemo(() => {
    const displayBanners = banners.length > 0 ? banners : fallbackShowcaseBanners
    return displayBanners.slice(0, 3)
  }, [banners])
  const displayReviews = useMemo(() => (reviews.length > 0 ? reviews : fallbackReviews), [reviews])
  const resolvedHeroBackgroundImage =
    homeDisplayConfig.heroBackgroundImage || featuredBanners[0]?.image_url || fallbackBannerImage
  const homeStyleVars = useMemo(
    () =>
      ({
        '--hero-container-max': `${homeDisplayConfig.layoutMaxWidth}px`,
      }) as CSSProperties,
    [homeDisplayConfig.layoutMaxWidth]
  )
  const heroStats = [
    {
      value: homeDisplayConfig.heroStatAdoptedValue,
      label: homeDisplayConfig.heroStatAdoptedLabel,
    },
    {
      value: homeDisplayConfig.heroStatRatingValue,
      label: homeDisplayConfig.heroStatRatingLabel,
    },
    {
      value: homeDisplayConfig.heroStatStockValue,
      label: homeDisplayConfig.heroStatStockLabel,
    },
  ]

  const onSubscribe = async () => {
    if (!email.includes('@')) {
      setNotice('请输入有效的邮箱地址')
      return
    }

    setSubmitting(true)
    setNotice('')
    try {
      const res = await homepageService.subscribe(email)
      if (res.already) {
        setNotice('你已订阅过，我们会继续为你推送新品消息')
      } else {
        setNotice('订阅成功，感谢关注！')
      }
      setEmail('')
    } catch (error) {
      console.error('订阅失败:', error)
      setNotice('订阅失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  const onToggleFavourite = (productId: number) => {
    setLikedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#fbe8ce]">
        <div className="w-10 h-10 rounded-[12px] border-4 border-[#9ab17a] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="fumo-home" style={homeStyleVars}>
      <canvas id="sakura-canvas" ref={canvasRef} />

      <section className="hero">
        <div
          className="hero-bg"
          style={{
            backgroundImage: `url(${resolvedHeroBackgroundImage})`,
          }}
        />
        <div className="hero-overlay" />
        <div className="hero-circle" />

        <div className="hero-content reveal visible">
          <div className="hero-eyebrow">{homeDisplayConfig.heroEyebrow}</div>
          <h1>
            {homeDisplayConfig.heroTitleLine1}
            <br />
            <em>{homeDisplayConfig.heroTitleEmphasis}</em>
          </h1>
          <p className="hero-sub">{homeDisplayConfig.heroSub}</p>
          <p className="hero-tagline">{homeDisplayConfig.heroTagline}</p>
          <div className="hero-actions">
            <a href="#products" className="btn-primary">
              立即探索 →
            </a>
            <a href="#about" className="btn-outline">
              了解我们
            </a>
          </div>
        </div>

        <div className="hero-stats">
          {heroStats.map((item, index) => {
            const { main, suffix } = splitHeroStatValue(item.value)

            return (
              <div key={`${item.label}-${index}`}>
                <div className="stat-num">
                  {main}
                  {suffix && <span>{suffix}</span>}
                </div>
                <div className="stat-label">{item.label}</div>
              </div>
            )
          })}
        </div>

        <div className="hero-scroll-hint" aria-hidden="true">
          <div className="scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      <div className="marquee-band">
        <div className="marquee-track">
          {[...homeDisplayConfig.marqueeItems, ...homeDisplayConfig.marqueeItems].map((item, index) => (
            <span className="marquee-item" key={`${item}-${index}`}>
              {item} <span style={{ opacity: 0.6, marginLeft: 24 }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      <section className="products-section" id="products">
        <div className="section-header reveal">
          <div className="section-eyebrow">{homeDisplayConfig.productsSectionEyebrow}</div>
          <h2 className="section-title">{homeDisplayConfig.productsSectionTitle}</h2>
          <p className="section-sub">{homeDisplayConfig.productsSectionSub}</p>
        </div>
        <div className="products-grid">
          {displayHotProducts.map((product, index) => {
            const badgeMeta = resolveBadgeMeta(product)
            const characterLabel = resolveCharacterLabel(product)
            const revealDelayClass = index % 3 === 0 ? 'reveal-delay-1' : index % 3 === 1 ? 'reveal-delay-2' : 'reveal-delay-3'
            const isLiked = Boolean(likedProductIds[product.id])
            const actionText = badgeMeta?.text.includes('预约') ? '预约领养' : '立即领养'
            const configuredImage = homeDisplayConfig.productsImageOverrides[index] || ''

            return (
            <article className={`product-card reveal ${revealDelayClass}`} key={product.id}>
              <Link to={`/products/${product.id}`} className="product-img-wrap">
                <img
                  src={configuredImage || product.main_image || (Array.isArray(product.images) ? product.images[0] : '') || fallbackBannerImage}
                  alt={product.name}
                />
                {badgeMeta && <span className={`product-badge ${badgeMeta.className}`}>{badgeMeta.text}</span>}
              </Link>
              <button
                type="button"
                className="product-fav"
                onClick={() => onToggleFavourite(product.id)}
                aria-label={isLiked ? '取消收藏商品' : '收藏商品'}
              >
                <svg
                  fill={isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z"
                  />
                </svg>
              </button>
              <div className="product-info">
                <div className="product-char">{characterLabel}</div>
                <div className="product-name">{product.name}</div>
                <div className="product-desc">{product.description || '幻想乡角色正版玩偶，支持快速发货与全程物流追踪。'}</div>
                <div className="product-footer">
                  <div className="product-price">
                    {toCurrency(product.price)} <small>含税</small>
                  </div>
                  <Link to={`/products/${product.id}`} className="btn-adopt">
                    {actionText}
                  </Link>
                </div>
              </div>
            </article>
            )
          })}
        </div>

        <div className="products-more reveal">
          <Link to="/products" className="btn-primary">
            {homeDisplayConfig.productsMoreButtonText}
          </Link>
        </div>
      </section>

      <section id="showcase">
        {featuredBanners.map((banner, index) => {
          const resolvedShowcaseBackgroundImage =
            homeDisplayConfig.showcaseBackgroundImages[index] ||
            banner.image_url ||
            fallbackShowcaseBanners[index % fallbackShowcaseBanners.length]?.image_url ||
            fallbackBannerImage

          return (
            <div className="showcase-item" key={banner.id}>
              <div className="showcase-bg" style={{ backgroundImage: `url(${resolvedShowcaseBackgroundImage})` }} />
              <div
                className="showcase-overlay"
                style={{
                  background:
                    index % 2 === 0
                      ? homeDisplayConfig.showcaseOverlayOdd
                      : homeDisplayConfig.showcaseOverlayEven,
                }}
              />
              <div className="showcase-content reveal">
                <span className="showcase-tag">{banner.subtitle || 'Featured'}</span>
                <h2 className="showcase-title">{banner.title}</h2>
                <p className="showcase-desc">{banner.description}</p>
                <div className="showcase-price-tag">
                  <span className="price-from">起售价</span>
                  <span className="price-val">¥{showcaseStartPrices[index % showcaseStartPrices.length]}</span>
                  <span className="price-unit">/ 只</span>
                </div>
                <Link to={banner.link || '/products'} className="btn-primary">
                  {banner.button_text || '立即查看'}
                </Link>
              </div>
            </div>
          )
        })}
      </section>

      <section className="process-section" id="process">
        <div className="process-bg-decor" />
        <div className="section-header reveal" style={{ position: 'relative', zIndex: 2 }}>
          <div className="section-eyebrow">How It Works</div>
          <h2 className="section-title" style={{ color: '#fff' }}>四步轻松领养</h2>
          <p className="section-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>从下单到入住，全程跟踪，确保每只 Fumo 安全抵达</p>
        </div>
        <div className="process-grid" style={{ position: 'relative' }}>
          <div className="process-connector" />
          {[
            ['01', '选择角色', '在商品页浏览在库角色，找到心仪少女并加入购物车。'],
            ['02', '确认下单', '填写收货信息并付款，客服在 2 小时内确认订单。'],
            ['03', '专业包装', '采用定制飞机盒 + 厚层泡棉保护，确保全程零损伤。'],
            ['04', '安心签收', '全程物流追踪，签收后发现问题可快速补发。'],
          ].map((item, index) => (
            <div
              className={`process-card reveal ${index === 1 ? 'reveal-delay-1' : index === 2 ? 'reveal-delay-2' : index === 3 ? 'reveal-delay-3' : ''}`}
              key={item[0]}
            >
              <div className="process-num">{item[0]}</div>
              <div className="process-name">{item[1]}</div>
              <div className="process-text">{item[2]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="testimonials-section" id="reviews">
        <div className="section-header reveal">
          <div className="section-eyebrow">Customer Reviews</div>
          <h2 className="section-title">玩偶主人的评价</h2>
          <p className="section-sub">来自真实领养者的心声，每一条评价我们都认真对待</p>
        </div>
        <div className="testimonials-grid">
          {displayReviews.map((review, index) => {
            const revealDelayClass = index === 1 ? 'reveal-delay-1' : index === 2 ? 'reveal-delay-2' : ''
            const safeRating = Math.min(Math.max(review.rating, 1), 5)

            return (
            <article className={`testi-card reveal ${revealDelayClass}`} key={review.id}>
              <div className="testi-quote">"</div>
              <div className="testi-stars" aria-label={`${safeRating} 星评价`}>
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <svg
                    key={`${review.id}-star-${starIndex}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    style={{ opacity: starIndex < safeRating ? 1 : 0.35 }}
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="testi-text">{review.content}</p>
              <div className="testi-author">
                <div className="testi-avatar">
                  {review.avatar ? (
                    <img src={review.avatar} alt={review.author} />
                  ) : (
                    getAuthorInitial(review.author)
                  )}
                </div>
                <div>
                  <div className="testi-name">{review.author}</div>
                  <div className="testi-handle">{review.handle}</div>
                </div>
              </div>
            </article>
            )
          })}
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="about-inner">
          <div className="about-text reveal">
            <div className="section-eyebrow" style={{ justifyContent: 'flex-start' }}>{homeDisplayConfig.aboutSectionEyebrow}</div>
            <h2>
              {homeDisplayConfig.aboutTitleLine1}<br />
              <em>{homeDisplayConfig.aboutTitleEmphasis}</em>
            </h2>
            <div className="about-divider" />
            <p>{homeDisplayConfig.aboutParagraph1}</p>
            <p>{homeDisplayConfig.aboutParagraph2}</p>
            <p>{homeDisplayConfig.aboutParagraph3}</p>
            <div style={{ marginTop: 22 }}>
              <a href="#products" className="btn-primary">{homeDisplayConfig.aboutButtonText}</a>
            </div>
          </div>

          <div className="features-grid reveal reveal-delay-1">
            {aboutFeatureItems.map((feature) => (
              <div className="feature-card" key={feature.title}>
                <div className="feature-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feature.iconPath} />
                  </svg>
                </div>
                <div className="feature-title">{feature.title}</div>
                <div className="feature-desc">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="newsletter-section" id="newsletter">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="newsletter-eyebrow reveal">Stay Updated</div>
          <h2 className="newsletter-title reveal">第一时间获取新品资讯</h2>
          <p className="newsletter-sub reveal">订阅我们的通知，新款到货、限定预约、绝版代寻第一时间推送给你</p>
          <div className="newsletter-form reveal">
            <input
              type="email"
              className="newsletter-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="输入你的邮箱地址…"
            />
            <button className="btn-primary" onClick={onSubscribe} disabled={submitting}>
              {submitting ? '提交中...' : '登陆关注'}
            </button>
          </div>
          <p className="newsletter-notice reveal">{notice || '不会滥发邮件，仅在有重要新品资讯时通知你 · 随时可退订'}</p>
        </div>
      </section>
    </div>
  )
}
