export const FOOTER_CONFIG_KEYS = {
  brandName: 'footer_brand_name',
  brandHighlight: 'footer_brand_highlight',
  aboutText: 'footer_about_text',
  categoryTitle: 'footer_category_title',
  categoryLinks: 'footer_category_links',
  serviceTitle: 'footer_service_title',
  serviceLinks: 'footer_service_links',
  aboutTitle: 'footer_about_title',
  aboutLinks: 'footer_about_links',
  socialLinks: 'footer_social_links',
  copyrightText: 'footer_copyright_text',
  policyLinks: 'footer_policy_links',
} as const

export const FOOTER_SOCIAL_PLATFORMS = ['weibo', 'twitter', 'discord', 'bilibili'] as const

export type FooterSocialPlatform = (typeof FOOTER_SOCIAL_PLATFORMS)[number]

export interface FooterNavLink {
  label: string
  href: string
  newTab?: boolean
}

export interface FooterSocialLink extends FooterNavLink {
  platform: FooterSocialPlatform
  enabled?: boolean
}

export interface FooterDisplayConfig {
  brandName: string
  brandHighlight: string
  aboutText: string
  categoryTitle: string
  categoryLinks: FooterNavLink[]
  serviceTitle: string
  serviceLinks: FooterNavLink[]
  aboutTitle: string
  aboutLinks: FooterNavLink[]
  socialLinks: FooterSocialLink[]
  copyrightText: string
  policyLinks: FooterNavLink[]
}

export const DEFAULT_FOOTER_DISPLAY_CONFIG: FooterDisplayConfig = {
  brandName: 'Fumo',
  brandHighlight: 'Shop',
  aboutText: '幻想乡少女的现实据点。100% 正版保障，让每一只 Fumo 都能找到真正爱她的主人。',
  categoryTitle: '商品分类',
  categoryLinks: [
    { label: '经典角色', href: '/products' },
    { label: '新品上架', href: '/new' },
    { label: '限定款式', href: '/sale' },
    { label: '预约专区', href: '/preorder' },
    { label: '绝版代寻', href: '/page/help' },
  ],
  serviceTitle: '客户服务',
  serviceLinks: [
    { label: '购买流程', href: '/page/guide' },
    { label: '包装说明', href: '/page/shipping' },
    { label: '物流追踪', href: '/orders' },
    { label: '售后政策', href: '/page/returns' },
    { label: '联系客服', href: '/page/contact' },
  ],
  aboutTitle: '关于我们',
  aboutLinks: [
    { label: '品牌故事', href: '/page/story' },
    { label: '正品鉴别', href: '/page/help' },
    { label: '合作伙伴', href: '/page/service' },
    { label: '加入我们', href: '/page/join' },
  ],
  socialLinks: [
    { platform: 'weibo', label: '微博', href: '#', enabled: true },
    { platform: 'twitter', label: 'Twitter', href: '#', enabled: true },
    { platform: 'discord', label: 'Discord', href: '#', enabled: true },
    { platform: 'bilibili', label: '哔哩哔哩', href: '#', enabled: true },
  ],
  copyrightText: '© 2026 FumoShop · 幻想乡正规据点 · All Rights Reserved.',
  policyLinks: [
    { label: '隐私政策', href: '#' },
    { label: '服务条款', href: '#' },
    { label: 'Cookie 设置', href: '#' },
  ],
}

function toConfigString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function toConfigBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') {
      return true
    }
    if (normalized === 'false') {
      return false
    }
  }

  return fallback
}

function normalizeHref(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return '#'
}

function toConfigLinks(value: unknown, fallback: FooterNavLink[]): FooterNavLink[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const links: FooterNavLink[] = []

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return
    }

    const record = item as Record<string, unknown>
    const label = toConfigString(record.label, '')
    const href = normalizeHref(record.href ?? record.url)
    if (!label) {
      return
    }

    links.push({
      label,
      href,
      newTab: toConfigBoolean(record.newTab ?? record.new_tab, false),
    })
  })

  return links.length > 0 ? links : fallback
}

function toSocialPlatform(value: unknown): FooterSocialPlatform | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if ((FOOTER_SOCIAL_PLATFORMS as readonly string[]).includes(normalized)) {
    return normalized as FooterSocialPlatform
  }

  return null
}

function toConfigSocialLinks(value: unknown, fallback: FooterSocialLink[]): FooterSocialLink[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const links: FooterSocialLink[] = []

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return
    }

    const record = item as Record<string, unknown>
    const platform = toSocialPlatform(record.platform)
    const label = toConfigString(record.label, '')
    const href = normalizeHref(record.href ?? record.url)
    if (!platform || !label) {
      return
    }

    links.push({
      platform,
      label,
      href,
      newTab: toConfigBoolean(record.newTab ?? record.new_tab, false),
      enabled: toConfigBoolean(record.enabled, true),
    })
  })

  return links.length > 0 ? links : fallback
}

export function resolveFooterDisplayConfig(source?: Record<string, unknown>): FooterDisplayConfig {
  return {
    brandName: toConfigString(source?.[FOOTER_CONFIG_KEYS.brandName], DEFAULT_FOOTER_DISPLAY_CONFIG.brandName),
    brandHighlight: toConfigString(source?.[FOOTER_CONFIG_KEYS.brandHighlight], DEFAULT_FOOTER_DISPLAY_CONFIG.brandHighlight),
    aboutText: toConfigString(source?.[FOOTER_CONFIG_KEYS.aboutText], DEFAULT_FOOTER_DISPLAY_CONFIG.aboutText),
    categoryTitle: toConfigString(source?.[FOOTER_CONFIG_KEYS.categoryTitle], DEFAULT_FOOTER_DISPLAY_CONFIG.categoryTitle),
    categoryLinks: toConfigLinks(
      source?.[FOOTER_CONFIG_KEYS.categoryLinks],
      DEFAULT_FOOTER_DISPLAY_CONFIG.categoryLinks.map((item) => ({ ...item }))
    ),
    serviceTitle: toConfigString(source?.[FOOTER_CONFIG_KEYS.serviceTitle], DEFAULT_FOOTER_DISPLAY_CONFIG.serviceTitle),
    serviceLinks: toConfigLinks(
      source?.[FOOTER_CONFIG_KEYS.serviceLinks],
      DEFAULT_FOOTER_DISPLAY_CONFIG.serviceLinks.map((item) => ({ ...item }))
    ),
    aboutTitle: toConfigString(source?.[FOOTER_CONFIG_KEYS.aboutTitle], DEFAULT_FOOTER_DISPLAY_CONFIG.aboutTitle),
    aboutLinks: toConfigLinks(
      source?.[FOOTER_CONFIG_KEYS.aboutLinks],
      DEFAULT_FOOTER_DISPLAY_CONFIG.aboutLinks.map((item) => ({ ...item }))
    ),
    socialLinks: toConfigSocialLinks(
      source?.[FOOTER_CONFIG_KEYS.socialLinks],
      DEFAULT_FOOTER_DISPLAY_CONFIG.socialLinks.map((item) => ({ ...item }))
    ),
    copyrightText: toConfigString(source?.[FOOTER_CONFIG_KEYS.copyrightText], DEFAULT_FOOTER_DISPLAY_CONFIG.copyrightText),
    policyLinks: toConfigLinks(
      source?.[FOOTER_CONFIG_KEYS.policyLinks],
      DEFAULT_FOOTER_DISPLAY_CONFIG.policyLinks.map((item) => ({ ...item }))
    ),
  }
}
