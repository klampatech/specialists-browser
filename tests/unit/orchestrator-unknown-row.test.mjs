/**
 * The orchestrator's restart clock.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The orchestrator restarted a healthy game server repeatedly, and each
 * restart kicked every player off it.
 *
 * One of the ways it decided to do that was by treating a MISSING row
 * in the registry as a down instance. But "the registry does not know
 * about this instance" and "the registry says this instance is down"
 * are different statements, and only one of them is true.
 *
 * A row is missing when the registry has just started (its first poll
 * has not landed yet) and when it drops an entry it has not refreshed
 * for a while. Both happened during a deploy, and both ended with a
 * healthy server being restarted.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { classifyInstance } = require('../../services/orchestrator/lib/restart-clock.mjs');

test('a row that says down starts the clock', () => {
  const r = classifyInstance({ row: { responsive: false } });
  assert.equal(r.unresponsive, true);
});

test('a healthy row clears the clock', () => {
  const r = classifyInstance({ row: { responsive: true } });
  assert.equal(r.unresponsive, false);
});

test('a MISSING row does not start the clock', () => {
  // The bug. "I cannot see it" is not "it is dead".
  const r = classifyInstance({ row: undefined });
  assert.equal(r.unresponsive, false);
  assert.equal(r.clear, false, 'the timer must be left alone, not cleared');
});

test('a missing row leaves an existing timer running', () => {
  // If the registry later reports the instance down, the clock starts
  // then — the timer must not have been reset in the meantime.
  const r = classifyInstance({ row: undefined });
  assert.equal(r.clear, false);
});

test('a missing row never counts as down no matter how long it is missing', () => {
  for (const age of [0, 60_000, 3_600_000]) {
    const r = classifyInstance({ row: undefined, missingForMs: age });
    assert.equal(r.unresponsive, false, `missing for ${age}ms must not look down`);
  }
});
