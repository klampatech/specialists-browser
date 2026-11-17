'use strict';

/**
 * THE READOUT TRUTH GATE — the pure half.
 *
 * WHAT THIS IS
 * ------------
 * Two functions: one that reads the panel's DISPLAYED numbers out of
 * the DOM (the claims), and one that compares those claims against an
 * INDEPENDENT measurement (the truth) and says, for each one, whether
 * it holds.
 *
 * WHY IT IS PURE
 * --------------
 * Because a gate that can only be run with a browser is a gate nobody
 * runs. This file has no imports and no browser, so the parent's unit
 * suite can exercise every claim shape — including the ones that only
 * happen on a bad day — with no rig, no game and no server. The
 * browser half (`tools/perf/verify-readout-truth.cjs`) is a thin shell
 * around it: it collects the claims, collects the truth, and asks this
 * file what it thinks.
 *
 * THE RULE
 * --------
 * THE CLAIM IS THE TEXT THE PLAYER READS. Not the report object, not
 * the policy's return value — the STRING on the screen. A gate that
 * reads the internal object proves the object is right; only the text
 * proves the player is being told the truth. The harness reads
 * `.ts-perf__stat-value` and this module parses what it finds there.
 *
 * THE TRUTH IS FROM ANOTHER INSTRUMENT
 * ------------------------------------
 * The truth comes from the watch probe: the browser's own scheduling,
 * measured by wrapping `requestAnimationFrame` before the client's
 * frame-pacing shim installs itself. So the panel's numbers and the
 * truth's numbers are produced by DIFFERENT code paths — which is the
 * only thing that makes the comparison worth anything. A comparison of
 * the panel against itself would always pass.
 *
 * A FAILURE PATH HAS TO REPORT, NOT CRASH
 * ----------------------------------------
 * The same rule the rest of `tools/perf` follows: a missing row, an
 * unparsable value or an absent measurement is `unverifiable` — with
 * the reason — and never a crash and never a silent pass.
 */

/**
 * THE TOLERANCES.
 *
 * Every one of them is a JUDGEMENT, and every one of them is written
 * down here rather than buried in a comparison, so the judgement can
 * be argued with.
 *
 * WHY THE BANDS ARE WHAT THEY ARE
 * -------------------------------
 * - The DISPLAY rate: the panel's number was measured while the page
 *   was IDLE; the truth is measured while the game is running. They
 *   are the same display measured at two different moments, so a band
 *   is right. 10% covers a browser that is not vsync-locked, and the
 *   2 Hz floor stops a 30 Hz panel from failing on a 1 Hz wobble.
 * - The ENGINE's frame rate: both sides count the same frames, but
 *   the panel's window and the probe's window are not the same window.
 *   15% is wide enough for a window boundary and tight enough to catch
 *   the failure this gate exists for (the panel claiming 120 fps for a
 *   game that is drawing 30).
 * - The ENGINE's frame cost: the panel's number comes from the
 *   pacer's own measurement of the engine's callback; the truth comes
 *   from the probe's measurement of the same callback. They are two
 *   instruments on the same work, so they should agree closely — but
 *   the scene changes (a firefight, a compilation) and the pacer's
 *   window is 10 seconds long. 35% OR 1 ms, whichever is wider.
 * - The BUDGET: this one is EXACT, because it is not a measurement at
 *   all — it is `1000 / panelHz`, and the panel's own display rate
 *   says what it should be. A budget that does not match the panel's
 *   own display rate is a bug in the panel, and no tolerance is
 *   wanted.
 * - The RENDER SIZE: EXACT, to the panel's own printed precision. The
 *   canvas's backing store is a fact, not a measurement, and the
 *   panel prints it with a known number of decimals.
 * - The LATE FRAMES: the panel counts the ENGINE's frames missing
 *   their slots; the truth counts the same thing from the other side.
 *   The definitions are close but not identical, so the band is 10
 *   POINTS rather than a percentage.
 */
