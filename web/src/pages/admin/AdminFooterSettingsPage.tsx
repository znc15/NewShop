import { useEffect, useMemo, useState } from 'react'
import { Copyright, Link2, MessageSquareText, Network, Palette } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  DEFAULT_FOOTER_DISPLAY_CONFIG,
  FOOTER_CONFIG_KEYS,
  FOOTER_SOCIAL_PLATFORMS,
  type FooterNavLink,
  type FooterSocialLink,
  type FooterSocialPlatform,
} from '@/lib/footerConfig'
import adminService from '@/services/admin'
import type { AdminConfigItem, AdminConfigPayload } from '@/types/admin'
import { getApiErrorMessage } from '@/utils'

const CONFIG_CATEGORY = 'footer'

const STRING_FIELDS = [
  {
    key: FOOTER_CONFIG_KEYS.brandName,
    label: '品牌主名称',
    description: '页脚品牌前半段文案。',
    placeholder: '例如：Fumo',
    icon: Palette,
  },
  {
    key: FOOTER_CONFIG_KEYS.brandHighlight,
    label: '品牌高亮名称',
    description: '页脚品牌高亮后半段文案。',
    placeholder: '例如：Shop',
    icon: Palette,
  },
  {
    key: FOOTER_CONFIG_KEYS.aboutText,
    label: '品牌简介',
    description: '页脚左侧品牌介绍文案。',
    placeholder: '例如：幻想乡少女的现实据点...',
    icon: MessageSquareText,
    textarea: true,
  },
  {
    key: FOOTER_CONFIG_KEYS.categoryTitle,
    label: '第一列标题',
    description: '通常用于商品分类。',
    placeholder: '例如：商品分类',
    icon: Link2,
  },
  {
    key: FOOTER_CONFIG_KEYS.serviceTitle,
    label: '第二列标题',
    description: '通常用于客户服务。',
    placeholder: '例如：客户服务',
    icon: Link2,
  },
  {
    key: FOOTER_CONFIG_KEYS.aboutTitle,
    label: '第三列标题',
    description: '通常用于关于我们。',
    placeholder: '例如：关于我们',
    icon: Link2,
  },
  {
    key: FOOTER_CONFIG_KEYS.copyrightText,
    label: '底部版权文案',
    description: '页脚底部左侧版权信息。',
    placeholder: '例如：© 2026 FumoShop · 幻想乡正规据点 · All Rights Reserved.',
    icon: Copyright,
  },
] as const

const LINK_LIST_FIELDS = [
  {
    key: FOOTER_CONFIG_KEYS.categoryLinks,
    label: '第一列链接（商品分类）',
    description: '每行一条，格式：标题|链接，例如：经典角色|/products',
    placeholder: '经典角色|/products\n新品上架|/new',
  },
  {
    key: FOOTER_CONFIG_KEYS.serviceLinks,
    label: '第二列链接（客户服务）',
    description: '每行一条，格式：标题|链接，例如：购买流程|/page/guide',
    placeholder: '购买流程|/page/guide\n包装说明|/page/shipping',
  },
  {
    key: FOOTER_CONFIG_KEYS.aboutLinks,
    label: '第三列链接（关于我们）',
    description: '每行一条，格式：标题|链接，例如：品牌故事|/page/story',
    placeholder: '品牌故事|/page/story\n加入我们|/page/join',
  },
  {
    key: FOOTER_CONFIG_KEYS.policyLinks,
    label: '底部政策链接',
    description: '每行一条，格式：标题|链接，例如：隐私政策|/page/privacy',
    placeholder: '隐私政策|#\n服务条款|#\nCookie 设置|#',
  },
] as const

const SOCIAL_LINK_FIELD = {
  key: FOOTER_CONFIG_KEYS.socialLinks,
  label: '社交链接',
  description: '每行一条，格式：平台|标题|链接。平台仅支持 weibo/twitter/discord/bilibili。',
  placeholder: 'weibo|微博|#\ntwitter|Twitter|#\ndiscord|Discord|#\nbilibili|哔哩哔哩|#',
} as const

