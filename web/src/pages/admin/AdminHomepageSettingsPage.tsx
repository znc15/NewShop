import { useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, LayoutTemplate, ListOrdered, Tag, Type } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DEFAULT_HOME_DISPLAY_CONFIG, HOME_CONFIG_KEYS } from '@/lib/homeConfig'
import adminService from '@/services/admin'
import type { AdminConfigItem, AdminConfigPayload } from '@/types/admin'
import { getApiErrorMessage } from '@/utils'

const CONFIG_CATEGORY = 'homepage'
const LAYOUT_WIDTH_KEY = HOME_CONFIG_KEYS.layoutMaxWidth
const SHOWCASE_BACKGROUND_IMAGES_KEY = HOME_CONFIG_KEYS.showcaseBackgroundImages

const STRING_FIELDS = [
  {
    key: HOME_CONFIG_KEYS.brandText,
    label: '导航品牌文字',
    description: '顶部导航左侧品牌文字。未配置 Logo 时会显示该文本。',
    placeholder: '例如：NewShop',
    icon: Type,
  },
  {
    key: HOME_CONFIG_KEYS.brandLogo,
    label: '导航品牌 Logo URL',
    description: '填写后优先显示 Logo 图片；留空时自动回退为品牌文字。',
    placeholder: 'https://example.com/logo.png',
    icon: ImageIcon,
  },
  {
    key: HOME_CONFIG_KEYS.heroEyebrow,
    label: '首屏眉标',
    description: '主标题上方的小字描述。',
    placeholder: '例如：Official · Genuine · Gensokyo',
    icon: Tag,
  },
  {
    key: HOME_CONFIG_KEYS.heroTitleLine1,
    label: '首屏标题第一行',
    description: '主标题第一行文案。',
    placeholder: '例如：欢迎来到',
    icon: LayoutTemplate,
  },
  {
    key: HOME_CONFIG_KEYS.heroTitleEmphasis,
    label: '首屏强调标题',
    description: '主标题第二行强调文案（高亮部分）。',
    placeholder: '例如：Fumo 乐园',
    icon: LayoutTemplate,
  },
  {
    key: HOME_CONFIG_KEYS.heroSub,
    label: '首屏副标题',
    description: '主标题下方副标题。',
    placeholder: '例如：幻想乡少女的现实据点',
    icon: Type,
  },
  {
    key: HOME_CONFIG_KEYS.heroTagline,
    label: '首屏标语',
    description: '副标题下方说明文案。',
    placeholder: '例如：100% 正版保证，给最可爱的玩偶一个温暖的家',
    icon: Type,
  },
  {
    key: HOME_CONFIG_KEYS.heroBackgroundImage,
    label: '首屏背景图 URL',
    description: '填写后会优先使用该背景图；留空时回退为接口返回或默认背景图。',
    placeholder: 'https://example.com/hero.jpg',
    icon: ImageIcon,
  },
  {
    key: HOME_CONFIG_KEYS.layoutMaxWidth,
    label: '首页容器最大宽度（px）',
    description: '控制顶部导航与首屏内容的统一宽度基准。建议范围 960 - 2560。',
    placeholder: '例如：1780',
    icon: LayoutTemplate,
  },
  {
    key: HOME_CONFIG_KEYS.showcaseOverlayOdd,
    label: '展示区遮罩（奇数卡片）',
    description: '用于第 1/3/5... 个展示区卡片的遮罩渐变 CSS 值。',
    placeholder: '例如：linear-gradient(135deg, rgba(51,64,39,0.88) 0%, rgba(28,36,21,0.4) 100%)',
    icon: Tag,
  },
  {
    key: HOME_CONFIG_KEYS.showcaseOverlayEven,
    label: '展示区遮罩（偶数卡片）',
    description: '用于第 2/4/6... 个展示区卡片的遮罩渐变 CSS 值。',
    placeholder: '例如：linear-gradient(225deg, rgba(28,36,21,0.88) 0%, rgba(51,64,39,0.4) 100%)',
    icon: Tag,
  },
] as const

const MARQUEE_KEY = HOME_CONFIG_KEYS.marqueeItems

type StringFieldKey = (typeof STRING_FIELDS)[number]['key']
type ArrayFieldKey = typeof MARQUEE_KEY | typeof SHOWCASE_BACKGROUND_IMAGES_KEY
type HomeFormKey = StringFieldKey | ArrayFieldKey
type HomeFormState = Record<HomeFormKey, string>

