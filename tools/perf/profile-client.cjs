/**
 * Diagnostic: a CPU profile of the running game.
 *
 * WHY THIS EXISTS
 * ---------------
 * The engine's per-frame cost on Kyle's MacBook (M3 Pro) is 13-16 ms
 * in a map. The GPU is idle (gl.finish: 0.00 ms) and the cost is flat
 * across an 8.4x range of render resolutions, so it is CPU work, and
 * it is NOT fill rate.
 *
 * There are two pieces of WASM in the client and only one of them is
 * editable in this repository:
 *
 *     libref_webgl2.wasm                    the GoldSrc renderer
 *                                          (from the xash3d-fwgs npm
 *                                          package — NOT in this repo)
 *     cl_dlls/client_emscripten_wasm32.wasm the Rust TS client port
 *                                          (tools/port/tsp-rs — IS in
 *                                          this repo)
 *
 * So the profile is not academic: it decides whether the 13 ms is
 * something this project can change, or something that has to be
 * answered with the frame pacer and an honest readout.
 *
 * WHAT IT DOES
 * ------------
 * Drives the Chrome DevTools Protocol's CPU profiler over a real
 * session, then aggregates SELF time by the top-level frame, so the
 * answer is "the renderer costs X ms a frame and the Rust client
 * costs Y" rather than a list of 4000 functions.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { assertSingleGameInstance } = require('./lib/one-game-instance.cjs');
const { ensureAtLeastOnePage } = require('./lib/cdp-targets.cjs');
const { chromium } = loadPlaywright();

const URL_ = 'https://ci.bulletballet.dev/';
const SECONDS = Number(process.argv[process.argv.indexOf('--seconds') + 1] || 8);

(async () => {
  // Playwright cannot connect to a browser that has NO pages open, and it
  // says so in a way that never mentions pages. One blank tab fixes it.
  await ensureAtLeastOnePage('http://localhost:9223');

  const browser = await chromium.connectOverCDP('http://localhost:9223');
  const ctx = browser.contexts()[0];
  // Refuse to measure beside another live game instance: they share
  // the main thread and the contention makes the number meaningless.
  await assertSingleGameInstance(browser, 'profile-client');

  const page = await ctx.newPage();

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });
  const fleet = await waitForFleet(page);
  if (!fleet.ok) {
    console.error('  no server');
    process.exit(1);
  }
  await page.click('.ts-landing__play');
  await confirmIdentity(page, 'PerfProbe');

  console.log('  booting...');
  let up = false;
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
    if (s.has && s.canvas && s.canvas[0] > 300 && s.heap > 0) {
      up = true;
      break;
    }
    await page.waitForTimeout(1000);
  }
  if (!up) {
    console.error('  the engine never came up');
    process.exit(1);
  }
  console.log('  engine is up; letting it settle into the map...');
  await page.waitForTimeout(20_000);

  // --- the profile -------------------------------------------------------
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); // 200 us
  await cdp.send('Profiler.start');
  await page.waitForTimeout(SECONDS * 1000);
  const { profile } = await cdp.send('Profiler.stop');

  // --- aggregate ---------------------------------------------------------
  const byId = new Map();
  for (const n of profile.nodes) byId.set(n.id, n);

  // Self time per node: the profile's samples and timeDeltas.
  const self = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    const id = profile.samples[i];
    const dt = profile.timeDeltas[i] || 0;
    self.set(id, (self.get(id) || 0) + dt);
  }

  // The CDP profile format carries `children`, NOT `parent`, so the
  // parent map has to be built from the child lists. The first version
  // read `node.parent`, which is always undefined — which is why the
  // call chains printed empty.
  const parentOf = new Map();
  for (const n of profile.nodes) {
    for (const c of n.children || []) parentOf.set(c, n.id);
  }

  /** The parent chain of a node, innermost first. */
  function chainOf(node) {
    const parts = [];
    let cur = node;
    let guard = 0;
    while (cur && guard++ < 14) {
      const f = cur.callFrame;
      const name = f.functionName || '(anon)';
      const url = (f.url || '').split('/').slice(-1)[0];
      parts.push(url ? `${url}:${name}` : name);
      const pid = parentOf.get(cur.id);
      cur = pid !== undefined ? byId.get(pid) : null;
    }
    return parts;
  }

  /** Collapse a node into a readable bucket. */
  function bucket(node) {
    const f = node.callFrame;
    const name = f.functionName || '(anonymous)';
    const url = (f.url || '').split('/').slice(-1)[0];
    if (f.lineNumber >= 0 && url) return `${url}:${name}`;
    if (url) return url;
    return name;
  }

  const rows = [];
  for (const [id, us] of self) {
    const node = byId.get(id);
    if (!node) continue;
    rows.push({
      bucket: bucket(node),
      ms: us / 1000,
      name: node.callFrame.functionName || '',
      chain: chainOf(node),
    });
  }
  rows.sort((a, b) => b.ms - a.ms);

  const total = rows.reduce((s, r) => s + r.ms, 0);
  console.log(`\n  --- CPU profile over ${SECONDS} s ---\n`);
  console.log(`  total sampled: ${total.toFixed(0)} ms  (${(total / SECONDS).toFixed(1)} ms per second of wall clock)\n`);
  console.log('   self ms   %      bucket');
  console.log('  ' + '-'.repeat(78));
  const shown = rows.slice(0, 12);
  for (const r of shown) {
    const pct = total > 0 ? (r.ms / total) * 100 : 0;
    console.log(
      `  ${r.ms.toFixed(1).padStart(8)}  ${pct.toFixed(1).padStart(5)}%  ${r.bucket.slice(0, 52)}`
    );
    if (pct > 3) {
      console.log(`             called from:`);
      r.chain.slice(1, 9).forEach((c, i) => console.log(`               ${'  '.repeat(i)}${c}`));
    }
  }

  // Group the WASM by module, which is the question.
  console.log('\n  --- by module ---');
  const byModule = new Map();
  for (const [id, us] of self) {
    const node = byId.get(id);
    if (!node) continue;
    const url = node.callFrame.url || '';
    let key = 'other';
    if (url.includes('.wasm')) key = url.split('/').slice(-1)[0];
    else if (url.includes('bulletballet') || url.includes('ci.')) key = 'app (JS)';
    else if (!url) key = 'JS (no url)';
    else key = url.split('/').slice(-1)[0] || 'other';
    byModule.set(key, (byModule.get(key) || 0) + us / 1000);
  }
  const mods = [...byModule.entries()].sort((a, b) => b[1] - a[1]);
  for (const [k, ms] of mods.slice(0, 14)) {
    const pct = total > 0 ? (ms / total) * 100 : 0;
    console.log(`  ${ms.toFixed(1).padStart(9)} ms  ${pct.toFixed(1).padStart(5)}%  ${k}`);
  }

  await page.close().catch(() => {});
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
