#!/usr/bin/env node
'use strict';
/*
 * READ AN A/B/A RUN, PHASE BY PHASE — AND PAIR BY PAIR.
 *
 * THE PAIRED READING IS THE ONE THAT COUNTS.
 *
 * The phases alternate (w1, f1, w2, f2, ...), and each windowed phase
 * sits a few seconds away from the fullscreen phase it is paired with.
 * The scene under the camera is NOT the same from second to second —
 * the client is spectating with a free chase-cam that follows a bot —
 * so the engine's per-frame cost moves on its own. Pairing the phases
 * that are closest together in time makes that drift cancel, and the
 * MEDIAN of the per-pair differences is the number to believe.
 *
 * USAGE
 *   node tools/perf/read-aba.cjs <the-run.json> [...]
 */
const fs = require('fs');

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function p(xs, q) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * q)));
  return s[i];
}
const f = (v, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '?' : v.toFixed(d));

for (const file of process.argv.slice(2)) {
  const run = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = (run.rows || []).filter((r) => r.engineMs !== null && r.engineMs > 0);
  console.log(`\n=== ${file} ===`);
  console.log(`  identity ${JSON.stringify(run.identity || {})}   phase length ${run.phaseSeconds}s`);

  // THE PHASES, IN ORDER.
  const order = [];
  const byPhase = {};
  for (const r of rows) {
    if (!byPhase[r.phase]) {
      byPhase[r.phase] = [];
      order.push(r.phase);
    }
    byPhase[r.phase].push(r);
  }

  const stats = {};
  console.log('');
  console.log('  phase  state       n    median   p95     first-half  second-half  range');
  for (const ph of order) {
    const pr = byPhase[ph];
    const vals = pr.map((r) => r.engineMs);
    const half = Math.floor(pr.length / 2);
    const fsRows = pr.filter((r) => r.canvas && (r.canvas.fullscreen || r.canvas.fillsTheScreen)).length;
    const state = fsRows > pr.length / 2 ? 'fullscreen' : 'windowed';
    const backings = [...new Set(pr.map((r) => `${r.canvas.backingW}x${r.canvas.backingH}`))];

    // THE LAST READING IN THE PHASE — THE CLEAN ONE.
    //
    // The pacer reports the engine's per-frame cost as the MEDIAN of
    // its last window, and that window is about twelve seconds wide
    // (measured: the value moves every 11.5-12.4 s). A phase that is
    // shorter than that window is mostly measuring the PREVIOUS phase,
    // and a reading taken at the START of a phase is mostly measuring
    // the phase before it. A phase of 24 s contains two whole windows,
    // so the reading at its END is entirely its own.
    const lastReading = pr.length ? pr[pr.length - 1].engineMs : null;

    stats[ph] = {
      state,
      n: pr.length,
      lastReading,
      median: median(vals),
      p95: p(vals, 0.95),
      firstHalf: median(pr.slice(0, half).map((r) => r.engineMs)),
      secondHalf: median(pr.slice(half).map((r) => r.engineMs)),
      min: Math.min(...vals),
      max: Math.max(...vals),
      backings,
    };
    const s = stats[ph];
    console.log(
      `  ${ph.padEnd(6)} ${s.state.padEnd(10)} ${String(s.n).padStart(3)}  ${f(s.median).padStart(6)}  ${f(s.p95).padStart(6)}  ` +
        `${f(s.firstHalf).padStart(10)}  ${f(s.secondHalf).padStart(11)}  ${f(s.min)}-${f(s.max)}  ` +
        `last ${f(s.lastReading).padStart(5)}  ${s.backings.join(',')}`,
    );
  }

  // THE PAIRS: each windowed phase against the fullscreen phase right
  // after it.
  const pairs = [];
  for (let i = 0; i < order.length - 1; i++) {
    const a = stats[order[i]];
    const b = stats[order[i + 1]];
    if (!a || !b || a.state !== 'windowed' || b.state !== 'fullscreen') continue;
    // THE PAIR IS COMPARED ON THE LAST READING OF EACH PHASE — the
    // reading that belongs to that phase and not to the one before it.
    const av = a.lastReading;
    const bv = b.lastReading;
    if (av === null || bv === null) continue;
    pairs.push({
      a: order[i],
      b: order[i + 1],
      delta: bv - av,
      pct: ((bv - av) / av) * 100,
      av,
      bv,
    });
  }

  if (pairs.length) {
    console.log('');
    console.log('  THE PAIRS (each windowed phase against the fullscreen phase beside it):');
    for (const pr of pairs) {
      console.log(`    ${pr.a} -> ${pr.b}:  ${f(pr.av)} -> ${f(pr.bv)} ms   ${f(pr.delta)} ms   ${f(pr.pct, 0)}%`);
    }
    const deltas = pairs.map((x) => x.delta);
    const pcts = pairs.map((x) => x.pct);
    console.log('');
    console.log(
      `  THE FULLSCREEN EFFECT, BY THE PAIRED MEDIAN: ${f(median(deltas))} ms   ${f(median(pcts), 0)}%   ` +
        `(over ${pairs.length} pair${pairs.length === 1 ? '' : 's'})`,
    );
    console.log(`  the pair deltas: ${deltas.map((d) => f(d)).join(', ')} ms`);
  } else {
    console.log('');
    console.log('  (no windowed/fullscreen pairs in this run)');
  }
}
