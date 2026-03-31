import { useEffect, useMemo, useState } from 'react'
import configService from '@/services/config'
import type { SeoConfig } from '@/types'

const SEO_CONFIG_KEYS = {
  siteTitle: 'seo_site_title',
  siteDescription: 'seo_site_description',
  siteKeywords: 'seo_site_keywords',
  ogImage: 'seo_og_image',
  googleVerify: 'seo_google_verify',
} as const

const DEFAULT_SEO_CONFIG: SeoConfig = {
  siteTitle: 'NewShop - 新零售电商平台',
  siteDescription: 'NewShop 是一个基于 Go 与 React 构建的现代化电商平台，提供商品、订单、会员与营销等完整能力。',
  siteKeywords: 'NewShop,电商,新零售,购物平台',
  ogImage: '',
  googleVerify: '',
}

export interface SeoInput extends Partial<SeoConfig> {
  title?: string
  description?: string
  keywords?: string
}

function createHeadMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([key, value]) => {
      element!.setAttribute(key, value)
    })
    document.head.appendChild(element)
  }

  return element
}

function setMetaByName(name: string, content: string) {
  if (!content.trim()) {
    document.head.querySelector(`meta[name="${name}"]`)?.remove()
    return
  }

  const meta = createHeadMeta(`meta[name="${name}"]`, { name })
  meta.setAttribute('content', content)
}

function setMetaByProperty(property: string, content: string) {
  if (!content.trim()) {
    document.head.querySelector(`meta[property="${property}"]`)?.remove()
    return
  }

  const meta = createHeadMeta(`meta[property="${property}"]`, { property })
  meta.setAttribute('content', content)
}

function setSeoToDocument(config: SeoConfig) {
  document.title = config.siteTitle
  setMetaByName('description', config.siteDescription)
  setMetaByName('keywords', config.siteKeywords)
  setMetaByName('google-site-verification', config.googleVerify)
  setMetaByProperty('og:title', config.siteTitle)
  setMetaByProperty('og:description', config.siteDescription)
  setMetaByProperty('og:image', config.ogImage)
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

export function resolveSeo(overrides?: SeoInput, source?: Record<string, unknown>): SeoConfig {
  const base: SeoConfig = {
    siteTitle: toStringValue(source?.[SEO_CONFIG_KEYS.siteTitle], DEFAULT_SEO_CONFIG.siteTitle),
    siteDescription: toStringValue(source?.[SEO_CONFIG_KEYS.siteDescription], DEFAULT_SEO_CONFIG.siteDescription),
    siteKeywords: toStringValue(source?.[SEO_CONFIG_KEYS.siteKeywords], DEFAULT_SEO_CONFIG.siteKeywords),
    ogImage: toStringValue(source?.[SEO_CONFIG_KEYS.ogImage], DEFAULT_SEO_CONFIG.ogImage),
    googleVerify: toStringValue(source?.[SEO_CONFIG_KEYS.googleVerify], DEFAULT_SEO_CONFIG.googleVerify),
  }

  return {
    siteTitle: overrides?.title ?? overrides?.siteTitle ?? base.siteTitle,
    siteDescription: overrides?.description ?? overrides?.siteDescription ?? base.siteDescription,
    siteKeywords: overrides?.keywords ?? overrides?.siteKeywords ?? base.siteKeywords,
    ogImage: overrides?.ogImage ?? base.ogImage,
    googleVerify: overrides?.googleVerify ?? base.googleVerify,
  }
}

export function applySeo(overrides?: SeoInput, source?: Record<string, unknown>) {
  const resolved = resolveSeo(overrides, source)
  setSeoToDocument(resolved)
  return resolved
}

export function useSeo(overrides?: SeoInput) {
  const [configMap, setConfigMap] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadSeoConfig = async () => {
      try {
        const data = await configService.getPublicConfigs()
        if (active) {
          setConfigMap(data)
        }
      } catch {
        if (active) {
          setConfigMap({})
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSeoConfig()

    return () => {
      active = false
    }
  }, [])

  const resolved = useMemo(() => resolveSeo(overrides, configMap), [configMap, overrides])

  useEffect(() => {
    setSeoToDocument(resolved)
  }, [resolved])

  return {
    seo: resolved,
    loading,
    refresh: async () => {
      const data = await configService.getPublicConfigs()
      setConfigMap(data)
      return resolveSeo(overrides, data)
    },
  }
}

export { DEFAULT_SEO_CONFIG, SEO_CONFIG_KEYS }
