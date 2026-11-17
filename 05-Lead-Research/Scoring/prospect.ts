/**
 * Prospect record (`rrs.prospect/1`): one business being qualified, with every scoring
 * fact carrying its own evidence kind and check date. Absent facts are Not verified.
 *
 * Importers: the owner's PM Lead Scorer JSON batches and CSV export, website leads
 * (`rrs.lead/1`) and Snapshot reports. Nothing is inferred beyond what the source says.
 */
import type { ReportModel } from '../../04-Audits-and-Scorecards/snapshot/report/model.ts';
import type { Confidence } from '../../04-Audits-and-Scorecards/snapshot/engine.ts';
import { INDUSTRY_VALUES, normalizeName, normalizePhone, normalizeWebsite, shortHash, type LeadRecord } from '../intake/lead-intake.ts';
import type { EvidenceKind, Industry, Ownership } from './icp-config.ts';
import type { LegacyLead } from './legacy-pm.ts';

export interface Fact<T> { value: T; kind: EvidenceKind; checked_at: string | null; source?: string }
export type OutreachStatus = 'not_contacted' | 'attempted' | 'contacted' | 'audit_booked' | 'declined' | 'customer';
export type Restriction = 'do_not_contact' | 'no_calls' | 'no_sms' | 'no_email';
export interface Observation { category: string; severity: 'high' | 'medium' | 'low'; note: string; kind: EvidenceKind; checked_at: string | null; source_url?: string }

export interface ProspectRecord {
  schema: 'rrs.prospect/1';
  prospect_id: string;
  fictional: boolean;
  origin: 'research' | 'inbound' | 'legacy_tracker' | 'snapshot';
  name: string;
  industry: Industry | null;
  city: string | null;
  state: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  decision_maker: Fact<string> | null;
  operating_status: Fact<'operating' | 'closed'> | null;
  ownership: Fact<Ownership> | null;
  ownership_label: string | null;
  rating: Fact<number> | null;
  review_count: Fact<number> | null;
  units_managed: Fact<number> | null;
  review_excerpts: Fact<string[]> | null;
  observations: Observation[];
  snapshot: { verified_score: number | null; coverage: number; confidence: Confidence; report_date: string } | null;
  contact_restrictions: Restriction[];
  outreach: { status: OutreachStatus; notes: string; last_contact: string | null };
  /** Raw legacy tracker fields, kept so the old score can be reproduced exactly. */
  legacy: LegacyLead | null;
  dedupe_key: string;
}

export interface ImportIssue { where: string; message: string }
export interface ImportResult { prospects: ProspectRecord[]; errors: ImportIssue[]; warnings: ImportIssue[] }

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (s: unknown): s is string => typeof s === 'string' && DATE.test(s) && !Number.isNaN(Date.parse(s));

export function splitCity(raw: string | null): { city: string | null; state: string | null } {
  if (!raw) return { city: null, state: null };
  const m = raw.trim().match(/^(.*?),\s*([A-Za-z]{2})(?:\s+\d{5})?$/);
  return m?.[2] ? { city: raw.trim(), state: m[2].toUpperCase() } : { city: raw.trim(), state: null };
}

export function prospectDedupeKey(name: string, city: string | null, domain: string | null): string {
  if (domain) return `domain:${domain}`;
  return `name:${normalizeName(name)}|city:${normalizeName((city ?? '').replace(/,.*$/, ''))}`;
}

function blank(name: string, origin: ProspectRecord['origin']): ProspectRecord {
  return {
    schema: 'rrs.prospect/1', prospect_id: '', fictional: false, origin, name, industry: null, city: null, state: null,
    website: null, phone: null, email: null, decision_maker: null, operating_status: null, ownership: null, ownership_label: null,
    rating: null, review_count: null, units_managed: null, review_excerpts: null, observations: [], snapshot: null,
    contact_restrictions: [], outreach: { status: 'not_contacted', notes: '', last_contact: null }, legacy: null, dedupe_key: '',
  };
}

function finish(p: ProspectRecord): ProspectRecord {
  if (/\(fictional\)/i.test(p.name)) p.fictional = true;
  p.dedupe_key = prospectDedupeKey(p.name, p.city, p.website ? normalizeWebsite(p.website)?.domain ?? null : null);
  p.prospect_id = `prs_${shortHash(p.dedupe_key)}`;
  return p;
}

