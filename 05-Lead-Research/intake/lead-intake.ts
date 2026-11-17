/**
 * Server-side intake for website submissions (Snapshot requests + contact form).
 * Pure, dependency-free TypeScript. It runs in tests, in the local mock endpoint,
 * and, bundled by esbuild, inside the n8n intake workflow's Code node.
 *
 * Never trusts the browser: re-validates everything, strips unknown fields,
 * re-checks spam signals, normalises identity fields and builds a dedupe key.
 */
import { allCriteria, TIERS } from '../../04-Audits-and-Scorecards/snapshot/framework.ts';

export const INTAKE_VERSION = '1.0.0';
export const INDUSTRY_VALUES = ['home-services', 'auto-detailing', 'property-management', 'recurring-services', 'remodeling', 'professional-services', 'realtor', 'other'] as const;
export const CONCERN_VALUES = ['Not showing up on Google Maps', 'Not enough reviews', 'Website doesn’t bring in calls', 'Missed calls or slow follow-up', 'Curious about AI search', 'Not sure, that’s why I’m here'] as const;
export const CONTACT_TOPICS = ['general', 'pricing', 'realtor-pipeline-recovery', 'profit-leak-audit', 'detailer-booking-recovery', 'partnership', 'med-spa', 'chiropractic', 'dental'] as const;
const OWNER_CRITERIA = allCriteria.filter((c) => c.ownerQuestion).map((c) => c.id);
const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer', 'landing_page', 'first_touch_at'] as const;
/** Minimum human fill time. Submissions faster than this are treated as automated. */
export const MIN_FILL_MS = 3000;

export type IntakeStatus = 'accepted' | 'spam' | 'invalid';

export interface LeadRecord {
  schema: 'rrs.lead/1';
  lead_id: string;
  form: 'snapshot_request' | 'contact';
  received_at: string;
  submitted_at: string;
  dedupe_key: string;
  business: { name: string | null; website: string | null; domain: string | null; city: string | null; industry: string | null };
  contact: { name: string; email: string; phone: string | null; preferred_channel: 'email' | 'phone' | 'text' };
  interest: string | null;
  topic: string | null;
  message: string | null;
  concerns: string[];
  self_check: Record<string, number | 'not_verified'>;
  consent: { contact: true; sms: boolean; text: string; captured_at: string };
  attribution: Partial<Record<(typeof ATTR_KEYS)[number], string>>;
  signals: { fill_seconds: number | null; no_timing: boolean };
  status: 'new';
  next_action: string;
  intake_version: string;
}

export interface IntakeResult { status: IntakeStatus; errors: string[]; record?: LeadRecord }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const truthy = (v: unknown) => v === true || v === 'true' || v === 'yes' || v === 'on';

export function normalizeWebsite(raw: string): { url: string; domain: string } | null {
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(u.protocol) || !/\.[a-z]{2,}$/i.test(u.hostname) || u.username || u.password) return null;
    const domain = u.hostname.toLowerCase().replace(/^www\./, '');
    return { url: `${u.protocol}//${u.hostname.toLowerCase()}${u.pathname === '/' ? '' : u.pathname}`, domain };
  } catch { return null; }
}

/** US-first phone normalisation to E.164. Returns null when it isn't a plausible number. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  if (d.length >= 11 && d.length <= 15) return `+${d}`;
  return null;
}

export const normalizeName = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\b(llc|inc|co|company|corp|ltd|the)\b/g, ' ').replace(/\s+/g, ' ').trim();

/** Same identity rule as the CRM record: domain first, else normalised name + city, else email. */
export function dedupeKey(p: { domain?: string | null; name?: string | null; city?: string | null; email?: string | null }): string {
  if (p.domain) return `domain:${p.domain}`;
  if (p.name) return `name:${normalizeName(p.name)}|area:${normalizeName(p.city ?? '')}`;
  return `email:${(p.email ?? '').toLowerCase()}`;
}

/** FNV-1a 32-bit → base36. No crypto module needed (n8n Code nodes may block built-ins). */
export function shortHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).padStart(7, '0');
}

