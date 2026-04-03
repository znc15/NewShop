import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  resolveFooterDisplayConfig,
  type FooterDisplayConfig,
  type FooterNavLink,
  type FooterSocialLink,
  type FooterSocialPlatform,
} from '@/lib/footerConfig'
import './site-footer.css'

interface SiteFooterProps {
  configSource?: Record<string, unknown>
}

function isAbsoluteUrl(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

function isMailOrTelLink(href: string): boolean {
  return href.startsWith('mailto:') || href.startsWith('tel:')
}

function renderNavLink(link: FooterNavLink, className: string) {
  if (isAbsoluteUrl(link.href) || isMailOrTelLink(link.href) || link.href.startsWith('#')) {
    return (
      <a
        href={link.href}
        className={className}
        target={link.newTab ? '_blank' : undefined}
        rel={link.newTab ? 'noreferrer noopener' : undefined}
      >
        {link.label}
      </a>
    )
  }

  return (
    <Link className={className} to={link.href}>
      {link.label}
    </Link>
  )
}

function getSocialIcon(platform: FooterSocialPlatform) {
  switch (platform) {
    case 'weibo':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9.31 13.53c-2.227 0-4.02 1.43-4.02 3.2 0 1.76 1.793 3.19 4.02 3.19 2.226 0 4.02-1.43 4.02-3.19 0-1.77-1.794-3.2-4.02-3.2zm0 5.04c-1.106 0-2-.84-2-1.84s.894-1.83 2-1.83c1.105 0 2 .83 2 1.83s-.895 1.84-2 1.84z" />
          <path d="M20.065 10.02c.097-.32.15-.65.15-.99C20.215 6.79 18.2 5 15.75 5c-1.695 0-3.17.85-3.99 2.13-.67-.19-1.38-.3-2.12-.3C5.87 6.83 2.5 9.72 2.5 13.27c0 3.55 3.37 6.44 7.14 6.44 3.768 0 6.81-2.89 6.81-6.44 0-.51-.07-1-.19-1.47.42-.08.83-.18 1.23-.32.82-.27 1.58-.67 2.18-1.19.6-.52 1.07-1.17 1.35-1.91l.05-.16-.01-.18zM9.64 18.58c-3.05 0-5.52-2.34-5.52-5.23 0-2.88 2.47-5.23 5.52-5.23.68 0 1.33.13 1.93.36-.05.26-.08.52-.08.79 0 2.75 2.52 4.98 5.62 4.98.13 0 .26-.01.39-.02-.79 2.37-3.1 4.35-7.86 4.35z" />
        </svg>
      )
    case 'twitter':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case 'discord':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
        </svg>
      )
    case 'bilibili':
      return (
        <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z" />
        </svg>
      )
    default:
      return null
  }
}

function renderSocialLink(link: FooterSocialLink) {
  if (isAbsoluteUrl(link.href) || isMailOrTelLink(link.href) || link.href.startsWith('#')) {
    return (
      <a
        href={link.href}
        className="site-footer-social-btn"
        title={link.label}
        aria-label={link.label}
        target={link.newTab ? '_blank' : undefined}
        rel={link.newTab ? 'noreferrer noopener' : undefined}
      >
        {getSocialIcon(link.platform)}
      </a>
    )
  }

  return (
    <Link to={link.href} className="site-footer-social-btn" title={link.label} aria-label={link.label}>
      {getSocialIcon(link.platform)}
    </Link>
  )
}

function renderLinkList(title: string, links: FooterNavLink[]) {
  return (
    <div>
      <div className="site-footer-col-title">{title}</div>
      <ul className="site-footer-links">
        {links.map((link) => (
          <li key={`${title}-${link.label}-${link.href}`}>
            {renderNavLink(link, 'site-footer-link')}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FooterView({ config }: { config: FooterDisplayConfig }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div>
            <span className="site-footer-brand-logo">
              {config.brandName}
              <span>{config.brandHighlight}</span>
            </span>
            <p className="site-footer-about">{config.aboutText}</p>
            <div className="site-footer-socials">
              {config.socialLinks
                .filter((item) => item.enabled !== false)
                .map((item) => (
                  <span key={`${item.platform}-${item.label}-${item.href}`}>{renderSocialLink(item)}</span>
                ))}
            </div>
          </div>
          {renderLinkList(config.categoryTitle, config.categoryLinks)}
          {renderLinkList(config.serviceTitle, config.serviceLinks)}
          {renderLinkList(config.aboutTitle, config.aboutLinks)}
        </div>

        <div className="site-footer-bottom">
          <span>{config.copyrightText}</span>
          <div className="site-footer-bottom-right">
            {config.policyLinks.map((link) => (
              <span key={`policy-${link.label}-${link.href}`}>{renderNavLink(link, 'site-footer-policy-link')}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function SiteFooter({ configSource }: SiteFooterProps) {
  const footerConfig = useMemo(() => resolveFooterDisplayConfig(configSource), [configSource])
  return <FooterView config={footerConfig} />
}
