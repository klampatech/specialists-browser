/**
 * The registry's rows: one object per instance, mutated in place.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * Production broke because of a lost update, and it broke in the most
 * expensive way possible: silently, with a plausible-looking number.
 *
 * THE BUG. The registry is a `Map` of instance rows. Two polls write to
 * it, and they disagreed about what a row IS:
 *
 *   - `pollA2S` REPLACED the row object:
 *         registry.set(id, { ...existing, ...result, ... })
 *   - `pollMetrics` captured a row REFERENCE, awaited a slow console
 *     read, then wrote to that reference:
 *         instance.metricsOk = true
 *
 * If `pollA2S` replaced the row during `pollMetrics`' await, the
 * metrics write landed on an ORPHANED object. The map kept the newer
 * row, which never received the tickrate.
 *
 * WHAT IT COST. A live server with 16 players on it reported
 * `tickrate: null` and `humans: 0` forever. The deploy's own
 * "Verify production" step requires `tickrate > 0`, so every deploy
 * failed. `classifyProbeFailure` reads `metricsOk: false` as "down",
 * so a missed A2S probe counted toward a restart — and the orchestrator
 * restarted the game server twice, kicking every player off it.
 *
 * The fix is to MUTATE rows rather than replace them, so a concurrent
 * writer holding a reference can never be orphaned.
 *
 * This test exists so that a well-meaning refactor - someone reaching
 * for `registry.set(id, {...row, ...})` because it reads cleanly - does
 * not silently bring the race back.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { updateRow, updateRowIfCurrent } from '../../services/registry/lib/registry-rows.mjs';

test('updating a row keeps its identity', () => {
  const registry = new Map();
  const first = updateRow(registry, 'ts-0', { players: 16, bots: 16 });
  const second = updateRow(registry, 'ts-0', { players: 17, bots: 15 });

  // Same object, not a copy. This is the whole point.
  assert.equal(first, second);
  assert.equal(registry.get('ts-0'), first);
  assert.equal(first.players, 17);
});

test('a metrics write survives a concurrent A2S poll', () => {
  const registry = new Map();
  const row = updateRow(registry, 'ts-0', { players: 16, bots: 16, tickrate: null });

  // The metrics poll captures its reference and starts waiting on the
  // console. While it waits, the A2S poll runs and updates the row.
  updateRow(registry, 'ts-0', { players: 16, bots: 14, seenAt: 1 });

  // Now the metrics write lands. It must reach the row in the map.
  const wrote = updateRowIfCurrent(registry, row, { metricsOk: true, tickrate: 100 });

  assert.equal(wrote, true);
  const live = registry.get('ts-0');
  assert.equal(live.tickrate, 100);
  assert.equal(live.metricsOk, true);
  // The A2S poll's own fields survive the metrics write.
  assert.equal(live.bots, 14);
});

test('the old behaviour really did lose the write', () => {
  // This is the bug, reproduced. If the row is REPLACED instead of
  // mutated, the metrics write is lost - the map keeps the newer row
  // and the orphan takes the tickrate with it.
  const registry = new Map();
  const row = { id: 'ts-0', players: 16, bots: 16, tickrate: null };

  // pollA2S replaces the row, the way it used to.
  registry.set('ts-0', { ...row, players: 16, bots: 14, seenAt: 1 });

  // pollMetrics writes to the reference it captured.
  row.tickrate = 100;
  row.metricsOk = true;

  // The map never sees the write.
  assert.equal(registry.get('ts-0').tickrate, null);
  assert.equal(registry.get('ts-0').metricsOk, undefined);
});

test('a write to a row that was removed does not happen', () => {
  const registry = new Map();
  const row = updateRow(registry, 'ts-0', { players: 16 });

  // The instance went stale and the staleness cutoff deleted it.
  registry.delete('ts-0');

  const wrote = updateRowIfCurrent(registry, row, { metricsOk: true });

  assert.equal(wrote, false);
  assert.equal(registry.has('ts-0'), false);
});

test('a write to a row that was replaced does not happen', () => {
  const registry = new Map();
  const stale = updateRow(registry, 'ts-0', { players: 16 });

  // Something replaced the row with a different object.
  registry.set('ts-0', { id: 'ts-0', players: 16 });

  const wrote = updateRowIfCurrent(registry, stale, { metricsOk: true });

  assert.equal(wrote, false);
  // The row in the map is untouched.
  assert.equal(registry.get('ts-0').metricsOk, undefined);
});

test('a row is created when it does not exist yet', () => {
  const registry = new Map();
  const row = updateRow(registry, 'ts-1', { players: 0, id: 'ts-1' });

  assert.equal(registry.get('ts-1'), row);
  assert.equal(row.players, 0);
});