export function processSubmission(body: unknown, nowIso: string): IntakeResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 'invalid', errors: ['Body must be a JSON object'] };
  const b = body as Record<string, unknown>;
  const form = b.form === 'contact' ? 'contact' : b.form === 'snapshot_request' ? 'snapshot_request' : null;
  if (!form) return { status: 'invalid', errors: ['Unknown form'] };

  // Spam signals (checked before validation so bots learn nothing from error messages)
  if (clean(b.company_website, 200)) return { status: 'spam', errors: [] };
  const submittedAt = Number.isNaN(Date.parse(String(b.submitted_at))) ? nowIso : new Date(String(b.submitted_at)).toISOString();
  const startedMs = Date.parse(String(b.form_started_at ?? ''));
  const noTiming = Number.isNaN(startedMs);
  const fillMs = noTiming ? null : Date.parse(submittedAt) - startedMs;
  if (fillMs !== null && fillMs < MIN_FILL_MS) return { status: 'spam', errors: [] };

  const errors: string[] = [];
  const contactName = clean(b.contact_name, 80);
  const email = clean(b.email, 120).toLowerCase();
  const phoneRaw = clean(b.phone, 30);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (!contactName) errors.push('contact_name is required');
  if (!EMAIL.test(email)) errors.push('email is invalid');
  if (phoneRaw && !phone) errors.push('phone is invalid');
  if (!truthy(b.consent_contact)) errors.push('consent_contact must be true');
  const consentText = clean(b.consent_text, 600);
  if (!consentText) errors.push('consent_text is required');
  const channel = (['email', 'phone', 'text'] as const).find((c) => c === b.preferred_channel) ?? 'email';
  const sms = truthy(b.consent_sms);
  if (channel === 'text' && !sms) errors.push('preferred_channel text requires consent_sms');
  if (channel !== 'email' && !phone) errors.push(`preferred_channel ${channel} requires a phone number`);

  let businessName: string | null = null, website: ReturnType<typeof normalizeWebsite> = null, city: string | null = null, industry: string | null = null;
  let concerns: string[] = [];
  const selfCheck: Record<string, number | 'not_verified'> = {};
  let topic: string | null = null, message: string | null = null;

  if (form === 'snapshot_request') {
    businessName = clean(b.business_name, 120) || null;
    if (!businessName) errors.push('business_name is required');
    const w = clean(b.website, 200);
    website = normalizeWebsite(w);
    if (w && !website) errors.push('website is invalid');
    city = clean(b.city, 80) || null;
    if (!city) errors.push('city is required');
    industry = INDUSTRY_VALUES.find((v) => v === b.industry) ?? null;
    if (!industry) errors.push('industry is invalid');
    if (Array.isArray(b.concerns)) concerns = b.concerns.filter((c): c is string => typeof c === 'string' && (CONCERN_VALUES as readonly string[]).includes(c)).slice(0, CONCERN_VALUES.length);
    if (b.self_check && typeof b.self_check === 'object') {
      for (const [k, v] of Object.entries(b.self_check as Record<string, unknown>)) {
        if (!OWNER_CRITERIA.includes(k)) continue;
        if (v === 'not_verified') selfCheck[k] = 'not_verified';
        else if (typeof v === 'number' && (TIERS as readonly number[]).includes(v)) selfCheck[k] = v;
      }
    }
  } else {
    businessName = clean(b.business_name, 120) || null;
    topic = CONTACT_TOPICS.find((t) => t === b.topic) ?? 'general';
    message = clean(b.message, 2000) || null;
    if (!message) errors.push('message is required');
  }

  if (errors.length) return { status: 'invalid', errors };

  const attribution: LeadRecord['attribution'] = {};
  const a = (b.attribution && typeof b.attribution === 'object' ? b.attribution : {}) as Record<string, unknown>;
  for (const k of ATTR_KEYS) { const v = clean(a[k], 300); if (v) attribution[k] = v; }

  const key = dedupeKey({ domain: website?.domain, name: businessName, city, email });
  return {
    status: 'accepted',
    errors: [],
    record: {
      schema: 'rrs.lead/1',
      lead_id: `lead_${shortHash(`${key}|${submittedAt}`)}`,
      form,
      received_at: nowIso,
      submitted_at: submittedAt,
      dedupe_key: key,
      business: { name: businessName, website: website?.url ?? null, domain: website?.domain ?? null, city, industry },
      contact: { name: contactName, email, phone, preferred_channel: channel },
      interest: clean(b.interest, 80) || null,
      topic,
      message,
      concerns,
      self_check: selfCheck,
      consent: { contact: true, sms, text: consentText, captured_at: submittedAt },
      attribution,
      signals: { fill_seconds: fillMs === null ? null : Math.round(fillMs / 1000), no_timing: noTiming },
      status: 'new',
      next_action: form === 'snapshot_request' ? 'Prepare Snapshot draft; manual review before any delivery' : 'Reply to message',
      intake_version: INTAKE_VERSION,
    },
  };
}
