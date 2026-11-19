/**
 * THE GAME'S OWN CLOCK.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * `ts_pump` is the thing that advances the game: a 16 ms timer that
 * runs the engine's `ts_pump_think`. It was a `setInterval`.
 *
 * `setInterval` is the wrong shape for a game clock. When the main
 * thread is busy the browser queues the intervals it missed and then
 * hands them back in a clump, and the game advances by several ticks
 * at once -- a rubber band, not a clock.
 *
 * Measured on Kyle's M3 Pro, 2026-11-19, from the client's own
 * telemetry: the clock stalled for 41-70 ms and then fired ticks
 * 3.22 ms and 4.40 ms apart. That is the "little freezes that feel
 * like ping lag as things catch up".
 *
 * The clock is now a self-correcting `setTimeout`: one callback is
 * pending at a time, so the browser cannot build a backlog, and the
 * delay is measured from the last tick's own START, so the clock never
 * carries debt. A stall costs the game the time that passed -- it runs
 * a little slow for a moment -- instead of lurching forward to catch
 * up.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const PUMP_TS = join(here, '..', '..', 'webxash', 'src', 'services', 'ts-pump.ts');
if (!existsSync(PUMP_TS)) {
  throw new Error(
    'the webxash submodule is not checked out — run ' +
      '`git submodule update --init --recursive`. This test reads the ' +
      'frontend source, so it cannot pass without it.',
  );
}

const { TSPump } = await import(pathToFileURL(PUMP_TS).href);

// ── A CLOCK UNDER THE TEST'S CONTROL ─────────────────────────────────
function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();

  const realPerformance = globalThis.performance;
  globalThis.performance.now = () => now;
  globalThis.window = {
    // the pump's constructor reads the URL for its spawn opt-in
    location: { search: '' },
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.set(id, { fn, at: now + Math.max(0, ms || 0) });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };

  /**
   * Move time forward with the main thread FREE: whatever comes due
   * runs on the way, at the moment it comes due.
   */
  function advance(ms) {
    const target = now + ms;
    for (;;) {
      let due = null;
      for (const [id, t] of timers) {
        if (t.at <= target && (!due || t.at < due.t.at || (t.at === due.t.at && id < due.id))) {
          due = { id, t };
        }
      }
      if (!due) break;
      timers.delete(due.id);
      now = Math.max(now, due.t.at);
      due.t.fn();
    }
    now = Math.max(now, target);
  }

  /**
   * Move time forward with the main thread BLOCKED: nothing runs, and
   * the timers that come due in the meantime are late when it frees
   * up -- which is the whole point. A browser does not run a missed
   * timer at the moment it missed it; it runs it now.
   */
  function stall(ms) {
    now += ms;
  }

  function restore() {
    globalThis.window = undefined;
    globalThis.performance.now = realPerformance.now.bind(realPerformance);
  }

  return { advance, stall, restore, at: () => now };
}

// ── THE TESTS ────────────────────────────────────────────────────────

test('the clock keeps its grid', () => {
  const clock = fakeClock();
  try {
    const ticks = [];
    const pump = new TSPump();
    pump.start({ Cmd_ExecuteString: (cmd) => ticks.push({ cmd, at: clock.at() }) });
    clock.advance(160);
    const thinks = ticks.filter((t) => t.cmd === 'ts_pump_think');
    assert.equal(thinks.length, 10, `ten ticks in 160 ms, got ${thinks.length}`);
    // every tick on the 16 ms grid
    for (const t of thinks) {
      assert.equal(t.at % 16, 0, `a tick landed at ${t.at} ms, off the 16 ms grid`);
    }
    pump.stop();
  } finally {
    clock.restore();
  }
});

test('a stall costs time -- it does not queue the ticks that were missed', () => {
  const clock = fakeClock();
  try {
    const ticks = [];
    const pump = new TSPump();
    pump.start({ Cmd_ExecuteString: (cmd) => ticks.push({ cmd, at: clock.at() }) });
    clock.advance(160);
    const before = ticks.filter((t) => t.cmd === 'ts_pump_think').length;
    assert.equal(before, 10);

    // THE STALL: the main thread is busy for 70 ms. With a
    // `setInterval` the browser would have queued four ticks and fired
    // them in a clump the moment the thread was free.
    clock.stall(70);
    clock.advance(0);
    const after = ticks.filter((t) => t.cmd === 'ts_pump_think').length;
    assert.equal(
      after,
      before + 1,
      `a 70 ms stall produced ${after - before} ticks; the clock is catching up`,
    );

    // AND THE GRID IS NOT BROKEN BY IT: the next tick is one grid
    // step after the late one, not a clump after it.
    const thinks = ticks.filter((t) => t.cmd === 'ts_pump_think');
    const late = thinks[thinks.length - 1];
    clock.advance(16);
    const afterOne = ticks.filter((t) => t.cmd === 'ts_pump_think');
    assert.equal(afterOne.length, after + 1, 'the clock did not tick after the stall');
    assert.equal(
      afterOne[afterOne.length - 1].at - late.at,
      16,
      'the clock did not land back on its grid after the stall',
    );
    pump.stop();
  } finally {
    clock.restore();
  }
});

test('the clock never fires two ticks close together', () => {
  const clock = fakeClock();
  try {
    const ticks = [];
    const pump = new TSPump();
    pump.start({ Cmd_ExecuteString: (cmd) => ticks.push({ cmd, at: clock.at() }) });
    // a patchy minute: the main thread blocked every third step
    for (let i = 0; i < 40; i++) {
      if (i % 3 === 0) {
        clock.stall(40);
        clock.advance(0);
      } else {
        clock.advance(16);
      }
    }
    const thinks = ticks.filter((t) => t.cmd === 'ts_pump_think');
    let closest = Infinity;
    for (let i = 1; i < thinks.length; i++) {
      closest = Math.min(closest, thinks[i].at - thinks[i - 1].at);
    }
    assert.ok(
      closest >= 16,
      `two ticks landed ${closest} ms apart; the browser is handing back a backlog`,
    );
    pump.stop();
  } finally {
    clock.restore();
  }
});
