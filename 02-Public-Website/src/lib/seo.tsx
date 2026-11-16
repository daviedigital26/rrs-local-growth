/** SEO head + JSON-LD builders. */
import { config } from '../../site.config.ts';
import type { FaqItem } from '../content/site.ts';

export interface Crumb { name: string; path: string }

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  ogImage?: string;
  breadcrumbs?: Crumb[];
  schema?: object[];
  noindex?: boolean;
}

export const absolute = (path: string) => `${config.siteUrl}${path}`;

export const orgId = () => absolute('/#organization');

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': orgId(),
    name: config.company.name,
    url: absolute('/'),
    parentOrganization: { '@type': 'Organization', name: config.company.parent },
    ...(config.publicEmail ? { email: config.publicEmail } : {}),
    ...(config.publicPhone ? { telephone: config.publicPhone } : {}),
  };
}

export function websiteSchema() {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: config.company.name, url: absolute('/'), publisher: { '@id': orgId() } };
}

const areaServed = () => config.company.serviceArea.map((c) => ({ '@type': 'City', name: `${c}, AZ` }));

export function professionalServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': absolute('/#business'),
    name: config.company.name,
    url: absolute('/'),
    parentOrganization: { '@type': 'Organization', name: config.company.parent },
    areaServed: areaServed(),
    knowsAbout: ['Local SEO', 'Google Business Profile optimization', 'AI search visibility', 'Reputation management', 'Lead follow-up automation', 'Website conversion'],
    ...(config.publicPhone ? { telephone: config.publicPhone } : {}),
  };
}

export function serviceSchema(name: string, description: string, path: string, price?: { setup: number; monthly: number }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url: absolute(path),
    provider: { '@id': orgId() },
    areaServed: areaServed(),
    ...(price
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            priceSpecification: [
              { '@type': 'UnitPriceSpecification', price: price.setup, priceCurrency: 'USD', name: 'One-time setup' },
              { '@type': 'UnitPriceSpecification', price: price.monthly, priceCurrency: 'USD', unitText: 'MONTH', name: 'Monthly' },
            ],
          },
        }
      : {}),
  };
}

export function faqSchema(items: FaqItem[]) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })) };
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absolute(c.path) })) };
}

const jsonLd = (o: object) => JSON.stringify(o).replace(/</g, '\\u003c');

export function SeoHead({ meta }: { meta: PageMeta }) {
  const fullTitle = meta.path === '/' ? `${meta.title}` : `${meta.title} | ${config.company.name}`;
  const og = absolute(meta.ogImage ?? '/og/og-default.png');
  const schemas = [organizationSchema(), websiteSchema(), ...(meta.schema ?? []), ...(meta.breadcrumbs ? [breadcrumbSchema(meta.breadcrumbs)] : [])];
  const noindex = meta.noindex || config.isPreview;
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={absolute(meta.path)} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={config.company.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={absolute(meta.path)} />
      <meta property="og:image" content={og} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={og} />
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(s) }} />
      ))}
    </>
  );
}
