/**
 * Generates importable n8n workflow JSON. Run: npm run workflows
 * The intake validator (05-Lead-Research/intake/lead-intake.ts) is bundled with esbuild
 * and embedded in the Code node, so the browser, tests, mock endpoint and n8n all run
 * the SAME rules. Exported INACTIVE, with no credentials. Secrets/URLs come from env vars.
 */
import { buildSync } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');

/** Bundle the validator to a self-contained IIFE exposing `RRSIntake`. */
export function bundleIntake(): string {
  const out = buildSync({
    entryPoints: [join(root, '05-Lead-Research/intake/lead-intake.ts')],
    bundle: true, write: false, format: 'iife', globalName: 'RRSIntake', platform: 'neutral', target: 'es2020', minify: true, legalComments: 'none',
  });
  return out.outputFiles[0]!.text;
}

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export function intakeWorkflow(bundle: string) {
  const code = [
    '// RRS intake validator (generated from 05-Lead-Research/intake/lead-intake.ts — do not edit here)',
    bundle,
    'const now = new Date().toISOString();',
    'return $input.all().map((item) => {',
    '  const body = item.json.body ?? item.json;',
    '  const r = RRSIntake.processSubmission(body, now);',
    '  return { json: { status: r.status, errors: r.errors, record: r.record ?? null } };',
    '});',
  ].join('\n');
  const cond = (id: string, field: string, value: string) => ({
    conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ id, leftValue: `={{ $json.${field} }}`, rightValue: value, operator: { type: 'string', operation: 'equals' } }], combinator: 'and' },
    options: {},
  });
  const respond = (code: number, body: string) => ({ respondWith: 'json', responseBody: body, options: { responseCode: code } });
  return {
    name: 'RRS · Snapshot & contact intake',
    active: false,
    settings: { executionOrder: 'v1', saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all', callerPolicy: 'workflowsFromSameOwner' },
    nodes: [
      { id: uuid(1), name: 'Website form webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 300], webhookId: uuid(101), parameters: { httpMethod: 'POST', path: 'rrs-intake', responseMode: 'responseNode', options: { allowedOrigins: 'https://www.example-rrs-domain.com' } } },
      { id: uuid(2), name: 'Validate & normalise', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 300], parameters: { jsCode: code } },
      { id: uuid(3), name: 'Accepted?', type: 'n8n-nodes-base.if', typeVersion: 2, position: [480, 300], parameters: cond('c-accepted', 'status', 'accepted') },
      { id: uuid(4), name: 'Create/update CRM lead', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [720, 160], retryOnFail: true, maxTries: 3, waitBetweenTries: 2000, onError: 'continueRegularOutput', parameters: { method: 'POST', url: '={{ $env.RRS_CRM_WEBHOOK_URL }}', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.record) }}', options: { timeout: 10000 } } },
      { id: uuid(5), name: 'Notify owner', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [960, 160], onError: 'continueRegularOutput', parameters: { method: 'POST', url: '={{ $env.RRS_NOTIFY_WEBHOOK_URL }}', sendBody: true, specifyBody: 'json', jsonBody: "={{ JSON.stringify({ text: 'New ' + $('Validate & normalise').item.json.record.form + ' from ' + ($('Validate & normalise').item.json.record.business.name || $('Validate & normalise').item.json.record.contact.name) + ' (' + $('Validate & normalise').item.json.record.lead_id + ')' }) }}", options: { timeout: 10000 } } },
      { id: uuid(6), name: 'Respond 200 accepted', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, position: [1200, 160], parameters: respond(200, "={{ JSON.stringify({ ok: true, lead_id: $('Validate & normalise').item.json.record.lead_id }) }}") },
      { id: uuid(7), name: 'Spam?', type: 'n8n-nodes-base.if', typeVersion: 2, position: [720, 440], parameters: cond('c-spam', 'status', 'spam') },
      { id: uuid(8), name: 'Respond 200 (silent drop)', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, position: [960, 360], parameters: respond(200, '={{ JSON.stringify({ ok: true }) }}') },
      { id: uuid(9), name: 'Respond 422 invalid', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, position: [960, 540], parameters: respond(422, '={{ JSON.stringify({ ok: false, errors: $json.errors }) }}') },
    ],
    connections: {
      'Website form webhook': { main: [[{ node: 'Validate & normalise', type: 'main', index: 0 }]] },
      'Validate & normalise': { main: [[{ node: 'Accepted?', type: 'main', index: 0 }]] },
      'Accepted?': { main: [[{ node: 'Create/update CRM lead', type: 'main', index: 0 }], [{ node: 'Spam?', type: 'main', index: 0 }]] },
      'Create/update CRM lead': { main: [[{ node: 'Notify owner', type: 'main', index: 0 }]] },
      'Notify owner': { main: [[{ node: 'Respond 200 accepted', type: 'main', index: 0 }]] },
      'Spam?': { main: [[{ node: 'Respond 200 (silent drop)', type: 'main', index: 0 }], [{ node: 'Respond 422 invalid', type: 'main', index: 0 }]] },
    },
    pinData: {},
    meta: { templateCredsSetupCompleted: false, rrs: { generatedFrom: '05-Lead-Research/intake/lead-intake.ts', requiresEnv: ['RRS_CRM_WEBHOOK_URL', 'RRS_NOTIFY_WEBHOOK_URL'], status: 'not import-tested; review before activating' } },
    tags: [],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(here, { recursive: true });
  const wf = intakeWorkflow(bundleIntake());
  writeFileSync(join(here, 'rrs-intake.workflow.json'), JSON.stringify(wf, null, 2) + '\n');
  console.log(`workflows: rrs-intake.workflow.json (${wf.nodes.length} nodes, inactive)`);
}
