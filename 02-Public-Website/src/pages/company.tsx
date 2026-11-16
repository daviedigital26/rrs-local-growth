import { config } from '../../site.config.ts';
import { legalDocs } from '../content/legal.ts';
import { CONSENT_CONTACT } from '../lib/lead-payload.ts';
import { professionalServiceSchema, type PageMeta } from '../lib/seo.tsx';
import { CheckList, CtaBand, CtaLink, Icon, PageHero, Section, SectionHead } from '../components/ui.tsx';

const crumb = (name: string, path: string) => [{ name: 'Home', path: '/' }, { name, path }];

// ── About ────────────────────────────────────────────────────────────────
export const aboutMeta: PageMeta = {
  path: '/about/',
  title: 'About Reale Revenue Systems',
  description: 'Reale Revenue Systems, a Reale Labs company, helps Phoenix-area businesses get discovered, get chosen and get booked, with evidence instead of hype.',
  breadcrumbs: crumb('About', '/about/'),
  schema: [professionalServiceSchema()],
};

export function AboutPage() {
  return (
    <>
      <PageHero crumbs={aboutMeta.breadcrumbs} eyebrow="About" title="Built from the field, not from a pitch deck." lede="Reale Revenue Systems is the client-facing company of Reale Labs. We help established local businesses close the gaps between being found, being chosen and getting booked." />
      <Section tone="canvas" labelledBy="story">
        <div className="split split--top">
          <SectionHead id="story" eyebrow="Founder" title={config.company.founder} />
          <div className="prose">
            {/* CONTENT REVIEW (owner): confirm founder bio wording before publishing. */}
            <p>Before building revenue systems, {config.company.founder.split(' ')[0]} spent time cold-calling local business owners, including auto shops, detailers and realtors, to sell advertising. Those conversations showed a pattern: owners rarely need another vendor promising more traffic. They need fewer customers falling through the cracks.</p>
            <p>Reale Revenue Systems exists to find those cracks honestly and fix them in a connected way: visibility, reputation, website and follow-up working as one system.</p>
          </div>
        </div>
      </Section>
      <Section tone="white" labelledBy="principles">
        <SectionHead id="principles" eyebrow="How we work" title="Principles we won’t trade for a sale" />
        <ul className="rule-grid">
          <li><h3>Evidence over promises</h3><p>Every finding has a source and a date. If we can’t verify it, we say so.</p></li>
          <li><h3>No guarantees we can’t keep</h3><p>No promised rankings, AI placements or revenue numbers. Ever.</p></li>
          <li><h3>Consent first</h3><p>Automations that contact your customers run only with the consent the law requires, and your approval.</p></li>
          <li><h3>You own everything</h3><p>Your profiles, website, data and accounts stay in your name. We use delegated access, never your passwords.</p></li>
        </ul>
      </Section>
      <Section tone="ink" labelledBy="family">
        <SectionHead id="family" eyebrow="Part of Reale Labs" title="One company, specialised offers" lede="Alongside the Local Revenue System, Reale Labs runs specialist offers for specific industries, including Realtor Pipeline Recovery™ for real estate teams, the Property Management Profit Leak Audit and Detailer Booking Recovery." />
        <CtaLink href="/industries/" variant="ghost" cta="about-industries">See industries we serve</CtaLink>
      </Section>
      <CtaBand location="about" title="Start with the evidence." text="Your free Snapshot shows exactly what we’d look at, and what we found." />
    </>
  );
}

// ── Contact ──────────────────────────────────────────────────────────────
export const contactMeta: PageMeta = {
  path: '/contact/',
  title: 'Contact Reale Revenue Systems',
  description: 'Ask a question, request a consultation or ask about a specialist offer. Serving Phoenix, Surprise, Peoria, Glendale and Scottsdale.',
  breadcrumbs: crumb('Contact', '/contact/'),
};

const topics = [
  { value: 'general', label: 'General question' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'realtor-pipeline-recovery', label: 'Realtor Pipeline Recovery™' },
  { value: 'profit-leak-audit', label: 'Profit Leak Audit (PM)' },
  { value: 'detailer-booking-recovery', label: 'Detailer Booking Recovery' },
  { value: 'partnership', label: 'Referral partnership' },
];

