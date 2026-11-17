/**
 * Call queue page (browser). Bundled by build-queue.ts into one self-contained HTML file.
 *
 * Two storage modes, chosen at start:
 *  - local: data embedded in the page, outcomes kept in this browser (standalone file)
 *  - db:    published as a claude.ai artifact; leads, outcomes and settings live in the
 *           artifact's database, so they follow the owner across devices and Claude can read
 *           the call log back for re-scoring.
 * Everything is rendered from (leads + events) through queue-logic, so the page, the CLI
 * and the tests agree.
 */
import { OUTCOMES, OBJECTIONS, QUEUE_CONFIG, STAGES, outcomeDef, stageLabel, type Channel, type ObjectionId, type Outcome, type Stage } from './queue-config.ts';
import { buildQueue, calendar, dateIn, mergeEvents, newEventId, outcomeStats, reduceLead, toCallLog, validateCallLog, addBusinessDays, nextBusinessDay, type CallEvent, type QueueDataset, type QueueItem, type QueueLead } from './queue-logic.ts';
import { DEFAULT_SETTINGS, INTERESTS, alternativeFor, openingTheme, scriptText, scriptsFor, type Script, type ScriptSettings } from '../Call-Scripts/call-scripts.ts';
import { OBJECTION_REPLIES } from '../Objections/objections.ts';
import { offers } from '../../03-Offers-and-Pricing/offer-catalog.ts';

type View = 'queue' | 'pipeline' | 'leads' | 'log';
interface Store { kind: 'local' | 'db' | 'memory'; label: string; add(e: CallEvent): Promise<void>; remove(id: string): Promise<void>; saveSettings(s: ScriptSettings): Promise<void> }

const W = window as unknown as { claude?: { use(n: string): Promise<any> }; __RRS_NOW__?: string };
const now = () => W.__RRS_NOW__ ?? new Date().toISOString();
const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const fmtPhone = (p: string | null) => { const m = p?.match(/^\+1(\d{3})(\d{3})(\d{4})$/); return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p ?? ''; };
const fmtDate = (d: string | null) => { if (!d) return ''; const x = new Date(`${d}T12:00:00Z`); return x.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }); };
const bandClass = (b: string) => (/^(p1|inbound)$/.test(b) ? 'b1' : b === 'p2' ? 'b2' : 'b3');

const S = {
  store: null as Store | null,
  meta: null as Omit<QueueDataset, 'leads'> | null,
  leads: [] as QueueLead[],
  events: [] as CallEvent[],
  settings: { ...DEFAULT_SETTINGS } as ScriptSettings,
  view: 'queue' as View,
  focus: null as string | null,
  current: null as string | null,
  skipped: new Set<string>(),
  open: null as string | null,
  pending: null as null | { lead: string; outcome: Outcome; date: string; value: string; note: string; objection: ObjectionId | null; permission: boolean | null },
  toast: null as null | { text: string; undo?: string },
  script: 'opener',
  objection: null as ObjectionId | null,
  interest: null as string | null,
  q: '',
  filter: 'all',
  showScript: false,
  unsaved: 0,
};

// ── Storage ──────────────────────────────────────────────────────────────
function localStore(key: string): Store {
  const k = `rrs-queue:${key}`;
  let ok = true;
  try { localStorage.setItem(`${k}:probe`, '1'); localStorage.removeItem(`${k}:probe`); } catch { ok = false; }
  const persist = () => { try { localStorage.setItem(`${k}:events`, JSON.stringify(S.events)); } catch { /* full or blocked */ } };
  if (ok) {
    try { const saved = JSON.parse(localStorage.getItem(`${k}:events`) ?? '[]'); if (Array.isArray(saved)) S.events = mergeEvents(S.events, saved); } catch { /* ignore */ }
    try { const st = JSON.parse(localStorage.getItem('rrs-queue:settings') ?? 'null'); if (st) S.settings = { ...S.settings, ...st }; } catch { /* ignore */ }
  }
  return {
    kind: ok ? 'local' : 'memory',
    label: ok ? 'Saved on this device' : 'Not saved: export your log before closing',
    add: async () => persist(), remove: async () => persist(),
    saveSettings: async (s) => { try { localStorage.setItem('rrs-queue:settings', JSON.stringify(s)); } catch { /* ignore */ } },
  };
}

const docsOf = (snap: any): any[] => {
  const list = Array.isArray(snap) ? snap : snap?.docs ?? snap?.items ?? snap?.documents ?? [];
  return list.map((d: any) => (typeof d?.data === 'function' ? { id: d.id, ...d.data() } : d?.data && typeof d.data === 'object' ? { id: d.id, ...d.data } : d)).filter(Boolean);
};
const dataOf = (snap: any): any => (snap == null || snap.exists === false ? null : typeof snap.data === 'function' ? snap.data() : snap.data ?? snap);

async function dbStore(db: any): Promise<Store> {
  const [leads, calls, settings] = await Promise.all([
    S.leads.length ? null : db.collection('leads').get(), db.collection('calls').get(), db.doc('settings/main').get().catch(() => null),
  ]);
  if (leads) S.leads = docsOf(leads).filter((l: QueueLead) => l && l.name && l.start);
  S.events = mergeEvents([], docsOf(calls).filter((e: CallEvent) => e && e.lead && e.at));
  const st = dataOf(settings);
  if (st) S.settings = { ...S.settings, ...st };
  let chain = Promise.resolve();
  const run = (f: () => Promise<unknown>) => { S.unsaved++; chain = chain.then(f).then(() => { S.unsaved--; }, () => { S.unsaved--; toast('Couldn’t save that change. Check your connection, then export the log to be safe.'); }); return chain; };
  return {
    kind: 'db', label: 'Saved to your account',
    add: (e) => run(() => db.collection('calls').doc(e.id).set(e)),
    remove: (id) => run(() => db.collection('calls').doc(id).delete()),
    saveSettings: (s) => run(() => db.doc('settings/main').set(s)),
  };
}