type StringFieldKey = (typeof STRING_FIELDS)[number]['key']
type LinkListFieldKey = (typeof LINK_LIST_FIELDS)[number]['key']
type FooterFormKey = StringFieldKey | LinkListFieldKey | typeof FOOTER_CONFIG_KEYS.socialLinks
type FooterFormState = Record<FooterFormKey, string>

const FIELD_DESCRIPTIONS: Record<FooterFormKey, string> = {
  [FOOTER_CONFIG_KEYS.brandName]: '页脚品牌主名称',
  [FOOTER_CONFIG_KEYS.brandHighlight]: '页脚品牌高亮名称',
  [FOOTER_CONFIG_KEYS.aboutText]: '页脚品牌简介',
  [FOOTER_CONFIG_KEYS.categoryTitle]: '页脚第一列标题',
  [FOOTER_CONFIG_KEYS.categoryLinks]: '页脚第一列链接',
  [FOOTER_CONFIG_KEYS.serviceTitle]: '页脚第二列标题',
  [FOOTER_CONFIG_KEYS.serviceLinks]: '页脚第二列链接',
  [FOOTER_CONFIG_KEYS.aboutTitle]: '页脚第三列标题',
  [FOOTER_CONFIG_KEYS.aboutLinks]: '页脚第三列链接',
  [FOOTER_CONFIG_KEYS.socialLinks]: '页脚社交链接',
  [FOOTER_CONFIG_KEYS.copyrightText]: '页脚底部版权文案',
  [FOOTER_CONFIG_KEYS.policyLinks]: '页脚底部政策链接',
}

const INITIAL_FORM: FooterFormState = {
  [FOOTER_CONFIG_KEYS.brandName]: DEFAULT_FOOTER_DISPLAY_CONFIG.brandName,
  [FOOTER_CONFIG_KEYS.brandHighlight]: DEFAULT_FOOTER_DISPLAY_CONFIG.brandHighlight,
  [FOOTER_CONFIG_KEYS.aboutText]: DEFAULT_FOOTER_DISPLAY_CONFIG.aboutText,
  [FOOTER_CONFIG_KEYS.categoryTitle]: DEFAULT_FOOTER_DISPLAY_CONFIG.categoryTitle,
  [FOOTER_CONFIG_KEYS.categoryLinks]: toLinkLines(DEFAULT_FOOTER_DISPLAY_CONFIG.categoryLinks),
  [FOOTER_CONFIG_KEYS.serviceTitle]: DEFAULT_FOOTER_DISPLAY_CONFIG.serviceTitle,
  [FOOTER_CONFIG_KEYS.serviceLinks]: toLinkLines(DEFAULT_FOOTER_DISPLAY_CONFIG.serviceLinks),
  [FOOTER_CONFIG_KEYS.aboutTitle]: DEFAULT_FOOTER_DISPLAY_CONFIG.aboutTitle,
  [FOOTER_CONFIG_KEYS.aboutLinks]: toLinkLines(DEFAULT_FOOTER_DISPLAY_CONFIG.aboutLinks),
  [FOOTER_CONFIG_KEYS.socialLinks]: toSocialLinkLines(DEFAULT_FOOTER_DISPLAY_CONFIG.socialLinks),
  [FOOTER_CONFIG_KEYS.copyrightText]: DEFAULT_FOOTER_DISPLAY_CONFIG.copyrightText,
  [FOOTER_CONFIG_KEYS.policyLinks]: toLinkLines(DEFAULT_FOOTER_DISPLAY_CONFIG.policyLinks),
}

function parseStringConfig(value: string): string {
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'string' ? parsed : ''
  } catch {
    return ''
  }
}

