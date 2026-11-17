/**
 * THE READOUT TRUTH GATE — the pure half, tested.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * The gate is the thing that decides whether the "Your Client" panel is
 * telling the player the truth. A gate that can only be run with a
 * browser, a game server and a rig is a gate that runs twice a year, so
 * the COMPARISON lives in a pure module (`tools/perf/lib/readout-truth.cjs`)
 * and this suite exercises it with no rig at all.
 *
 * The fixtures below are the failure modes this project has actually
 * had:
 *
 *   - the frame cost from the boot window, quoted forever (Kyle's
 *     screenshot: 15.94 ms, measured three seconds after the engine
 *     booted, presented as a property of the machine);
 *   - the panel claiming 120 fps for a game drawing 30;
 *   - the summary blaming the browser while the browser was delivering
 *     120 of 120 Hz;
 *   - the placeholder canvas reported as the game's render size;
 *   - "Hardware accelerated" on a software rasteriser.
 *
 * Each one has to FAIL. A gate that only proves the healthy case is a
 * gate of unknown value.
 *
 * AND THE SOFTWARE RENDERER LIST IS PINNED AGAINST THE POLICY
 * -------------------------------------------------------------
 * The gate has its own copy of the list, because it has to be usable
 * without loading a TypeScript module. A copy that drifts is worse than
 * no copy, so this suite asserts that the two agree on every renderer
 * string it knows about — the policy's `isSoftwareRenderer` and the
 * gate's. If the policy changes its list, THIS TEST FAILS.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

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

const require = createRequire(import.meta.url);
const truth = require(join(ROOT, 'tools', 'perf', 'lib', 'readout-truth.cjs'));
const perf = await import(PERF_CHECK_TS);

const {
  isSoftwareRenderer,
  parsePanel,
  printedRange,
  compare,
  compareProvenance,
  summarise,
  SOFTWARE_RENDERER_MARKERS,
} = truth;

/**
 * A panel, as the DOM reports it.
 *
 * The strings are the panel's OWN formats, copied from
 * `webxash/src/components/TSPerformance.vue`:
 *
 *   Display      `${panelHz} Hz — the game is drawing ${gameFps} fps`
 *   Frame cost   `${engineWorkMs} ms vs ${budgetMs} ms budget`
 *   Frame spacing`${p50} ms apart · worst ${max} ms`
 *   Render size  `${formatMegapixels(backingPixels)}`
 *   Graphics     `Hardware accelerated`
 */
function panel(overrides = {}) {
  const base = {
    present: true,
    summary: 'Your client was set up properly. Nothing to do.',
    source: '',
    note: 'The numbers above are measured on this machine, in this browser.',
    rows: [
      { label: 'Display', value: '60 Hz' },
      { label: 'Frame cost', value: '4.20 ms vs 16.67 ms budget' },
      { label: 'Frame spacing', value: '16.7 ms apart · worst 18.4 ms' },
      { label: 'Render size', value: '2.1 megapixels' },
      { label: 'Graphics', value: 'Hardware accelerated' },
    ],
    findings: [
      {
        title: 'Graphics acceleration is on',
        severity: 'ok',
        detail: 'Renderer: ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)',
      },
      { title: 'The game is drawing 58 fps on a 60 Hz display', severity: 'info', detail: '…' },
    ],
    checklist: [],
  };
  return { ...base, ...overrides };
}

/** A healthy client, measured independently. */
function healthyTruth(overrides = {}) {
  return {
    panelHz: 60,
    browserHz: 60,
    engineFps: 58,
    engineMs: 4.2,
    spacingP50: 16.7,
    spacingMax: 18.4,
    latePct: 0,
    backingW: 1920,
    backingH: 1080,
    renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)',
    ...overrides,
  };
}

/** The verdict for one check. */
const v = (verdicts, id) => verdicts.find((x) => x.id === id);

// ── the software renderer list is pinned against the policy ──────────
test('the gate and the policy agree about what a software renderer is', () => {
  const strings = [
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
    'Mesa/X.org, llvmpipe (LLVM 15.0.7, 256 bits)',
    'ANGLE (Microsoft, D3D11 WARP (Microsoft Basic Render Driver), D3D11)',
    'softpipe',
    'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)',
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    '',
  ];
  for (const s of strings) {
    assert.equal(
      isSoftwareRenderer(s),
      perf.isSoftwareRenderer(s),
      `the two disagree about "${s}"`
    );
  }
});

