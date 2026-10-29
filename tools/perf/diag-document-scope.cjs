/**
 * DIAGNOSTIC: what is `document` in the page after the engine boots?
 *
 * `measure-engine-resize-tracking.cjs` died with
 *
 *     TypeError: document.getElementById is not a function
 *
 * even though `document.createElement` worked on the same page moments
 * earlier. That means `document` is resolving to something that is not
 * the DOM document. This dumps what it actually is.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const URL_ = 'https://bulletballet.dev/';

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();

  const dump = async (when) => {
    const d = await page.evaluate(() => {
      const out = {};
      out.typeofDocument = typeof document;
      out.ctor = document && document.constructor ? document.constructor.name : null;
      out.hasGetElementById =
        typeof document !== 'undefined' &&
        typeof document.getElementById === 'function';
      out.hasQuerySelector =
        typeof document !== 'undefined' &&
        typeof document.querySelector === 'function';
      out.windowDocIsDoc =
        typeof window !== 'undefined' && window.document === document;
      out.windowDocCtor =
        window && window.document && window.document.constructor
          ? window.document.constructor.name
          : null;
      out.globalDocCtor =
        globalThis.document && globalThis.document.constructor
          ? globalThis.document.constructor.name
          : null;
      // An element with id="document" SHADOWS window.document via named
      // access on window -- the classic gotcha. Look for it.
      out.docIdElement = !!(document && document.querySelector &&
        document.querySelector('#document'));
      out.hasCanvas = !!(document && document.querySelector &&
        document.querySelector('#canvas'));
      out.bodyStart = document && document.body
        ? document.body.innerHTML.slice(0, 120)
        : null;
      return out;
    });
    console.log(`\n  --- ${when} ---`);
    for (const [k, v] of Object.entries(d)) {
      console.log(`   ${k.padEnd(22)} ${JSON.stringify(v)}`);
    }
  };

  await dump('on about:blank (before goto)');
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await dump('after goto, before the engine');
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  await dump('after the landing page renders');

  const fleet = await waitForFleet(page, URL_);
  console.log(`\n  fleet: ${JSON.stringify(fleet)}`);

  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'Diag');
  console.log(`  identity modal: ${ident.appeared ? 'appeared' : 'DID NOT APPEAR'}`);

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
  console.log(`  engine up: ${up}`);
  await page.waitForTimeout(4000);
  await dump('after the engine boots');

  // And the two access patterns side by side.
  const side = await page.evaluate(() => {
    const r = {};
    try {
      r.byId = document.getElementById('canvas')
        ? [document.getElementById('canvas').width, document.getElementById('canvas').height]
        : null;
    } catch (e) {
      r.byId = 'THREW: ' + e.message;
    }
    try {
      r.byQuery = document.querySelector('#canvas')
        ? [document.querySelector('#canvas').width, document.querySelector('#canvas').height]
        : null;
    } catch (e) {
      r.byQuery = 'THREW: ' + e.message;
    }
    try {
      r.viaWindow = window.document.getElementById('canvas')
        ? [window.document.getElementById('canvas').width, window.document.getElementById('canvas').height]
        : null;
    } catch (e) {
      r.viaWindow = 'THREW: ' + e.message;
    }
    return r;
  });
  console.log('\n  --- canvas access patterns ---');
  console.log('  ', JSON.stringify(side, null, 2).replace(/\n/g, '\n  '));

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
