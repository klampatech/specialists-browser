#!/usr/bin/env node
// WHAT THE UPSTREAM FIX IS WORTH, MEASURED ON THE REAL GPU.
//
// THE DEFECT: the shipped glue has no MapBufferRange and no BufferStorage
// (measured: 0 occurrences of either in xash3d-DopHvWf3.js), so
// gl2_shim.c's config ends up with incremental = false and
// supports_mapbuffer = false -- and EVERY vertex upload takes the
// reallocating path:
//
//     pglBufferDataARB( GL_ARRAY_BUFFER_ARB, size, ptr, GL_STREAM_DRAW_ARB )
//
// which reallocates the buffer's storage on every draw. The census
// measured 116,192 such calls a second.
//
// THE FIX: allocate the storage ONCE, then update it in place:
//
//     pglBufferDataARB( GL_ARRAY_BUFFER_ARB, size, NULL, GL_STREAM_DRAW_ARB )  -- once
//     pglBufferSubDataARB( GL_ARRAY_BUFFER_ARB, 0, size, ptr )                  -- every time
//
// This measures what that is worth, at the shapes the census saw.
//
// THE METHOD (the lessons from the last round):
//   - a FRESH WebGL context per case (a lost context reports ~0 us)
//   - the buffer BOUND and INITIALISED before the measured loop
//   - gl.finish() after each block, so the driver's work is included
//   - it REFUSES to run in a tab with a live engine: a benchmark that
//     creates WebGL contexts has no business in a running game
//
// Usage: node gl-upload-benchmark.cjs [--n 20000] [--cdp http://127.0.0.1:9224]

const argOf = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};
const N = Number(argOf('--n', 20000));
const HOST = argOf('--cdp', 'http://127.0.0.1:9224');
const TAB = argOf('--tab', 'bulletballet.dev');

const BENCH = `(async () => {
  const out = [];
  window.__bench = { stage: 'start', cases: [] };
  const cases = [
    { name: '48 bytes  (a quad position)', size: 48, n: ${N} },
    { name: '32 bytes  (a quad texcoord)', size: 32, n: ${N} },
    { name: '1 KiB     (a small mesh)', size: 1024, n: Math.min(${N}, 4000) },
  ];
  for (const c of cases) {
    window.__bench.stage = 'context ' + c.size;
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) { out.push({ name: c.name, error: 'no webgl2' }); continue; }
    const src = new Uint8Array(c.size);
    for (let i = 0; i < c.size; i++) src[i] = i & 255;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, src, gl.STREAM_DRAW);

    window.__bench.stage = 'realloc ' + c.size;
    let t0 = performance.now();
    for (let i = 0; i < c.n; i++) {
      gl.bufferData(gl.ARRAY_BUFFER, src, gl.STREAM_DRAW);
    }
    gl.finish();
    const realloc = (performance.now() - t0) * 1000 / c.n;

    window.__bench.stage = 'subdata ' + c.size;
    gl.bufferData(gl.ARRAY_BUFFER, c.size, gl.STREAM_DRAW);
    t0 = performance.now();
    for (let i = 0; i < c.n; i++) {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, src);
    }
    gl.finish();
    const subdata = (performance.now() - t0) * 1000 / c.n;

    out.push({ name: c.name, size: c.size, n: c.n, reallocUs: realloc, subdataUs: subdata, savedUs: realloc - subdata });
    window.__bench.cases.push(out[out.length - 1]);
    gl.deleteBuffer(buf);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }
  window.__bench.stage = 'done';
  window.__bench.out = out;
  return JSON.stringify(out);
})()`;

(async () => {
  const base = HOST;
  const version = await (await fetch(`${base}/json/version`)).json();
  const list = await (await fetch(`${base}/json/list`)).json();
  const target = list.find((t) => t.type === 'page' && t.url.includes(TAB));
  if (!target) {
    console.log(`  no tab matching "${TAB}" on ${base}`);
    process.exit(1);
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) =>
    new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

  // REFUSE TO RUN IN A LIVE GAME. The benchmark creates WebGL contexts,
  // and Chrome evicts the oldest context past about sixteen -- which is
  // how the instrument broke the engine twice on 2026-11-20.
  const engine = await send('Runtime.evaluate', {
    expression: 'String(!!(window.__xash && window.__xashPacing))',
    returnByValue: true,
  });
  if (engine.result?.result?.value === 'true') {
    console.log('  the engine is running in that tab; refusing to create WebGL contexts there.');
    console.log('  close the game first, or point --tab at a page with no engine.');
    process.exit(1);
  }

  const started = Date.now();
  send('Runtime.evaluate', { expression: BENCH, awaitPromise: true, returnByValue: true })
    .then(async (res) => {
      // The page holds the rows: read them back from there.
      const back = await send('Runtime.evaluate', {
        expression: 'JSON.stringify(window.__bench.out)', returnByValue: true,
      });
      if (res.result?.exceptionDetails) {
        console.log('  THE BENCHMARK THREW:', JSON.stringify(res.result.exceptionDetails).slice(0, 500));
        process.exit(1);
      }
      const raw = back.result?.result?.value;
      if (!raw) { console.log('  no rows came back:', JSON.stringify(back).slice(0, 400)); process.exit(1); }
      print(JSON.parse(raw));
      process.exit(0);
    })
    .catch((e) => { console.log("  the benchmark threw:", e && e.message ? e.message : String(e)); process.exit(1); });

  const poll = setInterval(async () => {
    try {
      const r = await send('Runtime.evaluate', {
        expression: 'JSON.stringify(window.__bench || null)', returnByValue: true,
      });
      const v = r.result?.result?.value;
      if (v) {
        const b = JSON.parse(v);
        console.log(`  [${((Date.now() - started) / 1000).toFixed(0)}s] ${b.stage} (${(b.cases || []).length} cases done)`);
        if (b.stage === 'done') clearInterval(poll);
      }
    } catch (e) { /* the page went away */ }
  }, 5000);

  function print(rows) {
    console.log(`  ${version.Browser}\n`);
    console.log('   the shape                     bufferData  bufferSubData   saved    at 116k calls/s');
    for (const r of rows) {
      if (r.error) { console.log(`   ${r.name}: ${r.error}`); continue; }
      console.log(
        `   ${r.name.padEnd(28)} ${r.reallocUs.toFixed(3)} us   ${r.subdataUs.toFixed(3)} us   ` +
        `${r.savedUs.toFixed(3)} us   ${((r.savedUs * 116192) / 1000).toFixed(1)} ms`,
      );
    }
  }

  setTimeout(() => { console.log('  the benchmark did not finish in time'); process.exit(1); }, 300000);
})().catch((e) => { console.error('  the benchmark failed:', e.message); process.exit(1); });
