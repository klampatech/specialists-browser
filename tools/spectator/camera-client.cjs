#!/usr/bin/env node
/**
 * camera-client.cjs — the permanent camera.
 *
 * A headless Chromium that stays connected to the game forever, rides the
 * spectator camera, and pushes the frames it renders to the relay.
 *
 * WHAT IT IS
 * ----------
 * One browser, one game connection, one stream. Every visitor to the
 * landing page watches THIS camera, so the cost per visitor is bandwidth
 * and nothing else.
 *
 * THE CAMERA IS A REAL OBSERVER
 * -----------------------------
 * The client joins the game, joins the spectator team, and selects the
 * port's roaming camera (`ts_specmode 3`). It does not fight, it is not a
 * player, and the registry does not count it as a human.
 *
 * THE PERSISTENT PROFILE IS NOT OPTIONAL
 * ---------------------------------------
 * The game archive is 493 MB and lives on Cloudflare R2. Without a
 * persistent profile every restart would fetch it again — 493 MB per
 * restart, on a camera that is meant to survive a crash.
 *
 * THE HEALTH IS "FRAMES ARE FLOWING"
 * ----------------------------------
 * A browser whose GPU process died still has a PID. This client watches
 * the frame clock: if no frame has been produced for a few seconds, it
 * tears the browser down and starts again.
 *
 * USAGE
 *   node tools/spectator/camera-client.cjs [url] [relayUrl]
 */

const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const URL = process.argv[2] || 'http://127.0.0.1:5175/';
const RELAY = process.argv[3] || 'http://127.0.0.1:5180';
const PROFILE = process.env.CAMERA_PROFILE || path.join(os.homedir(), '.cache/bulletballet-camera');
const NAME = process.env.CAMERA_NAME || 'Camera';

// The frame the page actually needs: a background behind a hero.
// The capture must be 16:9 — the landing page's stage is — and big enough
// that the browser's upscale to a 1500px hero is not a mush. Playwright
// scales the screencast to FIT the size box, so a 4:3 page asked for a
// 16:9 box comes back 4:3 and small. The viewport is therefore pinned to
// the capture size, not merely hoped about.
const FRAME_W = Number(process.env.CAMERA_WIDTH || 800);
const FRAME_H = Number(process.env.CAMERA_HEIGHT || 450);
const FPS = Number(process.env.CAMERA_FPS || 30);
const QUALITY = Number(process.env.CAMERA_QUALITY || 45);

/**
 * What the camera does.
 *
 * 5 = in-eye: the camera IS a player's eyes, and the server points it at
 *     the fight (a killer or a victim becomes the spectator target). This
 *     is the television camera — it can never spin, and it can never be
 *     boring.
 * 3 = roaming: the free camera. It flies where it is told to.
 */
const CAMERA_MODE = Number(process.env.CAMERA_MODE || 5);

const BATCH_MS = 250;
const STALE_MS = 8000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The frames waiting to go to the relay, as one length-prefixed body. */
let pending = [];
function buildBatch() {
  if (!pending.length) return null;
  const parts = [];
  for (const f of pending) {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(f.length, 0);
    parts.push(head, f);
  }
  pending = [];
  return Buffer.concat(parts);
}

async function pushBatch() {
  const body = buildBatch();
  if (!body) return;
  try {
    await fetch(`${RELAY}/frames`, { method: 'POST', body });
  } catch (e) {
    console.error('  relay push failed:', String(e).slice(0, 120));
  }
}

/**
 * Push ONE frame, now.
 *
 * Batching frames and posting them every 250 ms is how the stream ended
 * up at 23 fps with a median inter-arrival of 0 ms and a p90 of 244 ms:
 * seven frames landed in the same tick (only the last one is ever seen)
 * and then the viewer waited a quarter of a second for the next lot.
 * That is judder, and it looks exactly like a low frame rate. Frames go
 * out one at a time, as they are produced.
 */
let inFlight = 0;
async function pushOne(frame) {
  if (inFlight >= 4) return; // the relay is backed up; drop rather than queue
  const head = Buffer.alloc(4);
  head.writeUInt32BE(frame.length, 0);
  const body = Buffer.concat([head, frame]);
  inFlight += 1;
  try {
    await fetch(`${RELAY}/frames`, { method: 'POST', body });
  } catch (e) {
    console.error('  relay push failed:', String(e).slice(0, 120));
  } finally {
    inFlight -= 1;
  }
}

