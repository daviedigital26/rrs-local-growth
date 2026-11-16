/** Route table: one entry per page. Maps 1:1 to Next.js app/ routes on migration. */
import type { ReactElement } from 'react';
import type { PageMeta } from './lib/seo.tsx';
import { services } from './content/services.ts';
import { industries } from './content/industries.ts';
import { HomePage, homeMeta } from './pages/home.tsx';
import { ServicePage, ServicesHubPage, serviceMeta, servicesHubMeta } from './pages/services.tsx';
import { IndustriesHubPage, IndustryPage, industriesHubMeta, industryMeta } from './pages/industries.tsx';
import { PricingPage, pricingMeta } from './pages/pricing.tsx';
import { MethodologyPage, methodologyMeta, SampleReportPage, sampleReportMeta, SnapshotPage, snapshotMeta } from './pages/snapshot.tsx';
import {
  AboutPage, aboutMeta, CaseStudiesPage, caseStudiesMeta, ContactPage, contactMeta, LegalPage, legalMeta,
  NotFoundPage, notFoundMeta, ResourcesPage, resourcesMeta,
} from './pages/company.tsx';

export interface Route {
  meta: PageMeta;
  render: () => ReactElement;
  bodyClass?: string;
}

export const routes: Route[] = [
  { meta: homeMeta, render: () => <HomePage />, bodyClass: 'page-home' },
  { meta: servicesHubMeta, render: () => <ServicesHubPage /> },
  ...services.map((s) => ({ meta: serviceMeta(s.slug), render: () => <ServicePage slug={s.slug} /> })),
  { meta: industriesHubMeta, render: () => <IndustriesHubPage /> },
  ...industries.map((i) => ({ meta: industryMeta(i.slug), render: () => <IndustryPage slug={i.slug} /> })),
  { meta: pricingMeta, render: () => <PricingPage /> },
  { meta: snapshotMeta, render: () => <SnapshotPage />, bodyClass: 'page-snapshot' },
  { meta: methodologyMeta, render: () => <MethodologyPage /> },
  { meta: sampleReportMeta, render: () => <SampleReportPage />, bodyClass: 'page-report' },
  { meta: caseStudiesMeta, render: () => <CaseStudiesPage /> },
  { meta: resourcesMeta, render: () => <ResourcesPage /> },
  { meta: aboutMeta, render: () => <AboutPage /> },
  { meta: contactMeta, render: () => <ContactPage /> },
  ...(['privacy', 'terms', 'accessibility'] as const).map((slug) => ({ meta: legalMeta(slug), render: () => <LegalPage slug={slug} /> })),
  { meta: notFoundMeta, render: () => <NotFoundPage /> },
];