export function ContactPage() {
  return (
    <>
      <PageHero crumbs={contactMeta.breadcrumbs} eyebrow="Contact" title="Let’s talk about your business." lede="For a scored look at your business, the free Snapshot is the fastest start. For anything else, send a note." />
      <Section tone="canvas" labelledBy="contact-form-h">
        <div className="split split--top">
          <div>
            <SectionHead id="contact-form-h" title="Send a message" />
            <div className="contact-alt">
              {config.bookingUrl ? <CtaLink href={config.bookingUrl} variant="secondary" cta="book-call">Book a call</CtaLink> : null}
              {config.publicEmail ? <p><Icon name="doc" size={18} /> <a href={`mailto:${config.publicEmail}`}>{config.publicEmail}</a></p> : null}
              {config.publicPhone ? <p><Icon name="phone" size={18} /> <a href={`tel:${config.publicPhone.replace(/[^+\d]/g, '')}`}>{config.publicPhone}</a></p> : null}
              <p className="muted-note">Serving {config.company.serviceArea.join(', ')} and nearby communities.</p>
              <CtaLink href="/free-snapshot/" variant="primary" cta="snapshot-contact" arrow>Get My Free Local Revenue Snapshot</CtaLink>
            </div>
          </div>
          <form className="contact-form card-form" method="post" action={config.formEndpoint || '#contact-form'} id="contact-form" data-contact-form="" noValidate aria-labelledby="contact-form-h">
            <div className="field">
              <label htmlFor="c-name">Your name <span className="req">required</span></label>
              <input id="c-name" name="contact_name" type="text" required maxLength={80} autoComplete="name" aria-describedby="err-c_contact_name" />
              <p className="field-error" id="err-c_contact_name" hidden data-error-for="contact_name" />
            </div>
            <div className="field">
              <label htmlFor="c-biz">Business name <span className="opt">optional</span></label>
              <input id="c-biz" name="business_name" type="text" maxLength={120} autoComplete="organization" />
            </div>
            <div className="field">
              <label htmlFor="c-email">Email <span className="req">required</span></label>
              <input id="c-email" name="email" type="email" required maxLength={120} autoComplete="email" aria-describedby="err-c_email" />
              <p className="field-error" id="err-c_email" hidden data-error-for="email" />
            </div>
            <div className="field">
              <label htmlFor="c-phone">Phone <span className="opt">optional</span></label>
              <input id="c-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" />
            </div>
            <div className="field">
              <p className="field__label" id="c-topic-l">Topic</p>
              <div className="chips" role="radiogroup" aria-labelledby="c-topic-l" data-field="topic">
                {topics.map((t) => <label key={t.value} className="chip"><input type="radio" name="topic" value={t.value} /><span>{t.label}</span></label>)}
              </div>
            </div>
            <div className="field">
              <label htmlFor="c-msg">Message <span className="req">required</span></label>
              <textarea id="c-msg" name="message" required maxLength={2000} rows={5} aria-describedby="err-c_message" />
              <p className="field-error" id="err-c_message" hidden data-error-for="message" />
            </div>
            <label className="consent"><input type="checkbox" name="consent_contact" value="yes" required /><span>{CONSENT_CONTACT}</span></label>
            <p className="field-error" hidden data-error-for="consent_contact" />
            <div className="hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="company_website" tabIndex={-1} autoComplete="off" /></label></div>
            <input type="hidden" name="form" value="contact" />
            <input type="hidden" name="form_started_at" value="" data-attr="form_started_at" />
            {['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer', 'landing_page', 'first_touch_at'].map((n) => <input key={n} type="hidden" name={n} value="" data-attr={n} />)}
            <button type="submit" className="btn btn--primary">Send message</button>
            <p className="form-error" data-form-error="" role="alert" hidden />
            <div className="snap-done" data-done="" hidden tabIndex={-1}>
              <Icon name="check" size={28} />
              <h3>Message received</h3>
              <p>Thanks. We’ll reply by email.</p>
              <p className="snap-done__preview" data-preview-note="" hidden>Preview mode: this site isn’t connected to an inbox yet, so nothing was sent or stored.</p>
            </div>
          </form>
        </div>
      </Section>
    </>
  );
}

// ── Case studies ─────────────────────────────────────────────────────────
export const caseStudiesMeta: PageMeta = {
  path: '/case-studies/',
  title: 'Case Studies',
  description: 'How we publish client results: only with written permission and documented data. See our sample report and methodology in the meantime.',
  breadcrumbs: crumb('Case studies', '/case-studies/'),
};

