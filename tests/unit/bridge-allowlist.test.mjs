/**
 * The bridge's security floor.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * Without an allowlist the bridge is an OPEN UDP RELAY: anyone who can
 * open a WebSocket can make the host send packets to anything it can
 * reach. The registry may tell the bridge where to send a packet; only
 * this floor says whether it is allowed to.
 *
 * The bug this locks in: an unknown target used to be ACCEPTED at the
 * WebSocket upgrade and closed afterwards. A browser reads a closed
 * socket as "connected", so the failure was invisible from the client —
 * it showed up as "could not reach the game server" much later.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parsePortRange, createAllowlist } = require(
  '../../tools/port/tsp-rs/scripts/bridge-allowlist.cjs'
);

test('a port range expands to every port in it', () => {
  const ports = parsePortRange('27015-27022');
  assert.equal(ports.size, 8);
  assert.ok(ports.has(27015));
  assert.ok(ports.has(27022));
  assert.ok(!ports.has(27014));
  assert.ok(!ports.has(27023));
});

test('a port list expands to just those ports', () => {
  const ports = parsePortRange('27015,27017,27019');
  assert.equal(ports.size, 3);
  assert.ok(ports.has(27017));
  assert.ok(!ports.has(27016));
});

test('garbage in the port spec does not become a port', () => {
  const ports = parsePortRange('not-a-port,,27015,bad');
  assert.equal(ports.size, 1);
  assert.ok(ports.has(27015));
});

test('the floor allows the production target', () => {
  const floor = createAllowlist({ host: '127.0.0.1', ports: '27015-27022' });
  assert.equal(floor.withinFloor('127.0.0.1', 27015), true);
  assert.equal(floor.withinFloor('127.0.0.1', 27022), true);
});

test('the floor refuses a port outside the range', () => {
  const floor = createAllowlist({ host: '127.0.0.1', ports: '27015-27022' });
  assert.equal(floor.withinFloor('127.0.0.1', 27023), false);
  assert.equal(floor.withinFloor('127.0.0.1', 22), false);
});

test('the floor refuses a different host, even on an allowed port', () => {
  const floor = createAllowlist({ host: '127.0.0.1', ports: '27015-27022' });
  // This is the one that matters: without the host half, the bridge
  // would relay to any host that happens to run one of those ports.
  assert.equal(floor.withinFloor('10.0.0.1', 27015), false);
  assert.equal(floor.withinFloor('0.0.0.0', 27015), false);
  assert.equal(floor.withinFloor('40.160.225.81', 27015), false);
});

test('the floor refuses a host that merely looks like the allowed one', () => {
  const floor = createAllowlist({ host: '127.0.0.1', ports: '27015-27022' });
  assert.equal(floor.withinFloor('127.0.0.1.evil.example', 27015), false);
  assert.equal(floor.withinFloor('127.0.0.1 ', 27015), false);
  assert.equal(floor.withinFloor('127.0.0.10', 27015), false);
});
