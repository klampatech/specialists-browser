/**
 * THE EXPORT RECORDS THE GEOMETRY.
 *
 * WHY THIS FILE EXISTS
 * ---------------------
 * On 2026-11-21 Kyle play-tested the client on his gaming rig and sent
 * the export. It said the game was drawing "1274x1303 device pixels" --
 * ALMOST SQUARE -- on a 16:9 display, and there was no way to tell from
 * the file whether that was his desktop's own shape, the client's
 * resolution policy doing something odd, or a window that was not
 * fullscreen.
 *
 * The export recorded the canvas and nothing else. The resolution policy
 * has FOUR numbers in it, and a file with only the last one cannot
 * explain the other three:
 *
 *   the DISPLAY   what `window.screen` says   -- what 'auto' means
 *   the BOX       the canvas's CSS size        -- what the browser shows
 *   the MODE      what the engine was told     -- what it renders
 *   the BACKING   the canvas's drawing buffer  -- what it costs
 *
 * So the export records all four, plus the player's choice: "is 'auto'
 * really native?" is a question the file has to answer by itself.
 *
 * THE HARNESS
 * -----------
 * A fake browser with a real shape: a 2560x1440 display, a fullscreen
 * window 2560x1400 (a browser has no chrome in fullscreen, but it has a
 * taskbar it does not cover, and the export must not care WHY the
 * window is shorter than the display), and a canvas filling the window.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const COLLECT_TS = join(WEBXASH, 'src', 'services', 'perf-collect.ts');
const VIDEO_TS = join(WEBXASH, 'src', 'services', 'video-settings.ts');

if (!existsSync(COLLECT_TS) || !existsSync(VIDEO_TS)) {
  throw new Error(
    'the webxash submodule is not checked out — run ' +
      '`git submodule update --init --recursive`. This test reads the ' +
      'frontend source, so it cannot pass without it.',
  );
}

const DISPLAY = { width: 2560, height: 1440 };
const WINDOW = { width: 2560, height: 1400 };

/**
 * A PAGE, in a copy of the services directory.
 *
 * A copy, because Node caches modules by URL and these modules keep
 * state — and because the client's own services import each other by
 * relative path, which only resolves inside the tree.
 */
let pageCounter = 0;
async function loadPage() {
  const dir = mkdtempSync(
    join(tmpdir(), `perf-geometry-${process.pid}-${pageCounter++}-`),
  );
  cpSync(join(WEBXASH, 'src', 'services'), dir, { recursive: true });

  const canvas = {
    width: WINDOW.width,
    height: WINDOW.height,
    clientWidth: WINDOW.width,
    clientHeight: WINDOW.height,
    getContext: () => null,
  };
  const doc = {
    getElementById: (id) => (id === 'canvas' ? canvas : null),
    createElement: () => ({ width: 0, height: 0, getContext: () => null }),
  };
  const win = {
    screen: { width: DISPLAY.width, height: DISPLAY.height },
    innerWidth: WINDOW.width,
    innerHeight: WINDOW.height,
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
  };

  const saved = {
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    sessionStorage: Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage'),
  };
  Object.defineProperty(globalThis, 'window', {
    value: win,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: doc,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: undefined,
    configurable: true,
    writable: true,
  });
  const restore = () => {
    for (const key of ['window', 'document', 'sessionStorage']) {
      if (saved[key]) {
        Object.defineProperty(globalThis, key, saved[key]);
      } else {
        delete globalThis[key];
      }
    }
  };
  try {
    const collect = await import(
      pathToFileURL(join(dir, 'perf-collect.ts')).href
    );
    const video = await import(
      pathToFileURL(join(dir, 'video-settings.ts')).href
    );
    // The globals stay installed: these modules read the browser WHEN
    // THEY ARE CALLED, not when they are imported, and the facts are
    // gathered after the import.
    return { collect, video, restore };
  } catch (e) {
    restore();
    throw e;
  }
}

