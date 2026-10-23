/**
 * What a failed A2S probe means.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The orchestrator restarted a healthy game server three times in
 * three hours, and each restart kicked every player off it.
 *
 * The cause is a bad assumption: that a missed A2S probe means the
 * server is dead.
 *
 * A2S is answered on the GAME THREAD, which is busiest exactly when
 * the server is doing its job — when real players are connected. When
 * a reply IS lost it never arrives at all (listening for eight seconds
 * after a miss caught nothing), so no longer timeout can rescue it.
 *
 * Which makes the failure mode vicious: the busier the server gets
 * with real players, the more likely it is to be declared dead and
 * restarted — kicking the players off and emptying it again.
 *
 * The console is a different path. It is a pipe into the server's
 * stdin and answers regardless of the game thread. So a missed A2S
 * probe is only believed when the console ALSO fails.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { classifyProbeFailure, nextFailureCount } = require('../../services/registry/lib/liveness.mjs');

test('a server that answers on the console is alive, not dead', () => {
  assert.equal(classifyProbeFailure(true), 'alive');
});

test('a server that fails on the console too is down', () => {
  assert.equal(classifyProbeFailure(false), 'down');
});

test('an unreachable console is unknown, not a verdict', () => {
  assert.equal(classifyProbeFailure(null), 'unknown');
});

test('a busy server resets the failure count', () => {
  // The whole point. A busy server must not accumulate failures
  // toward a restart.
  assert.equal(nextFailureCount('alive', 2), 0);
  assert.equal(nextFailureCount('alive', 0), 0);
});

test('a genuinely down server keeps counting', () => {
  assert.equal(nextFailureCount('down', 0), 1);
  assert.equal(nextFailureCount('down', 1), 2);
  assert.equal(nextFailureCount('down', 2), 3);
});

test('an unknown console falls back to counting the miss', () => {
  assert.equal(nextFailureCount('unknown', 0), 1);
  assert.equal(nextFailureCount('unknown', 1), 2);
});

test('three real failures are three real failures', () => {
  // The restart threshold still works — the console check only stops
  // BUSY servers from being mistaken for dead ones.
  let count = 0;
  for (let i = 0; i < 3; i++) count = nextFailureCount('down', count);
  assert.equal(count, 3);
});

test('a busy server in the middle of a failure run clears the run', () => {
  let count = 0;
  count = nextFailureCount('down', count);
  count = nextFailureCount('down', count);
  assert.equal(count, 2);
  count = nextFailureCount('alive', count);
  assert.equal(count, 0, 'one busy poll must clear the accumulated failures');
});