function parseArrayConfig(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeLinkToken(value: string): string {
  const trimmed = value.trim()
  return trimmed || '#'
}

function toLinkLines(links: FooterNavLink[]): string {
  return links.map((item) => `${item.label}|${item.href}`).join('\n')
}

function toSocialLinkLines(links: FooterSocialLink[]): string {
  return links.map((item) => `${item.platform}|${item.label}|${item.href}`).join('\n')
}

function parseLinkLines(text: string): FooterNavLink[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawLabel, rawHref] = line.split('|').map((item) => item.trim())
      if (!rawLabel) {
        return null
      }

      return {
        label: rawLabel,
        href: normalizeLinkToken(rawHref || '#'),
      } satisfies FooterNavLink
    })
    .filter((item): item is FooterNavLink => Boolean(item))
}

function isSocialPlatform(value: string): value is FooterSocialPlatform {
  return (FOOTER_SOCIAL_PLATFORMS as readonly string[]).includes(value)
}

function parseSocialLinkLines(text: string): FooterSocialLink[] {
  const links: FooterSocialLink[] = []

  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [rawPlatform, rawLabel, rawHref] = line.split('|').map((item) => item.trim())
      const normalizedPlatform = rawPlatform?.toLowerCase()
      if (!rawLabel || !normalizedPlatform || !isSocialPlatform(normalizedPlatform)) {
        return
      }

      links.push({
        platform: normalizedPlatform,
        label: rawLabel,
        href: normalizeLinkToken(rawHref || '#'),
        enabled: true,
      })
    })

  return links
}

function toLinkListFromConfig(value: string, fallback: FooterNavLink[]): string {
  const parsed = parseArrayConfig(value)
  const links = parsed
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const record = item as Record<string, unknown>
      const label = typeof record.label === 'string' ? record.label.trim() : ''
      const hrefValue = typeof record.href === 'string' ? record.href.trim() : typeof record.url === 'string' ? record.url.trim() : ''
      if (!label) {
        return null
      }

      return {
        label,
        href: normalizeLinkToken(hrefValue),
      } satisfies FooterNavLink
    })
    .filter((item): item is FooterNavLink => Boolean(item))

  return toLinkLines(links.length > 0 ? links : fallback)
}

function toSocialListFromConfig(value: string, fallback: FooterSocialLink[]): string {
  const parsed = parseArrayConfig(value)

  const links: FooterSocialLink[] = []

  parsed.forEach((item) => {
      if (!item || typeof item !== 'object') {
        return
      }

      const record = item as Record<string, unknown>
      const platform = typeof record.platform === 'string' ? record.platform.trim().toLowerCase() : ''
      const label = typeof record.label === 'string' ? record.label.trim() : ''
      const hrefValue = typeof record.href === 'string' ? record.href.trim() : typeof record.url === 'string' ? record.url.trim() : ''
      if (!label || !isSocialPlatform(platform)) {
        return
      }

      links.push({
        platform,
        label,
        href: normalizeLinkToken(hrefValue),
        enabled: true,
      })
    })

  return toSocialLinkLines(links.length > 0 ? links : fallback)
}