test('the list is not empty and the software markers are the documented ones', () => {
  assert.ok(SOFTWARE_RENDERER_MARKERS.length >= 5);
  for (const marker of ['swiftshader', 'llvmpipe', 'basic render']) {
    assert.ok(
      SOFTWARE_RENDERER_MARKERS.includes(marker),
      `${marker} is one of the markers`
    );
  }
});

// ── parsing the panel's text ─────────────────────────────────────────
test('the panel\'s numbers are read out of its TEXT, not its internals', () => {
  const c = parsePanel(
    panel({
      rows: [
        { label: 'Display', value: '120 Hz — the game is drawing 60 fps' },
        { label: 'Frame cost', value: '15.94 ms vs 8.33 ms budget' },
        { label: 'Frame spacing', value: '16.7 ms apart · worst 41.7 ms' },
        { label: 'Render size', value: '6.7 megapixels' },
        { label: 'Graphics', value: 'Hardware accelerated' },
      ],
    })
  );
  assert.equal(c.displayHz, 120);
  assert.equal(c.engineFps, 60);
  assert.equal(c.engineWorkMs, 15.94);
  assert.equal(c.budgetMs, 8.33);
  assert.equal(c.spacingP50, 16.7);
  assert.equal(c.spacingMax, 41.7);
  assert.ok(
    Math.abs(c.renderPixels - 6.7e6) < 1e4,
    `6.7 megapixels, got ${c.renderPixels}`
  );
  assert.equal(c.graphics, 'hardware');
  assert.equal(c.fpsTense, 'present');
});

test('a past-tense display row is read as the past tense', () => {
  const c = parsePanel(
    panel({
      rows: [{ label: 'Display', value: '120 Hz — the game was drawing 60 fps' }],
      source: 'Last game — 2 minutes ago',
    })
  );
  assert.equal(c.fpsTense, 'past');
  assert.equal(c.engineFps, 60);
});

test('a row the panel did not print is null, not zero', () => {
  const c = parsePanel(panel({ rows: [] }));
  assert.equal(c.displayHz, null);
  assert.equal(c.engineWorkMs, null);
  assert.equal(c.renderPixels, null);
});

test('the renderer string is read out of the finding, and the software finding wins', () => {
  const c = parsePanel(
    panel({
      rows: [{ label: 'Graphics', value: 'Hardware accelerated' }],
      findings: [
        {
          title: 'Graphics acceleration is on',
          severity: 'ok',
          detail: 'Renderer: ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro)',
        },
      ],
    })
  );
  assert.equal(c.rendererString, 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro)');
  assert.equal(c.graphics, 'hardware');

  const soft = parsePanel(
    panel({
      rows: [],
      findings: [
        {
          title: 'Your browser draws this game in software',
          severity: 'bad',
          detail: 'The renderer reports "SwiftShader".',
        },
      ],
    })
  );
  assert.equal(soft.softwareFinding, true);
  assert.equal(soft.graphics, 'software');
});

test('the printed range carries the precision of the printed number', () => {
  const r = printedRange('6.7 megapixels');
  assert.ok(r);
  assert.ok(6.65e6 <= r.lo && r.hi <= 6.75e6);
  const p = printedRange('45000 pixels');
  assert.ok(p);
  assert.equal(p.lo, 44999.5);
  assert.equal(p.hi, 45000.5);
  assert.equal(printedRange('something else'), null);
});

// ── the healthy case passes ──────────────────────────────────────────
test('a healthy panel agrees with an independent measurement', () => {
  const verdicts = compare(parsePanel(panel()), healthyTruth());
  const failed = verdicts.filter((x) => x.status === 'fail');
  assert.deepEqual(failed, [], `unexpected failures: ${JSON.stringify(failed, null, 1)}`);
  assert.ok(summarise(verdicts).ok);
});

test('a panel with a 60 Hz display and a 16.67 ms budget is self-consistent', () => {
  const verdicts = compare(parsePanel(panel()), healthyTruth());
  assert.equal(v(verdicts, 'frame-budget').status, 'pass');
});

