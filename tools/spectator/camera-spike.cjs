#!/usr/bin/env node
/**
 * camera-spike.cjs — answer the three questions the landing-page camera
 * needs answered, on the disposable CI rig, in one run.
 *
 * THE THREE QUESTIONS
 * -------------------
 *   (a) Can a FRESH connection become a spectate-only client? The port's
 *       camera maths only runs in the locked view, and `specmode` refuses
 *       unless the engine says `IsSpectateOnly()` — so if a new client
 *       cannot get there, the whole design changes.
 *   (b) Does the SERVER's director then drive that camera? The port emits
 *       `director_event` on every damage and every death
 *       (server/src/player/damage.rs, server/src/rules/scoring.rs) and it
 *       reaches spectator proxies only. If the camera cuts to the action,
 *       the landing page needs no camera logic of its own.
 *   (c) Does a CDP screencast capture the engine's WebGL canvas? If the
 *       frames are black, the whole capture approach is wrong.
 *
 * WHAT IT DOES
 * ------------
 * Joins the rig as a player (the flow the deploy gate proves), waits for
 * the engine's own proof of a handshake (the server banner), then asks the
 * ENGINE what it thinks it is — every probe is a console command and every
 * answer is the engine's own stdout, not an inference.
 *
 * THEN IT CAPTURES. `page.screencast` takes the COMPOSITOR's output, so
 * it works with a WebGL canvas with no `preserveDrawingBuffer` and no
 * cooperation from the engine. The frames are written to disk so they can
 * be LOOKED at, and the sizes are the bandwidth number the real pipeline
 * needs.
 *
 * IT NEVER TOUCHES PRODUCTION. The rig has its own game server, bridge
 * and registry, and its port (27025) is outside the production
 * discovery range. Point it at ci.bulletballet.dev and nothing else.
 *
 * USAGE
 *   node tools/spectator/camera-spike.cjs [url] [outdir] [captureSeconds]
 */

const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const fs = require('node:fs');
const path = require('node:path');

const URL = process.argv[2] || 'https://ci.bulletballet.dev/';
const OUT = process.argv[3] || '/tmp/camera-spike';
const CAPTURE_SECONDS = Number(process.argv[4] || 25);
const PLAYER_NAME = 'CameraBot';

