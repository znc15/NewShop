export const HOME_CONFIG_KEYS = {
  brandText: 'home_header_brand_text',
  brandLogo: 'home_header_brand_logo',
  heroEyebrow: 'home_hero_eyebrow',
  heroTitleLine1: 'home_hero_title_line1',
  heroTitleEmphasis: 'home_hero_title_emphasis',
  heroSub: 'home_hero_sub',
  heroTagline: 'home_hero_tagline',
  heroStatAdoptedValue: 'home_hero_stat_adopted_value',
  heroStatAdoptedLabel: 'home_hero_stat_adopted_label',
  heroStatRatingValue: 'home_hero_stat_rating_value',
  heroStatRatingLabel: 'home_hero_stat_rating_label',
  heroStatStockValue: 'home_hero_stat_stock_value',
  heroStatStockLabel: 'home_hero_stat_stock_label',
  heroBackgroundImage: 'home_hero_background_image',
  marqueeItems: 'home_marquee_items',
  productsSectionEyebrow: 'home_products_section_eyebrow',
  productsSectionTitle: 'home_products_section_title',
  productsSectionSub: 'home_products_section_sub',
  productsMoreButtonText: 'home_products_more_button_text',
  aboutSectionEyebrow: 'home_about_section_eyebrow',
  aboutTitleLine1: 'home_about_title_line1',
  aboutTitleEmphasis: 'home_about_title_emphasis',
  aboutParagraph1: 'home_about_paragraph_1',
  aboutParagraph2: 'home_about_paragraph_2',
  aboutParagraph3: 'home_about_paragraph_3',
  aboutButtonText: 'home_about_button_text',
  aboutFeatures: 'home_about_features',
  productsDisplayIds: 'home_products_display_ids',
  productsImageOverrides: 'home_products_image_overrides',
  layoutMaxWidth: 'home_layout_max_width',
  showcaseBackgroundImages: 'home_showcase_background_images',
  showcaseOverlayOdd: 'home_showcase_overlay_odd',
  showcaseOverlayEven: 'home_showcase_overlay_even',
} as const

export const DEFAULT_HOME_DISPLAY_CONFIG = {
  brandText: '咩咩图书馆',
  brandLogo: '',
  heroEyebrow: 'Official · Genuine · Gensokyo',
  heroTitleLine1: '欢迎来到',
  heroTitleEmphasis: 'Fumo 乐园',
  heroSub: '幻想乡少女的现实据点',
  heroTagline: '100% 正版保证，给最可爱的玩偶一个温暖的家',
  heroStatAdoptedValue: '500+',
  heroStatAdoptedLabel: '已领养玩偶',
  heroStatRatingValue: '98%',
  heroStatRatingLabel: '好评率',
  heroStatStockValue: '30+',
  heroStatStockLabel: '角色库存',
  heroBackgroundImage: '',
  marqueeItems: [
    '100% 正品保障',
    'Gift 官方授权',
    '加固包装发货',
    '绝版代寻服务',
    '车万同好客服',
    '幻想乡正规据点',
  ],
  productsSectionEyebrow: 'New Arrivals',
  productsSectionTitle: '精选角色商品',
  productsSectionSub: '每一只都经过严格正品验证，安全送达你的手中',
  productsMoreButtonText: '查看全部 30+ 款角色 →',
  aboutSectionEyebrow: 'Our Community',
  aboutTitleLine1: '不止是一家店，',
  aboutTitleEmphasis: '更是 VRChat 玩家的据点',
  aboutParagraph1: '咩咩图书馆由一群长期活跃在 VRChat 的玩家与创作者共同维护，我们希望把好内容与好体验聚拢在同一个空间里。',
  aboutParagraph2: '在这里你可以获取 Avatar 穿搭灵感、热门世界推荐与活动情报，不再被碎片信息打断探索节奏。',
  aboutParagraph3: '无论你是刚入坑的新住民，还是热爱派对与创作的老玩家，都能在咩咩图书馆找到同频伙伴。',
  aboutButtonText: '探索 VRChat 灵感',
  aboutFeatures: [
    {
      title: 'Avatar 精选上新',
      desc: '每周整理高质量 Avatar、服饰与配件灵感，帮助你快速构建独特形象。',
    },
    {
      title: '世界地图策展',
      desc: '按社交、拍照、剧情、音乐等主题推荐世界地图，节省找房时间。',
    },
    {
      title: '创作者联名支持',
      desc: '和优质创作者合作整理作品合集，展示更完整的制作背景与使用指南。',
    },
    {
      title: '同频社群客服',
      desc: '客服团队长期活跃于 VRChat，可直接按玩法场景给出建议而不是模板回复。',
    },
    {
      title: '活动情报速递',
      desc: '舞会、Live、主题展览等活动第一时间同步，不错过任何值得参加的夜晚。',
    },
    {
      title: '跨平台装备建议',
      desc: '覆盖 Quest 与 PCVR 场景，给出更实用的配置建议和性能优化思路。',
    },
  ],
  productsDisplayIds: [],
  productsImageOverrides: [],
  layoutMaxWidth: 1780,
  showcaseBackgroundImages: [],
  showcaseOverlayOdd: 'linear-gradient(135deg, rgba(51,64,39,0.88) 0%, rgba(28,36,21,0.4) 100%)',
  showcaseOverlayEven: 'linear-gradient(225deg, rgba(28,36,21,0.88) 0%, rgba(51,64,39,0.4) 100%)',
} as const

