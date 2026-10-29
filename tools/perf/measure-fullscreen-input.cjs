/**
 * DOES FULLSCREEN FLOOD THE MAIN THREAD WITH INPUT EVENTS?
 *
 * THE HYPOTHESIS
 * --------------
 * Kyle's report has three parts, and the third is the clue:
 *
 *   1. maximised window: "plays like 60+ fps"
 *   2. fullscreen: "plays like it's in the 40s-50s and sometimes feels
 *      very smooth like 60s"
 *   3. "I've watch the in game FPS counter and it doesn't quite seem to
 *       match with the performance i'm feeling"
 *
 * The ENGINE's counter measures the ENGINE's own frame time. It cannot
 * see work that happens outside the engine's draw call. So if
 * fullscreen makes the BROWSER deliver many more input events, and
 * each one costs main-thread time, then:
 *
 *   - the engine still draws its frames on time, and its counter still
 *     reads fine,
 *   - but the browser's rAF loop is being starved, so the frames that
 *     DO get presented arrive irregularly,
 *   - and the player feels the judder while the counter says nothing
 *     is wrong.
 *
 * WHY FULLSCREEN WOULD DELIVER MORE INPUT
 * ---------------------------------------
 * Pointer lock. In fullscreen the engine requests pointer lock
 * (`emscripten_request_pointerlock`), and with the pointer locked
 * Chrome delivers mousemove events with RAW, UNACCELERATED deltas at
 * the device's full polling rate -- hundreds per second -- instead of
 * the coalesced, throttled events an unlocked mouse gets. Every one of
 * those is a DOM event, and the client DLL consumes each one.
 *
 * WHAT THIS MEASURES
 * ------------------
 * In each state, over the same window:
 *   - the browser's rAF rate and interval distribution
 *   - the RATE of mousemove events reaching the page
 *   - the event-loop lag (how late a setTimeout(0) fires)
 *   - the engine's canvas CSS size, and whether the engine's OWN
 *     fullscreen path took over (it sets an inline `width` in px with
 *     `!important`, which is how the engine scales to the screen)
 *
 * The mouse is moved during the measurement, so the event rate is
 * measured under REAL input load rather than with an idle mouse.
 *
 * USAGE
 *   node tools/perf/measure-fullscreen-input.cjs [--gpu] [--json OUT]
 */
const { loadPlaywright } = require('../deploy/lib/browser.cjs');
const { confirmIdentity } = require('../deploy/lib/identity-modal.cjs');
const { waitForFleet } = require('../deploy/lib/fleet.cjs');
const { chromium } = loadPlaywright();

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf('--' + name);
  if (i === -1) return dflt;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const has = (name) => argv.includes('--' + name);

const URL_ = arg('url', 'https://bulletballet.dev/');
const JSON_OUT = arg('json', null);
const USE_GPU = has('gpu');

const GPU_ARGS = [
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--ignore-gpu-blocklist',
  '--enable-gpu',
  '--disable-gpu-sandbox',
];

/** Install the probe: rAF rate, mousemove rate, and event-loop lag. */
async function installProbe(page) {
  await page.evaluate(() => {
    if (window.__fiProbe) window.__fiProbe.stop();
    const p = {
      ticks: 0,
      deltas: [],
      mouseEvents: 0,
      mouseDx: 0,
      lag: [],
      started: performance.now(),
    };
    const onRaf = (t) => {
      p.ticks++;
      if (p.last !== undefined) p.deltas.push(t - p.last);
      p.last = t;
      p.raf = requestAnimationFrame(onRaf);
    };
    p.raf = requestAnimationFrame(onRaf);

    const onMouse = (e) => {
      p.mouseEvents++;
      p.mouseDx += Math.abs(e.movementX || 0);
    };
    // CAPTURE phase, so it counts the event even if the engine stops it.
    window.addEventListener('mousemove', onMouse, true);

    const onTimeout = () => {
      const now = performance.now();
      p.lag.push(now - p.expected);
      p.expected = now + 16;
      p.timer = setTimeout(onTimeout, 0);
    };
    p.expected = performance.now();
    p.timer = setTimeout(onTimeout, 0);

    p.stop = () => {
      cancelAnimationFrame(p.raf);
      clearTimeout(p.timer);
      window.removeEventListener('mousemove', onMouse, true);
      p.rafPerSec = p.ticks / ((performance.now() - p.started) / 1000);
      const d = p.deltas.slice().sort((a, b) => a - b);
      const f = (q) => (d.length ? d[Math.floor(d.length * q)] : null);
      p.frameMed = f(0.5);
      p.frameP99 = f(0.99);
      p.slowFraction = p.deltas.length
        ? p.deltas.filter((x) => x > 20).length / p.deltas.length
        : null;
      p.lagMed = p.lag.length
        ? p.lag.slice().sort((a, b) => a - b)[Math.floor(p.lag.length / 2)]
        : null;
      p.mousePerSec = p.mouseEvents / ((performance.now() - p.started) / 1000);
    };
    window.__fiProbe = p;
  });
}

