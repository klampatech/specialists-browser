#!/usr/bin/env node
/**
 * camera-observer-spike.cjs — the real camera: an OBSERVER with a free
 * roaming camera, captured live.
 *
 * WHAT CHANGED SINCE THE LAST SPIKE
 * ---------------------------------
 * The first spike could not pick a camera mode: `specmode` answered
 * "specmode only in HLTV mode available.", because the engine only marks
 * a client spectate-only when the SERVER sends it an HLTV_ACTIVE message
 * (upstream `cl_parse.c`, `CL_ParseHLTV`), and the port's server never
 * sends one.
 *
 * So the port's client grew `ts_specmode` — the same mode selector
 * `specmode` performs, without the HLTV gate, gated on the same dev
 * scripted-input switch as `ts_join_team` and `ts_respawn`. That command
 * exists ONLY in the rebuilt WASM, so its answer is also the proof that
 * the rebuilt WASM is the one running.
 *
 * THE SEQUENCE
 *   ts_dev_scriptinput 1   the port's automation switch
 *   ts_join_team 2         the server puts the client on the spectator team
 *   ts_specmode 3          the roaming camera (5 is in-eye, 2 is the
 *                          director's locked view)
 *   +forward / +left       the camera flies, through the engine's own
 *                          console, the same commands a key's binding runs
 *
 * IT NEVER TOUCHES PRODUCTION. The rig only.
 */

const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const fs = require('node:fs');
const path = require('node:path');

const URL = process.argv[2] || 'http://127.0.0.1:5175/';
const OUT = process.argv[3] || '/tmp/camera-observer';
const FLY_MS = Number(process.argv[4] || 25_000);

const VIEWPORT = { width: 640, height: 360 };
const CAPTURE_SIZE = { width: 480, height: 270 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const report = { url: URL, out: OUT };

  const exec = async (cmd, waitMs = 500) => {
    const mark = consoleLines.length;
    await page
      .evaluate((c) => {
        try {
          window.__xash.Cmd_ExecuteString(c);
        } catch (e) {}
      }, cmd)
      .catch(() => {});
    await sleep(waitMs);
    return consoleLines.slice(mark).filter((l) => l.trim());
  };

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const fleet = await waitForFleet(page);
    if (!fleet.ok) throw new Error('no server answered');
    console.log(`  the fleet: ${fleet.servers} server(s)`);

    await page.click('.ts-landing__play');
    const identity = await confirmIdentity(page, 'CameraBot');
    if (!identity.appeared) throw new Error('the identity modal never appeared');

    let banner = null;
    const t0 = Date.now();
    while (!banner && Date.now() - t0 < 150_000) {
      await sleep(1000);
      banner = consoleLines.find((l) => /Server #\d+/.test(l))?.trim().slice(0, 90) || null;
    }
    if (!banner) throw new Error('the server never answered the handshake');
    console.log(`  in the game: "${banner}" after ${Math.round((Date.now() - t0) / 1000)}s`);

    // The automation switch, the spectator team, the camera mode.
    await exec('ts_dev_scriptinput 1');
    const joined = await exec('ts_join_team 2', 2000);
    console.log('  > ts_join_team 2');
    joined.slice(0, 3).forEach((l) => console.log(`      ${l.slice(0, 140)}`));

    const mode = await exec('ts_specmode 3', 1200);
    console.log('  > ts_specmode 3');
    mode.slice(0, 4).forEach((l) => console.log(`      ${l.slice(0, 140)}`));
    report.newWasm = mode.some((l) => /ts_specmode/.test(l));
    report.cameraMode = report.newWasm ? 'roaming (3)' : 'NOT SET';
    console.log(`  => the rebuilt WASM is running: ${report.newWasm ? 'YES' : 'NO'}`);

    // The buy menu opens for an observer and it covers the view. Hide it.
    await exec('ts_buy_hide 1', 800);
    // The DOM buy panel is a Vue overlay over the canvas, and the canvas
    // menu's hidden flag does not touch it. A camera has no use for it.
    const hideBuy = () =>
      page
        .evaluate(() => {
          document.querySelectorAll('.bm__frame').forEach((el) => el.remove());
          return document.querySelectorAll('.bm__frame').length;
        })
        .catch(() => -1);
    await hideBuy();

    // Fly. The camera is the observer's, so +forward moves it and +left
    // turns it — the same commands the W and A key bindings run.
    await exec('+forward', 300);
    await exec('+left', 300);

    let frameNo = 0;
    const sizes = [];
    const hashes = [];
    await page.screencast.start({
      size: CAPTURE_SIZE,
      path: path.join(OUT, 'observer.webm'),
      onFrame: async ({ data }) => {
        frameNo += 1;
        sizes.push(data.length);
        let h = 0;
        for (let i = 0; i < data.length; i += 97) h = (h * 31 + data[i]) >>> 0;
        hashes.push(h);
        if (frameNo <= 900) {
          fs.writeFileSync(path.join(OUT, `frame-${String(frameNo).padStart(4, '0')}.jpg`), data);
        }
      },
    });

    // Fly for a while, turning every few seconds so the camera sweeps.
    const until = Date.now() + FLY_MS;
    while (Date.now() < until) {
      await sleep(4000);
      await hideBuy();
      await exec('+right', 200);
      await exec('-left', 200);
      await exec('+jump', 150);
    }
    await exec('-forward', 200);
    await exec('-right', 200);
    await sleep(1200);
    await page.screencast.stop();

    let changed = 0;
    for (let i = 1; i < hashes.length; i++) if (hashes[i] !== hashes[i - 1]) changed += 1;
    const avg = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;

    report.frames = frameNo;
    report.avgFrameBytes = Math.round(avg);
    report.fps = Math.round(frameNo / (FLY_MS / 1000));
    report.framesChanged = changed;
    report.perViewerKBps = Math.round(((avg * report.fps) / 1024) * 10) / 10;

    console.log(
      `  captured ${frameNo} frames (~${report.fps}/s, avg ${(avg / 1024).toFixed(1)}KB), ` +
        `${changed}/${hashes.length - 1} DIFFER (${(100 * changed / Math.max(1, hashes.length - 1)).toFixed(0)}%)`
    );
    console.log(`  => per-viewer: ~${report.perViewerKBps} KB/s`);

    const interesting = consoleLines.filter((l) => /specmode|spec_mode|place_camera|killed|observer|gate/i.test(l));
    console.log('\n  --- engine lines worth reading');
    for (const l of interesting.slice(-20)) console.log(`      ${l.slice(0, 150)}`);

    report.ok = report.newWasm && changed > hashes.length * 0.05;
  } catch (e) {
    report.ok = false;
    report.error = String(e).slice(0, 300);
    console.log('  SPIKE ERROR: ' + report.error);
    for (const l of consoleLines.slice(-20)) console.log(`      ${l.slice(0, 150)}`);
  } finally {
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close().catch(() => {});
    console.log(`\n  report: ${path.join(OUT, 'report.json')}`);
  }
  process.exit(report.ok ? 0 : 1);
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