// The viewport is the ENGINE'S RENDER RESOLUTION (the loader resyncs the
// canvas to it), so it is also the capture host's frame cost. 640x360 is
// small enough to be cheap and big enough for the landing UI to be
// clickable.
const VIEWPORT = { width: 640, height: 360 };
// The size a background video actually needs.
const CAPTURE_SIZE = { width: 480, height: 270 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The engine's console, as the page sees it. */
const consoleLines = [];
function linesSince(mark) {
  return consoleLines.slice(mark);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  page.on('console', (m) => consoleLines.push(m.text()));

  const report = { url: URL, out: OUT };

  try {
    console.log(`camera-spike: ${URL}`);
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    // 1. Wait for the fleet, the way a player does.
    const fleet = await waitForFleet(page);
    console.log(`  the fleet: ${fleet.servers} server(s) after ${Math.round(fleet.waitedMs / 1000)}s`);
    if (!fleet.ok) throw new Error('the rig published no server');

    // 2. Join, the way a player does.
    await page.click('.ts-landing__play');
    const identity = await confirmIdentity(page, PLAYER_NAME);
    if (!identity.appeared) throw new Error('the pre-join identity modal never appeared');
    console.log('  joined as ' + PLAYER_NAME);

    // 3. The engine's OWN proof of a handshake: the server's banner.
    //    The engine prints it the moment the game server answers.
    let banner = null;
    const t0 = Date.now();
    while (!banner && Date.now() - t0 < 120_000) {
      await sleep(1000);
      banner =
        consoleLines.find((l) => /Server #\d+/.test(l))?.trim().slice(0, 100) || null;
      if (banner) break;
      const st = await page.evaluate(() => {
        const c = document.getElementById('canvas');
        const em = window.__xash && window.__xash.em;
        let heap = 0;
        try {
          heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
        } catch (e) {}
        return { canvas: c ? [c.width, c.height] : null, heap };
      });
      if (st.canvas && st.canvas[0] > 300 && st.heap > 0 && !banner) {
        // The engine is up but the handshake has not landed yet.
        if (Date.now() - t0 > 30_000) {
          console.log(
            `  the engine is up (canvas ${st.canvas.join('x')}, heap ${(st.heap / 1048576).toFixed(0)}MB)` +
              ' — waiting for the banner'
          );
        }
      }
    }
    report.banner = banner;
    report.handshakeSeconds = Math.round((Date.now() - t0) / 1000);
    if (!banner) throw new Error('the server never answered the handshake');
    console.log(`  the server's banner: "${banner}" after ${report.handshakeSeconds}s`);

    // 4. What does the ENGINE think it is? Every probe is a console
    //    command and every answer is the engine's own stdout.
    const exec = async (cmd, waitMs = 700) => {
      const mark = consoleLines.length;
      const ok = await page.evaluate((c) => {
        try {
          window.__xash.Cmd_ExecuteString(c);
          return true;
        } catch (e) {
          return false;
        }
      }, cmd);
      await sleep(waitMs);
      const said = linesSince(mark).filter((l) => l.trim());
      console.log(`  > ${cmd}`);
      for (const l of said.slice(0, 6)) console.log(`      ${l.slice(0, 160)}`);
      if (!said.length) console.log('      (no output)');
      return said;
    };

    // What the page can see of the engine at all.
    report.engineExports = await page.evaluate(() => {
      try {
        return Object.keys(window.__xash || {}).filter((k) => /cmd|cvar|heap|fs|arg|net|cl_/i.test(k));
      } catch (e) {
        return [];
      }
    });
    console.log('  engine exports of interest: ' + (report.engineExports.join(', ') || 'none'));

    // (a) THE SPECTATE-ONLY PROBE. `specmode` with no argument answers
    //     "specmode only in HLTV mode available." when the client is NOT
    //     spectate-only, and prints its usage when it is. That is the
    //     engine's own answer, not an inference.
    console.log('\n  --- (a) is this client spectate-only?');
    const probe = await exec('specmode');
    report.spectateOnly = !/only in HLTV mode available/i.test(probe.join('\n'));
    report.spectateOnlyEvidence = probe.join(' | ').slice(0, 300);
    console.log(
      `  => spectate-only: ${report.spectateOnly ? 'YES' : 'NO'} (${report.spectateOnlyEvidence})`
    );

    // The dev scripted-input gate: the port's own automation surface.
    await exec('ts_dev_scriptinput 1');
    await exec('cvarlist ts_dev_scriptinput');
    await exec('cvarlist specmode');
    await exec('cvarlist sv_cheats');

    // Try to become one. `ts_join_team 2` is the port's own command.
    console.log('\n  --- (b) can the client become the camera?');
    await exec('ts_join_team 2');
    await sleep(1500);
    await exec('specmode 2');
    await sleep(1000);
    await exec('specmode');
    await exec('cvarlist specmode');

    // 5. CAPTURE. The compositor's output — works with WebGL, no engine
    //    cooperation, no preserveDrawingBuffer.
    console.log(`\n  --- (c) capturing ${CAPTURE_SECONDS}s at ${CAPTURE_SIZE.width}x${CAPTURE_SIZE.height}`);
    let frameNo = 0;
    const sizes = [];
    const stamps = [];
    await page.screencast.start({
      size: CAPTURE_SIZE,
      path: path.join(OUT, 'session.webm'),
      onFrame: async ({ data, timestamp }) => {
        frameNo += 1;
        sizes.push(data.length);
        stamps.push(timestamp);
        if (frameNo <= 400) {
          fs.writeFileSync(path.join(OUT, `frame-${String(frameNo).padStart(4, '0')}.jpg`), data);
        }
      },
    });
    await sleep(CAPTURE_SECONDS * 1000);
    await page.screencast.stop();

    const avg = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
    report.frames = frameNo;
    report.avgFrameBytes = Math.round(avg);
    report.minFrameBytes = sizes.length ? Math.min(...sizes) : 0;
    report.maxFrameBytes = sizes.length ? Math.max(...sizes) : 0;
    report.fps = Math.round(frameNo / CAPTURE_SECONDS);
    report.perViewerKBps = Math.round(((avg * report.fps) / 1024) * 10) / 10;

    console.log(
      `  captured ${frameNo} frames (~${report.fps}/s), avg ${(avg / 1024).toFixed(1)}KB ` +
        `(min ${(report.minFrameBytes / 1024).toFixed(1)}KB, max ${(report.maxFrameBytes / 1024).toFixed(1)}KB)`
    );
    console.log(`  => per-viewer: ~${report.perViewerKBps} KB/s at ${report.fps} fps`);

    // Did the camera MOVE? Frames that differ a lot are a camera that cut.
    let changed = 0;
    for (let i = 1; i < sizes.length; i++) {
      if (Math.abs(sizes[i] - sizes[i - 1]) > Math.max(512, avg * 0.15)) changed += 1;
    }
    report.framesChanged = changed;
    console.log(
      `  frames that differ from the one before: ${changed}/${sizes.length - 1} ` +
        `(${(100 * changed / Math.max(1, sizes.length - 1)).toFixed(0)}% — a cutting camera changes a lot)`
    );

    // The tail of the engine's console: the director and the spectator HUD.
    report.consoleTail = consoleLines.slice(-40);
    console.log('\n  --- the engine console, last 40 lines');
    for (const l of report.consoleTail) console.log(`      ${l.slice(0, 160)}`);

    report.pageErrors = pageErrors.slice(0, 10);
    report.ok = true;
  } catch (e) {
    report.ok = false;
    report.error = String(e).slice(0, 400);
    console.log('  SPIKE ERROR: ' + report.error);
    console.log('  --- the engine console, last 30 lines');
    for (const l of consoleLines.slice(-30)) console.log(`      ${l.slice(0, 160)}`);
  } finally {
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`\n  report: ${path.join(OUT, 'report.json')}`);
    await browser.close().catch(() => {});
  }
  process.exit(report.ok ? 0 : 1);
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
