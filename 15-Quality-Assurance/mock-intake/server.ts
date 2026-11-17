/**
 * Local stand-in for the n8n intake webhook (testing only, never deployed).
 * Runs the SAME validator as n8n, answers CORS preflight, records submissions.
 *   POST /intake          → 200 {ok, lead_id} | 422 {ok:false, errors} | 500 in fail mode
 *   POST /__mode {mode}   → 'ok' | 'fail'
 *   GET  /__submissions   → everything received (raw body + intake result)
 */
import { createServer, type Server } from 'node:http';
import { processSubmission, type IntakeResult } from '../../05-Lead-Research/intake/lead-intake.ts';

export interface Received { body: unknown; result: IntakeResult; origin: string | undefined }

export function startMockIntake(port: number, allowOrigin: string): Promise<{ server: Server; received: Received[] }> {
  const received: Received[] = [];
  let mode: 'ok' | 'fail' = 'ok';
  const server = createServer((req, res) => {
    const cors = { 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
    if (req.method === 'GET' && url.pathname === '/__submissions') { res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(received)); return; }
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 64 * 1024) req.destroy(); });
    req.on('end', () => {
      if (url.pathname === '/__mode') { mode = JSON.parse(raw).mode; res.writeHead(204).end(); return; }
      if (req.method !== 'POST' || url.pathname !== '/intake') { res.writeHead(404, cors).end(); return; }
      let body: unknown = null;
      try { body = JSON.parse(raw); } catch { /* invalid JSON → invalid */ }
      const result = processSubmission(body, new Date().toISOString());
      received.push({ body, result, origin: req.headers.origin });
      if (mode === 'fail') { res.writeHead(500, { ...cors, 'Content-Type': 'application/json' }).end('{"ok":false}'); return; }
      const code = result.status === 'invalid' ? 422 : 200;
      res.writeHead(code, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(result.status === 'accepted' ? { ok: true, lead_id: result.record!.lead_id } : result.status === 'spam' ? { ok: true } : { ok: false, errors: result.errors }));
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, received })));
}
