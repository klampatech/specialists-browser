#!/usr/bin/env node
/**
 * The getError A/B, done properly.
 *
 * WHY A-B-A
 * ---------
 * Two earlier runs of the same measurement on the same machine
 * disagreed by 3.3x (2.90 ms vs 9.62 ms per frame), so a single
 * before/after pair cannot be trusted on its own. This runs
 * baseline -> patched -> RESTORED, so a number that drifts upward
 * over the run (a warming machine, a map that got busier, the
 * browser deciding to do something) shows up as a drift rather than
 * as an effect.
 *
 * WHAT IS MEASURED, AND HOW
 * -------------------------
 * The engine's frame cost is read through the only live entry point
 * there is, `__xashForceFrameCap(1)`, which clears the pacer's
 * samples and opens a fresh 2 s window. Every phase uses that same
 * method, so the phases are comparable with each other.
 *
 * The getError call count is measured by a COUNT-ONLY wrapper on the
 * prototype. Counting adds a counter increment and a function call
 * per getError, which is far cheaper than the two `performance.now()`
 * calls an earlier version used — and those two calls are the likely
 * reason that version reported 0.478 ms per call, which was higher
 * than the whole-frame saving it implied.
 *
 * USAGE
 *   node tools/perf/_diag-geterror-ab.cjs [--samples 4]
 */
'use strict';

const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');

const URL_ = 'https://ci.bulletballet.dev/';
const args = process.argv.slice(2);
const SAMPLES = Number(args[args.indexOf('--samples') + 1]) || 4;

async function bootGame(page) {
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90_000 });
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
    if (s.has && s.canvas && s.canvas[0] > 300 && s.heap > 0) return;
    await page.waitForTimeout(2000);
  }
  throw new Error('the engine never came up');
}

/** Count getError calls without changing what it does. */
async function countGetError(page) {
  return page.evaluate(() => {
    const proto = WebGL2RenderingContext.prototype;
    if (!proto.__xashCountingGetError) {
      proto.__xashCountingGetError = proto.getError;
      proto.getError = function countingGetError() {
        window.__xashGetErrorCalls = (window.__xashGetErrorCalls || 0) + 1;
        return proto.__xashCountingGetError.call(this);
      };
    }
    window.__xashGetErrorCalls = 0;
    return true;
  });
}

/** Make getError a no-op — the patch, emulated in place. */
async function disableGetError(page) {
  return page.evaluate(() => {
    const proto = WebGL2RenderingContext.prototype;
    if (!proto.__xashRealGetError) {
      proto.__xashRealGetError =
        proto.__xashCountingGetError || proto.getError;
      proto.getError = function noopGetError() {
        return 0;
      };
    }
    return true;
  });
}

/** Put the real getError back. */
async function restoreGetError(page) {
  return page.evaluate(() => {
    const proto = WebGL2RenderingContext.prototype;
    if (proto.__xashRealGetError) {
      proto.getError = proto.__xashRealGetError;
      delete proto.__xashRealGetError;
    }
    if (proto.__xashCountingGetError) {
      proto.getError = proto.__xashCountingGetError;
      delete proto.__xashCountingGetError;
    }
    window.__xashGetErrorCalls = 0;
    return true;
  });
}

/** One live sample of the engine's frame cost. */
async function sample(page) {
  return page.evaluate(async () => {
    const fn = window.__xashForceFrameCap;
    if (typeof fn !== 'function') return null;
    try {
      return await fn(1);
    } catch (e) {
      return null;
    }
  });
}

function median(a) {
  if (!a.length) return 0;
  const s = a.slice().sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}

/** Run one phase and collect its samples. */
async function phase(page, label) {
  const costs = [];
  const calls = [];
  const late = [];
  for (let i = 0; i < SAMPLES; i++) {
    const before = await page.evaluate(() => window.__xashGetErrorCalls || 0);
    const s = await sample(page);
    const after = await page.evaluate(() => window.__xashGetErrorCalls || 0);
    if (s) {
      if (s.engineWorkMs) costs.push(s.engineWorkMs);
      if (typeof s.lateTicks === 'number') late.push(s.lateTicks);
    }
    calls.push(after - before);
    await page.waitForTimeout(900);
  }
  const m = median(costs);
  console.log(
    `  ${label.padEnd(22)} frame ${m.toFixed(2).padStart(6)} ms   ` +
      `getError ${(median(calls) / 2).toFixed(0).padStart(6)} calls/s   ` +
      `late ${median(late)}`
  );
  console.log(`    samples: ${costs.map((v) => v.toFixed(2)).join(', ')} ms`);
  return m;
}

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.connectOverCDP('http://localhost:9223');
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror] ' + String(e).slice(0, 160)));

  await bootGame(page);
  console.log('  engine is up; letting it settle...');
  await page.waitForTimeout(10_000);

  await countGetError(page);
  console.log('\n  --- A-B-A: getError patched in place ---');
  const a = await phase(page, 'A  as shipped');
  await disableGetError(page);
  await page.waitForTimeout(2000);
  const b = await phase(page, 'B  getError removed');
  await restoreGetError(page);
  await page.waitForTimeout(2000);
  const c = await phase(page, 'A  restored');

  console.log('\n  --- RESULT ---');
  console.log(`  baseline ${a.toFixed(2)} ms -> patched ${b.toFixed(2)} ms -> restored ${c.toFixed(2)} ms`);
  console.log(`  saving from the patch: ${(a - b).toFixed(2)} ms per frame`);
  console.log(
    `  restored-vs-baseline drift: ${(c - a >= 0 ? '+' : '') + (c - a).toFixed(2)} ms ` +
      `(a drift close to zero means the effect is the patch, not the passage of time)`
  );
  for (const hz of [60, 120, 144, 165, 240]) {
    const budget = 1000 / hz;
    console.log(
      `  at ${String(hz).padStart(3)} Hz (${budget.toFixed(2)} ms budget): ` +
        `before ${a > budget ? 'DOES NOT FIT' : 'fits'}, ` +
        `after ${b > budget ? 'DOES NOT FIT' : 'fits'}`
    );
  }

  await restoreGetError(page);
  await page.close().catch(() => {});
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