const INITIAL_FORM: HomeFormState = {
  [HOME_CONFIG_KEYS.brandText]: DEFAULT_HOME_DISPLAY_CONFIG.brandText,
  [HOME_CONFIG_KEYS.brandLogo]: DEFAULT_HOME_DISPLAY_CONFIG.brandLogo,
  [HOME_CONFIG_KEYS.heroEyebrow]: DEFAULT_HOME_DISPLAY_CONFIG.heroEyebrow,
  [HOME_CONFIG_KEYS.heroTitleLine1]: DEFAULT_HOME_DISPLAY_CONFIG.heroTitleLine1,
  [HOME_CONFIG_KEYS.heroTitleEmphasis]: DEFAULT_HOME_DISPLAY_CONFIG.heroTitleEmphasis,
  [HOME_CONFIG_KEYS.heroSub]: DEFAULT_HOME_DISPLAY_CONFIG.heroSub,
  [HOME_CONFIG_KEYS.heroTagline]: DEFAULT_HOME_DISPLAY_CONFIG.heroTagline,
  [HOME_CONFIG_KEYS.heroBackgroundImage]: DEFAULT_HOME_DISPLAY_CONFIG.heroBackgroundImage,
  [HOME_CONFIG_KEYS.layoutMaxWidth]: String(DEFAULT_HOME_DISPLAY_CONFIG.layoutMaxWidth),
  [SHOWCASE_BACKGROUND_IMAGES_KEY]: DEFAULT_HOME_DISPLAY_CONFIG.showcaseBackgroundImages.join('\n'),
  [HOME_CONFIG_KEYS.showcaseOverlayOdd]: DEFAULT_HOME_DISPLAY_CONFIG.showcaseOverlayOdd,
  [HOME_CONFIG_KEYS.showcaseOverlayEven]: DEFAULT_HOME_DISPLAY_CONFIG.showcaseOverlayEven,
  [MARQUEE_KEY]: DEFAULT_HOME_DISPLAY_CONFIG.marqueeItems.join('\n'),
}

const FIELD_DESCRIPTIONS: Record<HomeFormKey, string> = {
  [HOME_CONFIG_KEYS.brandText]: '导航品牌文字',
  [HOME_CONFIG_KEYS.brandLogo]: '导航品牌 Logo URL',
  [HOME_CONFIG_KEYS.heroEyebrow]: '首屏眉标',
  [HOME_CONFIG_KEYS.heroTitleLine1]: '首屏标题第一行',
  [HOME_CONFIG_KEYS.heroTitleEmphasis]: '首屏强调标题',
  [HOME_CONFIG_KEYS.heroSub]: '首屏副标题',
  [HOME_CONFIG_KEYS.heroTagline]: '首屏标语',
  [HOME_CONFIG_KEYS.heroBackgroundImage]: '首屏背景图 URL',
  [HOME_CONFIG_KEYS.layoutMaxWidth]: '首页容器最大宽度',
  [SHOWCASE_BACKGROUND_IMAGES_KEY]: '展示区背景图列表',
  [HOME_CONFIG_KEYS.showcaseOverlayOdd]: '展示区遮罩（奇数卡片）',
  [HOME_CONFIG_KEYS.showcaseOverlayEven]: '展示区遮罩（偶数卡片）',
  [MARQUEE_KEY]: '首页滚动文案',
}

function parseStringConfig(value: string): string {
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'string' ? parsed : ''
  } catch {
    return ''
  }
}

function parseArrayConfig(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  } catch {
    return []
  }
}

function parseNumberConfig(value: string): number | null {
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
      return parsed
    }

    if (typeof parsed === 'string') {
      const parsedNumber = Number(parsed)
      return Number.isFinite(parsedNumber) ? parsedNumber : null
    }

    return null
  } catch {
    return null
  }
}