export function CaseStudiesPage() {
  return (
    <>
      <PageHero crumbs={caseStudiesMeta.breadcrumbs} eyebrow="Case studies" title="Real results, published only with permission." lede="We’re a new practice, so there are no published case studies yet. We won’t fill this page with invented ones." />
      <Section tone="canvas" labelledBy="cs-policy">
        <div className="split split--top">
          <SectionHead id="cs-policy" title="Our case-study standard" />
          <CheckList items={['Written client permission before anything is published', 'Before-and-after data with dates and sources', 'Clear about what changed and what else was going on: no unsupported cause-and-effect claims', 'No cherry-picked screenshots or rounded-up numbers']} />
        </div>
      </Section>
      <Section tone="white" labelledBy="cs-now">
        <SectionHead id="cs-now" title="What you can review today" />
        <ul className="evidence-list evidence-list--row">
          <li><Icon name="chart" size={22} /><div><h3>Sample report</h3><p>A fictional business, clearly labelled.</p><a className="link-arrow" href="/free-snapshot/sample-report/">View sample <Icon name="arrow" size={16} /></a></div></li>
          <li><Icon name="doc" size={22} /><div><h3>Methodology</h3><p>Every criterion and rule we use.</p><a className="link-arrow" href="/free-snapshot/methodology/">Read it <Icon name="arrow" size={16} /></a></div></li>
        </ul>
      </Section>
    </>
  );
}

// ── Resources ────────────────────────────────────────────────────────────
export const resourcesMeta: PageMeta = {
  path: '/resources/',
  title: 'Resources for Local Business Owners',
  description: 'Guides and checklists on Google Business Profiles, AI search, reviews, websites and lead follow-up. Coming soon.',
  breadcrumbs: crumb('Resources', '/resources/'),
};

const planned = [
  { title: 'Google Business Profile checklist', text: 'The fields, categories and habits that keep a profile accurate and complete.' },
  { title: 'AI discovery readiness checklist', text: 'How to make your business facts consistent and easy for AI assistants to describe.' },
  { title: 'The honest review-request playbook', text: 'Ask every customer, stay compliant, and respond well.' },
  { title: 'Missed-call recovery, explained', text: 'How text-back works, what consent it needs and what it costs.' },
];

export function ResourcesPage() {
  return (
    <>
      <PageHero crumbs={resourcesMeta.breadcrumbs} eyebrow="Resources" title="Practical guides for busy owners." lede="We’re writing these now. Each one will be original, specific and free of filler." />
      <Section tone="canvas" labelledBy="res-list">
        <h2 id="res-list" className="sr-only">Planned guides</h2>
        <ul className="moment-grid">
          {planned.map((p) => <li key={p.title} className="moment"><span className="badge badge--muted">Coming soon</span><h3>{p.title}</h3><p>{p.text}</p></li>)}
        </ul>
      </Section>
      <CtaBand location="resources" title="Want answers specific to your business?" text="The free Snapshot applies all of these checks to you." />
    </>
  );
}

// ── Legal (drafts) ───────────────────────────────────────────────────────
export function legalMeta(slug: 'privacy' | 'terms' | 'accessibility'): PageMeta {
  const d = legalDocs.find((x) => x.slug === slug)!;
  return { path: `/${slug}/`, title: d.title, description: d.description, breadcrumbs: crumb(d.title, `/${slug}/`) };
}

export function LegalPage({ slug }: { slug: 'privacy' | 'terms' | 'accessibility' }) {
  const d = legalDocs.find((x) => x.slug === slug)!;
  return (
    <>
      <PageHero crumbs={legalMeta(slug).breadcrumbs} tone="canvas" title={d.title} />
      <Section tone="white" labelledBy="legal-body">
        <h2 id="legal-body" className="sr-only">{d.title}</h2>
        <p className="draft-banner" role="note"><Icon name="doc" size={18} /> DRAFT: pending qualified legal review before publication.</p>
        <div className="prose">
          {d.sections.map((s) => (
            <section key={s.h}>
              <h3>{s.h}</h3>
              {s.p.map((p) => <p key={p}>{p}</p>)}
            </section>
          ))}
        </div>
      </Section>
    </>
  );
}

// ── 404 ──────────────────────────────────────────────────────────────────
export const notFoundMeta: PageMeta = { path: '/404.html', title: 'Page not found', description: 'The page you were looking for could not be found.', noindex: true };

export function NotFoundPage() {
  return (
    <PageHero eyebrow="404" title="That page isn’t here." lede="It may have moved. These links will get you back on track.">
      <div className="hero__ctas">
        <CtaLink href="/" variant="ghost">Home</CtaLink>
        <CtaLink href="/free-snapshot/" cta="snapshot-404">Get My Free Local Revenue Snapshot</CtaLink>
      </div>
    </PageHero>
  );
}
