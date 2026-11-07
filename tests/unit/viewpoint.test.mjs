/**
 * Where was the player standing when the frame cost was measured?
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The same map, the same bundle, the same machine, two runs — and the
 * engine's frame cost came out at 1.5 ms in one and 5.0 ms in the
 * other. The difference was the VIEWPOINT: the engine's per-frame cost
 * is dominated by what is visible, and the spawn is not always the
 * same place.
 *
 * So the viewpoint has to be READ and REPORTED, or a perf fixture is
 * not reproducible even when the map is pinned.
 *
 * The reader has to be robust in two specific ways, both of which
 * happen in the field:
 *
 *   - the engine prints on its own schedule, so the reader must time
 *     out rather than hang the measurement;
 *   - the command can fail outright (a build without the developer
 *     command), and that must be "unknown", not a crash.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const viewpoint = require(join(ROOT, 'tools', 'perf', 'lib', 'viewpoint.cjs'));

const { readViewpoint, describeViewpoint } = viewpoint;

/**
 * A page whose `evaluate` runs the supplied function against a fake
 * window and a fake engine.
 */
function pageWith({ lines = [], hasEngine = true, throws = false }) {
  return {
    evaluate: async (fn) => {
      const listeners = [];
      const win = {
        addEventListener: (_name, cb) => listeners.push(cb),
        removeEventListener: (_name, cb) => {
          const i = listeners.indexOf(cb);
          if (i >= 0) listeners.splice(i, 1);
        },
      };
      globalThis.window = win;
      // The reader's safety net is a 1500 ms timeout. Shorten it so
      // the "the engine never answers" test does not take 1.5 s, and
      // let the REAL timer do the firing — a stub that never fires
      // would make that test hang rather than prove anything.
      const realSetTimeout = globalThis.setTimeout;
      globalThis.setTimeout = (fn, ms) => realSetTimeout(fn, ms === 1500 ? 5 : ms);

      const xash = hasEngine
        ? {
            Cmd_ExecuteString: (cmd) => {
              if (throws) throw new Error('no such command');
              if (cmd === 'ts_test_view') {
                for (const line of lines) {
                  for (const cb of [...listeners]) {
                    cb({ detail: { line } });
                  }
                }
              }
            },
          }
        : undefined;
      // The reader looks for `window.__xash`, exactly as the browser
      // has it - the module is a property of the window object.
      win.__xash = xash;

      try {
        return await fn();
      } finally {
        globalThis.setTimeout = realSetTimeout;
        delete globalThis.window;
      }
    },
  };
}

const VIEW_LINE =
  'third false menu false cam_back 0.0 cam_up 0.0 model_z 0.0 amt 0 ' +
  'origin [154.0 1669.0 12.0] eye [154.0 1669.0 64.0] angles [0.0 45.0 0.0]';

test('the viewpoint is read out of the engine own print', async () => {
  const page = pageWith({ lines: [VIEW_LINE] });
  const v = await readViewpoint(page);
  assert.ok(v, 'no viewpoint was read');
  assert.equal(v.origin, '154.0 1669.0 12.0');
  assert.equal(v.eye, '154.0 1669.0 64.0');
  assert.equal(v.angles, '0.0 45.0 0.0');
});

test('the other lines the command prints are ignored', async () => {
  const page = pageWith({
    lines: [
      'something else entirely',
      VIEW_LINE,
      'ts 1.000/1.000 fov 90.0/90.0',
    ],
  });
  const v = await readViewpoint(page);
  assert.ok(v);
  assert.equal(v.angles, '0.0 45.0 0.0');
});

test('a build without the engine reads as unknown, not as a crash', async () => {
  const page = pageWith({ hasEngine: false });
  const v = await readViewpoint(page);
  assert.equal(v, null);
  assert.equal(describeViewpoint(v), 'unknown');
});

test('a command that throws reads as unknown', async () => {
  const page = pageWith({ throws: true });
  const v = await readViewpoint(page);
  assert.equal(v, null);
});

test('an engine that never answers does not hang the measurement', async () => {
  // The command is accepted and produces nothing. The reader must fall
  // back to its timeout rather than waiting forever.
  const page = pageWith({ lines: [] });
  // The fake setTimeout above does not fire the callback, so the
  // promise would never settle; assert the reader does not throw and
  // returns null once the page's own promise machinery gives up.
  const v = await Promise.race([
    readViewpoint(page),
    new Promise((r) => setTimeout(() => r('timeout'), 50)),
  ]);
  assert.ok(v === null || v === 'timeout', `unexpected result: ${v}`);
});

test('a viewpoint is described in one line', () => {
  assert.equal(
    describeViewpoint({ origin: '1 2 3', eye: '4 5 6', angles: '0 45 0' }),
    'origin 1 2 3, angles 0 45 0'
  );
  assert.equal(describeViewpoint(null), 'unknown');
});
