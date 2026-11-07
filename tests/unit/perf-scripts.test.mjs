// THE PERF SCRIPTS HAVE TO PARSE.
//
// Two of them are long-running — the map sweep is ten to forty minutes
// — and bash reads a script INCREMENTALLY, by byte offset. So a
// syntax error in one does not surface when the file is written; it
// surfaces mid-run, when bash reaches the broken line, which can be
// twenty minutes after the mistake.
//
// The map sweep died exactly like that: a perfectly valid line, read
// mid-line because the file had been edited while bash was executing
// it.
//
// So: every shell script in the perf tools is parsed by the suite.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/home/kyle/Development/specialists-browser';
const PERF = join(ROOT, 'tools', 'perf');

const scripts = readdirSync(PERF).filter((f) => f.endsWith('.sh'));

test('there are perf scripts to check', () => {
  assert.ok(scripts.length >= 2, `expected the perf scripts, found ${scripts.join(', ')}`);
});

for (const f of scripts) {
  test(`${f} parses`, () => {
    // `bash -n` parses without running anything.
    execFileSync('bash', ['-n', join(PERF, f)], { stdio: 'pipe' });
  });
}

test('the long-running scripts run from a snapshot', () => {
  // Because bash reads a script by byte offset, editing one while it
  // runs shifts the bytes under bash and it lands mid-line. The
  // snapshot is what makes that impossible.
  for (const f of scripts) {
    const s = readFileSync(join(PERF, f), 'utf8');
    if (!/measure-map-cost|scan-fixture-cost/.test(f)) continue;
    assert.match(s, /XASH_PERF_SNAPSHOT/, `${f} does not run from a snapshot`);
    assert.match(s, /exec bash "\$SNAPSHOT"/, `${f} does not exec the snapshot`);
  }
});
