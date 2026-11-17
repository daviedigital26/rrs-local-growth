/**
 * Script library for the call queue (spec Part 8): cold-call opener in the five gears,
 * gatekeeper, voicemail, first email, no-response follow-up, not-now follow-up, post-call
 * recap and a short LinkedIn note. Browser-safe.
 *
 * Honesty rules, enforced by tests:
 *  - only a VERIFIED review theme (relevance ≥ 0.5) is ever mentioned; otherwise ask, don't claim
 *  - no statistics, prices, client stories or results; no pretend prior relationship
 *  - every email carries the sender's postal address and a plain opt-out line (CAN-SPAM),
 *    and warns when the address is missing
 * These are drafts for the owner to say or send personally. Nothing is sent automatically.
 */
import { offerById } from '../../03-Offers-and-Pricing/offer-catalog.ts';
import type { QueueLead, LeadState } from '../Call-Queue/queue-logic.ts';

export interface ScriptSettings {
  callerName: string;
  company: string;
  callbackNumber: string;
  mailingAddress: string;
  /** What the call asks for: the free Snapshot (default) or the owner's paid audit. */
  ask: 'snapshot' | 'audit';
  dailyGoal: number;
}
export const DEFAULT_SETTINGS: ScriptSettings = { callerName: '', company: 'Reale Revenue Systems', callbackNumber: '', mailingAddress: '', ask: 'snapshot', dailyGoal: 20 };

export interface Script { id: string; title: string; kind: 'call' | 'email' | 'note'; subject?: string; lines: Array<{ gear?: string; text: string }>; warnings: string[] }

interface Words { customers: string; requests: string; losses: string; afterHours: string }
const WORDS: Record<string, Words> = {
  'property-management': { customers: 'tenants and owners', requests: 'calls and maintenance requests', losses: 'a lease, a renewal or an owner’s trust', afterHours: 'an after-hours maintenance call' },
  'home-services': { customers: 'customers', requests: 'calls and quote requests', losses: 'the job going to a competitor', afterHours: 'a 6 pm call for a quote' },
  'auto-detailing': { customers: 'customers', requests: 'calls and booking requests', losses: 'the booking going elsewhere', afterHours: 'an evening booking request' },
  default: { customers: 'customers', requests: 'calls and inquiries', losses: 'the customer going elsewhere', afterHours: 'a new inquiry after hours' },
};
const words = (l: QueueLead) => WORDS[l.industry ?? ''] ?? WORDS.default!;

/** What each verified theme sounds like on a call, and which offer addresses it. */
const THEME_TALK: Record<string, { problem: string; short: string; offer: string }> = {
  unanswered: { problem: 'calls or messages not getting returned', short: 'call-backs', offer: 'lead-rescue-booking-engine' },
  slow: { problem: 'slow responses and long waits', short: 'response times', offer: 'lead-rescue-booking-engine' },
  process: { problem: 'a confusing process or tools that didn’t work', short: 'your application process', offer: 'website-to-customer-conversion' },
  repairs: { problem: 'repairs taking a long time to get scheduled', short: 'request routing', offer: 'lead-rescue-booking-engine' },
  service: { problem: 'frustrating experiences getting help', short: 'how requests get handled', offer: 'reputation-revenue-engine' },
};

export function openingTheme(l: QueueLead) {
  const t = l.themes.find((x) => x.relevance >= 0.5 && THEME_TALK[x.id]);
  return t ? { ...t, ...THEME_TALK[t.id]! } : null;
}

const first = (s: ScriptSettings) => s.callerName.trim() || '(your name)';
/** Never overstate: one complaining review is "one", not "a couple". */
const reviewsSay = (l: QueueLead) => (l.review_sample.with_complaints > 1 ? 'A few of your public reviews mention' : 'One of your public reviews mentions');
const bridge = (s: ScriptSettings, w: Words) => s.ask === 'audit'
  ? `I run a short paid audit that pinpoints where ${w.requests} slip and what that costs, with a fix plan. Would 15 minutes to see if it's a fit make sense?`
  : `I put together a free Local Revenue Opportunity Snapshot: a short report on where ${w.requests} may be slipping, with the evidence for each point. No obligation. Want me to put one together for you?`;