const TOLERANCES = {
  displayHzPct: 0.1,
  displayHzAbs: 2,
  engineFpsPct: 0.15,
  engineMsPct: 0.35,
  engineMsAbs: 1.0,
  budgetMsAbs: 0.05,
  spacingPct: 0.15,
  spacingMaxPct: 0.3,
  latePctPoints: 5,
  summaryHzPct: 0.15,
  rendererHzPct: 0.15,
};

/**
 * THE SOFTWARE RENDERERS.
 *
 * THE SAME LIST THE POLICY USES, and `tests/unit/readout-truth.test.mjs`
 * asserts that this list and `perf-check.ts`'s `isSoftwareRenderer`
 * agree on every string it tries. So the duplication cannot drift
 * silently: the test fails and the list is fixed.
 *
 * WHY THE GATE NEEDS IT AT ALL: the panel says "Hardware accelerated"
 * because the renderer string is not on this list. If the probe reads a
 * renderer string that IS on the list while the panel says hardware,
 * one of the two is wrong — and the probe's string is the independent
 * one, so the panel is wrong.
 */
const SOFTWARE_RENDERER_MARKERS = [
  'swiftshader',
  'llvmpipe',
  'softpipe',
  'basic render',
  'software rasterizer',
  'microsoft basic',
];

/**
 * Is this renderer string a software rasteriser?
 *
 * @param {string} renderer
 * @returns {boolean}
 */
function isSoftwareRenderer(renderer) {
  const r = String(renderer || '').toLowerCase();
  return SOFTWARE_RENDERER_MARKERS.some((m) => r.includes(m));
}

/**
 * A number, or null when there is not one.
 *
 * @param {*} v
 * @returns {number|null}
 */
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * THE CLAIMS, parsed out of the panel's text.
 *
 * WHAT COMES IN
 * -------------
 * The DOM, as the harness read it:
 *
 *   {
 *     summary: 'The game could not keep up with your 60 Hz display.',
 *     source:  '' | 'Last game — 2 minutes ago',
 *     note:    'the note under the numbers',
 *     rows:    [{ label: 'Display', value: '60 Hz — the game is drawing 30 fps' }],
 *     findings:[{ title: '…', severity: 'warn', detail: '…' }],
 *     checklist: [{ action: '…', why: '…' }],
 *   }
 *
 * WHAT COMES OUT
 * --------------
 * The numbers the player is looking at, as numbers. A row the panel
 * did not print is `null` — NOT zero, because zero is a measurement.
 *
 * @param {object} dom
 * @returns {object} the claims
 */