export function ownershipFromChain(chain: string | null | undefined): Ownership | null {
  if (!chain) return null;
  return /franchise/i.test(chain) ? 'national_franchise' : 'multi_location';
}

const isIndustry = (v: unknown): v is Industry => typeof v === 'string' && (INDUSTRY_VALUES as readonly string[]).includes(v);

// ── Legacy PM Lead Scorer: JSON batch ────────────────────────────────────
export interface LegacyImportOptions {
  /** Date the batch was pulled. Without it every fact is undated (lower confidence). */
  checkedAt?: string | null;
  industry?: Industry;
  source?: string;
}

export function fromLegacyBatch(items: unknown, opts: LegacyImportOptions = {}): ImportResult {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const prospects: ProspectRecord[] = [];
  if (!Array.isArray(items)) return { prospects, errors: [{ where: 'batch', message: 'expected a JSON array of leads' }], warnings };
  const checked = opts.checkedAt ?? null;
  if (checked !== null && !isIsoDate(checked)) errors.push({ where: 'options', message: `checked date must be YYYY-MM-DD, got "${checked}"` });
  if (checked === null) warnings.push({ where: 'batch', message: 'no pull date given (--checked): facts are treated as undated, which lowers research confidence' });
  const source = opts.source ?? 'PM Lead Scorer batch';
  items.forEach((raw, i) => {
    const where = `item ${i + 1}`;
    if (!raw || typeof raw !== 'object') { errors.push({ where, message: 'not an object' }); return; }
    const o = raw as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    if (!name) { errors.push({ where, message: 'name is required' }); return; }
    const at = `${where} (${name})`;
    const p = blank(name, 'legacy_tracker');
    p.fictional = o.fictional === true;
    p.industry = isIndustry(o.industry) ? o.industry : opts.industry ?? 'property-management';
    Object.assign(p, splitCity(typeof o.city === 'string' ? o.city : null));
    if (typeof o.phone === 'string' && o.phone.trim()) {
      p.phone = normalizePhone(o.phone);
      if (!p.phone) warnings.push({ where: at, message: `phone "${o.phone}" is not a usable number; left empty` });
    }
    if (typeof o.website === 'string' && o.website.trim()) p.website = normalizeWebsite(o.website.trim())?.url ?? null;
    if (o.rating !== undefined && o.rating !== null) {
      if (typeof o.rating === 'number' && o.rating >= 0 && o.rating <= 5) p.rating = { value: o.rating, kind: 'listing_data', checked_at: checked, source };
      else errors.push({ where: at, message: 'rating must be a number from 0 to 5' });
    }
    if (o.reviewCount !== undefined && o.reviewCount !== null) {
      if (Number.isInteger(o.reviewCount) && (o.reviewCount as number) >= 0) p.review_count = { value: o.reviewCount as number, kind: 'listing_data', checked_at: checked, source };
      else errors.push({ where: at, message: 'reviewCount must be a whole number' });
    }
    if (o.reviews !== undefined && o.reviews !== null) {
      if (Array.isArray(o.reviews) && o.reviews.every((r) => typeof r === 'string')) {
        const reviews = (o.reviews as string[]).map((r) => r.trim()).filter(Boolean);
        if (reviews.length) p.review_excerpts = { value: reviews, kind: 'review_sample', checked_at: checked, source };
      } else errors.push({ where: at, message: 'reviews must be a list of text excerpts' });
    }
    if (o.chain !== undefined && o.chain !== null && typeof o.chain !== 'string') errors.push({ where: at, message: 'chain must be text or null' });
    const chain = typeof o.chain === 'string' && o.chain.trim() ? o.chain.trim() : null;
    const ownership = ownershipFromChain(chain);
    if (ownership) { p.ownership = { value: ownership, kind: 'tracker_flag', checked_at: checked, source }; p.ownership_label = chain; }
    if (Number.isInteger(o.unitsManaged) && (o.unitsManaged as number) >= 0) p.units_managed = { value: o.unitsManaged as number, kind: 'owner_reported', checked_at: checked, source };
    p.legacy = {
      name, city: typeof o.city === 'string' ? o.city : '', phone: typeof o.phone === 'string' ? o.phone : '',
      rating: o.rating as number, reviewCount: o.reviewCount as number, reviews: Array.isArray(o.reviews) ? (o.reviews as string[]) : [], chain,
    };
    prospects.push(finish(p));
  });
  return { prospects, errors, warnings };
}

