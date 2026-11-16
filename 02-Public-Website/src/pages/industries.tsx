import { offerById } from '../../../03-Offers-and-Pricing/offer-catalog.ts';
import { industries, industryBySlug, secondaryIndustries, type IndustryContent } from '../content/industries.ts';
import { services } from '../content/services.ts';
import { faqSchema, type PageMeta } from '../lib/seo.tsx';
import { CheckList, CtaBand, CtaLink, Faq, Icon, PageHero, Section, SectionHead } from '../components/ui.tsx';

const crumbsFor = (i?: IndustryContent) => [
  { name: 'Home', path: '/' },
  { name: 'Industries', path: '/industries/' },
  ...(i ? [{ name: i.name, path: `/industries/${i.slug}/` }] : []),
];

export const industriesHubMeta: PageMeta = {
  path: '/industries/',
  title: 'Industries We Serve: Home Services, Detailing, Property Management & More',
  description: 'Local growth systems for Phoenix-area home-service contractors, detailers, property managers, recurring-service businesses, remodelers and professional firms.',
  breadcrumbs: crumbsFor(),
};

export function IndustriesHubPage() {
  return (
    <>
      <PageHero crumbs={crumbsFor()} eyebrow="Industries" title="Every industry leaks customers differently." lede="We start from how your customers actually search, compare and book, then recommend the part of the system that matters most for your business." />
      <Section tone="canvas" labelledBy="primary-ind">
        <SectionHead id="primary-ind" title="Where we focus" />
        <ul className="ind-cards">
          {industries.map((i) => (
            <li key={i.slug} className="ind-card">
              <h3><a href={`/industries/${i.slug}/`}>{i.name}</a></h3>
              <p className="ind-card__ex">{i.examples.join(' · ')}</p>
              <p>{i.description}</p>
              <p className="ind-card__start">Usually starts with <b>{offerById(i.startWith)!.name}</b></p>
            </li>
          ))}
        </ul>
      </Section>
      <Section tone="white" labelledBy="secondary-ind">
        <SectionHead id="secondary-ind" title="Also serving" lede="For these industries we start with a conversation, so the right existing offer and the right compliance rules come first." />
        <ul className="secondary-list">
          {secondaryIndustries.map((s) => (
            <li key={s.name}><a href={s.href}><b>{s.name}</b><span>{s.note}</span></a></li>
          ))}
        </ul>
      </Section>
      <CtaBand location="industries-hub" title="See how your business compares." text="The free Snapshot includes a comparison with nearby competitors in your category." />
    </>
  );
}

export function industryMeta(slug: string): PageMeta {
  const i = industryBySlug(slug)!;
  return { path: `/industries/${slug}/`, title: i.seoTitle, description: i.description, breadcrumbs: crumbsFor(i), schema: [faqSchema(i.faq)] };
}

export function IndustryPage({ slug }: { slug: string }) {
  const i = industryBySlug(slug)!;
  const start = offerById(i.startWith)!;
  const startSvc = services.find((s) => s.offerId === i.startWith);
  return (
    <>
      <PageHero crumbs={crumbsFor(i)} eyebrow={`${i.name} · ${i.short}`} title={i.h1} lede={i.intro}>
        <div className="hero__ctas">
          <CtaLink href={`/free-snapshot/?industry=${i.slug}`} cta={`snapshot-ind-${i.slug}`} size="lg" arrow>Get My Free Local Revenue Snapshot</CtaLink>
        </div>
      </PageHero>
      <Section tone="canvas" labelledBy="moments">
        <SectionHead id="moments" eyebrow="Moments that decide the job" title={`Where ${i.name.toLowerCase()} businesses win or lose customers`} />
        <ul className="moment-grid">
          {i.moments.map((m) => <li key={m.title} className="moment"><h3>{m.title}</h3><p>{m.text}</p></li>)}
        </ul>
      </Section>
      <Section tone="white" labelledBy="check-first">
        <div className="split split--top">
          <div>
            <SectionHead id="check-first" eyebrow="Your Snapshot" title="What we often check first" lede="These are starting points, not assumptions about your business. Your Snapshot reports what we actually find." />
            <CheckList items={i.checkFirst} />
            {i.notes ? <p className="muted-note"><Icon name="shield" size={16} /> {i.notes}</p> : null}
          </div>
          <div className="panel-light">
            <p className="eyebrow">Common starting point</p>
            <h3>{start.name}</h3>
            <p>{i.startWhy}</p>
            {startSvc ? <a className="link-arrow" href={`/services/${startSvc.slug}/`}>How it works <Icon name="arrow" size={16} /></a> : <a className="link-arrow" href="/pricing/">See pricing <Icon name="arrow" size={16} /></a>}
            {i.related ? (
              <div className="panel-light__related">
                <p className="eyebrow">Specialist offer</p>
                <h3>{i.related.name}</h3>
                <p>{i.related.note}</p>
                <a className="link-arrow" href={i.related.href}>Ask about it <Icon name="arrow" size={16} /></a>
              </div>
            ) : null}
          </div>
        </div>
      </Section>
      <Section tone="canvas" labelledBy="ind-faq">
        <div className="split split--top">
          <SectionHead id="ind-faq" eyebrow="FAQ" title="Questions we hear" />
          <Faq items={i.faq} idPrefix={`${i.slug}-faq`} />
        </div>
      </Section>
      <CtaBand location={`ind-${i.slug}`} title={`Get a Snapshot built for ${i.short.toLowerCase()}.`} text={`We compare you with nearby ${i.examples[0]!.toLowerCase()} businesses and show where customers may be slipping away.`} />
    </>
  );
}
