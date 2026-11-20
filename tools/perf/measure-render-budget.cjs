#!/usr/bin/env node
/**
 * WHAT DOES THE RENDER BUDGET DO, ON A REAL CLIENT?
 *
 * The budget is the policy that replaced the fixed render resolution:
 * `auto` now spends `pixels_now * (target_frame_ms / measured_frame_ms)`,
 * with a floor, a ceiling, a hysteresis, a step limit and a cooldown.
 * The unit suite pins the arithmetic. Nobody has watched it RUN.
 *
 * So this watches it run: it samples the client's own telemetry and the
 * canvas's backing store, and it captures the client's own console --
 * the loader logs every budget decision AND THE REASON FOR IT, so the
 * policy's account of itself is read straight from the client rather
 * than inferred.
 *
 * THE THREE THINGS THAT MATTER
 *   1. IT ENGAGES. A budget that never fires is a policy that does
 *      nothing; every decision carries a reason.
 *   2. IT SETTLES. The policy has a hysteresis, a step limit and a
 *      cooldown precisely so it does not oscillate. A budget that
 *      changes every few seconds is worse than no budget at all: each
 *      change is a re-allocation.
 *   3. IT BUYS. The engine's frame cost and the late-frame fraction
 *      are what the pixels were cut for.
 *
 * WHY RAW CDP AND NOT PLAYWRIGHT
 * -------------------------------
 * On Kyle's Vivaldi, Playwright's `connectOverCDP` never sees the tab
 * (it enumerates a different set of targets than the browser's own
 * /json/list does) and hangs at the handshake. The browser's own target
 * list is the ground truth, so this talks to it directly: HTTP for the
 * target list, a WebSocket for Runtime.evaluate. This is the same
 * plumbing `tools/perf/monitor-pacing.cjs` uses.
 *
 * TWO WAYS IN
 *   --open <url>    open a tab, drive the join flow, then watch it
 *   --attach <sub>  attach to an EXISTING tab whose url contains <sub>
 *                   and watch it WITHOUT touching it -- no navigation,
 *                   no click: a click is a state change and it would
 *                   change what the engine is drawing. This is the mode
 *                   for watching a person PLAY.
 *
 * USAGE
 *   node tools/perf/measure-render-budget.cjs --cdp http://127.0.0.1:9224 \
 *        --attach bulletballet.dev --seconds 300
 *   node tools/perf/measure-render-budget.cjs --cdp http://127.0.0.1:9224 \
 *        --open https://127.0.0.1:8899/ --seconds 120
 */
const fs = require('fs');
const path = require('path');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : dflt;
}
const has = (name) => process.argv.includes('--' + name);
const CDP = String(arg('cdp', 'http://127.0.0.1:9223')).replace(/\/$/, '');
const OPEN = arg('open', '');
const ATTACH = arg('attach', '');
const SECONDS = Number(arg('seconds', 120));
const NAME = arg('name', 'BudgetProbe');
const RUN_ID = `render-budget-${Date.now()}`;
const WAIT = Number(arg('wait', 120));

const f1 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(1) : '—');
const f2 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(2) : '—');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── THE TARGET LIST: the browser's own, over plain HTTP ──────────────
async function targets() {
  const res = await fetch(`${CDP}/json/list`, { signal: AbortSignal.timeout(8000) });
  const list = await res.json();
  return list.filter((t) => t.type === 'page');
}

// THE MATCH IS BY HOSTNAME, NOT BY SUBSTRING. Kyle's browser has a
// Cloudflare dashboard tab whose URL CONTAINS "bulletballet.dev" (in a
// redirect_uri query string), and a substring match would watch that
// tab instead of the game -- which is exactly how the last round
// produced nothing. A hostname match cannot be fooled by a query
// string.
function hostOf(url) {
  try { return new URL(url).hostname; } catch (e) { return ''; }
}
function isTarget(url) {
  const h = hostOf(url);
  if (!h) return false;
  const want = ATTACH.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  return h === want || h.endsWith('.' + want);
}

// ── ONE CDP SESSION ON ONE TARGET ────────────────────────────────────
class Session {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.console = [];
  }
  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;
      ws.onopen = () => resolve(this);
      ws.onerror = (e) => reject(new Error('the websocket failed: ' + (e.message || 'unknown')));
      ws.onmessage = (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.method === 'Runtime.consoleAPICalled') {
          const text = (m.params.args || [])
            .map((a) => (a.value !== undefined ? a.value : a.description || a.type))
            .join(' ');
          this.console.push({ at: Date.now(), text: String(text) });
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
      }, 15000);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: false,
    });
    if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.text || 'the page threw'));
    return r.result ? r.result.value : undefined;
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

