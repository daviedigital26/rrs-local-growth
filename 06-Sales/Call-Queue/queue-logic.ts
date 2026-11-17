/**
 * Call queue logic: pure and browser-safe, shared by the queue page, the CLI and the tests.
 *
 * The call log is append-only events (`rrs.call-event/1`). A lead's current state is always
 * recomputed from its imported starting point plus its events, so undo = delete an event,
 * and the same log can be replayed into scoring (`leads:score`).
 */
import { OUTCOMES, QUEUE_CONFIG, STAGE_RANK, outcomeDef, type Channel, type ObjectionId, type Outcome, type QueueConfig, type Stage } from './queue-config.ts';

export interface QueueTheme { id: string; label: string; phrase: string; relevance: number }
export interface QueuePart { label: string; points: number | null; weight: number; reasons: string[] }

/** One lead as the queue page needs it (built from an ICP result by `toQueueDataset`). */
export interface QueueLead {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  band: string;
  band_label: string;
  points: number;
  fit: number | null;
  fit_label: string;
  opportunity: number | null;
  opportunity_label: string;
  confidence: string;
  confidence_pct: number;
  next_action: string;
  themes: QueueTheme[];
  /** How many sampled review excerpts were checked, and how many contained a complaint. */
  review_sample: { size: number; with_complaints: number };
  parts: QueuePart[];
  ownership: string | null;
  franchise: boolean;
  rating: number | null;
  reviews: number | null;
  old_score: number | null;
  old_tier: string | null;
  last_verified: string | null;
  fictional: boolean;
  /** State carried over from the old tracker or a previous call log. */
  start: { stage: Stage; follow_up: string | null; value: number | null; notes: string; last_activity: string | null };
}

export interface QueueDataset {
  schema: 'rrs.call-queue/1';
  as_of: string;
  icp_version: string;
  queue_version: string;
  fictional: boolean;
  leads: QueueLead[];
}

export type EventType = 'outcome' | 'stage' | 'follow_up' | 'value' | 'note' | 'service' | 'channel' | 'permission' | 'reopen';
export interface CallEvent {
  id: string;
  lead: string;
  at: string;
  type: EventType;
  outcome?: Outcome;
  stage?: Stage;
  /** follow-up / callback / appointment date, YYYY-MM-DD (null clears it). */
  date?: string | null;
  value?: number | null;
  note?: string;
  objection?: ObjectionId;
  permission?: boolean;
  service?: string;
  channel?: Channel;
}

export interface CallLog { schema: 'rrs.call-log/1'; exported_at: string; queue_version: string; events: CallEvent[]; suppression: Array<{ lead: string; name: string; phone: string | null }> }

export interface LeadState {
  stage: Stage;
  attempts: number;
  unreached: number;
  connects: number;
  follow_up: string | null;
  value: number | null;
  bad_number: boolean;
  parked: boolean;
  last_outcome: Outcome | null;
  last_at: string | null;
  objection: ObjectionId | null;
  permission: boolean | null;
  service: string | null;
  channel: Channel | null;
  notes: string[];
  events: CallEvent[];
}

