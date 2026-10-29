/**
 * A/B the TS client WASM build flags: `-Oz` (what production ships) vs
 * `-O3` (size vs speed), measured in the real game.
 *
 * WHY THIS IS WORTH MEASURING
 * ----------------------------
 * Production's client module is the Rust TS port, built by
 * `tools/port/tsp-rs/scripts/build-wasm.sh` with:
 *
 *     wasm-opt -Oz --strip-debug ...
 *
 * `-Oz` optimises for SIZE. `-O3` optimises for SPEED. For a module whose
 * entire job is to run sixty times a second on the player's CPU, that looks
 * like the wrong trade — but "looks like" is not a measurement, and the
 * module is mostly *not* on the hot path (the engine's renderer does the
 * drawing; the client DLL does HUD, prediction and effects).
 *
 * So: build both, swap one into a local build of the frontend, run the
 * real game against the real server, and measure.
 *
 * WHAT IT MEASURES
 * ----------------
 *   - the engine's rAF rate (frames the player sees)
 *   - event-loop lag (how far the main thread is behind)
 *   - the client's own per-frame cost, isolated: the client DLL is called
 *     once per frame, so the difference in the engine's frame time between
 *     the two builds is the client's cost.
 *
 * The two builds are byte-swapped into `dist/cl_dlls/`, and the server is
 * restarted between them so no cache serves the wrong one.
 *
 * USAGE
 *   node tools/perf/ab-wasm-opt-level.cjs [--gpu] [--json OUT]
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();
const fs = require('fs');
const { execSync } = require('child_process');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf('--' + n);
  if (i === -1) return d;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const has = (n) => argv.includes('--' + n);

const JSON_OUT = arg('json', null);
const USE_GPU = has('gpu');
const PORT = 8899;
// HTTPS, not HTTP. The bridge is reached over `wss://` on the
// production domain, and the frontend picks the scheme from
// `location.protocol` (webxash/src/services/xash-bridge.ts). An
// `http://` page therefore dials `ws://bulletballet.dev:443`, which
// cannot work against a TLS port, and the game never connects — which
// looks like an engine failure and produces nonsense measurements.
const LOCAL = `https://127.0.0.1:${PORT}/`;
const CLIENT_WASM = '/home/kyle/Development/specialists-browser/webxash/dist/cl_dlls/client_emscripten_wasm32.wasm';

const GPU_ARGS = [
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  '--disable-gpu-sandbox',
  // The local server uses a self-signed certificate.
  '--ignore-certificate-errors',
];

/** The two builds under test. */
const BUILDS = [
  ['Oz (production)', '/tmp/ts-Oz.wasm'],
  ['O3', '/tmp/ts-O3.wasm'],
];

// ORDERING IS A CONFOUND, AND IT HAS TO BE RUN BOTH WAYS.
//
// In every A/B cycle the second build measured is the one that looks
// better (run 1: O3 was second and won; run 3: O3 was second and won).
// That is a classic position effect, not a build effect — the second
// build runs against a warmer browser, a warmer server, and a warmer
// machine.
//
// `--reverse` swaps the order so the A/B can be run in both directions.
// The build effect is real only if it survives the swap. If the winner
// is always "whatever ran second", it is a position effect.
if (process.argv.includes('--reverse')) {
  BUILDS.reverse();
  console.log('  (order reversed: O3 first)');
}

