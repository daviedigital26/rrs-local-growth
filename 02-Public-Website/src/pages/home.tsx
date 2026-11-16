import { offerById, offers } from '../../../03-Offers-and-Pricing/offer-catalog.ts';
import { usd } from '../../../03-Offers-and-Pricing/format.ts';
import { industries } from '../content/industries.ts';
import { services } from '../content/services.ts';
import { homeFaq } from '../content/site.ts';
import { faqSchema, professionalServiceSchema, type PageMeta } from '../lib/seo.tsx';
import { sampleResult } from '../lib/sample.ts';
import { CtaBand, CtaLink, DemoLabel, Faq, Icon, Section, SectionHead, Steps } from '../components/ui.tsx';
import { ImpactCalculator, JourneyVisual, partMeta, ScoreCard, SystemDiagram } from '../components/visuals.tsx';

export const homeMeta: PageMeta = {
  path: '/',
  title: 'Reale Revenue Systems | Local SEO, AI Visibility, Reviews & Lead Follow-Up in Phoenix',
  description: 'Get found on Google and AI search, become the obvious choice and turn more inquiries into booked jobs. Start with a free Local Revenue Snapshot.',
  schema: [professionalServiceSchema(), faqSchema(homeFaq)],
};

const problems = [
  { part: 'maps', title: 'Customers can’t find you on the map', text: 'An incomplete or inconsistent profile hands nearby searches to competitors.' },
  { part: 'ai', title: 'AI tools describe someone else', text: 'Assistants lean on consistent facts and clear answers. Gaps get filled by other businesses.' },
  { part: 'reviews', title: 'Your reviews look quiet', text: 'Fewer or older reviews make a great business look like a risky choice.' },
  { part: 'website', title: 'Your site makes calling hard', text: 'No tap-to-call, unclear service areas or a long form, and mobile visitors leave.' },
  { part: 'followup', title: 'Inquiries wait too long', text: 'Missed calls and unanswered quotes quietly turn into someone else’s booked jobs.' },
] as const;

const channels = [
  { icon: 'search', title: 'Google Search', does: 'Customers compare websites, service pages and reviews.', relies: 'Helpful pages, consistent business facts, reputation' },
  { icon: 'pin', title: 'Google Maps', does: 'Customers pick from a short list of nearby profiles and call.', relies: 'Complete profile, relevance, proximity, reviews' },
  { icon: 'spark', title: 'AI assistants', does: 'Customers ask for a recommendation in plain language.', relies: 'Consistent entity data, clear answers, reputable mentions' },
] as const;

