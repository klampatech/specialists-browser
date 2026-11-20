#!/usr/bin/env node
/**
 * WHY DID THE CANVAS GO WHITE?
 *
 * A white screen with a live engine means one thing: the WebGL context
 * is gone. The engine keeps spinning on the CPU (it is the GPU path
 * that died), so the frame cost looks perfect while the page shows
 * nothing.
 *
 * So this watches the three things that can explain it:
 *   1. THE CONTEXT LOST EVENT. `webglcontextlost` carries a
 *      `statusMessage` -- the browser's own reason ("Out of memory",
 *      "Context lost due to a GPU process crash"). That message is the
 *      answer; guessing is not.
 *   2. THE BROWSER'S LOG. `Log.entryAdded` carries the GPU process's
 *      complaints ("Automatic fallback to software WebGL", "GPU
 *      command buffer timeout"), which the page's own console never
 *      sees.
 *   3. THE PAGE'S CONSOLE AND EXCEPTIONS, so the client's own account
 *      of the moment is on the record.
 *
 * It attaches to a tab WITHOUT touching it -- no navigation, no click.
 *
 * USAGE
 *   node tools/perf/watch-context.cjs --cdp http://127.0.0.1:9224 \
 *        --attach bulletballet.dev --seconds 120
 */
function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : dflt;
}
const CDP = String(arg('cdp', 'http://127.0.0.1:9223')).replace(/\/$/, '');
const ATTACH = arg('attach', 'bulletballet.dev');
const SECONDS = Number(arg('seconds', 120));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hostOf(url) { try { return new URL(url).hostname; } catch (e) { return ''; } }
function isTarget(url) {
  const h = hostOf(url);
  if (!h) return false;
  const want = ATTACH.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  return h === want || h.endsWith('.' + want);
}

class Session {
  constructor(wsUrl) {
    this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); this.events = [];
  }
  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl); this.ws = ws;
      ws.onopen = () => resolve(this);
      ws.onerror = (e) => reject(new Error('ws failed: ' + (e.message || 'unknown')));
      ws.onmessage = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.method && m.method !== 'Runtime.consoleAPICalled') {
          this.events.push({ method: m.method, params: m.params, at: Date.now() });
          return;
        }
        const p = this.pending.get(m.id);
        if (p) { this.pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
      };
    });
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(method + ' timed out')); } }, 15000);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.text || 'threw'));
    return r.result ? r.result.value : undefined;
  }
}

(async () => {
  const list = await (await fetch(`${CDP}/json/list`)).json();
  const pages = list.filter((t) => t.type === 'page' && isTarget(t.url));
  if (!pages.length) { console.error('  no tab matched ' + ATTACH); process.exit(1); }
  const page = pages[0];
  console.log(`  tab ${page.id.slice(-8)}: ${page.url}`);

  const s = await new Session(page.webSocketDebuggerUrl).connect();
  await s.send('Runtime.enable');
  await s.send('Log.enable').catch(() => {});
  await s.send('Page.enable').catch(() => {});

  // THE CONTEXT LOST EVENT, WITH THE BROWSER'S OWN REASON. Installing
  // the listener AFTER the loss cannot recover the old event, so this
  // only catches the NEXT one -- but it also cannot hurt, and the
  // statusMessage is the only real answer to "why".
  await s.eval(`(() => {
    const c = document.getElementById('canvas');
    if (!c || c.__ctxWatched) return 'already watched';
    c.__ctxWatched = true;
    window.__ctxEvents = [];
    c.addEventListener('webglcontextlost', (e) => {
      window.__ctxEvents.push({ kind: 'lost', message: e.statusMessage, at: Date.now() });
      try { e.preventDefault(); } catch (err) {}
    }, false);
    c.addEventListener('webglcontextrestored', () => {
      window.__ctxEvents.push({ kind: 'restored', at: Date.now() });
    }, false);
    return 'watching the canvas';
  })()`).then((r) => console.log('  the canvas listener: ' + r));

  const READ = `(() => {
    const c = document.getElementById('canvas');
    let lost = 'no canvas';
    try {
      const gl = c && (c.getContext('webgl2') || null);
      lost = gl ? gl.isContextLost() : 'no gl';
    } catch (e) { lost = 'err:' + e.message; }
    const p = window.__xashPacing ? window.__xashPacing() : null;
    return JSON.stringify({
      canvas: c ? [c.width, c.height] : null,
      css: c ? [c.clientWidth, c.clientHeight] : null,
      lost,
      engine: !!window.__xash,
      cost: p ? p.engineWorkMs : null,
      fps: p ? p.engineFps : null,
      ctxEvents: window.__ctxEvents || [],
    });
  })()`;

  const started = Date.now();
  let last = null;
  while (Date.now() - started < SECONDS * 1000) {
    const raw = await s.eval(READ).catch(() => null);
    if (raw) {
      const now = JSON.parse(raw);
      const key = JSON.stringify([now.canvas, now.lost, now.cost && now.cost.toFixed(1)]);
      if (key !== last) {
        console.log(`  t+${((Date.now() - started) / 1000).toFixed(0)}s  canvas ${now.canvas}  css ${now.css}  lost=${now.lost}  cost ${now.cost}ms  fps ${now.fps}`);
        if (now.ctxEvents && now.ctxEvents.length) {
          for (const e of now.ctxEvents) console.log(`     CONTEXT ${e.kind}: ${e.message || ''}`);
        }
        last = key;
      }
    }
    await sleep(1000);
  }

  console.log('');
  console.log('  the browser log and the events:');
  for (const e of s.events) {
    if (e.method === 'Log.entryAdded') {
      const en = e.params.entry;
      console.log(`     [${en.level}] ${en.source}: ${en.text}`);
    } else if (e.method === 'Runtime.exceptionThrown') {
      const d = e.params.exceptionDetails;
      console.log(`     [exception] ${d.text} ${d.exception ? (d.exception.description || '') : ''}`.slice(0, 300));
    } else if (e.method === 'Runtime.consoleAPICalled') {
      const text = (e.params.args || []).map((a) => (a.value !== undefined ? a.value : a.description || a.type)).join(' ');
      console.log(`     [console.${e.params.type}] ${text}`.slice(0, 300));
    } else {
      console.log(`     [${e.method}] ${JSON.stringify(e.params).slice(0, 240)}`);
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
