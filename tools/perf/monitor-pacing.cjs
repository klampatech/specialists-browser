#!/usr/bin/env node
/**
 * WATCH A LIVE GAME FOR THE FREEZES BETWEEN THE SMOOTH FRAMES.
 *
 * WHY RAW CDP AND NOT PLAYWRIGHT
 * -------------------------------
 * The first version of this monitor used Playwright's `connectOverCDP`.
 * On Kyle's Vivaldi it reported "no tab matching bulletballet.dev
 * appeared" through an entire play session -- Playwright enumerates a
 * different set of targets than the browser's own /json/list does, and
 * the tab was never in it. The browser's own target list is the ground
 * truth, so this talks to it directly: HTTP for the target list, a
 * WebSocket for Runtime.evaluate. No Playwright, no attach, no guess.
 *
 * WHAT IT WATCHES
 * ---------------
 * 1. THE PACER'S OWN FRAME-SPACING DISTRIBUTION. `window.__xashPacing()`
 *    carries `pacing: { p50, p90, p99, max, buckets, samples }` -- the
 *    shape of the gap between the frames the player actually sees, which
 *    is the thing the eye reads as smoothness. p50 is the smooth part;
 *    p99 and max are the freezes. The `buckets` say how many frames
 *    landed on each spacing, which is the single clearest line in a
 *    frame-timing report.
 * 2. THE LATE-FRAME FRACTION the pacer computes.
 * 3. THE GATE IN FORCE: `everyNth`, `capFps`, `panelHz`, `browserHz`,
 *    `idlePanelHz`, `engineFps`, `engineWorkMs`. This is what says what
 *    is being LIMITED, and `idlePanelHz` catches Chrome's Energy Saver
 *    quietly halving a 120 Hz panel.
 * 4. THE LOGIC CLOCK. The wrapper's `Cmd_ExecuteString` is wrapped, and
 *    the `ts_pump_think` calls are the game's logic clock -- a 16 ms
 *    setInterval. The SHORTEST gap between two ticks is the catch-up
 *    burst: a gap under 8 ms means the logic was overdue and the
 *    browser handed the missed time back in a clump.
 *
 * IT ONLY ATTACHES. It never navigates, clicks, types or resizes
 * anything: a click is a state change and it would change what the
 * engine is drawing.
 *
 * USAGE
 *   node tools/perf/monitor-pacing.cjs --cdp http://127.0.0.1:9224 \
 *        --url-match bulletballet.dev --seconds 300 --json /tmp/freezes.jsonl
 */
const fs = require('fs');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const CDP = String(arg('cdp', 'http://127.0.0.1:9223')).replace(/\/$/, '');
const URL_MATCH = String(arg('url-match', 'bulletballet.dev'));
const SECONDS = Number(arg('seconds', 300));
const JSON_OUT = String(arg('json', '/tmp/freezes.jsonl'));
const WAIT_SECONDS = Number(arg('wait', 900));
const HZ = Number(arg('hz', 4));

const f1 = (v) => (typeof v === 'number' ? v.toFixed(1) : '—');
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : '—');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── THE TARGET LIST: the browser's own, over plain HTTP ──────────────
async function targets() {
  const res = await fetch(`${CDP}/json/list`, { signal: AbortSignal.timeout(8000) });
  const list = await res.json();
  return list.filter((t) => t.type === 'page' && String(t.url || '').includes(URL_MATCH));
}

// ── ONE CDP SESSION ON ONE TARGET ────────────────────────────────────
class Session {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
  }
  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;
      ws.onopen = () => resolve(this);
      ws.onerror = (e) => reject(new Error('the websocket failed: ' + (e.message || 'unknown')));
      ws.onmessage = (ev) => {
        let m;
        try {
          m = JSON.parse(ev.data);
        } catch (e) {
          return;
        }
        const p = this.pending.get(m.id);
        if (p) {
          this.pending.delete(m.id);
          m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
        }
      };
    });
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(method + ' timed out'));
        }
      }, 10000);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
    if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.text || 'the page threw'));
    return r.result ? r.result.value : undefined;
  }
  close() {
    try {
      this.ws.close();
    } catch (e) {}
  }
}

// ── THE PROBE: the logic clock, wrapped pass-through ─────────────────
const PROBE = `(() => {
  const S = window.__monitor || { pump: [] };
  window.__monitor = S;
  try {
    const x = window.__xash;
    if (x && typeof x.Cmd_ExecuteString === 'function' && !x.__monitorWrapped) {
      const orig = x.Cmd_ExecuteString.bind(x);
      x.Cmd_ExecuteString = function (cmd, ...rest) {
        const t0 = performance.now();
        try { return orig(cmd, ...rest); }
        finally { if (String(cmd).includes('ts_pump_think')) S.pump.push(t0); }
      };
      x.__monitorWrapped = true;
      return 'wrapped';
    }
    if (x && x.__monitorWrapped) return 'already wrapped';
  } catch (e) { return 'failed: ' + e.message; }
  return window.__xash ? 'no Cmd_ExecuteString' : 'no window.__xash';
})()`;

