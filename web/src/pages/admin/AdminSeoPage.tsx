import { useEffect, useMemo, useState } from 'react'
import { Globe, Image as ImageIcon, KeyRound, Search, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import adminService from '@/services/admin'
import type { AdminConfigItem, AdminConfigPayload } from '@/types/admin'
import { getApiErrorMessage } from '@/utils'

const SEO_FIELDS = [
  {
    key: 'seo_site_title',
    label: '网站标题',
    description: '浏览器标题、搜索结果标题及 Open Graph 标题默认值。',
    placeholder: '请输入网站标题',
    icon: Globe,
  },
  {
    key: 'seo_site_description',
    label: '网站描述',
    description: '用于页面描述与 Open Graph 描述，建议 60-160 字。',
    placeholder: '请输入网站描述',
    icon: Search,
    textarea: true,
  },
  {
    key: 'seo_site_keywords',
    label: '网站关键词',
    description: '多个关键词请使用英文逗号分隔。',
    placeholder: '例如：NewShop,电商,购物平台',
    icon: KeyRound,
  },
  {
    key: 'seo_og_image',
    label: 'Open Graph 图片',
    description: '用于社交平台分享卡片，推荐填写完整图片 URL。',
    placeholder: 'https://example.com/og-image.jpg',
    icon: ImageIcon,
  },
  {
    key: 'seo_google_verify',
    label: 'Google 站长验证码',
    description: '用于 Google Search Console 所需的站点验证。',
    placeholder: '请输入 Google 验证码',
    icon: ShieldCheck,
  },
] as const

type SeoFieldKey = (typeof SEO_FIELDS)[number]['key']

type SeoFormState = Record<SeoFieldKey, string>

const INITIAL_FORM: SeoFormState = {
  seo_site_title: '',
  seo_site_description: '',
  seo_site_keywords: '',
  seo_og_image: '',
  seo_google_verify: '',
}

const FIELD_DESCRIPTIONS: Record<SeoFieldKey, string> = {
  seo_site_title: '网站标题',
  seo_site_description: '网站描述',
  seo_site_keywords: '网站关键词',
  seo_og_image: 'Open Graph 图片',
  seo_google_verify: 'Google 站长验证码',
}

function parseConfigValue(value: string) {
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'string' ? parsed : ''
  } catch {
    return ''
  }
}

export function AdminSeoPage() {
  const [form, setForm] = useState<SeoFormState>(INITIAL_FORM)
  const [configs, setConfigs] = useState<Record<string, AdminConfigItem>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchConfigs = async () => {
      setLoading(true)
      try {
        const data = await adminService.getConfigs('seo')
        const configMap = data.reduce<Record<string, AdminConfigItem>>((acc, item) => {
          acc[item.key] = item
          return acc
        }, {})

        setConfigs(configMap)
        setForm({
          seo_site_title: parseConfigValue(configMap.seo_site_title?.value ?? ''),
          seo_site_description: parseConfigValue(configMap.seo_site_description?.value ?? ''),
          seo_site_keywords: parseConfigValue(configMap.seo_site_keywords?.value ?? ''),
          seo_og_image: parseConfigValue(configMap.seo_og_image?.value ?? ''),
          seo_google_verify: parseConfigValue(configMap.seo_google_verify?.value ?? ''),
        })
      } catch (error) {
        console.error('获取 SEO 配置失败:', error)
        alert(getApiErrorMessage(error, '获取 SEO 配置失败，请稍后重试'))
      } finally {
        setLoading(false)
      }
    }

    fetchConfigs()
  }, [])

  const completionRate = useMemo(() => {
    const completed = SEO_FIELDS.filter((field) => form[field.key].trim()).length
    return Math.round((completed / SEO_FIELDS.length) * 100)
  }, [form])

  const handleChange = (key: SeoFieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const buildPayload = (key: SeoFieldKey): AdminConfigPayload => ({
    key,
    value: JSON.stringify(form[key].trim()),
    type: 'string',
    category: 'seo',
    description: configs[key]?.description || FIELD_DESCRIPTIONS[key],
    is_public: true,
  })

  const handleSave = async () => {
    if (!form.seo_site_title.trim()) {
      alert('请填写网站标题')
      return
    }

    setSaving(true)
    try {
      await Promise.all(SEO_FIELDS.map((field) => adminService.upsertConfig(buildPayload(field.key))))
      const latest = await adminService.getConfigs('seo')
      const configMap = latest.reduce<Record<string, AdminConfigItem>>((acc, item) => {
        acc[item.key] = item
        return acc
      }, {})
      setConfigs(configMap)
      alert('SEO 配置保存成功')
    } catch (error) {
      console.error('保存 SEO 配置失败:', error)
      alert(getApiErrorMessage(error, '保存 SEO 配置失败，请稍后重试'))
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
          <h2 className="text-2xl font-semibold text-charcoal">SEO 设置</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone">
            通过现有 Config 系统统一维护站点级 SEO 信息，保存后可供前端运行时读取并同步到页面标题、描述与分享卡片。
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
          {SEO_FIELDS.map((field) => {
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

                    {'textarea' in field && field.textarea ? (
                      <textarea
                        value={form[field.key]}
                        onChange={(event) => handleChange(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        rows={4}
                        className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <Input
                        value={form[field.key]}
                        onChange={(event) => handleChange(field.key, event.target.value)}
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-charcoal">搜索结果预览</h3>
            <div className="mt-4 rounded-xl border border-cream-200 bg-slate-50 p-4">
              <p className="line-clamp-2 text-lg font-medium text-blue-700">
                {form.seo_site_title || '网站标题将显示在这里'}
              </p>
              <p className="mt-1 text-xs text-green-700">https://www.newshop.local/</p>
              <p className="mt-3 text-sm leading-6 text-stone">
                {form.seo_site_description || '网站描述将显示在这里，帮助搜索引擎和用户理解站点内容。'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-charcoal">分享卡片预览</h3>
            <div className="mt-4 overflow-hidden rounded-xl border border-cream-200 bg-slate-50">
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-blue-100 via-slate-100 to-cream-100 px-6 text-center text-sm text-stone">
                {form.seo_og_image.trim() ? form.seo_og_image : '未设置 Open Graph 图片时，将使用默认页面视觉或空白占位。'}
              </div>
              <div className="p-4">
                <p className="line-clamp-1 font-medium text-charcoal">
                  {form.seo_site_title || '分享标题'}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-stone">
                  {form.seo_site_description || '分享描述将显示在这里。'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-charcoal">发布建议</h3>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-stone">
              <li>• 标题建议控制在 60 个字符以内，避免搜索结果被截断。</li>
              <li>• 描述建议概括核心卖点，并包含主要关键词。</li>
              <li>• Open Graph 图片建议使用 1200 × 630 的横图。</li>
              <li>• 保存后可在后续页面接入 useSeo() 统一消费。</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          保存 SEO 配置
        </Button>
      </div>
    </div>
  )
}

export default AdminSeoPage
