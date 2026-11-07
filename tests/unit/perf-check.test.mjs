/**
 * The client performance readout: the policy that turns measurements
 * into what the player is told.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The readout is the thing that tells a player their browser is
 * holding the game back. That is a strong claim to make to somebody
 * whose machine it is, and a claim that is WRONG costs them an hour
 * of settings-fiddling for nothing.
 *
 * So the policy is tested against the cases that were actually
 * measured, and against the cases where the honest answer is "nothing
 * to do" — a readout that always finds a problem is a readout nobody
 * believes.
 *
 * THE MEASUREMENTS BEHIND THE POLICY
 * ----------------------------------
 * Measured 2026-11-07, Kyle's MacBook Pro (M3 Pro, Liquid Retina XDR,
 * 3456x2234 at dpr 2, macOS 26.2, Chrome 157):
 *
 *     the panel's own rate (CoreGraphics):    120.0 Hz
 *     a bare rAF loop with no game:           120.5 Hz
 *     the browser's rate with the game idle:  120.0 Hz
 *     the engine's per-frame cost, in a map:   13-16 ms
 *     the GPU's backlog (gl.finish):           0.00 ms
 *
 * So on that machine the engine cannot finish a frame inside a 120 Hz
 * frame period (8.33 ms), and the game is delivered at 60 fps. That
 * is the case the readout has to describe HONESTLY: the display is
 * fine, the engine is the limit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEBXASH = join(ROOT, 'webxash');
const PERF_CHECK_TS = join(WEBXASH, 'src', 'services', 'perf-check.ts');

if (!existsSync(WEBXASH)) {
  throw new Error(
    'the webxash submodule is not checked out — run ' +
      '`git submodule update --init --recursive`. This test reads the ' +
      'frontend source, so it cannot pass without it.'
  );
}

const perf = await import(PERF_CHECK_TS);
const {
  buildPerfReport,
  detectBrowser,
  isSoftwareRenderer,
  refreshRateLooksThrottled,
  frameBudgetMs,
} = perf;

/** A healthy client: a real GPU, a fast display, a comfortable engine. */
function healthy(over = {}) {
  return {
    renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
    displayHz: 120,
    panelHz: 120,
    engineWorkMs: 4,
    sustainableFps: 212,
    capFps: 0,
    everyNth: 1,
    lateTicks: 0,
    measuredTicks: 240,
    dpr: 2,
    backingWidth: 3456,
    backingHeight: 2234,
    ...over,
  };
}

test('the browser family is detected from the user agent', () => {
  assert.equal(
    detectBrowser(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36'
    ),
    'chromium'
  );
  assert.equal(
    detectBrowser(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0'
    ),
    'firefox'
  );
  assert.equal(
    detectBrowser(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'
    ),
    'safari'
  );
  // Every Chromium browser carries "Safari" in its user agent, so the
  // Chromium test has to win over the Safari one.
  assert.equal(
    detectBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0'
    ),
    'chromium'
  );
  assert.equal(detectBrowser('something else entirely'), 'unknown');
});

test('a software rasteriser is recognised, and a real GPU is not', () => {
  // The string measured on the test box when it had no usable GPU —
  // the one the project's own perf README warns about.
  assert.equal(
    isSoftwareRenderer(
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'
    ),
    true
  );
  assert.equal(isSoftwareRenderer('ANGLE (Mesa, llvmpipe (LLVM 15.0.7), OpenGL 4.5)'), true);
  assert.equal(isSoftwareRenderer('Microsoft Basic Render Driver'), true);
  assert.equal(isSoftwareRenderer(''), false);

  // The strings measured on real hardware.
  assert.equal(
    isSoftwareRenderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)'),
    false
  );
  assert.equal(
    isSoftwareRenderer(
      'ANGLE (AMD, Vulkan 1.4.305 (AMD Radeon Graphics (RADV RENOIR)), radv)'
    ),
    false
  );
});

test('the frame budget is the display frame period', () => {
  assert.equal(frameBudgetMs(60), 1000 / 60);
  assert.equal(frameBudgetMs(120), 1000 / 120);
  assert.equal(frameBudgetMs(0), 0);
});

test('a throttled browser is only suspected when the engine could do more', () => {
  // Chrome's Energy Saver halves the refresh rate: the browser offers
  // 30 Hz while the engine could sustain 113.
  assert.equal(
    refreshRateLooksThrottled(healthy({ panelHz: 30, displayHz: 30, sustainableFps: 113 })),
    true
  );
  // The MacBook's real case: the browser offers 120 and the engine
  // can only do 54. That is the engine being slow, NOT the browser
  // throttling, and saying otherwise would send the player to the
  // wrong settings.
  assert.equal(
    refreshRateLooksThrottled(
      healthy({ panelHz: 120, displayHz: 60, sustainableFps: 54, engineWorkMs: 13.3 })
    ),
    false
  );
  // 60 Hz is a REAL display rate. A player on a 60 Hz monitor must
  // not be told their browser is broken.
  assert.equal(
    refreshRateLooksThrottled(healthy({ panelHz: 60, displayHz: 60, sustainableFps: 212 })),
    false
  );
  // A FAST engine on a fast panel is not throttling either — the
  // engine simply being able to outrun the display is not a fault.
  // (This is the case the first version of the rule got wrong.)
  assert.equal(
    refreshRateLooksThrottled(healthy({ panelHz: 120, displayHz: 120, sustainableFps: 212 })),
    false
  );
  // Nothing measured: nothing to say.
  assert.equal(refreshRateLooksThrottled(healthy({ panelHz: 0, displayHz: 0 })), false);
});

