/**
 * What a failed A2S probe means.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The orchestrator restarted a healthy game server repeatedly, and each
 * restart kicked every player off it.
 *
 * The cause is a bad assumption: that a missed A2S probe means the
 * server is dead.
 *
 * A2S is answered on the GAME THREAD, which is busiest exactly when
 * the server is doing its job — when real players are connected. The
 * server drops a large share of its queries under load (measured: 42%
 * at one query every 60ms, 15% at one every 400ms, 0% at one every
 * 2s), and when a reply is lost it NEVER arrives — listening for eight
 * seconds after a miss caught nothing, so no longer timeout can rescue
 * it.
 *
 * Which makes the failure mode vicious: the busier the server gets
 * with real players, the more likely it is to be declared dead and
 * restarted — kicking the players off and emptying it again.
 *
 * The console is a different path: a pipe into the server's stdin, which
 * answers regardless of the game thread. The registry already polls it
 * every few seconds for the tickrate and the bot quota, so that
 * reading is the tie-breaker.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { classifyProbeFailure, nextFailureCount, shouldRefreshSeenAt, DEFAULT_MAX_METRICS_AGE_MS } =
  require('../../services/registry/lib/liveness.mjs');

test('a server whose console answered recently is alive, not dead', () => {
  assert.equal(classifyProbeFailure({ metricsOk: true, metricsAgeMs: 1000 }), 'alive');
});

test('a server whose console did not answer is down', () => {
  assert.equal(classifyProbeFailure({ metricsOk: false, metricsAgeMs: 1000 }), 'down');
});

test('no console reading at all is unknown, not a verdict', () => {
  assert.equal(classifyProbeFailure({}), 'unknown');
  assert.equal(classifyProbeFailure({ metricsOk: undefined }), 'unknown');
});

test('a console reading too old to vouch for the server is unknown', () => {
  assert.equal(
    classifyProbeFailure({ metricsOk: true, metricsAgeMs: DEFAULT_MAX_METRICS_AGE_MS + 1 }),
    'unknown',
  );
  assert.equal(
    classifyProbeFailure({ metricsOk: true, metricsAgeMs: DEFAULT_MAX_METRICS_AGE_MS }),
    'alive',
  );
});

test('a busy server resets the failure count', () => {
  // The whole point. A busy server must not accumulate failures toward
  // a restart that kicks the players off.
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

test('a console-proven-alive instance refreshes its "last seen" time', () => {
  // Otherwise the staleness cutoff deletes it, the server vanishes from
  // the server list, and nobody can join a server that is running.
  assert.equal(shouldRefreshSeenAt('alive'), true);
});

test('a down or unknown instance does not refresh its "last seen" time', () => {
  assert.equal(shouldRefreshSeenAt('down'), false);
  assert.equal(shouldRefreshSeenAt('unknown'), false);
});
