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
import { existsSync, readFileSync } from 'node:fs';
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
  formatMegapixels,
  resolvePerfFacts,
  describeSessionAge,
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

/**
 * THE LAST MATCH, AS A SESSION SNAPSHOT.
 *
 * The numbers are the MacBook's measured case: a 120 Hz panel, an
 * engine that needs 13.3 ms (so it cannot finish inside a 120 Hz frame
 * period), the game capped to 60 fps, and a 3456×2234 render target.
 */
function session(over = {}) {
  return {
    displayHz: 60,
    panelHz: 120,
    engineWorkMs: 13.3,
    sustainableFps: 63,
    capFps: 60,
    everyNth: 2,
    lateTicks: 40,
    measuredTicks: 240,
    backingWidth: 3456,
    backingHeight: 2234,
    renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)',
    measuredAt: 1760000000000,
    ...over,
  };
}

/**
 * THE LANDING PAGE'S FACTS.
 *
 * The canvas is a 300×150 placeholder there, and no engine has run,
 * so the game has measured nothing.
 */
function landing(over = {}) {
  return healthy({
    displayHz: 0,
    panelHz: 120,
    engineWorkMs: 0,
    sustainableFps: 0,
    capFps: 0,
    everyNth: 1,
    lateTicks: 0,
    measuredTicks: 0,
    backingWidth: 300,
    backingHeight: 150,
    ...over,
  });
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

test('the render size is only reported when the game is running', () => {
  // THE LANDING PAGE'S 300×150 PLACEHOLDER.
  //
  // Before the engine boots the canvas is a placeholder, and there is
  // no game and no render size. Reporting it as "the game is drawing
  // 0.0 megapixels" is wrong, and it reads like something is broken.
  const notRunning = buildPerfReport(
    healthy({ engineWorkMs: 0, backingWidth: 300, backingHeight: 150 })
  );
  assert.ok(
    !notRunning.findings.some((f) => f.id === 'render-size'),
    'no render size before the game is running'
  );

  // In a map, it is the game's render size, and it says so.
  const running = buildPerfReport(healthy());
  const size = running.findings.find((f) => f.id === 'render-size');
  assert.ok(size, 'the render size is reported once the game is running');
  assert.match(size.title, /megapixels/);
  assert.match(size.detail, /3456×2234 device pixels/);
});

test('a small render size is not rounded to nothing', () => {
  // 300×150 is 0.045 megapixels. One decimal place calls that "0.0",
  // which reads like nothing is being drawn.
  assert.equal(formatMegapixels(300 * 150), '0.045 megapixels');
  assert.equal(formatMegapixels(3456 * 2234), '7.7 megapixels');
  assert.equal(formatMegapixels(1920 * 1080), '2.1 megapixels');
  assert.equal(formatMegapixels(640 * 480), '0.31 megapixels');
  assert.equal(formatMegapixels(0), '0 pixels');
  assert.equal(formatMegapixels(-1), '0 pixels');
});

test('the readout does not claim a refresh rate it has not measured', () => {
  // The tile says "59 Hz" — the DISPLAY's rate, measured while the page
  // was idle. The finding used to say "your refresh rate has not been
  // measured yet" right underneath it, which reads like a
  // contradiction of the tile it sits under.
  const report = buildPerfReport(healthy({ displayHz: 0, engineWorkMs: 0 }));
  const finding = report.findings.find((f) => f.id === 'refresh-unknown');
  assert.ok(finding, 'the unmeasured game rate is still reported');
  assert.doesNotMatch(finding.title, /your refresh rate has not been measured/i);
  assert.match(finding.title, /game has not run yet/i);
  assert.match(finding.detail, /display's rate is measured/i);
});

test('the readout is reachable while the game is running', () => {
  // THE GAP THIS CLOSED, AND THE ONE THAT CAME AFTER IT.
  //
  // The panel lived on the landing page, and the landing page is
  // DESTROYED when the engine boots — so the frame cost, the budget
  // and the delivered frame rate were only ever measurable and never
  // visible. The in-game options overlay is the one place a player can
  // reach while the game is running.
  //
  // AND THEN: the readout became its own TAB, because a long readout
  // in the same panel pushed the Quit button — the one control a
  // player reaches for when they want to LEAVE a match — down the
  // scroll. The invariant is now stronger than "the Quit button comes
  // first in the source": the two are in DIFFERENT PANELS, so the
  // readout cannot push the Quit button down at all.
  const overlay = readFileSync(
    join(WEBXASH, 'src', 'components', 'XashOptionsOverlay.vue'),
    'utf8'
  );
  assert.match(overlay, /<TSPerformance\s+context="game"\s*\/>/, 'the overlay carries the panel');
  assert.match(overlay, /import TSPerformance from/, 'and imports it');

  // And the panel drops its own heading in the game, because the
  // overlay's tab strip carries the name.
  const panel = readFileSync(
    join(WEBXASH, 'src', 'components', 'TSPerformance.vue'),
    'utf8'
  );
  assert.match(panel, /v-if="context !== 'game'"/, 'the heading is dropped in the game');
  assert.match(
    panel,
    /context\?:\s*'landing'\s*\|\s*'game'/,
    'the panel takes a context, not a presentation flag'
  );

  // THE TABLIST: exactly two tabs, and they are the ones Kyle asked
  // for — "Settings" and "Your Client".
  assert.match(overlay, /role="tablist"/, 'the strip is a real tablist');
  const tabButtons = [...overlay.matchAll(/<button[^>]*\bid="opts-tab-[a-z]+"/g)];
  assert.equal(tabButtons.length, 2, 'there are exactly two tabs');

  const tabBlock = (id) => {
    const at = overlay.indexOf(`id="${id}"`);
    assert.ok(at > 0, `the overlay has the ${id} tab`);
    return overlay.slice(at, overlay.indexOf('</button>', at));
  };

  const settingsTab = tabBlock('opts-tab-settings');
  assert.match(settingsTab, /role="tab"/, 'a tab is a tab');
  assert.match(settingsTab, /aria-selected/, 'a tab says whether it is selected');
  assert.match(settingsTab, /aria-controls="opts-panel-settings"/, 'a tab names its panel');
  assert.match(settingsTab, /tabindex/, 'the tabs carry a roving tabindex');
  assert.match(settingsTab, /\bSettings\s*$/, 'the first tab is Settings');

  const clientTab = tabBlock('opts-tab-client');
  assert.match(clientTab, /role="tab"/, 'a tab is a tab');
  assert.match(clientTab, /aria-selected/, 'a tab says whether it is selected');
  assert.match(clientTab, /aria-controls="opts-panel-client"/, 'a tab names its panel');
  assert.match(clientTab, /tabindex/, 'the tabs carry a roving tabindex');
  assert.match(clientTab, /\bYour Client\s*$/, 'the second tab is Your Client');

  // THE TWO PANELS.
  const settingsAt = overlay.indexOf('id="opts-panel-settings"');
  const clientAt = overlay.indexOf('id="opts-panel-client"');
  assert.ok(settingsAt > 0 && clientAt > settingsAt, 'the overlay has both panels');
  assert.match(overlay, /role="tabpanel"/, 'the panels are real tab panels');
  assert.match(overlay, /aria-labelledby="opts-tab-settings"/, 'the Settings panel names its tab');
  assert.match(overlay, /aria-labelledby="opts-tab-client"/, 'the Your Client panel names its tab');

  const settingsPanel = overlay.slice(settingsAt, clientAt);
  const clientPanel = overlay.slice(clientAt, overlay.indexOf('</template>'));

  // (b) The Quit button is in the Settings panel.
  assert.match(settingsPanel, /opts__btn--danger/, 'the Quit button is in the Settings panel');
  assert.doesNotMatch(clientPanel, /opts__btn--danger/, 'and not in the readout panel');

  // (c) The readout is in the Your Client panel.
  assert.match(
    clientPanel,
    /<TSPerformance\s+context="game"\s*\/>/,
    'the readout is in the Your Client panel'
  );

  // (d) And the readout is NOT in the Settings panel. THIS is the
  // invariant: it cannot push the Quit button down, because it is not
  // in the same panel at all.
  assert.doesNotMatch(
    settingsPanel,
    /<TSPerformance/,
    'the readout must not be in the Settings panel'
  );
});

test('the live facts win while the game is running', () => {
  // The in-game readout reads the LIVE game. A restored number must
  // never appear in front of a player who is looking at the game right
  // now — that would be a lie told at the exact moment it matters.
  const live = healthy({ engineWorkMs: 13.3, displayHz: 60 });
  const resolved = resolvePerfFacts(live, session());
  assert.equal(resolved, live, 'the live facts are returned unchanged');
  assert.equal(resolved.fromLastSession, undefined);
  assert.equal(resolved.displayHz, 60);
});

test('without a session the live facts are unchanged', () => {
  const live = landing();
  assert.equal(resolvePerfFacts(live, null), live);
  assert.equal(resolvePerfFacts(live, undefined), live);
  // And a session that never measured a frame is worthless: restoring
  // it would restore zeroes.
  assert.equal(resolvePerfFacts(live, session({ engineWorkMs: 0 })), live);
});

test('the session fills the gaps the landing page cannot measure', () => {
  const resolved = resolvePerfFacts(landing(), session());

  // THE GAME'S NUMBERS: the session's.
  assert.equal(resolved.displayHz, 60);
  assert.equal(resolved.engineWorkMs, 13.3);
  assert.equal(resolved.sustainableFps, 63);
  assert.equal(resolved.capFps, 60);
  assert.equal(resolved.everyNth, 2);
  assert.equal(resolved.lateTicks, 40);
  assert.equal(resolved.measuredTicks, 240);

  // THE DISPLAY'S RATE: the live one. The budget question is "can this
  // machine hit the display's budget", and the engine's frame cost
  // does not change with the display rate.
  assert.equal(resolved.panelHz, 120);

  // THE BROWSER: the live ones.
  assert.equal(resolved.dpr, 2);
  assert.match(resolved.userAgent, /Chrome/);

  // AND THE PROVENANCE.
  assert.equal(resolved.fromLastSession, true);
  assert.equal(resolved.measuredAt, 1760000000000);
});

test("the landing canvas's 300x150 placeholder does not win", () => {
  // THE TRAP. On the landing page the canvas is a 300×150 placeholder,
  // and the live facts carry that size. Reporting it as the game's
  // render size would say the game draws 0.045 megapixels — which is
  // both wrong and alarming.
  const resolved = resolvePerfFacts(landing(), session());
  assert.equal(resolved.backingWidth, 3456);
  assert.equal(resolved.backingHeight, 2234);

  // And the report shows the game's real render size.
  const report = buildPerfReport(resolved, 1760000000000);
  const size = report.findings.find((f) => f.id === 'render-size');
  assert.ok(size, 'the render size is reported');
  assert.match(size.detail, /3456×2234 device pixels/);
});

test('a restored report says where it came from, and says it in the past tense', () => {
  const resolved = resolvePerfFacts(landing(), session());
  const measuredAt = 1760000000000;
  const report = buildPerfReport(resolved, measuredAt + 12 * 60 * 1000);

  // THE PROVENANCE.
  assert.equal(report.source, 'last-session');
  assert.equal(report.measuredAt, measuredAt);
  const provenance = report.findings.find((f) => f.id === 'last-session');
  assert.ok(provenance, 'the report says the numbers are from the last game');
  assert.equal(provenance.severity, 'info');
  assert.match(provenance.title, /from your last game, 12 minutes ago/);
  assert.match(provenance.detail, /not running now/);

  // AND NOT THE "THE GAME HAS NOT RUN YET" FINDING: the game DID run.
  assert.ok(
    !report.findings.some((f) => f.id === 'refresh-unknown'),
    'a restored session must not claim the game has not run'
  );

  // THE PAST TENSE. The game is not running, so every claim about it
  // is about what it did.
  assert.match(report.summary, /last game/);
  const capped = report.findings.find((f) => f.id === 'capped');
  assert.match(capped.title, /was capped to 60 fps/);
  assert.doesNotMatch(capped.title, /is capped/);
  const delivering = report.findings.find((f) => f.id === 'delivering');
  assert.match(delivering.title, /was drawing 60 fps/);
  const budget = report.findings.find((f) => f.id === 'budget-tight');
  assert.match(budget.detail, /A frame took 13\.30 ms/);
});

test('a live report is still in the present tense', () => {
  const report = buildPerfReport(healthy({ panelHz: 120, displayHz: 60, engineWorkMs: 13.3, capFps: 60, everyNth: 2 }));
  assert.equal(report.source, 'live');
  assert.equal(report.measuredAt, 0);
  assert.match(report.summary, /set up properly/);
  const capped = report.findings.find((f) => f.id === 'capped');
  assert.match(capped.title, /is capped to 60 fps/);
  assert.ok(
    !report.findings.some((f) => f.id === 'last-session'),
    'a live report has no provenance finding'
  );
});

test('the age of a measurement is said in words', () => {
  const now = 1760000000000;
  assert.equal(describeSessionAge(now - 5 * 1000, now), 'moments ago');
  assert.equal(describeSessionAge(now - 60 * 1000, now), '1 minute ago');
  assert.equal(describeSessionAge(now - 12 * 60 * 1000, now), '12 minutes ago');
  assert.equal(describeSessionAge(now - 3 * 3600 * 1000, now), '3 hours ago');
  assert.equal(describeSessionAge(now - 2 * 86400 * 1000, now), '2 days ago');
});
