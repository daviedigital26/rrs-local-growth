import { offerById } from '../../../03-Offers-and-Pricing/offer-catalog.ts';
import { categories } from '../../../04-Audits-and-Scorecards/snapshot/framework.ts';
import { services, serviceBySlug, type ServiceContent } from '../content/services.ts';
import { faqSchema, serviceSchema, type PageMeta } from '../lib/seo.tsx';
import { CheckList, CtaBand, CtaLink, Faq, Icon, PageHero, Section, SectionHead, Steps } from '../components/ui.tsx';
import { PricingCard } from '../components/pricing.tsx';
import { SystemDiagram } from '../components/visuals.tsx';

const crumbsFor = (s?: ServiceContent) => [
  { name: 'Home', path: '/' },
  { name: 'Services', path: '/services/' },
  ...(s ? [{ name: s.navLabel, path: `/services/${s.slug}/` }] : []),
];

export const servicesHubMeta: PageMeta = {
  path: '/services/',
  title: 'Local Growth Services: SEO, AI Visibility, Reviews, Websites & Follow-Up',
  description: 'Five focused programs, one connected system: local SEO, AI search visibility, reputation, website conversion and lead follow-up for Phoenix-area businesses.',
  breadcrumbs: crumbsFor(),
};

export function ServicesHubPage() {
  return (
    <>
      <PageHero crumbs={crumbsFor()} eyebrow="Services" title="Fix the leak that costs you most, then connect the rest." lede="Each program focuses on one part of the Local Revenue System. Your free Snapshot shows which one to start with." />
      <Section tone="canvas" labelledBy="svc-list">
        <h2 id="svc-list" className="sr-only">Programs</h2>
        <ul className="svc-rows">
          {services.map((s) => {
            const o = offerById(s.offerId)!;
            return (
              <li key={s.slug} className="svc-row">
                <span className="svc-row__icon"><Icon name={s.icon} size={26} /></span>
                <div className="svc-row__body">
                  <p className="eyebrow">{o.stage}</p>
                  <h3><a href={`/services/${s.slug}/`}>{o.name}</a></h3>
                  <p>{o.customer.summary}</p>
                </div>
                <a className="link-arrow" href={`/services/${s.slug}/`} aria-label={`${o.name} details`}>Details <Icon name="arrow" size={16} /></a>
              </li>
            );
          })}
        </ul>
      </Section>
      <Section tone="white" labelledBy="svc-system">
        <SectionHead id="svc-system" eyebrow="How they fit" title="Five parts, one system" />
        <SystemDiagram />
      </Section>
      <CtaBand location="services-hub" title="Not sure where to start?" text="The free Snapshot scores all five parts and recommends one starting point." />
    </>
  );
}

export function serviceMeta(slug: string): PageMeta {
  const s = serviceBySlug(slug)!;
  const o = offerById(s.offerId)!;
  return {
    path: `/services/${slug}/`,
    title: s.seoTitle,
    description: s.description,
    breadcrumbs: crumbsFor(s),
    schema: [serviceSchema(o.name, s.description, `/services/${slug}/`, { setup: o.price.setup, monthly: o.price.monthly }), faqSchema(s.faq)],
  };
}

export function ServicePage({ slug }: { slug: string }) {
  const s = serviceBySlug(slug)!;
  const o = offerById(s.offerId)!;
  const cat = categories.find((c) => c.id === s.category)!;
  return (
    <>
      <PageHero crumbs={crumbsFor(s)} eyebrow={s.eyebrow} title={s.h1} lede={s.intro}>
        <div className="hero__ctas">
          <CtaLink href={`/free-snapshot/?interest=${o.id}`} cta={`snapshot-${s.slug}`} size="lg" arrow>Get My Free Local Revenue Snapshot</CtaLink>
          <CtaLink href="#pricing" variant="ghost" size="lg" cta={`price-${s.slug}`}>See pricing</CtaLink>
        </div>
      </PageHero>

      <Section tone="canvas" labelledBy="signs">
        <div className="split split--top">
          <SectionHead id="signs" eyebrow="Signs this is your leak" title="Sound familiar?" />
          <CheckList items={s.signs} />
        </div>
      </Section>

      <Section tone="white" labelledBy="process">
        <SectionHead id="process" eyebrow="How it works" title={`What ${o.shortName} does`} />
        <Steps steps={s.process} />
      </Section>

      <Section tone="ink" labelledBy="get">
        <div className="split split--top">
          <div>
            <SectionHead id="get" eyebrow="What you get" title={o.customer.headline} />
            <ul className="bullets-on-dark">{o.customer.whatYouGet.map((w) => <li key={w}><Icon name="check" size={18} /> {w}</li>)}</ul>
          </div>
          <div className="panel-dark">
            <h3>What we check in your Snapshot</h3>
            <p className="panel-dark__sub">{cat.name}: {cat.criteria.length} criteria, 20 points</p>
            <ul className="crit-list">{cat.criteria.map((c) => <li key={c.id}><span>{c.label}</span><b>{c.points} pts</b></li>)}</ul>
            <a className="link-on-dark" href="/free-snapshot/methodology/">See sources and scoring rules</a>
          </div>
        </div>
      </Section>

      <Section id="pricing" tone="canvas" labelledBy="price-h">
        <div className="split split--top">
          <div>
            <SectionHead id="price-h" eyebrow="Pricing" title="Simple, published pricing" lede={`Best for: ${o.customer.bestFor}`} />
            <h3 className="h-sm">What we won’t do</h3>
            <CheckList items={s.wontDo} tone="x" />
            <h3 className="h-sm">Scope</h3>
            <ul className="plain-list">{o.scopeLimits.map((x) => <li key={x}>{x}</li>)}</ul>
            <h3 className="h-sm">Not included</h3>
            <ul className="plain-list">{o.exclusions.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <PricingCard offer={o} />
        </div>
      </Section>

      <Section tone="white" labelledBy="svc-faq">
        <div className="split split--top">
          <SectionHead id="svc-faq" eyebrow="FAQ" title={`${o.shortName} questions`} />
          <Faq items={s.faq} idPrefix={`${s.slug}-faq`} />
        </div>
      </Section>

      <Section tone="canvas" labelledBy="related">
        <SectionHead id="related" eyebrow="Related" title="Works well with" />
        <ul className="related-grid">
          {s.related.map((r) => {
            const rs = serviceBySlug(r)!;
            const ro = offerById(rs.offerId)!;
            return (
              <li key={r}><a className="industry-tile" href={`/services/${r}/`}><span className="industry-tile__name">{ro.name}</span><span className="industry-tile__ex">{ro.tagline}</span><Icon name="arrow" size={18} /></a></li>
            );
          })}
        </ul>
      </Section>

      <CtaBand location={`svc-${s.slug}`} title="See where you stand first." text={`Your free Snapshot scores ${cat.name.toLowerCase()} and four other categories, with sources for every finding.`} />
    </>
  );
}
