#!/usr/bin/env node
'use strict';
/*
 * READ A LONG SESSION, WITH THE THREE WINDOW STATES APART.
 *
 * THE `fs` COLUMN LIES BY OMISSION
 * --------------------------------
 * The watcher prints `fs Y` when the page fills the screen EITHER way:
 * the DOM's own fullscreen (`document.fullscreenElement`) OR the
 * canvas filling the screen (which is what niri's compositor
 * fullscreen looks like from inside the page). For a session that
 * visits BOTH, that column cannot tell them apart — and they are not
 * the same state:
 *
 *   - DOM fullscreen: the page asked for it, the browser chrome is
 *     gone, `document.fullscreenElement` is set, and the browser's
 *     own fullscreen UI is in play.
 *   - niri fullscreen: the COMPOSITOR made the window fill the screen.
 *     The page did not ask for anything; `document.fullscreenElement`
 *     is null; the browser's chrome is gone.
 *
 * The rows keep both flags separately, so the states can be told apart
 * here even though the live column could not.
 */
const fs = require('fs');

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const f = (v, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '?' : v.toFixed(d));

for (const file of process.argv.slice(2)) {
  const run = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = run.rows || [];
  const live = rows.filter((r) => r.engineMs !== null && r.engineMs > 0);
  console.log(`\n=== ${file} ===`);
  console.log(`  ${rows.length} rows, ${live.length} of them with the engine up`);

  // THE STATES, AS THE PAGE REPORTED THEM.
  const stateOf = (r) => {
    const c = r.canvas || {};
    if (c.fullscreen) return 'dom-fullscreen';
    if (c.fillsTheScreen) return 'niri-fullscreen';
    return 'windowed';
  };

  const groups = {};
  for (const r of live) {
    const st = stateOf(r);
    const key = `${st}`;
    (groups[key] = groups[key] || []).push(r);
  }

  console.log('');
  console.log('  state             n    engine median   p95     late%   lag median  lag max   backing');
  for (const [key, rs] of Object.entries(groups)) {
    const eng = rs.map((r) => r.engineMs);
    const late = rs.map((r) => r.lateFraction).filter((v) => v !== null && v !== undefined);
    const lags = rs.map((r) => r.lagMedian).filter((v) => v !== null && v !== undefined);
    const backings = [...new Set(rs.map((r) => `${r.canvas.backingW}x${r.canvas.backingH}`))];
    const csss = [...new Set(rs.map((r) => `${r.canvas.cssW}x${r.canvas.cssH}`))];
    console.log(
      `  ${key.padEnd(16)} ${String(rs.length).padStart(4)}  ${f(median(eng)).padStart(13)}  ${f(median(eng.slice().sort((a, b) => a - b))).padStart(6)}  ` +
        `${f(median(late) * 100, 1).padStart(5)}%  ${f(median(lags)).padStart(10)}  ${f(Math.max(...lags)).padStart(7)}   ${backings.join(',')} @ ${csss.join(',')}`,
    );
  }

  // THE TIMELINE: WHERE THE STATES CHANGED, AND WHAT THE ENGINE DID.
  console.log('');
  console.log('  THE TIMELINE (every state change, with the engine cost around it):');
  let lastState = null;
  let lastEngine = null;
  for (let i = 0; i < live.length; i++) {
    const r = live[i];
    const st = stateOf(r);
    const changed = st !== lastState;
    const stepped = lastEngine !== null && Math.abs(r.engineMs - lastEngine) > 0.01;
    if (changed || stepped) {
      console.log(
        `    t=${String(Math.round(r.t)).padStart(4)}s  ${st.padEnd(15)} engine ${f(r.engineMs).padStart(5)} ms  ` +
          `lag ${f(r.lagMedian).padStart(5)} ms  late ${f((r.lateFraction || 0) * 100, 1).padStart(4)}%  ` +
          `backing ${r.canvas.backingW}x${r.canvas.backingH}  css ${r.canvas.cssW}x${r.canvas.cssH}`,
      );
      lastState = st;
      lastEngine = r.engineMs;
    }
  }

  // THE DROPS: the lag spikes, which is what a player FEELS.
  const spikes = live
    .map((r) => ({ t: r.t, lag: r.lagMedian, state: stateOf(r), engine: r.engineMs }))
    .filter((x) => x.lag !== null && x.lag > 50)
    .sort((a, b) => b.lag - a.lag);
  console.log('');
  console.log(`  THE DROPS (event-loop lag over 50 ms — what a player feels): ${spikes.length}`);
  for (const s of spikes.slice(0, 12)) {
    console.log(`    t=${String(Math.round(s.t)).padStart(4)}s  lag ${f(s.lag, 0).padStart(5)} ms  ${s.state.padEnd(15)} engine ${f(s.engine)} ms`);
  }

  // THE LATE FRACTION: the engine's own frames that missed the gate.
  const lateRows = live.filter((r) => (r.lateFraction || 0) > 0.001);
  console.log('');
  console.log(`  ROWS WITH LATE FRAMES: ${lateRows.length} of ${live.length}`);
  for (const r of lateRows.slice(0, 10)) {
    console.log(`    t=${String(Math.round(r.t)).padStart(4)}s  late ${f((r.lateFraction || 0) * 100, 1)}%  ${stateOf(r).padEnd(15)} engine ${f(r.engineMs)} ms`);
  }
}
