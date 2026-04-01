import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { homepageService, productService } from '@/services'
import type { Product } from '@/types'
import type { HomeBanner, HomeReview } from '@/types/home'
import './homepage.css'

const marqueeItems = [
  '100% 正品保障',
  'Gift 官方授权',
  '加固包装发货',
  '绝版代寻服务',
  '车万同好客服',
  '幻想乡正规据点',
]

const fallbackBannerImage = 'https://images.unsplash.com/photo-1542259009477-d625272157b7?q=80&w=1920&auto=format&fit=crop'

function toCurrency(value: number): string {
  return `¥ ${(value / 100).toFixed(0)}`
}

export default function HomePage() {
  const [hotProducts, setHotProducts] = useState<Product[]>([])
  const [banners, setBanners] = useState<HomeBanner[]>([])
  const [reviews, setReviews] = useState<HomeReview[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      setLoading(true)
      try {
        const [productsRes, bannersRes, reviewsRes] = await Promise.all([
          productService.getHotProducts(6),
          homepageService.getBanners(3),
          homepageService.getFeaturedReviews(3),
        ])

        if (!mounted) {
          return
        }

        setHotProducts(productsRes)
        setBanners(bannersRes)
        setReviews(reviewsRes)
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

  const featuredBanners = useMemo(() => banners.slice(0, 3), [banners])

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

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#fbe8ce]">
        <div className="w-10 h-10 rounded-full border-4 border-[#9ab17a] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="fumo-home">
      <canvas id="sakura-canvas" ref={canvasRef} />

      <section className="hero">
        <div
          className="hero-bg"
          style={{
            backgroundImage: `url(${featuredBanners[0]?.image_url || fallbackBannerImage})`,
          }}
        />
        <div className="hero-overlay" />
        <div className="hero-circle" />

        <div className="hero-content reveal visible">
          <div className="hero-eyebrow">Official · Genuine · Gensokyo</div>
          <h1>
            欢迎来到
            <br />
            <em>Fumo 乐园</em>
          </h1>
          <p className="hero-sub">幻想乡少女的现实据点</p>
          <p className="hero-tagline">100% 正版保证，给最可爱的玩偶一个温暖的家</p>
          <div className="hero-actions">
            <Link to="/products" className="btn-primary">
              立即探索 →
            </Link>
            <Link to="/categories" className="btn-outline">
              了解我们
            </Link>
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
            <div className="stat-num">{Math.max(30, hotProducts.length)}<span>+</span></div>
            <div className="stat-label">角色库存</div>
          </div>
        </div>
      </section>

      <div className="marquee-band">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span className="marquee-item" key={`${item}-${index}`}>
              {item} <span style={{ opacity: 0.6, marginLeft: 24 }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      <section className="products-section" id="products">
        <div className="section-header reveal">
          <h2 className="section-title">精选角色商品</h2>
          <p className="section-sub">每一只都经过严格正品验证，安全送达你的手中</p>
        </div>
        <div className="products-grid">
          {hotProducts.map((product) => (
            <article className="product-card reveal" key={product.id}>
              <Link to={`/products/${product.id}`} className="product-img-wrap">
                <img
                  src={product.main_image || (Array.isArray(product.images) ? product.images[0] : '') || fallbackBannerImage}
                  alt={product.name}
                />
              </Link>
              <div className="product-info">
                <div className="product-name">{product.name}</div>
                <div className="product-desc">{product.description || '幻想乡角色正版玩偶，支持快速发货与全程物流追踪。'}</div>
                <div className="product-footer">
                  <div className="product-price">{toCurrency(product.price)}</div>
                  <Link to={`/products/${product.id}`} className="btn-primary" style={{ padding: '0.52rem 1.1rem', fontSize: '0.76rem' }}>
                    立即领养
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="showcase">
        {featuredBanners.map((banner, index) => (
          <div className="showcase-item" key={banner.id}>
            <div className="showcase-bg" style={{ backgroundImage: `url(${banner.image_url || fallbackBannerImage})` }} />
            <div
              className="showcase-overlay"
              style={{
                background:
                  index % 2 === 0
                    ? 'linear-gradient(135deg, rgba(51,64,39,0.88) 0%, rgba(28,36,21,0.4) 100%)'
                    : 'linear-gradient(225deg, rgba(28,36,21,0.88) 0%, rgba(51,64,39,0.4) 100%)',
              }}
            />
            <div className="showcase-content reveal">
              <span>{banner.subtitle || 'Featured'}</span>
              <h2 className="showcase-title">{banner.title}</h2>
              <p>{banner.description}</p>
              <Link to={banner.link || '/products'} className="btn-primary">
                {banner.button_text || '立即查看'}
              </Link>
            </div>
          </div>
        ))}
      </section>

      <section className="process-section" id="process">
        <div className="section-header reveal">
          <h2 className="section-title" style={{ color: '#fff' }}>四步轻松领养</h2>
          <p className="section-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>从下单到入住，全程跟踪，确保每只 Fumo 安全抵达</p>
        </div>
        <div className="process-grid">
          {[
            ['01', '选择角色', '在商品页浏览在库角色，找到心仪少女并加入购物车。'],
            ['02', '确认下单', '填写收货信息并付款，客服在 2 小时内确认订单。'],
            ['03', '专业包装', '采用定制飞机盒 + 厚层泡棉保护，确保全程零损伤。'],
            ['04', '安心签收', '全程物流追踪，签收后发现问题可快速补发。'],
          ].map((item) => (
            <div className="reveal" key={item[0]} style={{ textAlign: 'center' }}>
              <div className="process-num">{item[0]}</div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{item[1]}</div>
              <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13, lineHeight: 1.7 }}>{item[2]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="testimonials-section" id="reviews">
        <div className="section-header reveal">
          <h2 className="section-title">玩偶主人的评价</h2>
          <p className="section-sub">来自真实领养者的心声，每一条评价我们都认真对待</p>
        </div>
        <div className="testimonials-grid">
          {reviews.map((review) => (
            <article className="testi-card reveal" key={review.id}>
              <div style={{ fontSize: 30, color: 'var(--pink-light)' }}>"</div>
              <div style={{ color: 'var(--gold)', marginBottom: 10 }}>{'★'.repeat(Math.min(Math.max(review.rating, 1), 5))}</div>
              <p style={{ lineHeight: 1.8, color: 'var(--text-mid)', minHeight: 88 }}>{review.content}</p>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(154,177,122,0.15)' }}>
                <div style={{ fontWeight: 700 }}>{review.author}</div>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{review.handle}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="about-inner">
          <div className="reveal">
            <h2 className="section-title" style={{ textAlign: 'left' }}>不止是一家店，更是车万人的据点</h2>
            <p className="section-sub" style={{ marginLeft: 0 }}>我们是一群热爱东方 Project 文化的粉丝，致力于让每一位同好买到放心的正版 Fumo。</p>
            <p style={{ marginTop: 14, color: 'var(--text-mid)', lineHeight: 1.9 }}>这里没有盗版，也没有离谱溢价。每一只都来自官方 Gift 或正规渠道，支持售后与代寻服务。</p>
            <div style={{ marginTop: 22 }}>
              <Link to="/products" className="btn-primary">探索商品</Link>
            </div>
          </div>

          <div className="features-grid reveal">
            {[
              ['100% 正版保证', '坚决抵制盗版，所有商品来自官方正规渠道。'],
              ['加固八角包装', '定制飞机盒 + 双层泡棉，运输全程稳妥。'],
              ['绝版代寻服务', '找不到老款可联系客服代寻。'],
              ['同好专属客服', '沟通无障碍，提供一对一服务。'],
              ['当日极速发货', '14:00 前下单，当日打包发货。'],
              ['预约优先渠道', '订阅后第一时间获得新品预约信息。'],
            ].map((feature) => (
              <div className="feature-card" key={feature[0]}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{feature[0]}</div>
                <div style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.7 }}>{feature[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="newsletter-section" id="newsletter">
        <div className="reveal visible">
          <h2 className="section-title" style={{ color: '#fff' }}>第一时间获取新品资讯</h2>
          <p className="section-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>订阅我们的通知，新款到货、限定预约、绝版代寻第一时间推送给你</p>
          <div className="newsletter-form">
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
          <p style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{notice || '不会滥发邮件，仅在有重要新品资讯时通知你'}</p>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div style={{ fontSize: 22, marginBottom: 10, fontWeight: 700 }}>FumoShop</div>
              <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>幻想乡少女的现实据点。100% 正版保障，让每一只 Fumo 都能找到真正爱她的主人。</p>
            </div>
            <div>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>商品分类</div>
              <p><Link to="/products" style={{ color: 'inherit' }}>经典角色</Link></p>
              <p><Link to="/new" style={{ color: 'inherit' }}>新品上架</Link></p>
            </div>
            <div>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>客户服务</div>
              <p><Link to="/page/guide" style={{ color: 'inherit' }}>购买流程</Link></p>
              <p><Link to="/page/shipping" style={{ color: 'inherit' }}>物流追踪</Link></p>
            </div>
            <div>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>关于我们</div>
              <p><Link to="/page/story" style={{ color: 'inherit' }}>品牌故事</Link></p>
              <p><Link to="/page/contact" style={{ color: 'inherit' }}>联系我们</Link></p>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 FumoShop · 幻想乡正规据点 · All Rights Reserved.</span>
            <span>隐私政策 · 服务条款</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