test('a healthy client is told there is nothing to do', () => {
  const report = buildPerfReport(healthy());
  const ids = report.findings.map((f) => f.id);
  assert.ok(ids.includes('renderer-ok'));
  assert.ok(ids.includes('refresh-ok'));
  assert.ok(ids.includes('budget-ok'));
  assert.equal(report.findings.some((f) => f.severity === 'bad' || f.severity === 'warn'), false);
  assert.match(report.summary, /set up properly/);
  // Nothing is wrong, so the checklist is empty. A readout that lists
  // settings to change when nothing needs changing teaches the player
  // to ignore it.
  assert.equal(report.checklist.length, 0);
});

test('a software rasteriser is the worst thing that can be reported', () => {
  const report = buildPerfReport(
    healthy({
      renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
    })
  );
  const first = report.findings[0];
  assert.equal(first.id, 'software-renderer');
  assert.equal(first.severity, 'bad');
  assert.match(report.summary, /not set up/);
  // And the checklist must say how to fix it.
  assert.ok(report.checklist.some((i) => i.id === 'chrome-accel'));
  assert.ok(report.checklist.some((i) => i.id === 'chrome-gpu'));
});

test('a throttled browser produces the browser-specific fix', () => {
  // Chrome: Energy Saver.
  const chrome = buildPerfReport(
    healthy({ panelHz: 30, displayHz: 30, sustainableFps: 113 })
  );
  assert.ok(chrome.findings.some((f) => f.id === 'refresh-throttled' && f.severity === 'warn'));
  assert.ok(chrome.checklist.some((i) => i.id === 'chrome-energy-saver'));

  // Firefox: the refresh-rate preference, which is the one that
  // actually exists there.
  const firefox = buildPerfReport(
    healthy({
      panelHz: 30,
      displayHz: 30,
      sustainableFps: 113,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
    })
  );
  assert.ok(firefox.checklist.some((i) => i.id === 'firefox-frame-rate'));
  assert.ok(!firefox.checklist.some((i) => i.id === 'chrome-energy-saver'));

  // Safari: Low Power Mode.
  const safari = buildPerfReport(
    healthy({
      panelHz: 30,
      displayHz: 30,
      sustainableFps: 113,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
    })
  );
  assert.ok(safari.checklist.some((i) => i.id === 'safari-low-power'));
});

test('the engine being the limit is described honestly', () => {
  // The MacBook's measured case: the browser delivers 120 Hz, the
  // engine needs 13.3 ms and a 120 Hz frame period is 8.33 ms. The
  // readout must NOT blame the browser for this.
  const report = buildPerfReport(
    healthy({
      panelHz: 120,
      displayHz: 60,
      engineWorkMs: 13.3,
      sustainableFps: 63,
      capFps: 60,
      everyNth: 2,
    })
  );
  const ids = report.findings.map((f) => f.id);
  assert.ok(!ids.includes('refresh-throttled'), 'the browser is not the problem here');
  assert.ok(ids.includes('budget-tight'));
  assert.ok(ids.includes('delivering'));
  assert.ok(ids.includes('capped'));

  const budget = report.findings.find((f) => f.id === 'budget-tight');
  assert.equal(budget.severity, 'info', 'a cap already in force is not a warning');
  assert.match(budget.detail, /60 fps/);

  // And the numbers carry both rates, because they mean different things.
  assert.equal(report.numbers.panelHz, 120);
  assert.equal(report.numbers.displayHz, 60);
});

test('the report refuses to guess at numbers it has not measured', () => {
  const report = buildPerfReport(
    healthy({ panelHz: 0, displayHz: 0, engineWorkMs: 0, sustainableFps: 0, measuredTicks: 0 })
  );
  const ids = report.findings.map((f) => f.id);
  assert.ok(ids.includes('refresh-unknown'));
  assert.ok(!ids.includes('budget-ok'), 'no engine cost means no budget claim');
  assert.ok(!ids.includes('refresh-ok'), 'no rate means no rate claim');
});

test('the report is a pure function of the facts', () => {
  const facts = healthy();
  const a = buildPerfReport(facts);
  const b = buildPerfReport(facts);
  assert.deepEqual(a, b);
  // And it does not mutate what it was given.
  assert.equal(facts.panelHz, 120);
});