const askShort = (s: ScriptSettings) => (s.ask === 'audit' ? 'a short audit' : 'a free Snapshot report');

function footer(s: ScriptSettings): { lines: string[]; warnings: string[] } {
  const warnings: string[] = [];
  if (!s.callerName.trim()) warnings.push('Add your name in Settings.');
  if (!s.mailingAddress.trim()) warnings.push('Add your mailing address in Settings: commercial email must include a valid postal address.');
  return { lines: [s.callerName.trim() || 'Your name', s.company, ...(s.mailingAddress.trim() ? [s.mailingAddress.trim()] : []), '', 'If you’d rather not hear from me, reply “no thanks” and I won’t contact you again.'], warnings };
}

export function scriptsFor(l: QueueLead, state: Pick<LeadState, 'follow_up' | 'last_outcome' | 'last_at' | 'stage'> | null, s: ScriptSettings = DEFAULT_SETTINGS): Script[] {
  const w = words(l);
  const t = openingTheme(l);
  const me = first(s);
  const nameWarn = s.callerName.trim() ? [] : ['Add your name in Settings.'];
  const f = footer(s);
  const cb = s.callbackNumber.trim();

  const opener: Script = {
    id: 'opener', title: 'Cold-call opener', kind: 'call', warnings: nameWarn, lines: [
      { gear: 'Curiosity', text: `Hi, this is ${me} with ${s.company}. I'll be quick: I help businesses like ${l.name} make sure ${w.requests} don't slip through. Do you have 30 seconds?` },
      { gear: 'Story', text: `When I look at a company from the outside, the first thing I check is how quickly ${w.customers} get an answer.` },
      t
        ? { gear: 'Root problem', text: `${reviewsSay(l)} ${t.problem}. Is that something you're already working on, or more of a one-off?` }
        : { gear: 'Root problem', text: `From the outside I couldn't tell how ${w.afterHours} gets handled. How does that work for you today?` },
      { gear: 'Consequence', text: `When one slips, what usually happens? Does it cost you ${w.losses}?` },
      { gear: 'Commercial bridge', text: bridge(s, w) },
    ],
  };
  const gatekeeper: Script = {
    id: 'gatekeeper', title: 'Gatekeeper', kind: 'call', warnings: nameWarn, lines: [
      { text: `Hi, this is ${me} with ${s.company}. I'm trying to reach whoever decides how your office handles incoming ${w.requests}. Is that the owner, or someone else?` },
      { text: 'What’s the best time to catch them? And could I get their name so I ask for them properly?' },
      { text: `If asked what it's about: “It's about how ${w.requests} get answered. Two minutes, and I'm happy to send something first if that's easier.”` },
    ],
  };
  const voicemail: Script = {
    id: 'voicemail', title: 'Voicemail (under 25 seconds)', kind: 'call', warnings: [...nameWarn, ...(cb ? [] : ['Add your callback number in Settings.'])], lines: [
      { text: `Hi, this is ${me} with ${s.company}, for whoever handles operations at ${l.name}. I had a quick question about ${t ? t.short : `how ${w.requests} get handled`}, and I can offer ${askShort(s)}.${cb ? ` You can reach me at ${cb}.` : ''} Again, ${me}, ${s.company}. Thanks.` },
    ],
  };
  const email1: Script = {
    id: 'email1', title: 'First email', kind: 'email', warnings: f.warnings,
    subject: t ? `Question about ${t.short}` : `Quick question about ${l.name}`,
    lines: [
      { text: 'Hi,' },
      { text: t ? `I'm ${me} with ${s.company}. ${l.review_sample.with_complaints > 1 ? 'A few public reviews' : 'A public review'} for ${l.name} ${l.review_sample.with_complaints > 1 ? 'mention' : 'mentions'} ${t.problem}. That's usually a process gap, not a people problem.` : `I'm ${me} with ${s.company}. I had a question about how ${l.name} handles ${w.requests} that come in after hours.` },
      { text: bridge(s, w) },
      { text: 'Worth a look, or not the right time?' },
      ...f.lines.map((text) => ({ text })),
    ],
  };
  const followUp: Script = {
    id: 'followup', title: 'No-response follow-up', kind: 'email', warnings: f.warnings,
    subject: `Re: ${email1.subject}`,
    lines: [
      { text: 'Hi,' },
      { text: `Following up on my note. One question that usually tells you a lot: if ${l.name} gets ${w.afterHours}, what happens to it next? If you already have that covered, I'll leave it there.` },
      { text: `If not, I'm happy to send ${askShort(s)}.` },
      ...f.lines.map((text) => ({ text })),
    ],
  };
  const lastDate = state?.last_at ? state.last_at.slice(0, 10) : 'our last call';
  const notNow: Script = {
    id: 'notnow', title: 'Not-now follow-up (only with permission)', kind: 'email', warnings: f.warnings,
    subject: `Checking back, as promised`,
    lines: [
      { text: 'Hi,' },
      { text: `When we spoke on ${lastDate}, it wasn't the right time, and you said it was okay to check back. Is now any better for a quick look at how ${w.requests} are handled?` },
      { text: 'If not, just say so and I won’t follow up again.' },
      ...f.lines.map((text) => ({ text })),
    ],
  };
  const booked = state?.stage === 'audit_booked' && state.follow_up;
  const recap: Script = {
    id: 'recap', title: 'Post-call recap', kind: 'email', warnings: f.warnings,
    subject: `Thanks for the time today`,
    lines: [
      { text: 'Hi,' },
      { text: `Thanks for talking with me today about how ${l.name} handles ${w.requests}.` },
      { text: booked ? `As agreed, we're set for ${state!.follow_up}. I'll come prepared with what I find.` : `As discussed, next step: ${s.ask === 'audit' ? 'I’ll send a short outline of the audit for you to review.' : 'I’ll put together your Snapshot and send it over.'}` },
      { text: 'Reply here if anything changes.' },
      ...f.lines.map((text) => ({ text })),
    ],
  };
  const linkedin: Script = {
    id: 'linkedin', title: 'LinkedIn note', kind: 'note', warnings: nameWarn, lines: [
      { text: `Hi, I'm ${me} with ${s.company}. I work with businesses like ${l.name} on how ${w.requests} get answered and followed up. ${t ? `I had a question about ${t.short}.` : ''} Open to connecting?`.replace(/\s+/g, ' ').trim() },
    ],
  };
  return [opener, gatekeeper, voicemail, email1, followUp, notNow, recap, linkedin];
}