// WHAT ONE READING LOOKS LIKE
//
// AND WHAT IT MUST NOT DO: create a WebGL context.
//
// The first version of this probe asked for the GL limits by doing
// `document.createElement('canvas').getContext('webgl2')` -- ONCE A
// SECOND. Chrome keeps about sixteen live WebGL contexts and evicts
// the OLDEST when the seventeenth arrives, so the probe was evicting
// the ENGINE'S context out from under the game: the engine kept
// running on the CPU and the page went white. The instrument broke
// the subject, which is the exact failure the upload census made
// earlier. Never create a context to measure a context.
//
// The engine's own canvas already has one; asking IT for the limits
// returns the existing context and creates nothing.
const READ = `(() => {
  const c = document.getElementById('canvas');
  const p = window.__xashPacing ? window.__xashPacing() : null;
  let glLimits = null;
  try {
    const gl = c ? c.getContext('webgl2') : null;
    if (gl && !gl.isContextLost()) {
      glLimits = { maxViewport: gl.getParameter(gl.MAX_VIEWPORT_DIMS), maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) };
    }
  } catch (e) { glLimits = { error: e.message }; }
  return {
    t: Date.now(),
    url: location.href,
    canvas: c ? [c.width, c.height] : null,
    css: c ? [c.clientWidth, c.clientHeight] : null,
    dpr: window.devicePixelRatio || 1,
    screen: [window.screen.width, window.screen.height],
    engineWorkMs: p ? p.engineWorkMs : null,
    engineFps: p ? p.engineFps : null,
    lateFraction: p ? p.lateFraction : null,
    sustainableFps: p ? p.sustainableFps : null,
    everyNth: p ? p.everyNth : null,
    capFps: p ? p.capFps : null,
    browserHz: p ? p.browserHz : null,
    panelHz: p ? p.panelHz : null,
    pacing: p && p.pacing ? { p50: p.pacing.p50, p90: p.pacing.p90, p99: p.pacing.p99, max: p.pacing.max, samples: p.pacing.samples } : null,
    glLimits,
  };
})()`;

// ── THE JOIN FLOW, FOR THE --open MODE ───────────────────────────────
// The landing page's PLAY button, then the identity modal: type a
// name, pick a model, confirm. This is the flow a player takes, and
// the deploy's own browser gate drives it the same way.
const PLAY = `(() => {
  const b = document.querySelector('.ts-landing__play');
  if (b) { b.click(); return 'clicked play'; }
  return document.querySelector('.ident') ? 'the modal is already up' : 'no play button yet';
})()`;

const IDENT = `(() => {
  const m = document.querySelector('.ident');
  if (!m) return 'no modal';
  const input = m.querySelector('.ident__input');
  if (input) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(NAME)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const model = m.querySelector('.ident__model');
  if (model && !model.classList.contains('is-selected') && !model.className.includes('selected')) {
    model.click();
  }
  const go = m.querySelector('.ident__btn--go');
  if (go) { go.click(); return 'confirmed'; }
  return 'the modal has no confirm button yet';
})()`;