// ── Actions ──────────────────────────────────────────────────────────────
async function addEvent(e: Omit<CallEvent, 'id' | 'at'> & { at?: string }): Promise<CallEvent> {
  const at = e.at ?? now();
  const ev = { ...e, at, id: newEventId(at) } as CallEvent;
  for (const k of Object.keys(ev) as Array<keyof CallEvent>) if (ev[k] === undefined) delete ev[k];
  S.events = mergeEvents(S.events, [ev]);
  await S.store?.add(ev);
  return ev;
}
async function removeEvent(id: string) { S.events = S.events.filter((e) => e.id !== id); await S.store?.remove(id); }

function toast(text: string, undo?: string) {
  S.toast = { text, undo };
  renderToast();
  const mine = S.toast;
  setTimeout(() => { if (S.toast === mine) { S.toast = null; renderToast(); } }, 7000);
}

async function logOutcome(lead: QueueLead, outcome: Outcome, extra: Partial<CallEvent> = {}) {
  const ev = await addEvent({ lead: lead.id, type: 'outcome', outcome, ...extra });
  const st = reduceLead(lead, S.events);
  const next = st.stage === 'do_not_contact' ? 'added to the do-not-contact list' : st.bad_number ? 'moved to research' : st.parked ? 'parked after no answers' : st.follow_up ? `next: ${fmtDate(st.follow_up)}` : 'no follow-up set';
  S.pending = null; S.focus = null; S.showScript = false; S.objection = null; S.interest = null;
  toast(`${outcomeDef(outcome).label} · ${lead.name}: ${next}`, ev.id);
  render();
}

async function copy(text: string, what: string) {
  try { await navigator.clipboard.writeText(text); toast(`Copied ${what}`); }
  catch { S.toast = { text: `Press and hold to copy ${what}:` }; renderToast(text); }
}

