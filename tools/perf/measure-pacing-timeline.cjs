/**
 * THE PACER'S TIMELINE, ON A REAL CLIENT, IN A REAL BROWSER.
 *
 * WHAT IT IS
 * ----------
 * A browser harness that boots the client against the CI stack, plays
 * into a map, and prints the PACER'S TIMELINE: at every sample, the
 * gate in force, the engine's cost, the engine's frame rate, the
 * browser's tick rate, the late-frame fraction and the panel rate.
 *
 * It prints NUMBERS. It does not print a verdict. The acceptance
 * criterion for the pacer is a measured frame rate — "the branch's
 * engine fps is never LOWER than main's, and the late-frame fraction
 * is never WORSE" — and a harness that decides for itself would be a
 * harness that can be argued with. This one shows what it saw, and
 * the comparison is made between two runs of it.
 *
 * HOW THE ENGINE'S FRAME RATE IS MEASURED
 * ----------------------------------------
 * NOT from the pacer's own state, because the two builds do not
 * expose the same thing: the branch exposes `engineFps` (the engine's
 * own frames) and main exposes `displayHz` (the browser's tick rate),
 * which are different numbers once the cap is in force. Comparing
 * those two would be comparing two different instruments.
 *
 * So the harness measures the engine's frame rate ITSELF, the same
 * way on both builds: it wraps the page's `requestAnimationFrame`
 * after the engine is up, and counts the requests. The engine asks
 * for its next frame at the end of every frame it draws, so the count
 * IS the number of frames the game drew — whether or not a cap is in
 * force, and whether or not the build under test knows what to call
 * it.
 *
 * The late-frame fraction is measured the same way: the SPACING
 * between the engine's frames, against the gate's period. The
 * threshold is relative (1.5x the period), never a constant.
 *
 * THE FIXTURE: A MAP AND A PLACE TO STAND
 * ----------------------------------------
 * A perf number without a viewpoint is a number of unknown
 * provenance. The server picks the spawn point at RANDOM, and the
 * engine's per-frame cost is dominated by what is VISIBLE — measured
 * on ts_casa, same map, same machine, one run apart: 1.87 ms and
 * 9.12 ms, a 4.9x spread from the spawn alone. So this harness
 *
 *   1. pins the MAP (`changelevel ts_casa` on the CI rig, before the
 *      client joins, which also restarts the three-minute rotation),
 *   2. pins the ANGLES (`ts_test_angles`), and
 *   3. pins the POSITION — the map's first nav node, via the server's
 *      `ts_tp` — and waits for the CLIENT to say it has arrived,
 *      because the server moves the player instantly and the client
 *      interpolates.
 *
 * Two runs of this harness are then the same measurement twice, which
 * is the only way an A/B of two builds means anything.
 *
 * NEVER PRODUCTION
 * ----------------
 * A browser client that enters a game is a real participant, and on
 * production it lands in the public leaderboard. So this harness
 * REFUSES TO RUN unless:
 *
 *   1. the server list the page sees is the CI rig's — every server
 *      id `ts-ci*` — and
 *   2. every WebSocket the page opened points at the CI bridge
 *      (`ci.bulletballet.dev`), and not at the production one.
 *
 * The local build therefore has to be made with the CI bridge baked
 * in:
 *
 *     cd webxash && VITE_BRIDGE_ADDRESS=ci.bulletballet.dev:443 bun run build
 *     node tools/perf/serve-local-build.cjs --proxy https://ci.bulletballet.dev
 *
 * WHAT IT NEEDS
 * ------------
 *   1. the CI stack up on the prod host:
 *        ssh bb-prod 'bash /home/ubuntu/ci-stack.sh up'
 *   2. a local build with the CI bridge baked in, served over HTTPS:
 *        node tools/perf/serve-local-build.cjs --proxy https://ci.bulletballet.dev
 *   3. a headful Chrome on :9223:
 *        Xvfb :99 -screen 0 1600x1200x24 &
 *        google-chrome --remote-debugging-port=9223 --ignore-certificate-errors \
 *          --enable-unsafe-swiftshader --no-sandbox --user-data-dir=/tmp/chrome-rig \
 *          --window-size=1600,1200 about:blank &
 *   4. then:  node tools/perf/measure-pacing-timeline.cjs
 *   5. and ALWAYS tear the rig down:
 *        ssh bb-prod 'bash /home/ubuntu/ci-stack.sh down'
 */
