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
const fs = require('fs');
const path = require('path');
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { assertSingleGameInstance } = require('./lib/one-game-instance.cjs');
const { isGameUrl } = require('./lib/one-game-instance.cjs');
const { ensureAtLeastOnePage } = require('./lib/cdp-targets.cjs');
const { describeMaps } = require('./lib/fleet-map.cjs');
const { chromium } = loadPlaywright();

const URL_ =
  process.argv[process.argv.indexOf('--url') + 1] &&
  !process.argv[process.argv.indexOf('--url') + 1].startsWith('--')
    ? process.argv[process.argv.indexOf('--url') + 1]
    : 'https://ci.bulletballet.dev/';
const SECONDS = Number(process.argv[process.argv.indexOf('--seconds') + 1] || 8);

// WHICH BROWSER, AND WHETHER TO JOIN OR TO ATTACH.
//
// `--cdp` says which browser to measure. `--attach` says: do not join
// anything, profile the game tab that is ALREADY THERE.
//
// The rig runs with NO BOTS -- a perf gate wants the quietest server it
// can measure, and the bots are the loudest thing on it -- so a fight
// only exists where there are players: PRODUCTION, with people in it.
// And production has no dev commands, so there is nothing to force a
// join with. The player joins, and the profiler watches them fight.
const argOf = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};
const CDP = argOf('--cdp', 'http://localhost:9223');
const ATTACH = process.argv.includes('--attach');