// ── Dates (calendar dates in the owner's time zone; business days skip Sat/Sun) ──
export function dateIn(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export function addBusinessDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const nextBusinessDay = (date: string) => addBusinessDays(date, 1);

export interface LocalClock { tz: string; time: string; weekday: number; hour: number; status: 'open' | 'early' | 'late' | 'weekend'; label: string }

/** The business's local time and whether it is inside the courtesy calling window. */
export function localClock(state: string | null, nowIso: string, cfg: QueueConfig = QUEUE_CONFIG): LocalClock {
  const tz = (state && cfg.timeZones[state]) || cfg.ownerTimeZone;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(nowIso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = Number(get('hour')) % 24;
  const minute = get('minute');
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const w = cfg.callWindow;
  const status: LocalClock['status'] = !w.weekdays.includes(weekday) ? 'weekend' : hour < w.startHour ? 'early' : hour >= w.endHour ? 'late' : 'open';
  const time = `${((hour + 11) % 12) + 1}:${minute} ${hour < 12 ? 'AM' : 'PM'}`;
  const label = { open: 'Good time to call', early: `Before ${w.startHour} AM there`, late: 'After business hours there', weekend: 'Weekend there' }[status];
  return { tz, time, weekday, hour, status, label };
}

// ── State ────────────────────────────────────────────────────────────────
const byTime = (a: CallEvent, b: CallEvent) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id);

export function reduceLead(lead: QueueLead, all: CallEvent[], cfg: QueueConfig = QUEUE_CONFIG): LeadState {
  const events = all.filter((e) => e.lead === lead.id).sort(byTime);
  const s: LeadState = {
    stage: lead.start.stage, attempts: lead.start.stage === 'attempted' ? 1 : 0, unreached: lead.start.stage === 'attempted' ? 1 : 0, connects: 0,
    follow_up: lead.start.follow_up, value: lead.start.value, bad_number: false, parked: false, last_outcome: null, last_at: null,
    objection: null, permission: null, service: null, channel: null, notes: lead.start.notes ? [lead.start.notes] : [], events,
  };
  for (const e of events) {
    const day = dateIn(e.at, cfg.ownerTimeZone);
    if (e.note) s.notes.push(e.note);
    switch (e.type) {
      case 'outcome': {
        if (!e.outcome) break;
        const def = outcomeDef(e.outcome);
        s.attempts++;
        s.last_outcome = e.outcome;
        s.last_at = e.at;
        if (e.objection) s.objection = e.objection;
        if (typeof e.permission === 'boolean') s.permission = e.permission;
        if (typeof e.value === 'number') s.value = e.value;
        if (e.outcome === 'wrong_number') { s.bad_number = true; s.follow_up = null; break; }
        if (e.outcome === 'do_not_call') { s.stage = 'do_not_contact'; s.follow_up = null; s.parked = false; break; }
        if (def.reached) { s.connects++; s.unreached = 0; s.parked = false; } else s.unreached++;
        const target = def.stage as Stage | null;
        if (target === 'declined') s.stage = 'declined';
        else if (target && s.stage !== 'do_not_contact' && (s.stage === 'declined' || STAGE_RANK[target] > STAGE_RANK[s.stage])) s.stage = target;
        // Next date: an explicit date wins; otherwise the cadence for this outcome.
        if (e.date !== undefined) s.follow_up = e.date;
        else if (!def.reached) {
          if (s.unreached >= cfg.maxAttempts) { s.parked = true; s.follow_up = null; }
          else s.follow_up = addBusinessDays(day, cfg.cadenceDays[Math.min(s.unreached, cfg.cadenceDays.length) - 1] ?? 1);
        } else if (e.outcome === 'interested') s.follow_up = addBusinessDays(day, cfg.interestedFollowUpDays);
        else if (e.outcome === 'callback') s.follow_up = nextBusinessDay(day);
        else if (e.outcome === 'not_now') s.follow_up = e.permission ? addDays(day, cfg.notNowDays) : null;
        else if (e.outcome === 'not_interested') s.follow_up = null;
        if (e.outcome === 'not_now' && e.permission === false) s.stage = 'declined';
        break;
      }
      case 'stage': if (e.stage) { s.stage = e.stage; if (e.stage === 'do_not_contact' || e.stage === 'declined') s.follow_up = null; } break;
      case 'follow_up': s.follow_up = e.date ?? null; break;
      case 'value': s.value = typeof e.value === 'number' ? e.value : null; break;
      case 'service': s.service = e.service ?? null; break;
      case 'channel': s.channel = e.channel ?? null; break;
      case 'permission': s.permission = e.permission ?? null; break;
      case 'reopen': s.parked = false; s.unreached = 0; s.bad_number = false; if (s.stage === 'declined') s.stage = 'contacted'; s.follow_up = e.date ?? day; break;
      case 'note': break;
    }
  }
  return s;
}

// ── Queue ────────────────────────────────────────────────────────────────
export const BAND_ORDER = ['inbound', 'p1', 'p2', 'p3', 'research_first', 'in_progress', 'closed', 'do_not_contact', 'disqualified'];
const UNCALLABLE_BANDS = new Set(['do_not_contact', 'disqualified']);

export interface QueueItem { lead: QueueLead; state: LeadState; clock: LocalClock; overdue: boolean; reason: string }
export interface Queue {
  today: string;
  next: QueueItem | null;
  due: QueueItem[];
  fresh: QueueItem[];
  later: QueueItem[];
  doneToday: QueueItem[];
  research: QueueItem[];
  parked: QueueItem[];
  closed: QueueItem[];
  stats: QueueStats;
}
export interface QueueStats {
  callsToday: number; reachedToday: number; bookedToday: number; goal: number;
  due: number; overdue: number; fresh: number;
  pipelineValue: number; closedValue: number;
  byStage: Record<string, number>;
}

const bandRank = (l: QueueLead) => { const i = BAND_ORDER.indexOf(l.band); return i < 0 ? BAND_ORDER.length : i; };
const priority = (a: QueueItem, b: QueueItem) => bandRank(a.lead) - bandRank(b.lead) || b.lead.points - a.lead.points || b.lead.confidence_pct - a.lead.confidence_pct || a.lead.name.localeCompare(b.lead.name);
/** Businesses that are open right now come first; the rest keep their order. */
const openFirst = (items: QueueItem[]) => [...items.filter((i) => i.clock.status === 'open'), ...items.filter((i) => i.clock.status !== 'open')];

export function buildQueue(leads: QueueLead[], events: CallEvent[], nowIso: string, cfg: QueueConfig = QUEUE_CONFIG, goal = cfg.dailyGoal): Queue {
  const today = dateIn(nowIso, cfg.ownerTimeZone);
  const items = leads.map((lead) => {
    const state = reduceLead(lead, events, cfg);
    return { lead, state, clock: localClock(lead.state, nowIso, cfg), overdue: !!state.follow_up && state.follow_up < today, reason: '' } as QueueItem;
  });
  const due: QueueItem[] = [], fresh: QueueItem[] = [], later: QueueItem[] = [], research: QueueItem[] = [], parked: QueueItem[] = [], closed: QueueItem[] = [];
  for (const it of items) {
    const { state: s, lead: l } = it;
    if (s.stage === 'do_not_contact' || UNCALLABLE_BANDS.has(l.band) || s.stage === 'declined' && !s.follow_up) { it.reason = s.stage === 'do_not_contact' || l.band === 'do_not_contact' ? 'Do not contact' : l.band === 'disqualified' ? 'Disqualified' : 'Declined'; closed.push(it); continue; }
    if (s.bad_number || !l.phone) { it.reason = s.bad_number ? 'Wrong number: find a working one' : 'No phone on file'; research.push(it); continue; }
    if (s.parked) { it.reason = `${s.unreached} tries, no answer: parked`; parked.push(it); continue; }
    if (cfg.closedStages.includes(s.stage) && !s.follow_up) { it.reason = 'Won'; closed.push(it); continue; }
    if (s.follow_up) {
      if (s.follow_up <= today) { it.reason = it.overdue ? `Overdue since ${s.follow_up}` : s.stage === 'audit_booked' ? 'Audit today' : 'Follow-up due today'; due.push(it); }
      else { it.reason = `Next: ${s.follow_up}`; later.push(it); }
      continue;
    }
    if (l.band === 'research_first') { it.reason = 'Research first'; research.push(it); continue; }
    if (s.stage === 'not_contacted') { it.reason = l.band_label; fresh.push(it); continue; }
    it.reason = s.stage === 'audit_booked' ? 'Audit booked: set the date' : s.stage === 'attempted' ? 'Called before: no follow-up date' : 'No next step set'; due.push(it);
  }
  due.sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.state.follow_up ?? '').localeCompare(b.state.follow_up ?? '') || priority(a, b));
  fresh.sort(priority);
  later.sort((a, b) => (a.state.follow_up ?? '').localeCompare(b.state.follow_up ?? '') || priority(a, b));
  research.sort(priority); parked.sort(priority);
  const dueOrdered = openFirst(due);
  const freshOrdered = openFirst(fresh);

  const todays = events.filter((e) => e.type === 'outcome' && dateIn(e.at, cfg.ownerTimeZone) === today);
  const doneIds = new Set(todays.map((e) => e.lead));
  const doneToday = items.filter((i) => doneIds.has(i.lead.id));
  const byStage: Record<string, number> = {};
  let pipelineValue = 0, closedValue = 0;
  for (const it of items) {
    byStage[it.state.stage] = (byStage[it.state.stage] ?? 0) + 1;
    if (it.state.value && cfg.pipelineStages.includes(it.state.stage)) pipelineValue += it.state.value;
    if (it.state.value && cfg.closedStages.includes(it.state.stage)) closedValue += it.state.value;
  }
  return {
    today, next: dueOrdered[0] ?? freshOrdered[0] ?? null, due: dueOrdered, fresh: freshOrdered, later, doneToday, research, parked, closed,
    stats: {
      callsToday: todays.length,
      reachedToday: todays.filter((e) => e.outcome && outcomeDef(e.outcome).reached).length,
      bookedToday: todays.filter((e) => e.outcome === 'audit_booked').length,
      goal, due: due.length, overdue: due.filter((d) => d.overdue).length, fresh: fresh.length, pipelineValue, closedValue, byStage,
    },
  };
}

