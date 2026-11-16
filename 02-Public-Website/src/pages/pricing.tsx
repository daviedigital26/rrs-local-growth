import { offers } from '../../../03-Offers-and-Pricing/offer-catalog.ts';
import { usd } from '../../../03-Offers-and-Pricing/format.ts';
import { flagshipComparison } from '../../../03-Offers-and-Pricing/cost-model.ts';
import { services } from '../content/services.ts';
import { faqSchema, serviceSchema, type PageMeta } from '../lib/seo.tsx';
import { AddOnTable, PricingCard } from '../components/pricing.tsx';
import { CtaBand, Faq, PageHero, Section, SectionHead } from '../components/ui.tsx';

const pricingFaq = [
  { q: 'Why is there a setup fee?', a: 'Setup covers the audit, corrections and configuration that create the first improvements. The monthly fee covers ongoing monitoring, improvements and reporting.' },
  { q: 'What are usage-based costs?', a: 'Text messages, calling minutes, phone numbers and carrier registration used by follow-up automation. They’re billed at cost and estimated in writing before anything goes live.' },
  { q: 'Can I switch plans?', a: 'Yes. When you move to Local Revenue Dominator™, it replaces the overlapping smaller programs instead of stacking on top of them.' },
  { q: 'Do prices include ad spend or software subscriptions you don’t manage?', a: 'No. Ad spend, hosting, domains and your own platform subscriptions stay in your name and are paid directly by you.' },
];

const crumbs = [{ name: 'Home', path: '/' }, { name: 'Pricing', path: '/pricing/' }];

export const pricingMeta: PageMeta = {
  path: '/pricing/',
  title: 'Pricing: Local SEO, AI Visibility, Reviews, Websites & Lead Follow-Up',
  description: 'Transparent setup and monthly pricing for every Reale Revenue Systems program, plus add-ons. Usage-based messaging costs billed at cost.',
  breadcrumbs: crumbs,
  schema: [...offers.map((o) => serviceSchema(o.name, o.customer.summary, `/pricing/#${o.id}`, { setup: o.price.setup, monthly: o.price.monthly })), faqSchema(pricingFaq)],
};

export function PricingPage() {
  const fc = flagshipComparison();
  const focused = offers.filter((o) => o.code !== 'F');
  const flagship = offers.find((o) => o.code === 'F')!;
  return (
    <>
      <PageHero crumbs={crumbs} eyebrow="Pricing" title="Transparent pricing for every part of the system." lede="A one-time setup and a monthly fee for each program. Start with the one your Snapshot points to, and upgrade only when it makes sense." />
      <Section tone="canvas" labelledBy="flagship-h">
        <h2 id="flagship-h" className="sr-only">Complete system</h2>
        <div className="flagship">
          <PricingCard offer={flagship} featured />
          <div className="flagship__why">
            <h3>One program instead of five</h3>
            <p>The five focused programs total {usd(fc.setupSum)} in setup and {usd(fc.monthlySum)}/mo. {flagship.name} coordinates all of them for {usd(fc.flagshipSetup)} + {usd(fc.flagshipMonthly)}/mo, with a client dashboard and a monthly strategy session.</p>
            <p>Best for: {flagship.customer.bestFor}</p>
          </div>
        </div>
      </Section>
      <Section tone="white" labelledBy="focused-h">
        <SectionHead id="focused-h" eyebrow="Focused programs" title="Fix one part of the system" />
        <div className="pcard-grid">
          {focused.map((o) => {
            const svc = services.find((s) => s.offerId === o.id);
            return <PricingCard key={o.id} offer={o} detailHref={svc ? `/services/${svc.slug}/` : undefined} />;
          })}
        </div>
      </Section>
      <Section tone="canvas" labelledBy="addons-h">
        <SectionHead id="addons-h" eyebrow="Add-ons" title="Extend any program" lede="Quoted add-ons are scoped in writing before work begins." />
        <AddOnTable />
      </Section>
      <Section tone="white" labelledBy="pricing-faq">
        <div className="split split--top">
          <SectionHead id="pricing-faq" eyebrow="FAQ" title="Pricing questions" />
          <Faq items={pricingFaq} idPrefix="pricing-faq" />
        </div>
      </Section>
      <CtaBand location="pricing" title="Not sure which program fits?" text="Your free Snapshot recommends one, and tells you honestly if you don’t need any." />
    </>
  );
}