const READ = `(() => {
  const S = window.__monitor || { pump: [] };
  let pacing = null;
  try { pacing = window.__xashPacing ? window.__xashPacing() : null; } catch (e) {}
  let pumpHz = null;
  try {
    const el = document.querySelector('.pump-val');
    if (el && /Hz$/.test(el.textContent.trim())) pumpHz = parseFloat(el.textContent);
  } catch (e) {}
  return { pacing, pump: S.pump.slice(), pumpHz, url: location.href, wrapped: !!(window.__xash && window.__xash.__monitorWrapped) };
})()`;

(async () => {
  console.log(`  cdp: ${CDP}`);
  console.log(`  waiting for a page target matching "${URL_MATCH}" (up to ${WAIT_SECONDS}s)...`);

  let session = null;
  let targetUrl = null;
  const deadline = Date.now() + WAIT_SECONDS * 1000;
  while (!session && Date.now() < deadline) {
    const found = await targets().catch(() => []);
    if (found.length) {
      const t = found[0];
      try {
        session = await new Session(t.webSocketDebuggerUrl).connect();
        targetUrl = t.url;
        const probeState = await session.eval(PROBE);
        console.log(`  attached: ${t.url}`);
        console.log(`  the logic clock probe: ${probeState}`);
        break;
      } catch (e) {
        console.log(`  (could not attach: ${e.message})`);
        session = null;
      }
    }
    await sleep(1500);
  }
  if (!session) {
    console.error(`  no page target matching "${URL_MATCH}" appeared.`);
    process.exit(2);
  }

  const out = fs.createWriteStream(JSON_OUT, { flags: 'w' });
  const rows = [];
  const start = Date.now();
  const period = Math.round(1000 / HZ);
  let lastPumpIdx = 0;

  while ((Date.now() - start) / 1000 < SECONDS) {
    await sleep(period);
    // the tab may have navigated or been replaced: re-find it
    try {
      const found = await targets().catch(() => []);
      const stillThere = found.some((t) => t.url === targetUrl && t.webSocketDebuggerUrl);
      if (!stillThere && found.length) {
        const t = found[0];
        try {
          session.close();
          session = await new Session(t.webSocketDebuggerUrl).connect();
          targetUrl = t.url;
          await session.eval(PROBE);
          console.log('  (the tab moved -- following it)');
        } catch (e) {
          continue;
        }
      } else if (!stillThere) {
        continue;
      }
    } catch (e) {
      continue;
    }

    // Re-arm the probe every tick. It is idempotent, and it has to be
    // re-armed because the engine handle (`window.__xash`) only exists
    // once the engine has booted -- a probe installed on the landing
    // page sees no engine and would never see the logic clock.
    try {
      await session.eval(PROBE);
    } catch (e) {
      /* the target is gone; the loop below will find the new one */
    }

    let s = null;
    try {
      s = await session.eval(READ);
    } catch (e) {
      // the page may have reloaded (a new execution context, and the
      // probe with it). Re-install it on the same target.
      try {
        await session.eval(PROBE);
      } catch (e2) {
        /* the target is gone; the loop above will find the new one */
      }
      continue;
    }
    if (!s) continue;
    const p = s.pacing;

    const pumpGaps = [];
    for (let i = Math.max(1, lastPumpIdx); i < s.pump.length; i++) pumpGaps.push(s.pump[i] - s.pump[i - 1]);
    lastPumpIdx = s.pump.length;

    const row = {
      t: +((Date.now() - start) / 1000).toFixed(2),
      ready: !!p,
      p50: p && p.pacing ? p.pacing.p50 : null,
      p90: p && p.pacing ? p.pacing.p90 : null,
      p99: p && p.pacing ? p.pacing.p99 : null,
      gapMax: p && p.pacing ? p.pacing.max : null,
      samples: p && p.pacing ? p.pacing.samples : null,
      buckets: p && p.pacing ? p.pacing.buckets : null,
      lateFrac: p && typeof p.lateFraction === 'number' ? p.lateFraction : null,
      lateFrames: p ? p.lateFrames : null,
      measuredFrames: p ? p.measuredFrames : null,
      everyNth: p ? p.everyNth : null,
      capFps: p ? p.capFps : null,
      panelHz: p ? p.panelHz : null,
      browserHz: p ? p.browserHz : null,
      idlePanelHz: p ? p.idlePanelHz : null,
      engineFps: p ? p.engineFps : null,
      engineWorkMs: p ? p.engineWorkMs : null,
      sustainableFps: p ? p.sustainableFps : null,
      reason: p ? p.reason : null,
      map: p ? p.mapName : null,
      pumpTicks: pumpGaps.length,
      pumpWrapped: !!s.wrapped,
      pumpHz: s.pumpHz,
      pumpGapMin: pumpGaps.length ? Math.min(...pumpGaps) : null,
      pumpGapMax: pumpGaps.length ? Math.max(...pumpGaps) : null,
    };
    rows.push(row);
    out.write(JSON.stringify(row) + '\n');

    if (row.t % 1 < period / 1000 + 0.02) {
      console.log(
        `  ${String(row.t).padStart(6)}s  ${row.ready ? 'READY' : '  ...'}  gap p50 ${f2(row.p50)}  p90 ${f2(row.p90)}  p99 ${f2(row.p99)}  max ${f2(row.gapMax)}` +
          `  late ${row.lateFrac === null ? '—' : (row.lateFrac * 100).toFixed(1) + '%'}` +
          `  | gate 1/${row.everyNth}  cap ${f1(row.capFps)}  panel ${f1(row.panelHz)}  idle ${f1(row.idlePanelHz)}  engine ${f1(row.engineWorkMs)}ms @ ${f1(row.engineFps)}fps` +
          `  | pump ${row.pumpTicks}t${row.pumpHz ? ' ' + row.pumpHz + 'Hz' : ''}`
      );
    }
  }

  // ── THE SUMMARY ────────────────────────────────────────────────────
  const live = rows.filter((r) => r.ready);
  console.log(`\n═══ the whole run ═══`);
  if (live.length) {
    const last = live[live.length - 1];
    console.log(`  the map: ${last.map}`);
    console.log(`  the pacer said: ${last.reason}`);
    console.log(`  the gate: one frame in ${last.everyNth} tick(s); cap ${last.capFps} fps; the panel is ${f1(last.panelHz)} Hz (idle ${f1(last.idlePanelHz)} Hz); the browser ticks at ${f1(last.browserHz)} Hz`);
    console.log(`  the engine: ${f1(last.engineWorkMs)} ms of work per frame at ${f1(last.engineFps)} fps; the pacer says ${f1(last.sustainableFps)} fps is sustainable`);
    console.log(`  the frame spacing, as the pacer sees it: p50 ${f2(last.p50)}  p90 ${f2(last.p90)}  p99 ${f2(last.p99)}  max ${f2(last.gapMax)} ms  (${last.samples} samples)`);
    console.log(`  the most common spacings:`);
    for (const b of (last.buckets || []).slice(0, 10)) console.log(`     ${String(b.ms).padStart(6)} ms  x${b.count}`);
    const lates = live.map((r) => r.lateFrac).filter((v) => v !== null);
    if (lates.length) {
      const srt = [...lates].sort((a, b) => a - b);
      console.log(`  the late-frame fraction: p50 ${(srt[srt.length >> 1] * 100).toFixed(1)}%  worst ${(Math.max(...lates) * 100).toFixed(1)}%`);
    }
    const worst = [...live].sort((a, b) => (b.gapMax || 0) - (a.gapMax || 0)).slice(0, 8);
    console.log(`  the worst moments:`);
    for (const r of worst) {
      console.log(`     t=${String(r.t).padStart(7)}s  max ${f2(r.gapMax)} ms  p99 ${f2(r.p99)}  p50 ${f2(r.p50)}  late ${r.lateFrac === null ? '—' : (r.lateFrac * 100).toFixed(0) + '%'}  engine ${f1(r.engineWorkMs)}ms  gate 1/${r.everyNth}`);
    }
  } else {
    console.log(`  the engine never came up in ${SECONDS.toFixed(0)}s.`);
  }
  const pumps = rows.filter((r) => r.pumpTicks > 0);
  if (pumps.length) {
    const mins = pumps.map((r) => r.pumpGapMin).filter((v) => v !== null);
    const maxs = pumps.map((r) => r.pumpGapMax).filter((v) => v !== null);
    console.log(`  the LOGIC clock: ${pumps.reduce((a, r) => a + r.pumpTicks, 0)} ticks seen; the shortest gap between two ticks ${f2(Math.min(...mins))} ms (the target is 16; a gap under 8 means the logic CAUGHT UP in a burst)`);
    console.log(`     the longest gap between two ticks: ${f2(Math.max(...maxs))} ms`);
  } else {
    console.log(`  the LOGIC clock: not visible from this page (no window.__xash.Cmd_ExecuteString, and the HUD's dev strip is not mounted)`);
  }
  console.log(`  the rows are in ${JSON_OUT}`);
  out.end();
  session.close();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