test('the export records the display, the window, the box, the mode and the choice', async () => {
  const { collect, restore } = await loadPage();
  try {
  const facts = collect.collectLivePerfFacts();

  assert.ok(facts.display, 'the facts must carry the geometry');
  const d = facts.display;

  // THE DISPLAY: what 'auto' resolves to.
  assert.equal(d.displayWidth, DISPLAY.width);
  assert.equal(d.displayHeight, DISPLAY.height);

  // THE WINDOW: the browser's inner size, which is NOT the display's.
  assert.equal(d.windowInnerWidth, WINDOW.width);
  assert.equal(d.windowInnerHeight, WINDOW.height);

  // THE BOX: the canvas's CSS box — the cap the mode is fitted into.
  assert.equal(d.canvasBoxWidth, WINDOW.width);
  assert.equal(d.canvasBoxHeight, WINDOW.height);

  // THE MODE: what the engine was told to render at.
  assert.equal(d.modeWidth, WINDOW.width);
  assert.equal(d.modeHeight, WINDOW.height);

  // AND THE CHOICE.
  assert.equal(d.resolutionChoice, 'auto');
  } finally {
    restore();
  }
});

test('the export says WHICH mode the player asked for', async () => {
  const { collect, video, restore } = await loadPage();
  try {
    video.setCurrentResolutionChoice('640x360');
    const facts = collect.collectLivePerfFacts();
    assert.equal(facts.display.resolutionChoice, '640x360');
  } finally {
    restore();
  }
});

test('the exported file carries the geometry, not just the canvas', async () => {
  const { collect, restore } = await loadPage();
  try {
    const log = collect.buildPerfLog();
    assert.ok(log.display, 'the exported file must carry the geometry');
    assert.equal(log.display.displayWidth, DISPLAY.width);
    assert.equal(log.display.canvasBoxHeight, WINDOW.height);
  } finally {
    restore();
  }
});

test("'auto' is the display's own size, and the export says so", async () => {
  const { video, restore } = await loadPage();
  try {
  // The policy and the export have to agree about what 'auto' means, or
  // the file says "native" while the client renders something else.
  const display = video.detectDisplay();
  assert.equal(display.width, DISPLAY.width);
  assert.deepEqual(video.resolveRenderResolution('auto', display), {
    width: DISPLAY.width,
    height: DISPLAY.height,
  });
  } finally {
    restore();
  }
});




test('the geometry survives the trip through the session, to the landing page', async () => {
  const { collect, restore } = await loadPage();
  try {
    // THE EXPORT BUTTON IS ON THE LANDING PAGE, so the geometry has to
    // survive the page load that ends the game. This is that path: a
    // snapshot in sessionStorage, read back on a page that has no
    // engine and a 300x150 placeholder canvas.
    const map = new Map();
    globalThis.sessionStorage = {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
      clear: () => map.clear(),
      key: (i) => [...map.keys()][i] ?? null,
      get length() {
        return map.size;
      },
    };
    globalThis.sessionStorage.setItem(
      'xash.perf.session.v1',
      JSON.stringify({
        engineWorkMs: 4.5,
        displayHz: 60,
        measuredAt: Date.now(),
        backingWidth: WINDOW.width,
        backingHeight: WINDOW.height,
        display: {
          displayWidth: DISPLAY.width,
          displayHeight: DISPLAY.height,
          windowInnerWidth: WINDOW.width,
          windowInnerHeight: WINDOW.height,
          canvasBoxWidth: WINDOW.width,
          canvasBoxHeight: WINDOW.height,
          modeWidth: WINDOW.width,
          modeHeight: WINDOW.height,
          resolutionChoice: 'auto',
        },
      }),
    );

    const session = collect.readPerfSession();
    assert.ok(session, 'the session must be restored');
    assert.ok(session.display, 'the geometry must survive the session');
    assert.equal(session.display.displayWidth, DISPLAY.width);
    assert.equal(session.display.resolutionChoice, 'auto');

    const log = collect.buildPerfLog();
    assert.ok(log.display, 'the export must carry the restored geometry');
    assert.equal(log.display.displayHeight, DISPLAY.height);
  } finally {
    restore();
  }
});