export function AdminFooterSettingsPage() {
  const [form, setForm] = useState<FooterFormState>(INITIAL_FORM)
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

        setForm({
          [FOOTER_CONFIG_KEYS.brandName]: parseStringConfig(configMap[FOOTER_CONFIG_KEYS.brandName]?.value ?? '') || DEFAULT_FOOTER_DISPLAY_CONFIG.brandName,
          [FOOTER_CONFIG_KEYS.brandHighlight]: parseStringConfig(configMap[FOOTER_CONFIG_KEYS.brandHighlight]?.value ?? '') || DEFAULT_FOOTER_DISPLAY_CONFIG.brandHighlight,
          [FOOTER_CONFIG_KEYS.aboutText]: parseStringConfig(configMap[FOOTER_CONFIG_KEYS.aboutText]?.value ?? '') || DEFAULT_FOOTER_DISPLAY_CONFIG.aboutText,
          [FOOTER_CONFIG_KEYS.categoryTitle]: parseStringConfig(configMap[FOOTER_CONFIG_KEYS.categoryTitle]?.value ?? '') || DEFAULT_FOOTER_DISPLAY_CONFIG.categoryTitle,
          [FOOTER_CONFIG_KEYS.categoryLinks]: toLinkListFromConfig(
            configMap[FOOTER_CONFIG_KEYS.categoryLinks]?.value ?? '',
            DEFAULT_FOOTER_DISPLAY_CONFIG.categoryLinks
          ),
          [FOOTER_CONFIG_KEYS.serviceTitle]: parseStringConfig(configMap[FOOTER_CONFIG_KEYS.serviceTitle]?.value ?? '') || DEFAULT_FOOTER_DISPLAY_CONFIG.serviceTitle,
          [FOOTER_CONFIG_KEYS.serviceLinks]: toLinkListFromConfig(
            configMap[FOOTER_CONFIG_KEYS.serviceLinks]?.value ?? '',
            DEFAULT_FOOTER_DISPLAY_CONFIG.serviceLinks
          ),
          [FOOTER_CONFIG_KEYS.aboutTitle]: parseStringConfig(configMap[FOOTER_CONFIG_KEYS.aboutTitle]?.value ?? '') || DEFAULT_FOOTER_DISPLAY_CONFIG.aboutTitle,
          [FOOTER_CONFIG_KEYS.aboutLinks]: toLinkListFromConfig(
            configMap[FOOTER_CONFIG_KEYS.aboutLinks]?.value ?? '',
            DEFAULT_FOOTER_DISPLAY_CONFIG.aboutLinks
          ),
          [FOOTER_CONFIG_KEYS.socialLinks]: toSocialListFromConfig(
            configMap[FOOTER_CONFIG_KEYS.socialLinks]?.value ?? '',
            DEFAULT_FOOTER_DISPLAY_CONFIG.socialLinks
          ),
          [FOOTER_CONFIG_KEYS.copyrightText]:
            parseStringConfig(configMap[FOOTER_CONFIG_KEYS.copyrightText]?.value ?? '') || DEFAULT_FOOTER_DISPLAY_CONFIG.copyrightText,
          [FOOTER_CONFIG_KEYS.policyLinks]: toLinkListFromConfig(
            configMap[FOOTER_CONFIG_KEYS.policyLinks]?.value ?? '',
            DEFAULT_FOOTER_DISPLAY_CONFIG.policyLinks
          ),
        })
      } catch (error) {
        console.error('获取页脚配置失败:', error)
        alert(getApiErrorMessage(error, '获取页脚配置失败，请稍后重试'))
      } finally {
        setLoading(false)
      }
    }

    void fetchConfigs()
  }, [])

  const completionRate = useMemo(() => {
    const stringReadyCount = STRING_FIELDS.filter((field) => form[field.key].trim().length > 0).length
    const listReadyCount = LINK_LIST_FIELDS.filter((field) => parseLinkLines(form[field.key]).length > 0).length
    const socialReady = parseSocialLinkLines(form[FOOTER_CONFIG_KEYS.socialLinks]).length > 0 ? 1 : 0
    const total = STRING_FIELDS.length + LINK_LIST_FIELDS.length + 1
    return Math.round(((stringReadyCount + listReadyCount + socialReady) / total) * 100)
  }, [form])

  const handleChange = (key: FooterFormKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const buildStringPayload = (key: StringFieldKey): AdminConfigPayload => ({
    key,
    value: JSON.stringify(form[key].trim()),
    type: 'string',
    category: CONFIG_CATEGORY,
    description: configs[key]?.description || FIELD_DESCRIPTIONS[key],
    is_public: true,
  })

  const buildArrayPayload = (key: LinkListFieldKey | typeof FOOTER_CONFIG_KEYS.socialLinks, value: unknown): AdminConfigPayload => ({
    key,
    value: JSON.stringify(value),
    type: 'array',
    category: CONFIG_CATEGORY,
    description: configs[key]?.description || FIELD_DESCRIPTIONS[key],
    is_public: true,
  })

  const handleSave = async () => {
    const categoryLinks = parseLinkLines(form[FOOTER_CONFIG_KEYS.categoryLinks])
    const serviceLinks = parseLinkLines(form[FOOTER_CONFIG_KEYS.serviceLinks])
    const aboutLinks = parseLinkLines(form[FOOTER_CONFIG_KEYS.aboutLinks])
    const policyLinks = parseLinkLines(form[FOOTER_CONFIG_KEYS.policyLinks])
    const socialLinks = parseSocialLinkLines(form[FOOTER_CONFIG_KEYS.socialLinks])

    if (!form[FOOTER_CONFIG_KEYS.brandName].trim()) {
      alert('请填写品牌主名称')
      return
    }

    if (!form[FOOTER_CONFIG_KEYS.brandHighlight].trim()) {
      alert('请填写品牌高亮名称')
      return
    }

    if (categoryLinks.length === 0 || serviceLinks.length === 0 || aboutLinks.length === 0) {
      alert('三组导航列都至少需要一条链接')
      return
    }

    if (policyLinks.length === 0) {
      alert('底部政策链接至少需要一条')
      return
    }

    if (socialLinks.length === 0) {
      alert('社交链接至少需要一条，且平台必须是 weibo/twitter/discord/bilibili')
      return
    }

    setSaving(true)
    try {
      await Promise.all([
        ...STRING_FIELDS.map((field) => adminService.upsertConfig(buildStringPayload(field.key))),
        adminService.upsertConfig(buildArrayPayload(FOOTER_CONFIG_KEYS.categoryLinks, categoryLinks)),
        adminService.upsertConfig(buildArrayPayload(FOOTER_CONFIG_KEYS.serviceLinks, serviceLinks)),
        adminService.upsertConfig(buildArrayPayload(FOOTER_CONFIG_KEYS.aboutLinks, aboutLinks)),
        adminService.upsertConfig(buildArrayPayload(FOOTER_CONFIG_KEYS.socialLinks, socialLinks)),
        adminService.upsertConfig(buildArrayPayload(FOOTER_CONFIG_KEYS.policyLinks, policyLinks)),
      ])

      const latest = await adminService.getConfigs(CONFIG_CATEGORY)
      const configMap = latest.reduce<Record<string, AdminConfigItem>>((acc, item) => {
        acc[item.key] = item
        return acc
      }, {})
      setConfigs(configMap)
      setForm((prev) => ({
        ...prev,
        [FOOTER_CONFIG_KEYS.categoryLinks]: toLinkLines(categoryLinks),
        [FOOTER_CONFIG_KEYS.serviceLinks]: toLinkLines(serviceLinks),
        [FOOTER_CONFIG_KEYS.aboutLinks]: toLinkLines(aboutLinks),
        [FOOTER_CONFIG_KEYS.socialLinks]: toSocialLinkLines(socialLinks),
        [FOOTER_CONFIG_KEYS.policyLinks]: toLinkLines(policyLinks),
      }))

      alert('页脚配置保存成功')
    } catch (error) {
      console.error('保存页脚配置失败:', error)
      alert(getApiErrorMessage(error, '保存页脚配置失败，请稍后重试'))
    } finally {
      setSaving(false)
    }
  }

  const previewCategoryLinks = parseLinkLines(form[FOOTER_CONFIG_KEYS.categoryLinks])
  const previewServiceLinks = parseLinkLines(form[FOOTER_CONFIG_KEYS.serviceLinks])
  const previewAboutLinks = parseLinkLines(form[FOOTER_CONFIG_KEYS.aboutLinks])
  const previewPolicyLinks = parseLinkLines(form[FOOTER_CONFIG_KEYS.policyLinks])
  const previewSocialLinks = parseSocialLinkLines(form[FOOTER_CONFIG_KEYS.socialLinks])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-forest-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-charcoal">页脚设置</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone">
            统一维护全站页脚样式与文案。保存后前台所有页面会自动同步品牌信息、三组导航列、社交链接与底部政策链接。
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
                    {'textarea' in field && field.textarea ? (
                      <textarea
                        value={form[field.key]}
                        onChange={(event) => handleChange(field.key, event.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={field.placeholder}
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

          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-xl bg-blue-50 p-3 text-blue-600">
                <Network className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-charcoal">{SOCIAL_LINK_FIELD.label}</h3>
                  <p className="mt-1 text-sm text-stone">{SOCIAL_LINK_FIELD.description}</p>
                </div>
                <textarea
                  value={form[FOOTER_CONFIG_KEYS.socialLinks]}
                  onChange={(event) => handleChange(FOOTER_CONFIG_KEYS.socialLinks, event.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 font-mono text-sm text-charcoal placeholder:text-stone transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={SOCIAL_LINK_FIELD.placeholder}
                />
              </div>
            </div>
          </div>

          {LINK_LIST_FIELDS.map((field) => (
            <div key={field.key} className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="mt-1 rounded-xl bg-blue-50 p-3 text-blue-600">
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-charcoal">{field.label}</h3>
                    <p className="mt-1 text-sm text-stone">{field.description}</p>
                  </div>
                  <textarea
                    value={form[field.key]}
                    onChange={(event) => handleChange(field.key, event.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-cream-300 bg-white px-3 py-2 font-mono text-sm text-charcoal placeholder:text-stone transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={field.placeholder}
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-charcoal">品牌预览</h3>
            <div className="mt-4 rounded-xl border border-cream-200 bg-slate-50 p-4">
              <p className="font-display text-2xl font-semibold text-charcoal">
                {form[FOOTER_CONFIG_KEYS.brandName] || DEFAULT_FOOTER_DISPLAY_CONFIG.brandName}
                <span className="text-blue-700">{form[FOOTER_CONFIG_KEYS.brandHighlight] || DEFAULT_FOOTER_DISPLAY_CONFIG.brandHighlight}</span>
              </p>
              <p className="mt-3 text-sm leading-6 text-stone">
                {form[FOOTER_CONFIG_KEYS.aboutText] || DEFAULT_FOOTER_DISPLAY_CONFIG.aboutText}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-charcoal">导航列预览</h3>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-cream-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone">{form[FOOTER_CONFIG_KEYS.categoryTitle]}</p>
                <ul className="mt-2 space-y-1 text-sm text-charcoal">
                  {previewCategoryLinks.map((item, index) => (
                    <li key={`category-preview-${item.label}-${index}`}>{item.label} → {item.href}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-cream-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone">{form[FOOTER_CONFIG_KEYS.serviceTitle]}</p>
                <ul className="mt-2 space-y-1 text-sm text-charcoal">
                  {previewServiceLinks.map((item, index) => (
                    <li key={`service-preview-${item.label}-${index}`}>{item.label} → {item.href}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-cream-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone">{form[FOOTER_CONFIG_KEYS.aboutTitle]}</p>
                <ul className="mt-2 space-y-1 text-sm text-charcoal">
                  {previewAboutLinks.map((item, index) => (
                    <li key={`about-preview-${item.label}-${index}`}>{item.label} → {item.href}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-charcoal">社交与底部链接预览</h3>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-cream-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone">社交链接</p>
                <ul className="mt-2 space-y-1 text-sm text-charcoal">
                  {previewSocialLinks.map((item, index) => (
                    <li key={`social-preview-${item.platform}-${index}`}>{item.platform} · {item.label} → {item.href}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-cream-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone">版权文案</p>
                <p className="mt-2 text-sm text-charcoal">{form[FOOTER_CONFIG_KEYS.copyrightText]}</p>
              </div>
              <div className="rounded-xl border border-cream-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone">政策链接</p>
                <ul className="mt-2 space-y-1 text-sm text-charcoal">
                  {previewPolicyLinks.map((item, index) => (
                    <li key={`policy-preview-${item.label}-${index}`}>{item.label} → {item.href}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          保存页脚配置
        </Button>
      </div>
    </div>
  )
}

export default AdminFooterSettingsPage