/** Interest → the offer that fits, for "not the website, but the missed calls" moments (spec Part 8). */
export const INTERESTS = [
  { id: 'missed_calls', label: 'Missed calls', offer: 'lead-rescue-booking-engine' },
  { id: 'follow_up', label: 'Follow-up', offer: 'lead-rescue-booking-engine' },
  { id: 'reviews', label: 'Reviews', offer: 'reputation-revenue-engine' },
  { id: 'website', label: 'Website', offer: 'website-to-customer-conversion' },
  { id: 'maps', label: 'Google Maps', offer: 'local-visibility-jumpstart' },
  { id: 'ai', label: 'AI search', offer: 'ai-discovery-accelerator' },
] as const;

export function alternativeFor(interest: (typeof INTERESTS)[number]['id'], l: QueueLead, s: ScriptSettings = DEFAULT_SETTINGS): Script {
  const def = INTERESTS.find((i) => i.id === interest)!;
  const offer = offerById(def.offer);
  const f = footer(s);
  return {
    id: `alt-${interest}`, title: `Follow-up about ${def.label.toLowerCase()}`, kind: 'email', warnings: f.warnings,
    subject: `${def.label}: what we talked about`,
    lines: [
      { text: 'Hi,' },
      { text: `Thanks for being open about what matters to ${l.name} right now. You mentioned ${def.label.toLowerCase()}, so instead of the other idea, the closer fit is ${offer?.name ?? def.label}${offer?.tagline ? `: ${offer.tagline.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase())}` : ''}.` },
      { text: 'You said it was fine for me to send this. Happy to walk through it in 10 minutes, or leave it with you.' },
      ...f.lines.map((text) => ({ text })),
    ],
  };
}

export const scriptText = (sc: Script) => [sc.subject ? `Subject: ${sc.subject}` : '', ...sc.lines.map((l) => l.text)].filter((x, i) => i > 0 || x).join('\n');
