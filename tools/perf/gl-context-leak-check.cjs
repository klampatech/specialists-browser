#!/usr/bin/env node
/**
 * DOES SOMETHING CREATE A WEBGL CONTEXT?
 *
 * WHY THIS TOOL EXISTS
 * --------------------
 * A white screen with a live engine means the WebGL context is gone.
 * Chrome keeps about sixteen live WebGL contexts and evicts the
 * OLDEST when the seventeenth arrives -- so anything that creates a
 * context per call eventually kills the engine's context out from
 * under the game, with the engine still running perfectly on the CPU.
 *
 * That happened twice on 2026-11-20, and both times the culprit was
 * an INSTRUMENT, not the game: a probe asking for the GL limits by
 * doing `document.createElement('canvas').getContext('webgl2')` once
 * a second. The instrument broke the subject.
 *
 * So this measures the thing directly: it watches the BROWSER'S OWN
 * log for "Too many active WebGL contexts" while it calls the thing
 * under test many times. The browser is the ground truth about how
 * many contexts exist; nothing has to be inferred.
 *
 * It joins a game first, because the interesting question is only
 * meaningful once the engine's own context exists.
 *
 * USAGE
 *   node tools/perf/gl-context-leak-check.cjs --url https://ci.bulletballet.dev/ \
 *        --calls 40 --expression "window.__xashPacing()"
 */
function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : dflt;
}
const CDP = String(arg('cdp', 'http://127.0.0.1:9223')).replace(/\/$/, '');
const URL_ = arg('url', 'https://ci.bulletballet.dev/');
const CALLS = Number(arg('calls', 40));
const EXPRESSION = arg('expression', 'window.__xashPacing()');
const NAME = arg('name', 'LeakProbe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Session {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); this.logs = []; }
  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl); this.ws = ws;
      ws.onopen = () => resolve(this);
      ws.onerror = (e) => reject(new Error('ws failed: ' + (e.message || 'unknown')));
      ws.onmessage = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.method === 'Log.entryAdded') { this.logs.push(m.params.entry.text); return; }
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
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(method + ' timed out')); } }, 20000);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.text || 'threw'));
    return r.result ? r.result.value : undefined;
  }
}

const PLAY = `(() => { const b = document.querySelector('.ts-landing__play'); if (b) { b.click(); return 'play'; } return document.querySelector('.ident') ? 'modal' : 'waiting'; })()`;
const IDENT = `(() => {
  const m = document.querySelector('.ident'); if (!m) return 'no modal';
  const input = m.querySelector('.ident__input');
  if (input) { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(input, ${JSON.stringify(NAME)}); input.dispatchEvent(new Event('input', { bubbles: true })); }
  const model = m.querySelector('.ident__model'); if (model) model.click();
  const go = m.querySelector('.ident__btn--go'); if (go) { go.click(); return 'confirmed'; }
  return 'no go button';
})()`;

(async () => {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent(URL_)}`, {
    method: 'PUT', signal: AbortSignal.timeout(15000),
  });
  const created = await res.json();
  console.log(`  opened: ${created.url}`);
  const s = await new Session(created.webSocketDebuggerUrl).connect();
  await s.send('Runtime.enable');
  await s.send('Log.enable');

  // JOIN, so the engine's own context exists. The question only
  // matters once there is something to evict.
  const until = Date.now() + 240000;
  let up = false;
  while (Date.now() < until) {
    const st = await s.eval(`(() => ({ has: !!window.__xash, big: (() => { const c = document.getElementById('canvas'); return !!(c && c.width > 300 && c.height > 200); })(), modal: !!document.querySelector('.ident') }))()`).catch(() => null);
    if (st && st.has && st.big) { up = true; break; }
    await s.eval(st && st.modal ? IDENT : PLAY).catch(() => {});
    await sleep(1500);
  }
  if (!up) { console.error('  the engine never came up'); process.exit(1); }
  console.log('  the engine is up');

  const before = s.logs.length;
  const t0 = Date.now();
  await s.eval(`(() => { for (let i = 0; i < ${CALLS}; i++) { try { ${EXPRESSION}; } catch (e) {} } return 'called ${CALLS}'; })()`)
    .catch((e) => console.log('  (the call threw: ' + e.message + ')'));
  await sleep(3000);
  const fresh = s.logs.slice(before);
  const tooMany = fresh.filter((t) => /too many active WebGL/i.test(t));
  console.log('');
  console.log(`  called ${CALLS}x: ${EXPRESSION}`);
  console.log(`  the browser's own log: ${fresh.length} entries, ${tooMany.length} of them "too many active WebGL contexts"`);
  console.log(`  => ${(tooMany.length / CALLS).toFixed(2)} contexts created per call`);
  for (const l of fresh.slice(0, 5)) console.log(`     - ${l.slice(0, 130)}`);

  await fetch(`${CDP}/json/close/${created.id}`, { method: 'PUT' }).catch(() => {});
  process.exit(tooMany.length > 0 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