// ── Legacy PM Lead Scorer: CSV export (keeps call status and notes) ──────
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

const LEGACY_STATUS: Record<string, OutreachStatus> = {
  'not contacted': 'not_contacted', attempted: 'attempted', 'booked audit': 'audit_booked', declined: 'declined',
};

export function fromLegacyCsv(text: string, opts: LegacyImportOptions = {}): ImportResult {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const prospects: ProspectRecord[] = [];
  const rows = parseCsv(text);
  if (!rows.length) return { prospects, errors: [{ where: 'csv', message: 'file is empty' }], warnings };
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const col = (n: string) => header.indexOf(n);
  for (const required of ['name', 'city', 'phone', 'rating', 'reviews', 'status', 'notes']) {
    if (col(required) < 0) errors.push({ where: 'header', message: `missing column "${required}" (expected the PM Lead Scorer export)` });
  }
  if (errors.length) return { prospects, errors, warnings };
  const checked = opts.checkedAt ?? null;
  const source = opts.source ?? 'PM Lead Scorer CSV export';
  rows.slice(1).forEach((r, i) => {
    const where = `row ${i + 2}`;
    const get = (n: string) => (r[col(n)] ?? '').trim();
    const name = get('name');
    if (!name) { errors.push({ where, message: 'Name is empty' }); return; }
    const p = blank(name, 'legacy_tracker');
    p.industry = opts.industry ?? 'property-management';
    Object.assign(p, splitCity(get('city') || null));
    if (get('phone')) p.phone = normalizePhone(get('phone'));
    const rating = Number(get('rating'));
    if (get('rating') && Number.isFinite(rating) && rating >= 0 && rating <= 5) p.rating = { value: rating, kind: 'listing_data', checked_at: checked, source };
    else if (get('rating')) errors.push({ where: `${where} (${name})`, message: `Rating "${get('rating')}" is not a number from 0 to 5` });
    const count = Number(get('reviews'));
    if (get('reviews') && Number.isInteger(count) && count >= 0) p.review_count = { value: count, kind: 'listing_data', checked_at: checked, source };
    else if (get('reviews')) errors.push({ where: `${where} (${name})`, message: `Reviews "${get('reviews')}" is not a whole number` });
    const status = LEGACY_STATUS[get('status').toLowerCase()];
    if (get('status') && !status) warnings.push({ where: `${where} (${name})`, message: `unknown Status "${get('status')}"; treated as Not Contacted` });
    p.outreach = { status: status ?? 'not_contacted', notes: get('notes'), last_contact: null };
    prospects.push(finish(p));
  });
  return { prospects, errors, warnings };
}

// ── Merge (JSON batch + CSV export of the same leads) ────────────────────
const newer = <T>(a: Fact<T> | null, b: Fact<T> | null): Fact<T> | null => {
  if (!a) return b;
  if (!b) return a;
  return (b.checked_at ?? '') > (a.checked_at ?? '') ? b : a;
};

/** Merge records describing the same business. Facts keep the most recent dated value. */
export function mergeProspects(list: ProspectRecord[]): { prospects: ProspectRecord[]; merged: number } {
  const byKey = new Map<string, ProspectRecord>();
  let merged = 0;
  for (const p of list) {
    const prev = byKey.get(p.dedupe_key);
    if (!prev) { byKey.set(p.dedupe_key, structuredClone(p)); continue; }
    merged++;
    prev.fictional = prev.fictional || p.fictional;
    prev.industry ??= p.industry;
    prev.city ??= p.city;
    prev.state ??= p.state;
    prev.website ??= p.website;
    prev.phone ??= p.phone;
    prev.email ??= p.email;
    prev.decision_maker = newer(prev.decision_maker, p.decision_maker);
    prev.operating_status = newer(prev.operating_status, p.operating_status);
    if (!prev.ownership && p.ownership) { prev.ownership = p.ownership; prev.ownership_label = p.ownership_label; }
    prev.rating = newer(prev.rating, p.rating);
    prev.review_count = newer(prev.review_count, p.review_count);
    prev.units_managed = newer(prev.units_managed, p.units_managed);
    prev.review_excerpts = newer(prev.review_excerpts, p.review_excerpts);
    prev.observations.push(...p.observations);
    prev.snapshot ??= p.snapshot;
    prev.contact_restrictions = [...new Set([...prev.contact_restrictions, ...p.contact_restrictions])];
    if (p.outreach.status !== 'not_contacted' || p.outreach.notes) {
      prev.outreach = { status: p.outreach.status !== 'not_contacted' ? p.outreach.status : prev.outreach.status, notes: [prev.outreach.notes, p.outreach.notes].filter(Boolean).join(' | '), last_contact: p.outreach.last_contact ?? prev.outreach.last_contact };
    }
    prev.legacy ??= p.legacy;
  }
  return { prospects: [...byKey.values()], merged };
}

