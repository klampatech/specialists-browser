/**
 * The registry's two decisions: how many bots, and how many humans.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * Both were wrong at the same time, and both failed in the same way:
 * silently, with a plausible-looking number.
 *
 * THE GHOST PROBLEM. The bot roster is derived from the number of humans.
 * It used to read that from A2S arithmetic (`players - bots`), and A2S
 * counts client slots whose browsers have disconnected but have not timed
 * out yet. A player who left two minutes ago was still counted, so the
 * policy shrank the bot roster as though people were still playing. An
 * EMPTY server played with two bots instead of four.
 *
 * THE EMPTY-MAP TRAP. The bridge counts open WebSockets, so it is the
 * authority on how many humans there are. But an EMPTY map from a
 * reachable bridge means ZERO HUMANS, not "unknown" — and treating it as
 * unknown falls back to A2S, which is the ghost problem again, for
 * exactly the case the bridge was added to fix.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bridgeTargetIdFor,
  desiredBotQuota,
  resolveHumanCount,
} from '../../services/registry/lib/fleet-logic.mjs';

test('the bot roster yields to humans, one for one', () => {
  assert.equal(desiredBotQuota(0, 4), 4);
  assert.equal(desiredBotQuota(1, 4), 3);
  assert.equal(desiredBotQuota(2, 4), 2);
  assert.equal(desiredBotQuota(3, 4), 1);
});

test('the bot roster never goes negative', () => {
  assert.equal(desiredBotQuota(4, 4), 0);
  assert.equal(desiredBotQuota(9, 4), 0);
});

test('a missing human count is treated as none', () => {
  assert.equal(desiredBotQuota(undefined, 4), 4);
  assert.equal(desiredBotQuota(null, 4), 4);
});

test('the bridge is the authority on humans', () => {
  const r = resolveHumanCount({
    bridgeLive: { 'ts-0': 2 },
    instanceId: 'ts-0',
    players: 7,
    bots: 4,
  });
  assert.equal(r.humans, 2);
  assert.equal(r.source, 'bridge');
});

test('an EMPTY bridge map means zero humans, not unknown', () => {
  // THE TRAP. Treating this as "unknown" falls back to A2S arithmetic
  // and the ghost problem comes straight back — for exactly the case
  // the bridge was added to fix: an empty server.
  const r = resolveHumanCount({
    bridgeLive: {},
    instanceId: 'ts-0',
    players: 4,
    bots: 4,
  });
  assert.equal(r.humans, 0, 'a reachable bridge that reports nobody means nobody');
  assert.equal(r.source, 'bridge');
});

test('an unreachable bridge falls back to A2S arithmetic', () => {
  const r = resolveHumanCount({
    bridgeLive: null,
    instanceId: 'ts-0',
    players: 7,
    bots: 4,
  });
  assert.equal(r.humans, 3);
  assert.equal(r.source, 'a2s');
});

test('the A2S fallback never reports negative humans', () => {
  const r = resolveHumanCount({
    bridgeLive: null,
    instanceId: 'ts-0',
    players: 2,
    bots: 4,
  });
  assert.equal(r.humans, 0);
});

test('another instance\'s browser count is not this instance\'s', () => {
  const r = resolveHumanCount({
    bridgeLive: { 'ts-1': 5 },
    instanceId: 'ts-0',
    players: 1,
    bots: 0,
  });
  assert.equal(r.humans, 0);
  assert.equal(r.source, 'bridge');
});

/**
 * THE TARGET-ID MISMATCH (2026-10-24)
 * -----------------------------------
 *
 * The bridge keys its live-connection map by TARGET id and the registry
 * looked it up by INSTANCE id, so the lookup always missed and the
 * published human count was permanently zero — while people were playing.
 * The count only read 1 when the bridge fetch timed out and the A2S
 * fallback caught it by accident.
 *
 * These tests are the ones that would have caught it.
 */

// The real shape, from the bridge's /health.
const BRIDGE_TARGETS = ['default=127.0.0.1:27015 (public 40.160.225.81:27015)'];

test('the bridge target id is found by the address the bridge dials', () => {
  assert.equal(
    bridgeTargetIdFor({ targets: BRIDGE_TARGETS, host: '127.0.0.1', port: 27015 }),
    'default'
  );
});

test('a target with no public address is still found', () => {
  assert.equal(
    bridgeTargetIdFor({ targets: ['ts-0=127.0.0.1:27016'], host: '127.0.0.1', port: 27016 }),
    'ts-0'
  );
});

test('an address the bridge does not serve has no target id', () => {
  assert.equal(
    bridgeTargetIdFor({ targets: BRIDGE_TARGETS, host: '127.0.0.1', port: 27099 }),
    undefined
  );
});

test('a missing or malformed target list has no target id', () => {
  assert.equal(bridgeTargetIdFor({ targets: null, host: '127.0.0.1', port: 27015 }), undefined);
  assert.equal(bridgeTargetIdFor({ targets: [], host: '127.0.0.1', port: 27015 }), undefined);
  assert.equal(
    bridgeTargetIdFor({ targets: ['no-equals-sign'], host: '127.0.0.1', port: 27015 }),
    undefined
  );
});

test('the human count is read under the bridge TARGET id', () => {
  // The exact situation that broke it: the map is keyed "default", the
  // instance is "ts-0", and looking the instance id up finds nothing.
  const r = resolveHumanCount({
    bridgeLive: { default: 3 },
    instanceId: 'ts-0',
    bridgeTargetId: 'default',
    players: 19,
    bots: 16,
  });
  assert.equal(r.humans, 3, 'three browsers are connected');
  assert.equal(r.source, 'bridge');
});

test('without the target id the instance id is still used', () => {
  // Backwards compatibility: a bridge that keys by instance id.
  const r = resolveHumanCount({
    bridgeLive: { 'ts-0': 2 },
    instanceId: 'ts-0',
    players: 7,
    bots: 4,
  });
  assert.equal(r.humans, 2);
  assert.equal(r.source, 'bridge');
});

test('a reachable bridge with no browsers means zero humans, even via the target id', () => {
  const r = resolveHumanCount({
    bridgeLive: {},
    instanceId: 'ts-0',
    bridgeTargetId: 'default',
    players: 4,
    bots: 4,
  });
  assert.equal(r.humans, 0);
  assert.equal(r.source, 'bridge');
});

test('another target\'s browsers are not this instance\'s', () => {
  const r = resolveHumanCount({
    bridgeLive: { default: 0, other: 5 },
    instanceId: 'ts-0',
    bridgeTargetId: 'default',
    players: 1,
    bots: 0,
  });
  assert.equal(r.humans, 0);
  assert.equal(r.source, 'bridge');
});