async function runOnce() {
  fs.mkdirSync(PROFILE, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    args: [
      '--no-sandbox',
      // A persistent context keeps a real window, and the window's size
      // is what the screencast captures. setViewportSize alone does not move
      // it: the page stayed 4:3 and the frames came back 720x540.
      `--window-size=${FRAME_W},${FRAME_H}`,
      '--window-position=0,0',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      // USE THE REAL GPU.
      //
      // Headless Chromium defaults to SwiftShader, and a software
      // rasteriser filling 960x540 of game is what throttled the engine's
      // rAF to 10-20 Hz — which is what the camera's frame rate was. On
      // the AMD iGPU the same scene runs at the display's rate.
      '--use-gl=angle',
      '--use-angle=vulkan',
      '--enable-features=Vulkan',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
    ],
    viewport: { width: FRAME_W, height: FRAME_H },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  // The persistent context's viewport is not always honoured — pin it, or
  // the screencast comes back at the window's own (4:3) shape.
  await page.setViewportSize({ width: FRAME_W, height: FRAME_H });

  const consoleLines = [];
  const seenConsole = new Set();
  page.on('console', (m) => consoleLines.push(m.text()));

  const exec = async (cmd, waitMs = 400) => {
    await page
      .evaluate((c) => {
        try {
          window.__xash.Cmd_ExecuteString(c);
        } catch (e) {}
      }, cmd)
      .catch(() => {});
    await sleep(waitMs);
  };

  /**
   * A scripted key press.
   *
   * TS's anti-script protection drops every scripted `+` button unless a
   * physical key opened the gate on that frame — and a browser has no
   * physical keys, so `+jump` and `+forward` are silently discarded
   * without the port's own `ts_gate` aid, which opens the gate for the
   * frame the press lands in.
   */
  const tap = async (binding) => {
    await page
      .evaluate((b) => {
        try {
          window.__xash.Cmd_ExecuteString('ts_gate 500');
          window.__xash.Cmd_ExecuteString(b);
        } catch (e) {}
      }, binding)
      .catch(() => {});
    await sleep(120);
    await page
      .evaluate((b) => {
        try {
          window.__xash.Cmd_ExecuteString(`-${b.slice(1)}`);
        } catch (e) {}
      }, binding)
      .catch(() => {});
    await sleep(120);
  };

  const hideBuy = () =>
    page
      .evaluate(() => {
        document.querySelectorAll('.bm__frame').forEach((el) => el.remove());
      })
      .catch(() => {});

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const fleet = await waitForFleet(page);
  if (!fleet.ok) throw new Error('no server answered');
  console.log(`  in: ${fleet.servers} server(s) visible`);

  await page.click('.ts-landing__play');
  const identity = await confirmIdentity(page, NAME);
  if (!identity.appeared) throw new Error('the identity modal never appeared');

  // The engine's own proof of a handshake.
  let banner = null;
  const t0 = Date.now();
  while (!banner && Date.now() - t0 < 150_000) {
    await sleep(1000);
    banner = consoleLines.find((l) => /Server #\d+/.test(l))?.trim().slice(0, 60) || null;
  }
  if (!banner) throw new Error('the server never answered the handshake');
  console.log(`  in the game after ${Math.round((Date.now() - t0) / 1000)}s: ${banner}`);

  // Become the camera.
  await exec('ts_dev_scriptinput 1');
  await exec('ts_buy_hide 1', 400);
  await hideBuy();

  // NO HUD.
  //
  // The mod's own spectator HUD lives in the bottom of the frame — the
  // camera mode, the key hints, the version block — and on the landing
  // page it lands on top of the page's own text. The engine's `nohud`
  // takes all of it: the version block, the spectator panel and the
  // kill feed. The shot is the game world and nothing else.
  await exec('hidehud 0', 200);
  await exec('nohud 1', 400);

  // ARM THE SERVER'S OBSERVER.
  //
  // The server owns the camera: every prediction frame it overwrites the
  // client's spectator mode and target with its own iuser1/iuser2. Joining
  // the spectator team is what makes the server start an observer, and a
  // fresh observer starts in CHASE_FREE — the third-person camera that
  // rides a bot.
  await exec('ts_join_team 2', 2000);

  if (CAMERA_MODE === 3) {
    // Roaming: fly forward. The turn comes later, and rarely — a camera
    // that turns every few seconds reads as a spin, which is worse than
    // a camera that drifts.
    await tap('+forward');
  }

  // THE PACER IS THE ENEMY OF A HEADLESS CAMERA.
  //
  // The client caps the engine's frame rate to the DISPLAY's refresh
  // rate. A headless browser has no display, so the measurement is
  // nonsense and the pacer settles on a tiny cap: the engine draws a
  // couple of frames a second, the screencast dutifully delivers those
  // same two frames twenty times a second, and the page looks like a
  // slideshow. Forcing everyNth=1 puts the cap back to "draw every
  // tick", which is what a camera wants.
  const pacing = await page
    .evaluate(async () => {
      try {
        await window.__xashForceFrameCap?.(1);
        return window.__xashPacing?.() ?? null;
      } catch (e) {
        return { error: String(e) };
      }
    })
    .catch((e) => ({ error: String(e) }));
  console.log(`  pacing: ${JSON.stringify(pacing)}`);

  // THE FRAMING.
  //
  // The mod's own spectator HUD lives in the bottom of the frame — the
  // camera mode, the key hints, the version block — and it lands right
  // on top of the landing page's own text. The engine's canvas is
  // `position:absolute; width:100vw; height:100vh` inside a page that
  // clips, so scaling the canvas about its TOP edge zooms the shot in
  // and pushes that strip of HUD out of the captured frame entirely.
  let zoom = Number(process.env.CAMERA_ZOOM || 1.08);
  const applyZoom = async (z) => {
    zoom = z;
    await page
      .evaluate((scale) => {
        let el = document.getElementById('__camera_zoom');
        if (!el) {
          el = document.createElement('style');
          el.id = '__camera_zoom';
          document.head.appendChild(el);
        }
        el.textContent =
          scale > 1.001
            ? `#canvas { transform: scale(${scale}); transform-origin: center top; }`
            : '';
      }, z)
      .catch(() => {});
  };
  await applyZoom(zoom);
  console.log(`  framing: zoom ${zoom}`);

  let lastFrameAt = Date.now();
  let frames = 0;
  // Motion detection. A frozen camera is byte-identical frame to frame —
  // that is how the server's observer wipe shows up from the outside.
  let lastHash = null;
  let lastMotionAt = Date.now();
  let lastTourAt = Date.now();
  let lastPushAt = 0;
  let rawFrames = 0;
  let rawCounter = 0;
  let rawRate = 60;
  let lastRawAt = 0;
  let freezeCount = 0;
  const hashFrame = (buf) => {
    let h = 0;
    for (let i = 0; i < buf.length; i += 61) h = (Math.imul(h, 31) + buf[i]) >>> 0;
    return h;
  };
  await page.screencast.start({
    size: { width: FRAME_W, height: FRAME_H },
    fps: FPS,
    quality: QUALITY,
    onFrame: async ({ data }) => {
      rawFrames += 1;
      const h = hashFrame(data);
      if (h !== lastHash) {
        lastHash = h;
        lastMotionAt = Date.now();
      }
      // The screencast produces frames as fast as the page renders them —
      // on the GPU that is 60 a second — and every one of them costs a
      // viewer's bandwidth.
      //
      // The rate is controlled by COUNT, not by the clock: the screencast
      // delivers in bursts, so a wall-clock gate keeps one frame per
      // BURST (23 a second when it should be 30) and the stream judders.
      // Counting gives an exact rate, and the divisor follows the
      // measured source rate so the delivery rate stays put even if the
      // engine slows down.
      const now = Date.now();
      if (lastRawAt) rawRate = rawRate * 0.85 + (1000 / (now - lastRawAt)) * 0.15;
      lastRawAt = now;
      const skip = Math.max(1, Math.round(rawRate / FPS));
      rawCounter += 1;
      if (rawCounter % skip !== 0) return;
      pushOne(data);
      frames += 1;
      lastFrameAt = Date.now();
    },
  });

  // The push loop and the health check. Frames are pushed as they are
  // produced (see pushOne); this interval only flushes anything the
  // batch path left behind.
  const pusher = setInterval(pushBatch, BATCH_MS);
  // The pacing watchdog can re-measure the (absent) display and put its
  // own tiny cap back, so the override is re-asserted on its own clock.
  const pacer = setInterval(() => {
    page.evaluate(() => window.__xashForceFrameCap?.(1)).catch(() => {});
  }, 5000);
  const keepAlive = setInterval(async () => {
    hideBuy();
    console.log(
      `  raw screencast ${rawFrames} frames, ${frames} pushed, ` +
        `${rawFrames - frames} dropped by the ${FPS}fps cap`
    );
    rawFrames = 0;
    frames = 0;

    // A live command channel. Write a console command into this file and
    // the camera runs it: tuning the framing or the HUD should not need a
    // browser restart.
    try {
      const cmdFile = path.join(PROFILE, 'command.txt');
      const cmd = fs.readFileSync(cmdFile, 'utf8').trim();
      if (cmd) {
        fs.writeFileSync(cmdFile, '');
        console.log(`  [cmd] ${cmd}`);
        for (const line of cmd.split('\n')) {
          const one = line.trim();
          if (!one) continue;
          const zoomCmd = one.match(/^zoom\s+([\d.]+)$/i);
          if (zoomCmd) {
            await applyZoom(Number(zoomCmd[1]));
            console.log(`  [cmd] framing is now zoom ${zoom}`);
            continue;
          }
          await exec(one, 500);
        }
      }
    } catch (e) {
      /* no command file yet */
    }
    // The engine's own words, when they change: a spectator's HUD text
    // ("Press Fire to Play!", the mode label) is the only way to see what
    // the server thinks this client is. The bot chatter is not.
    const fresh = consoleLines.filter(
      (l) => !seenConsole.has(l) && !/killed|HS_THINK|ts_gate: gate open/.test(l)
    );
    for (const l of consoleLines) seenConsole.add(l);
    if (fresh.length) {
      console.log(`  [engine] ${fresh.slice(-4).join(' | ').slice(0, 240)}`);
    }
  }, 5000);

  const pageSize = await page
    .evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }))
    .catch(() => ({ w: 0, h: 0 }));
  console.log(
    `  streaming at ${FPS}fps ${FRAME_W}x${FRAME_H} to ${RELAY} ` +
      `(page is ${pageSize.w}x${pageSize.h}, mode ${CAMERA_MODE})`
  );

  for (;;) {
    await sleep(1000);
    if (Date.now() - lastFrameAt > STALE_MS) {
      throw new Error(`no frame for ${Math.round((Date.now() - lastFrameAt) / 1000)}s`);
    }
    // The page may have been navigated away, or the engine may have died.
    const alive = await page
      .evaluate(() => !!window.__xash)
      .catch(() => false);
    if (!alive) throw new Error('the engine is gone');

    // A FROZEN CAMERA IS A TARGET THE CLIENT CANNOT SEE.
    //
    // The client's chase camera follows the target's entity state, and it
    // only gets that state while the target is in its PVS. The server
    // moves the observer's own entity to the target's position when it
    // PICKS a target — once — and then leaves it there. As the target
    // walks away, the observer's origin (and so the PVS) stays behind, the
    // target stops being sent, and the client keeps its last camera
    // forever. The server's own cure is FORWARD: "next player" picks a new
    // target and moves the observer onto it.
    //
    // If the observer state itself was wiped (the server clears iuser1 and
    // iuser2 when an observer respawns, and its observer logic only runs
    // while iuser1 is set), FORWARD does nothing — the cure then is to
    // join the spectator team again.
    const frozenMs = Date.now() - lastMotionAt;
    if (frozenMs > 8000) {
      freezeCount += 1;
      if (freezeCount >= 3) {
        console.log(`  the camera is frozen (${Math.round(frozenMs / 1000)}s) — re-joining the observer`);
        await exec('ts_join_team 2', 2000);
        freezeCount = 0;
      } else {
        console.log(`  the camera is frozen (${Math.round(frozenMs / 1000)}s) — taking the next player`);
        await tap('+forward');
      }
      lastMotionAt = Date.now();
      continue;
    }
    if (freezeCount > 0) freezeCount = 0;

    // Change the shot now and then: FORWARD is the server's "next player".
    // A broadcast camera that never changes its mind is a webcam.
    if (Date.now() - lastTourAt > 25000) {
      lastTourAt = Date.now();
      await tap('+forward');
    }
  }
  // unreachable, but the cleanup below must run:
  // eslint-disable-next-line no-unreachable
  clearInterval(pusher);
  clearInterval(keepAlive);
}

(async () => {
  console.log(`camera-client: ${URL} -> ${RELAY}`);
  console.log(`  profile: ${PROFILE}`);
  for (;;) {
    try {
      await runOnce();
    } catch (e) {
      console.error(`  camera stopped: ${String(e).slice(0, 160)}`);
      console.error('  restarting in 5s');
    }
    await sleep(5000);
  }
})();