// ── the failures this gate exists for ────────────────────────────────
test('the frame cost from the boot window does not pass as the machine', () => {
  // The panel quotes 15.94 ms — measured three seconds after the engine
  // booted. The probe measured 4.2 ms right now.
  const c = parsePanel(
    panel({
      rows: [
        { label: 'Display', value: '120 Hz' },
        { label: 'Frame cost', value: '15.94 ms vs 8.33 ms budget' },
        { label: 'Render size', value: '6.7 megapixels' },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ panelHz: 120, engineMs: 4.2 }));
  const cost = v(verdicts, 'frame-cost');
  assert.equal(cost.status, 'fail');
  assert.match(cost.detail, /15\.94 ms/);
  assert.match(cost.detail, /4\.20 ms/);
});

test('the panel cannot claim 120 fps for a game that is drawing 30', () => {
  const c = parsePanel(
    panel({
      rows: [
        { label: 'Display', value: '120 Hz — the game is drawing 120 fps' },
        { label: 'Frame cost', value: '4.20 ms vs 8.33 ms budget' },
        { label: 'Render size', value: '6.7 megapixels' },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ panelHz: 120, engineFps: 30 }));
  const rate = v(verdicts, 'engine-rate');
  assert.equal(rate.status, 'fail');
  assert.match(rate.detail, /120 fps/);
  assert.match(rate.detail, /30\.0 fps/);
});

test('the summary cannot blame the browser when the browser is keeping up', () => {
  // Kyle's screenshot: 120 of 120 Hz delivered, the engine over budget,
  // and the summary said "Your browser was holding the game back".
  const c = parsePanel(
    panel({
      summary: 'Your browser is holding the game back. The fixes are below.',
      rows: [
        { label: 'Display', value: '120 Hz — the game is drawing 60 fps' },
        { label: 'Frame cost', value: '15.94 ms vs 8.33 ms budget' },
        { label: 'Render size', value: '6.7 megapixels' },
      ],
      findings: [
        {
          title: '16% of frames arrived late',
          severity: 'warn',
          detail: 'Late frames are the judder.',
        },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ panelHz: 120, browserHz: 120, engineMs: 15.94 }));
  const attribution = v(verdicts, 'summary-attribution');
  assert.equal(attribution.status, 'fail');
  assert.match(attribution.detail, /blames the browser/);
});

test('the summary cannot blame the engine when the engine is inside the budget', () => {
  const c = parsePanel(
    panel({
      summary: 'The game could not keep up with your 60 Hz display.',
      rows: [
        { label: 'Display', value: '60 Hz' },
        { label: 'Frame cost', value: '4.20 ms vs 16.67 ms budget' },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ engineMs: 4.2 }));
  assert.equal(v(verdicts, 'summary-attribution').status, 'fail');
});

test('the summary cannot say nothing is wrong while the browser is short', () => {
  const c = parsePanel(
    panel({
      summary: 'Your client was set up properly. Nothing to do.',
      rows: [{ label: 'Display', value: '30 Hz' }],
    })
  );
  const verdicts = compare(c, healthyTruth({ panelHz: 60, browserHz: 30 }));
  const attribution = v(verdicts, 'summary-attribution');
  assert.equal(attribution.status, 'fail');
  assert.match(attribution.detail, /browser is offering materially less/);
});

// ── the late frames: one-sided, and it has to be ─────────────────────
test('the panel may report fewer late frames than the truth sees', () => {
  // The pacer's threshold is the GATE's slot — the display's period
  // divided by the number of ticks the engine skips — so it is never
  // tighter than the display's own period. A panel that counts FEWER
  // late frames than the truth is not lying; it is using a wider slot.
  const c = parsePanel(
    panel({
      findings: [
        {
          title: 'Graphics acceleration is on',
          severity: 'ok',
          detail: 'Renderer: ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)',
        },
        { title: 'The game is drawing 58 fps on a 60 Hz display', severity: 'info', detail: '…' },
        { title: '16% of frames arrived late', severity: 'warn', detail: '…' },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ latePct: 98 }));
  const late = v(verdicts, 'late-frames');
  assert.equal(late.status, 'pass');
  assert.match(late.detail, /no more lateness than the truth sees/);
});

test('a panel that claims more lateness than the truth can see is inflating it', () => {
  const c = parsePanel(
    panel({
      findings: [
        {
          title: 'Graphics acceleration is on',
          severity: 'ok',
          detail: 'Renderer: ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)',
        },
        { title: 'The game is drawing 58 fps on a 60 Hz display', severity: 'info', detail: '…' },
        { title: '98% of frames arrived late', severity: 'warn', detail: '…' },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ latePct: 0 }));
  const late = v(verdicts, 'late-frames');
  assert.equal(late.status, 'fail');
  assert.match(late.detail, /can see no more than 0%/);
});

test('the placeholder canvas cannot be reported as the game\'s render size', () => {
  const c = parsePanel(
    panel({
      rows: [
        { label: 'Display', value: '60 Hz' },
        { label: 'Frame cost', value: '4.20 ms vs 16.67 ms budget' },
        { label: 'Render size', value: '0.0 megapixels' },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ backingW: 1920, backingH: 1080 }));
  assert.equal(v(verdicts, 'render-size').status, 'fail');
});

test('hardware accelerated cannot be claimed on a software rasteriser', () => {
  const c = parsePanel(
    panel({
      rows: [{ label: 'Graphics', value: 'Hardware accelerated' }],
      findings: [
        {
          title: 'Graphics acceleration is on',
          severity: 'ok',
          detail: 'Renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
        },
      ],
    })
  );
  const verdicts = compare(
    c,
    healthyTruth({
      renderer:
        'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
    })
  );
  const graphics = v(verdicts, 'graphics');
  assert.equal(graphics.status, 'fail');
  assert.match(graphics.detail, /hardware accelerated/);
});

test('the panel cannot name a different GPU than the browser reports', () => {
  const c = parsePanel(
    panel({
      findings: [
        {
          title: 'Graphics acceleration is on',
          severity: 'ok',
          detail: 'Renderer: ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro)',
        },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth());
  assert.equal(v(verdicts, 'renderer-string').status, 'fail');
});

test('a budget that disagrees with the panel\'s own display rate fails', () => {
  const c = parsePanel(
    panel({
      rows: [{ label: 'Display', value: '120 Hz' }, { label: 'Frame cost', value: '4.20 ms vs 16.67 ms budget' }],
    })
  );
  const verdicts = compare(c, healthyTruth({ panelHz: 120 }));
  const budget = v(verdicts, 'frame-budget');
  assert.equal(budget.status, 'fail');
  assert.match(budget.detail, /8\.33 ms/);
});

// ── a missing measurement is never a silent pass ─────────────────────
test('a missing row is unverifiable, not a pass', () => {
  const verdicts = compare(parsePanel(panel({ rows: [] })), healthyTruth());
  for (const id of ['display-rate', 'frame-cost', 'render-size', 'graphics']) {
    assert.equal(v(verdicts, id).status, 'unverifiable', `${id} should not be a pass`);
  }
  assert.equal(summarise(verdicts).fail, 0);
  assert.ok(summarise(verdicts).unverifiable >= 4);
});

test('a probe that measured nothing does not fail the panel', () => {
  const verdicts = compare(parsePanel(panel()), healthyTruth({ engineMs: null, engineFps: null, panelHz: null }));
  assert.equal(v(verdicts, 'frame-cost').status, 'unverifiable');
  assert.equal(v(verdicts, 'engine-rate').status, 'unverifiable');
  assert.equal(summarise(verdicts).fail, 0);
});

test('a panel that is not on the screen at all is not a pass', () => {
  const verdicts = compare(parsePanel({ present: false }), healthyTruth());
  assert.equal(v(verdicts, 'display-rate').status, 'unverifiable');
});

// ── the provenance ───────────────────────────────────────────────────
test('a live game must not claim the numbers are from the last game', () => {
  const c = parsePanel(panel({ source: 'Last game — 2 minutes ago' }));
  const verdicts = compareProvenance(c, 'live');
  assert.equal(verdicts[0].status, 'fail');
});

test('after the quit the panel must say the numbers are from the last game', () => {
  const c = parsePanel(panel({ source: '', summary: 'Your client was set up properly. Nothing to do.' }));
  const verdicts = compareProvenance(c, 'last-session');
  assert.equal(verdicts[0].status, 'fail');
});

test('after the quit the panel must use the past tense for the game', () => {
  const c = parsePanel(
    panel({
      source: 'Last game — 2 minutes ago',
      rows: [{ label: 'Display', value: '120 Hz — the game is drawing 60 fps' }],
    })
  );
  const verdicts = compareProvenance(c, 'last-session');
  assert.equal(verdicts[0].status, 'fail');
  assert.match(verdicts[0].detail, /present tense/);
});

test('a restored panel that says it, in the past tense, passes', () => {
  const c = parsePanel(
    panel({
      source: 'Last game — 2 minutes ago',
      summary: 'Your client was set up properly in your last game. Nothing to do.',
      rows: [{ label: 'Display', value: '120 Hz — the game was drawing 60 fps' }],
    })
  );
  const verdicts = compareProvenance(c, 'last-session');
  assert.equal(verdicts[0].status, 'pass');
});

// ── the panel against itself ────────────────────────────────────────
test('a worst gap smaller than the median is impossible, and it fails', () => {
  // The shipped panel once printed "33.5 ms apart · worst 31.5 ms":
  // the pacer took the LAST gap in the window instead of the largest.
  const c = parsePanel(
    panel({
      rows: [
        { label: 'Display', value: '60 Hz' },
        { label: 'Frame cost', value: '2.10 ms vs 16.67 ms budget' },
        { label: 'Frame spacing', value: '33.5 ms apart · worst 31.5 ms' },
        { label: 'Render size', value: '0.48 megapixels' },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ engineMs: 2.1 }));
  const self = v(verdicts, 'frame-spacing-self');
  assert.equal(self.status, 'fail');
  assert.match(self.detail, /impossible/);
});

test('a consistent spacing passes the self-check', () => {
  const c = parsePanel(
    panel({
      rows: [
        { label: 'Display', value: '60 Hz' },
        { label: 'Frame cost', value: '2.10 ms vs 16.67 ms budget' },
        { label: 'Frame spacing', value: '33.5 ms apart · worst 48.5 ms' },
        { label: 'Render size', value: '0.48 megapixels' },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ engineMs: 2.1, spacingP50: 33.5, spacingMax: 48.5 }));
  assert.equal(v(verdicts, 'frame-spacing-self').status, 'pass');
});

// ── the worst gap: one-sided, because the windows differ ────────────
test('a worst gap below the probe\'s is fine — the probe\'s window is longer', () => {
  // The panel's "worst" is the largest gap in the client's last 240
  // frame starts; the probe's is the largest gap in a longer window.
  // A maximum over a longer window is never smaller, so the panel's
  // number is allowed to sit below the probe's.
  const c = parsePanel(
    panel({
      rows: [
        { label: 'Display', value: '60 Hz' },
        { label: 'Frame cost', value: '4.20 ms vs 16.67 ms budget' },
        { label: 'Frame spacing', value: '16.7 ms apart · worst 18.4 ms' },
        { label: 'Render size', value: '2.1 megapixels' },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ spacingP50: 16.7, spacingMax: 41.2 }));
  const worst = v(verdicts, 'frame-spacing-worst');
  assert.equal(worst.status, 'pass');
  assert.match(worst.detail, /inside the probe's longer window/);
});

test('a worst gap well above the probe\'s is a stall the probe never saw', () => {
  const c = parsePanel(
    panel({
      rows: [
        { label: 'Display', value: '60 Hz' },
        { label: 'Frame cost', value: '4.20 ms vs 16.67 ms budget' },
        { label: 'Frame spacing', value: '45.4 ms apart · worst 269.3 ms' },
        { label: 'Render size', value: '0.48 megapixels' },
      ],
    })
  );
  const verdicts = compare(c, healthyTruth({ spacingP50: 45.4, spacingMax: 56.1 }));
  const worst = v(verdicts, 'frame-spacing-worst');
  assert.equal(worst.status, 'fail');
  assert.match(worst.detail, /nothing past 56\.10 ms/);
});

// ── the summary that is not one this gate knows ─────────────────────
test('an unknown verdict line is unverifiable, not a pass', () => {
  const verdicts = compare(parsePanel(panel({ summary: 'Something entirely new.' })), healthyTruth());
  assert.equal(v(verdicts, 'summary-attribution').status, 'unverifiable');
});
