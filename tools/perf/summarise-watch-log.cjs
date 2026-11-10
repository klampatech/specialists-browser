#!/usr/bin/env node
'use strict';
/**
 * SUMMARISE A WATCHER'S ROWS, GROUPED BY WHAT THE PAGE WAS DOING.
 *
 * The watcher prints one row per second. The interesting question is
 * never "what was the average" — it is "what was it doing WHEN", and
 * the state that matters is the WINDOW STATE: fullscreen or not, the
 * canvas BACKING STORE (the engine's real render resolution) and the
 * canvas CSS box (how big the browser thinks the game is).
 *
 * So the rows are grouped by that state, and each group reports the
 * MEDIAN of the engine's own frame cost, the event-loop lag and the
 * browser's rate, plus how many rows it is based on.
 *
 * Usage: node summarise-watch-log.cjs /tmp/ff-live3.log
 */
const fs = require('node:fs');

const path = process.argv[2];
const text = fs.readFileSync(path, 'utf8');

const ROW = /^\s*([0-9]+\.[0-9]+)s\s+fps\s+(\S+)\s+p50\s+(\S+)\s+p95\s+(\S+)\s+p99\s+(\S+)\s+late\s+([0-9.]+)%\s+engine\s+(\S+?)ms\s+brHz\s+(\S+)\s+panel\s+(\S+)\s+lag\s+(\S+?)ms\s+lt\s+([0-9]+)\s+fs\s+([YN])\s+canvas\s+([0-9]+)x([0-9]+)\s+css\s+([0-9]+)x([0-9]+)/;

const num = (v) => (v === '?' ? null : Number(v));

const rows = [];
for (const line of text.split('\n')) {
  const m = ROW.exec(line);
  if (!m) continue;
  rows.push({
    t: Number(m[1]),
    fps: num(m[2]),
    p50: num(m[3]),
    p95: num(m[4]),
    p99: num(m[5]),
    late: Number(m[6]),
    engine: num(m[7]),
    brHz: num(m[8]),
    panel: num(m[9]),
    lag: num(m[10]),
    lt: Number(m[11]),
    fs: m[12],
    bw: Number(m[13]),
    bh: Number(m[14]),
    cw: Number(m[15]),
    ch: Number(m[16]),
  });
}

if (!rows.length) {
  console.log('no rows parsed from ' + path);
  process.exit(0);
}

const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1];
};
const fmt = (v, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '?' : v.toFixed(d));

console.log(`rows: ${rows.length}   from ${path}`);
console.log('');

// GROUP BY THE WINDOW STATE. The canvas backing store is part of the
// key because it IS the engine's render resolution — a group that
// changes backing store is a group where the resolution moved.
const groups = new Map();
for (const r of rows) {
  const key = `fs=${r.fs}  backing ${r.bw}x${r.bh}  css ${r.cw}x${r.ch}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

console.log('--- grouped by the window state ---');
console.log('state                              rows   engine ms   p50 ms   lag ms   brHz   panel   late%');
for (const [key, rs] of groups) {
  const live = rs.filter((r) => r.engine !== null && r.engine > 0);
  const engines = live.map((r) => r.engine);
  const p50s = live.map((r) => r.p50).filter((v) => v !== null);
  const lags = rs.map((r) => r.lag).filter((v) => v !== null);
  const brs = live.map((r) => r.brHz).filter((v) => v !== null);
  const pans = live.map((r) => r.panel).filter((v) => v !== null);
  const lates = live.map((r) => r.late);
  console.log(
    `${key.padEnd(34)} ${String(rs.length).padStart(4)}   ` +
      `${fmt(median(engines)).padStart(9)}   ${fmt(median(p50s)).padStart(6)}   ` +
      `${fmt(median(lags)).padStart(6)}   ${fmt(median(brs), 1).padStart(5)}   ` +
      `${fmt(median(pans), 0).padStart(5)}   ${fmt(median(lates), 1).padStart(5)}`,
  );
}

console.log('');
console.log('--- the transitions (the state changed) ---');
let last = null;
for (const r of rows) {
  const key = `${r.fs}/${r.bw}x${r.bh}/${r.cw}x${r.ch}`;
  if (key !== last) {
    console.log(
      `  t=${r.t.toFixed(1).padStart(7)}s  fs ${r.fs}  backing ${String(r.bw).padStart(5)}x${String(r.bh).padEnd(5)}  css ${String(r.cw).padStart(5)}x${String(r.ch).padEnd(5)}  engine ${fmt(r.engine)}ms  lag ${fmt(r.lag)}ms`,
    );
    last = key;
  }
}

console.log('');
console.log('--- the worst event-loop lag ---');
const byLag = [...rows].sort((a, b) => (b.lag || 0) - (a.lag || 0)).slice(0, 8);
for (const r of byLag) {
  console.log(`  t=${r.t.toFixed(1).padStart(7)}s  lag ${fmt(r.lag).padStart(8)} ms   engine ${fmt(r.engine)}ms   fs ${r.fs}  backing ${r.bw}x${r.bh}`);
}
