/**
 * THE MAP ANCHOR, AND THE EXPORT THAT CARRIES THE MATCH.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Two things the readout claimed, and both of them were wrong in the
 * same way: they knew about the MATCH and not about the MAP.
 *
 * THE WARM-UP WAS ANCHORED ON THE MATCH.
 *
 * The server rotates its map every three minutes, and a map change
 * makes the engine do at the start of a map everything it did at the
 * start of a match: load the BSP, upload the textures, compile the
 * shaders, rebuild the PVS. A reading taken in the seconds after one
 * is a picture of that, not of the machine.
 *
 * But the pacer anchored its warm-up on the engine's FIRST FRAME, so
 * after the first rotation every later window was labelled "settled" --
 * and the readout told the player the number "describes the engine at
 * steady state and not its warm-up". A 42 ms frame taken 513 seconds
 * into a match, seconds after a map load, is the opposite of steady
 * state, and the panel said it was settled.
 *
 * THE EXPORT WAS BUILT FROM THE LANDING PAGE.
 *
 * The "Export log" button lives on the landing page, and the landing
 * page has no engine: its live state is a 300x150 placeholder canvas.
 * So the export was empty BY CONSTRUCTION, on the one page where a
 * player would press it, while the match's timeline -- the thing that
 * says where the cost was and what else was happening -- died with the
 * module state the page load destroyed.
 *
 * THE HARNESS
 * -----------
 * The fake performance clock carries a TIME ORIGIN ten minutes in the
 * past, because the pacer measures the warm-up in epoch milliseconds
 * and the match's age has to be real for the anchor to mean anything.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const APPLY_TS = join(WEBXASH, 'src', 'services', 'frame-pacing-apply.ts');
const COLLECT_TS = join(WEBXASH, 'src', 'services', 'perf-collect.ts');

if (!existsSync(APPLY_TS) || !existsSync(COLLECT_TS)) {
  throw new Error(
    'the webxash submodule is not checked out — run ' +
      '`git submodule update --init --recursive`. This test reads the ' +
      'frontend source, so it cannot pass without it.'
  );
}

const SESSION_KEY = 'xash.perf.session.v1';
const TICK_MS = 1000 / 60;
const TICKS_PER_WINDOW = 41;

/** A fresh module instance per load: these modules keep state. */
let instanceCounter = 0;

/** A fake `sessionStorage`: where the snapshot lives between pages. */
function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