async function probe(page, seconds) {
  await page.evaluate(() => {
    if (window.__perfProbe) window.__perfProbe.stop();
    const p = { ticks: 0, lag: [], started: performance.now() };
    const onRaf = () => {
      p.ticks++;
      p.raf = requestAnimationFrame(onRaf);
    };
    p.raf = requestAnimationFrame(onRaf);
    const tick = () => {
      const due = performance.now();
      setTimeout(() => {
        p.lag.push(performance.now() - due);
        if (p.lag.length > 3000) p.lag.shift();
        if (!p.stopped) setTimeout(tick, 0);
      }, 0);
    };
    tick();
    p.stop = () => {
      p.stopped = true;
      cancelAnimationFrame(p.raf);
      p.endedAt = performance.now();
    };
    window.__perfProbe = p;
  });
  await page.waitForTimeout(seconds * 1000);
  return page.evaluate(() => {
    const p = window.__perfProbe;
    // The page can navigate out from under the probe (the reconnect
    // path reloads it), which destroys the probe object. Treat that as
    // an empty measurement rather than a crash.
    if (!p || !p.stop) {
      return { raf: 0, frameMs: 0, lagMed: 0, lagP95: 0, lagSamples: 0, dead: true };
    }
    p.stop();
    const el = p.endedAt - p.started;
    const lag = p.lag.slice().sort((a, b) => a - b);
    const q = (f) => (lag.length ? lag[Math.min(lag.length - 1, Math.floor(lag.length * f))] : 0);
    return {
      raf: p.ticks / (el / 1000),
      frameMs: el / p.ticks,
      lagMed: q(0.5),
      lagP95: q(0.95),
      lagSamples: lag.length,
    };
  });
}