function parsePanel(dom) {
  const d = dom || {};
  const rows = Array.isArray(d.rows) ? d.rows : [];
  const findings = Array.isArray(d.findings) ? d.findings : [];
  const checklist = Array.isArray(d.checklist) ? d.checklist : [];

  const rowValue = (label) => {
    const row = rows.find((r) => String(r.label || '').trim() === label);
    return row ? String(row.value || '').trim() : null;
  };
  const findingByTitle = (re) => findings.find((f) => re.test(String(f.title || '')));

  const claims = {
    summary: String(d.summary || '').trim(),
    source: String(d.source || '').trim(),
    note: String(d.note || '').trim(),
    present: !!d.present,
    checklist: checklist.map((c) => ({
      action: String(c.action || '').trim(),
      why: String(c.why || '').trim(),
    })),

    displayHz: null,
    engineFps: null,
    engineWorkMs: null,
    budgetMs: null,
    spacingP50: null,
    spacingMax: null,
    renderPixels: null,
    renderText: null,
    graphics: null,
    rendererString: null,
    latePct: null,
    softwareFinding: false,
    fpsTense: null,
  };

  // --- the DISPLAY row ---
  const display = rowValue('Display');
  if (display) {
    const hz = display.match(/([\d.]+)\s*Hz/);
    if (hz) claims.displayHz = num(hz[1]);
    // "the game is drawing 30 fps" / "the game WAS drawing 30 fps".
    const fps = display.match(/drawing\s+([\d.]+)\s*fps/i);
    if (fps) claims.engineFps = num(fps[1]);
    claims.fpsTense = /\bwas drawing\b/i.test(display)
      ? 'past'
      : /\bis drawing\b/i.test(display)
        ? 'present'
        : null;
  }

  // --- the FRAME COST row ---
  const cost = rowValue('Frame cost');
  if (cost) {
    const ms = cost.match(/([\d.]+)\s*ms/);
    if (ms) claims.engineWorkMs = num(ms[1]);
    const budget = cost.match(/vs\s+([\d.]+)\s*ms\s*budget/i);
    if (budget) claims.budgetMs = num(budget[1]);
  }

  // --- the FRAME SPACING row ---
  const spacing = rowValue('Frame spacing');
  if (spacing) {
    const p50 = spacing.match(/([\d.]+)\s*ms apart/);
    if (p50) claims.spacingP50 = num(p50[1]);
    const worst = spacing.match(/worst\s+([\d.]+)\s*ms/);
    if (worst) claims.spacingMax = num(worst[1]);
  }

  // --- the RENDER SIZE row ---
  const render = rowValue('Render size');
  if (render) {
    claims.renderText = render;
    const mp = render.match(/([\d.]+)\s*megapixels/i);
    if (mp) claims.renderPixels = num(mp[1]) * 1e6;
    else {
      const px = render.match(/([\d.]+)\s*pixels/i);
      if (px) claims.renderPixels = num(px[1]);
    }
  }

  // --- the GRAPHICS row ---
  const graphics = rowValue('Graphics');
  if (graphics) {
    claims.graphics = /hardware accelerated/i.test(graphics) ? 'hardware' : 'other';
  }

  // --- the findings ---
  const rendererFinding =
    findingByTitle(/graphics acceleration is on/i) ||
    findingByTitle(/renderer/i);
  if (rendererFinding) {
    const detail = String(rendererFinding.detail || '');
    const m = detail.match(/Renderer:\s*(.+)/);
    if (m) claims.rendererString = m[1].trim();
  }
  if (findingByTitle(/draws this game in software/i)) {
    claims.softwareFinding = true;
    claims.graphics = 'software';
  }
  const late = findingByTitle(/([\d.]+)% of frames arrived late/i);
  if (late) {
    const m = String(late.title || '').match(/([\d.]+)%/);
    if (m) claims.latePct = num(m[1]);
  }

  return claims;
}

/**
 * THE RANGE A PRINTED NUMBER ALLOWS.
 *
 * "6.7 megapixels" was printed with one decimal, so the truth is
 * between 6.65 and 6.75 megapixels. This is how the render size is
 * compared EXACTLY without the gate having to know the panel's
 * formatting rule — the printed string carries its own precision.
 *
 * @param {string} text the panel's printed value
 * @returns {{lo:number,hi:number,unit:string}|null}
 */
function printedRange(text) {
  const t = String(text || '');
  const mp = t.match(/([\d.]+)\s*megapixels/i);
  if (mp) {
    const decimals = (mp[1].split('.')[1] || '').length;
    const step = Math.pow(10, -decimals) / 2;
    const value = num(mp[1]);
    if (value === null) return null;
    return { lo: (value - step) * 1e6, hi: (value + step) * 1e6, unit: 'pixels' };
  }
  const px = t.match(/([\d.]+)\s*pixels/i);
  if (px) {
    const value = num(px[1]);
    if (value === null) return null;
    // A whole-pixel count has no decimals: the truth must be it.
    return { lo: value - 0.5, hi: value + 0.5, unit: 'pixels' };
  }
  return null;
}

/**
 * One verdict.
 *
 * @param {string} id
 * @param {string} claim what the panel said
 * @param {*} panel the panel's number
 * @param {*} truth the measured number
 * @param {'pass'|'fail'|'unverifiable'} status
 * @param {string} detail
 * @returns {object}
 */
function verdict(id, claim, panel, truth, status, detail) {
  return { id, claim, panel, truth, status, detail };
}

/**
 * COMPARE THE CLAIMS WITH THE TRUTH.
 *
 * @param {object} claims from `parsePanel`
 * @param {object} truth the probe's measurements
 * @returns {object[]} the verdicts, worst first
 */