function normalizeMarqueeItems(text: string): string[] {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeBackgroundImages(text: string): string[] {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function AdminHomepageSettingsPage() {
  const [form, setForm] = useState<HomeFormState>(INITIAL_FORM)
  const [configs, setConfigs] = useState<Record<string, AdminConfigItem>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchConfigs = async () => {
      setLoading(true)
      try {
        const data = await adminService.getConfigs(CONFIG_CATEGORY)
        const configMap = data.reduce<Record<string, AdminConfigItem>>((acc, item) => {
          acc[item.key] = item
          return acc
        }, {})

        setConfigs(configMap)

        const nextForm: HomeFormState = {
          ...INITIAL_FORM,
          [HOME_CONFIG_KEYS.brandText]: parseStringConfig(configMap[HOME_CONFIG_KEYS.brandText]?.value ?? '') || DEFAULT_HOME_DISPLAY_CONFIG.brandText,
          [HOME_CONFIG_KEYS.brandLogo]: parseStringConfig(configMap[HOME_CONFIG_KEYS.brandLogo]?.value ?? ''),
          [HOME_CONFIG_KEYS.heroEyebrow]: parseStringConfig(configMap[HOME_CONFIG_KEYS.heroEyebrow]?.value ?? '') || DEFAULT_HOME_DISPLAY_CONFIG.heroEyebrow,
          [HOME_CONFIG_KEYS.heroTitleLine1]: parseStringConfig(configMap[HOME_CONFIG_KEYS.heroTitleLine1]?.value ?? '') || DEFAULT_HOME_DISPLAY_CONFIG.heroTitleLine1,
          [HOME_CONFIG_KEYS.heroTitleEmphasis]: parseStringConfig(configMap[HOME_CONFIG_KEYS.heroTitleEmphasis]?.value ?? '') || DEFAULT_HOME_DISPLAY_CONFIG.heroTitleEmphasis,
          [HOME_CONFIG_KEYS.heroSub]: parseStringConfig(configMap[HOME_CONFIG_KEYS.heroSub]?.value ?? '') || DEFAULT_HOME_DISPLAY_CONFIG.heroSub,
          [HOME_CONFIG_KEYS.heroTagline]: parseStringConfig(configMap[HOME_CONFIG_KEYS.heroTagline]?.value ?? '') || DEFAULT_HOME_DISPLAY_CONFIG.heroTagline,
          [HOME_CONFIG_KEYS.heroBackgroundImage]: parseStringConfig(configMap[HOME_CONFIG_KEYS.heroBackgroundImage]?.value ?? ''),
          [HOME_CONFIG_KEYS.layoutMaxWidth]: String(
            parseNumberConfig(configMap[HOME_CONFIG_KEYS.layoutMaxWidth]?.value ?? '') ?? DEFAULT_HOME_DISPLAY_CONFIG.layoutMaxWidth
          ),
          [SHOWCASE_BACKGROUND_IMAGES_KEY]: (parseArrayConfig(configMap[SHOWCASE_BACKGROUND_IMAGES_KEY]?.value ?? '').length > 0
            ? parseArrayConfig(configMap[SHOWCASE_BACKGROUND_IMAGES_KEY]?.value ?? '')
            : [...DEFAULT_HOME_DISPLAY_CONFIG.showcaseBackgroundImages]).join('\n'),
          [HOME_CONFIG_KEYS.showcaseOverlayOdd]: parseStringConfig(configMap[HOME_CONFIG_KEYS.showcaseOverlayOdd]?.value ?? '') || DEFAULT_HOME_DISPLAY_CONFIG.showcaseOverlayOdd,
          [HOME_CONFIG_KEYS.showcaseOverlayEven]: parseStringConfig(configMap[HOME_CONFIG_KEYS.showcaseOverlayEven]?.value ?? '') || DEFAULT_HOME_DISPLAY_CONFIG.showcaseOverlayEven,
          [MARQUEE_KEY]: (parseArrayConfig(configMap[MARQUEE_KEY]?.value ?? '').length > 0
            ? parseArrayConfig(configMap[MARQUEE_KEY]?.value ?? '')
            : [...DEFAULT_HOME_DISPLAY_CONFIG.marqueeItems]).join('\n'),
        }

        setForm(nextForm)
      } catch (error) {
        console.error('获取首页配置失败:', error)
        alert(getApiErrorMessage(error, '获取首页配置失败，请稍后重试'))
      } finally {
        setLoading(false)
      }
    }

    void fetchConfigs()
  }, [])

  const completionRate = useMemo(() => {
    const basicCount = STRING_FIELDS.filter((field) => form[field.key].trim()).length
    const marqueeReady = normalizeMarqueeItems(form[MARQUEE_KEY]).length > 0 ? 1 : 0
    const showcaseBgReady = normalizeBackgroundImages(form[SHOWCASE_BACKGROUND_IMAGES_KEY]).length > 0 ? 1 : 0
    const total = STRING_FIELDS.length + 2
    return Math.round(((basicCount + marqueeReady + showcaseBgReady) / total) * 100)
  }, [form])

  const handleChange = (key: HomeFormKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const buildFieldPayload = (key: StringFieldKey): AdminConfigPayload => {
    if (key === LAYOUT_WIDTH_KEY) {
      const widthValue = Number(form[key].trim())
      return {
        key,
        value: JSON.stringify(Math.round(widthValue)),
        type: 'number',
        category: CONFIG_CATEGORY,
        description: configs[key]?.description || FIELD_DESCRIPTIONS[key],
        is_public: true,
      }
    }

    return {
      key,
      value: JSON.stringify(form[key].trim()),
      type: 'string',
      category: CONFIG_CATEGORY,
      description: configs[key]?.description || FIELD_DESCRIPTIONS[key],
      is_public: true,
    }
  }

  const buildArrayPayload = (key: ArrayFieldKey, items: string[]): AdminConfigPayload => ({
    key,
    value: JSON.stringify(items),
    type: 'array',
    category: CONFIG_CATEGORY,
    description: configs[key]?.description || FIELD_DESCRIPTIONS[key],
    is_public: true,
  })

  const handleSave = async () => {
    const brandText = form[HOME_CONFIG_KEYS.brandText].trim()
    const brandLogo = form[HOME_CONFIG_KEYS.brandLogo].trim()
    const marqueeItems = normalizeMarqueeItems(form[MARQUEE_KEY])
    const showcaseBackgroundImages = normalizeBackgroundImages(form[SHOWCASE_BACKGROUND_IMAGES_KEY])
    const layoutMaxWidth = Number(form[LAYOUT_WIDTH_KEY].trim())

    if (!brandText && !brandLogo) {
      alert('请至少填写品牌文字或 Logo URL 其中一项')
      return
    }

    if (marqueeItems.length === 0) {
      alert('请至少填写一条滚动文案')
      return
    }

    if (!Number.isFinite(layoutMaxWidth) || layoutMaxWidth < 960 || layoutMaxWidth > 2560) {
      alert('首页容器最大宽度必须是 960 - 2560 之间的数字')
      return
    }

    setSaving(true)
    try {
      await Promise.all([
        ...STRING_FIELDS.map((field) => adminService.upsertConfig(buildFieldPayload(field.key))),
        adminService.upsertConfig(buildArrayPayload(MARQUEE_KEY, marqueeItems)),
        adminService.upsertConfig(buildArrayPayload(SHOWCASE_BACKGROUND_IMAGES_KEY, showcaseBackgroundImages)),
      ])

      const latest = await adminService.getConfigs(CONFIG_CATEGORY)
      const configMap = latest.reduce<Record<string, AdminConfigItem>>((acc, item) => {
        acc[item.key] = item
        return acc
      }, {})
      setConfigs(configMap)
      setForm((prev) => ({
        ...prev,
        [MARQUEE_KEY]: marqueeItems.join('\n'),
        [SHOWCASE_BACKGROUND_IMAGES_KEY]: showcaseBackgroundImages.join('\n'),
      }))
      alert('首页配置保存成功')
    } catch (error) {
      console.error('保存首页配置失败:', error)
      alert(getApiErrorMessage(error, '保存首页配置失败，请稍后重试'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-charcoal">首页设置</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone">
            统一配置导航品牌展示、首屏主视觉文案、背景图、容器宽度与展示区遮罩效果，保存后前台首页会自动读取最新配置。
          </p>
        </div>
        <div className="min-w-[220px] rounded-2xl border border-cream-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between text-sm text-stone">
            <span>配置完整度</span>
            <span className="font-medium text-charcoal">{completionRate}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-cream-100">
            <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_320px]">
        <section className="space-y-4">
          {STRING_FIELDS.map((field) => {
            const Icon = field.icon
            return (
              <div key={field.key} className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-charcoal">{field.label}</h3>
                      <p className="mt-1 text-sm text-stone">{field.description}</p>
                    </div>
                    <Input
                      value={form[field.key]}
                      onChange={(event) => handleChange(field.key, event.target.value)}
                      type={field.key === LAYOUT_WIDTH_KEY ? 'number' : 'text'}
                      min={field.key === LAYOUT_WIDTH_KEY ? 960 : undefined}
                      max={field.key === LAYOUT_WIDTH_KEY ? 2560 : undefined}
                      placeholder={field.placeholder}
                    />
                  </div>
                </div>
              </div>
            )
          })}

          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-xl bg-blue-50 p-3 text-blue-600">
                <ListOrdered className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-charcoal">滚动条文案</h3>
                  <p className="mt-1 text-sm text-stone">每行一条，前台会自动循环滚动展示。</p>
                </div>
                <textarea
                  value={form[MARQUEE_KEY]}
                  onChange={(event) => handleChange(MARQUEE_KEY, event.target.value)}
                  rows={7}
                  className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={'例如：\n100% 正品保障\nGift 官方授权\n加固包装发货'}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-xl bg-blue-50 p-3 text-blue-600">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-charcoal">展示区背景图列表</h3>
                  <p className="mt-1 text-sm text-stone">每行一条 URL，按顺序对应展示区第 1、2、3... 张背景图。留空会继续使用接口返回的图片。</p>
                </div>
                <textarea
                  value={form[SHOWCASE_BACKGROUND_IMAGES_KEY]}
                  onChange={(event) => handleChange(SHOWCASE_BACKGROUND_IMAGES_KEY, event.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={'例如：\nhttps://example.com/showcase-1.jpg\nhttps://example.com/showcase-2.jpg\nhttps://example.com/showcase-3.jpg'}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-charcoal">导航品牌预览</h3>
            <div className="mt-4 rounded-xl border border-cream-200 bg-slate-50 p-4">
              {form[HOME_CONFIG_KEYS.brandLogo].trim() ? (
                <img
                  src={form[HOME_CONFIG_KEYS.brandLogo].trim()}
                  alt={form[HOME_CONFIG_KEYS.brandText].trim() || DEFAULT_HOME_DISPLAY_CONFIG.brandText}
                  className="h-8 w-auto max-w-[180px] object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <p className="font-display text-2xl font-semibold text-charcoal">
                  {form[HOME_CONFIG_KEYS.brandText].trim() || DEFAULT_HOME_DISPLAY_CONFIG.brandText}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-charcoal">首屏文案预览</h3>
            <div className="mt-4 rounded-xl border border-cream-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-stone">
                {form[HOME_CONFIG_KEYS.heroEyebrow] || DEFAULT_HOME_DISPLAY_CONFIG.heroEyebrow}
              </p>
              <p className="mt-3 text-2xl font-black leading-tight text-charcoal">
                {form[HOME_CONFIG_KEYS.heroTitleLine1] || DEFAULT_HOME_DISPLAY_CONFIG.heroTitleLine1}
              </p>
              <p className="text-2xl font-black leading-tight text-blue-700">
                {form[HOME_CONFIG_KEYS.heroTitleEmphasis] || DEFAULT_HOME_DISPLAY_CONFIG.heroTitleEmphasis}
              </p>
              <p className="mt-3 text-sm text-charcoal">
                {form[HOME_CONFIG_KEYS.heroSub] || DEFAULT_HOME_DISPLAY_CONFIG.heroSub}
              </p>
              <p className="mt-2 text-sm text-stone">
                {form[HOME_CONFIG_KEYS.heroTagline] || DEFAULT_HOME_DISPLAY_CONFIG.heroTagline}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-charcoal">滚动文案预览</h3>
            <div className="mt-4 rounded-xl border border-cream-200 bg-slate-50 p-4">
              <ul className="space-y-2 text-sm text-stone">
                {normalizeMarqueeItems(form[MARQUEE_KEY]).map((item, index) => (
                  <li key={`${item}-${index}`}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-charcoal">背景图预览</h3>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-cream-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone">首屏背景图</p>
                <p className="mt-2 break-all text-sm text-charcoal">
                  {form[HOME_CONFIG_KEYS.heroBackgroundImage].trim() || '未设置（将使用接口或默认背景）'}
                </p>
              </div>
              <div className="rounded-xl border border-cream-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone">展示区背景图（按顺序）</p>
                <ul className="mt-2 space-y-2 text-sm text-charcoal">
                  {normalizeBackgroundImages(form[SHOWCASE_BACKGROUND_IMAGES_KEY]).length > 0 ? (
                    normalizeBackgroundImages(form[SHOWCASE_BACKGROUND_IMAGES_KEY]).map((item, index) => (
                      <li key={`${item}-${index}`} className="break-all">
                        {index + 1}. {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-stone">未设置（将使用接口或默认背景）</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          保存首页配置
        </Button>
      </div>
    </div>
  )
}

export default AdminHomepageSettingsPage
