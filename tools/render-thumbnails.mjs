#!/usr/bin/env node
/**
 * Render the player-model thumbnails.
 *
 * WHAT IT DOES
 * ------------
 * Starts Vite on the babylon app, drives a headless Chromium at
 * thumbnail.html, and writes one 256x256 PNG per player model into
 * webxash/public/models/.
 *
 * WHY A BROWSER AT ALL
 * --------------------
 * The point of these thumbnails is that they are RENDERED FROM THE
 * MODEL — the real .mdl is parsed, the real geometry is built and the
 * real skin is applied. There is no offline renderer for that here:
 * Babylon's mesh building, its texture upload and its renderer all
 * live in the browser. So the thumbnail IS a browser render, and the
 * driver is a browser driving a browser.
 *
 * WHY THE MODEL HAS TO BE POSED FIRST
 * -----------------------------------
 * A studio model's vertices are stored in BONE-LOCAL space. Rendering
 * them without applying the bones' transforms gives an EXPLODED model
 * — the limbs in the wrong place, the figure a heap of disconnected
 * pieces. The bone transform is what makes it a person.
 *
 * USAGE
 *   node tools/render-thumbnails.mjs            # all the models
 *   node tools/render-thumbnails.mjs seal merc  # just these
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BABYLON = join(ROOT, 'babylon');
const OUT_DIR = join(ROOT, 'webxash', 'public', 'models');

/**
 * Vite is a dependency of the BABYLON app, not of the repo root, so
 * it is imported from that app's own node_modules. Resolving it by
 * path rather than by bare specifier is what keeps that true.
 */
const VITE = pathToFileURL(join(BABYLON, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href;

/** The models to render. The file name is the model's own name. */
const ALL_MODELS = ['seal', 'merc', 'gordon', 'laurence', 'agent', 'hitman', 'castor'];

/** Where Chromium lives. */
const CHROME_CANDIDATES = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/opt/google/chrome/chrome',
];

function findChrome() {
  for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p;
  throw new Error(`no Chromium found (looked in ${CHROME_CANDIDATES.join(', ')})`);
}

/**
 * Drive Chromium over the DevTools protocol.
 *
 * A raw CDP client rather than Playwright: Playwright is not
 * installed here, and a browser that can screenshot a canvas and
 * evaluate an expression in the page is a small amount of protocol.
 */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  /**
   * Send a command, optionally scoped to a session.
   *
   * A session is a separate execution context (a tab). The message
   * carries `sessionId` and the reply comes back on the same socket,
   * so one socket carries both browser-scoped and page-scoped
   * commands.
   */
  send(method, params = {}, sessionId = undefined) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const msg = { id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      this.ws.send(JSON.stringify(msg));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 60_000);
    });
  }
}

/** Open a CDP WebSocket to a debugging endpoint. */
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(new Cdp(ws)));
    ws.addEventListener('error', () => reject(new Error(`cannot connect to ${url}`)));
  });
}

async function main() {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const models = wanted.length ? wanted : ALL_MODELS;

  const chrome = findChrome();
  console.log(`chromium: ${chrome}`);

  // The dev server. It serves the babylon app, which has the models
  // in public/ and the thumbnail page at /thumbnail.html.
  const { createServer } = await import(VITE);
  const vite = await createServer({
    root: BABYLON,
    logLevel: 'warn',
    server: { port: 5199, strictPort: true },
  });
  await vite.listen();
  const base = `http://127.0.0.1:5199`;
  console.log(`vite: ${base}`);

  // The browser, with its debugging port open.
  //
  // WebGL has to be FORCED on. Headless Chromium has no GPU here, and
  // without these flags Babylon refuses to start ("WebGL not
  // supported"). SwiftShader is Chromium's software rasteriser, so the
  // render is done on the CPU — slower, but it produces the same
  // image, and it is the only way to render at all in this
  // environment.
  const profile = `/tmp/thumb-profile-${Date.now()}`;
  const chromeProc = spawn(
    chrome,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--no-sandbox',
      '--disable-gpu',
      '--use-gl=swiftshader',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--in-process-gpu',
      '--hide-scrollbars',
      '--disable-dev-shm-usage',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let cdp;
  try {
    // Wait for the debugging endpoint to come up.
    let target = null;
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9222/json/version');
        target = await res.json();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    if (!target) throw new Error('Chromium did not open its debugging port');
    cdp = await connect(target.webSocketDebuggerUrl);

    mkdirSync(OUT_DIR, { recursive: true });

    for (const model of models) {
      const out = await renderOne(cdp, base, model);
      writeFileSync(join(OUT_DIR, `${model}.png`), out);
      console.log(`  ${model}.png  ${out.length} bytes`);
    }
    console.log(`\nwrote ${models.length} thumbnails to ${OUT_DIR}`);
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch {
      /* already gone */
    }
    await vite.close();
  }
}

/** Load the thumbnail page for one model and screenshot the canvas. */
async function renderOne(cdp, base, model) {
  const { targetId } = await cdp.send('Target.createTarget', { url: `${base}/thumbnail.html` });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

  // A session-scoped send: the same protocol, a different socket
  // channel. Everything above is browser-scoped; this is page-scoped.
  const page = {
    send: (method, params = {}) =>
      cdp.send(method, params, sessionId),
  };

  await page.send('Page.enable');
  await page.send('Runtime.enable');

  // Wait for the page to load and for the module to register.
  let ready = false;
  for (let i = 0; i < 80; i++) {
    const r = await page.send('Runtime.evaluate', {
      expression: 'typeof window.__renderThumb === "function"',
      returnByValue: true,
    });
    if (r.result?.value === true) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw new Error(`${model}: the thumbnail page never became ready`);

  // Render.
  const res = await page.send('Runtime.evaluate', {
    expression: `window.__renderThumb(${JSON.stringify(model)})`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    throw new Error(`${model}: ${JSON.stringify(res.exceptionDetails.exception?.description || res.exceptionDetails)}`);
  }

  // Screenshot the canvas element itself, so the output is exactly
  // 256x256 whatever the page's device pixel ratio is.
  const shot = await page.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: 256, height: 256, scale: 1 },
    captureBeyondViewport: false,
  });
  await page.send('Target.closeTarget', { targetId });
  return Buffer.from(shot.data, 'base64');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