async function canvasState(page) {
  return page.evaluate(() => {
    const c = document.querySelector('#canvas');
    if (!c) return null;
    return {
      backing: [c.width, c.height],
      css: [c.clientWidth, c.clientHeight],
      // The engine's fullscreen path sets an inline width in px with
      // !important. If that is set, the ENGINE's fullscreen took over.
      inlineWidth: c.style.width || null,
      inlineWidthPriority: c.style.getPropertyPriority('width') || null,
      viewportPx: [window.innerWidth, window.innerHeight],
      screen: [window.screen.width, window.screen.height],
      fullscreenElement: document.fullscreenElement
        ? document.fullscreenElement.tagName +
          (document.fullscreenElement.id ? '#' + document.fullscreenElement.id : '')
        : null,
      pointerLocked: !!document.pointerLockElement,
    };
  });
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', ...(USE_GPU ? GPU_ARGS : [])],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);

  console.log(`\n  target: ${URL_}`);
  const rend = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`  renderer: ${rend}`);

  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'xash',
        JSON.stringify({
          browserFullscreen: false,
          fullScreen: false,
          renderResolution: 'auto',
          selectedGameKey: 'TS',
        }),
      );
    } catch (e) {}
  });

  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const fleet = await waitForFleet(page, {});
  if (!fleet || !fleet.ok) {
    console.log('  no server — cannot measure');
    await browser.close();
    process.exit(1);
  }
  console.log(`  fleet: ${fleet.servers} server(s)`);
  await page.waitForSelector('.ts-landing__play', { timeout: 60_000 });

  console.log('  booting the engine...');
  await page.click('.ts-landing__play');
  const ident = await confirmIdentity(page, 'Fi');
  if (!ident.appeared) {
    console.log('  no identity modal — aborting');
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
  if (!up) {
    console.log('  the engine never came up');
    await browser.close();
    process.exit(1);
  }
  console.log('  engine is up.');

  let banner = false;
  page.on('console', (m) => {
    if (/Server #\d+/.test(m.text())) banner = true;
  });
  const bannerDeadline = Date.now() + 120_000;
  while (Date.now() < bannerDeadline && !banner) {
    await page.waitForTimeout(2000);
  }
  console.log(banner ? '  in the game.' : '  NO BANNER.');
  await page.waitForTimeout(8000);

  // Take pointer lock so the mouse delivers raw deltas -- the state a
  // real player is in.
  const locked = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    if (!c) return 'no canvas';
    const r = c.getBoundingClientRect();
    const x = r.width / 2;
    const y = r.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y };
    c.dispatchEvent(new MouseEvent('mousedown', opts));
    c.dispatchEvent(new MouseEvent('mouseup', opts));
    return 'clicked';
  });
  console.log(`  pointer lock: ${locked}`);
  await page.waitForTimeout(1500);
  const lockState = await page.evaluate(() => !!document.pointerLockElement);
  console.log(`  pointer locked: ${lockState}`);

  const records = [];
  const measure = async (label) => {
    await installProbe(page);
    // MOVE THE MOUSE for the whole window, so the event rate is
    // measured under real input load.
    const started = Date.now();
    let x = 400;
    while (Date.now() - started < 6000) {
      x = 400 + ((Date.now() / 10) % 600);
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x,
        y: 400,
        button: 'left',
        buttons: 1,
      });
      await page.waitForTimeout(8);
    }
    const p = await page.evaluate(() => {
      const q = window.__fiProbe;
      q.stop();
      return {
        rafPerSec: q.rafPerSec,
        frameMed: q.frameMed,
        frameP99: q.frameP99,
        slowFraction: q.slowFraction,
        lagMed: q.lagMed,
        mouseEvents: q.mouseEvents,
        mousePerSec: q.mousePerSec,
        mouseDx: q.mouseDx,
      };
    });
    const cs = await canvasState(page);
    const rec = { label, ...p, canvas: cs };
    records.push(rec);
    console.log(
      `  ${label.padEnd(24)} rAF=${p.rafPerSec.toFixed(1)}/s ` +
        `frameMed=${p.frameMed ? p.frameMed.toFixed(1) : '?'}ms ` +
        `p99=${p.frameP99 ? p.frameP99.toFixed(1) : '?'}ms ` +
        `slow=${((p.slowFraction || 0) * 100).toFixed(1)}% ` +
        `lag=${p.lagMed ? p.lagMed.toFixed(1) : '?'}ms`,
    );
    console.log(
      `      MOUSE: ${p.mouseEvents} events in 6s = ${p.mousePerSec.toFixed(0)}/s ` +
        `(total |dx| ${p.mouseDx})   pointerLocked=${cs.pointerLocked}`,
    );
    console.log(
      `      canvas: backing=${cs.backing.join('x')} css=${cs.css.join('x')} ` +
        `inline width=${cs.inlineWidth || '(none)'}` +
        `${cs.inlineWidthPriority ? ' !' + cs.inlineWidthPriority : ''} ` +
        `fullscreenElement=${cs.fullscreenElement}`,
    );
    return rec;
  };

  console.log('\n  --- windowed, mouse moving ---');
  const win = await measure('windowed');

  console.log('\n  --- fullscreen, mouse moving ---');
  const got = await page.evaluate(() => {
    if (document.fullscreenElement) return 'already';
    return document.documentElement
      .requestFullscreen()
      .then(() => 'granted')
      .catch(() => 'refused');
  });
  await page.waitForTimeout(4000);
  const fs = await measure(`fullscreen (${got})`);

  console.log('\n  === SUMMARY ===');
  console.log(
    '  state              rAF/s   slow%    lag    mouse events/s   pointer locked',
  );
  for (const r of records) {
    console.log(
      `  ${r.label.padEnd(18)} ${r.rafPerSec.toFixed(1).padStart(5)} ` +
        `${((r.slowFraction || 0) * 100).toFixed(1).padStart(6)}% ` +
        `${(r.lagMed || 0).toFixed(1).padStart(6)}ms ` +
        `${r.mousePerSec.toFixed(0).padStart(13)}   ` +
        `${String(r.canvas.pointerLocked).padStart(14)}`,
    );
  }
  console.log('\n  KEY:');
  console.log(
    `  mouse events/s: windowed ${win.mousePerSec.toFixed(0)} -> ` +
      `fullscreen ${fs.mousePerSec.toFixed(0)} ` +
      `(${fs.mousePerSec > win.mousePerSec * 1.5 ? 'A FLOOD' : 'no flood'})`,
  );
  console.log(
    `  rAF: windowed ${win.rafPerSec.toFixed(1)}/s (slow ${((win.slowFraction || 0) * 100).toFixed(1)}%) -> ` +
      `fullscreen ${fs.rafPerSec.toFixed(1)}/s (slow ${((fs.slowFraction || 0) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  event-loop lag: windowed ${(win.lagMed || 0).toFixed(1)}ms -> ` +
      `fullscreen ${(fs.lagMed || 0).toFixed(1)}ms`,
  );

  if (JSON_OUT) {
    require('fs').writeFileSync(
      JSON_OUT,
      JSON.stringify({ renderer: rend, records }, null, 2),
    );
    console.log(`\n  wrote ${JSON_OUT}`);
  }

  await browser.close();
})().catch((e) => {
  console.error('TEST ERROR:', e);
  process.exit(1);
});