export type HomeAboutFeature = {
  title: string
  desc: string
}

export type HomeDisplayConfig = {
  brandText: string
  brandLogo: string
  heroEyebrow: string
  heroTitleLine1: string
  heroTitleEmphasis: string
  heroSub: string
  heroTagline: string
  heroStatAdoptedValue: string
  heroStatAdoptedLabel: string
  heroStatRatingValue: string
  heroStatRatingLabel: string
  heroStatStockValue: string
  heroStatStockLabel: string
  heroBackgroundImage: string
  marqueeItems: string[]
  productsSectionEyebrow: string
  productsSectionTitle: string
  productsSectionSub: string
  productsMoreButtonText: string
  aboutSectionEyebrow: string
  aboutTitleLine1: string
  aboutTitleEmphasis: string
  aboutParagraph1: string
  aboutParagraph2: string
  aboutParagraph3: string
  aboutButtonText: string
  aboutFeatures: HomeAboutFeature[]
  productsDisplayIds: number[]
  productsImageOverrides: string[]
  layoutMaxWidth: number
  showcaseBackgroundImages: string[]
  showcaseOverlayOdd: string
  showcaseOverlayEven: string
}

const ABOUT_FEATURE_SEPARATORS = ['|', '｜', ':', '：'] as const

function parseAboutFeatureLine(line: string): HomeAboutFeature | null {
  const normalized = line.trim()
  if (!normalized) {
    return null
  }

  for (const separator of ABOUT_FEATURE_SEPARATORS) {
    const separatorIndex = normalized.indexOf(separator)
    if (separatorIndex <= 0 || separatorIndex >= normalized.length - 1) {
      continue
    }

    const title = normalized.slice(0, separatorIndex).trim()
    const desc = normalized.slice(separatorIndex + 1).trim()
    if (title && desc) {
      return { title, desc }
    }
  }

  return null
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

function toConfigNumberArray(value: unknown, fallback: number[], min: number, max: number): number[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const result = value
    .map((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) {
        return item
      }

      if (typeof item === 'string') {
        const parsed = Number(item)
        return Number.isFinite(parsed) ? parsed : Number.NaN
      }

      return Number.NaN
    })
    .filter((item) => Number.isFinite(item))
    .map((item) => Math.min(Math.max(Math.round(item), min), max))

  if (result.length === 0) {
    return fallback
  }

  return Array.from(new Set(result))
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

function toConfigAboutFeatures(value: unknown, fallback: HomeAboutFeature[]): HomeAboutFeature[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const parsed = value
    .map((item) => {
      if (typeof item === 'string') {
        return parseAboutFeatureLine(item)
      }

      if (typeof item !== 'object' || item === null) {
        return null
      }

      const title = 'title' in item && typeof item.title === 'string' ? item.title.trim() : ''
      const desc = 'desc' in item && typeof item.desc === 'string' ? item.desc.trim() : ''

      if (!title || !desc) {
        return null
      }

      return { title, desc }
    })
    .filter((item): item is HomeAboutFeature => Boolean(item))

  return parsed.length > 0 ? parsed : fallback
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
    heroStatAdoptedValue: toConfigString(
      source?.[HOME_CONFIG_KEYS.heroStatAdoptedValue],
      DEFAULT_HOME_DISPLAY_CONFIG.heroStatAdoptedValue
    ),
    heroStatAdoptedLabel: toConfigString(
      source?.[HOME_CONFIG_KEYS.heroStatAdoptedLabel],
      DEFAULT_HOME_DISPLAY_CONFIG.heroStatAdoptedLabel
    ),
    heroStatRatingValue: toConfigString(
      source?.[HOME_CONFIG_KEYS.heroStatRatingValue],
      DEFAULT_HOME_DISPLAY_CONFIG.heroStatRatingValue
    ),
    heroStatRatingLabel: toConfigString(
      source?.[HOME_CONFIG_KEYS.heroStatRatingLabel],
      DEFAULT_HOME_DISPLAY_CONFIG.heroStatRatingLabel
    ),
    heroStatStockValue: toConfigString(
      source?.[HOME_CONFIG_KEYS.heroStatStockValue],
      DEFAULT_HOME_DISPLAY_CONFIG.heroStatStockValue
    ),
    heroStatStockLabel: toConfigString(
      source?.[HOME_CONFIG_KEYS.heroStatStockLabel],
      DEFAULT_HOME_DISPLAY_CONFIG.heroStatStockLabel
    ),
    heroBackgroundImage: toConfigString(source?.[HOME_CONFIG_KEYS.heroBackgroundImage], DEFAULT_HOME_DISPLAY_CONFIG.heroBackgroundImage),
    marqueeItems: toConfigStringArray(source?.[HOME_CONFIG_KEYS.marqueeItems], [...DEFAULT_HOME_DISPLAY_CONFIG.marqueeItems]),
    productsSectionEyebrow: toConfigString(
      source?.[HOME_CONFIG_KEYS.productsSectionEyebrow],
      DEFAULT_HOME_DISPLAY_CONFIG.productsSectionEyebrow
    ),
    productsSectionTitle: toConfigString(
      source?.[HOME_CONFIG_KEYS.productsSectionTitle],
      DEFAULT_HOME_DISPLAY_CONFIG.productsSectionTitle
    ),
    productsSectionSub: toConfigString(
      source?.[HOME_CONFIG_KEYS.productsSectionSub],
      DEFAULT_HOME_DISPLAY_CONFIG.productsSectionSub
    ),
    productsMoreButtonText: toConfigString(
      source?.[HOME_CONFIG_KEYS.productsMoreButtonText],
      DEFAULT_HOME_DISPLAY_CONFIG.productsMoreButtonText
    ),
    aboutSectionEyebrow: toConfigString(source?.[HOME_CONFIG_KEYS.aboutSectionEyebrow], DEFAULT_HOME_DISPLAY_CONFIG.aboutSectionEyebrow),
    aboutTitleLine1: toConfigString(source?.[HOME_CONFIG_KEYS.aboutTitleLine1], DEFAULT_HOME_DISPLAY_CONFIG.aboutTitleLine1),
    aboutTitleEmphasis: toConfigString(source?.[HOME_CONFIG_KEYS.aboutTitleEmphasis], DEFAULT_HOME_DISPLAY_CONFIG.aboutTitleEmphasis),
    aboutParagraph1: toConfigString(source?.[HOME_CONFIG_KEYS.aboutParagraph1], DEFAULT_HOME_DISPLAY_CONFIG.aboutParagraph1),
    aboutParagraph2: toConfigString(source?.[HOME_CONFIG_KEYS.aboutParagraph2], DEFAULT_HOME_DISPLAY_CONFIG.aboutParagraph2),
    aboutParagraph3: toConfigString(source?.[HOME_CONFIG_KEYS.aboutParagraph3], DEFAULT_HOME_DISPLAY_CONFIG.aboutParagraph3),
    aboutButtonText: toConfigString(source?.[HOME_CONFIG_KEYS.aboutButtonText], DEFAULT_HOME_DISPLAY_CONFIG.aboutButtonText),
    aboutFeatures: toConfigAboutFeatures(
      source?.[HOME_CONFIG_KEYS.aboutFeatures],
      DEFAULT_HOME_DISPLAY_CONFIG.aboutFeatures.map((item) => ({ ...item }))
    ),
    productsDisplayIds: toConfigNumberArray(
      source?.[HOME_CONFIG_KEYS.productsDisplayIds],
      [...DEFAULT_HOME_DISPLAY_CONFIG.productsDisplayIds],
      1,
      Number.MAX_SAFE_INTEGER
    ),
    productsImageOverrides: toConfigStringArray(
      source?.[HOME_CONFIG_KEYS.productsImageOverrides],
      [...DEFAULT_HOME_DISPLAY_CONFIG.productsImageOverrides]
    ),
    layoutMaxWidth: toConfigNumber(source?.[HOME_CONFIG_KEYS.layoutMaxWidth], DEFAULT_HOME_DISPLAY_CONFIG.layoutMaxWidth, 960, 2560),
    showcaseBackgroundImages: toConfigStringArray(
      source?.[HOME_CONFIG_KEYS.showcaseBackgroundImages],
      [...DEFAULT_HOME_DISPLAY_CONFIG.showcaseBackgroundImages]
    ),
    showcaseOverlayOdd: toConfigString(source?.[HOME_CONFIG_KEYS.showcaseOverlayOdd], DEFAULT_HOME_DISPLAY_CONFIG.showcaseOverlayOdd),
    showcaseOverlayEven: toConfigString(source?.[HOME_CONFIG_KEYS.showcaseOverlayEven], DEFAULT_HOME_DISPLAY_CONFIG.showcaseOverlayEven),
  }
}
