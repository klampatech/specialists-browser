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
    // THE GAME'S RATE, measured from the engine's own frames.
    displayHz: 120,
    engineFps: 120,
    // THE BROWSER'S TICK RATE.
    browserHz: 120,
    // THE DISPLAY'S RATE.
    panelHz: 120,
    engineWorkMs: 4,
    sustainableFps: 212,
    capFps: 0,
    everyNth: 1,
    lateFrames: 0,
    measuredFrames: 240,
    dpr: 2,
    backingWidth: 3456,
    backingHeight: 2234,
    // WHEN the cost was measured, and whether that reading was past
    // the engine's warm-up. The game started 32 seconds before the
    // measurement closed.
    costMeasuredAt: 1760000032000,
    costSettled: true,
    gameStartAt: 1760000000000,
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
    engineFps: 60,
    browserHz: 120,
    panelHz: 120,
    engineWorkMs: 13.3,
    sustainableFps: 63,
    capFps: 60,
    everyNth: 2,
    lateFrames: 40,
    measuredFrames: 240,
    backingWidth: 3456,
    backingHeight: 2234,
    renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)',
    measuredAt: 1760000000000,
    // The game started two minutes before it ended, and the cost was
    // measured 32 seconds into it.
    gameStartAt: 1759999880000,
    costMeasuredAt: 1759999912000,
    costSettled: true,
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
    engineFps: 0,
    browserHz: 120,
    panelHz: 120,
    engineWorkMs: 0,
    sustainableFps: 0,
    capFps: 0,
    everyNth: 1,
    lateFrames: 0,
    measuredFrames: 0,
    backingWidth: 300,
    backingHeight: 150,
    costMeasuredAt: 0,
    costSettled: false,
    gameStartAt: 0,
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
  //
  // `engineFps` is the game's own frame rate, counted from the
  // engine's frames — so it is 60 here, the same as `displayHz`. The
  // two fields describe the same thing (the game's rate), and the
  // facts have to agree with themselves.
  const report = buildPerfReport(
    healthy({
      panelHz: 120,
      displayHz: 60,
      engineFps: 60,
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
    healthy({ panelHz: 0, displayHz: 0, engineWorkMs: 0, sustainableFps: 0, measuredFrames: 0 })
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
  // AND THEN: the readout became its own PAGE, because a long readout
  // in the same panel pushed the Quit button — the one control a
  // player reaches for when they want to LEAVE a match — down the
  // scroll. The invariant is now stronger than "the Quit button comes
  // first in the source": the Quit button is in the SIDEBAR, outside
  // every page, so NO page can push it down at all.
  const overlay = readFileSync(
    join(WEBXASH, 'src', 'components', 'XashOptionsOverlay.vue'),
    'utf8'
  );
  assert.match(overlay, /<TSPerformance[\s\S]*?context="game"/, 'the overlay carries the panel');
  assert.match(overlay, /import TSPerformance from/, 'and imports it');

  // And the panel drops its own heading in the game, because the
  // overlay's page title carries the name.
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

  // THE SIDEBAR: three pages, and they are the ones Kyle asked for —
  // Player, Game and Performance.
  assert.match(overlay, /<nav class="opts__side"/, 'the sidebar is a nav');
  assert.match(
    overlay,
    /v-for="p in PAGES"/,
    'the sidebar draws its pages from one list',
  );

  // And the list is the three pages Kyle asked for.
  const pages = overlay.match(/const PAGES:[\s\S]*?\n\];/);
  assert.ok(pages, 'the page list is defined');
  for (const label of ['Player', 'Game', 'Performance']) {
    assert.match(
      pages[0],
      new RegExp(`label: '${label}'`),
      `the ${label} page is in the sidebar's list`,
    );
  }
  assert.equal(
    [...pages[0].matchAll(/label: '/g)].length,
    3,
    'there are exactly three pages',
  );

  // The current page is marked for a screen reader, the way a nav is.
  assert.match(overlay, /aria-current="page"/, 'the current page says so');

  // THE QUIT BUTTON IS IN THE SIDEBAR, OUTSIDE EVERY PAGE.
  //
  // This is the invariant the redesign made structural: the Quit
  // button is PINNED to the bottom of the sidebar, so the readout —
  // or any other page — cannot push it below the fold.
  const quitAt = overlay.indexOf('opts__quit');
  assert.ok(quitAt > 0, 'the overlay has a Quit button');
  const sideAt = overlay.indexOf('opts__side');
  const firstPageAt = overlay.indexOf("v-show=\"page === 'player'\"");
  assert.ok(quitAt > sideAt, 'the Quit button is in the sidebar');
  assert.ok(
    quitAt < firstPageAt,
    'the Quit button is in the sidebar and NOT inside a page — that is ' +
      'what makes it unreachable-proof: no page can push it down',
  );

  // And the readout is in the PERFORMANCE page, and in no other.
  const perfPageAt = overlay.indexOf("v-show=\"page === 'performance'\"");
  const playerPageAt = overlay.indexOf("v-show=\"page === 'player'\"");
  const gamePageAt = overlay.indexOf("v-show=\"page === 'game'\"");
  assert.ok(playerPageAt > 0 && gamePageAt > 0 && perfPageAt > 0, 'the overlay has three pages');

  const perfPage = overlay.slice(perfPageAt, overlay.indexOf('</section>', perfPageAt));
  assert.match(
    perfPage,
    /<TSPerformance[\s\S]*?context="game"/,
    'the readout is in the Performance page'
  );

  const playerPage = overlay.slice(playerPageAt, overlay.indexOf('</section>', playerPageAt));
  assert.doesNotMatch(playerPage, /<TSPerformance/, 'and not in the Player page');

  const gamePage = overlay.slice(gamePageAt, overlay.indexOf('</section>', gamePageAt));
  assert.doesNotMatch(gamePage, /<TSPerformance/, 'and not in the Game page');

  // THE FOCUS TRAP, AND THE PAGE IT OPENS ON.
  //
  // The name field is focused when the panel opens, and `focus()` on a
  // HIDDEN input fails SILENTLY — so the panel must open on the page
  // that carries the field, and it must reset that page SYNCHRONOUSLY
  // before the focus.
  assert.match(
    overlay,
    /page\.value = 'player'/,
    'the panel opens on the page that carries the name field'
  );
  assert.match(overlay, /nameInput\.value\?\.focus\(\)/, 'and the field takes the focus');
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
  // THE ENGINE'S FRAMES, not the browser's ticks. The metric changed
  // what it counts; the numbers are the same shape.
  assert.equal(resolved.lateFrames, 40);
  assert.equal(resolved.measuredFrames, 240);

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

test('a restored report never says the game has not run', () => {
  // THE HALF-MEASURED MATCH.
  //
  // The pacer only trusts its own display figure after ten intervals,
  // so a SHORT match leaves `displayHz` at 0 while the engine's frame
  // cost is already known. That snapshot was real, and it was written
  // verbatim, so the report has to cope with it: the game DID run.
  //
  // The claim it must never make is "the game has not run yet" —
  // especially not next to "the game was drawing 7.7 megapixels" and
  // "your client was set up properly in your last game".
  const half = session({ displayHz: 0, sustainableFps: 0 });
  const resolved = resolvePerfFacts(landing(), half);
  assert.equal(resolved.fromLastSession, true);
  assert.equal(resolved.displayHz, 0);
  assert.equal(resolved.engineWorkMs, 13.3);

  const report = buildPerfReport(resolved, 1760000000000);
  assert.equal(
    report.findings.some((f) => f.id === 'refresh-unknown'),
    false,
    'a restored report must never claim the game has not run'
  );
  // And it says where the numbers came from, instead.
  assert.ok(
    report.findings.some((f) => f.id === 'last-session'),
    'and it says where they came from'
  );

  // THE LIVE CASE STILL SAYS IT, because there the game really has
  // not run. The guard is about the SOURCE, not about the number.
  const live = buildPerfReport(landing());
  assert.ok(
    live.findings.some((f) => f.id === 'refresh-unknown'),
    'a live report with no measurement still says the game has not run'
  );
});

test("the browser's own rate is not claimed as live when it came from the session", () => {
  // THE FIRST RENDER OF THE LANDING READOUT.
  //
  // The report is built before the idle measurement resolves, so the
  // browser's rate can be the session's — and then a present-tense
  // title asserts a live reading that is really the last match's.
  const resolved = resolvePerfFacts(landing({ panelHz: 0 }), session());
  assert.equal(resolved.panelHzFromSession, true);
  const report = buildPerfReport(resolved, 1760000000000);

  const refresh = report.findings.find((f) => f.id === 'refresh-ok');
  assert.ok(refresh, 'the browser rate is still reported');
  assert.match(refresh.title, /was delivering 120 refreshes a second/);
  assert.doesNotMatch(refresh.title, /is delivering/);

  // And the same for the throttled case: the browser was offering
  // them, it is not offering them now.
  const throttled = buildPerfReport(
    resolvePerfFacts(landing({ panelHz: 0 }), session({ panelHz: 30 })),
    1760000000000
  );
  const offer = throttled.findings.find((f) => f.id === 'refresh-throttled');
  assert.ok(offer, 'the throttled browser is still reported');
  assert.match(offer.title, /was only offering 30 refreshes a second/);
  assert.doesNotMatch(offer.title, /is only offering/);
});

test('a live report is still in the present tense', () => {
  const report = buildPerfReport(healthy({ panelHz: 120, displayHz: 60, engineWorkMs: 13.3, capFps: 60, everyNth: 2 }));
  assert.equal(report.source, 'live');
  assert.equal(report.measuredAt, 0);
  // THE SUMMARY NAMES THE BOTTLENECK NOW. These facts are
  // engine-bound (13.3 ms against an 8.33 ms budget), so the summary
  // says the game could not keep up — in the present tense, because
  // the game is running.
  assert.match(report.summary, /could not keep up with your 120 Hz display/);
  assert.doesNotMatch(report.summary, /last game/);
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

test('a measurement with no timestamp has no age', () => {
  // "moments ago" is a recency claim, and a number whose age is
  // unknown cannot carry one.
  const now = 1760000000000;
  assert.equal(describeSessionAge(0, now), 'at an unknown time');
  assert.equal(describeSessionAge(-1, now), 'at an unknown time');
  assert.equal(describeSessionAge(NaN, now), 'at an unknown time');
});

// ═══════════════════════════════════════════════════════════════════════
// THE ATTRIBUTION — who is actually holding the game back.
//
// WHY THIS EXISTS
// ---------------
// Kyle's screenshot said: "Your browser was holding the game back in
// your last game." The browser was delivering 120 of 120 Hz. The GPU
// was hardware-accelerated. The engine used 191% of the frame budget.
// The browser held nothing back; the engine could not keep up.
//
// The summary was hardcoded to blame the browser whenever ANY finding
// was a warning, and the only warning in that report was a late-frame
// count that was itself measuring the wrong thing.
//
// So the attribution is now decided from the facts:
//
//   BROWSER-BOUND  the browser is offering materially less than the
//                  display's rate, and the engine's cost fits the
//                  budget -> the browser is the thing to fix;
//   ENGINE-BOUND   the browser is keeping up, and the engine's cost
//                  exceeds the budget -> the game could not keep up
//                  with the display;
//   NEITHER        nothing to fix.

test('the summary blames the ENGINE when the engine is over the budget', () => {
  // The MacBook's real case: the browser delivers 120 Hz, the engine
  // needs 13.3 ms and a 120 Hz frame period is 8.33 ms.
  const report = buildPerfReport(
    healthy({
      panelHz: 120,
      browserHz: 120,
      displayHz: 60,
      engineFps: 60,
      engineWorkMs: 13.3,
      sustainableFps: 63,
      capFps: 60,
      everyNth: 2,
    })
  );
  assert.doesNotMatch(
    report.summary,
    /holding the game back/,
    'the browser was keeping up; it must not be blamed'
  );
  assert.match(report.summary, /could not keep up with your 120 Hz display/);
});

test('the summary blames the BROWSER when the browser is offering less than the display', () => {
  // The browser is handing the game 30 refreshes a second on a 120 Hz
  // panel, and the engine could do 212 fps — so the browser is the
  // thing to fix, and the readout has to name it.
  const report = buildPerfReport(
    healthy({
      panelHz: 120,
      browserHz: 30,
      displayHz: 30,
      engineFps: 30,
      engineWorkMs: 4,
      sustainableFps: 212,
    })
  );
  assert.match(report.summary, /only offering 30 refreshes a second/);
});

test('the summary says there is nothing to do when nothing is wrong', () => {
  const report = buildPerfReport(healthy());
  assert.match(report.summary, /set up properly/);
  assert.doesNotMatch(report.summary, /holding the game back/);
  assert.doesNotMatch(report.summary, /could not keep up/);
});

test('the capped finding names the PANEL rate, never the game\'s rate', () => {
  // THE SENTENCE THAT WAS WRONG IN THE SCREENSHOT.
  //
  // The game was drawing 60 fps on a 120 Hz panel, and the finding
  // said "Your display ran at 60 Hz" — because it printed the game's
  // rate in a sentence that called it the display's.
  const restored = buildPerfReport(resolvePerfFacts(landing(), session()), 1760000000000);
  const capped = restored.findings.find((f) => f.id === 'capped');
  assert.ok(capped, 'the cap is reported');
  assert.match(capped.detail, /Your display ran at 120 Hz/);
  assert.doesNotMatch(capped.detail, /ran at 60 Hz/);

  // And the live one, in the present tense.
  const live = buildPerfReport(
    healthy({
      panelHz: 120,
      browserHz: 120,
      displayHz: 60,
      engineFps: 60,
      engineWorkMs: 13.3,
      sustainableFps: 63,
      capFps: 60,
      everyNth: 2,
    })
  );
  const liveCapped = live.findings.find((f) => f.id === 'capped');
  assert.match(liveCapped.detail, /Your display runs at 120 Hz/);
  assert.doesNotMatch(liveCapped.detail, /runs at 60 Hz/);
});

test('the refresh finding only claims headroom when the engine really has it', () => {
  // THE OTHER SENTENCE THAT WAS WRONG IN THE SCREENSHOT.
  //
  // "The game could sustain 53 fps, so it had room to spare" — against
  // a 120 Hz panel with an 8.33 ms budget, 53 fps is the opposite of
  // headroom. The sentence borrowed the browser's green tick to
  // attach an engine claim that was untrue.
  const over = buildPerfReport(
    healthy({
      panelHz: 120,
      browserHz: 120,
      displayHz: 60,
      engineFps: 60,
      engineWorkMs: 15.94,
      sustainableFps: 53,
    })
  );
  const ok = over.findings.find((f) => f.id === 'refresh-ok');
  assert.ok(ok, 'the browser keeping up is still reported');
  assert.doesNotMatch(ok.detail, /room to spare/);
  assert.match(ok.detail, /keeping up/i);

  // With real headroom, it says so.
  const roomy = buildPerfReport(healthy());
  assert.match(roomy.findings.find((f) => f.id === 'refresh-ok').detail, /room to spare/);
});

test('the delivering finding blames the CAP when the cap is in force', () => {
  // With the cap on, the low frame rate is the CAP'S DOING: the game
  // was paced to land evenly on the display. Calling it "the engine's
  // own limit" is the opposite of the truth.
  const capped = buildPerfReport(
    healthy({
      panelHz: 120,
      browserHz: 120,
      displayHz: 30,
      engineFps: 30,
      engineWorkMs: 15.94,
      sustainableFps: 53,
      capFps: 30,
      everyNth: 4,
    })
  );
  const d = capped.findings.find((f) => f.id === 'delivering');
  assert.ok(d, 'the frame rate is reported');
  assert.match(d.title, /drawing 30 fps on a 120 Hz display/);
  assert.match(d.detail, /paced to land evenly/i);
  assert.doesNotMatch(d.detail, /engine's own limit/);

  // With NO cap in force, the engine IS the limit.
  const uncapped = buildPerfReport(
    healthy({
      panelHz: 120,
      browserHz: 120,
      displayHz: 30,
      engineFps: 30,
      engineWorkMs: 15.94,
      sustainableFps: 53,
      capFps: 0,
      everyNth: 1,
    })
  );
  const u = uncapped.findings.find((f) => f.id === 'delivering');
  assert.match(u.detail, /engine's own limit/);
});

test('the render-size finding does not advise lowering the resolution on a GPU client', () => {
  // THE RESEARCH MEASURED THE ENGINE'S COST FLAT ACROSS AN 8.4x
  // RESOLUTION SWEEP. It is CPU-bound, not fill-bound, and 640x360
  // changed nothing on a machine with a GPU. The advice used to buy
  // blur, not frames.
  const report = buildPerfReport(healthy());
  const size = report.findings.find((f) => f.id === 'render-size');
  assert.ok(size, 'the render size is still reported — it is a real fact');
  assert.match(size.detail, /3456×2234 device pixels/);
  assert.doesNotMatch(size.detail, /makes the game lighter on the GPU/);
  assert.match(size.detail, /per-frame cost|pixel count/i);
});

test('the report says WHEN the numbers were measured', () => {
  // A settled reading, 32 seconds into the game.
  const settled = buildPerfReport(healthy());
  const age = settled.findings.find((f) => f.id === 'cost-age');
  assert.ok(age, 'the measurement carries its age');
  assert.match(age.title, /32 seconds into your game/);

  // A provisional reading — taken before the engine had warmed up.
  const provisional = buildPerfReport(healthy({ costSettled: false }));
  const p = provisional.findings.find((f) => f.id === 'cost-age');
  assert.match(p.title, /before the engine had warmed up/);

  // And the restored report says it about the LAST game.
  const restored = buildPerfReport(resolvePerfFacts(landing(), session()), 1760000000000);
  const r = restored.findings.find((f) => f.id === 'cost-age');
  assert.match(r.title, /32 seconds into your last game/);
});
