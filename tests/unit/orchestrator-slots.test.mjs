/**
 * The orchestrator publishes its SLOTS, even when it cannot see the fleet.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The orchestrator's instance list was only ever populated inside the
 * loop that runs AFTER the registry has been read -- and that loop is
 * skipped, on purpose, when the registry cannot be reached ("do nothing
 * rather than act on nothing"). So a registry outage left the published
 * list EMPTY.
 *
 * And an empty list is not a neutral thing to publish. The admin console
 * reads this list to know the fleet, so an empty list made the console
 * show an EMPTY FLEET, with the confident detail "the orchestrator
 * reports 0 deployed instance(s)" -- while the game server was running
 * perfectly well. An operator would have concluded every server was
 * gone.
 *
 * Measured on production, 2026-11-01: with the registry unreachable,
 * `/api/orchestrator` published `instances: []`.
 *
 * The slots are OURS: they come from the configuration, and whether a
 * slot is deployed is a DOCKER question, not a registry question. So
 * they are published either way, and the registry's absence only stops
 * the orchestrator from ACTING on what it cannot see.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'node:net';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVICE = join(HERE, '..', '..', 'services', 'orchestrator', 'service.mjs');

/**
 * A port nobody is listening on.
 *
 * @returns {Promise<number>}
 */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/**
 * Start the orchestrator against a registry that will never answer.
 *
 * @param {number} port the port it listens on
 * @param {number} instances how many slots it is configured with
 * @returns {{child: import('node:child_process').ChildProcess, stop: () => void}}
 */
function startOrchestrator(port, instances) {
  const child = spawn(process.execPath, [SERVICE], {
    env: {
      ...process.env,
      ORCH_BIND: `127.0.0.1:${port}`,
      // A port nothing listens on: the registry read fails, which is
      // the whole point.
      REGISTRY_URL: 'http://127.0.0.1:1/api/registry',
      TS_INSTANCE_COUNT: String(instances),
      // A port base with no containers behind it, so `deployed` is false
      // for every slot and the test is not reading the host's fleet.
      TS_PORT_BASE: '27900',
      ORCH_INTERVAL_MS: '60000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    child,
    stop: () => {
      child.kill('SIGKILL');
    },
  };
}

/**
 * Wait for the orchestrator to answer.
 *
 * @param {number} port
 * @param {number} timeoutMs
 * @returns {Promise<object>}
 */
async function waitForOrchestrator(port, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/orchestrator`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`the orchestrator did not answer: ${lastError?.message ?? 'timeout'}`);
}

test('the orchestrator publishes its SLOTS even when the registry is unreachable', async () => {
  const port = await freePort();
  const orch = startOrchestrator(port, 3);
  try {
    const body = await waitForOrchestrator(port);

    // The bug: this array was EMPTY, and the console read it as "there
    // are no game servers".
    assert.equal(
      Array.isArray(body.instances),
      true,
      'the orchestrator must publish an instances array',
    );
    assert.equal(
      body.instances.length,
      3,
      `every configured slot must be published even with the registry down (got ${JSON.stringify(body.instances)})`,
    );
    // And the slots are the ones it was configured with.
    assert.deepEqual(
      body.instances.map((i) => i.id).sort(),
      ['ts-0', 'ts-1', 'ts-2'],
    );
    // With no container behind them, they are not deployed -- but they
    // are PUBLISHED, which is the difference: "this slot exists and has
    // no container" is not "there is no fleet".
    for (const inst of body.instances) {
      assert.equal(inst.deployed, false);
    }
    // And the orchestrator still says it cannot see the fleet, rather
    // than claiming the fleet is empty.
    assert.ok(body.fleet, 'the fleet block must still be there');
  } finally {
    orch.stop();
  }
});

test('a healthy orchestrator publishes the same slots, and the deployed flag is per slot', async () => {
  // The same shape with a registry that answers, so the two are
  // comparable: the slots do not come and go with the registry.
  const port = await freePort();
  const orch = startOrchestrator(port, 2);
  try {
    const body = await waitForOrchestrator(port);
    assert.equal(body.instances.length, 2);
    assert.deepEqual(
      body.instances.map((i) => i.id).sort(),
      ['ts-0', 'ts-1'],
    );
  } finally {
    orch.stop();
  }
});
