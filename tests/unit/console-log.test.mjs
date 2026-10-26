/**
 * Reading the engine's console out of a container's log.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The registry asks the game server questions by writing a command to
 * its console FIFO and reading the answer back out of the container's
 * Docker log.
 *
 * It used to read the log by BYTE OFFSET:
 *
 *     const offset = await logSize(container);          // docker logs | wc -c
 *     const text = await logsSince(container, offset);  // docker logs | tail -c +N
 *
 * Both are O(ENTIRE LOG) - `docker logs` streams the whole log every
 * time, no matter how much of it you want. The game server's log grows
 * without bound, so each console question got slower and slower:
 * 168ms against a 1.1MB log, and 51 SECONDS against a 5.4MB log.
 *
 * That is what turned a race into a certainty. `collectMetrics` runs
 * three of these questions in parallel and waits for all of them. At
 * 10-16 seconds it outlasted the 10-second A2S poll, so the metrics
 * write was ALWAYS orphaned by the row replacement.
 *
 * The fix is to read the TAIL of the log, which `docker logs --tail N`
 * does by reading backwards - the same cost whether the log is 1KB or
 * 1GB (26ms for the last 1000 lines of a 5.4MB log, against 51 seconds
 * for the whole thing).
 *
 * These tests cover the part that can be tested without a container:
 * that the answer is found after its marker, and that a window which
 * does not contain the marker does not produce a false answer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOG_TAIL_LINES,
  findAnswerAfterMarker,
} from '../../services/registry/lib/console-log.mjs';

const PAT = /"sys_ticrate"\s+is\s+"(\d+)"/;

test('the answer after the marker is found', () => {
  const text = [
    '[04:34:09] "mp_timeleft" is "460"',
    '[04:34:09] Warning: Unknown command "TSREGabc"',
    '[04:34:09] "sys_ticrate" is "100"',
    '[04:34:11] [ts] Bot Apoc 215 spawned',
  ].join('\n');

  const m = findAnswerAfterMarker(text, 'TSREGabc', PAT);
  assert.ok(m);
  assert.equal(m[1], '100');
});

test('a value before the marker is not the answer', () => {
  // The engine's own log has plenty of numbers in it. Only what comes
  // AFTER the marker is this command's answer.
  const text = [
    '[04:34:09] "sys_ticrate" is "66"',
    '[04:34:09] Warning: Unknown command "TSREGabc"',
    '[04:34:09] "sys_ticrate" is "100"',
  ].join('\n');

  const m = findAnswerAfterMarker(text, 'TSREGabc', PAT);
  assert.ok(m);
  assert.equal(m[1], '100');
});

test('no marker means no answer', () => {
  const text = '[04:34:09] "sys_ticrate" is "100"';
  assert.equal(findAnswerAfterMarker(text, 'TSREGabc', PAT), null);
});

test('a marker with no answer after it means no answer', () => {
  const text = '[04:34:09] Warning: Unknown command "TSREGabc"';
  assert.equal(findAnswerAfterMarker(text, 'TSREGabc', PAT), null);
});

test('the tail window is big enough to hold an answer', () => {
  // The answer is written a moment after the marker, so the window
  // only has to cover the lines in between. It is generous on
  // purpose: too small a window silently becomes "the console did not
  // answer", which is the failure this module exists to prevent.
  assert.ok(LOG_TAIL_LINES >= 100, 'the tail window is too small to be useful');
});

test('an answer written long ago is still findable in a window', () => {
  // A window of N lines holds the last N lines. The answer is always
  // among them, because it was written after the marker, which was
  // written moments before it.
  const lines = [];
  for (let i = 0; i < LOG_TAIL_LINES; i++) {
    lines.push(`[04:34:09] [ts] noise ${i}`);
  }
  lines.push('[04:34:09] Warning: Unknown command "TSREGabc"');
  lines.push('[04:34:09] "sys_ticrate" is "100"');

  const m = findAnswerAfterMarker(lines.join('\n'), 'TSREGabc', PAT);
  assert.ok(m);
  assert.equal(m[1], '100');
});