'use strict';

const path = require('node:path');

// THE REPO ROOT, DERIVED FROM WHERE THIS FILE LIVES. A hardcoded path
// works on one machine and nowhere else.
const REPO = path.resolve(__dirname, '..', '..');
const { loadPlaywright } = require(path.join(REPO, 'tools', 'deploy', 'lib', 'browser.cjs'));
const { chromium } = loadPlaywright();
const { ensureAtLeastOnePage } = require(path.join(REPO, 'tools', 'perf', 'lib', 'cdp-targets.cjs'));
const { confirmIdentity } = require(path.join(REPO, 'tools', 'deploy', 'lib', 'identity-modal.cjs'));
const { num, ms } = require(path.join(REPO, 'tools', 'perf', 'lib', 'format.cjs'));
const { serverCommand, ssh, findPlayer } = require(path.join(REPO, 'tools', 'perf', 'lib', 'server-console.cjs'));
const { pinFixturePosition } = require(path.join(REPO, 'tools', 'perf', 'lib', 'fixture-view.cjs'));
const { pinView, waitForArrival, readViewpoint, describeViewpoint } = require(
  path.join(REPO, 'tools', 'perf', 'lib', 'viewpoint.cjs'),
);

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const PAGE_URL = String(arg('url', 'https://127.0.0.1:8899/'));
const CDP_URL = String(arg('cdp', 'http://localhost:9223'));
const SECONDS = Number(arg('seconds', 75));
const INTERVAL_MS = Number(arg('interval', 1000));
const LABEL = String(arg('label', 'build'));
const PLAYER_NAME = String(arg('name', 'PacerProbe'));
const MAP = String(arg('map', 'ts_casa'));

const log = (...a) => console.log(...a);

/**
 * THE MEDIAN OF A LIST OF NUMBERS.
 *
 * A failure path has to report, not crash: an empty list has no
 * median, and `median([]).toFixed()` is a TypeError in the middle of
 * a measurement.
 */
