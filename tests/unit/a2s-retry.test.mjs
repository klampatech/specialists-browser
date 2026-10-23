/**
 * The A2S retry.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The registry marks an instance DOWN after three consecutive failed A2S
 * probes, and the orchestrator then restarts it — which kicks every
 * player off the server.
 *
 * But a UDP reply can be LOST, and this server loses a lot of them.
 * Measured against the live production instance:
 *
 *     one query every 2s   ->  0% lost
 *     one query every 400ms -> 15% lost
 *     one query every 60ms  -> 42% lost
 *
 * The server is not slow — when it answers it does so in 16ms (p50) and
 * under 52ms (p95). It is dropping queries. So a single dropped reply
 * must never be enough to restart a healthy game server.
 *
 * The production registry restarted a healthy server three times in
 * three hours before this retry existed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  probeWithRetry,
  timeoutForAttempt,
  DEFAULT_ATTEMPTS,
  DEFAULT_DELAY_MS,
  FIRST_TIMEOUT_MS,
  RETRY_TIMEOUT_MS,
} = require('../../services/registry/lib/a2s-retry.mjs');

const noSleep = async () => {};

test('a probe that succeeds first time is not retried', async () => {
  let calls = 0;
  const result = await probeWithRetry(async () => { calls++; return { map: 'ts_casa' }; }, { sleep: noSleep });
  assert.deepEqual(result, { map: 'ts_casa' });
  assert.equal(calls, 1);
});

test('a dropped reply is retried', async () => {
  let calls = 0;
  const result = await probeWithRetry(
    async () => { calls++; return calls === 2 ? { map: 'ts_casa' } : null; },
    { sleep: noSleep },
  );
  assert.deepEqual(result, { map: 'ts_casa' });
  assert.equal(calls, 2);
});

test('three dropped replies in a row give up', async () => {
  let calls = 0;
  const result = await probeWithRetry(async () => { calls++; return null; }, { sleep: noSleep });
  assert.equal(result, null);
  assert.equal(calls, DEFAULT_ATTEMPTS);
});

test('the attempt number is passed to the probe', async () => {
  const seen = [];
  await probeWithRetry(async (attempt) => { seen.push(attempt); return null; }, { sleep: noSleep });
  assert.deepEqual(seen, [1, 2, 3]);
});

test('retries wait between attempts', async () => {
  const waits = [];
  await probeWithRetry(async () => null, {
    sleep: async (ms) => { waits.push(ms); },
  });
  assert.equal(waits.length, DEFAULT_ATTEMPTS - 1);
  assert.ok(waits.every((ms) => ms === DEFAULT_DELAY_MS));
});

test('a throwing probe is treated as a failed attempt, not a crash', async () => {
  let calls = 0;
  const result = await probeWithRetry(async () => {
    calls++;
    if (calls === 1) throw new Error('socket exploded');
    return { map: 'ts_casa' };
  }, { sleep: noSleep });
  assert.deepEqual(result, { map: 'ts_casa' });
  assert.equal(calls, 2);
});

test('the first attempt gets a generous window, retries get a tight one', () => {
  assert.equal(timeoutForAttempt(1), FIRST_TIMEOUT_MS);
  assert.equal(timeoutForAttempt(2), RETRY_TIMEOUT_MS);
  assert.equal(timeoutForAttempt(3), RETRY_TIMEOUT_MS);
  // The retry window has to clear the observed worst case with room to
  // spare: the server answers in under 52ms (p95) when it answers.
  assert.ok(RETRY_TIMEOUT_MS > 52 * 4, 'the retry window is too tight for a busy server');
  // And it has to be much cheaper than the first window, because most
  // ports in the range have nothing listening at all.
  assert.ok(RETRY_TIMEOUT_MS < FIRST_TIMEOUT_MS / 2, 'the retry window is not cheaper than the first');
});

test('zero attempts is not a probe', async () => {
  let calls = 0;
  const result = await probeWithRetry(async () => { calls++; return { ok: true }; }, { attempts: 0, sleep: noSleep });
  assert.equal(result, null);
  assert.equal(calls, 0);
});
