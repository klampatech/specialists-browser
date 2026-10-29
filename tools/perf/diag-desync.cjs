/**
 * WHY IS `desynchronized` STILL FALSE?
 *
 * The A/B harness reports `desynchronized=false` for the `?desync=1`
 * configurations, even though `prepareEngineContext` is called at the
 * top of `initXash` — before the engine module is created.
 *
 * Possibilities:
 *   A. the query parameter never reaches the app (a navigation drops
 *      it, or the boot path rewrites the URL),
 *   B. `prepareEngineContext` runs, but the engine's renderer had
 *      ALREADY created the context by then (so ours is ignored),
 *   C. `prepareEngineContext` is not reached at all on the boot path
 *      the landing page actually takes,
 *   D. the canvas passed to `initXash` is not the canvas the engine
 *      renders into.
 *
 * This prints the app's OWN log line and the context attributes at
 * each stage, so the answer is in the output rather than a guess.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const BASE = 'https://127.0.0.1:8899/';

(async () => {
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--use-angle=vulkan',
      '--enable-features=Vulkan',
      '--ignore-gpu-blocklist',
      '--enable-gpu',
      '--disable-gpu-sandbox',
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  const logs = [];
  page.on('console', (m) => logs.push(m.text()));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));

  // RECORD EVERY getContext CALL, with the attributes it was made
  // with.
  //
  // The diagnostic must NOT call getContext itself: that would create
  // the context with the default attributes and destroy the thing it
  // is trying to observe. An earlier version of this probe called it
  // "just to look", and that call was the reason the context always
  // came back with `desynchronized: false`.
  await page.addInitScript(() => {
    window.__ctxCalls = [];
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      const gl = orig.call(this, type, attrs);
      if (/webgl/i.test(type)) {
        try {
          window.__ctxCalls.push({
            type,
            requested: attrs ? { ...attrs } : null,
            got: gl ? gl.getContextAttributes() : null,
            stack: new Error().stack
              .split('\n')
              .slice(1, 5)
              .join(' | '),
          });
        } catch (e) {}
      }
      return gl;
    };
  });

  const url = `${BASE}?desync=1`;
  console.log(`\n  navigating to ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  console.log('  location.search right after load:', await page.evaluate(() => location.search));

  const fleet = await waitForFleet(page, {});
  if (!fleet || !fleet.ok) {
    console.log('  no server');
    await browser.close();
    process.exit(1);
  }
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });

  // BEFORE the game starts: what has called getContext so far?
  // NOTE: no getContext call here -- that would create the context.
  const before = await page.evaluate(() => ({
    canvas: !!document.getElementById('canvas'),
    ctxCalls: window.__ctxCalls || [],
    search: location.search,
  }));
  console.log(
    '  BEFORE the game starts: canvas=' + before.canvas +
      ' getContext calls so far=' + before.ctxCalls.length,
  );
  for (const c of before.ctxCalls) {
    console.log('    requested:', JSON.stringify(c.requested));
    console.log('    got      :', JSON.stringify(c.got));
    console.log('    from     :', c.stack);
  }

  await page.click('.ts-landing__play');
  console.log('  location.search after clicking play:', await page.evaluate(() => location.search));

  const ident = await confirmIdentity(page, 'Dbg');
  if (!ident.appeared) {
    console.log('  no identity modal');
    await browser.close();
    process.exit(1);
  }
  let up = false;
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const em = window.__xash && window.__xash.em;
      let heap = 0;
      try {
        heap = em && em.HEAPU8 ? em.HEAPU8.buffer.byteLength : 0;
      } catch (e) {}
      return { heap };
    });
    if (s.heap > 8 * 1024 * 1024) {
      up = true;
      break;
    }
    await page.waitForTimeout(2000);
  }
  console.log(up ? '  engine up' : '  engine never came up');
  await page.waitForTimeout(5000);

  const after = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const gl = c && c.getContext('webgl2');
    return {
      search: location.search,
      href: location.href,
      attrs: gl ? gl.getContextAttributes() : null,
      backing: c ? { w: c.width, h: c.height } : null,
    };
  });
  console.log('  AFTER the engine is up:', JSON.stringify(after));

  console.log('\n  --- EVERY getContext call, in order ---');
  const calls = await page.evaluate(() => window.__ctxCalls || []);
  for (const c of calls) {
    console.log('  requested:', JSON.stringify(c.requested));
    console.log('  got      :', JSON.stringify(c.got));
    console.log('  from     :', c.stack);
    console.log('');
  }

  console.log('\n  --- the app\'s own log lines ---');
  for (const l of logs) {
    if (l.includes('[webgl]') || l.includes('[frame-pacing]') || l.includes('PAGEERROR')) {
      console.log('   ', l);
    }
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