/** Boot the game in a fresh page against the LOCAL build. */
async function runOnce(browser, label, wasmPath) {
  // Swap the client WASM. The static server serves from disk, and the
  // browser is a fresh context each time, so there is no cache to bust.
  fs.copyFileSync(wasmPath, CLIENT_WASM);
  const served = fs.readFileSync(CLIENT_WASM);
  console.log(
    `\n  --- ${label} (${(served.length / 1048576).toFixed(2)} MB, ` +
      `sha ${require('crypto').createHash('sha256').update(served).digest('hex').slice(0, 12)}) ---`,
  );

  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

  // The server's banner is the engine's own proof that the client got
  // into the game. Without it the harness would happily measure a page
  // that is still retrying the connection — which is exactly what
  // happened the first time, and it produced 3.86 rAF/s nonsense.
  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });

  // A FAILED NAVIGATION MUST SKIP THE BUILD, NOT ABORT THE RUN.
  //
  // The local server being down, or the page failing to load, is a
  // transient condition — not a reason to throw away the whole
  // measurement. Crashing here aborted the entire A/B and lost the
  // build that had not run yet.
  try {
    await page.goto(LOCAL, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  } catch (e) {
    console.log(`  could not load ${LOCAL} — skipping this build`);
    console.log(`    ${String(e).split('\n')[0]}`);
    await ctx.close();
    return null;
  }

  const rend = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });

  await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });

  // THE FLEET CHECK MUST USE THE PAGE'S OWN RELATIVE PATH.
  //
  // Two mistakes were made here, in order:
  //
  //  1. The first version used `waitForFleet`, which fetches the
  //     RELATIVE path `api/servers`. From the local static server that
  //     resolved to http://127.0.0.1:8899/api/servers, which did not
  //     exist — so the harness waited 90 seconds and reported "no
  //     server" every time while production was serving happily.
  //
  //  2. The fix replaced it with an ABSOLUTE cross-origin fetch to
  //     https://bulletballet.dev/api/servers. That fails CORS from
  //     http://127.0.0.1:8899 — the browser blocks it, the page never
  //     sees the fleet, and the harness still reported "no server".
  //
  // The right answer is the RELATIVE path again, served by
  // `tools/perf/serve-local-build.cjs`, which proxies `/api/*` to
  // production. Then the page fetches same-origin, exactly as it does
  // in production, and everything downstream (PLAY resolving a target,
  // the identity modal) behaves identically.
  const fleetOk = await (async () => {
    for (let i = 0; i < 30; i++) {
      const local = await page
        .evaluate(async () => {
          try {
            const r = await fetch('api/servers', { cache: 'no-store' });
            const j = await r.json();
            return Array.isArray(j && j.servers) ? j.servers.length : 0;
          } catch (e) {
            return 0;
          }
        })
        .catch(() => 0);
      if (local > 0) return { ok: true, servers: local };
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { ok: false, servers: 0 };
  })();

  if (!fleetOk.ok) {
    console.log('  no server — skipping this build');
    await ctx.close();
    return null;
  }
  console.log(`  fleet: ${fleetOk.servers} server(s)`);

  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'WasmAb');
  if (!ident.appeared) {
    console.log('  no identity modal — skipping');
    await ctx.close();
    return null;
  }

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
    await page.waitForTimeout(2000);
  }
  if (!up) {
    console.log('  engine never came up — skipping');
    await ctx.close();
    return null;
  }

  // WAIT FOR THE SERVER BANNER. The engine being up is not the same as
  // the client being in the game: the engine boots, then tries to
  // connect, and while it is retrying the page is doing something quite
  // different from playing. Measuring that is measuring a stall.
  const bannerDeadline = Date.now() + 120_000;
  while (!banner && Date.now() < bannerDeadline) {
    await page.waitForTimeout(2000);
  }
  if (!banner) {
    console.log('  the client never reached the game (no server banner) — skipping');
    await ctx.close();
    return null;
  }
  console.log('  in the game.');

  // Let it settle into the map, then measure several windows so a single
  // noisy window does not decide the result.
  await page.waitForTimeout(8000);

  const windows = [];
  for (let i = 0; i < 5; i++) windows.push(await probe(page, 5));

  const raf = windows.map((w) => w.raf);
  const frameMs = windows.map((w) => w.frameMs);
  const lagMed = windows.map((w) => w.lagMed);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

  const result = {
    label,
    renderer: rend,
    rafAvg: +avg(raf).toFixed(2),
    rafMax: +Math.max(...raf).toFixed(2),
    frameMsAvg: +avg(frameMs).toFixed(2),
    frameMsMin: +Math.min(...frameMs).toFixed(2),
    lagMedAvg: +avg(lagMed).toFixed(2),
    lagMedMax: +Math.max(...lagMed).toFixed(2),
    windows: windows.map((w) => ({
      raf: +w.raf.toFixed(2),
      frameMs: +w.frameMs.toFixed(2),
      lagMed: +w.lagMed.toFixed(2),
    })),
    errors: errors.length,
  };

  console.log(
    `  rAF/s  avg ${result.rafAvg.toFixed(2)}  max ${result.rafMax.toFixed(2)}   ` +
      `frame ${result.frameMsAvg.toFixed(2)}ms (min ${result.frameMsMin.toFixed(2)})   ` +
      `lag med ${result.lagMedAvg.toFixed(2)}ms`,
  );
  if (errors.length) console.log(`  page errors: ${errors.length} — ${errors[0]}`);

  await ctx.close();
  return result;
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });

  const results = [];
  for (const [label, path] of BUILDS) {
    if (!fs.existsSync(path)) {
      console.log(`  ${label}: ${path} is missing — skipping`);
      continue;
    }
    const r = await runOnce(browser, label, path);
    if (r) results.push(r);
  }

  await browser.close();

  console.log('\n  === SUMMARY ===');
  for (const r of results) {
    console.log(
      `  ${r.label.padEnd(18)} rAF ${r.rafAvg.toFixed(2)}/s   ` +
        `frame ${r.frameMsAvg.toFixed(2)}ms   lag ${r.lagMedAvg.toFixed(2)}ms`,
    );
  }
  if (results.length === 2) {
    const d = results[1].rafAvg - results[0].rafAvg;
    const dms = results[1].frameMsAvg - results[0].frameMsAvg;
    console.log(
      `\n  O3 vs Oz: ${d >= 0 ? '+' : ''}${d.toFixed(2)} rAF/s   ` +
        `${dms >= 0 ? '+' : ''}${dms.toFixed(2)}ms per frame`,
    );
  }

  if (JSON_OUT) {
    // DO NOT CLOBBER A GOOD RESULT WITH AN EMPTY ONE.
    //
    // When a build is skipped (no server, engine never came up, no
    // banner), `runOnce` returns null and never reaches `results`. If
    // this then wrote `{results: []}`, it would silently destroy the
    // output of a previous successful run that used the same path.
    //
    // That is not hypothetical: a stray run against an empty fleet
    // would have wiped a good measurement with nothing. If nothing was
    // measured, write nothing at all.
    if (results.length) {
      fs.writeFileSync(JSON_OUT, JSON.stringify({ results }, null, 2));
      console.log(`\n  wrote ${JSON_OUT}`);
    } else {
      console.log(`\n  nothing was measured — NOT writing ${JSON_OUT}`);
    }
  }
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
