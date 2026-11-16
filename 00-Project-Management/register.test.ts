import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deliverables } from './deliverables.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('register IDs are unique', () => {
  const ids = deliverables.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('Created/Tested/Approved deliverables point at files that exist', () => {
  const missing: string[] = [];
  for (const d of deliverables) {
    if (!['Created', 'Tested', 'Approved'].includes(d.status)) continue;
    assert.ok(d.paths.length > 0, `${d.id} has status ${d.status} but no file paths`);
    for (const p of d.paths) if (!existsSync(join(root, p))) missing.push(`${d.id}: ${p}`);
  }
  assert.deepEqual(missing, [], `Missing files:\n${missing.join('\n')}`);
});

test('Tested deliverables record a validation result', () => {
  for (const d of deliverables.filter((x) => x.status === 'Tested')) {
    assert.ok(d.validation && d.validation !== '—', `${d.id} is Tested without a validation note`);
  }
});

test('dependencies reference known IDs', () => {
  const ids = new Set(deliverables.map((d) => d.id));
  for (const d of deliverables) for (const dep of d.dependencies) assert.ok(ids.has(dep), `${d.id} → unknown ${dep}`);
});

test('nothing is Approved without owner approval recorded', () => {
  for (const d of deliverables.filter((x) => x.status === 'Approved')) assert.equal(d.approval, 'Approved', d.id);
});
