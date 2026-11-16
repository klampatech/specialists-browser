#!/usr/bin/env node
/**
 * camera-motion-spike.cjs — can the camera MOVE?
 *
 * WHY THIS EXISTS
 * ---------------
 * The first spike proved the capture works (683 frames, 12.8 KB each, the
 * real game world in every one) and that the client can BECOME an
 * observer (`ts_join_team 2` puts it on the spectator team and the server
 * opens the buy menu). But it also proved the camera did NOT move: 0 of
 * 682 frames differed, because
 *
 *   - `specmode` is refused ("specmode only in HLTV mode available.") —
 *     the engine only marks a client spectate-only when the SERVER sends
 *     it an HLTV_ACTIVE message, and the port's server never does;
 *   - so the client stayed in the map camera, which does not move.
 *
 * A landing-page background needs a MOVING camera, so this spike asks the
 * narrow question: with the port's EXISTING scripted-input surface
 * (`ts_gate`, `+forward`, `+left`), can a headless client walk the level
 * and does the screencast follow it?
 *
 * If the answer is yes, the whole pipeline is proven with no port change,
 * and the only thing left to build is the delivery (frames -> page).
 *
 * IT NEVER TOUCHES PRODUCTION. The rig only.
 */

const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const fs = require('node:fs');
const path = require('node:path');

const URL = process.argv[2] || 'https://ci.bulletballet.dev/';
const OUT = process.argv[3] || '/tmp/camera-motion';
const WALK_MS = Number(process.argv[4] || 20_000);

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

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const fleet = await waitForFleet(page);
    if (!fleet.ok) throw new Error('the rig published no server');
    console.log(`  the fleet: ${fleet.servers} server(s)`);

    await page.click('.ts-landing__play');
    const identity = await confirmIdentity(page, 'CameraBot');
    if (!identity.appeared) throw new Error('the identity modal never appeared');

    // The engine's own proof of a handshake.
    let banner = null;
    const t0 = Date.now();
    while (!banner && Date.now() - t0 < 150_000) {
      await sleep(1000);
      banner = consoleLines.find((l) => /Server #\d+/.test(l))?.trim().slice(0, 90) || null;
    }
    if (!banner) throw new Error('the server never answered the handshake');
    console.log(`  in the game: "${banner}" after ${Math.round((Date.now() - t0) / 1000)}s`);

    const exec = async (cmd, waitMs = 400) => {
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

    // The scripted-input gate. `ts_gate <ms>` holds the port's anti-script
    // gate open so the gated `+` commands (forward, jump, attack) actually
    // press their buttons in the browser.
    await exec('ts_dev_scriptinput 1');
    console.log('  > ts_gate 60000');
    await exec('ts_gate 60000', 200);

    // WALK. `+forward` is the same command the W key's binding runs.
    console.log('  > +forward (hold)');
    await exec('+forward', 200);

    // Capture while walking.
    let frameNo = 0;
    const sizes = [];
    const hashes = [];
    await page.screencast.start({
      size: CAPTURE_SIZE,
      path: path.join(OUT, 'walk.webm'),
      onFrame: async ({ data, timestamp }) => {
        frameNo += 1;
        sizes.push(data.length);
        // A cheap fingerprint of the frame's bytes: enough to tell "the
        // picture changed" from "the picture is the same picture".
        let h = 0;
        for (let i = 0; i < data.length; i += 97) h = (h * 31 + data[i]) >>> 0;
        hashes.push(h);
        if (frameNo <= 500) {
          fs.writeFileSync(path.join(OUT, `frame-${String(frameNo).padStart(4, '0')}.jpg`), data);
        }
      },
    });

    await sleep(WALK_MS);
    await exec('-forward', 100);
    await sleep(1500);
    await page.screencast.stop();

    let changed = 0;
    for (let i = 1; i < hashes.length; i++) if (hashes[i] !== hashes[i - 1]) changed += 1;
    const avg = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;

    report.frames = frameNo;
    report.avgFrameBytes = Math.round(avg);
    report.fps = Math.round(frameNo / (WALK_MS / 1000));
    report.framesChanged = changed;
    report.perViewerKBps = Math.round(((avg * report.fps) / 1024) * 10) / 10;

    console.log(
      `  captured ${frameNo} frames (~${report.fps}/s, avg ${(avg / 1024).toFixed(1)}KB), ` +
        `${changed}/${hashes.length - 1} frames DIFFER from the one before ` +
        `(${(100 * changed / Math.max(1, hashes.length - 1)).toFixed(0)}%)`
    );
    console.log(`  => per-viewer: ~${report.perViewerKBps} KB/s`);

    // What the engine said while it walked.
    const interesting = consoleLines.filter(
      (l) => /forward|gate|scriptinput|place_camera|killed|HP|spec/i.test(l)
    );
    report.consoleTail = interesting.slice(-25);
    console.log('\n  --- engine lines worth reading');
    for (const l of report.consoleTail) console.log(`      ${l.slice(0, 150)}`);

    report.ok = changed > hashes.length * 0.05;
  } catch (e) {
    report.ok = false;
    report.error = String(e).slice(0, 300);
    console.log('  SPIKE ERROR: ' + report.error);
    for (const l of consoleLines.slice(-25)) console.log(`      ${l.slice(0, 150)}`);
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
