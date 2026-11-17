/** Page shell: document head, header with mobile nav, footer. */
import type { ReactNode } from 'react';
import { markPaths } from '../../../01-Brand-System/Logos/concepts/mark.ts';
import { config } from '../../site.config.ts';
import { footerNav, legalNav, nav } from '../content/site.ts';
import { SeoHead, type PageMeta } from '../lib/seo.tsx';
import { CtaLink, Icon } from './ui.tsx';

/** Hashed asset URLs, set by the build script before rendering. */
export const assets = { css: '/css/site.css', js: '/js/site.js' };

/** Public runtime config exposed to site.js (no secrets: endpoints are public by nature). */
function runtimeConfig() {
  return {
    formEndpoint: config.formEndpoint || null,
    analytics: config.analytics.provider ? config.analytics : null,
    errorEndpoint: config.errorEndpoint || null,
    preview: config.isPreview,
  };
}

export function Logo({ tone = 'on-dark' }: { tone?: 'on-dark' | 'on-light' }) {
  return (
    <span className={`logo logo--${tone}`}>
      {/* Concept mark — pending approval (D-005). Swap in mark.ts. */}
      <svg className="logo__mark" viewBox="0 0 64 64" width="34" height="34" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: markPaths(tone) }} />
      <span className="logo__text">
        <span className="logo__name">Reale Revenue</span>
        <span className="logo__sub">Systems</span>
      </span>
    </span>
  );
}

function Header({ path }: { path: string }) {
  const isCurrent = (href: string) => (href !== '/' && !href.includes('#') && path.startsWith(href) ? 'page' : undefined);
  return (
    <header className="site-header" data-header="">
      <div className="container site-header__inner">
        <a href="/" className="site-header__brand" aria-label="Reale Revenue Systems home">
          <Logo />
        </a>
        <nav className="site-nav" aria-label="Main" id="site-nav" data-nav="">
          <ul>
            {nav.map((n) => (
              <li key={n.href}><a href={n.href} aria-current={isCurrent(n.href)}>{n.label}</a></li>
            ))}
          </ul>
          <CtaLink href="/free-snapshot/" cta="snapshot-nav" size="sm" className="site-nav__cta">Free Snapshot</CtaLink>
        </nav>
        <button type="button" className="menu-toggle" aria-controls="site-nav" aria-expanded="false" data-menu-toggle="">
          <span className="menu-toggle__open"><Icon name="menu" size={22} /></span>
          <span className="menu-toggle__close"><Icon name="close" size={22} /></span>
          <span className="sr-only">Menu</span>
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Logo />
            <p className="site-footer__tag">Get Discovered. Get Chosen. Get Booked.</p>
            <p className="site-footer__area">Serving {config.company.serviceArea.slice(0, -1).join(', ')} and {config.company.serviceArea.at(-1)}, {config.company.region}.</p>
            {config.publicEmail ? <p><a href={`mailto:${config.publicEmail}`}>{config.publicEmail}</a></p> : null}
            {config.publicPhone ? <p><a href={`tel:${config.publicPhone.replace(/[^+\d]/g, '')}`}>{config.publicPhone}</a></p> : null}
          </div>
          {footerNav.map((col) => (
            <nav key={col.heading} className="site-footer__col" aria-label={col.heading}>
              <h2>{col.heading}</h2>
              <ul>
                {col.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <div className="site-footer__bottom">
          <p>© {new Date().getFullYear()} {config.company.name}, a {config.company.parent} company.</p>
          <ul>
            {legalNav.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
            {config.analytics.provider === 'ga4' ? <li><button type="button" className="linklike" data-consent-open="">Cookie settings</button></li> : null}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/** Sticky mobile CTA everywhere except where the form already is. */
const showStickyCta = (path: string) => !path.startsWith('/free-snapshot/') && path !== '/contact/' && path !== '/404.html';

/** Shown only when GA4 is configured: analytics loads after an explicit "Allow". */
function ConsentBanner() {
  return (
    <section className="consent-banner" data-consent-banner="" hidden aria-labelledby="consent-title">
      <div className="consent-banner__inner">
        <div>
          <h2 id="consent-title">Allow analytics cookies?</h2>
          <p>We use Google Analytics to see which pages help visitors. It stays off unless you allow it. <a href="/privacy/">Privacy policy</a></p>
        </div>
        <div className="consent-banner__actions">
          <button type="button" className="btn btn--ghost-dark" data-consent="denied">Decline</button>
          <button type="button" className="btn btn--primary" data-consent="granted">Allow</button>
        </div>
      </div>
    </section>
  );
}

export function Document({ meta, children, bodyClass = '' }: { meta: PageMeta; children: ReactNode; bodyClass?: string }) {
  return (
    <html lang="en-US" className="no-js">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.replace('no-js','js')" }} />
        <SeoHead meta={meta} />
        <meta name="theme-color" content="#081020" />
        <link rel="preload" href="/fonts/inter-400.woff" as="font" type="font/woff" crossOrigin="" />
        <link rel="preload" href="/fonts/inter-display-700.woff" as="font" type="font/woff" crossOrigin="" />
        <link rel="stylesheet" href={assets.css} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script type="application/json" id="rrs-config" dangerouslySetInnerHTML={{ __html: JSON.stringify(runtimeConfig()) }} />
        <script src={assets.js} defer />
      </head>
      <body className={bodyClass || undefined}>
        <a className="skip-link" href="#main">Skip to content</a>
        {config.isPreview ? <div className="preview-bar" role="note">Preview build · not published{config.formEndpoint ? '' : ' · forms send nothing'}</div> : null}
        <Header path={meta.path} />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
        {showStickyCta(meta.path) ? (
          <div className="mobile-cta" data-mobile-cta="" hidden>
            <CtaLink href="/free-snapshot/" cta="snapshot-sticky" arrow>Get My Free Snapshot</CtaLink>
          </div>
        ) : null}
        {config.analytics.provider === 'ga4' ? <ConsentBanner /> : null}
      </body>
    </html>
  );
}
