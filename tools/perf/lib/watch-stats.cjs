'use strict';

/**
 * THE STATISTICS AND THE OUTPUT FORMAT — SHARED BY BOTH WATCHERS.
 *
 * WHY THIS IS A SHARED MODULE AND NOT A COPY
 * -------------------------------------------
 * There are TWO watchers now: `watch-client.cjs` (Chromium, over CDP) and
 * `watch-client-bidi.cjs` (Firefox, over WebDriver BiDi). They answer
 * the same question about two different browsers, so the numbers they
 * print HAVE to mean the same thing — a p99 from one and a p99 from the
 * other are only comparable if they are the same statistic computed the
 * same way. A copy of these functions in two files is a copy that will
 * drift, and a drifting instrument is worse than no instrument.
 *
 * So this file holds the arithmetic ONCE, and both watchers import it.
 */

/**
 * THE MEDIAN OF A LIST OF NUMBERS.
 *
 * A failure path has to report, not crash: an empty list has no
 * median, and `median([]).toFixed()` is a TypeError in the middle of
 * a measurement.
 */
function median(values) {
  if (!values || !values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted[mid];
}

/**
 * A PERCENTILE OF AN ALREADY-SORTED LIST.
 *
 * Nearest-rank, the same way the sibling harnesses do it: the
 * smallest value at or above the requested fraction of the list.
 */
function percentile(sorted, q) {
  if (!sorted || !sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[idx];
}

/**
 * THE STATISTICS OF ONE SAMPLE WINDOW.
 *
 * The late fraction is RELATIVE — a frame is late when its gap is
 * more than 1.5x the median gap of the same window — because a
 * constant threshold would mean something different on a 60 Hz
 * panel than on a 144 Hz one.
 */
function windowStats(gaps) {
  if (!gaps.length) {
    return { n: 0, fps: 0, p50: 0, p95: 0, p99: 0, late: 0, max: 0, mean: 0 };
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const med = percentile(sorted, 0.5);
  const late = sorted.filter((v) => v > med * 1.5).length;
  return {
    n: gaps.length,
    fps: med > 0 ? 1000 / med : 0,
    p50: med,
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    late: late / gaps.length,
    max: sorted[sorted.length - 1],
    mean: gaps.reduce((a, b) => a + b, 0) / gaps.length,
  };
}

/**
 * ONE LINE PER SAMPLE, ALIGNED.
 *
 * The percentiles are computed from the FRAME INTERVALS of this
 * window, not from the engine's counter — the engine's counter says
 * how many frames it drew and nothing about how evenly they were
 * spaced, and the spacing is the whole question.
 */
function formatLine(t, st, measuredFps, pacing, lagMedian, longtaskCount, canvas) {
  const cell = (v, width, digits = 1) => (v === null || !Number.isFinite(v) ? '?'.padStart(width) : v.toFixed(digits).padStart(width));
  return [
    `${t.toFixed(1).padStart(6)}s`,
    // THE FRAME RATE, FROM THE rAF COUNT over this window — not the
    // engine's counter, and not 1000/median (which is the same
    // number the percentiles are built from).
    `fps ${cell(measuredFps, 6)}`,
    `p50 ${cell(st.p50, 6, 2)}`,
    `p95 ${cell(st.p95, 6, 2)}`,
    `p99 ${cell(st.p99, 6, 2)}`,
    `late ${cell(st.late * 100, 6)}%`,
    `engine ${cell(pacing ? pacing.engineWorkMs : null, 6, 2)}ms`,
    `brHz ${cell(pacing ? pacing.browserHz : null, 5)}`,
    `panel ${cell(pacing ? pacing.panelHz : null, 5)}`,
    `lag ${cell(lagMedian, 6, 2)}ms`,
    `lt ${String(longtaskCount).padStart(4)}`,
    // "fs" IS Y WHEN THE PAGE FILLS THE SCREEN, WHICHEVER WAY IT GOT
    // THERE — the DOM's fullscreen OR the browser's own (F11). See the
    // note where `fillsTheScreen` is computed.
    `fs ${canvas.fullscreen || canvas.fillsTheScreen ? 'Y' : 'N'}`,
    `canvas ${String(canvas.backingW).padStart(5)}x${String(canvas.backingH).padEnd(5)}`,
    `css ${String(canvas.cssW).padStart(5)}x${String(canvas.cssH).padEnd(5)}`,
  ].join('  ');
}

/**
 * THE SUMMARY OF A WHOLE RUN.
 *
 * The frame-interval HISTOGRAM is here because the repo's own
 * research says it is the clearest single signal of uneven pacing:
 * a smooth run has one fat bucket, and a juddering run has a comb.
 */
function summarise(run) {
  const gaps = run.allGaps.map((g) => g.gap);
  const sorted = [...gaps].sort((a, b) => a - b);
  const st = windowStats(gaps);
  const elapsed = run.elapsedMs > 0 ? run.elapsedMs : 1;

  const worst = [...run.allGaps].sort((a, b) => b.gap - a.gap).slice(0, 5);

  const buckets = new Map();
  for (const g of gaps) {
    const key = (Math.round(g * 10) / 10).toFixed(1);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  const topBuckets = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const lagValues = run.allLags.map((l) => l.lag).sort((a, b) => a - b);
  const inputValues = run.allInputs.map((i) => i.lat).sort((a, b) => a - b);
  const longtasks = run.longtasks;

  const durations = run.allDurations.map((d) => d.d).sort((a, b) => a - b);

  return {
    totalFrames: run.totalFrames,
    elapsedMs: run.elapsedMs,
    meanFps: (run.totalFrames * 1000) / elapsed,
    medianFps: st.fps,
    gaps: st.n,
    p50: st.p50,
    p90: percentile(sorted, 0.9),
    p95: st.p95,
    p99: st.p99,
    max: st.max,
    mean: st.mean,
    lateFraction: st.late,
    worstIntervals: worst,
    longtaskCount: longtasks.length,
    longtaskTotalMs: longtasks.reduce((a, l) => a + l.duration, 0),
    longtaskSupported: run.longtaskSupported,
    longtaskError: run.longtaskError,
    visible: run.lastCanvas ? run.lastCanvas.visible !== false : true,
    droppedIntervals: run.droppedIntervals,
    lagMedian: percentile(lagValues, 0.5),
    lagP95: percentile(lagValues, 0.95),
    lagMax: lagValues.length ? lagValues[lagValues.length - 1] : 0,
    inputMedian: percentile(inputValues, 0.5),
    inputMax: inputValues.length ? inputValues[inputValues.length - 1] : 0,
    inputCount: inputValues.length,
    engineCallbackMedian: percentile(durations, 0.5),
    engineCallbackP95: percentile(durations, 0.95),
    buckets: topBuckets,
    pacing: run.lastPacing,
  };
}

module.exports = { median, percentile, windowStats, formatLine, summarise };
