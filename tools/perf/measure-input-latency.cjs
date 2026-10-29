/**
 * Measure INPUT LATENCY in the real game: how long from a mouse movement
 * to the engine's own view angle changing.
 *
 * WHY THIS NEEDS POINTER LOCK
 * ---------------------------
 * The first attempt dispatched a synthetic `mousemove` with
 * `movementX: 40` at the canvas and got **0/10 responses**. The engine
 * never saw it.
 *
 * The reason is that the engine only turns mouse motion into view angle
 * while the pointer is LOCKED. The `mousemove` was delivered, and it did
 * carry a `movementX` of 40 (verified in isolation), but the engine
 * discards motion when the pointer is not locked, because an unlocked
 * mouse's absolute position is not a look delta.
 *
 * So this harness:
 *   1. requests pointer lock on the canvas (the real thing, via the
 *      same call the app uses),
 *   2. drives REAL mouse movement through CDP `Input.dispatchMouseEvent`,
 *      which produces trusted events with genuine `movementX` deltas,
 *   3. watches the engine's own `v_angle` cvar for the change, read
 *      back over the console bridge.
 *
 * `v_angle` is the ground truth: it is the engine reporting its own
 * view angle, not the page's idea of it.
 *
 * USAGE
 *   node tools/perf/measure-input-latency.cjs [--url URL] [--json OUT]
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { chromium } = loadPlaywright();
const fs = require('fs');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf('--' + n);
  if (i === -1) return d;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const URL_ = arg('url', 'https://bulletballet.dev/');
const JSON_OUT = arg('json', null);

const GPU_ARGS = [
  '--use-angle=vulkan',
  '--enable-features=vulkan',
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  '--disable-gpu-sandbox',
  '--ignore-certificate-errors',
];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', ...GPU_ARGS] });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });

  // Wait for the fleet the way a player does.
  for (let i = 0; i < 60; i++) {
    const n = await page
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
    if (n > 0) break;
    await page.waitForTimeout(1000);
  }

  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'Latency');
  if (!ident.appeared) {
    console.log('  no identity modal — cannot launch');
    await browser.close();
    process.exit(1);
  }

  console.log('  booting...');
  const deadline = Date.now() + 420_000;
  let up = false;
  while (Date.now() < deadline) {
    const s = await page
      .evaluate(() => {
        const em = window.__xash && window.__xash.em;
        let heap = 0;
        try {
          heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
        } catch (e) {}
        return { has: !!window.__xash, heap };
      })
      .catch(() => ({ has: false }));
    if (s.has && s.heap > 0) {
      up = true;
      break;
    }
    await page.waitForTimeout(2000);
  }
  if (!up) {
    console.log('  engine never came up');
    await browser.close();
    process.exit(1);
  }
  console.log('  engine is up.');

  // Wait for the server banner — the client is in the game.
  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });
  const bDeadline = Date.now() + 120_000;
  while (!banner && Date.now() < bDeadline) await page.waitForTimeout(2000);
  if (!banner) {
    console.log('  the client never reached the game');
    await browser.close();
    process.exit(1);
  }
  console.log('  in the game.');
  await page.waitForTimeout(6000);

  // --- pointer lock --------------------------------------------------
  // The engine only turns mouse motion into view angle while the
  // pointer is locked, so the lock is part of the measurement, not an
  // optional extra.
  const locked = await page.evaluate(async () => {
    const canvas = document.getElementById('canvas');
    if (!canvas) return { ok: false, why: 'no canvas' };
    // IMPORTANT: the PLAIN call has to be tried FIRST.
    // `requestPointerLock({ unadjustedMovement: true })` rejects in
    // headless Chromium, and the rejection is silent unless awaited —
    // so asking for unadjusted movement first means never getting the
    // lock at all. Verified in isolation: the plain call succeeds
    // (`pointerLockElement === canvas`), the unadjusted one does not.
    const attempt = async (opts) => {
      try {
        const p = opts ? canvas.requestPointerLock(opts) : canvas.requestPointerLock();
        if (p && typeof p.then === 'function') await p.catch(() => {});
      } catch (e) {
        /* the next attempt will report the failure */
      }
      await new Promise((r) => setTimeout(r, 500));
      return document.pointerLockElement === canvas;
    };
    if (await attempt(null)) {
      return { ok: true, element: 'canvas' };
    }
    if (await attempt({ unadjustedMovement: true })) {
      return { ok: true, element: 'canvas (unadjusted)' };
    }
    return {
      ok: false,
      why: 'pointerLockElement is ' + (document.pointerLockElement ? 'set' : 'null'),
    };
  });
  console.log(`  pointer lock: ${locked.ok ? 'acquired' : 'FAILED (' + locked.why + ')'}`);
  if (!locked.ok) {
    console.log('  the engine will not turn mouse motion into view angle unlocked,');
    console.log('  so input latency cannot be measured in this run.');
    await browser.close();
    process.exit(1);
  }

  // --- dismiss the menu ------------------------------------------------
  // THE MENU OWNS THE CURSOR UNTIL YOU CLICK.
  // --------------------------------------
  // `ts_test_view` reports `menu true` while the menu has the cursor,
  // and the client IGNORES mouse-look in that state — the angles do not
  // move at all. That is why the first version of this harness
  // measured 0/24: the pointer was locked, the mousemove events were
  // arriving (verified: the DOM saw them, with real `movementX`
  // deltas), and the engine simply threw them away.
  //
  // A player resolves this by clicking into the game. So does the
  // harness: one click, then verify `menu false` before measuring.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 960,
    y: 540,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 960,
    y: 540,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
  await page.waitForTimeout(1500);

  const menuState = await page.evaluate(
    (args) =>
      new Promise((resolve) => {
        const onLine = (e) => {
          const line = e.detail?.line || '';
          if (!/third/.test(line)) return;
          window.removeEventListener('xash:stdout', onLine);
          const m = line.match(/menu\s+(true|false)/);
          resolve(m ? m[1] : 'unknown');
        };
        window.addEventListener('xash:stdout', onLine);
        const timer = setTimeout(() => resolve('timeout'), args.timeoutMs);
        try {
          window.__xash.Cmd_ExecuteString('ts_test_view');
        } catch (e) {
          clearTimeout(timer);
          resolve('error');
        }
      }),
    { timeoutMs: 1500 },
  );
  console.log(`  menu state after the click: ${menuState}`);
  if (menuState !== 'false') {
    console.log('  the menu still owns the cursor, so the engine ignores');
    console.log('  mouse-look and input latency cannot be measured.');
    await browser.close();
    process.exit(1);
  }

  // --- the mouse button must be HELD -----------------------------------
  // THE LAST GATE
  // --------------
  // With the menu dismissed and the pointer locked, a mouse move with
  // the button UP still did not move the view. A move with the button
  // HELD did (verified: yaw 135.0 → 134.27, pitch 0.0 → -0.82, a
  // delta consistent with m_yaw 0.022 at sensitivity 1.7).
  //
  // The client only treats the mouse as live while a button is down
  // (`input.rs`: `mouse.active`), so the harness holds the left button
  // for the duration of the measurement.
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 960,
    y: 540,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await page.waitForTimeout(300);

  // --- the measurement ------------------------------------------------
  // CDP `Input.dispatchMouseEvent` produces a TRUSTED event with a real
  // `movementX`, which is what the engine's mouse code reads. (Verified
  // in isolation: the DOM receives genuine non-zero movementX deltas
  // from a CDP dispatch.)

  // THE OBSERVABLE
  // --------------
  // The obvious choice, `v_angle`, does not exist in this build: the
  // engine answers `Unknown command: v_angle`. The view angles live in
  // the Rust TS client (which owns the client DLL), and the client
  // exposes them through its own developer command:
  //
  //   ts_test_view  ->  prints
  //     third false menu false cam_back 0.0 ... angles [pitch,yaw,roll]
  //
  // (tools/port/tsp-rs/crates/client/src/view.rs:448-461)
  //
  // So the harness asks for `ts_test_view` and parses the `angles [...]`
  // vector out of the engine's own stdout. That is the engine and the
  // client reporting their own state — not an inference from outside.
  //
  // WHY THE TIMING IS DONE ENTIRELY INSIDE THE PAGE
  // ----------------------------------------------
  // The first version polled from Node: dispatch a mouse move, then ask
  // the page for the angle until it changed. That measures the *polling
  // interval* as much as the latency — each round trip costs a CDP hop
  // plus an engine round trip, so the resolution is tens of
  // milliseconds and the number is dominated by the harness.
  //
  // Instead, both timestamps are taken on ONE clock inside the page:
  //
  //   t0 = when the page's own `mousemove` listener sees the event
  //   t1 = when the `ts_test_view` stdout shows a changed angle
  //
  // `performance.now()` is the same clock for both, and the subtraction
  // happens in the page. Node only dispatches the event and collects
  // the finished samples afterwards.
  //
  // The page also runs a small driver that asks the client for the
  // angles every few milliseconds, so the change is noticed as soon as
  // the engine has it — rather than only when Node happens to ask.
  await page.evaluate(() => {
    window.__lat = {
      tMouse: null,
      samples: [],
      raw: [],
      lastAngles: null,
      stop: false,
      // The PROBE'S OWN ROUND TRIP.
      //
      // The angle is only observable when the engine prints it, and the
      // engine prints it on its own schedule — so the measured interval
      // includes the time between "the view changed" and "the print that
      // revealed it arrived". That overhead is real and it varies with
      // where in the frame the print lands.
      //
      // It is measurable directly: time the call to `ts_test_view` and
      // the arrival of the line it produces. That is the probe's own
      // latency, and subtracting it from the sample gives the client's
      // actual input-to-view latency.
      probeSent: 0,
      probeLat: [],
    };
    const L = window.__lat;

    // The mouse event's arrival at the DOM — the earliest point the
    // page can observe it.
    window.addEventListener(
      'mousemove',
      () => {
        if (L.tMouse === null) L.tMouse = performance.now();
      },
      true,
    );

    // The engine's own report of the view angles.
    window.addEventListener('xash:stdout', (e) => {
      const line = e.detail?.line || '';
      const m = line.match(/angles\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/);
      if (!m) return;
      const pitch = parseFloat(m[1]);
      const yaw = parseFloat(m[2]);
      if (L.probeSent) {
        L.probeLat.push(performance.now() - L.probeSent);
        if (L.probeLat.length > 200) L.probeLat.shift();
        L.probeSent = 0;
      }
      if (L.lastAngles === null) {
        L.lastAngles = { pitch, yaw };
        return;
      }
      const changed =
        Math.abs(yaw - L.lastAngles.yaw) > 0.001 ||
        Math.abs(pitch - L.lastAngles.pitch) > 0.001;
      if (!changed) return;
      L.lastAngles = { pitch, yaw };
      if (L.tMouse !== null && L.samples.length < 60) {
        L.raw.push(performance.now() - L.tMouse);
        L.tMouse = null; // one sample per mouse move
      }
    });

    // The driver: ask the client for the angles, ONCE PER FRAME.
    //
    // THE PROBE RATE MATTERS A LOT.
    // --------------------------------
    // At 8 ms (125 Hz) the probe asks for the angles more than twice
    // per frame, so the engine's print path backs up and the queue of
    // pending prints grows. That showed up as a rising median across
    // runs — 12.2 ms, then 35.4 ms, then 52.9 ms — which looks like the
    // client getting slower but is the measurement getting heavier.
    //
    // At a fixed 20 ms it got worse again (1/24 responded, 81.9 ms),
    // because the probe stopped lining up with the frames and the
    // measurement degenerated into "did the angle change between two
    // arbitrary points".
    //
    // Driving it from `requestAnimationFrame` fixes both: exactly one
    // probe per frame, never more, and always aligned with the moment
    // the client actually applied the input. The probe becomes a mirror
    // of the frame instead of a competitor to it.
    const ask = () => {
      try {
        L.probeSent = performance.now();
        window.__xash.Cmd_ExecuteString('ts_test_view');
      } catch (e) {
        /* the engine may be restarting */
      }
    };
    const tick = () => {
      if (L.stop) return;
      ask();
      L.raf = requestAnimationFrame(tick);
    };
    L.raf = requestAnimationFrame(tick);
  });

  const samples = [];
  const attempts = [];
  let lastSampleCount = 0;
  let x = 960;
  for (let i = 0; i < 24; i++) {
    await page.evaluate(() => {
      window.__lat.tMouse = null;
    });

    // A real mouse move of 40px to the right, with the button still held.
    //
    // THE MOVE IS REPEATED until the view changes.
    // --------------------------------------------
    // The client consumes the accumulated mouse delta once per frame,
    // and it DISCARDS the delta entirely when the mouse is not active
    // (`input.rs`: `take_mouse_delta` returns zero unless
    // `mouse.active`, which the engine sets by calling the DLL's
    // `IN_ActivateMouse`). So a single move can be dropped on the floor
    // and the view never changes.
    //
    // Repeating the move means the delta is still there on the next
    // frame that does accept it.
    //
    // BUT THE RETRIES CONTAMINATE THE MEASUREMENT, AND THE REPORT
    // HAS TO SAY SO. The sample is timed from the FIRST move, so a
    // delta that was dropped and only accepted on the third retry is
    // reported as three retry intervals of latency — which is the
    // harness's delay, not the client's.
    //
    // That is exactly what the earlier runs showed: a tight cluster at
    // ~12 ms in the run where every move landed first time, and
    // clusters at 35 ms, 53 ms and 82 ms in the runs where moves were
    // being dropped and retried. The retry interval leaked straight
    // into the number.
    //
    // So each sample records HOW MANY MOVES it took, and the report
    // separates the clean samples (first move landed) from the
    // retried ones. Only the clean ones measure the client's latency.
    //
    // AND EACH RETRY MUST MOVE TO A *NEW* POSITION.
    // ----------------------------------------------
    // With the pointer locked, Chromium derives `movementX` from the
    // change in pointer position. Dispatching a retry to the SAME
    // coordinates therefore produces `movementX: 0` — a mousemove with
    // no delta in it, which the engine correctly ignores. The retry
    // was a no-op. Each retry now alternates direction, so every
    // dispatch carries a real delta.
    x += 40;
    let tries = 0;
    for (let k = 0; k < 6; k++) {
      tries++;
      // Alternate the direction so every dispatch carries a delta.
      const px = k % 2 === 0 ? Math.min(x + k * 40, 1900) : Math.max(x - k * 40, 20);
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: px,
        y: 540,
        button: 'left',
        buttons: 1,
      });
      await page.waitForTimeout(17);
      const n = await page.evaluate(() => window.__lat.raw.length);
      if (n > lastSampleCount) break;
    }

    // Give the engine time to consume the mouse and repaint.
    await page.waitForTimeout(60);

    const got = await page.evaluate(() => ({
      raw: window.__lat.raw.slice(),
      n: window.__lat.raw.length,
    }));
    if (got.n > lastSampleCount) {
      samples.push(got.raw[got.n - 1]);
      attempts.push(tries);
      lastSampleCount = got.n;
    }

    // Move back so the angle does not run out of range.
    x -= 80;
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.max(x, 20),
      y: 540,
      button: 'left',
      buttons: 1,
    });
    await page.waitForTimeout(60);
  }

  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: Math.max(x, 20),
    y: 540,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });

  await page.evaluate(() => {
    window.__lat.stop = true;
    if (window.__lat.raf) cancelAnimationFrame(window.__lat.raf);
    if (window.__lat.driver) clearInterval(window.__lat.driver);
  });

  const probeLat = await page.evaluate(() => window.__lat.probeLat.slice());
  const probeSorted = probeLat.slice().sort((a, b) => a - b);
  const pq = (f) =>
    probeSorted.length
      ? probeSorted[Math.min(probeSorted.length - 1, Math.floor(probeSorted.length * f))]
      : null;
  const probeMed = pq(0.5);

  // CLEAN SAMPLES ONLY
  // ------------------
  // A sample is "clean" when the FIRST mouse move was accepted. Those
  // are the ones that measure the client's input-to-view latency.
  // The retried samples measure the harness's retry interval, not the
  // client, and are reported separately.
  const clean = [];
  const retried = [];
  for (let i = 0; i < samples.length; i++) {
    (attempts[i] === 1 ? clean : retried).push(samples[i]);
  }
  const stat = (arr) => {
    const s = arr.slice().sort((a, b) => a - b);
    const f = (q) => (s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))] : null);
    return {
      n: s.length,
      min: s.length ? s[0] : null,
      med: f(0.5),
      p95: f(0.95),
      max: s.length ? s[s.length - 1] : null,
      values: s.map((v) => +v.toFixed(1)),
    };
  };
  const cleanStats = stat(clean);
  const retriedStats = stat(retried);

  const sorted = samples.slice().sort((a, b) => a - b);
  const q = (f) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * f))] : null);
  const result = {
    url: URL_,
    samples: sorted,
    attempts,
    responded: sorted.length,
    attempted: 24,
    min: sorted.length ? sorted[0] : null,
    med: q(0.5),
    p95: q(0.95),
    max: sorted.length ? sorted[sorted.length - 1] : null,
    probeLatency: {
      samples: probeSorted.length,
      med: probeMed,
      p95: pq(0.95),
      min: probeSorted.length ? probeSorted[0] : null,
    },
    clean: cleanStats,
    retried: retriedStats,
  };

  console.log('\n  --- input latency (real mouse move -> client view angles change) ---');
  console.log(`  responded ${result.responded}/${result.attempted}`);
  if (cleanStats.n) {
    console.log(
      `  CLEAN (first move landed, n=${cleanStats.n})   ` +
        `min ${cleanStats.min.toFixed(1)}ms  med ${cleanStats.med.toFixed(1)}ms  ` +
        `max ${cleanStats.max.toFixed(1)}ms`,
    );
    console.log(`     ${JSON.stringify(cleanStats.values)}`);
  }
  if (retriedStats.n) {
    console.log(
      `  retried (delta was dropped, n=${retriedStats.n})   ` +
        `min ${retriedStats.min.toFixed(1)}ms  med ${retriedStats.med.toFixed(1)}ms`,
    );
  }
  console.log(
    `  probe round trip   med ${probeMed === null ? 'n/a' : probeMed.toFixed(2) + 'ms'}` +
      (probeSorted.length ? `  (n=${probeSorted.length})` : ''),
  );

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify(result, null, 2));
    console.log(`\n  wrote ${JSON_OUT}`);
  }
  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
