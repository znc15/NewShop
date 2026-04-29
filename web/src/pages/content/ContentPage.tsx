import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { http } from '@/services'

interface PageData {
  id: number
  slug: string
  title: string
  content: string
  metaTitle: string
  metaDesc: string
  status: number
}

const FALLBACK_PAGES: Record<string, PageData> = {
  guide: {
    id: 0,
    slug: 'guide',
    title: '购物指南',
    content: `欢迎来到 NewShop，以下是推荐的购物流程：

1. 注册或登录账号，完善邮箱与手机号信息。
2. 通过分类、搜索、新品和特惠页浏览商品。
3. 进入商品详情页确认规格后加入购物车。
4. 在购物车中勾选商品、调整数量，再进入结算。
5. 填写收货地址、确认配送方式并完成支付。
6. 在订单页跟踪发货与物流状态，收货后确认订单。`,
    metaTitle: '购物指南 - NewShop',
    metaDesc: '了解 NewShop 的完整购物流程与下单步骤。',
    status: 1,
  },
  shipping: {
    id: 0,
    slug: 'shipping',
    title: '配送说明',
    content: `NewShop 默认提供标准配送与加急配送两种方式。

1. 订单满 99 元可享包邮，不满金额按页面结算运费收取。
2. 标准配送通常 3-5 个工作日送达，部分城市支持更快时效。
3. 下单后请保持手机畅通，便于配送前联系。
4. 如遇偏远地区、极端天气或法定节假日，送达时间可能顺延。`,
    metaTitle: '配送说明 - NewShop',
    metaDesc: '查看 NewShop 的配送时效、范围与运费规则。',
    status: 1,
  },
  returns: {
    id: 0,
    slug: 'returns',
    title: '退换货政策',
    content: `为了保证您的购物体验，我们支持符合条件的退换货申请。

1. 商品签收后 7 天内支持符合规则的退货申请。
2. 因质量问题、错发漏发导致的售后，平台将优先处理。
3. 商品需保持完整包装及配件，特殊品类以页面说明为准。
4. 如需售后，请先通过订单详情或客服渠道提交申请。`,
    metaTitle: '退换货政策 - NewShop',
    metaDesc: '了解 NewShop 的退货、换货与售后处理说明。',
    status: 1,
  },
  story: {
    id: 0,
    slug: 'story',
    title: '品牌故事',
    content: `NewShop 希望把值得拥有的商品，带给每一个认真生活的人。

我们从日常使用场景出发筛选商品，关注品质、价格与服务体验之间的平衡。

从选品、展示到交付，我们都坚持让购物过程更清晰、更可靠，也让每一次购买更接近“恰好适合自己”的体验。`,
    metaTitle: '品牌故事 - NewShop',
    metaDesc: '了解 NewShop 的品牌理念与选品方式。',
    status: 1,
  },
  contact: {
    id: 0,
    slug: 'contact',
    title: '联系我们',
    content: `如果您希望联系 NewShop，可通过以下方式：

客服热线：400-888-8888
客服邮箱：service@newshop.com
商务合作：business@newshop.com

服务时间：周一至周日 9:00 - 21:00

我们会尽快回复您关于商品、订单、配送和售后的问题。`,
    metaTitle: '联系我们 - NewShop',
    metaDesc: '查看 NewShop 客服、商务合作与联系邮箱。',
    status: 1,
  },
  join: {
    id: 0,
    slug: 'join',
    title: '加入我们',
    content: `NewShop 持续寻找热爱产品、设计、技术与服务体验的伙伴。

我们欢迎前端开发、后端开发、产品经理、设计师、运营和客服等方向的人才加入。

如有兴趣，请将简历发送至 hr@newshop.com，并注明意向岗位。`,
    metaTitle: '加入我们 - NewShop',
    metaDesc: '查看 NewShop 招聘与岗位信息。',
    status: 1,
  },
  service: {
    id: 0,
    slug: 'service',
    title: '客户服务',
    content: `NewShop 提供覆盖售前、售中、售后的客户服务支持。

1. 商品咨询：帮助确认规格、库存与适用场景。
2. 订单查询：协助确认支付、发货和物流状态。
3. 售后处理：支持退换货、补发与问题反馈。
4. 账户问题：协助处理登录、密码与地址管理问题。`,
    metaTitle: '客户服务 - NewShop',
    metaDesc: '查看 NewShop 客户服务内容与服务时间。',
    status: 1,
  },
  help: {
    id: 0,
    slug: 'help',
    title: '帮助中心',
    content: `帮助中心为您整理了最常见的问题。

Q：如何修改密码？
A：进入个人中心，发送邮箱验证码后即可更新密码。

Q：如何管理收货地址？
A：进入个人中心的“管理收货地址”即可新增、编辑或设置默认地址。

Q：购物车商品如何结算？
A：勾选商品后点击“去结算”，系统会带入已选商品进入下单流程。`,
    metaTitle: '帮助中心 - NewShop',
    metaDesc: '查看 NewShop 常见问题与使用帮助。',
    status: 1,
  },
  feedback: {
    id: 0,
    slug: 'feedback',
    title: '意见反馈',
    content: `您的反馈会直接帮助我们优化 NewShop 的商品与服务体验。

您可以通过客服热线、服务邮箱或后续开放的在线反馈入口提交建议。

如果是订单、物流或售后问题，请尽量附上订单编号与问题描述，方便我们更快定位。`,
    metaTitle: '意见反馈 - NewShop',
    metaDesc: '向 NewShop 提交产品与服务建议。',
    status: 1,
  },
}

export default function ContentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        setError('页面参数缺失')
        setLoading(false)
        return
      }

      const fallbackPage = FALLBACK_PAGES[slug]
      if (fallbackPage) {
        setPage(fallbackPage)
        setError(null)
        setLoading(false)
        document.title = fallbackPage.metaTitle || `${fallbackPage.title} - NewShop`
        return
      }

      setLoading(true)
      setError(null)
      try {
        const data = await http.get<PageData>(`/pages/${slug}`)
        setPage(data)
        if (data?.metaTitle) {
          document.title = data.metaTitle
        } else if (data?.title) {
          document.title = `${data.title} - NewShop`
        }
      } catch {
        setError('页面不存在或未发布')
      } finally {
        setLoading(false)
      }
    }
    fetchPage()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">{error || '页面不存在'}</p>
        <Link to="/" className="text-blue-500 hover:text-blue-600">
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12"
    >
      <Link
        to="/"
        className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        返回首页
      </Link>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-8"
      >
        {page.title}
      </motion.h1>

      <motion.article
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="prose prose-slate prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: formatContent(page.content) }}
      />
    </motion.div>
  )
}

function formatContent(content: string): string {
  return content
    .split('\n\n')
    .map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`)
    .join('')
}
