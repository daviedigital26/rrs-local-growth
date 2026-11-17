/**
 * npm run leads:queue -- <inputs…> [--checked YYYY-MM-DD] [--as-of YYYY-MM-DD] [--out DIR] [--name BASE]
 *   Scores the inputs (same formats as leads:score) and writes:
 *     <name>.html  standalone call queue page with the leads embedded (outcomes saved in the browser)
 *     <name>.json  the queue dataset (rrs.call-queue/1), also used to load the hosted queue
 *   Call logs given as inputs are embedded as already-logged events (not folded into the start state).
 *
 * npm run leads:queue -- <inputs…> --hosted [--out DIR]
 *   Writes DIR/index.html (no data) + DIR/leads.json: the pair published as the private hosted
 *   queue. The page reads leads.json and saves outcomes in the artifact database.
 *
 * npm run leads:queue -- --app [--out DIR]
 *   Writes call-queue-app.html: the same page with no data, for hosting as an artifact
 *   (leads and outcomes then live in the artifact's database).
 *
 * npm run leads:outcomes -- <dataset.json> <call-log.json> [--out DIR]
 *   Results by priority, review signal and old tracker tier: does the scoring predict outcomes?
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIsoDate, mergeProspects } from '../../05-Lead-Research/Scoring/prospect.ts';
import { scoreAll } from '../../05-Lead-Research/Scoring/icp-engine.ts';
import { arg, loadAll, RESEARCH_OUTPUTS, unsafeOutputDir } from '../../05-Lead-Research/Scoring/score-cli.ts';
import { buildQueuePage } from './build-queue.ts';
import { toQueueDataset } from './dataset.ts';
import { buildQueue, mergeEvents, outcomeStats, validateCallLog, type CallEvent, type CallLog, type QueueDataset } from './queue-logic.ts';

const FLAGS = new Set(['--checked', '--as-of', '--out', '--name']);
const positional = (argv: string[]) => argv.filter((a, i) => !a.startsWith('--') && !FLAGS.has(argv[i - 1] ?? ''));

export function buildFromInputs(files: string[], opts: { checkedAt: string | null; asOf: string }) {
  const { all, errors, warnings, callLogs } = loadAll(files, { checkedAt: opts.checkedAt });
  let events: CallEvent[] = [];
  for (const log of callLogs) {
    const errs = validateCallLog(log);
    if (errs.length) errors.push(...errs.map((message) => ({ where: 'call log', message })));
    else events = mergeEvents(events, (log as CallLog).events);
  }
  const { prospects } = mergeProspects(all);
  const dataset = toQueueDataset(scoreAll(prospects, { asOf: opts.asOf }), opts.asOf);
  return { dataset, events, errors, warnings };
}

function build(argv: string[]): number {
  const out = arg(argv, '--out') ?? RESEARCH_OUTPUTS;
  if (argv.includes('--app')) {
    mkdirSync(out, { recursive: true });
    const file = join(out, 'call-queue-app.html');
    writeFileSync(file, buildQueuePage());
    console.log(`Wrote ${file} (no lead data: loads from the artifact database)`);
    return 0;
  }
  const files = positional(argv);
  if (!files.length) { console.error('Usage: npm run leads:queue -- <batch.json|tracker.csv|lead.json|call-log.json> … [--checked YYYY-MM-DD] [--as-of YYYY-MM-DD] [--out DIR]'); return 2; }
  const checkedAt = arg(argv, '--checked') ?? null;
  const asOf = arg(argv, '--as-of') ?? new Date().toISOString().slice(0, 10);
  if ((checkedAt && !isIsoDate(checkedAt)) || !isIsoDate(asOf)) { console.error('✗ --checked and --as-of must be YYYY-MM-DD'); return 2; }
  const { dataset, events, errors, warnings } = buildFromInputs(files, { checkedAt, asOf });
  for (const w of warnings) console.warn(`! ${w.where}: ${w.message}`);
  if (errors.length) { errors.forEach((e) => console.error(`✗ ${e.where}: ${e.message}`)); console.error('Nothing was written.'); return 1; }
  if (!dataset.fictional && unsafeOutputDir(out)) { console.error(`✗ --out ${relative(process.cwd(), resolve(out)) || '.'} is inside the repository. Real lead data must stay in 05-Lead-Research/Research-Outputs (git-ignored) or outside the repo.`); return 1; }
  mkdirSync(out, { recursive: true });
  if (argv.includes('--hosted')) {
    writeFileSync(join(out, 'index.html'), buildQueuePage());
    writeFileSync(join(out, 'leads.json'), JSON.stringify(dataset) + '\n');
    console.log(`Hosted queue bundle: ${dataset.leads.length} leads\nWrote ${join(out, 'index.html')}\n      ${join(out, 'leads.json')}`);
    return 0;
  }
  const name = arg(argv, '--name') ?? `call-queue-${asOf}`;
  writeFileSync(join(out, `${name}.html`), buildQueuePage({ dataset, events }));
  writeFileSync(join(out, `${name}.json`), JSON.stringify(dataset, null, 2) + '\n');
  const q = buildQueue(dataset.leads, events, `${asOf}T16:00:00Z`);
  console.log(`Call queue: ${dataset.leads.length} leads · ${q.stats.due} due · ${q.stats.fresh} new · ${q.research.length} need research · ${q.closed.length} closed/do-not-contact${events.length ? ` · ${events.length} logged events` : ''}`);
  console.log(`Wrote ${join(out, `${name}.html`)}\n      ${join(out, `${name}.json`)}`);
  return 0;
}

export function outcomesMarkdown(ds: QueueDataset, events: CallEvent[]): string {
  const table = (by: 'band' | 'theme' | 'old_tier', title: string) => {
    const rows = outcomeStats(ds.leads, events, by);
    const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : 'n/a');
    return [`### ${title}`, '', '| Group | Leads | Called | Talked | Talk rate | Booked | Won |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
      ...rows.map((r) => `| ${r.group} | ${r.leads} | ${r.called} | ${r.reached} | ${pct(r.reached, r.called)} | ${r.booked} | ${r.won} |`), ''].join('\n');
  };
  const called = new Set(events.filter((e) => e.type === 'outcome').map((e) => e.lead)).size;
  return [`# Call outcomes vs. scoring`, '', `Dataset scored ${ds.as_of} (${ds.icp_version}); ${events.length} logged events; ${called} leads called.`, '',
    called < 20 ? '> Too few calls to retune the scoring yet (aim for 20+ per priority). Use this to spot early surprises only.\n' : '',
    table('band', 'By priority'), table('theme', 'By review signal'), table('old_tier', 'By old tracker tier')].join('\n');
}

function outcomes(argv: string[]): number {
  const [dsFile, logFile] = positional(argv);
  if (!dsFile || !logFile) { console.error('Usage: npm run leads:outcomes -- <call-queue.json> <call-log.json> [--out DIR]'); return 2; }
  const ds = JSON.parse(readFileSync(dsFile, 'utf8')) as QueueDataset;
  const log = JSON.parse(readFileSync(logFile, 'utf8'));
  const errs = validateCallLog(log);
  if (ds.schema !== 'rrs.call-queue/1') errs.unshift(`${dsFile}: not a call queue dataset`);
  if (errs.length) { errs.forEach((e) => console.error(`✗ ${e}`)); return 1; }
  const md = outcomesMarkdown(ds, (log as CallLog).events);
  const out = arg(argv, '--out') ?? RESEARCH_OUTPUTS;
  if (!ds.fictional && unsafeOutputDir(out)) { console.error('✗ real outcomes must stay in Research-Outputs or outside the repo'); return 1; }
  mkdirSync(out, { recursive: true });
  const file = join(out, `outcomes-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(file, md);
  console.log(md);
  console.log(`Wrote ${file}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  process.exitCode = cmd === 'outcomes' ? outcomes(rest) : build(cmd === 'build' ? rest : [cmd ?? '', ...rest].filter(Boolean));
}
