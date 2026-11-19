#!/usr/bin/env node
// HOW MUCH DATA IS THE ENGINE UPLOADING EVERY FRAME, AND IS IT THE SAME
// DATA EVERY TIME?
//
// `bufferData` is the biggest single item in the GL call path -- half of
// it, in every profile ever taken on this project. That is where the
// upstream fix lives, but "bufferData is expensive" is not yet an
// actionable upstream issue. Two things make it one:
//
//   1. HOW MANY calls, and HOW MANY BYTES, per frame
//   2. whether the SAME bytes go up every frame
//
// (2) is the whole question. If the engine re-uploads the same static
// geometry 47 times a second, the fix is to cache the buffers -- a small,
// uncontroversial upstream PR. If it is a dynamic stream that genuinely
// changes every frame, the fix is different (partial updates), and the
// upstream issue has to say so.
//
// So this counts the calls, the bytes, and the SHAPE of each frame's
// uploads, and then asks: how many frames in a row had exactly the same
// shape?
//
// THE PATCH GOES IN BEFORE THE ENGINE'S SCRIPTS RUN. The engine creates
// its WebGL context early; a prototype patch installed afterwards
// misses every call it made before. So it is an init script, and it
// patches the PROTOTYPE, not the context -- the context does not exist
// yet when the patch lands.
//
// Usage:
//   node tools/perf/gl-upload-probe.cjs [--cdp http://localhost:9223]
//                                      [--url https://ci.bulletballet.dev/]
//                                      [--seconds 20]

const fs = require('fs');
const path = require('path');
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { ensureAtLeastOnePage } = require('./lib/cdp-targets.cjs');

const argOf = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
};
const CDP = argOf('--cdp', 'http://localhost:9223');
const URL_ = argOf('--url', 'https://ci.bulletballet.dev/');
const SECONDS = Number(argOf('--seconds', 20));

// THE PAGE-SIDE PATCH.
const INIT = `
(() => {
  const stats = {
    frames: 0,
    calls: 0,
    bytes: 0,
    subCalls: 0,
    subBytes: 0,
    deleteCalls: 0,
    createCalls: 0,
    shapes: [],      // one signature per frame
    frameCalls: 0,
    frameBytes: 0,
  };
  window.__glProbe = stats;

  const sizeOf = (arg) => {
    if (typeof arg === 'number') return arg;
    if (arg && typeof arg.byteLength === 'number') return arg.byteLength;
    if (arg && typeof arg.length === 'number') return arg.length;
    return 0;
  };

  const patch = (Ctor, label) => {
    if (!Ctor || !Ctor.prototype) return;
    const proto = Ctor.prototype;
    if (proto.__glProbePatched) return;
    proto.__glProbePatched = true;

    const origData = proto.bufferData;
    proto.bufferData = function (target, sizeOrData, usage) {
      const bytes = sizeOf(sizeOrData);
      stats.calls++;
      stats.bytes += bytes;
      stats.frameCalls++;
      stats.frameBytes += bytes;
      stats.shapes[stats.frames] = stats.shapes[stats.frames] || [];
      stats.shapes[stats.frames].push(target + ':' + bytes);
      // THE STACK, FOR THE FIRST FEW CALLS OF AN UNUSUAL SIZE. The
      // caller is what names the bug: the glue's own temp-buffer path
      // shows getTempVertexBuffer, the emscripten wrapper shows
      // _emscripten_glBufferData, and those are two different fixes.
      if (bytes >= 1048576 && stats.stacks.length < 6 && !stats.stacks.length) {
        try {
          stats.stacks.push(new Error().stack || '(no stack)');
        } catch (e) {
          stats.stacks.push('(no stack)');
        }
      }
      return origData.apply(this, arguments);
    };

    const origSub = proto.bufferSubData;
    if (origSub) {
      proto.bufferSubData = function (target, offset, sizeOrData) {
        const bytes = sizeOf(sizeOrData);
        stats.subCalls++;
        stats.subBytes += bytes;
        stats.frameCalls++;
        stats.frameBytes += bytes;
        stats.shapes[stats.frames] = stats.shapes[stats.frames] || [];
        stats.shapes[stats.frames].push('sub:' + target + ':' + bytes);
        return origSub.apply(this, arguments);
      };
    }

    const origCreate = proto.createBuffer;
    if (origCreate) {
      proto.createBuffer = function () {
        stats.createCalls++;
        return origCreate.apply(this, arguments);
      };
    }

    const origDelete = proto.deleteBuffer;
    if (origDelete) {
      proto.deleteBuffer = function () {
        stats.deleteCalls++;
        return origDelete.apply(this, arguments);
      };
    }
  };

  patch(window.WebGL2RenderingContext, 'webgl2');
  patch(window.WebGLRenderingContext, 'webgl1');

  // THE FRAME ROLL-OVER. The engine's frames are vsync-driven and so is
  // this, so the two counters line up -- and the pacer's own frame
  // count is the check on that.
  const tick = () => {
    stats.frames++;
    stats.frameCalls = 0;
    stats.frameBytes = 0;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
`;

