/**
 * The deploy's "what changed?" decision.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The deploy silently skipped the frontend for every change that arrived
 * through the `webxash` submodule, and reported success every time.
 *
 * `git diff --name-only` prints one line for a submodule pointer move:
 *
 *     webxash
 *
 * No trailing slash, no files from inside. The deploy's rule was
 * `grep -qE '^webxash/'`, which needs the slash — so the pointer move
 * did not match, the frontend build was skipped, and the old bundle kept
 * serving. The keyboard double-delivery fix was merged, CI was green,
 * the deploy was green, the browser check was green, and production was
 * running the previous code.
 *
 * A false negative here is invisible: the deploy succeeds, and the only
 * symptom is that the thing you just merged is not live. So the decision
 * gets a fixture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyChanges } from '../../tools/deploy/changed-paths.cjs';

test('a submodule pointer move rebuilds the frontend', () => {
  // THE REGRESSION. The parent changed exactly one thing: the commit the
  // `webxash` submodule points at. `git diff --name-only` reports this as
  // the single path "webxash".
  const r = classifyChanges({ parentPaths: ['webxash'] });
  assert.equal(r.frontend, true, 'the frontend must be rebuilt');
});

test('the frontend is rebuilt for every change, whatever it is', () => {
  // The invariant that makes the bug impossible to repeat: there is no
  // path filter on the frontend to get wrong.
  for (const parentPaths of [
    [],
    ['webxash'],
    ['docs/FE-MOD-PLAN.md'],
    ['services/registry/index.mjs'],
    ['.github/workflows/deploy.yml'],
    ['tools/deploy/deploy-services.sh'],
  ]) {
    const r = classifyChanges({ parentPaths });
    assert.equal(r.frontend, true, `frontend must rebuild for ${JSON.stringify(parentPaths)}`);
  }
});

test('a change inside the submodule to the A2S plugin rebuilds the bridge image', () => {
  // vite-a2s-plugin.mjs lives in the submodule but is embedded in the
  // BRIDGE image — it talks to the game server. A change to it has to
  // rebuild the image, which the old filter could not see.
  const r = classifyChanges({
    parentPaths: ['webxash'],
    submodulePaths: ['vite-a2s-plugin.mjs'],
  });
  assert.equal(r.services, true);
  assert.equal(r.frontend, true);
});

test('a change inside the submodule elsewhere does not rebuild the images', () => {
  const r = classifyChanges({
    parentPaths: ['webxash'],
    submodulePaths: ['src/components/XashCanvas.vue'],
  });
  assert.equal(r.services, false, 'a frontend-only change should not restart the fleet');
  assert.equal(r.frontend, true);
});

test('a parent change to the control plane rebuilds the images', () => {
  for (const p of [
    'services/registry/index.mjs',
    'services/orchestrator/index.mjs',
    'tools/port/tsp-rs/scripts/ts-udp-bridge.js',
    'tools/deploy/Dockerfile.bridge',
  ]) {
    const r = classifyChanges({ parentPaths: [p] });
    assert.equal(r.services, true, `expected images to rebuild for ${p}`);
  }
});

test('a docs-only change touches neither the frontend build inputs nor the images', () => {
  const r = classifyChanges({ parentPaths: ['docs/FE-MOD-PLAN.md', 'README.md'] });
  assert.equal(r.services, false);
});

test('an unreadable submodule interior rebuilds the images anyway', () => {
  // If we cannot see what moved inside the submodule, we do not know
  // whether the bridge image's inputs moved. Rebuilding too much costs a
  // minute; rebuilding too little ships a stale bridge.
  const r = classifyChanges({ parentPaths: ['webxash'], submoduleDiffUnknown: true });
  assert.equal(r.services, true);
  assert.equal(r.frontend, true);
});
