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
 *   node tools/perf/measure-geterror-ab.cjs [--samples 4] [--map <map>]
 */
'use strict';

const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { num } = require('./lib/format.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { assertSingleGameInstance } = require('./lib/one-game-instance.cjs');
const { ensureAtLeastOnePage } = require('./lib/cdp-targets.cjs');
const { describeMaps, checkMap } = require('./lib/fleet-map.cjs');
const { findServerPlayer, pinFixturePosition } = require('./lib/fixture-view.cjs');
const { pinView, waitForArrival } = require('./lib/viewpoint.cjs');

const URL_ = 'https://ci.bulletballet.dev/';
const args = process.argv.slice(2);
const SAMPLES = Number(args[args.indexOf('--samples') + 1]) || 4;
const EXPECTED_MAP = args.includes('--map') ? args[args.indexOf('--map') + 1] : null;

// A UNIQUE NAME PER RUN.
//
// The server appends " (1)" to a duplicate name, and a killed harness
// run leaves its connection behind — so a lookup by "PerfProbe" can
// pick a STALE connection instead of the live client, and the fixture
// would teleport the wrong one.
const PLAYER_NAME = `PerfProbe${Math.random().toString(36).slice(2, 6)}`;

async function bootGame(page) {
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });
  const fleet = await waitForFleet(page);
  if (!fleet.ok) throw new Error('no server to join');
  await page.click('.ts-landing__play');
  await confirmIdentity(page, PLAYER_NAME);
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
  // A PHASE THAT PRODUCED NO SAMPLES MUST NOT TAKE THE RUN DOWN.
  //
  // `median([])` is undefined, and `undefined.toFixed(2)` is a
  // TypeError — which would land AFTER the phase, taking the whole
  // A-B-A with it and leaving nothing to read. A failure path has to
  // REPORT, not crash.
  console.log(
    `  ${label.padEnd(22)} frame ${num(m).toFixed(2).padStart(6)} ms   ` +
      `getError ${(num(median(calls)) / 2).toFixed(0).padStart(6)} calls/s   ` +
      `late ${median(late)}`
  );
  console.log(`    samples: ${costs.map((v) => v.toFixed(2)).join(', ')} ms`);
  return m;
}

(async () => {
  const { chromium } = loadPlaywright();
  // Playwright cannot connect to a browser that has NO pages open, and it
  // says so in a way that never mentions pages. One blank tab fixes it.
  await ensureAtLeastOnePage('http://localhost:9223');

  const browser = await chromium.connectOverCDP('http://localhost:9223');
  const ctx = browser.contexts()[0];
  // Refuse to measure beside another live game instance: they share
  // the main thread and the contention makes the number meaningless.
  await assertSingleGameInstance(browser, 'measure-geterror-ab');

  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror] ' + String(e).slice(0, 160)));

  await bootGame(page);
  console.log('  engine is up; letting it settle...');

  // THE MAP MUST BE THE MAP THE RUN ASKED FOR.
  //
  // The server rotates its map on its own schedule, so a run can
  // silently land on a different one — and a perf number whose map is
  // unknown is a number of unknown provenance. This is a HARD failure,
  // not a warning: a perf run on the wrong level is worse than no
  // perf run, because it looks like data.
  if (EXPECTED_MAP) {
    const m = await checkMap(page, EXPECTED_MAP);
    if (!m.ok) {
      console.error(
        `  [map mismatch] this run asked for ${EXPECTED_MAP}, and the fleet is on ` +
          `${m.maps}. Start the server on the right map first: ` +
          `CI_MAP=${EXPECTED_MAP} bash ci-stack.sh up`
      );
      await page.close().catch(() => {});
      process.exit(1);
    }
    console.log(`  map: ${EXPECTED_MAP} (verified)`);
  }
  // THE FIXTURE: THE MAP, THE PLACE AND THE ANGLE.
  //
  // A perf number whose viewpoint is unknown is a number of unknown
  // provenance, and the same map measured 1.87 ms and 9.12 ms in two
  // runs because the server picks the spawn point at RANDOM. The
  // A-B-A controls for that with its own structure, but pinning it
  // makes the number comparable with every other measurement taken on
  // the same fixture.
  if (EXPECTED_MAP) {
    const found = await findServerPlayer(PLAYER_NAME);
    if (found.ok) {
      const at = await pinFixturePosition(found.player.index, EXPECTED_MAP);
      if (at.ok) {
        const arrived = await waitForArrival(page, at.origin, {
          tolerance: 8,
          timeoutMs: 20000,
        });
        console.log(
          `  fixture: PINNED at ${at.origin.join(', ')}   client ` +
            `${arrived.arrived ? 'ARRIVED' : 'DID NOT ARRIVE'}`
        );
      } else {
        console.log(`  fixture: NOT PINNED (${at.reason})`);
      }
    } else {
      console.log(`  fixture: NOT PINNED (${found.reason})`);
    }
  }
  await pinView(page, 0, 0);
  await page.waitForTimeout(10_000);

  await countGetError(page);
  console.log('\n  --- A-B-A: getError patched in place ---');
  const a = await phase(page, 'A  as shipped');
  await disableGetError(page);
  await page.waitForTimeout(2000);
  const b = await phase(page, 'B  getError removed');
  await restoreGetError(page);
  // RE-ARM THE COUNTER.
  //
  // `__xashCountingGetError` holds the ORIGINAL getError (the name is
  // misleading), so the restore puts the real getError back — not the
  // counting wrapper. The cost returns to the baseline, which is the
  // point, but the call counter is then dead: it read 0 calls/s in a
  // restored phase that was really calling getError 1230 times a
  // second. Wrapping the restored original makes the readout mean
  // something again.
  await countGetError(page);
  await page.waitForTimeout(2000);
  const c = await phase(page, 'A  restored');

  console.log('\n  --- RESULT ---');
  const safe = (v) => (Number.isFinite(v) ? v : 0);
  console.log(`  baseline ${num(a).toFixed(2)} ms -> patched ${num(b).toFixed(2)} ms -> restored ${num(c).toFixed(2)} ms`);
  console.log(`  saving from the patch: ${(num(a) - num(b)).toFixed(2)} ms per frame`);
  console.log(
    `  restored-vs-baseline drift: ${(num(c) - num(a) >= 0 ? '+' : '') + (num(c) - num(a)).toFixed(2)} ms ` +
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
