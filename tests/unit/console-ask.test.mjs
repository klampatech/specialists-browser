/**
 * Asking the engine a question over its console.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * A console command can be SWALLOWED. The console is a FIFO, and a FIFO
 * delivers what is written to it to exactly ONE waiting reader — so if
 * the container's entrypoint holds that FIFO open read-write, PID 1 is a
 * reader too, and the kernel can hand the command to PID 1's descriptor,
 * where it is consumed and discarded.
 *
 * Measured on production: a single console question NEVER answered in
 * 25 seconds, 2 times out of 12. The registry's own three-in-parallel
 * pattern missed the tickrate in 2 rounds out of 10.
 *
 * That matters more than a lost question. A failed console read is the
 * registry's PROOF OF LIFE, and it is read as 'down' (lib/liveness.mjs),
 * so three in a row mark the instance stale — and the public server
 * list is `rows.filter((r) => !r.stale)`, so the whole list goes empty
 * and every player gets a dead PLAY button for as long as it takes.
 *
 * These tests cover the part that can be tested without a container:
 * the retry.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { askConsole, makeMarker } = require('../../services/registry/lib/console-ask.mjs');

const PATTERN = /"sys_ticrate"\s+is\s+"(\d+)"/;

/**
 * A clock the test drives.
 *
 * `sleep` advances it, so a loop that polls cannot spin forever: the
 * clock is the only thing that makes time pass, and it passes exactly
 * as much as the code under test waits.
 */
function fakeClock() {
  const c = { now: 0 };
  c.sleep = async (ms) => {
    c.now += ms;
  };
  return c;
}

/**
 * A fake console.
 *
 * `swallow` is how many writes are LOST — the signature of the FIFO
 * race, where the kernel hands the command to a reader that discards
 * it. Everything that is not swallowed reaches the "engine", which
 * echoes the marker and answers the command.
 */
function fakeConsole({ swallow = 0, clock } = {}) {
  const state = { writes: [], swallowed: 0, log: '' };
  return {
    state,
    now: () => clock.now,
    sleep: clock.sleep,
    async write(line) {
      state.writes.push(line);
      if (state.swallowed < swallow) {
        state.swallowed++;
        return; // the command vanished
      }
      const marker = (line.match(/^echo (\S+)$/) || [])[1];
      if (marker) state.log += `\n${marker}`;
      else state.log += `\n"sys_ticrate" is "100" ( "100" )`;
    },
    async read() {
      return state.log;
    },
  };
}

test('a question that is answered comes back on the first attempt', async () => {
  const clock = fakeClock();
  const c = fakeConsole({ clock });
  const answer = await askConsole({
    write: c.write,
    read: c.read,
    command: 'sys_ticrate',
    pattern: PATTERN,
    now: c.now,
    sleep: c.sleep,
  });
  assert.ok(answer, 'the answer should have been found');
  assert.equal(answer[1], '100');
  assert.equal(c.state.writes.length, 2, 'a marker and a command, once');
});

test('a SWALLOWED command is asked again, and the second attempt answers', async () => {
  const clock = fakeClock();
  const c = fakeConsole({ swallow: 1, clock });
  const answer = await askConsole({
    write: c.write,
    read: c.read,
    command: 'sys_ticrate',
    pattern: PATTERN,
    timeoutMs: 6_000,
    attemptMs: 2_000,
    markerGraceMs: 1_000,
    now: c.now,
    sleep: c.sleep,
  });
  assert.ok(answer, 'the retry should have found the answer');
  assert.equal(answer[1], '100');
  assert.equal(c.state.swallowed, 1, 'the first attempt really was swallowed');
  assert.equal(c.state.writes.length, 4, 'two markers and two commands');
});

test('a question that is swallowed every time gives up, and gives up in time', async () => {
  const clock = fakeClock();
  const c = fakeConsole({ swallow: 99, clock });
  const answer = await askConsole({
    write: c.write,
    read: c.read,
    command: 'sys_ticrate',
    pattern: PATTERN,
    timeoutMs: 6_000,
    attemptMs: 2_000,
    markerGraceMs: 1_000,
    now: c.now,
    sleep: c.sleep,
  });
  assert.equal(answer, null, 'a question that is never delivered has no answer');
  assert.ok(
    clock.now <= 6_000 + 2_000,
    `gave up after ${clock.now}ms, which is past the deadline`
  );
});

test('a question that is merely SLOW is not asked again', async () => {
  // The marker IS in the log but the answer is not there yet. That is a
  // slow engine, not a swallowed command, and asking again would run the
  // command twice for nothing.
  const clock = fakeClock();
  let readCount = 0;
  let log = '';
  let writes = 0;
  const answer = await askConsole({
    async write(line) {
      writes++;
      const marker = (line.match(/^echo (\S+)$/) || [])[1];
      // Only the marker reaches the engine here; the ANSWER is late.
      if (marker) log += `\n${marker}`;
    },
    async read() {
      readCount++;
      // The answer only shows up on the third read.
      if (readCount >= 3) log += '\n"sys_ticrate" is "100" ( "100" )';
      return log;
    },
    command: 'sys_ticrate',
    pattern: PATTERN,
    now: () => clock.now,
    sleep: clock.sleep,
  });
  assert.ok(answer, 'the slow answer should have been found');
  assert.equal(readCount, 3, 'the answer should be found as soon as it is there');
  assert.equal(writes, 2, 'the command must not be asked twice');
});

test('every marker is unique', () => {
  const markers = new Set();
  for (let i = 0; i < 1000; i++) markers.add(makeMarker());
  assert.equal(markers.size, 1000, 'two markers must never collide');
});
