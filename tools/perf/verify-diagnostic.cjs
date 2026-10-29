/**
 * VERIFY THE DIAGNOSTIC BOOKMARKLET WORKS AGAINST PRODUCTION.
 *
 * The diagnostic is meant to be pasted into a console by a human, so it
 * has to survive being evaluated as a STRING in the page -- which is
 * exactly what `page.evaluate` does with a string argument.
 *
 * This harness:
 *   1. boots the real game against the real server
 *   2. evaluates the bookmarklet source as a string, in the page
 *   3. waits for the probe's 10-second report
 *   4. reads the overlay the diagnostic renders and prints it
 *
 * If the overlay has the numbers in it, Kyle can paste it and it works.
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();
const fs = require('fs');

const URL_ = 'https://bulletballet.dev/';

(async () => {
  // The GPU FLAGS MATTER. Without them Chromium falls back to
  // SwiftShader, and the whole page crawls at ~9 rAF/s -- which made
  // the diagnostic look broken (a 300x150 canvas that never got a
  // real frame, and zero gl.clear calls) when in fact the engine was
  // rendering at a few frames per second in software.
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
  });
  const page = await ctx.newPage();

  console.log('\n  target: ' + URL_);
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const fleet = await waitForFleet(page, {});
  if (!fleet || !fleet.ok) {
    console.log('  no server — cannot verify');
    await browser.close();
    process.exit(1);
  }
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'Diag2');
  if (!ident.appeared) {
    console.log('  no identity modal — aborting');
    await browser.close();
    process.exit(1);
  }
  console.log('  booting...');

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
  console.log(up ? '  engine is up.' : '  engine never came up');
  if (!up) {
    await browser.close();
    process.exit(1);
  }

  // Wait until the engine is actually IN A GAME. The diagnostic
  // measures frame pacing, which is meaningless until the engine is
  // rendering a scene.
  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });
  const bd = Date.now() + 120_000;
  while (Date.now() < bd && !banner) await page.waitForTimeout(2000);
  console.log(banner ? '  in the game.' : '  NO BANNER.');
  await page.waitForTimeout(6000);

  // Evaluate the BOOKMARKLET ARTEFACT -- the exact string Kyle
  // pastes -- not the source it was built from.
  //
  // This distinction caught a real bug: the bookmarklet was built by
  // collapsing the source to one line, which turned every `//` comment
  // into a comment that swallowed the rest of the file. The source
  // was fine; the SHIPPED ARTEFACT was syntactically invalid and did
  // nothing. Verifying the source hid it completely.
  //
  // So: read the built file, strip the `javascript:` prefix, and
  // evaluate exactly that.
  const bookmarklet = fs
    .readFileSync(
      '/home/kyle/Development/specialists-browser/tools/perf/diagnose-fullscreen.bookmarklet.txt',
      'utf8',
    )
    .trim();
  if (!bookmarklet.startsWith('javascript:')) {
    console.log('  the bookmarklet file is malformed');
    await browser.close();
    process.exit(1);
  }
  const code = bookmarklet.slice('javascript:'.length);

  // It must be ONE line. A raw newline truncates a `javascript:` URL.
  if (/[\r\n]/.test(code)) {
    console.log('  the bookmarklet contains newlines -- it would truncate');
    await browser.close();
    process.exit(1);
  }

  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));

  console.log('  evaluating the BOOKMARKLET ARTEFACT...');
  await page.evaluate(code);

  console.log('  waiting for the 10s report...');
  await page.waitForTimeout(13000);

  const overlay = await page.evaluate(() => {
    const el = document.getElementById('__bbDiag');
    return el ? el.textContent : null;
  });

  console.log('\n  === the overlay the player would see ===');
  console.log(overlay || '(NO OVERLAY — the diagnostic failed)');

  if (!overlay) {
    console.log('\n  console output:');
    for (const l of consoleLines) console.log('   ', l);
    await browser.close();
    process.exit(1);
  }

  const hasNumbers =
    overlay.includes('rAF rate') &&
    overlay.includes('upscale factor') &&
    overlay.includes('THE KEY COMPARISON');
  console.log(
    '\n  ' +
      (hasNumbers
        ? 'PASS — the diagnostic renders its numbers.'
        : 'FAIL — the overlay is missing its numbers.'),
  );

  // The numbers must be PLAUSIBLE, not merely present. A diagnostic
  // that reports 0 engine frames and then declares victory is broken,
  // and "the text is there" would not catch it.
  const num = (label) => {
    const m = overlay.match(new RegExp(label + '\\s*:\\s*([\\d.]+)'));
    return m ? parseFloat(m[1]) : NaN;
  };
  const raf = num('rAF rate');
  const engine = num('engine frames/s');
  const budget = num('frame budget');
  const problems = [];

  if (!(raf > 20)) {
    problems.push(`rAF rate is ${raf}/s -- the page is not running at a sane rate (GPU flags missing? software rendering?)`);
  }
  if (!(engine > 0)) {
    problems.push('engine frames/s is 0 -- the engine frame counter caught nothing');
  }
  if (overlay.includes('CANNOT BE DETERMINED')) {
    problems.push('the diagnostic refused to render a verdict');
  }
  // A 60Hz display must fit inside a 16.7ms budget with room to spare.
  if (budget > 0 && engine > 0) {
    const work = 1000 / engine;
    if (work > budget * 1.5) {
      problems.push(
        `implausible: engine work ${work.toFixed(1)}ms vs budget ${budget.toFixed(1)}ms`,
      );
    }
  }

  if (problems.length) {
    console.log('\n  FAIL -- the numbers are not plausible:');
    for (const p of problems) console.log('    - ' + p);
    await browser.close();
    process.exit(1);
  }
  console.log(
    `  PASS -- plausible: ${raf}/s rAF, ${engine}/s engine frames, ` +
      `${budget.toFixed(1)}ms budget`,
  );

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