function compare(claims, truth) {
  const t = truth || {};
  const c = claims || {};
  const out = [];

  // --- the DISPLAY rate ---
  if (c.displayHz === null) {
    out.push(
      verdict('display-rate', 'the display rate', null, t.panelHz, 'unverifiable', 'the panel printed no display rate')
    );
  } else if (t.panelHz === null || t.panelHz === undefined) {
    out.push(
      verdict('display-rate', 'the display rate', c.displayHz, null, 'unverifiable', 'the probe measured no tick rate')
    );
  } else {
    const diff = Math.abs(c.displayHz - t.panelHz);
    const band = Math.max(t.panelHz * TOLERANCES.displayHzPct, TOLERANCES.displayHzAbs);
    out.push(
      verdict(
        'display-rate',
        'the display rate',
        c.displayHz,
        t.panelHz,
        diff <= band ? 'pass' : 'fail',
        diff <= band
          ? `within ${band.toFixed(1)} Hz`
          : `the panel says ${c.displayHz} Hz and the browser delivered ${t.panelHz.toFixed(1)} Hz`
      )
    );
  }

  // --- the GAME's frame rate ---
  if (c.engineFps === null) {
    // The panel only prints the game's rate when it is BELOW the
    // display's — otherwise the row is just the display rate and there
    // is no separate claim to check.
    out.push(
      verdict('engine-rate', "the game's frame rate", null, t.engineFps, 'unverifiable', 'the panel printed no separate game rate')
    );
  } else if (t.engineFps === null || t.engineFps === undefined) {
    out.push(
      verdict('engine-rate', "the game's frame rate", c.engineFps, null, 'unverifiable', 'the probe counted no engine frames')
    );
  } else {
    const diff = Math.abs(c.engineFps - t.engineFps);
    const band = Math.max(t.engineFps * TOLERANCES.engineFpsPct, 1);
    out.push(
      verdict(
        'engine-rate',
        "the game's frame rate",
        c.engineFps,
        t.engineFps,
        diff <= band ? 'pass' : 'fail',
        diff <= band
          ? `within ${band.toFixed(1)} fps`
          : `the panel says ${c.engineFps} fps and the probe counted ${t.engineFps.toFixed(1)} fps`
      )
    );
  }

  // --- the ENGINE's frame cost ---
  if (c.engineWorkMs === null) {
    out.push(
      verdict('frame-cost', 'the frame cost', null, t.engineMs, 'unverifiable', 'the panel printed no frame cost')
    );
  } else if (t.engineMs === null || t.engineMs === undefined) {
    out.push(
      verdict('frame-cost', 'the frame cost', c.engineWorkMs, null, 'unverifiable', 'the probe measured no engine frame')
    );
  } else {
    const diff = Math.abs(c.engineWorkMs - t.engineMs);
    const band = Math.max(t.engineMs * TOLERANCES.engineMsPct, TOLERANCES.engineMsAbs);
    out.push(
      verdict(
        'frame-cost',
        'the frame cost',
        c.engineWorkMs,
        t.engineMs,
        diff <= band ? 'pass' : 'fail',
        diff <= band
          ? `within ${band.toFixed(2)} ms`
          : `the panel says ${c.engineWorkMs} ms and the probe measured ${t.engineMs.toFixed(2)} ms`
      )
    );
  }

  // --- the FRAME BUDGET ---
  //
  // NOT A MEASUREMENT: it is `1000 / panelHz`, and the panel's own
  // display rate says what it has to be. A budget that disagrees with
  // the panel's own display rate means the panel is inconsistent with
  // itself, and every "over budget" claim on the screen is then wrong.
  if (c.budgetMs === null) {
    out.push(
      verdict('frame-budget', 'the frame budget', null, null, 'unverifiable', 'the panel printed no budget')
    );
  } else if (!c.displayHz) {
    out.push(
      verdict('frame-budget', 'the frame budget', c.budgetMs, null, 'unverifiable', 'the panel printed no display rate to check it against')
    );
  } else {
    const expected = 1000 / c.displayHz;
    const diff = Math.abs(c.budgetMs - expected);
    out.push(
      verdict(
        'frame-budget',
        'the frame budget',
        c.budgetMs,
        Number(expected.toFixed(2)),
        diff <= TOLERANCES.budgetMsAbs ? 'pass' : 'fail',
        diff <= TOLERANCES.budgetMsAbs
          ? 'consistent with the panel\'s own display rate'
          : `a ${c.displayHz} Hz display gives ${expected.toFixed(2)} ms, not ${c.budgetMs} ms`
      )
    );
  }

  // --- the RENDER SIZE ---
  if (!c.renderText) {
    out.push(
      verdict('render-size', 'the render size', null, null, 'unverifiable', 'the panel printed no render size')
    );
  } else if (!t.backingW || !t.backingH) {
    out.push(
      verdict('render-size', 'the render size', c.renderText, null, 'unverifiable', 'the probe read no canvas')
    );
  } else {
    const range = printedRange(c.renderText);
    const truthPixels = t.backingW * t.backingH;
    if (!range) {
      out.push(
        verdict('render-size', 'the render size', c.renderText, truthPixels, 'unverifiable', 'the printed value could not be parsed')
      );
    } else {
      const ok = truthPixels >= range.lo && truthPixels <= range.hi;
      out.push(
        verdict(
          'render-size',
          'the render size',
          c.renderText,
          `${t.backingW}×${t.backingH} (${truthPixels} pixels)`,
          ok ? 'pass' : 'fail',
          ok
            ? 'the canvas is the size the panel says'
            : `the panel says ${c.renderText} and the canvas is ${t.backingW}×${t.backingH}`
        )
      );
    }
  }

  // --- the GRAPHICS claim ---
  if (c.graphics === null) {
    out.push(
      verdict('graphics', 'the graphics claim', null, t.renderer, 'unverifiable', 'the panel printed no graphics row')
    );
  } else if (!t.renderer) {
    out.push(
      verdict('graphics', 'the graphics claim', c.graphics, null, 'unverifiable', 'the probe read no renderer string')
    );
  } else {
    const software = isSoftwareRenderer(t.renderer);
    const claimsHardware = c.graphics === 'hardware';
    const ok = claimsHardware ? !software : software;
    out.push(
      verdict(
        'graphics',
        'the graphics claim',
        c.graphics,
        t.renderer,
        ok ? 'pass' : 'fail',
        ok
          ? 'the panel and the renderer agree'
          : claimsHardware
            ? `the panel says hardware accelerated, but the renderer is "${t.renderer}"`
            : `the panel says software, but the renderer is "${t.renderer}"`
      )
    );
  }

  // --- the RENDERER STRING ---
  if (c.rendererString && t.renderer) {
    const ok = c.rendererString === t.renderer;
    out.push(
      verdict(
        'renderer-string',
        'the renderer string',
        c.rendererString,
        t.renderer,
        ok ? 'pass' : 'fail',
        ok
          ? 'the panel names the GPU the probe read'
          : 'the panel names a different GPU than the one the browser reports'
      )
    );
  }

  // --- the LATE FRAMES ---
  if (c.latePct === null) {
    out.push(
      verdict('late-frames', 'the late frames', null, t.latePct, 'unverifiable', 'the panel made no claim about late frames')
    );
  } else if (t.latePct === null || t.latePct === undefined) {
    out.push(
      verdict('late-frames', 'the late frames', c.latePct, null, 'unverifiable', 'the probe measured no late frames')
    );
  } else {
    // ONE-SIDED, AND DELIBERATELY.
    //
    // The panel counts the engine's frames that missed the GATE's slot
    // by more than half of it. The gate's slot is the display's period
    // divided by the number of ticks the engine skips, so it is never
    // TIGHTER than the display's own period — and the truth is counted
    // against the display's period. So the truth's number is always at
    // least the panel's, and the panel may report FEWER late frames
    // (a wider slot) but never MORE.
    //
    // A panel that claims MORE lateness than the truth can see is
    // inflating it, and that is the failure this catches.
    const excess = c.latePct - t.latePct;
    out.push(
      verdict(
        'late-frames',
        'the late frames',
        c.latePct,
        t.latePct,
        excess <= TOLERANCES.latePctPoints ? 'pass' : 'fail',
        excess <= 0
          ? `the panel claims no more lateness than the truth sees (${t.latePct}%)`
          : excess <= TOLERANCES.latePctPoints
            ? `within ${TOLERANCES.latePctPoints} points`
            : `the panel says ${c.latePct}% and the truth can see no more than ${t.latePct}%`
      )
    );
  }

  // --- the FRAME SPACING ---
  if (c.spacingP50 !== null && t.spacingP50) {
    const diff = Math.abs(c.spacingP50 - t.spacingP50);
    const band = Math.max(t.spacingP50 * TOLERANCES.spacingPct, 0.5);
    out.push(
      verdict(
        'frame-spacing',
        'the frame spacing',
        c.spacingP50,
        t.spacingP50,
        diff <= band ? 'pass' : 'fail',
        diff <= band
          ? `within ${band.toFixed(2)} ms`
          : `the panel says ${c.spacingP50} ms apart and the probe measured ${t.spacingP50.toFixed(2)} ms`
      )
    );
  }
  if (c.spacingMax !== null && t.spacingMax) {
    // ONE-SIDED, AND IT HAS TO BE.
    //
    // The panel's "worst" is the largest gap in the client's window —
    // its last 240 frame starts — and the harness's is the largest gap
    // in a window of the harness's own, which is deliberately LONGER so
    // that it CONTAINS the client's. A maximum over a longer window is
    // never smaller, so the harness's number is the bigger of the two
    // and the panel's may sit below it without being wrong.
    //
    // What must not happen is the panel claiming a stall the harness
    // never saw: the harness's window is the longer one, so a panel
    // number well above it is an inflation.
    const diff = c.spacingMax - t.spacingMax;
    const band = Math.max(t.spacingMax * TOLERANCES.spacingMaxPct, 1);
    out.push(
      verdict(
        'frame-spacing-worst',
        'the worst frame gap',
        c.spacingMax,
        t.spacingMax,
        diff <= band ? 'pass' : 'fail',
        diff <= 0
          ? `the panel's worst (${c.spacingMax} ms) is inside the probe's longer window (${t.spacingMax.toFixed(2)} ms)`
          : diff <= band
            ? `within ${band.toFixed(2)} ms`
            : `the panel says ${c.spacingMax} ms and the probe saw nothing past ${t.spacingMax.toFixed(2)} ms`
      )
    );
  }

  // --- THE PANEL'S OWN NUMBERS, AGAINST EACH OTHER ---
  //
  // A "worst" gap SMALLER than the median gap is impossible: the worst
  // of a set of gaps is at least its median. A panel that says
  // "33.5 ms apart · worst 31.5 ms" is not describing a measurement —
  // it is describing a bug, and this check is where that is caught
  // without needing the truth at all.
  if (c.spacingP50 !== null && c.spacingMax !== null) {
    const ok = c.spacingMax >= c.spacingP50;
    out.push(
      verdict(
        'frame-spacing-self',
        'the spacing, against itself',
        `${c.spacingP50} ms apart · worst ${c.spacingMax} ms`,
        'the worst gap is at least the median',
        ok ? 'pass' : 'fail',
        ok
          ? 'the panel agrees with itself'
          : `the worst gap (${c.spacingMax} ms) is smaller than the median (${c.spacingP50} ms), which is impossible`
      )
    );
  }

  // --- the SUMMARY, and who it blames ---
  out.push(...compareSummary(c, t));

  return out;
}