// ── Website lead (inbound) ───────────────────────────────────────────────
const CONCERN_CATEGORY: Record<string, string> = {
  'Not showing up on Google Maps': 'maps', 'Not enough reviews': 'reviews', 'Website doesn’t bring in calls': 'website',
  'Missed calls or slow follow-up': 'followup', 'Curious about AI search': 'ai',
};

export function fromWebLead(lead: LeadRecord): ProspectRecord {
  const p = blank(lead.business.name ?? lead.contact.name, 'inbound');
  p.industry = isIndustry(lead.business.industry) ? lead.business.industry : null;
  Object.assign(p, splitCity(lead.business.city));
  p.website = lead.business.website;
  p.phone = lead.contact.phone;
  p.email = lead.contact.email;
  p.decision_maker = { value: lead.contact.name, kind: 'owner_reported', checked_at: lead.received_at.slice(0, 10), source: 'website form' };
  const date = lead.received_at.slice(0, 10);
  for (const c of lead.concerns) {
    const category = CONCERN_CATEGORY[c];
    if (category) p.observations.push({ category, severity: 'medium', note: `Owner says: ${c}`, kind: 'owner_reported', checked_at: date });
  }
  if (!lead.consent.sms) p.contact_restrictions.push('no_sms');
  p.outreach.notes = `Website ${lead.form === 'snapshot_request' ? 'Snapshot request' : 'contact form'} ${lead.lead_id}`;
  return finish(p);
}

// ── Snapshot report ──────────────────────────────────────────────────────
/** Free-text industry ("HVAC", "Mobile detailing") → intake industry value. */
export function industryFromText(text: string): Industry {
  const t = text.toLowerCase();
  if (isIndustry(t)) return t;
  if (/property|rental|leasing/.test(t)) return 'property-management';
  if (/hvac|plumb|roof|electric|heating|cooling|air condition|water heater/.test(t)) return 'home-services';
  if (/detail|tint|auto|car wash|ceramic/.test(t)) return 'auto-detailing';
  if (/clean|landscap|lawn|pool|pest|maid|janitor/.test(t)) return 'recurring-services';
  if (/remodel|kitchen|bath|renovat|flooring|cabinet|contractor/.test(t)) return 'remodeling';
  if (/realtor|real estate|broker/.test(t)) return 'realtor';
  if (/law|account|cpa|insurance|financial|consult/.test(t)) return 'professional-services';
  return 'other';
}

export function fromSnapshotModel(m: ReportModel): ProspectRecord {
  const p = blank(m.business.name, m.lead?.source ? 'inbound' : 'snapshot');
  p.fictional = m.fictional;
  p.industry = industryFromText(m.business.industry);
  Object.assign(p, splitCity(m.business.area));
  p.website = m.lead?.website ? normalizeWebsite(m.lead.website)?.url ?? null : null;
  p.email = m.lead?.email ?? null;
  p.phone = m.lead?.phone ? normalizePhone(m.lead.phone) : null;
  if (m.lead?.contactName) p.decision_maker = { value: m.lead.contactName, kind: 'owner_reported', checked_at: m.reportDate };
  const o = m.result.overall;
  p.snapshot = { verified_score: o.verifiedScore, coverage: o.coverage, confidence: o.confidence, report_date: m.reportDate };
  return finish(p);
}
