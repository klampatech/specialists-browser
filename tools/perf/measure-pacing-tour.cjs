/**
 * THE PACING TOUR: the pacer's behaviour while the game is ACTUALLY PLAYED.
 *
 * WHY A TOUR AND NOT A SINGLE MEASUREMENT
 * ---------------------------------------
 * The engine's per-frame cost is dominated by WHAT IS ON SCREEN. Two
 * runs on the same map, on the same machine, a minute apart, measured
 * 1.87 ms and 9.12 ms -- a 4.9x spread from the spawn point alone.
 * A single measurement is a picture of one view, and the pacer makes
 * its decisions from those measurements. So the pacer has to be
 * measured over a tour: several parts of the map, facing several
 * directions, with the player moving.
 *
 * WHAT IT DOES
 * ------------
 *   1. plays a game on the CI stack (never production),
 *   2. walks the player to several nav nodes on the map,
 *   3. pins the camera to a different direction at each one,
 *   4. moves the player while it measures,
 *   5. prints the engine's cost, the engine's own frame rate, the
 *      late-frame fraction and the gate in force at every viewpoint,
 *      and the aggregate at the end.
 *
 * The tour is the SAME script for both builds, so the numbers are
 * comparable: the same map, the same viewpoints, the same directions,
 * the same movement.
 *
 * USAGE
 *   node tools/perf/measure-pacing-tour.cjs \
 *     --cdp http://localhost:9224 --url https://127.0.0.1:8899/ \
 *     --map ts_casa --views 6 --seconds 10 --label BRANCH
 */