/**
 * THE SUMMARY, and who it blames.
 *
 * THIS IS THE CHECK THE WHOLE THING EXISTS FOR.
 *
 * Kyle's screenshot said "Your browser was holding the game back in
 * your last game" while the browser was delivering 120 of 120 Hz and
 * the engine was using 191% of the frame budget. The panel was
 * internally consistent and wrong, because the summary was hardcoded
 * to blame the browser whenever anything was a warning.
 *
 * So the summary's ATTRIBUTION is recomputed here, from the probe's
 * facts, and compared with the sentence on the screen.
 *
 * @param {object} c the claims
 * @param {object} t the truth
 * @returns {object[]}
 */
function compareSummary(c, t) {
  const out = [];
  const summary = c.summary || '';
  if (!summary) {
    out.push(verdict('summary-attribution', 'the verdict line', null, null, 'unverifiable', 'the panel printed no verdict line'));
    return out;
  }

  // THE BUDGET THE PANEL WAS WORKING WITH.
  //
  // The panel's OWN printed budget is the right one to judge the
  // engine against — it is what the player was told. The display rate
  // is the fallback, because the panel prints the budget on the same
  // row as the cost.
  const budgetMs = c.budgetMs || (c.displayHz ? 1000 / c.displayHz : null);
  // THE BROWSER'S RATE IS COMPARED WITH THE DISPLAY'S RATE AS
  // MEASURED — not with the rate the PANEL claims. The panel's own
  // display rate is judged by its own verdict; letting it excuse a
  // wrong blame would let a wrong rate hide a wrong attribution.
  const displayTruth = t.panelHz || c.displayHz;
  const engineOver =
    budgetMs && t.engineMs !== null && t.engineMs !== undefined ? t.engineMs > budgetMs : null;
  // THE BROWSER IS ONLY "SHORT" IF THE ENGINE IS NOT THE REASON.
  //
  // When the engine cannot finish a frame inside the display's period,
  // the browser's ticks stretch to the engine's pace — the live rate is
  // then the ENGINE's rate wearing the browser's clothes. Judging the
  // browser on that number would blame the browser for the engine's
  // cost, which is the exact mistake this gate exists to catch.
  const browserShort =
    t.browserHz && displayTruth
      ? t.browserHz < displayTruth * 0.9 && engineOver !== true
      : null;
  const software = t.renderer ? isSoftwareRenderer(t.renderer) : null;

  const blamesBrowser = /only offering|holding the game back/i.test(summary);
  const blamesEngine = /could not keep up|game cannot keep up/i.test(summary);
  const blamesSetup = /not set up for this game/i.test(summary);
  const saysFine = /set up properly/i.test(summary);

  if (blamesSetup) {
    out.push(
      verdict(
        'summary-attribution',
        'the verdict line',
        summary,
        software === null ? 'unknown' : software ? 'a software renderer' : 'a real GPU',
        software === null ? 'unverifiable' : software ? 'pass' : 'fail',
        software === null
          ? 'the probe read no renderer string'
          : software
            ? 'the renderer really is a software rasteriser'
            : 'the panel says the browser is not set up, but the GPU is real'
      )
    );
    return out;
  }

  if (blamesBrowser) {
    const claimed = summary.match(/([\d.]+)\s*refreshes/i);
    const said = claimed ? num(claimed[1]) : null;
    const rateOk =
      said !== null && t.browserHz
        ? Math.abs(said - t.browserHz) <= Math.max(t.browserHz * TOLERANCES.summaryHzPct, 2)
        : null;
    const shortOk = browserShort === null ? null : browserShort === true;
    const ok = shortOk === true && rateOk !== false;
    out.push(
      verdict(
        'summary-attribution',
        'the verdict line',
        summary,
        t.browserHz ? `${t.browserHz.toFixed(1)} Hz offered` : 'unknown',
        ok ? 'pass' : rateOk === false || shortOk === false ? 'fail' : 'unverifiable',
        rateOk === false
          ? `the panel says ${said} refreshes and the browser offered ${t.browserHz.toFixed(1)}`
          : shortOk === false
            ? `the panel blames the browser, but it offered ${t.browserHz.toFixed(1)} Hz of a ${c.displayHz} Hz display`
            : 'the browser really is offering materially less'
      )
    );
    return out;
  }

  if (blamesEngine) {
    const ok = engineOver === null ? null : engineOver === true;
    out.push(
      verdict(
        'summary-attribution',
        'the verdict line',
        summary,
        t.engineMs !== null && t.engineMs !== undefined
          ? `${t.engineMs.toFixed(2)} ms of frame`
          : 'unknown',
        ok === null ? 'unverifiable' : ok ? 'pass' : 'fail',
        ok === null
          ? 'the probe measured no frame cost'
          : ok
            ? 'the engine really is over the budget'
            : `the panel blames the engine, but a frame costs ${t.engineMs.toFixed(2)} ms of a ${budgetMs.toFixed(2)} ms budget`
      )
    );
    return out;
  }

  if (saysFine) {
    const problems = [];
    if (browserShort === true) problems.push('the browser is offering materially less than the display');
    if (engineOver === true) problems.push('the engine is over the frame budget');
    if (software === true) problems.push('the renderer is a software rasteriser');
    out.push(
      verdict(
        'summary-attribution',
        'the verdict line',
        summary,
        problems.length ? problems.join('; ') : 'nothing to fix',
        problems.length === 0 ? 'pass' : 'fail',
        problems.length === 0
          ? 'nothing is wrong, and the panel says so'
          : `the panel says nothing is wrong, but ${problems.join(' and ')}`
      )
    );
    return out;
  }

  out.push(
    verdict('summary-attribution', 'the verdict line', summary, null, 'unverifiable', 'the verdict line was not one this gate knows')
  );
  return out;
}