(async () => {
  // Playwright cannot connect to a browser that has NO pages open, and it
  // says so in a way that never mentions pages. One blank tab fixes it.
  await ensureAtLeastOnePage(CDP);

  // THE HANDSHAKE CAN BE SLOW THROUGH A TUNNEL. The CDP connect has a
  // 30 second default, and over an SSH tunnel to a laptop that has
  // just woken up, the websocket connects and then the handshake
  // dribbles in -- which reads as a connect failure when it is just
  // slow.
  const browser = await chromium.connectOverCDP(CDP, { timeout: 120_000 });
  const ctx = browser.contexts()[0];
  // Refuse to measure beside another live game instance: they share
  // the main thread and the contention makes the number meaningless.
  //
  // BUT NOT WHEN ATTACHING. The guard exists to stop the harness from
  // STARTING a second instance beside the one it measures -- in attach
  // mode there is no second instance, there is exactly the one we were
  // asked to measure, and refusing to look at it is refusing to do the
  // job. (The browser also keeps the tabs it had before we ever
  // connected, and the guard counted those as contention.)
  if (!ATTACH) {
    await assertSingleGameInstance(browser, 'profile-client');
  }

  // THE PAGE. In attach mode it is the game tab that is already
  // running -- the player's own fight -- and nothing else.
  const page = ATTACH
    ? ctx.pages().find((p) => isGameUrl(p.url())) || null
    : await ctx.newPage();
  if (!page) {
    console.error(
      '  no bulletballet.dev tab to attach to -- open the game and get into a fight first',
    );
    process.exit(1);
  }
  if (ATTACH) {
    console.log(`  attached to the live tab: ${page.url()}`);
    // WAIT FOR THE FIGHT TO START. An attached tab is usually sitting
    // at the landing page or in a finished round, and a CPU profile of
    // a page with no engine running measures nothing at all -- which is
    // how the last one came out 73% idle.
    console.log('  waiting for the engine to come up (up to 10 minutes)...');
    let live = false;
    const until = Date.now() + 600_000;
    while (Date.now() < until) {
      const s = await page
        .evaluate(() => {
          const c = document.getElementById('canvas');
          const em = window.__xash && window.__xash.em;
          let heap = 0;
          try {
            heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
          } catch (e) {}
          const p = window.__xashPacing ? window.__xashPacing() : null;
          return {
            has: !!window.__xash,
            canvas: c ? [c.width, c.height] : null,
            heap,
            fps: p && p.engineFps ? p.engineFps : 0,
            map: p ? p.map : '',
          };
        })
        .catch(() => ({ has: false }));
      if (s.has && s.canvas && s.canvas[0] > 300 && s.heap > 0 && s.fps > 0) {
        live = true;
        console.log(`  the engine is running: ${s.fps.toFixed(1)} fps in ${s.map}`);
        break;
      }
      await page.waitForTimeout(1000);
    }
    if (!live) {
      console.error('  the engine never started -- get into a fight and try again');
      process.exit(1);
    }
    await page.waitForTimeout(2000);
  } else {

  // THE IDENTITY MUST BE FORGETTABLE, OR THE PROFILE IS AN OBSERVER'S.
  //
  // The client REMEMBERS who it is -- `localStorage['bulletballet.identity']`
  // -- and joins under that name without ever showing the identity
  // modal. So `confirmIdentity(page, 'PerfProbe')` waits 30 seconds for
  // a modal that never appears, returns "not confirmed", and the
  // client joins as whoever it was last time. The force-join for
  // "PerfProbe" then matches nothing, the client sits in the game as
  // an OBSERVER -- no viewmodel, no fight -- and every number in the
  // profile is the wrong shape. The tell: the observer profile was
  // 69.9% idle; a real fight is 26.2% idle.
  //
  // So the identity is cleared BEFORE the page's scripts run. The modal
  // then appears, the name goes in, and the profile is taken in a real
  // fight.
  await ctx.addInitScript(() => {
    try {
      localStorage.removeItem('bulletballet.identity');
    } catch (e) {
      /* the origin is not ours yet; the next navigation will do it */
    }
  });

  // THE WASM MUST BE THE ONE ON DISK.
  //
  // A profile of the wrong build is a profile of nothing. Chrome keeps
  // a compiled WASM module alive by its URL, so a rebuilt client WASM
  // at the same URL is not picked up -- and the symptom is a profile
  // full of "wasm-function[365]" when the build on disk has names in
  // it. The cache is cleared, and the URL carries a stamp, so the
  // module is compiled from the bytes that are on disk right now.
  try {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  } catch (e) {
    console.log(`  (the cache could not be cleared: ${e.message})`);
  }
  const stamped = URL_ + (URL_.includes('?') ? '&' : '?') + 'build=' + Date.now().toString(36);

  await page.goto(stamped, { waitUntil: 'domcontentloaded', timeout: 90_000 });
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

  // A PROFILE OF A FIGHT.
  //
  // The observer's camera follows a living player, but the profile that
  // matters is of a CLIENT that is IN the fight: an observer that is
  // not spawned has no viewmodel, no weapon, and often nothing in front
  // of it, and a profile of an empty view is how the last one came out
  // with "no hot function" and "69% idle".
  if (process.argv.includes('--alive')) {
    const { serverCommand } = require('./lib/server-console.cjs');
    let index = null;
    for (let attempt = 0; attempt < 40 && index === null; attempt++) {
      await page.waitForTimeout(1500);
      const res = await serverCommand('ts_status', { expect: /\[ts\]\s+#\d+/, timeoutMs: 8000 });
      if (!res.ok) continue;
      for (const line of res.output.split('\n')) {
        const m = line.match(/\[ts\]\s+#(\d+)\s+(\S+)/);
        if (m && m[2] === 'PerfProbe') {
          index = Number(m[1]);
          break;
        }
      }
    }
    if (index !== null) {
      const joined = await serverCommand(`ts_dev_forcejoin ${index}`, { timeoutMs: 12_000 });
      console.log(`  the client was forced into the game: ${joined.ok ? 'yes' : joined.reason}`);
    } else {
      console.log('  the client never showed up on the server');
    }
    await page.waitForTimeout(8000);
  }
  }

  // --- the profile -------------------------------------------------------
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); // 200 us
  await cdp.send('Profiler.start');
  await page.waitForTimeout(SECONDS * 1000);
  const { profile } = await cdp.send('Profiler.stop');

  // KEEP THE RAW PROFILE. The printout is a summary; the summary is
  // what people read; the raw file is what gets re-analyzed when the
  // summary turns out to have cut the interesting part off.
  const profileDir = path.join(__dirname, '..', '..', 'profiles');
  fs.mkdirSync(profileDir, { recursive: true });
  const profilePath = path.join(
    profileDir,
    `${argOf('--name', 'profile')}-${new Date().toISOString().replace(/[:.]/g, '-')}.cpuprofile`,
  );
  fs.writeFileSync(profilePath, JSON.stringify(profile));
  console.log(`  the raw profile: ${profilePath}`);

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
  // EVERY BUCKET, not the top twelve. The GL call path is spread over a
  // dozen entries -- bufferData six times over, bindBuffer twice,
  // bindVertexArray, enableVertexAttribArray, getParameter -- and a
  // top-twelve cut hid most of the thing that matters.
  const TOP = Number(argOf('--top', 0)) || rows.length;
  const shown = rows.slice(0, TOP);
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
