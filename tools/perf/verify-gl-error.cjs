#!/usr/bin/env node
/**
 * How expensive is `gl.getError()`, and how often is it called?
 *
 * WHY THIS EXISTS
 * ---------------
 * The CPU profile of a clean, single-tab game session on Kyle's MacBook
 * Pro (2026-11-07) put 11% of the sampled main-thread time into
 * `getError`, with this call chain:
 *
 *     getError
 *       <- xash3d-DG8s4f2H.js:_emscripten_glGetError
 *         <- wasm-to-js
 *           <- ...wasm-function[210]... [234] ... [240]
 *
 * The glue's implementation is:
 *
 *     var _emscripten_glGetError = () => {
 *       var error = GLctx.getError() || GL.lastError;
 *       GL.lastError = 0;
 *       return error;
 *     };
 *
 * `GLctx.getError()` is a WebGL call Chrome implements by flushing the
 * command buffer and waiting for the error state — a GPU ROUND-TRIP.
 * If the engine calls it every frame, that round-trip is a per-frame
 * tax that buys nothing.
 *
 * This script answers the two questions the profile alone cannot:
 *
 *   1. HOW MANY TIMES A SECOND is getError called?
 *   2. WHAT DOES ONE CALL COST?
 *
 * Both are measured by wrapping the prototype method, which counts
 * every call regardless of which glue path made it.
 *
 * USAGE
 *   node tools/perf/_diag-geterror.cjs
 */
'use strict';

const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { assertSingleGameInstance } = require('./lib/one-game-instance.cjs');

const URL_ = 'https://ci.bulletballet.dev/';
const args = process.argv.slice(2);
const TARGET = args.includes('--url') ? args[args.indexOf('--url') + 1] : URL_;
const CDP = args.includes('--cdp') ? args[args.indexOf('--cdp') + 1] : 'http://localhost:9223';

/** Boot the game and wait until the engine is drawing. */
async function bootGame(page) {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });
  const fleet = await waitForFleet(page);
  if (!fleet.ok) throw new Error('no server to join');
  await page.click('.ts-landing__play');
  await confirmIdentity(page, 'PerfProbe');

  console.log('  booting...');
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    const s = await page
      .evaluate(() => {
        const c = document.getElementById('canvas');
        const em = window.__xash && window.__xash.em;
        let heap = 0;
        try {
          heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
        } catch (e) {}
        return { has: !!window.__xash, canvas: c ? [c.width, c.height] : null, heap };
      })
      .catch(() => ({ has: false }));
    if (s.has && s.canvas && s.canvas[0] > 300 && s.heap > 0) return true;
    await page.waitForTimeout(2000);
  }
  throw new Error('the engine never came up');
}

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.connectOverCDP(CDP);
  const ctx = browser.contexts()[0];
  // Refuse to measure beside another live game instance: they share
  // the main thread and the contention makes the number meaningless.
  await assertSingleGameInstance(browser, 'verify-gl-error');

  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror] ' + String(e).slice(0, 160)));

  await bootGame(page);
  console.log('  engine is up.');
  await page.waitForTimeout(5000);

  // --- 1. instrument every getError call, and count them -------------
  const counted = await page.evaluate(async () => {
    const proto = WebGL2RenderingContext.prototype;
    const original = proto.getError;
    let calls = 0;
    let totalMs = 0;
    let maxMs = 0;
    proto.getError = function patchedGetError() {
      const t0 = performance.now();
      const r = original.call(this);
      const dt = performance.now() - t0;
      calls += 1;
      totalMs += dt;
      if (dt > maxMs) maxMs = dt;
      return r;
    };
    await new Promise((r) => setTimeout(r, 3000));
    proto.getError = original;
    return { calls, totalMs, maxMs };
  });

  const seconds = 3;
  const perCall = counted.calls > 0 ? counted.totalMs / counted.calls : 0;
  console.log('');
  console.log('--- getError over 3 s of live gameplay ---');
  console.log(`  calls               ${counted.calls}`);
  console.log(`  calls / second      ${(counted.calls / seconds).toFixed(1)}`);
  console.log(`  mean cost per call  ${perCall.toFixed(4)} ms`);
  console.log(`  slowest call        ${counted.maxMs.toFixed(3)} ms`);
  console.log(
    `  total in getError   ${counted.totalMs.toFixed(1)} ms of ${seconds * 1000} ms ` +
      `(${(counted.totalMs / (seconds * 1000) * 100).toFixed(1)}% of the main thread)`
  );

  // --- 2. the engine's frame cost, for comparison ----------------------
  const pacing = await page.evaluate(async () => {
    const fn = window.__xashForceFrameCap;
    if (typeof fn !== 'function') return null;
    try {
      return await fn(1);
    } catch (e) {
      return null;
    }
  });

  if (pacing && pacing.engineWorkMs) {
    const perFrame = counted.totalMs / seconds / (pacing.tickHz || 120);
    console.log('');
    console.log('--- engine frame cost ---');
    console.log(
      `  ${pacing.engineWorkMs.toFixed(2)} ms per frame at ${(pacing.tickHz || 0).toFixed(0)} Hz`
    );
    console.log('');
    console.log('--- what the getError round-trip costs ---');
    console.log(`  ${perFrame.toFixed(3)} ms per frame (${(perFrame / pacing.engineWorkMs * 100).toFixed(0)}% of the frame)`);
    console.log(
      `  without it the frame would be about ${(pacing.engineWorkMs - perFrame).toFixed(2)} ms`
    );
  }

  await page.close().catch(() => {});
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
