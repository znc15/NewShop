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

const aboutFeatureItems = [
  {
    title: '100% 正版保证',
    desc: '坚决抵制盗版，所有商品均采购自 Gift 等官方正规渠道，提供防伪验证。',
    iconPath:
      'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z',
  },
  {
    title: '加固八角包装',
    desc: '定制飞机盒 + 双层泡棉缓冲，确保玩偶和吊牌在运输中完美无损。',
    iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    title: '绝版代寻服务',
    desc: '找不到心仪的老款？联系客服，我们利用全球渠道为你圆梦，合理定价。',
    iconPath: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  },
  {
    title: '同好专属客服',
    desc: '客服皆为车万同好，沟通无障碍，售前售后提供最贴心的一对一服务。',
    iconPath: 'M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z',
  },
  {
    title: '当日极速发货',
    desc: '14:00 前下单，当日打包发货，全程物流追踪，一般 2-3 日到达。',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  },
  {
    title: '预约优先渠道',
    desc: '订阅新品通知，新款开放预约时第一时间收到消息，锁定优先购买名额。',
    iconPath: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  },
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

export default function HomePage() {
  const [hotProducts, setHotProducts] = useState<Product[]>([])
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
    const primaryProducts = hotProducts.slice(0, 6)
    if (primaryProducts.length >= 6) {
      return primaryProducts
    }

    const selectedIds = new Set(primaryProducts.map((product) => product.id))
    const fallbackProducts = fallbackHotProducts
      .filter((product) => !selectedIds.has(product.id))
      .slice(0, 6 - primaryProducts.length)

    return [...primaryProducts, ...fallbackProducts]
  }, [hotProducts])
  const featuredBanners = useMemo(() => {
    const displayBanners = banners.length > 0 ? banners : fallbackShowcaseBanners
    return displayBanners.slice(0, 3)
  }, [banners])
  const displayReviews = useMemo(() => (reviews.length > 0 ? reviews : fallbackReviews), [reviews])
  const homeDisplayConfig = useMemo(() => resolveHomeDisplayConfig(publicConfigs), [publicConfigs])
  const resolvedHeroBackgroundImage =
    homeDisplayConfig.heroBackgroundImage || featuredBanners[0]?.image_url || fallbackBannerImage
  const homeStyleVars = useMemo(
    () =>
      ({
        '--hero-container-max': `${homeDisplayConfig.layoutMaxWidth}px`,
      }) as CSSProperties,
    [homeDisplayConfig.layoutMaxWidth]
  )

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
          <div>
            <div className="stat-num">500<span>+</span></div>
            <div className="stat-label">已领养玩偶</div>
          </div>
          <div>
            <div className="stat-num">98<span>%</span></div>
            <div className="stat-label">好评率</div>
          </div>
          <div>
            <div className="stat-num">{Math.max(30, displayHotProducts.length)}<span>+</span></div>
            <div className="stat-label">角色库存</div>
          </div>
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
          <div className="section-eyebrow">New Arrivals</div>
          <h2 className="section-title">精选角色商品</h2>
          <p className="section-sub">每一只都经过严格正品验证，安全送达你的手中</p>
        </div>
        <div className="products-grid">
          {displayHotProducts.map((product, index) => {
            const badgeMeta = resolveBadgeMeta(product)
            const characterLabel = resolveCharacterLabel(product)
            const revealDelayClass = index % 3 === 0 ? 'reveal-delay-1' : index % 3 === 1 ? 'reveal-delay-2' : 'reveal-delay-3'
            const isLiked = Boolean(likedProductIds[product.id])
            const actionText = badgeMeta?.text.includes('预约') ? '预约领养' : '立即领养'

            return (
            <article className={`product-card reveal ${revealDelayClass}`} key={product.id}>
              <Link to={`/products/${product.id}`} className="product-img-wrap">
                <img
                  src={product.main_image || (Array.isArray(product.images) ? product.images[0] : '') || fallbackBannerImage}
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
            查看全部 30+ 款角色 →
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
            <div className="section-eyebrow" style={{ justifyContent: 'flex-start' }}>Our Story</div>
            <h2>
              不止是一家店，<br />
              更是<em>车万人的据点</em>
            </h2>
            <div className="about-divider" />
            <p>我们是一群极度热爱东方 Project 文化的狂热粉丝。成立 <strong>FumoShop</strong> 的初衷非常简单：我们深知在圈内以合理价格购买到正版 Fumo 玩偶的艰难。</p>
            <p>这里没有鱼龙混杂的盗版，也没有高昂离谱的溢价。我们承诺店内每一只 Fumo 都来自官方 <strong>Gift</strong> 或正规授权渠道。</p>
            <p>把最可爱的幻想乡少女带回家，给她们一个温暖的居所，这就是我们的终极使命。</p>
            <div style={{ marginTop: 22 }}>
              <a href="#products" className="btn-primary">探索商品</a>
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
              {submitting ? '提交中...' : '订阅通知'}
            </button>
          </div>
          <p className="newsletter-notice reveal">{notice || '不会滥发邮件，仅在有重要新品资讯时通知你 · 随时可退订'}</p>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <span className="footer-brand-logo">
                Fumo<span>Shop</span>
              </span>
              <p className="footer-about">幻想乡少女的现实据点。100% 正版保障，让每一只 Fumo 都能找到真正爱她的主人。</p>
              <div className="footer-socials">
                <a href="#" className="social-btn" title="微博" aria-label="微博">
                  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M9.31 13.53c-2.227 0-4.02 1.43-4.02 3.2 0 1.76 1.793 3.19 4.02 3.19 2.226 0 4.02-1.43 4.02-3.19 0-1.77-1.794-3.2-4.02-3.2zm0 5.04c-1.106 0-2-.84-2-1.84s.894-1.83 2-1.83c1.105 0 2 .83 2 1.83s-.895 1.84-2 1.84z" /><path d="M20.065 10.02c.097-.32.15-.65.15-.99C20.215 6.79 18.2 5 15.75 5c-1.695 0-3.17.85-3.99 2.13-.67-.19-1.38-.3-2.12-.3C5.87 6.83 2.5 9.72 2.5 13.27c0 3.55 3.37 6.44 7.14 6.44 3.768 0 6.81-2.89 6.81-6.44 0-.51-.07-1-.19-1.47.42-.08.83-.18 1.23-.32.82-.27 1.58-.67 2.18-1.19.6-.52 1.07-1.17 1.35-1.91l.05-.16-.01-.18zM9.64 18.58c-3.05 0-5.52-2.34-5.52-5.23 0-2.88 2.47-5.23 5.52-5.23.68 0 1.33.13 1.93.36-.05.26-.08.52-.08.79 0 2.75 2.52 4.98 5.62 4.98.13 0 .26-.01.39-.02-.79 2.37-3.1 4.35-7.86 4.35z" /></svg>
                </a>
                <a href="#" className="social-btn" title="Twitter" aria-label="Twitter">
                  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a href="#" className="social-btn" title="Discord" aria-label="Discord">
                  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
                </a>
                <a href="#" className="social-btn" title="哔哩哔哩" aria-label="哔哩哔哩">
                  <svg fill="currentColor" viewBox="0 0 24 24"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z" /></svg>
                </a>
              </div>
            </div>
            <div>
              <div className="footer-col-title">商品分类</div>
              <ul className="footer-links">
                <li><a href="#">经典角色</a></li>
                <li><a href="#">新品上架</a></li>
                <li><a href="#">限定款式</a></li>
                <li><a href="#">预约专区</a></li>
                <li><a href="#">绝版代寻</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">客户服务</div>
              <ul className="footer-links">
                <li><a href="#">购买流程</a></li>
                <li><a href="#">包装说明</a></li>
                <li><a href="#">物流追踪</a></li>
                <li><a href="#">售后政策</a></li>
                <li><a href="#">联系客服</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">关于我们</div>
              <ul className="footer-links">
                <li><a href="#">品牌故事</a></li>
                <li><a href="#">正品鉴别</a></li>
                <li><a href="#">合作伙伴</a></li>
                <li><a href="#">加入我们</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 FumoShop · 幻想乡正规据点 · All Rights Reserved.</span>
            <div className="footer-bottom-right">
              <a href="#">隐私政策</a>
              <a href="#">服务条款</a>
              <a href="#">Cookie 设置</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