function median(values) {
  if (!values || !values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

(async () => {
  // Playwright cannot connect to a browser with no pages open.
  const pages = await ensureAtLeastOnePage(CDP_URL);
  if (pages.opened) log(`(opened a blank page in the browser at ${CDP_URL})`);

  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] || (await ctx.newPage());

  // THE PAGE IS ASKED BEFORE IT LEAVES.
  //
  // The client puts a confirmation dialog up when a game is in
  // progress, so navigating away from the previous run's page raises
  // one. A dialog that is not answered stalls the navigation — and a
  // navigation that does not happen would leave the harness
  // MEASURING THE PREVIOUS BUILD, which is the one way an A/B can
  // lie without anybody noticing.
  page.on('dialog', (d) => {
    d.accept().catch(() => {});
  });

  // EVERY WEBSOCKET THE PAGE OPENS IS RECORDED, so the harness can
  // prove it never talked to the production bridge.
  await page.addInitScript(() => {
    window.__wsUrls = [];
    const Native = window.WebSocket;
    if (!Native) return;
    window.WebSocket = function (...args) {
      try {
        window.__wsUrls.push(String(args[0]));
      } catch (e) {
        /* the URL is not a string; nothing to record */
      }
      return new Native(...args);
    };
    window.WebSocket.prototype = Native.prototype;
    Object.assign(window.WebSocket, Native);
  });

  log(`\n=== the pacer timeline (${LABEL}) ===`);
  log(`page:   ${PAGE_URL}`);
  log(`window: ${SECONDS}s, sampled every ${INTERVAL_MS}ms\n`);

  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });

  // ── THE CI GUARD ───────────────────────────────────────────────────
  const servers = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/servers', { cache: 'no-store' });
      const body = await res.json();
      return (body.servers || []).map((s) => ({
        id: String(s.id || ''),
        name: String(s.name || ''),
        address: String(s.address || ''),
        port: Number(s.port || 0),
      }));
    } catch (e) {
      return [];
    }
  });
  // THE CI RIG IS IDENTIFIED BY ITS ID: `ts-ci-0`. The production rig
  // answers `ts-0`, so the id discriminates. The NAME is checked too
  // — the CI rig's display name carries "CI" — and both checks have to
  // pass, because a guard that fails OPEN is worse than no guard.
  const ids = servers.map((s) => s.id);
  const names = servers.map((s) => s.name);
  const ciOnly =
    servers.length > 0 &&
    servers.every((s) => /^ts-ci/i.test(s.id.trim()) && /\bci\b/i.test(s.name));
  if (!ciOnly) {
    log('REFUSING TO RUN: the server list is not the CI rig.');
    log(`  saw: ${ids.length ? ids.map((id, i) => `${id} (${names[i]})`).join(', ') : '(no servers at all)'}`);
    log('  a browser client that enters a game is a real participant, and on');
    log('  production it lands in the public leaderboard.');
    await browser.close();
    process.exit(2);
  }
  log(`the server list is the CI rig: ${ids.map((id, i) => `${id} (${names[i]})`).join(', ')}`);

  // ── THE MAP ────────────────────────────────────────────────────────
  //
  // The CI rig rotates the map every three minutes, and the engine's
  // cost moves with what is on screen, so an unpinned run measures
  // whatever happened to be on the screen. The map is pinned BEFORE
  // the client joins, which also restarts the rotation clock — a run
  // that fits inside three minutes then measures ONE map.
  //
  // The map is the CI rig's own map. `changelevel` is a console
  // command on the CI instance, which is disposable by design.
  //
  // AND THE SERVER IS WAITED FOR. A client that tries to join while
  // the server is still loading the map is not let in: the run then
  // measures a client that never entered the game — the engine
  // drawing the local map, at a completely different frame rate —
  // which is a different measurement entirely. The server says when
  // the map is up ("32 player server started"), so the harness waits
  // for that line.
  // The stamp is taken BEFORE the map change, because the line that
  // says the map is up is written to the log AFTER the console
  // command's own answer — a stamp taken after the change would
  // exclude the very line the harness is waiting for.
  const stamp = new Date(Date.now() - 5000).toISOString();
  const startedCount = async () => {
    const res = await ssh(
      'bb-prod',
      `docker logs --since ${stamp} ts-ci-0 2>&1 | grep -c "player server started" || true`,
      20_000,
    );
    const n = Number.parseInt(String(res.stdout || '').trim().split('\n').pop() || '0', 10);
    return Number.isFinite(n) ? n : 0;
  };
  const before = await startedCount();
  const pinned = await serverCommand(`changelevel ${MAP}`, { timeoutMs: 15_000 });
  log(`the map: ${pinned.ok ? `pinned to ${MAP}` : `NOT PINNED (${pinned.reason})`}`);
  if (pinned.ok) {
    let up = false;
    for (let i = 0; i < 45 && !up; i++) {
      up = (await startedCount()) > before;
      if (!up) await new Promise((r) => setTimeout(r, 1000));
    }
    log(`the server: ${up ? 'up, the map is loaded' : 'STILL LOADING — the client may not get in'}`);
  }

  // ── INTO THE GAME ──────────────────────────────────────────────────
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, PLAYER_NAME, { timeout: 30_000, required: false });
  log(`the identity modal: ${ident.appeared ? (ident.confirmed ? 'answered' : 'not answered') : 'not shown'}`);

  // THE ENGINE IS ALIVE: the backing store is at its real size.
  let alive = null;
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    alive = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      if (!c) return { state: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200) };
      return { w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height), backingW: c.width, backingH: c.height };
    });
    if (alive && alive.backingW > 400 && alive.backingH > 300) break;
    await page.waitForTimeout(2000);
  }
  log(`the engine: ${JSON.stringify(alive)}`);
  if (!alive || !(alive.backingW > 400)) {
    log('the engine never came up; the timeline would be empty.');
    await browser.close();
    process.exit(3);
  }

  // WHICH BUILD IS THIS, ACTUALLY?
  //
  // The two builds expose different state, and the difference is
  // visible from the page: the branch exposes the engine's own frame
  // rate (`engineFps`) and the settled flag; main exposes the live
  // tick rate as `displayHz` and has no notion of a settled reading.
  //
  // So the harness says which build it is talking to, rather than
  // trusting the `--label` it was given. A mislabelled run would
  // compare a build against itself and prove nothing.
  const fingerprint = await page.evaluate(() => {
    const p = typeof window.__xashPacing === 'function' ? window.__xashPacing() : null;
    if (!p) return { known: false };
    return {
      known: true,
      hasEngineFps: typeof p.engineFps === 'number',
      hasSettled: typeof p.settled === 'boolean',
      hasDisplayHz: typeof p.displayHz === 'number',
    };
  });
  const buildName = !fingerprint.known
    ? 'UNKNOWN (no pacing state)'
    : fingerprint.hasEngineFps && fingerprint.hasSettled
      ? 'the branch (engineFps + settled)'
      : fingerprint.hasDisplayHz
        ? "main (displayHz, no settled flag)"
        : 'UNKNOWN';
  log(`the build: ${buildName}`);

  // ── THE BRIDGE GUARD ───────────────────────────────────────────────
  const wsUrls = await page.evaluate(() => window.__wsUrls || []);
  const hosts = wsUrls.map((u) => {
    try {
      return new URL(u).hostname;
    } catch (e) {
      return '';
    }
  });
  const productionWs = hosts.filter((h) => /(^|\.)bulletballet\.dev$/i.test(h) && !/^ci\./i.test(h));
  log(`the websockets: ${hosts.length ? hosts.join(', ') : '(none recorded)'}`);
  if (productionWs.length) {
    log('REFUSING TO CONTINUE: the page opened a WebSocket to the PRODUCTION bridge.');
    log(`  ${productionWs.join(', ')}`);
    await browser.close();
    process.exit(2);
  }

  // ── THE VIEWPOINT ──────────────────────────────────────────────────
  //
  // A perf number without a viewpoint is a number of unknown
  // provenance. The server picks the spawn at RANDOM, and the engine's
  // per-frame cost is dominated by what is visible: measured on
  // ts_casa, same map, same machine, one run apart, 1.87 ms and
  // 9.12 ms — a 4.9x spread from the spawn alone.
  //
  // So the player is put on the map's first nav node, with the angles
  // pinned, and the run waits for the CLIENT to say it has arrived —
  // the server moves the player instantly, the client interpolates, and
  // measuring during the transit measures the wrong place.
  await pinView(page, 0, 0);
  let fixture = null;
  // WAIT FOR THE PLAYER TO BE IN THE GAME.
  //
  // The engine's canvas comes up well before the client has joined
  // the server, and the server only lists a player once it has. A
  // pin that finds no player pins nothing, and a run with no pin is a
  // measurement of a random viewpoint — so the harness WAITS, and
  // says so if it gives up.
  let found = { ok: false, reason: 'the server never listed the player' };
  const waitUntil = Date.now() + 60_000;
  while (Date.now() < waitUntil) {
    // THE PLAYER IS FOUND HERE, NOT BY `findServerPlayer`.
    //
    // That helper waits for the console's answer with a SHELL grep:
    // `grep -qE '\[ts\]\s+#\d+'`. GNU grep's ERE has no `\d`, so the
    // grep never matches, the helper burns its whole timeout on every
    // attempt, and the pin lands or fails on a coin toss.
    //
    // Here the console is asked plainly and the answer is read in
    // JavaScript, with the repo's own `findPlayer`, which is a pure
    // function over the text. The attempt costs a couple of seconds
    // instead of twenty, so the wait can actually wait.
    const status = await serverCommand('ts_status', { timeoutMs: 8_000 });
    const player = findPlayer(status.output, PLAYER_NAME);
    found = player
      ? { ok: true, player }
      : { ok: false, reason: 'the server has no player named ' + PLAYER_NAME };
    if (found.ok) break;
    await page.waitForTimeout(2000);
  }
  if (!found.ok) {
    log(`the viewpoint: NOT PINNED (${found.reason})`);
  } else {
    const at = await pinFixturePosition(found.player.index, MAP);
    if (!at.ok) {
      log(`the viewpoint: NOT PINNED (${at.reason})`);
    } else {
      const arrived = await waitForArrival(page, at.origin, { tolerance: 8, timeoutMs: 20_000 });
      fixture = {
        origin: at.origin,
        playerIndex: found.player.index,
        arrived: arrived.arrived,
        waitedMs: arrived.waitedMs,
      };
      log(
        `the viewpoint: pinned at ${at.origin.join(', ')} (player #${found.player.index})` +
          ` — the client ${arrived.arrived ? 'ARRIVED' : 'DID NOT ARRIVE'}` +
          ` after ${arrived.waitedMs} ms`,
      );
    }
  }
  const view = await readViewpoint(page);
  log(`the engine's own view: ${describeViewpoint(view)}`);

  // ── THE PROBE ──────────────────────────────────────────────────────
  //
  // Installed AFTER the engine is up, so it wraps the PACER's rAF (on
  // a build that has one) rather than the browser's: the engine asks
  // for its next frame at the end of every frame it draws, so the
  // count is the number of frames the game drew.
  await page.evaluate(() => {
    const native = window.requestAnimationFrame.bind(window);
    const probe = {
      requests: 0,
      starts: [],
      lastAt: performance.now(),
      lastCount: 0,
      lastIndex: 0,
    };
    window.__pacingProbe = probe;
    window.requestAnimationFrame = function (cb) {
      probe.requests++;
      probe.starts.push(performance.now());
      if (probe.starts.length > 4000) probe.starts.shift();
      return native(cb);
    };
  });

  // ── THE TIMELINE ───────────────────────────────────────────────────
  const rows = [];
  const started = Date.now();
  while ((Date.now() - started) / 1000 < SECONDS) {
    await page.waitForTimeout(INTERVAL_MS);
    const row = await page.evaluate(() => {
      const probe = window.__pacingProbe;
      const pacing = typeof window.__xashPacing === 'function' ? window.__xashPacing() : null;
      if (!probe || !pacing) return null;

      const now = performance.now();
      const intervalMs = now - probe.lastAt;
      const frames = probe.requests - probe.lastCount;
      const fps = intervalMs > 0 ? (frames * 1000) / intervalMs : 0;

      // THE ENGINE'S FRAME SPACING, against the GATE's period.
      //
      // The gate's period is the panel's period times the gate: with
      // a 30 fps gate (a slot every 33.3 ms) and the engine's frames
      // landing every 33.3 ms, the frames are NOT late.
      const panelHz = Number(pacing.panelHz || 0);
      const everyNth = Math.max(1, Number(pacing.everyNth || 1));
      const gateFps = panelHz > 0 ? panelHz / everyNth : 0;
      const periodMs = gateFps > 0 ? 1000 / gateFps : 0;
      let late = 0;
      let gaps = 0;
      for (let i = Math.max(1, probe.lastIndex); i < probe.starts.length; i++) {
        const gap = probe.starts[i] - probe.starts[i - 1];
        gaps++;
        if (periodMs > 0 && gap > periodMs * 1.5) late++;
      }
      const lateFraction = gaps > 0 ? late / gaps : 0;

      probe.lastAt = now;
      probe.lastCount = probe.requests;
      probe.lastIndex = probe.starts.length;

      return {
        frames,
        fps,
        late,
        gaps,
        lateFraction,
        // THE PACER'S OWN STATE, as the build under test reports it.
        everyNth: Number(pacing.everyNth || 1),
        active: !!pacing.active,
        capFps: Number(pacing.capFps || 0),
        engineWorkMs: Number(pacing.engineWorkMs || 0),
        sustainableFps: Number(pacing.sustainableFps || 0),
        engineFps: Number(pacing.engineFps || 0),
        browserHz: Number(pacing.browserHz || pacing.displayHz || 0),
        panelHz,
        lateFractionPacer: Number(pacing.lateFraction || 0),
        settled: pacing.settled === true,
        provisional: pacing.provisional === true,
        reason: String(pacing.reason || ''),
      };
    });
    if (!row) continue;
    rows.push(row);
    const t = ((Date.now() - started) / 1000).toFixed(1);
    log(
      [
        t.padStart(6),
        `gate ${String(row.everyNth).padStart(2)}`,
        `cap ${row.capFps.toFixed(0).padStart(3)}`,
        `work ${ms(row.engineWorkMs).padStart(6)}ms`,
        `engine ${row.fps.toFixed(1).padStart(6)}fps`,
        `browser ${row.browserHz.toFixed(1).padStart(5)}Hz`,
        `late ${(row.lateFraction * 100).toFixed(1).padStart(5)}%`,
        `panel ${row.panelHz.toFixed(0).padStart(4)}Hz`,
        row.settled ? 'settled' : 'warming',
        row.provisional ? 'provisional' : '',
      ].join('  '),
    );
  }

  // ── THE NUMBERS ────────────────────────────────────────────────────
  const fps = rows.map((r) => r.fps).filter((v) => v > 0);
  const lateFractions = rows.map((r) => r.lateFraction);
  const work = rows.map((r) => r.engineWorkMs).filter((v) => v > 0);
  const gates = [...new Set(rows.map((r) => r.everyNth))];

  // DID THE MAP MOVE UNDER THE RUN? The rig rotates every three
  // minutes, and a run that straddles a rotation measures two
  // different scenes. The reader is told, not left to guess.
  const mapAfter = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/servers', { cache: 'no-store' });
      const body = await res.json();
      return (body.servers || []).map((s) => String(s.map || '')).join(', ');
    } catch (e) {
      return '';
    }
  });

  log('\n--- the numbers this run saw ---');
  log(`label:                 ${LABEL}`);
  log(`samples:               ${rows.length}`);
  log(`map:                   ${MAP}${mapAfter && !mapAfter.includes(MAP) ? `  (the rig moved on to ${mapAfter} during the run)` : ''}`);
  log(
    `viewpoint:             ${
      fixture
        ? `${fixture.origin.join(', ')} (arrived: ${fixture.arrived})`
        : 'NOT PINNED — this run is NOT comparable to another'
    }`,
  );
  log(`the gate in force:     ${gates.join(', ')} (1 = uncapped)`);
  log(`engine fps:            min ${num(Math.min(...fps)).toFixed(1)}  median ${num(median(fps)).toFixed(1)}  max ${num(Math.max(...fps)).toFixed(1)}`);
  log(`late-frame fraction:   min ${(num(Math.min(...lateFractions)) * 100).toFixed(1)}%  median ${(num(median(lateFractions)) * 100).toFixed(1)}%  max ${(num(Math.max(...lateFractions)) * 100).toFixed(1)}%`);
  log(`engine frame cost:     min ${ms(num(Math.min(...work)))}ms  median ${ms(num(median(work)))}ms  max ${ms(num(Math.max(...work)))}ms`);
  log(`panel rate:            ${num(rows.length ? rows[rows.length - 1].panelHz : 0).toFixed(0)} Hz`);
  log(`browser tick rate:     ${num(rows.length ? rows[rows.length - 1].browserHz : 0).toFixed(1)} Hz`);
  if (rows.length) {
    log(`the pacer's last word: ${rows[rows.length - 1].reason}`);
  }
  log('');

  await browser.close();
})().catch((e) => {
  console.error('the harness failed:', e && e.stack ? e.stack : e);
  process.exit(1);
});