/**
 * THE PROVENANCE: is the panel telling the truth about WHERE the
 * numbers come from?
 *
 * Two states:
 *   - IN THE GAME: the numbers are live. The panel must not say they
 *     are from a previous game.
 *   - AFTER THE QUIT: the numbers are the last match's. The panel must
 *     say so, and it must use the PAST TENSE for the game.
 *
 * @param {object} c the claims
 * @param {'live'|'last-session'} expected
 * @returns {object[]}
 */
function compareProvenance(c, expected) {
  const out = [];
  const claimsLastGame = /last game/i.test(c.source || '') || /last game/i.test(c.note || '');

  // THE PAST TENSE IS ABOUT THE GAME, NOT ABOUT THE SUMMARY.
  //
  // The summary is allowed to say "Your client WAS set up properly" —
  // that is a fact about the last game too. What must not happen is the
  // panel saying the game IS drawing frames when the game is not
  // running. So the tense is read off the GAME's own claim: the
  // display row's "is drawing" / "was drawing", and the summary's
  // "the game is" when there is no game rate on the screen.
  const gameClaim =
    c.fpsTense !== null
      ? c.fpsTense === 'past'
      : !/\bthe game is\b/i.test(c.summary || '');
  const usesPast = gameClaim;

  if (expected === 'live') {
    out.push(
      verdict(
        'provenance',
        'the provenance',
        c.source || '(no provenance line)',
        'live',
        claimsLastGame ? 'fail' : 'pass',
        claimsLastGame
          ? 'the game is running, but the panel says the numbers are from the last game'
          : 'the panel does not claim the numbers are from a previous game'
      )
    );
    return out;
  }

  const saysLast = claimsLastGame;
  out.push(
    verdict(
      'provenance',
      'the provenance',
      c.source || '(no provenance line)',
      'the last game, in the past tense',
      saysLast && usesPast ? 'pass' : 'fail',
      !saysLast
        ? 'the game is over, but the panel does not say the numbers are from the last game'
        : !usesPast
          ? 'the panel claims the last game in the present tense'
          : 'the panel says the numbers are from the last game, in the past tense'
    )
  );
  return out;
}

/**
 * THE VERDICT, in one line.
 *
 * @param {object[]} verdicts
 * @returns {{pass:number,fail:number,unverifiable:number,ok:boolean}}
 */
function summarise(verdicts) {
  const list = Array.isArray(verdicts) ? verdicts : [];
  const pass = list.filter((v) => v.status === 'pass').length;
  const fail = list.filter((v) => v.status === 'fail').length;
  const unverifiable = list.filter((v) => v.status === 'unverifiable').length;
  return { pass, fail, unverifiable, ok: fail === 0 };
}

module.exports = {
  TOLERANCES,
  SOFTWARE_RENDERER_MARKERS,
  isSoftwareRenderer,
  parsePanel,
  printedRange,
  compare,
  compareSummary,
  compareProvenance,
  summarise,
};