/** Follow-ups and appointments for the next `days` days, grouped by date (the follow-up calendar). */
export function calendar(leads: QueueLead[], events: CallEvent[], nowIso: string, days = 14, cfg: QueueConfig = QUEUE_CONFIG): Array<{ date: string; items: Array<{ lead: QueueLead; state: LeadState }> }> {
  const today = dateIn(nowIso, cfg.ownerTimeZone);
  const end = addDays(today, days);
  const map = new Map<string, Array<{ lead: QueueLead; state: LeadState }>>();
  for (const lead of leads) {
    const state = reduceLead(lead, events, cfg);
    const d = state.follow_up;
    if (!d || d > end || state.stage === 'do_not_contact') continue;
    const key = d < today ? today : d;
    map.set(key, [...(map.get(key) ?? []), { lead, state }]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date, items }));
}

// ── Results by priority (does the scoring predict outcomes?) ────────────
export interface OutcomeRow { group: string; leads: number; called: number; reached: number; booked: number; won: number }

export function outcomeStats(leads: QueueLead[], events: CallEvent[], by: 'band' | 'theme' | 'old_tier', cfg: QueueConfig = QUEUE_CONFIG): OutcomeRow[] {
  const rows = new Map<string, OutcomeRow>();
  for (const lead of leads) {
    const keys = by === 'band' ? [lead.band_label] : by === 'old_tier' ? [lead.old_tier ?? 'none'] : lead.themes.length ? lead.themes.map((t) => t.label) : ['no complaint found'];
    const s = reduceLead(lead, events, cfg);
    const mine = s.events.filter((e) => e.type === 'outcome');
    for (const k of keys) {
      const r = rows.get(k) ?? { group: k, leads: 0, called: 0, reached: 0, booked: 0, won: 0 };
      r.leads++;
      if (mine.length) r.called++;
      if (mine.some((e) => e.outcome && outcomeDef(e.outcome).reached)) r.reached++;
      if (STAGE_RANK[s.stage] >= STAGE_RANK.audit_booked) r.booked++;
      if (cfg.closedStages.includes(s.stage)) r.won++;
      rows.set(k, r);
    }
  }
  return [...rows.values()].sort((a, b) => b.leads - a.leads || a.group.localeCompare(b.group));
}