(async () => {
  await ensureAtLeastOnePage(CDP);
  const { chromium } = loadPlaywright();
  const browser = await chromium.connectOverCDP(CDP);
  const ctx = browser.contexts()[0];
  let page = await ctx.newPage();

  // BEFORE THE ENGINE'S SCRIPTS RUN.
  await ctx.addInitScript(INIT);

  // ATTACH OR JOIN.
  //
  // On Kyle's own machine there is already a client in a fight, and a
  // second client would share the main thread with it and make both
  // numbers meaningless. So `--attach` measures the game tab that is
  // ALREADY THERE, and waits for the engine to be running before it
  // counts anything.
  const ATTACH = process.argv.includes('--attach');
  if (ATTACH) {
    const found = ctx.pages().find((p) => /bulletballet\.dev/.test(p.url()));
    if (!found) {
      console.error('  no bulletballet.dev tab to attach to');
      process.exit(1);
    }
    console.log(`  attached to: ${found.url()}`);
    // THE PATCH GOES IN HERE, NOT AS AN INIT SCRIPT. The tab is already
    // loaded -- an init script would never run in it -- but the engine
    // calls bufferData on EVERY FRAME, so patching the prototype now
    // catches every call that matters. The calls already made are the
    // ones we do not care about.
    await found.evaluate(INIT);
    await found.waitForTimeout(2000);
    await page.close().catch(() => {});
    page = found;
    console.log('  waiting for the engine to come up (up to 10 minutes)...');
    let live = false;
    const until = Date.now() + 600_000;
    while (Date.now() < until) {
      const s = await page
        .evaluate(() => {
          const c = document.getElementById('canvas');
          const em = window.__xash && window.__xash.em;
          let heap = 0;
          try {
            heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
          } catch (e) {}
          const p = window.__xashPacing ? window.__xashPacing() : null;
          return {
            has: !!window.__xash,
            canvas: c ? [c.width, c.height] : null,
            heap,
            fps: p && p.engineFps ? p.engineFps : 0,
          };
        })
        .catch(() => ({ has: false }));
      if (s.has && s.canvas && s.canvas[0] > 300 && s.heap > 0 && s.fps > 0) {
        live = true;
        console.log(`  the engine is running: ${s.fps.toFixed(1)} fps`);
        break;
      }
      await page.waitForTimeout(1000);
    }
    if (!live) {
      console.error('  the engine never started -- get into a fight and try again');
      process.exit(1);
    }
  } else {
    console.log(`  the page: ${URL_}`);
    await page.goto(URL_, { waitUntil: 'domcontentloaded' });

    // THE GAME. The landing page's play button, then the identity modal.
    await page.waitForSelector('.ts-landing__play', { timeout: 30_000 });
    await page.click('.ts-landing__play');
    await confirmIdentity(page, 'GlProbe');
  }

  console.log('  booting...');
  let up = false;
  const until = Date.now() + 420_000;
  while (Date.now() < until) {
    const s = await page
      .evaluate(() => {
        const c = document.getElementById('canvas');
        const em = window.__xash && window.__xash.em;
        let heap = 0;
        try {
          heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
        } catch (e) {}
        return { has: !!window.__xash, canvas: c ? [c.width, c.height] : null, heap };
      })
      .catch(() => ({ has: false }));
    if (s.has && s.canvas && s.canvas[0] > 300 && s.heap > 0) {
      up = true;
      break;
    }
    await page.waitForTimeout(1000);
  }
  if (!up) {
    console.error('  the engine never came up');
    process.exit(1);
  }
  console.log('  the engine is up; measuring the uploads...');
  await page.waitForTimeout(3000);

  await page.waitForTimeout(SECONDS * 1000);

  const stats = await page.evaluate(() => {
    const s = window.__glProbe || {};
    const canvas = document.getElementById('canvas');
    const p = window.__xashPacing ? window.__xashPacing() : null;
    return {
      frames: s.frames || 0,
      calls: s.calls || 0,
      bytes: s.bytes || 0,
      subCalls: s.subCalls || 0,
      subBytes: s.subBytes || 0,
      createCalls: s.createCalls || 0,
      deleteCalls: s.deleteCalls || 0,
      shapes: s.shapes || [],
      stacks: s.stacks || [],
      canvas: canvas ? [canvas.width, canvas.height] : null,
      engineFps: p ? p.engineFps : 0,
      engineWorkMs: p ? p.engineWorkMs : 0,
    };
  });

  // --- the analysis -----------------------------------------------------
  const frames = Math.max(1, stats.frames);
  const shapes = stats.shapes.filter(Boolean);

  // HOW MANY FRAMES IN A ROW HAD EXACTLY THE SAME SHAPE? That is the
  // question: the same geometry, uploaded again, at the same sizes, in
  // the same order, frame after frame.
  let sameRun = 1;
  let bestRun = 1;
  let bestAt = 0;
  for (let i = 1; i < shapes.length; i++) {
    const a = shapes[i - 1].join(',');
    const b = shapes[i].join(',');
    if (a === b) {
      sameRun++;
      if (sameRun > bestRun) {
        bestRun = sameRun;
        bestAt = i;
      }
    } else {
      sameRun = 1;
    }
  }
  const distinct = new Set(shapes.map((s) => s.join(','))).size;

  console.log('');
  console.log(`  the canvas: ${stats.canvas ? stats.canvas.join(' x ') : '?'}` +
    `   the engine: ${stats.engineFps ? stats.engineFps.toFixed(1) + ' fps' : '?'}` +
    `${stats.engineWorkMs ? ' at ' + stats.engineWorkMs.toFixed(2) + ' ms a frame' : ''}`);
  console.log(`  ${frames} frames measured`);
  console.log('');
  console.log(`  bufferData calls:      ${stats.calls}   (${(stats.calls / frames).toFixed(1)} a frame)`);
  console.log(`  bufferData bytes:      ${stats.bytes.toLocaleString()}   (${(stats.bytes / frames).toFixed(0)} a frame)`);
  if (stats.subCalls) {
    console.log(`  bufferSubData calls:   ${stats.subCalls}   (${(stats.subCalls / frames).toFixed(1)} a frame), ${(stats.subBytes / frames).toFixed(0)} bytes a frame`);
  }
  console.log(`  buffers created:       ${stats.createCalls}   deleted: ${stats.deleteCalls}`);
  console.log('');
  console.log(`  the SHAPE of each frame's uploads: ${distinct} distinct shapes across ${shapes.length} frames`);
  console.log(`  the longest run of frames with an IDENTICAL shape: ${bestRun}` +
    (bestRun > 1 ? ` (ending at frame ${bestAt})` : ''));

  if (shapes.length) {
    const counts = new Map();
    for (const entry of shapes[0]) counts.set(entry, (counts.get(entry) || 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log('');
    console.log('  what a frame uploads (target:bytes), the busiest first:');
    for (const [k, v] of top) {
      console.log(`     ${k.padEnd(24)} x${v}`);
    }
  }

  if (stats.stacks && stats.stacks.length) {
    console.log('');
    console.log('  the stack of the first big upload:');
    for (const line of stats.stacks[0].split('\n').slice(0, 8)) {
      console.log(`     ${line.trim()}`);
    }
  }

  const out = path.join(__dirname, '..', '..', 'profiles', `gl-upload-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(stats, null, 2));
  console.log('');
  console.log(`  the raw numbers: ${out}`);

  await page.close().catch(() => {});
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
