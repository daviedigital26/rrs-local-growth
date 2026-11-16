/** Offer catalog types. Framework-free so Reale OS, n8n and the website can all consume them. */

export type OfferId =
  | 'local-visibility-jumpstart'
  | 'ai-discovery-accelerator'
  | 'reputation-revenue-engine'
  | 'lead-rescue-booking-engine'
  | 'website-to-customer-conversion'
  | 'local-revenue-dominator';

/** The five Snapshot categories / Local Revenue System parts. */
export type SystemPart = 'maps' | 'ai' | 'reviews' | 'website' | 'followup';

export type Stage = 'Get Discovered' | 'Get Chosen' | 'Get Booked' | 'All three';

export interface PriceRecord {
  setup: number;
  monthly: number;
  currency: 'USD';
  /** Spec Part 2: proposed launch prices requiring final approval, not market benchmarks. */
  status: 'proposed' | 'approved';
  approvedBy?: string;
  approvedOn?: string;
}

export interface HoursRange { min: number; max: number }

export interface CostModel {
  /** ASSUMPTION — estimated monthly third-party tool cost attributable to one client (USD). */
  toolCostMonthly: number;
  /** Usage-based costs passed through to the client (messaging, calls), if any. */
  passThrough?: string;
  notes: string[];
}

/** Every offer carries the 14 artefacts required by spec Part 2. */
export interface Offer {
  id: OfferId;
  code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  name: string; // includes ™
  shortName: string;
  stage: Stage;
  parts: SystemPart[];
  tagline: string;
  /** Spec-listed services (verbatim scope list). */
  services: string[];
  price: PriceRecord;

  // 1. Customer-facing explanation
  customer: { headline: string; summary: string; whatYouGet: string[]; bestFor: string };
  // 2. Internal fulfillment specification
  fulfillment: { setup: string[]; monthly: string[] };
  // 3. Eligibility criteria
  eligibility: { goodFit: string[]; notAFit: string[] };
  // 4. Pricing sheet → generated from `price` by export-catalog.ts
  // 5. Cost model
  cost: CostModel;
  // 6. Expected delivery hours (ASSUMPTION — refine after first engagements)
  hours: { setup: HoursRange; monthly: HoursRange };
  // 7. Scope limits
  scopeLimits: string[];
  // 8. Exclusions
  exclusions: string[];
  // 9. Required customer inputs
  requiredInputs: string[];
  // 10. Onboarding checklist
  onboarding: string[];
  // 11. Service agreement schedule → generated from fields by export-catalog.ts (DRAFT)
  // 12. Monthly reporting requirements
  reporting: string[];
  // 13. Upgrade recommendations
  upgrades: Array<{ to: OfferId | AddOnId; when: string }>;
  // 14. Cancellation and offboarding procedures
  offboarding: string[];

  /** Hard compliance rules that copy, sales and fulfillment must respect. */
  compliance: string[];
  /** Website slug for the service page this offer anchors. */
  servicePage?: string;
}

export type AddOnId =
  | 'revenue-reactivation-sprint'
  | 'competitor-intelligence-pulse'
  | 'local-authority-content-studio'
  | 'seasonal-campaign-launch'
  | 'additional-location'
  | 'advanced-integration'
  | 'additional-website-page'
  | 'ai-receptionist-chat';

export interface AddOn {
  id: AddOnId;
  name: string;
  pricing:
    | { kind: 'project-range'; min: number; max: number }
    | { kind: 'monthly'; amount: number }
    | { kind: 'monthly-range'; min: number; max: number }
    | { kind: 'quoted'; note: string };
  priceStatus: 'proposed' | 'approved' | 'to-be-set';
  summary: string;
  includes: string[];
  eligibility: string;
  limits: string[];
  compliance?: string[];
}
