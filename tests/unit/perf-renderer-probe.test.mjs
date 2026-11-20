/**
 * THE RENDERER PROBE MUST NOT CREATE A CONTEXT PER CALL.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * Measured on Kyle's M3 Pro, production, 2026-11-20: the page went
 * WHITE with the engine still running perfectly on the CPU — 2.5 ms a
 * frame at 120 fps — and the browser's own log said why, sixteen times
 * over:
 *
 *     WARNING: Too many active WebGL contexts. Oldest context will be
 *     lost.
 *
 * Chrome keeps about sixteen live WebGL contexts and evicts the OLDEST
 * when the seventeenth arrives. The client's renderer probe was
 * creating a context on EVERY call to `clientRenderer()`, which
 * `window.__xashPacing()` reaches. Forty calls produced 186 eviction
 * warnings, and the engine's context was the one that went.
 *
 * The probe existed for a good reason: the landing page shows the
 * readout before the engine has booted, and the readout wants to name
 * the GPU (a software rasteriser is the worst news the game can
 * deliver). So the probe stays — but it runs ONCE per session, because
 * the GPU does not change mid-session.
 *
 * THE MEASURED CONTRACT
 * ---------------------
 *   50 calls to `clientRenderer()` -> AT MOST ONE context created.
 *
 * And the reason it leaked at all: `engineRendererInfo()` returns
 * nothing once the engine's context is LOST, and a lost context is
 * exactly when the readout is asked the most questions. So the leak
 * was worst precisely when it could least be tolerated — and it made
 * the loss permanent, because every call pushed the browser further
 * over the limit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const PERF_COLLECT_TS = join(WEBXASH, 'src', 'services', 'perf-collect.ts');

function requireSubmodule() {
  if (!existsSync(WEBXASH)) {
    throw new Error(
      'the webxash submodule is not checked out — run ' +
        '`git submodule update --init --recursive`. This test reads the ' +
        'frontend source, so it cannot pass without it.',
    );
  }
}

/** A fake WebGL2 context, and a counter of how many were handed out. */
function fakeContext(counter) {
  return {
    getExtension(name) {
      if (name === 'WEBGL_debug_renderer_info') {
        return { UNMASKED_RENDERER_WEBGL: 0x9246, UNMASKED_VENDOR_WEBGL: 0x9245 };
      }
      if (name === 'WEBGL_lose_context') return { loseContext() {} };
      return null;
    },
    getParameter(which) {
      if (which === 0x9246) return 'Fake GPU';
      if (which === 0x9245) return 'Fake Vendor';
      return 0;
    },
    created: counter,
  };
}

test('the renderer probe creates AT MOST ONE WebGL context per session', async () => {
  requireSubmodule();

  let created = 0;
  const fakeDocument = {
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          created += 1;
          return fakeContext(created);
        },
      };
    },
  };

  // The module reads `document` at call time, so a stub installed
  // before the import is enough — and it must be REMOVED afterwards,
  // or the next test in this file would see a different world.
  const had = Object.prototype.hasOwnProperty.call(globalThis, 'document');
  const previous = globalThis.document;
  globalThis.document = fakeDocument;
  try {
    const { clientRenderer } = await import(PERF_COLLECT_TS);
    for (let i = 0; i < 50; i += 1) clientRenderer();
    assert.equal(
      created,
      1,
      'fifty reads of the renderer name must not create fifty WebGL ' +
        'contexts: Chrome evicts the oldest context past about sixteen, ' +
        'and the oldest one is the engine\'s.',
    );
  } finally {
    if (had) globalThis.document = previous;
    else delete globalThis.document;
  }
});

test('the probe result is cached, and a FAILED probe is not', () => {
  requireSubmodule();
  const src = readFileSync(PERF_COLLECT_TS, 'utf8');
  // The cache is the mechanism; the behaviour above is the contract.
  assert.match(
    src,
    /if \(probedRenderer\) return probedRenderer;/,
    'the probe result must be kept: the GPU does not change mid-session.',
  );
  assert.match(
    src,
    /probedRenderer = \{ name, vendor \};/,
    'a SUCCESSFUL probe must be recorded.',
  );
  assert.doesNotMatch(
    src,
    /catch \{[\s\S]{0,80}probedRenderer = /,
    'a FAILED probe must not be cached: it created no context, so ' +
      'retrying it is free, and a cached empty answer would be a lie.',
  );
});