export function HomePage() {
  const flagship = offerById('local-revenue-dominator')!;
  return (
    <>
      {/* 1. Hero */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__grid">
          <div className="hero__copy">
            <p className="eyebrow eyebrow--on-dark">Get Discovered · Get Chosen · Get Booked</p>
            <h1 id="hero-title">More Local Customers. <span className="hl">Fewer Missed Opportunities.</span></h1>
            <p className="hero__sub">Show up where customers search. Build the trust that earns their business. Automatically follow up so more inquiries become booked jobs.</p>
            <div className="hero__ctas">
              <CtaLink href="/free-snapshot/" cta="snapshot-hero" size="lg" arrow>Get My Free Local Revenue Snapshot</CtaLink>
              <CtaLink href="#how-it-works" variant="ghost" cta="how-hero" size="lg">See How It Works</CtaLink>
            </div>
            <ul className="hero__assure">
              <li><Icon name="check" size={16} /> Free, no obligation</li>
              <li><Icon name="check" size={16} /> Every finding shows its source</li>
              <li><Icon name="check" size={16} /> Phoenix-area businesses</li>
            </ul>
          </div>
          <JourneyVisual />
        </div>
      </section>

      {/* 2. Customer problems */}
      <Section id="problems" tone="canvas" labelledBy="problems-title">
        <SectionHead id="problems-title" eyebrow="Where local revenue leaks" title="Most businesses don’t have a lead problem. They have a leak problem." lede="Customers move from search to selection to inquiry to booking. A gap at any step sends them to the next business on the list." />
        <ul className="problem-grid">
          {problems.map((p) => (
            <li key={p.part} className="problem">
              <span className="problem__icon"><Icon name={partMeta[p.part]!.icon} size={22} /></span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 3. How discovery is changing */}
      <Section id="discovery" tone="ink" labelledBy="discovery-title">
        <SectionHead id="discovery-title" eyebrow="How customers find you now" title="One search used to be enough. Now customers check three places." lede="Before they call, many customers look across search results, the map and increasingly an AI assistant. Each one draws on the same foundation: your business information, your reputation and your website." />
        <ul className="channel-grid">
          {channels.map((c) => (
            <li key={c.title} className="channel">
              <Icon name={c.icon} size={24} />
              <h3>{c.title}</h3>
              <p>{c.does}</p>
              <p className="channel__relies"><span>Relies on</span>{c.relies}</p>
            </li>
          ))}
        </ul>
        <p className="note-on-dark"><Icon name="shield" size={18} /> AI answers change from one conversation to the next. We record test conditions and report observations, never “rankings.”</p>
      </Section>

      {/* 4. The five-part system */}
      <Section id="how-it-works" tone="canvas" labelledBy="system-title">
        <SectionHead id="system-title" eyebrow="The Local Revenue System" title="Five connected parts. Three outcomes." lede="We fix the weakest link first, then connect the rest, so more visibility actually turns into booked work." />
        <SystemDiagram />
      </Section>

      {/* 5. Services overview */}
      <Section id="services" tone="white" labelledBy="services-title">
        <SectionHead id="services-title" eyebrow="Services" title="Focused programs for each part of the system" />
        <ul className="service-grid">
          {services.map((s) => {
            const o = offerById(s.offerId)!;
            return (
              <li key={s.slug} className="service-card">
                <Icon name={s.icon} size={24} />
                <p className="service-card__stage">{o.stage}</p>
                <h3><a href={`/services/${s.slug}/`}>{o.name}</a></h3>
                <p>{o.tagline}</p>
                <p className="service-card__price">From {usd(o.price.monthly)}/mo</p>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 6. Example audit preview */}
      <Section id="audit-preview" tone="ink" labelledBy="audit-title">
        <div className="split">
          <div>
            <SectionHead id="audit-title" eyebrow="What your Snapshot looks like" title="Scores you can check, and an honest “Not verified.”" lede="Every category shows what we verified, how confident we are and what we couldn’t see from the outside. Missing information never counts against you." />
            <ul className="bullets-on-dark">
              <li><Icon name="check" size={18} /> 100 points across five categories</li>
              <li><Icon name="check" size={18} /> Sources and dates for every finding</li>
              <li><Icon name="check" size={18} /> Competitor comparison and top opportunities</li>
              <li><Icon name="check" size={18} /> A recommended next step, or an honest “you’re in good shape”</li>
            </ul>
            <div className="btn-row">
              <CtaLink href="/free-snapshot/sample-report/" variant="ghost" cta="sample-home">See the full sample report</CtaLink>
              <a className="link-on-dark" href="/free-snapshot/methodology/">How we score</a>
            </div>
          </div>
          <div>
            <ScoreCard result={sampleResult} compact />
            <DemoLabel>Fictional example: Mesquite Ridge Comfort Co. is not a real business</DemoLabel>
          </div>
        </div>
      </Section>

      {/* 7. Industries */}
      <Section id="industries" tone="canvas" labelledBy="industries-title">
        <SectionHead id="industries-title" eyebrow="Industries" title="Built around how your customers actually buy" />
        <ul className="industry-grid">
          {industries.map((i) => (
            <li key={i.slug}>
              <a className="industry-tile" href={`/industries/${i.slug}/`}>
                <span className="industry-tile__name">{i.name}</span>
                <span className="industry-tile__ex">{i.examples.join(' · ')}</span>
                <Icon name="arrow" size={18} />
              </a>
            </li>
          ))}
        </ul>
        <p className="muted-note">Also serving Realtors, med spas, chiropractors and dental offices. <a href="/industries/">See all industries</a>.</p>
      </Section>

      {/* 8. Before and after */}
      <Section id="before-after" tone="white" labelledBy="ba-title">
        <SectionHead id="ba-title" eyebrow="Before and after" title="The same missed call, two different outcomes" />
        <div className="ba">
          <div className="ba__col ba__col--before">
            <p className="ba__label">Before</p>
            <ol>
              <li>A customer calls at 1:12 PM while your tech is on a roof.</li>
              <li>The call goes to voicemail. No message is left.</li>
              <li>They call the next business on the map.</li>
              <li>You never know the lead existed.</li>
            </ol>
          </div>
          <div className="ba__col ba__col--after">
            <p className="ba__label">After</p>
            <ol>
              <li>The same call is missed at 1:12 PM.</li>
              <li>Within a minute, an automated text offers an open time, using the consent and opt-out rules you approved.</li>
              <li>The customer replies and books.</li>
              <li>The lead, the reply and the booking appear in your pipeline report.</li>
            </ol>
          </div>
        </div>
        <DemoLabel>Illustration of a typical workflow, not a client result</DemoLabel>
        <ImpactCalculator />
      </Section>

      {/* 9. Transparent pricing */}
      <Section id="pricing" tone="canvas" labelledBy="pricing-title">
        <SectionHead id="pricing-title" eyebrow="Transparent pricing" title="Clear setup and monthly prices. No surprises." lede="Messaging and calling costs for follow-up automation are usage-based and billed at cost, and we estimate them before anything goes live." />
        <div className="table-wrap">
          <table className="price-table">
            <caption className="sr-only">Programs and prices</caption>
            <thead><tr><th scope="col">Program</th><th scope="col">Outcome</th><th scope="col">Setup</th><th scope="col">Monthly</th></tr></thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className={o.code === 'F' ? 'is-featured' : undefined}>
                  <th scope="row"><a href={`/pricing/#${o.id}`}>{o.name}</a></th>
                  <td>{o.stage}</td>
                  <td>{usd(o.price.setup)}</td>
                  <td>{usd(o.price.monthly)}/mo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted-note">{flagship.name} replaces overlapping smaller plans when you upgrade. <a href="/pricing/">Full pricing and add-ons</a>.</p>
      </Section>

      {/* 10. Onboarding */}
      <Section id="onboarding" tone="ink" labelledBy="onboarding-title">
        <SectionHead id="onboarding-title" eyebrow="How onboarding works" title="From Snapshot to steady improvement in four steps" />
        <Steps steps={[
          { title: 'Free Snapshot', text: 'We review your business across five categories and send a plain-English report.' },
          { title: 'Strategy call', text: 'We walk through what we found and recommend one plan, or tell you none is needed.' },
          { title: 'Setup sprint', text: 'A short onboarding form (only relevant questions, no passwords), delegated access, then setup with your approvals.' },
          { title: 'Monthly improvement', text: 'Ongoing work, an approval queue for anything customer-facing, and a monthly report.' },
        ]} />
      </Section>

      {/* 11. Evidence & case studies */}
      <Section id="evidence" tone="canvas" labelledBy="evidence-title">
        <div className="split split--top">
          <SectionHead id="evidence-title" eyebrow="Evidence, not hype" title="We won’t show you made-up results." lede="Reale Revenue Systems is a new practice. Instead of invented testimonials or borrowed logos, here’s what you can check today." />
          <ul className="evidence-list">
            <li><Icon name="doc" size={22} /><div><h3>Our full scoring method</h3><p>Every criterion, source and missing-data rule is published.</p><a href="/free-snapshot/methodology/" className="link-arrow">Read the methodology <Icon name="arrow" size={16} /></a></div></li>
            <li><Icon name="chart" size={22} /><div><h3>A complete sample report</h3><p>A fictional business, clearly labelled, scored by the same engine we use for you.</p><a href="/free-snapshot/sample-report/" className="link-arrow">View the sample <Icon name="arrow" size={16} /></a></div></li>
            <li><Icon name="users" size={22} /><div><h3>Case studies, with permission</h3><p>We’ll publish client results only with written permission and documented data.</p><a href="/case-studies/" className="link-arrow">Our case-study policy <Icon name="arrow" size={16} /></a></div></li>
          </ul>
        </div>
      </Section>

      {/* 12. FAQ */}
      <Section id="faq" tone="white" labelledBy="faq-title">
        <div className="split split--top">
          <SectionHead id="faq-title" eyebrow="FAQ" title="Straight answers" />
          <Faq items={homeFaq} />
        </div>
      </Section>

      {/* 13. Final CTA */}
      <CtaBand location="home-final" title="Find out what’s costing you customers." text="Get a free, evidence-labelled Snapshot of your Maps presence, AI readiness, reviews, website and follow-up." />
    </>
  );
}
