/** Reusable UI primitives. Pure, prop-driven React (portable to Next.js). */
import type { ReactNode } from 'react';
import type { FaqItem } from '../content/site.ts';
import type { Crumb } from '../lib/seo.tsx';

const ICONS: Record<string, string> = {
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  reply: '<path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.3-4.2A7.5 7.5 0 1 1 20 11.5z"/><path d="M9 10.5h6M9 13.5h4"/>',
  browser: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M7.5 14h6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  dash: '<circle cx="12" cy="12" r="8" stroke-dasharray="2.6 2.6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  shield: '<path d="M12 3l7 3v5.5c0 4.3-3 8-7 9.5-4-1.5-7-5.2-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8.5 16v-4M12.5 16V8M16.5 16v-6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  x: '<path d="M7 7l10 10M17 7L7 17"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5"/><path d="M16 5.5a3 3 0 0 1 0 6M18 14.8c1.7.7 2.8 2.4 3 5.2"/>',
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: ICONS[name] ?? '' }} />
  );
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'light';

export function CtaLink({ href, children, variant = 'primary', cta, size, arrow = false, className = '' }: { href: string; children: ReactNode; variant?: BtnVariant; cta?: string; size?: 'lg' | 'sm'; arrow?: boolean; className?: string }) {
  return (
    <a href={href} className={`btn btn--${variant}${size ? ` btn--${size}` : ''} ${className}`.trim()} data-cta={cta}>
      <span>{children}</span>
      {arrow ? <Icon name="arrow" size={18} /> : null}
    </a>
  );
}

export function Section({ id, tone = 'canvas', children, className = '', labelledBy }: { id?: string; tone?: 'canvas' | 'white' | 'ink' | 'ink-deep'; children: ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section id={id} className={`section section--${tone} ${className}`.trim()} aria-labelledby={labelledBy}>
      <div className="container">{children}</div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, id, lede, align = 'left' }: { eyebrow?: string; title: ReactNode; id: string; lede?: ReactNode; align?: 'left' | 'center' }) {
  return (
    <header className={`section-head section-head--${align}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 id={id}>{title}</h2>
      {lede ? <p className="lede">{lede}</p> : null}
    </header>
  );
}

/** Mandatory label on every demonstration (DECISIONS D-008). */
export function DemoLabel({ children = 'Fictional example' }: { children?: ReactNode }) {
  return (
    <p className="demo-label" data-demo-label="">
      <Icon name="dash" size={14} />
      <span>{children}</span>
    </p>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'positive' | 'cobalt' | 'muted' | 'warn' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function CheckList({ items, tone = 'check' }: { items: string[]; tone?: 'check' | 'x' }) {
  return (
    <ul className={`checklist checklist--${tone}`}>
      {items.map((i) => (
        <li key={i}>
          <Icon name={tone === 'x' ? 'x' : 'check'} size={18} />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {crumbs.map((c, i) => (
          <li key={c.path}>
            {i < crumbs.length - 1 ? <a href={c.path}>{c.name}</a> : <span aria-current="page">{c.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Faq({ items, idPrefix = 'faq' }: { items: FaqItem[]; idPrefix?: string }) {
  return (
    <div className="faq">
      {items.map((f, i) => (
        <details key={f.q} className="faq__item" id={`${idPrefix}-${i + 1}`}>
          <summary>
            <span>{f.q}</span>
            <span className="faq__icon" aria-hidden="true" />
          </summary>
          <div className="faq__a"><p>{f.a}</p></div>
        </details>
      ))}
    </div>
  );
}

export function Steps({ steps, numbered = true }: { steps: Array<{ title: string; text: string }>; numbered?: boolean }) {
  return (
    <ol className={`steps${numbered ? '' : ' steps--plain'}`}>
      {steps.map((s, i) => (
        <li key={s.title} className="steps__item">
          <span className="steps__n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function CtaBand({ title, text, location }: { title: string; text: string; location: string }) {
  return (
    <section className="cta-band" aria-labelledby={`cta-${location}`}>
      <div className="container cta-band__inner">
        <div>
          <h2 id={`cta-${location}`}>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="cta-band__actions">
          <CtaLink href="/free-snapshot/" cta={`snapshot-${location}`} size="lg" arrow>Get My Free Local Revenue Snapshot</CtaLink>
          <a className="cta-band__sub" href="/free-snapshot/sample-report/">See a sample report</a>
        </div>
      </div>
    </section>
  );
}

export function PageHero({ eyebrow, title, lede, crumbs, children, tone = 'ink' }: { eyebrow?: string; title: ReactNode; lede?: ReactNode; crumbs?: Crumb[]; children?: ReactNode; tone?: 'ink' | 'canvas' }) {
  return (
    <header className={`page-hero page-hero--${tone}`}>
      <div className="container">
        {crumbs ? <Breadcrumbs crumbs={crumbs} /> : null}
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {lede ? <p className="page-hero__lede">{lede}</p> : null}
        {children}
      </div>
    </header>
  );
}
