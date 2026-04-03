export const HOME_CONFIG_KEYS = {
  brandText: 'home_header_brand_text',
  brandLogo: 'home_header_brand_logo',
  heroEyebrow: 'home_hero_eyebrow',
  heroTitleLine1: 'home_hero_title_line1',
  heroTitleEmphasis: 'home_hero_title_emphasis',
  heroSub: 'home_hero_sub',
  heroTagline: 'home_hero_tagline',
  heroBackgroundImage: 'home_hero_background_image',
  marqueeItems: 'home_marquee_items',
  layoutMaxWidth: 'home_layout_max_width',
  showcaseBackgroundImages: 'home_showcase_background_images',
  showcaseOverlayOdd: 'home_showcase_overlay_odd',
  showcaseOverlayEven: 'home_showcase_overlay_even',
} as const

export const DEFAULT_HOME_DISPLAY_CONFIG = {
  brandText: 'NewShop',
  brandLogo: '',
  heroEyebrow: 'Official · Genuine · Gensokyo',
  heroTitleLine1: '欢迎来到',
  heroTitleEmphasis: 'Fumo 乐园',
  heroSub: '幻想乡少女的现实据点',
  heroTagline: '100% 正版保证，给最可爱的玩偶一个温暖的家',
  heroBackgroundImage: '',
  marqueeItems: [
    '100% 正品保障',
    'Gift 官方授权',
    '加固包装发货',
    '绝版代寻服务',
    '车万同好客服',
    '幻想乡正规据点',
  ],
  layoutMaxWidth: 1780,
  showcaseBackgroundImages: [],
  showcaseOverlayOdd: 'linear-gradient(135deg, rgba(51,64,39,0.88) 0%, rgba(28,36,21,0.4) 100%)',
  showcaseOverlayEven: 'linear-gradient(225deg, rgba(28,36,21,0.88) 0%, rgba(51,64,39,0.4) 100%)',
} as const

export type HomeDisplayConfig = {
  brandText: string
  brandLogo: string
  heroEyebrow: string
  heroTitleLine1: string
  heroTitleEmphasis: string
  heroSub: string
  heroTagline: string
  heroBackgroundImage: string
  marqueeItems: string[]
  layoutMaxWidth: number
  showcaseBackgroundImages: string[]
  showcaseOverlayOdd: string
  showcaseOverlayEven: string
}

function toConfigString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function toConfigStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const result = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)

  return result.length > 0 ? result : fallback
}

function toConfigNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN

  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(Math.max(Math.round(numericValue), min), max)
}

export function resolveHomeDisplayConfig(source?: Record<string, unknown>): HomeDisplayConfig {
  return {
    brandText: toConfigString(source?.[HOME_CONFIG_KEYS.brandText], DEFAULT_HOME_DISPLAY_CONFIG.brandText),
    brandLogo: toConfigString(source?.[HOME_CONFIG_KEYS.brandLogo], DEFAULT_HOME_DISPLAY_CONFIG.brandLogo),
    heroEyebrow: toConfigString(source?.[HOME_CONFIG_KEYS.heroEyebrow], DEFAULT_HOME_DISPLAY_CONFIG.heroEyebrow),
    heroTitleLine1: toConfigString(source?.[HOME_CONFIG_KEYS.heroTitleLine1], DEFAULT_HOME_DISPLAY_CONFIG.heroTitleLine1),
    heroTitleEmphasis: toConfigString(source?.[HOME_CONFIG_KEYS.heroTitleEmphasis], DEFAULT_HOME_DISPLAY_CONFIG.heroTitleEmphasis),
    heroSub: toConfigString(source?.[HOME_CONFIG_KEYS.heroSub], DEFAULT_HOME_DISPLAY_CONFIG.heroSub),
    heroTagline: toConfigString(source?.[HOME_CONFIG_KEYS.heroTagline], DEFAULT_HOME_DISPLAY_CONFIG.heroTagline),
    heroBackgroundImage: toConfigString(source?.[HOME_CONFIG_KEYS.heroBackgroundImage], DEFAULT_HOME_DISPLAY_CONFIG.heroBackgroundImage),
    marqueeItems: toConfigStringArray(source?.[HOME_CONFIG_KEYS.marqueeItems], [...DEFAULT_HOME_DISPLAY_CONFIG.marqueeItems]),
    layoutMaxWidth: toConfigNumber(source?.[HOME_CONFIG_KEYS.layoutMaxWidth], DEFAULT_HOME_DISPLAY_CONFIG.layoutMaxWidth, 960, 2560),
    showcaseBackgroundImages: toConfigStringArray(
      source?.[HOME_CONFIG_KEYS.showcaseBackgroundImages],
      [...DEFAULT_HOME_DISPLAY_CONFIG.showcaseBackgroundImages]
    ),
    showcaseOverlayOdd: toConfigString(source?.[HOME_CONFIG_KEYS.showcaseOverlayOdd], DEFAULT_HOME_DISPLAY_CONFIG.showcaseOverlayOdd),
    showcaseOverlayEven: toConfigString(source?.[HOME_CONFIG_KEYS.showcaseOverlayEven], DEFAULT_HOME_DISPLAY_CONFIG.showcaseOverlayEven),
  }
}