export function newEventId(nowIso: string, rand: () => number = Math.random): string {
  return `ev_${nowIso.replace(/\D/g, '').slice(0, 14)}_${Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0')}`;
}

export function toCallLog(leads: QueueLead[], events: CallEvent[], nowIso: string, cfg: QueueConfig = QUEUE_CONFIG): CallLog {
  const suppression = leads.filter((l) => reduceLead(l, events, cfg).stage === 'do_not_contact').map((l) => ({ lead: l.id, name: l.name, phone: l.phone }));
  return { schema: 'rrs.call-log/1', exported_at: nowIso, queue_version: cfg.version, events: [...events].sort(byTime), suppression };
}

/** Validate a pasted/imported call log; returns readable problems. */
export function validateCallLog(x: unknown): string[] {
  const errs: string[] = [];
  const o = x as Partial<CallLog>;
  if (!o || o.schema !== 'rrs.call-log/1') return ['not a call log (schema rrs.call-log/1)'];
  if (!Array.isArray(o.events)) return ['events must be a list'];
  const outcomes = new Set(OUTCOMES.map((d) => d.id));
  o.events.forEach((e, i) => {
    if (!e || typeof e.id !== 'string' || typeof e.lead !== 'string' || typeof e.at !== 'string' || Number.isNaN(Date.parse(e.at))) errs.push(`event ${i + 1}: needs id, lead and a valid time`);
    else if (e.type === 'outcome' && !outcomes.has(e.outcome as Outcome)) errs.push(`event ${i + 1}: unknown outcome "${e.outcome}"`);
  });
  return errs;
}

export function mergeEvents(a: CallEvent[], b: CallEvent[]): CallEvent[] {
  const seen = new Map(a.map((e) => [e.id, e]));
  for (const e of b) if (!seen.has(e.id)) seen.set(e.id, e);
  return [...seen.values()].sort(byTime);
}