async function withEnv(fn) {
  const nativeQueue = [];
  let nextNativeId = 1;
  let clock = 0;

  // THE MATCH IS TEN MINUTES OLD.
  //
  // The pacer converts the performance clock to epoch milliseconds
  // through `performance.timeOrigin`, so the origin is where the age
  // of the match comes from.
  const timeOrigin = Date.now() - 600000;

  const win = {
    location: { search: '' },
    devicePixelRatio: 2,
    requestAnimationFrame(cb) {
      const id = nextNativeId++;
      nativeQueue.push({ id, cb });
      return id;
    },
    cancelAnimationFrame(id) {
      const i = nativeQueue.findIndex((e) => e.id === id);
      if (i >= 0) nativeQueue.splice(i, 1);
    },
    addEventListener() {},
    removeEventListener() {},
  };

  const perf = {
    timeOrigin,
    now() {
      clock += TICK_MS;
      return clock;
    },
  };

  const storage = makeStorage();

  /** Run one display tick. */
  function tick(time = clock) {
    const batch = nativeQueue.splice(0, nativeQueue.length);
    for (const entry of batch) entry.cb(time);
    return batch.length;
  }

  /** Load a module fresh, with the fake browser installed. */
  async function load(file, tag = 'a') {
    const url =
      pathToFileURL(file).href + `?instance=${instanceCounter++}-${tag}`;
    return await import(url);
  }

  /**
   * A PAGE LOAD, IN A COPY OF THE SERVICES DIRECTORY.
   *
   * The collector and the pacer have to be the SAME page's copies of
   * themselves: the collector reads the pacer's state, and a collector
   * that cannot see the pacer is a collector looking at a page that
   * never ran a game.
   *
   * Node caches modules by URL, so the only way to give a test its own
   * pair of instances is to give it its own DIRECTORY -- and that is
   * what a page load is anyway: a fresh set of module instances with
   * nothing carried over but `sessionStorage`.
   */
  let pageCounter = 0;
  async function loadPage() {
    const dir = mkdtempSync(
      join(tmpdir(), `perf-page-${process.pid}-${pageCounter++}-`),
    );
    cpSync(join(WEBXASH, 'src', 'services'), dir, { recursive: true });
    const apply = await import(pathToFileURL(join(dir, 'frame-pacing-apply.ts')).href);
    const collect = await import(pathToFileURL(join(dir, 'perf-collect.ts')).href);
    return { apply, collect };
  }

  const saved = {
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
    sessionStorage: Object.getOwnPropertyDescriptor(
      globalThis,
      'sessionStorage',
    ),
  };
  Object.defineProperty(globalThis, 'window', {
    value: win,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'performance', {
    value: perf,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
  try {
    return await fn({ win, perf, storage, tick, load, loadPage });
  } finally {
    for (const key of ['window', 'performance', 'sessionStorage']) {
      if (saved[key]) {
        Object.defineProperty(globalThis, key, saved[key]);
      } else {
        delete globalThis[key];
      }
    }
  }
}

/**
 * Run the measurement window, pumping a fixed number of ticks.
 *
 * The count is fixed rather than wall-clock driven so the number of
 * samples the pacer sees is the same on every machine.
 */
async function measure(env, mod, opts) {
  const pending = mod.applyFrameCap(opts);
  for (let i = 0; i < TICKS_PER_WINDOW; i++) env.tick();
  return await pending;
}

test('a MAP CHANGE restarts the warm-up, whatever the match age says', async () => {
  await withEnv(async (env) => {
    const mod = await env.load(APPLY_TS);
    const engine = () => {
      env.win.requestAnimationFrame(engine);
    };
    mod.installFramePacingShim();
    env.win.requestAnimationFrame(engine);

    // THE MATCH IS TEN MINUTES OLD, so a reading is past its warm-up.
    const settled = await measure(env, mod, { observeMs: 120 });
    assert.equal(
      settled.settled,
      true,
      'a window past the match warm-up is settled',
    );
    assert.equal(
      settled.costAnchorAt,
      settled.gameStartAt,
      'the match is the anchor when no map has changed',
    );

    // AND THEN THE SERVER ROTATES THE MAP.
    mod.noteMapChange('ts_kissmeyerbasic', Date.now());

    // THE NEXT WINDOW IS THE NEW MAP'S WARM-UP, however old the match.
    const afterMap = await measure(env, mod, { observeMs: 120 });
    assert.equal(
      afterMap.settled,
      false,
      'a window inside the map-change warm-up is not settled',
    );
    assert.equal(afterMap.mapName, 'ts_kissmeyerbasic');
    assert.ok(
      afterMap.mapChangedAt > afterMap.gameStartAt,
      'the map change is the later of the two anchors',
    );
    assert.equal(
      afterMap.costAnchorAt,
      afterMap.mapChangedAt,
      'the map change moved the anchor',
    );

    // AND ONCE THE MAP HAS SETTLED, THE WINDOW IS SETTLED AGAIN.
    mod.noteMapChange('ts_kissmeyerbasic', Date.now() - 60000);
    const settledAgain = await measure(env, mod, { observeMs: 120 });
    assert.equal(
      settledAgain.settled,
      true,
      'a settled map settles the window',
    );
  });
});

test('the snapshot carries the MATCH TIMELINE and the map', async () => {
  await withEnv(async (env) => {
    const { apply, collect } = await env.loadPage();

    // A MAP, AND A MATCH ON IT.
    apply.noteMapChange('ts_lobbyduel', Date.now() - 60000);
    const engine = () => {
      env.win.requestAnimationFrame(engine);
    };
    apply.installFramePacingShim();
    env.win.requestAnimationFrame(engine);
    await measure(env, apply, { observeMs: 120, force: true, everyNth: 2 });

    assert.ok(
      apply.getPacingHistory().length > 0,
      'the pacer recorded a window',
    );

    // THE MATCH ENDS AND THE PAGE GOES AWAY.
    assert.equal(
      collect.savePerfSession(),
      true,
      'the session was written',
    );

    const raw = JSON.parse(env.storage.getItem(SESSION_KEY));
    assert.ok(Array.isArray(raw.timeline), 'the snapshot carries the timeline');
    assert.ok(raw.timeline.length > 0, 'the timeline is not empty');
    assert.equal(
      raw.timeline[raw.timeline.length - 1].mapName,
      'ts_lobbyduel',
      'the window knows which map it was on',
    );
    assert.equal(raw.mapName, 'ts_lobbyduel', 'the snapshot knows the map');
  });
});

test('the export on the LANDING PAGE carries the last match, not an empty state', async () => {
  await withEnv(async (env) => {
    // THE MATCH THAT JUST ENDED, as the session left it.
    env.storage.setItem(
      SESSION_KEY,
      JSON.stringify({
        displayHz: 60,
        engineFps: 22,
        browserHz: 120,
        panelHz: 120,
        engineWorkMs: 41.94,
        sustainableFps: 23,
        capFps: 0,
        everyNth: 1,
        lateFrames: 78,
        measuredFrames: 100,
        backingWidth: 3456,
        backingHeight: 2234,
        renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro)',
        measuredAt: 1760000600000,
        costMeasuredAt: 1760000513000,
        costSettled: false,
        gameStartAt: 1760000000000,
        costAnchorAt: 1760000510000,
        mapName: 'ts_lobbyduel',
        mapChangedAt: 1760000510000,
        idlePanelHz: 120,
        pacing: null,
        timeline: [
          {
            at: 1760000513000,
            mapName: 'ts_lobbyduel',
            engineWorkMs: 41.94,
            engineFps: 22,
            browserHz: 120,
            panelHz: 120,
            everyNth: 1,
            lateFraction: 0.78,
            settled: false,
            frameP50Ms: 44.4,
            frameP99Ms: 134.3,
            fullscreen: true,
          },
        ],
      }),
    );

    // THE PLAYER QUITS TO THE LANDING PAGE. The page reloads, so the
    // pacer has no state at all -- and the export button is pressed.
    const { collect } = await env.loadPage();
    const log = collect.buildPerfLog();

    assert.equal(
      log.timeline.length,
      1,
      'the export carries the match timeline',
    );
    assert.equal(
      log.timeline[0].mapName,
      'ts_lobbyduel',
      'the timeline says which map the cost was on',
    );
    assert.equal(
      log.pacing.engineWorkMs,
      41.94,
      "the pacer's state comes from the session",
    );
    assert.equal(log.pacing.mapName, 'ts_lobbyduel');
    assert.equal(
      log.report.source,
      'last-session',
      'the report is about the last match, not about the landing page',
    );
    assert.ok(
      log.report.findings.some((f) => /ts_lobbyduel/.test(f.title)),
      'the readout names the map the reading was taken on',
    );
  });
});