const path = require('path');
const { loadPlaywright } = require(path.join(__dirname, '..', '..', 'tools', 'deploy', 'lib', 'browser.cjs'));
const { confirmIdentity } = require(path.join(__dirname, '..', '..', 'tools', 'deploy', 'lib', 'identity-modal.cjs'));
const { serverCommand, findPlayer, ssh } = require(path.join(__dirname, 'lib', 'server-console.cjs'));
const { readNavNodes } = require(path.join(__dirname, 'lib', 'nav-node.cjs'));
const { pinView, waitForArrival, readViewpoint, describeViewpoint, fixtureHeld } = require(
  path.join(__dirname, 'lib', 'viewpoint.cjs'),
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
const SECONDS = Number(arg('seconds', 10));
const VIEWS = Number(arg('views', 6));
const MAP = String(arg('map', 'ts_casa'));
const LABEL = String(arg('label', 'tour'));
const PLAYER_NAME = String(arg('name', 'PacerTour'));


/**
 * THE CANVAS THE TOUR RUNS AT.
 *
 * `--size 3276x2048` makes the engine render at that size, which is how
 * the tour is run at the PLAYER's canvas (6.7 MP) instead of the rig's
 * own (0.48 MP). It matters more than it looks: on a still scene the
 * pixels are nearly free, and on a busy one they are not.
 */
const SIZE = (() => {
  const raw = arg('size', '');
  const m = /^(\d+)x(\d+)$/.exec(String(raw));
  return m ? [Number(m[1]), Number(m[2])] : null;
})();
// THE MOVE IS OFF BY DEFAULT.
//
// The camera is a free-flying observer camera, so "walk forward" moves
// it HUNDREDS of units and the fixture is gone by the end of the
// measurement. The tour's job is the cost AT a fixture, and the six
// viewpoints are how it covers the map. Turn it on only when you want
// the drift, and read the fixture column.
const MOVE = arg('move', false) !== false;
// THE ATTRIBUTION COMMAND: ONE ENGINE COMMAND, APPLIED ON THE FIXTURE
// BEFORE THE MEASUREMENT, SO A ROW SAYS WHAT IT CHANGED.
const CVAR = arg('cvar', '') && arg('cvar', '') !== true ? String(arg('cvar', '')) : '';
// The gate in force, FORCED. The pacer picks the gate from the cost,
// and the cost moves with the scene -- so a sweep without a fixed gate
// compares two different FRAME RATES as well as two different
// canvases, which is how a resolution measurement ends up "proving"
// that the resolution does not matter.
const FORCE_CAP = Number(arg('force-cap', 0));

/**
 * THE VIEWPORT THE TOUR RUNS AT.
 *
 * `--viewport 960x540` resizes the BROWSER'S VIEWPORT, which is the only
 * way to change the canvas reliably: the client re-applies the window's
 * size on every resize, so `vid_setmode` alone is undone the moment the
 * browser moves its window (which it did -- the canvas went back to
 * 3362x1932 after the mode was set to 960x540).
 *
 * The device pixel ratio is untouched, so a 960x540 viewport on a
 * 2x display is a 1920x1080 backing store: exactly what the fixed
 * resolution policy hands a 2x display.
 */
const INIT_SCRIPT = (() => {
  const i = process.argv.indexOf('--init');
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : '';
})();
const VIEWPORT = (() => {
  const raw = arg('viewport', '');
  const m = /^(\d+)x(\d+)$/.exec(String(raw));
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
})();

/**
 * HOW FAR THE CAMERA MAY BE FROM THE FIXTURE, IN X/Y UNITS.
 *
 * The server's `ts_tp` puts the player on the node and the floor is
 * below it, so Z is not comparable; X and Y are.
 */
const FIXTURE_TOLERANCE = 24;

const log = (...a) => console.log(...a);

function median(values) {
  if (!values || !values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The pacing state, as the client publishes it. */
const READ_STATE = () => {
  const st = window.__xashPacing ? window.__xashPacing() : null;
  // The engine's own frame rate, when the build publishes it. An
  // older build does not, and its `displayHz` is the closest thing it
  // has -- so the SAME tour can measure both sides of the A/B.
  const engineFps = st?.engineFps > 0 ? st.engineFps : st?.displayHz || 0;
  return {
    capFps: st?.capFps ?? -1,
    everyNth: st?.everyNth ?? -1,
    active: st?.active ?? false,
    engineFps,
    engineWorkMs: st?.engineWorkMs ?? 0,
    sustainableFps: st?.sustainableFps ?? 0,
    browserHz: st?.browserHz ?? 0,
    panelHz: st?.panelHz ?? 0,
    lateFraction: st?.lateFraction ?? 0,
    // THE GAPS. The engine's cost is the CPU's; the gaps are what the
    // PLAYER sees -- the judder -- and on a machine whose frame is
    // GPU-bound they say something the cost cannot.
    gapP50: st?.pacing?.p50 ?? 0,
    gapP90: st?.pacing?.p90 ?? 0,
    gapP99: st?.pacing?.p99 ?? 0,
    gapMax: st?.pacing?.max ?? 0,
    measuredFrames: st?.measuredFrames ?? 0,
    measuredAt: st?.measuredAt ?? 0,
    settled: st?.settled ?? false,
    reason: st?.reason ?? '',
  };
};

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] || (await ctx.newPage());

  //
  // THE PROBE, IF ONE WAS ASKED FOR.
  //
  // `--init <file>` installs a script before any page script runs.
  // The point of that is the WebGL call counter: the port renders
  // through WebGL's JavaScript API, one call at a time, and the
  // question of how many calls a frame makes is a question about the
  // boundary between the engine and the browser -- the boundary the
  // port added and the original engine did not have.
  //
  // It has to be installed HERE, before the first navigation, because
  // a script installed after the engine has booted misses everything
  // the engine did at startup.
  if (INIT_SCRIPT) {
    const source = require('node:fs').readFileSync(INIT_SCRIPT, 'utf8');
    await page.addInitScript({ content: source });
    log(`the probe is installed: ${INIT_SCRIPT}`);
  }

  // ── THE CI GUARD ───────────────────────────────────────────────────
  //
  // A browser client that enters a game IS a player. On production it
  // lands in the public leaderboard. So the tour refuses to run
  // unless the server list is the CI rig.
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  const servers = await page.evaluate(async () => {
    const r = await fetch('/api/servers').then((x) => x.json()).catch(() => null);
    return (r?.servers || []).map((s) => s.id);
  });
  log(`the servers: ${servers.join(', ')}`);
  if (!servers.some((id) => /^ts-ci/.test(id))) {
    log('REFUSING TO CONTINUE: this is not the CI rig.');
    await browser.close();
    process.exit(2);
  }

  // ── INTO THE GAME ──────────────────────────────────────────────────
  //
  // The name is made UNIQUE for this run and written into the client's
  // own identity store. The write happens BEFORE the reload, because
  // the client reads its identity when its module loads -- a name
  // written after the page has loaded is a name the client never saw,
  // and the player joins under the previous one's name, where a stale
  // session is waiting with the same name.
  const uniqueName = `${PLAYER_NAME}-${Date.now().toString(36).slice(-5)}`;
  await page.evaluate((name) => {
    try {
      localStorage.setItem('bulletballet.identity', JSON.stringify({ name, remember: true }));
    } catch (e) {
      /* storage disabled is not a reason to fail the run */
    }
  }, uniqueName);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, uniqueName, { timeout: 20_000, required: false });
  log(`the identity: ${JSON.stringify(ident).slice(0, 140)}`);
  await page.waitForFunction(() => !!window.__xash, null, { timeout: 180_000 });
  log('the engine is up');

  // THE GATE, FORCED.
  //
  // The pacer chooses the gate from the engine's cost, and the cost
  // moves with the scene -- so two runs of the same tour can be at two
  // different frame rates. When the thing under test is the CANVAS,
  // the gate has to be the same in both arms or the comparison is
  // measuring the frame rate as well as the pixels.
  if (FORCE_CAP > 0) {
    const forced = await page.evaluate((n) => {
      try {
        window.__xashForceFrameCap?.(n);
        return true;
      } catch (e) {
        return false;
      }
    }, FORCE_CAP);
    log(`the gate is forced to one frame in ${FORCE_CAP} ticks: ${forced ? 'yes' : 'no'}`);
    await sleep(3000);
  }

  // The WebSocket guard: the page must be talking to the CI bridge.
  const wsHosts = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((n) => /wss?:/.test(n))
      .map((n) => {
        try {
          return new URL(n).host;
        } catch (e) {
          return n;
        }
      }),
  );
  log(`the websockets: ${wsHosts.join(', ') || '(none recorded)'}`);
  if (wsHosts.some((h) => /bulletballet\.dev/.test(h) && !/^ci\./.test(h))) {
    log('REFUSING TO CONTINUE: the page opened a WebSocket to the PRODUCTION bridge.');
    await browser.close();
    process.exit(2);
  }

  // ── THE PLAYER, ON THE SERVER ──────────────────────────────────────
  //
  // The name on the server is the name the CLIENT joined under, and
  // the client remembers the name it used last time -- so the identity
  // dialog may not even appear, and the player is not under the name
  // this harness asked for. The client keeps that name in local
  // storage, so the harness reads the name from the page and looks up
  // THAT, rather than guessing. The index also goes stale: a player
  // from an earlier session can still be on the server for a while,
  // and teleporting the wrong one moves nothing.
  const clientName = await page.evaluate(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('bulletballet.identity') || '{}');
      return raw.name || '';
    } catch (e) {
      return '';
    }
  });
  let index = null;
  let playerName = clientName || PLAYER_NAME;
  for (let attempt = 0; attempt < 20 && index === null; attempt++) {
    await sleep(1500);
    const res = await serverCommand('ts_status', { expect: /\[ts\]\s+#\d+/, timeoutMs: 8000 });
    if (res.ok) {
      const wanted = clientName ? findPlayer(res.output, clientName) : null;
      if (wanted) {
        index = wanted.index;
        playerName = clientName;
      } else {
        const any = [...(res.output || '').matchAll(/\[ts\]\s+#(\d+)\s+(\S+)\s+alive/g)];
        if (any.length) {
          index = Number(any[any.length - 1][1]);
          playerName = any[any.length - 1][2];
        }
      }
    }
  }
  if (index === null) {
    log('the server never showed the player; the tour cannot place the camera.');
    await browser.close();
    process.exit(2);
  }
  log(`the player's server index: ${index} (as "${playerName}")`);

  // ── THE CAMERA MUST NOT CHASE A BOT ─────────────────────────────────
  //
  // THE FIXTURE WAS NOT THE FIXTURE WHEN THERE WERE BOTS ON THE MAP.
  //
  // The player joins as an OBSERVER, and an observer's camera follows a
  // living player. With no bots on the server there was nobody to
  // follow, so the camera stayed where `ts_tp` put it and the fixture
  // held. With bots on the map the camera tracked a BOT -- and the
  // measurement was taken at the bot's position, not at the fixture.
  // Two runs of "the same" fixture measured two different places, and
  // the bot count was measured against a moving camera.
  //
  // Mode 3 is ROAMING: the camera stays where it is put. Measured on
  // the rig with sixteen bots: before, the camera moved 600+ units on
  // its own between two status reads; after, `ts_tp` put it on the
  // fixture and it stayed there.
  const roaming = await serverCommand(`ts_observe ${index} 3`, {
    expect: /ts_observe:/,
    timeoutMs: 10_000,
  });
  log(
    roaming.ok
      ? 'the camera is roaming: it stays where the fixture puts it'
      : `the camera could not be put in roaming mode (${roaming.reason})`,
  );

  // ── THE CANVAS ──────────────────────────────────────────────────────
  if (VIEWPORT) {
    await page.setViewportSize(VIEWPORT);
    await sleep(4000); // the client re-applies the mode on the resize
    const canvas = await page.evaluate(() => {
      const el = document.getElementById('canvas');
      return el ? `${el.width}x${el.height}` : 'unknown';
    });
    log(`the canvas: ${canvas} (the viewport is ${VIEWPORT.width}x${VIEWPORT.height})`);
  }
  if (SIZE) {
    await page.evaluate(
      ([w, h]) => window.__xash.Cmd_ExecuteString(`vid_setmode ${w} ${h}`),
      SIZE,
    );
    await sleep(4000); // the engine resizes its buffers
    const canvas = await page.evaluate(() => {
      const el = document.getElementById('canvas');
      return el ? `${el.width}x${el.height}` : 'unknown';
    });
    log(`the canvas: ${canvas}`);
  }

  // ── THE VIEWPOINTS ─────────────────────────────────────────────────
  //
  // The map's own nav data is the ground truth for where a player can
  // stand. A spread of nodes gives a spread of what is on screen.
  const nav = await readNavNodes(MAP, 64);
  if (!nav.ok || !nav.nodes || nav.nodes.length < 2) {
    log(`the nav data for ${MAP}: ${nav.reason || 'not enough nodes'}`);
    await browser.close();
    process.exit(2);
  }
  const picks = [];
  for (let i = 0; i < VIEWS; i++) {
    const node = nav.nodes[Math.floor((i * (nav.nodes.length - 1)) / Math.max(1, VIEWS - 1))];
    if (node) picks.push(node);
  }
  log(`the viewpoints on ${MAP}: ${picks.length} (from ${nav.nodes.length} nav nodes)`);

  // ── THE TOUR ───────────────────────────────────────────────────────
  const rows = [];
  for (let i = 0; i < picks.length; i++) {
    const [nx, ny, nz] = picks[i];
    const yaw = Math.round((360 / picks.length) * i);
    let row = null;
    // THE FIXTURE HAS TO HOLD, OR THE READING IS ABOUT SOMEWHERE ELSE.
    //
    // Two attempts. If the camera drifted off the fixture during the
    // measurement -- it chased a bot, the player died and respawned --
    // then the reading belongs to THAT place and not to this one. Put
    // the player back and measure again.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const tp = await serverCommand(`ts_tp ${index} ${nx} ${ny} ${nz} ${yaw} 0`, {
        expect: /ts_tp: #\d+ at \(/,
        timeoutMs: 10_000,
      });
      if (!tp.ok) {
        log(`viewpoint ${i + 1}: the teleport failed (${tp.reason})`);
        break;
      }
      await pinView(page, 0, yaw);
      // The server moves the player instantly; the client interpolates.
      // Measuring during the transit measures the wrong place.
      const arrival = await waitForArrival(page, [nx, ny, nz], {
        tolerance: 12,
        timeoutMs: 20_000,
      }).catch(() => ({ arrived: false, view: null }));
      if (!arrival.arrived) {
        // THE CLIENT NEVER GOT THERE.
        //
        // The server says the player is at the fixture; the client says
        // its own camera is somewhere else. The engine draws what the
        // client sees, so this reading would be about that somewhere
        // else -- and it would look like a perfectly good number.
        log(`viewpoint ${i + 1}: the client's camera never arrived (${arrival.waitedMs ?? '?'} ms)`);
        break;
      }
      await sleep(1200);

      //
      // AN ATTRIBUTION SWEEP.
      //
      // One command, applied AFTER the camera is on the fixture and
      // BEFORE the measurement, so the row says what the command
      // changed and nothing else did. The draw count is the signal
      // here: it moves by 5% between runs of the same scene, where the
      // frame cost moves by 2x, so it can carry the comparison.
      if (CVAR) {
        const applied = await page
          .evaluate((c) => window.__xash?.Cmd_ExecuteString(c), CVAR)
          .catch((e) => `FAILED: ${e.message}`);
        log(`the command: ${CVAR}${applied ? ` (${applied})` : ''}`);
        // The engine needs a moment to act on it: a cvar that changes
        // what is drawn changes the NEXT frame, not this one.
        await sleep(3000);
      }

      const samples = [];
      const end = Date.now() + SECONDS * 1000;
      let moved = false;
      while (Date.now() < end) {
        const st = await page.evaluate(READ_STATE);
        samples.push(st);
        if (MOVE && !moved && Date.now() > end - SECONDS * 1000 + 1500) {
          // ACTUALLY PLAY: walk forward while the measurement runs.
          moved = true;
          page.keyboard.down('KeyW').catch(() => {});
        }
        await sleep(1000);
      }
      if (MOVE) await page.keyboard.up('KeyW').catch(() => {});

      // WHERE DID THE MEASUREMENT HAPPEN?
      //
      // TWO CHECKS, BOTH NEEDED.
      //
      // The SERVER's status says where the player is -- that catches the
      // player dying, respawning or being carried off by a bot.
      //
      // The CLIENT's own view says where the CAMERA is, and which way
      // it is looking -- and the camera is what the engine drew. The
      // server goes on believing the player is at the fixture while the
      // client is somewhere else entirely, and that is how the same
      // fixture produced 16.63 ms in one run and 2.19 ms in another
      // with nothing said about it.
      // THE CLIENT'S VIEW OF ITSELF, RIGHT NOW.
      const view = await readViewpoint(page).catch(() => null);
      const where = await serverCommand('ts_status', {
        expect: /\[ts\]\s+#\d+/,
        timeoutMs: 8000,
      });
      const at = where.ok ? findPlayer(where.output, playerName) : null;
      const drift = at
        ? Math.max(Math.abs(at.origin[0] - nx), Math.abs(at.origin[1] - ny))
        : Infinity;
      const camera = fixtureHeld(view, [nx, ny, nz], yaw, { tolerance: FIXTURE_TOLERANCE });
      const held = drift <= FIXTURE_TOLERANCE && camera.held;

      const fps = samples.map((s) => s.engineFps).filter((v) => v > 0);
      const cost = samples.map((s) => s.engineWorkMs).filter((v) => v > 0);
      const late = samples.map((s) => s.lateFraction);
      const caps = [...new Set(samples.map((s) => `${s.capFps}`))];
      // THE CANVAS THE MEASUREMENT HAPPENED ON.
      //
      // It is not decoration: on a still scene the pixels are free, and
      // on a busy one they are 1.61x. A reading without the canvas is a
      // reading without its multiplier.
      const canvasBox = await page
        .evaluate(() => {
          const el = document.getElementById('canvas');
          return el ? `${el.width}x${el.height}` : null;
        })
        .catch(() => null);

      //
      // THE WEBGL CALLS, WHEN A PROBE IS CARRYING THEM.
      //
      // The per-frame call count and the JavaScript-side time it took
      // to submit them: the boundary cost the port added, measured
      // from the outside with the engine untouched.
      const gl = await page
        .evaluate(() => {
          const p = window.__glProbe;
          if (!p) return null;
          return {
            calls: p.lastFrameCalls,
            ms: p.lastFrameMs,
            draws: p.lastFrameDraws,
            drawMs: p.lastFrameDrawMs,
            peakCalls: p.peakCalls,
            peakMs: p.peakMs,
            // THE BREAKDOWN: WHICH CALLS, AND HOW MANY, IN THE LAST
            // FRAME. A thousand draws is a thousand things the engine
            // is submitting, and the method names say what they are.
            byMethod: p.samples && p.samples.length ? p.samples[p.samples.length - 1].byMethod : null,
            totals: p.byMethod || null,
            frames: p.frames || 0,
          };
        })
        .catch(() => null);

      row = {
        view: i + 1,
        cvar: CVAR || null,
        yaw,
        at: [nx, ny, nz],
        canvas: canvasBox,
        gl,
        engineFpsMed: median(fps),
        engineFpsMin: fps.length ? Math.min(...fps) : 0,
        costMed: median(cost),
        costMax: cost.length ? Math.max(...cost) : 0,
        lateMax: late.length ? Math.max(...late) : 0,
        gapP50: median(samples.map((s) => s.gapP50).filter((v) => v > 0)),
        gapP99: median(samples.map((s) => s.gapP99).filter((v) => v > 0)),
        gapMax: samples.length ? Math.max(...samples.map((s) => s.gapMax)) : 0,
        caps: caps.join('/'),
        settled: samples[samples.length - 1]?.settled,
        at2: describeViewpoint(view),
        // THE FIXTURE'S HONESTY, RECORDED WITH THE READING.
        fixtureHeld: held,
        fixtureDrift: Number.isFinite(drift) ? Math.round(drift) : -1,
        camera: camera.held ? 'at the fixture' : camera.why,
      };
      if (held) break;
      log(
        `viewpoint ${i + 1}: the reading is not this viewpoint -- ` +
          `${camera.held ? `the camera drifted ${row.fixtureDrift} units` : camera.why}` +
          (attempt < 2 ? ' -- measuring it again' : ''),
      );
      row = null;
    }
    if (!row) continue;
    rows.push(row);
    log(
      `view ${row.view} yaw ${String(yaw).padStart(3)}  ` +
        `canvas ${String(row.canvas || '?').padStart(9)}  ` +
        `engine ${row.engineFpsMed.toFixed(1).padStart(6)} fps (min ${row.engineFpsMin.toFixed(1)})  ` +
        `cost ${row.costMed.toFixed(2).padStart(6)} ms (max ${row.costMax.toFixed(2)})  ` +
        `late ${(row.lateMax * 100).toFixed(1).padStart(5)}%  ` +
        `gap p50 ${row.gapP50.toFixed(1).padStart(6)} ms  p99 ${row.gapP99.toFixed(1).padStart(6)}  ` +
        `cap ${row.caps}  drift ${row.fixtureDrift}u` +
        (row.gl
          ? `  gl ${String(row.gl.calls).padStart(5)} calls (${row.gl.ms.toFixed(2).padStart(5)} ms)  ` +
            `draws ${String(row.gl.draws).padStart(4)} (${row.gl.drawMs.toFixed(2).padStart(5)} ms)`
          : '') +
        `  ${row.at2}`,
    );
  }

  // ── THE AGGREGATE ──────────────────────────────────────────────────
  const allFps = rows.map((r) => r.engineFpsMed);
  const allMin = rows.map((r) => r.engineFpsMin);
  const allLate = rows.map((r) => r.lateMax);
  const allCost = rows.map((r) => r.costMax);
  const caps = [...new Set(rows.flatMap((r) => r.caps.split('/')))];
  log(`\n=== THE TOUR SUMMARY (${LABEL}, ${MAP}) ===`);
  log(`the viewpoints measured:     ${rows.length}`);
  log(
    `the fixture held for:        ${rows.filter((r) => r.fixtureHeld).length}/${rows.length}` +
      ` (worst drift ${rows.length ? Math.max(...rows.map((r) => r.fixtureDrift)) : 0} units)`,
  );
  log(`the engine's fps:            median ${median(allFps).toFixed(1)}, worst viewpoint ${Math.min(...allMin).toFixed(1)}`);
  log(`the engine's cost:           median ${median(rows.map((r) => r.costMed)).toFixed(2)} ms, worst ${Math.max(...allCost).toFixed(2)} ms`);
  log(`the late-frame fraction:     worst viewpoint ${(Math.max(...allLate) * 100).toFixed(1)}%`);
  log(`the caps seen across the tour: ${caps.join(', ')}`);
  log(`the tour JSON: ${JSON.stringify(rows)}`);

  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error('TOUR ERROR:', e);
  process.exit(2);
});