async function download(name: string, data: string, type: string) {
  if (S.store?.kind === 'db' && W.claude) {
    try { const d = await W.claude.use('downloads'); if (d) { await d.save({ filename: name, data }); return; } } catch { /* fall through */ }
    return copy(data, name);
  }
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const leadById = (id: string | null) => S.leads.find((l) => l.id === id) ?? null;

function pipelineCsv(): string {
  const cell = (v: unknown) => { const s = String(v ?? ''); const t = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const rows = [['Name', 'City', 'Phone', 'Priority', 'Stage', 'NextFollowUp', 'DealValue', 'Attempts', 'LastOutcome', 'LastActivity'].join(',')];
  for (const l of S.leads) {
    const s = reduceLead(l, S.events);
    rows.push([l.name, l.city, fmtPhone(l.phone), l.band_label, stageLabel(s.stage), s.follow_up, s.value ?? '', s.attempts, s.last_outcome ? outcomeDef(s.last_outcome).label : '', s.last_at?.slice(0, 10) ?? ''].map(cell).join(','));
  }
  return rows.join('\r\n') + '\r\n';
}

// ── Render ───────────────────────────────────────────────────────────────
function render() {
  const app = $('#app');
  if (!app) return;
  const q = buildQueue(S.leads, S.events, now(), QUEUE_CONFIG, S.settings.dailyGoal || QUEUE_CONFIG.dailyGoal);
  app.innerHTML = `${S.meta?.fictional ? '<p class="fict">Fictional sample data: these businesses are not real.</p>' : ''}${header(q)}<main id="main">${{ queue: viewQueue, pipeline: viewPipeline, leads: viewLeads, log: viewLog }[S.view](q)}</main>${nav()}<div id="sheet">${sheet()}</div><div id="toast" role="status" aria-live="polite"></div>`;
  renderToast();
  if (S.open) $('#sheet .panel')?.focus();
}

function header(q: ReturnType<typeof buildQueue>) {
  const st = q.stats;
  const pct = Math.min(100, Math.round((100 * st.callsToday) / Math.max(1, st.goal)));
  return `<header class="top"><div class="row"><div><h1>Call queue</h1><p class="sub">${esc(fmtDate(q.today))} · <span class="mode mode-${S.store?.kind}">${esc(S.store?.label ?? '')}</span>${S.unsaved ? ' · saving…' : ''}</p></div>
  <div class="goal" aria-label="${st.callsToday} of ${st.goal} calls today"><b>${st.callsToday}</b><span>/${st.goal} calls</span></div></div>
  <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
  <div class="chips stats"><span><b>${st.due}</b> due${st.overdue ? ` (${st.overdue} overdue)` : ''}</span><span><b>${st.fresh}</b> new</span><span><b>${st.reachedToday}</b> talked today</span><span><b>${money(st.pipelineValue)}</b> pipeline</span><span><b>${money(st.closedValue)}</b> closed</span></div></header>`;
}

function nav() {
  const b = (v: View, label: string) => `<button data-act="nav" data-v="${v}" class="${S.view === v ? 'on' : ''}" aria-current="${S.view === v}">${label}</button>`;
  return `<nav class="tabs">${b('queue', 'Queue')}${b('pipeline', 'Pipeline')}${b('leads', 'Leads')}${b('log', 'Results')}</nav>`;
}

function scoreRow(l: QueueLead) {
  const t = (k: string, v: string, sub: string) => `<div class="tile"><span>${k}</span><b>${esc(v)}</b><small>${esc(sub)}</small></div>`;
  return `<div class="tiles">${t('Fit', l.fit === null ? 'n/v' : String(l.fit), l.fit_label)}${t('Opportunity', l.opportunity === null ? 'n/v' : String(l.opportunity), l.opportunity_label)}${t('Confidence', l.confidence, `${l.confidence_pct}%`)}${t('Priority', String(l.points), l.band_label)}</div>`;
}

function callBlock(l: QueueLead) {
  if (!l.phone) return '<p class="warn">No phone on file. Find a working number first.</p>';
  return `<div class="call"><a class="btn primary big" href="tel:${esc(l.phone)}" target="_blank" rel="noopener" data-act="dial" data-id="${esc(l.id)}">Call <span class="nw">${esc(fmtPhone(l.phone))}</span></a><button class="btn" data-act="copy-phone" data-id="${esc(l.id)}" aria-label="Copy the number">Copy</button></div>`;
}

function angle(l: QueueLead) {
  const t = openingTheme(l);
  const items = [
    t ? `<li><b>Opening angle:</b> reviews mention ${esc(t.label)} <q>${esc(t.phrase)}</q></li>` : '<li><b>Opening angle:</b> no complaint verified yet, so ask how calls and requests are handled.</li>',
    l.confidence === 'low' || l.confidence === 'insufficient' ? `<li><b>Verify first:</b> research confidence is ${esc(l.confidence)}${l.last_verified ? ` (checked ${esc(l.last_verified)})` : ' (data undated)'}. Confirm before you quote anything.</li>` : '',
    l.franchise ? '<li><b>Franchise:</b> ask who chooses their tools: the local owner or head office?</li>' : '',
  ];
  return `<ul class="angle">${items.join('')}</ul>`;
}

function outcomeForm(l: QueueLead) {
  const p = S.pending!;
  const def = outcomeDef(p.outcome);
  const date = (label: string) => `<label class="fld">${label}<input type="date" id="pend-date" value="${esc(p.date)}" min="${esc(dateIn(now(), QUEUE_CONFIG.ownerTimeZone))}"></label>`;
  const body = def.needs === 'date' ? date('Call back on')
    : def.needs === 'date_value' ? `${date('Audit date')}<label class="fld">Deal value (optional)<input type="number" inputmode="decimal" min="0" step="1" id="pend-value" value="${esc(p.value)}" placeholder="0"></label>`
    : def.needs === 'permission' ? `<p class="q">Okay to check back in ${QUEUE_CONFIG.notNowDays} days?</p><div class="chips">${['yes', 'no'].map((v) => `<button class="chip ${p.permission === (v === 'yes') ? 'on' : ''}" data-act="pend-perm" data-v="${v}">${v === 'yes' ? 'Yes, they agreed' : 'No'}</button>`).join('')}</div>`
    : def.needs === 'objection' ? `<p class="q">What did they say? (optional)</p><div class="chips">${OBJECTIONS.map((o) => `<button class="chip ${p.objection === o.id ? 'on' : ''}" data-act="pend-obj" data-v="${o.id}">${esc(o.label)}</button>`).join('')}</div>`
    : '';
  const note = `<label class="fld">${def.needs === 'note' ? 'Decision-maker name or best time (optional)' : 'Note (optional)'}<input type="text" id="pend-note" value="${esc(p.note)}" autocomplete="off"></label>`;
  return `<form class="pend" data-form="pend"><h3>${esc(def.label)}</h3>${body}${note}<div class="row gap"><button type="submit" class="btn primary">Save</button><button type="button" class="btn" data-act="pend-cancel">Cancel</button></div></form>`;
}

function outcomes(l: QueueLead) {
  if (S.pending?.lead === l.id) return outcomeForm(l);
  return `<div class="outs" role="group" aria-label="Log the outcome">${OUTCOMES.map((o) => `<button class="out out-${o.id}" data-act="outcome" data-id="${esc(l.id)}" data-v="${o.id}">${esc(o.label)}</button>`).join('')}</div>`;
}

function scriptPanel(l: QueueLead, showAll: boolean) {
  const s = reduceLead(l, S.events);
  const all = scriptsFor(l, s, S.settings);
  const sc = all.find((x) => x.id === S.script) ?? all[0]!;
  const tabs = showAll ? `<div class="chips scroll" role="tablist">${all.map((x) => `<button role="tab" class="chip ${x.id === sc.id ? 'on' : ''}" data-act="script" data-v="${x.id}">${esc(x.title.replace(/ \(.*\)$/, ''))}</button>`).join('')}</div>` : '';
  return `<div class="script">${tabs}${scriptCard(sc)}</div>`;
}
function scriptCard(sc: Script) {
  return `<div class="scard"><div class="row"><h3>${esc(sc.title)}</h3><button class="btn small" data-act="copy-script" data-v="${esc(sc.id)}">Copy</button></div>${sc.subject ? `<p class="subj">Subject: ${esc(sc.subject)}</p>` : ''}${sc.lines.map((x) => `<p>${x.gear ? `<span class="gear">${esc(x.gear)}</span>` : ''}${esc(x.text)}</p>`).join('')}${sc.warnings.length ? `<p class="warn">${sc.warnings.map(esc).join(' ')}</p>` : ''}</div>`;
}

function itemRow(it: QueueItem, act = 'open') {
  const s = it.state;
  return `<li><button class="lrow" data-act="${act}" data-id="${esc(it.lead.id)}"><span class="pill ${bandClass(it.lead.band)}">${esc(it.lead.band_label.split(':')[0])}</span><span class="nm">${esc(it.lead.name)}<small>${esc([it.lead.city, it.reason, s.attempts ? `${s.attempts} call${s.attempts === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · '))}</small></span><span class="clk ${it.clock.status}">${esc(it.clock.time)}</span></button></li>`;
}

function viewQueue(q: ReturnType<typeof buildQueue>) {
  const pool = [...q.due, ...q.fresh].filter((i) => !S.skipped.has(i.lead.id));
  const cur = (S.focus && [...q.due, ...q.fresh].find((i) => i.lead.id === S.focus)) || pool[0] || null;
  const setup = !S.settings.callerName.trim() ? '<p class="note">Add your name in <button class="link" data-act="nav" data-v="log">Results → Settings</button> so the scripts read right.</p>' : '';
  if (!cur) {
    return `${setup}<section class="card empty"><h2>Queue clear</h2><p>No calls due and no new leads ready. ${q.later.length ? `Next follow-up: ${esc(fmtDate(q.later[0]!.state.follow_up))}.` : ''}</p>${S.skipped.size ? '<button class="btn" data-act="unskip">Show skipped leads</button>' : ''}</section>${list('Later', q.later.slice(0, 10))}`;
  }
  const l = cur.lead;
  S.current = l.id;
  const upNext = pool.filter((i) => i !== cur).slice(0, 8);
  return `${setup}<section class="card now" aria-label="Now calling">
    <div class="row"><span class="pill ${bandClass(l.band)}">${esc(l.band_label)}</span><span class="why">${esc(cur.reason)}</span></div>
    <h2>${esc(l.name)}</h2>
    <p class="meta">${esc(l.city ?? '')} · <span class="clk ${cur.clock.status}">${esc(cur.clock.time)} there · ${esc(cur.clock.label)}</span>${cur.state.attempts ? ` · ${cur.state.attempts} earlier call${cur.state.attempts === 1 ? '' : 's'}` : ''}</p>
    ${callBlock(l)}
    ${angle(l)}
    <p class="next">${esc(l.next_action.replace(/; opening angle:[^;.]*/, ''))}</p>
    <div class="row gap"><button class="btn" data-act="toggle-script" aria-expanded="${S.showScript}">${S.showScript ? 'Hide script' : 'Show script'}</button><button class="btn" data-act="open" data-id="${esc(l.id)}">Details</button><button class="btn" data-act="skip" data-id="${esc(l.id)}">Skip for now</button></div>
    ${S.showScript ? scriptPanel(l, true) : ''}
    <h3 class="lbl">How did it go?</h3>
    ${outcomes(l)}
  </section>
  ${list(`Up next (${pool.length - 1 > 0 ? pool.length - 1 : 0})`, upNext, 'focus')}
  ${q.doneToday.length ? list(`Done today (${q.doneToday.length})`, q.doneToday) : ''}`;
}

function list(title: string, items: QueueItem[], act = 'open') {
  if (!items.length) return '';
  return `<section class="card"><h3 class="lbl">${esc(title)}</h3><ul class="list">${items.map((i) => itemRow(i, act)).join('')}</ul></section>`;
}

function viewPipeline(q: ReturnType<typeof buildQueue>) {
  const cal = calendar(S.leads, S.events, now(), 14);
  const calHtml = cal.length ? cal.map((d) => `<li class="day"><b>${d.date === q.today ? 'Today' : esc(fmtDate(d.date))}</b><ul>${d.items.map(({ lead, state }) => `<li><button class="link" data-act="open" data-id="${esc(lead.id)}">${esc(lead.name)}</button> <small>${esc(stageLabel(state.stage))}${state.value ? ` · ${money(state.value)}` : ''}</small></li>`).join('')}</ul></li>`).join('') : '<li>No follow-ups in the next two weeks.</li>';
  const groups: Array<[string, Stage[]]> = [['Talked', ['contacted']], ['Audit booked', ['audit_booked']], ['Audit delivered', ['audit_delivered']], ['Won', ['build_sold', 'retainer_active']]];
  const all = [...q.due, ...q.fresh, ...q.later, ...q.doneToday, ...q.closed];
  const uniq = new Map(all.map((i) => [i.lead.id, i]));
  const stageHtml = groups.map(([label, stages]) => {
    const items = [...uniq.values()].filter((i) => stages.includes(i.state.stage));
    const value = items.reduce((s, i) => s + (i.state.value ?? 0), 0);
    return `<section class="card"><div class="row"><h3 class="lbl">${label} (${items.length})</h3><b>${money(value)}</b></div>${items.length ? `<ul class="list">${items.map((i) => itemRow(i)).join('')}</ul>` : '<p class="muted">None yet.</p>'}</section>`;
  }).join('');
  const dnc = q.closed.filter((i) => i.state.stage === 'do_not_contact').length;
  const declined = q.closed.filter((i) => i.state.stage === 'declined').length;
  return `<section class="card"><h3 class="lbl">Follow-up calendar · next 14 days</h3><ul class="cal">${calHtml}</ul></section>${stageHtml}
  ${list(`Needs research (${q.research.length})`, q.research)}
  ${q.parked.length ? `<section class="card"><h3 class="lbl">Parked after ${QUEUE_CONFIG.maxAttempts} unanswered calls (${q.parked.length})</h3><ul class="list">${q.parked.map((i) => `<li class="prk">${itemRow(i).slice(4, -5)}<button class="btn small" data-act="reopen" data-id="${esc(i.lead.id)}">Reopen</button></li>`).join('')}</ul></section>` : ''}
  <p class="muted pad">${declined} declined · ${dnc} on the do-not-contact list.</p>`;
}

function viewLeads() {
  const f = S.filter;
  const filters: Array<[string, string]> = [['all', 'All'], ['p1', 'P1'], ['p2', 'P2'], ['p3', 'P3'], ['research_first', 'Research'], ['open', 'Not called'], ['pipeline', 'In pipeline'], ['lost', 'Declined / DNC']];
  return `<section class="card"><label class="fld">Search<input type="search" id="search" value="${esc(S.q)}" placeholder="Business or city" autocomplete="off"></label>
  <div class="chips scroll">${filters.map(([v, label]) => `<button class="chip ${f === v ? 'on' : ''}" data-act="filter" data-v="${v}">${label}</button>`).join('')}</div>
  <ul class="list" id="leadlist">${leadRows()}</ul></section>`;
}
function leadRows() {
  const q = S.q.trim().toLowerCase();
  const rows = S.leads.map((l) => ({ l, s: reduceLead(l, S.events) })).filter(({ l, s }) => {
    if (q && !`${l.name} ${l.city ?? ''}`.toLowerCase().includes(q)) return false;
    const g = STAGES.find((x) => x.id === s.stage)!.group;
    return S.filter === 'all' || l.band === S.filter || (S.filter === 'open' && s.stage === 'not_contacted') || (S.filter === 'pipeline' && (g === 'pipeline' || g === 'won' || s.stage === 'contacted')) || (S.filter === 'lost' && g === 'lost');
  });
  return rows.length ? rows.map(({ l, s }) => `<li><button class="lrow" data-act="open" data-id="${esc(l.id)}"><span class="pill ${bandClass(l.band)}">${esc(l.band_label.split(':')[0])}</span><span class="nm">${esc(l.name)}<small>${esc([l.city, stageLabel(s.stage), s.follow_up ? `next ${fmtDate(s.follow_up)}` : ''].filter(Boolean).join(' · '))}</small></span><span class="pts">${l.points}</span></button></li>`).join('') : '<li class="muted pad">No leads match.</li>';
}

function viewLog() {
  const st = S.settings;
  const inp = (id: keyof ScriptSettings, label: string, type = 'text', extra = '') => `<label class="fld">${label}<input type="${type}" id="set-${id}" value="${esc(st[id])}" ${extra}></label>`;
  const table = (by: 'band' | 'theme' | 'old_tier', title: string) => {
    const rows = outcomeStats(S.leads, S.events, by);
    return `<h3 class="lbl">${title}</h3><div class="scroll"><table><thead><tr><th>Group</th><th>Leads</th><th>Called</th><th>Talked</th><th>Booked</th><th>Won</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.group)}</td><td>${r.leads}</td><td>${r.called}</td><td>${r.reached}</td><td>${r.booked}</td><td>${r.won}</td></tr>`).join('')}</tbody></table></div>`;
  };
  const called = new Set(S.events.filter((e) => e.type === 'outcome').map((e) => e.lead)).size;
  return `<section class="card"><h3 class="lbl">Results</h3>${called < 20 ? `<p class="muted">${called} lead${called === 1 ? '' : 's'} called so far. Wait for 20+ per priority before changing the scoring.</p>` : ''}${table('band', 'By priority')}${table('theme', 'By review signal')}${table('old_tier', 'By old tracker tier')}</section>
  <section class="card"><h3 class="lbl">Settings (used in scripts)</h3><form data-form="settings">
    ${inp('callerName', 'Your name', 'text', 'autocomplete="name"')}${inp('company', 'Company')}${inp('callbackNumber', 'Callback number', 'tel', 'autocomplete="tel"')}${inp('mailingAddress', 'Mailing address (required in emails)')}
    <p class="q">On the call, ask for</p><div class="chips">${(['snapshot', 'audit'] as const).map((a) => `<button type="button" class="chip ${st.ask === a ? 'on' : ''}" data-act="ask" data-v="${a}">${a === 'snapshot' ? 'Free Snapshot' : 'Paid audit'}</button>`).join('')}</div>
    ${inp('dailyGoal', 'Daily call goal', 'number', 'min="1" max="200" inputmode="numeric"')}
    <button class="btn primary" type="submit">Save settings</button></form></section>
  <section class="card"><h3 class="lbl">Export &amp; backup</h3><p class="muted">Send the call log to Claude to re-score your leads with what happened on the phone.</p>
    <div class="row gap wrap"><button class="btn" data-act="copy-log">Copy call log</button><button class="btn" data-act="dl-log">Download call log</button><button class="btn" data-act="dl-csv">Download pipeline CSV</button><button class="btn" data-act="copy-dnc">Copy do-not-contact list</button></div>
    <details><summary>Import a call log</summary><label class="fld">Paste a call log (JSON)<textarea id="import-log" rows="4"></textarea></label><button class="btn" data-act="import-log">Merge into this queue</button></details>
    <p class="muted small">${S.leads.length} leads · scored ${esc(S.meta?.as_of ?? '')} · ${esc(S.meta?.icp_version ?? '')} · ${esc(QUEUE_CONFIG.version)} · ${S.events.length} logged events · ${esc(S.store?.label ?? '')}</p></section>`;
}

function sheet() {
  const l = leadById(S.open);
  if (!l) return '';
  const s = reduceLead(l, S.events);
  const stageChips = STAGES.map((x) => `<button class="chip ${s.stage === x.id ? 'on' : ''}" data-act="stage" data-id="${esc(l.id)}" data-v="${x.id}">${esc(x.label)}</button>`).join('');
  const chan = (['phone', 'email', 'text'] as Channel[]).map((c) => `<button class="chip ${s.channel === c ? 'on' : ''}" data-act="channel" data-id="${esc(l.id)}" data-v="${c}">${c[0]!.toUpperCase() + c.slice(1)}</button>`).join('');
  const services = [...offers.map((o) => o.name), 'Free Snapshot', 'Paid audit'];
  const obj = S.objection ? OBJECTION_REPLIES.find((o) => o.id === S.objection) : null;
  const alt = S.interest ? alternativeFor(S.interest as never, l, S.settings) : null;
  const timeline = [...s.events].reverse().map((e) => `<li><span>${esc(new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: QUEUE_CONFIG.ownerTimeZone }))}</span> ${esc(evText(e))}<button class="x" data-act="ev-del" data-v="${esc(e.id)}" aria-label="Delete this entry">×</button></li>`).join('');
  const research = [
    l.website ? `<a href="${esc(l.website)}" target="_blank" rel="noopener">Website</a>` : '',
    `<a href="https://www.google.com/search?q=${encodeURIComponent(`${l.name} ${l.city ?? ''}`)}" target="_blank" rel="noopener">Google</a>`,
    `<a href="https://www.google.com/search?q=${encodeURIComponent(`${l.name} ${(l.city ?? '').split(',')[0]} owner OR broker linkedin`)}" target="_blank" rel="noopener">Find the owner</a>`,
  ].filter(Boolean).join(' · ');
  return `<div class="scrim" data-act="close"></div><div class="panel" role="dialog" aria-modal="true" aria-label="${esc(l.name)}" tabindex="-1">
  <div class="row"><h2>${esc(l.name)}</h2><button class="btn small" data-act="close" aria-label="Close">Close</button></div>
  <p class="meta">${esc([l.city, l.rating ? `${l.rating.toFixed(1)}★` : '', l.reviews ? `${l.reviews} reviews` : '', l.ownership].filter(Boolean).join(' · '))}</p>
  ${scoreRow(l)}${callBlock(l)}${angle(l)}
  <h3 class="lbl">Stage</h3><div class="chips">${stageChips}</div>
  <div class="grid2"><label class="fld">Next follow-up<input type="date" id="fu" data-id="${esc(l.id)}" value="${esc(s.follow_up ?? '')}"></label><label class="fld">Deal value<input type="number" inputmode="decimal" min="0" id="val" data-id="${esc(l.id)}" value="${esc(s.value ?? '')}" placeholder="0"></label></div>
  <label class="fld">Proposed service<select id="svc" data-id="${esc(l.id)}"><option value="">Not chosen</option>${services.map((n) => `<option ${s.service === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
  <h3 class="lbl">Preferred channel</h3><div class="chips">${chan}</div>
  <h3 class="lbl">Okay to follow up?</h3><div class="chips"><button class="chip ${s.permission === true ? 'on' : ''}" data-act="perm" data-id="${esc(l.id)}" data-v="yes">Yes</button><button class="chip ${s.permission === false ? 'on' : ''}" data-act="perm" data-id="${esc(l.id)}" data-v="no">No</button></div>
  <h3 class="lbl">Log an outcome</h3>${outcomes(l)}
  <form class="row gap" data-form="note" data-id="${esc(l.id)}"><label class="fld grow">Add a note<input type="text" id="note" autocomplete="off"></label><button class="btn" type="submit">Add</button></form>
  <h3 class="lbl">Scripts</h3>${scriptPanel(l, true)}
  <h3 class="lbl">Objections</h3><div class="chips">${OBJECTION_REPLIES.map((o) => `<button class="chip ${S.objection === o.id ? 'on' : ''}" data-act="obj" data-v="${o.id}">${esc(OBJECTIONS.find((x) => x.id === o.id)!.label)}</button>`).join('')}</div>
  ${obj ? `<div class="scard"><p class="muted">${esc(obj.heard)}</p><p>${esc(obj.reply(S.settings.ask))}</p><p class="muted">Next: ${esc(obj.next)}</p></div>` : ''}
  <h3 class="lbl">Interested in something else?</h3><div class="chips">${INTERESTS.map((i) => `<button class="chip ${S.interest === i.id ? 'on' : ''}" data-act="interest" data-v="${i.id}">${esc(i.label)}</button>`).join('')}</div>
  ${alt ? scriptCard(alt) : ''}
  <h3 class="lbl">Why this priority</h3><ul class="why-list">${l.parts.map((p) => `<li><b>${esc(p.label)}</b> ${p.points === null ? 'not verified' : `${p.points}/${p.weight}`}<small>${esc(p.reasons.join(' · '))}</small></li>`).join('')}</ul>
  ${l.old_score !== null ? `<p class="muted">Old tracker: ${l.old_score} (${esc(l.old_tier)})</p>` : ''}
  <p class="links">Research: ${research}</p>
  <h3 class="lbl">Activity</h3><ul class="tl">${timeline || '<li class="muted">Nothing logged yet.</li>'}</ul>
  ${s.notes.length ? `<h3 class="lbl">Notes</h3><ul class="tl">${s.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

function evText(e: CallEvent): string {
  switch (e.type) {
    case 'outcome': return `${outcomeDef(e.outcome!).label}${e.date ? ` → ${fmtDate(e.date)}` : ''}${e.value ? ` · ${money(e.value)}` : ''}${e.objection ? ` · ${OBJECTIONS.find((o) => o.id === e.objection)?.label}` : ''}${e.note ? ` · ${e.note}` : ''}`;
    case 'stage': return `Stage → ${stageLabel(e.stage!)}`;
    case 'follow_up': return e.date ? `Follow-up set for ${fmtDate(e.date)}` : 'Follow-up cleared';
    case 'value': return `Deal value ${e.value ? money(e.value) : 'cleared'}`;
    case 'note': return `Note: ${e.note}`;
    case 'service': return `Proposed service: ${e.service || 'none'}`;
    case 'channel': return `Preferred channel: ${e.channel}`;
    case 'permission': return `Follow-up permission: ${e.permission ? 'yes' : 'no'}`;
    case 'reopen': return 'Reopened';
  }
}

function renderToast(copyText?: string) {
  const el = $('#toast');
  if (!el) return;
  el.innerHTML = S.toast ? `<div class="tst"><span>${esc(S.toast.text)}</span>${S.toast.undo ? `<button class="btn small" data-act="undo" data-v="${esc(S.toast.undo)}">Undo</button>` : ''}${copyText ? `<textarea readonly rows="3">${esc(copyText)}</textarea>` : ''}</div>` : '';
}

// ── Events ───────────────────────────────────────────────────────────────
document.addEventListener('click', async (ev) => {
  const t = (ev.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!t) return;
  const act = t.dataset.act!;
  const id = t.dataset.id ?? null;
  const v = t.dataset.v ?? '';
  const lead = leadById(id);
  if (act !== 'dial') ev.preventDefault();
  switch (act) {
    case 'nav': S.view = v as View; S.open = null; render(); window.scrollTo(0, 0); return;
    case 'focus': S.focus = id; S.pending = null; S.showScript = false; render(); window.scrollTo(0, 0); return;
    case 'open': S.open = id; S.pending = null; S.objection = null; S.interest = null; render(); return;
    case 'close': S.open = null; S.pending = null; render(); return;
    case 'skip': if (id) S.skipped.add(id); S.focus = null; render(); return;
    case 'unskip': S.skipped.clear(); render(); return;
    case 'toggle-script': S.showScript = !S.showScript; render(); return;
    case 'script': S.script = v; render(); return;
    case 'obj': S.objection = S.objection === v ? null : (v as ObjectionId); render(); return;
    case 'interest': S.interest = S.interest === v ? null : v; render(); return;
    case 'filter': S.filter = v; render(); return;
    case 'copy-phone': if (lead?.phone) await copy(lead.phone, 'the number'); return;
    case 'copy-script': {
      const l = leadById(S.open) ?? leadById(S.current);
      if (!l) return;
      const sc = [...scriptsFor(l, reduceLead(l, S.events), S.settings), ...(S.interest ? [alternativeFor(S.interest as never, l, S.settings)] : [])].find((x) => x.id === v);
      if (sc) await copy(scriptText(sc), 'the script');
      return;
    }
    case 'outcome': {
      if (!lead) return;
      const o = v as Outcome;
      const def = outcomeDef(o);
      const today = dateIn(now(), QUEUE_CONFIG.ownerTimeZone);
      if (def.needs) { S.pending = { lead: lead.id, outcome: o, date: def.needs === 'date' ? nextBusinessDay(today) : def.needs === 'date_value' ? addBusinessDays(today, 2) : '', value: '', note: '', objection: null, permission: null }; render(); setTimeout(() => $('#pend-date, #pend-note')?.focus(), 0); return; }
      await logOutcome(lead, o);
      return;
    }
    case 'pend-cancel': S.pending = null; render(); return;
    case 'pend-perm': if (S.pending) { S.pending.permission = v === 'yes'; render(); } return;
    case 'pend-obj': if (S.pending) { S.pending.objection = S.pending.objection === v ? null : (v as ObjectionId); render(); } return;
    case 'undo': await removeEvent(v); S.toast = null; render(); return;
    case 'ev-del': await removeEvent(v); render(); return;
    case 'stage': if (lead) { await addEvent({ lead: lead.id, type: 'stage', stage: v as Stage }); render(); } return;
    case 'channel': if (lead) { await addEvent({ lead: lead.id, type: 'channel', channel: v as Channel }); render(); } return;
    case 'perm': if (lead) { await addEvent({ lead: lead.id, type: 'permission', permission: v === 'yes' }); render(); } return;
    case 'reopen': if (lead) { await addEvent({ lead: lead.id, type: 'reopen', date: dateIn(now(), QUEUE_CONFIG.ownerTimeZone) }); toast(`${lead.name} is back in the queue`); render(); } return;
    case 'ask': S.settings.ask = v as 'snapshot' | 'audit'; await S.store?.saveSettings(S.settings); render(); return;
    case 'copy-log': await copy(JSON.stringify(toCallLog(S.leads, S.events, now()), null, 2), 'the call log'); return;
    case 'dl-log': await download(`call-log-${dateIn(now(), QUEUE_CONFIG.ownerTimeZone)}.json`, JSON.stringify(toCallLog(S.leads, S.events, now()), null, 2), 'application/json'); return;
    case 'dl-csv': await download(`pipeline-${dateIn(now(), QUEUE_CONFIG.ownerTimeZone)}.csv`, pipelineCsv(), 'text/csv'); return;
    case 'copy-dnc': await copy(toCallLog(S.leads, S.events, now()).suppression.map((x) => `${x.name}\t${fmtPhone(x.phone)}`).join('\n') || '(empty)', 'the do-not-contact list'); return;
    case 'import-log': {
      const raw = (document.getElementById('import-log') as HTMLTextAreaElement | null)?.value ?? '';
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { toast('That isn’t valid JSON.'); return; }
      const errs = validateCallLog(parsed);
      if (errs.length) { toast(`Can’t import: ${errs.slice(0, 2).join('; ')}`); return; }
      const ids = new Set(S.leads.map((l) => l.id));
      const known = new Set(S.events.map((e) => e.id));
      const fresh = (parsed as { events: CallEvent[] }).events.filter((e) => ids.has(e.lead) && !known.has(e.id));
      for (const e of fresh) { S.events = mergeEvents(S.events, [e]); await S.store?.add(e); }
      toast(`Merged ${fresh.length} new event${fresh.length === 1 ? '' : 's'}`); render(); return;
    }
  }
});

document.addEventListener('submit', async (ev) => {
  const f = ev.target as HTMLFormElement;
  ev.preventDefault();
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
  if (f.dataset.form === 'pend' && S.pending) {
    const p = S.pending;
    const lead = leadById(p.lead);
    if (!lead) return;
    const def = outcomeDef(p.outcome);
    const date = val('pend-date');
    if ((def.needs === 'date' || def.needs === 'date_value') && !date) { toast('Pick a date first.'); return; }
    if (def.needs === 'permission' && p.permission === null) { toast('Did they agree to a check-back? Pick Yes or No.'); return; }
    const value = Number(val('pend-value'));
    await logOutcome(lead, p.outcome, {
      ...(date ? { date } : {}), ...(value > 0 ? { value } : {}), ...(val('pend-note') ? { note: val('pend-note') } : {}),
      ...(p.objection ? { objection: p.objection } : {}), ...(p.permission !== null ? { permission: p.permission } : {}),
    });
  } else if (f.dataset.form === 'settings') {
    const goal = Math.max(1, Math.min(200, Math.round(Number(val('set-dailyGoal')) || QUEUE_CONFIG.dailyGoal)));
    S.settings = { ...S.settings, callerName: val('set-callerName'), company: val('set-company') || DEFAULT_SETTINGS.company, callbackNumber: val('set-callbackNumber'), mailingAddress: val('set-mailingAddress'), dailyGoal: goal };
    await S.store?.saveSettings(S.settings); toast('Settings saved'); render();
  } else if (f.dataset.form === 'note') {
    const note = val('note');
    if (note && f.dataset.id) { await addEvent({ lead: f.dataset.id, type: 'note', note }); render(); }
  }
});

document.addEventListener('change', async (ev) => {
  const el = ev.target as HTMLInputElement;
  const lead = leadById(el.dataset.id ?? null);
  if (!lead) return;
  if (el.id === 'fu') await addEvent({ lead: lead.id, type: 'follow_up', date: el.value || null });
  else if (el.id === 'val') await addEvent({ lead: lead.id, type: 'value', value: Number(el.value) > 0 ? Number(el.value) : null });
  else if (el.id === 'svc') await addEvent({ lead: lead.id, type: 'service', service: el.value });
  else return;
  render();
});

document.addEventListener('input', (ev) => {
  const el = ev.target as HTMLInputElement;
  if (el.id === 'search') { S.q = el.value; const ul = $('#leadlist'); if (ul) ul.innerHTML = leadRows(); }
  if (S.pending && el.id === 'pend-note') S.pending.note = el.value;
  if (S.pending && el.id === 'pend-date') S.pending.date = el.value;
  if (S.pending && el.id === 'pend-value') S.pending.value = el.value;
});

document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && S.open) { S.open = null; render(); } });

// Keep local times and "due" fresh, but never while the user is typing.
setInterval(() => { const a = document.activeElement; if (!S.pending && !(a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || a instanceof HTMLSelectElement)) render(); }, 60_000);

// ── Start ────────────────────────────────────────────────────────────────
function fail(msg: string) { const app = $('#app'); if (app) app.innerHTML = `<section class="card empty"><h2>Call queue</h2><p>${esc(msg)}</p></section>`; }

async function start() {
  const embedded = document.getElementById('rrs-queue-data');
  if (embedded?.textContent?.trim()) {
    const data = JSON.parse(embedded.textContent) as QueueDataset & { events?: CallEvent[] };
    const { leads, events = [], ...meta } = data;
    S.leads = leads; S.meta = meta; S.events = mergeEvents([], events);
    S.store = localStore(`${meta.as_of}:${leads.length}`);
    render();
    return;
  }
  // Hosted: leads come from leads.json published beside the page; outcomes go to the
  // artifact database when available, otherwise to this browser (with a clear label).
  try {
    const res = await fetch('leads.json', { cache: 'no-store' });
    if (res.ok) { const { leads, ...meta } = (await res.json()) as QueueDataset; S.leads = leads ?? []; S.meta = meta; }
  } catch { /* no data file (e.g. opened as a local file) */ }
  const db = W.claude?.use ? await Promise.race([W.claude.use('db').catch(() => null), new Promise((r) => setTimeout(() => r(null), 10_000))]) : null;
  if (db) {
    try { S.store = await dbStore(db); }
    catch { S.store = null; }
  }
  if (!S.leads.length) { fail(W.claude?.use ? 'No leads loaded yet. Ask Claude to load your scored leads into this queue.' : 'No lead data in this page. Build it with npm run leads:queue.'); return; }
  if (!S.store) {
    S.store = localStore(`${S.meta?.as_of ?? 'hosted'}:${S.leads.length}`);
    if (W.claude?.use && S.store.kind === 'local') S.store.label = 'Saved on this device only (account sync unavailable)';
  }
  render();
}

start().catch((e) => fail(`Something went wrong loading the queue (${(e as Error).message}).`));