(async () => {
  console.log(`  cdp: ${CDP}`);
  let session = null;
  let opened = false;

  if (OPEN) {
    // A NEW TAB. Chrome's own HTTP API, because Playwright cannot see
    // the tabs on this browser at all.
    const res = await fetch(`${CDP}/json/new?${encodeURIComponent(OPEN)}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(15000),
    }).catch(() => null);
    if (!res || !res.ok) {
      console.error('  could not open a tab');
      process.exit(1);
    }
    const created = await res.json();
    opened = true;
    console.log(`  opened: ${created.url}`);
    session = await new Session(created.webSocketDebuggerUrl).connect();
    await session.send('Runtime.enable');
    await session.send('Page.enable').catch(() => {});
  } else {
    // ATTACH TO A TAB THAT IS ALREADY THERE. The waiting happens in
    // the sampling loop below, which can also MOVE to a tab that turns
    // out to be the one with the game running.
    console.log(`  waiting for a page target matching "${ATTACH}"...`);
  }

  // THE JOIN, IF WE OPENED THE TAB OURSELVES.
  if (OPEN) {
    console.log('  joining...');
    const until = Date.now() + 180000;
    let joined = false;
    while (Date.now() < until) {
      const state = await session
        .eval(`(() => {
          const has = !!window.__xash;
          const canvas = document.getElementById('canvas');
          const big = canvas && canvas.width > 300 && canvas.height > 200;
          const modal = !!document.querySelector('.ident');
          return { has, big, modal, url: location.href };
        })()`)
        .catch(() => null);
      if (state && state.has && state.big) { joined = true; break; }
      if (state && state.modal) {
        await session.eval(IDENT).catch(() => {});
      } else {
        await session.eval(PLAY).catch(() => {});
      }
      await sleep(1500);
    }
    if (!joined) { console.error('  the engine never came up'); process.exit(1); }
    console.log('  the engine is up; watching the budget...');
  } else {
    console.log('  watching...');
  }

  const rows = [];
  const started = Date.now();

  // FOLLOW THE GAME, NOT THE TAB. Kyle's browser has a BulletBallet
  // landing page open AND may open a second one to play in; watching
  // the wrong tab is how the last round produced nothing. So the
  // watcher looks for the tab whose ENGINE IS RUNNING and moves there
  // the moment it finds one, keeping the console it already captured.
  const liveEngine = async () => {
    const found = (await targets().catch(() => [])).filter((t) => isTarget(t.url));
    for (const t of found) {
      if (session && t.id === session.targetId) return null;
      let s;
      try {
        s = await new Session(t.webSocketDebuggerUrl).connect();
        await s.send('Runtime.enable');
        const live = await s.eval(
          `(() => { const c = document.getElementById('canvas');
            return !!(window.__xash && c && c.width > 300 && c.height > 200); })()`);
        if (live) return { t, s };
        s.close();
      } catch (e) { /* not this one */ }
    }
    return null;
  };

  while (Date.now() - started < SECONDS * 1000) {
    if (!session) {
      // WAIT FOR A TAB TO WATCH.
      const found = (await targets().catch(() => [])).filter((t) => isTarget(t.url));
      if (found.length) {
        try {
          session = await new Session(found[0].webSocketDebuggerUrl).connect();
          session.targetId = found[0].id;
          await session.send('Runtime.enable');
          targetUrl = found[0].url;
          console.log(`  attached: ${found[0].url}`);
          console.log(`  (the tab: ${found[0].title || 'untitled'} — ${found[0].id})`);
        } catch (e) { session = null; }
      }
    } else if (!OPEN) {
      // A tab with a LIVE engine elsewhere means we are watching the
      // wrong one. Move, and keep what we have.
      const live = await liveEngine();
      if (live) {
        console.log(`  the game is in another tab: ${live.t.url} — moving there`);
        const old = session;
        session = live.s;
        session.targetId = live.t.id;
        session.console = old.console;
        targetUrl = live.t.url;
        old.close();
      }
    }
    const row = session ? await session.eval(READ).catch(() => null) : null;
    if (row) rows.push(row);
    // WRITE AS IT GOES. The console capture is the only record of the
    // budget's own reasons, and it lives in memory until the run ends.
    // A run that is interrupted then loses exactly the thing worth
    // keeping, so the profile is written every ten seconds.
    if (rows.length % 10 === 0) {
      const out = path.join(__dirname, '..', '..', 'profiles', `render-budget-${RUN_ID}.json`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify({
        cdp: CDP, opened: OPEN || null, rows, console: session ? session.console : [],
      }, null, 2));
    }
    await sleep(1000);
  }

  // ── THE REPORT ─────────────────────────────────────────────────────
  console.log('');
  console.log(`  ${rows.length} readings over ${SECONDS}s`);
  const decisions = session.console.filter((c) => /\[video\]/.test(c.text));
  console.log('');
  console.log("  the budget's own decisions (the client's console):");
  if (!decisions.length) {
    console.log('     (none — the budget never moved)');
  } else {
    const t0 = decisions[0].at;
    for (const d of decisions) {
      console.log(`     +${((d.at - t0) / 1000).toFixed(0)}s  ${d.text}`);
    }
  }

  const withCanvas = rows.filter((r) => r.canvas);
  const sizes = [...new Set(withCanvas.map((r) => `${r.canvas[0]}x${r.canvas[1]}`))];
  console.log('');
  console.log(`  the canvas: ${sizes.length ? sizes.join(' -> ') : '?'}   (device pixels)`);
  if (withCanvas.length) {
    const first = withCanvas[0];
    const last = withCanvas[withCanvas.length - 1];
    console.log(`  it started at ${first.canvas[0]}x${first.canvas[1]} and ended at ${last.canvas[0]}x${last.canvas[1]}`);
    console.log(`  the display: ${first.screen[0]}x${first.screen[1]} at dpr ${first.dpr}`);
  }

  const works = rows.filter((r) => typeof r.engineWorkMs === 'number');
  if (works.length) {
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const w = works.map((r) => r.engineWorkMs);
    const lates = works.map((r) => r.lateFraction).filter((v) => typeof v === 'number');
    const p99 = works.map((r) => r.pacing && r.pacing.p99).filter((v) => typeof v === 'number');
    console.log('');
    console.log(`  the engine: ${f2(med(w))} ms a frame (median), ${f2(Math.min(...w))}-${f2(Math.max(...w))} (min-max)`);
    console.log(`  the late-frame fraction: ${lates.length ? (med(lates) * 100).toFixed(0) + '% (median)' : '—'}`);
    if (p99.length) console.log(`  the frame spacing: p99 ${f1(med(p99))} ms, max ${f1(Math.max(...p99))} ms`);
    const last = works[works.length - 1];
    console.log(`  the gate: one frame in ${last.everyNth} tick(s); the browser ticks at ${f1(last.browserHz)} Hz; the pacer says ${f1(last.sustainableFps)} fps is sustainable`);
  }

  const out = path.join(__dirname, '..', '..', 'profiles', `${RUN_ID}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({
    cdp: CDP, opened: OPEN || null, rows,
    console: session.console,
  }, null, 2));
  console.log('');
  console.log(`  the raw numbers: ${out}`);

  if (opened) {
    // CLOSE THE TAB WE OPENED, AND ONLY THAT ONE -- unless the caller
    // wants it kept (for a test of the attach path, or for a person to
    // keep playing in).
    if (!has('keep')) {
      await fetch(`${CDP}/json/close/${session.wsUrl.split('/').pop()}`, { method: 'PUT' })
        .catch(() => {});
    } else {
      console.log('  (the tab was left open)');
    }
  }
  session.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
