/**
 * A DIAGNOSTIC YOU CAN RUN ON YOUR OWN MACHINE.
 *
 * WHY THIS IS A BOOKMARKLET AND NOT A HARNESS
 * --------------------------------------------
 * The harness in this directory reproduces the frame-rate part of the
 * fullscreen question on a headless box, but it CANNOT reproduce Kyle's
 * symptom: on the test machine, fullscreen and windowed measure
 * identically (60 rAF/s in both, 0% slow frames in both). His machine
 * is a desktop gaming rig with a real display, a real GPU and a
 * real browser window manager, and that is where the difference is.
 *
 * So the useful thing is a probe he can run HIMSELF, in his own
 * browser, on his own machine, and read the numbers off.
 *
 * WHAT IT PRINTS
 * --------------
 *   - the display's reported refresh rate (`screen` + rAF cadence)
 *   - the browser's rAF rate and the FULL frame-interval distribution
 *     (median, p90, p99, max, and the fraction of frames that missed
 *     a vsync) -- the distribution is what matters, not the average
 *   - the engine's canvas BACKING STORE vs its CSS size vs the
 *     viewport: the ratio is the compositor's upscale factor
 *   - the engine's own `vid_width`/`vid_height`/`fps_max`/`gl_vsync`
 *   - whether the page is in fullscreen, and whether the pointer is
 *     locked
 *
 * HOW TO USE IT
 * -------------
 * 1. Open the game, get INTO a match (the numbers are meaningless on
 *    the landing page).
 * 2. Open DevTools -> Console.
 * 3. Paste the bookmarklet below and press Enter.
 * 4. Do the thing you want to measure (move the mouse! the input path
 *    only matters while the mouse is moving).
 * 5. Compare windowed vs fullscreen.
 *
 * The bookmarklet is at the bottom of this file, and it is also
 * written to `tools/perf/diagnose-fullscreen.bookmarklet.txt` so it
 * can be dragged to the bookmarks bar.
 *
 * WHAT TO LOOK FOR
 * ----------------
 *   - `rAF` vs `frame median`: if the median is 16.7 ms but the
 *     average is ~50, the frames are IRREGULAR, not slow. That is
 *     judder, and it is what "plays like the 40s-50s but sometimes
 *     feels like 60s" means.
 *   - `slow %`: the fraction of frames longer than 20 ms. Above a few
 *     percent, the frame pacing is uneven.
 *   - `upscale`: the ratio of the canvas CSS size to its backing
 *     store. Above 1 the browser is scaling the engine's output every
 *     frame, and the scaling cost lands on the compositor, not the
 *     engine.
 *   - `display Hz` vs `rAF`: if the display is 144 Hz and the engine
 *     is at `fps_max 100`, the engine cannot divide the refresh rate
 *     evenly and the frames land unevenly -- while the engine's own
 *     counter still reads fine.
 */
(() => {
  const c = document.getElementById('canvas');
  const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));

  const ticks = [];
  let raf;
  const onRaf = (t) => {
    ticks.push(t);
    raf = requestAnimationFrame(onRaf);
  };
  raf = requestAnimationFrame(onRaf);

  // COUNT THE ENGINE'S RENDERED FRAMES.
  //
  // The engine clears the framebuffer once per frame it renders, so
  // counting `clear` calls counts its frames. The PROTOTYPE is patched
  // (not getContext) because the engine already holds its context by
  // the time this runs -- a getContext wrapper would be too late.
  let engineFrames = 0;
  try {
    for (const proto of [
      window.WebGL2RenderingContext,
      window.WebGLRenderingContext,
    ]) {
      if (!proto || !proto.prototype) continue;
      const orig = proto.prototype.clear;
      if (!orig || orig.__counted) continue;
      const wrapped = function (...a) {
        engineFrames++;
        return orig.apply(this, a);
      };
      wrapped.__counted = true;
      proto.prototype.clear = wrapped;
    }
  } catch (e) {}

  const lines = [];
  lines.push('=== BulletBallet client diagnostics ===');
  lines.push(`fullscreen      : ${document.fullscreenElement ? 'YES (' + document.fullscreenElement.tagName + ')' : 'no'}`);
  lines.push(`pointer locked : ${document.pointerLockElement ? 'yes' : 'no'}`);
  lines.push(`devicePixelRatio: ${window.devicePixelRatio}`);
  lines.push(`screen         : ${window.screen.width}x${window.screen.height}`);
  lines.push(`viewport       : ${window.innerWidth}x${window.innerHeight}`);

  if (c) {
    lines.push(`canvas backing : ${c.width}x${c.height}   (what the engine rasterises)`);
    lines.push(`canvas css     : ${c.clientWidth}x${c.clientHeight}   (what the compositor scales to)`);
    const up = c.clientWidth / c.width;
    lines.push(`upscale factor : ${up.toFixed(2)}x  ${up > 1.01 ? '  <-- the browser is SCALING every frame' : '  (1:1, no scaling)'}`);
    lines.push(`inline width   : ${c.style.width || '(none)'}${c.style.getPropertyPriority('width') ? ' !' + c.style.getPropertyPriority('width') : ''}`);
  }
  if (gl) {
    lines.push(`drawing buffer : ${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`);
  }

  // The engine's own cvars, through the console bridge.
  const cvarNames = ['vid_width', 'vid_height', 'fps_max', 'gl_vsync', 'host_framerate'];
  const cvarOut = {};
  const onOut = (e) => {
    const line = (e.detail && e.detail.line) || '';
    for (const n of cvarNames) {
      if (cvarOut[n] !== undefined) continue;
      const m = line.match(new RegExp('"' + n + '"\\s+is\\s+"(-?[\\d.]+)"'));
      if (m) cvarOut[n] = parseFloat(m[1]);
    }
  };
  window.addEventListener('xash:stdout', onOut);
  // Ask REPEATEDLY, not once: the engine's command system is not up
  // until it has run its first frame, and a human may paste this
  // before that happens. One ask means a late-booting engine reports
  // nothing at all.
  const askCvars = () => {
    try {
      for (const n of cvarNames) {
        if (cvarOut[n] === undefined) window.__xash.Cmd_ExecuteString(n);
      }
    } catch (err) {}
  };
  askCvars();
  const cvarTimer = setInterval(askCvars, 1000);

  // Report after a window, so there is something to report.
  setTimeout(() => {
    cancelAnimationFrame(raf);
    clearInterval(cvarTimer);
    window.removeEventListener('xash:stdout', onOut);

    const d = ticks.slice(1).map((t, i) => t - ticks[i]).sort((a, b) => a - b);
    const q = (f) => (d.length ? d[Math.floor(d.length * f)] : 0);
    const elapsed = (ticks[ticks.length - 1] - ticks[0]) / 1000;
    const rate = elapsed > 0 ? (ticks.length - 1) / elapsed : 0;
    // The threshold must scale with the DISPLAY, not be a constant.
    //
    // A fixed 20ms is right for 60Hz (one missed vsync = 33ms) but
    // WRONG for a 165Hz gaming monitor, where one frame is 6.1ms and a
    // DROPPED frame is only 12.1ms -- under a 20ms threshold, so evenly
    // spaced frames with gaps would report ZERO slow frames while the
    // pacing is visibly uneven. That is precisely the case this
    // diagnostic exists to detect.
    //
    // So: a frame is "slow" if it took more than 1.5 frame periods.
    const period = q(0.5);
    const slowThreshold = period * 1.5;
    const slow = d.filter((x) => x > slowThreshold).length;

    lines.push('');
    lines.push('--- frame pacing (measure AFTER ~10s of gameplay) ---');
    lines.push(`rAF rate       : ${rate.toFixed(1)}/s`);
    lines.push(`frame median   : ${q(0.5).toFixed(1)} ms   (${(1000 / q(0.5)).toFixed(0)} Hz equivalent)`);
    lines.push(`frame p90      : ${q(0.9).toFixed(1)} ms`);
    lines.push(`frame p99      : ${q(0.99).toFixed(1)} ms`);
    lines.push(`frame max      : ${d.length ? d[d.length - 1].toFixed(1) : 0} ms`);
    lines.push(`slow frames    : ${slow}/${d.length} = ${d.length ? ((slow / d.length) * 100).toFixed(1) : 0}%  (>${slowThreshold.toFixed(1)}ms = 1.5 frame periods, i.e. a dropped frame)`);
    // The distinct intervals, so an uneven cadence is visible directly.
    const buckets = {};
    for (const x of d) {
      const k = (Math.round(x * 10) / 10).toFixed(1);
      buckets[k] = (buckets[k] || 0) + 1;
    }
    const distinct = Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, n]) => `${k}ms x${n}`)
      .join('  ');
    lines.push(`frame buckets  : ${distinct}`);
    lines.push(`               (ONE dominant bucket = even pacing. Several = UNEVEN.)`);
    lines.push(`display Hz     : ${q(0.5) ? (1000 / q(0.5)).toFixed(1) : '?'}  (from the frame median -- this is what the display is actually running at)`);
    // THE KEY COMPARISON.
    //
    // The browser's rAF rate is what the display is asking for. The
    // engine's rendered rate is what it managed to deliver. If the
    // engine is rendering FEWER frames than the browser offers ticks,
    // it is missing deadlines -- and the browser skips ticks to catch
    // up, which is judder.
    const engineFps = elapsed > 0 ? engineFrames / elapsed : 0;
    const budget = period > 0 ? period : 0;
    const perFrameWork = engineFps > 0 ? 1000 / engineFps : 0;

    lines.push('');
    lines.push('--- THE KEY COMPARISON: browser ticks vs engine frames ---');
    lines.push(`browser ticks/s   : ${rate.toFixed(1)}   (what the display asks for)`);
    lines.push(
      `engine frames/s   : ` +
        (engineFps > 0
          ? `${engineFps.toFixed(1)}   (what the engine delivered)`
          : `NOT MEASURED (${engineFrames} clears counted)`),
    );
    lines.push(
      `frame budget      : ${budget.toFixed(2)} ms   (one tick at this display rate)`,
    );

    // NEVER render a verdict from a measurement that did not happen.
    //
    // An earlier version of this diagnostic printed "engine work
    // (0.00 ms) FITS the budget -- it can hold this refresh rate" when
    // the engine frame count came out ZERO. That is a failed
    // measurement presented as a PASS, and it says the exact opposite
    // of the truth. If the count is unusable, say so and stop.
    if (engineFps <= 0) {
      lines.push(
        `verdict           : CANNOT BE DETERMINED -- the engine frame counter`,
      );
      lines.push(
        `                   caught ${engineFrames} clears. This usually means`,
      );
      lines.push(
        `                   the game is not actually rendering right now (menu?`,
      );
      lines.push(
        `                   tab throttled? software rendering?). Get INTO a`,
      );
      lines.push(
        `                   match and re-run. The OTHER numbers above are`,
      );
      lines.push(`                   still valid.`);
    } else {
      lines.push(
        `engine work/frame : ${perFrameWork.toFixed(2)} ms   (its own cost)`,
      );
      if (budget > 0) {
        const fits = perFrameWork < budget;
        lines.push(
          `verdict           : ` +
            (fits
              ? `engine work (${perFrameWork.toFixed(2)} ms) FITS the budget (${budget.toFixed(2)} ms) -- it can hold this refresh rate`
              : `engine work (${perFrameWork.toFixed(2)} ms) EXCEEDS the budget (${budget.toFixed(2)} ms) -- it CANNOT hold this refresh rate, and the browser will drop ticks`),
        );
        lines.push(
          `                   it uses ${((perFrameWork / budget) * 100).toFixed(0)}% of the frame budget`,
        );
      }
      if (rate > 0 && engineFps < rate * 0.95) {
        lines.push('');
        lines.push(
          '  *** THE ENGINE IS MISSING DEADLINES. It renders fewer frames',
        );
        lines.push(
          '  *** than the browser offers ticks, so the browser skips ticks to',
        );
        lines.push(
          '  *** catch up. The frames arrive UNEVENLY. This is the judder.',
        );
        lines.push(
          '  *** The in-game FPS counter cannot show this to you: it counts',
        );
        lines.push('  *** the frames the engine drew, not the ones you saw.');
      }
    }

    lines.push('');
    lines.push('--- engine cvars ---');
    for (const n of cvarNames) {
      lines.push(`  ${n.padEnd(16)}: ${cvarOut[n] !== undefined ? cvarOut[n] : '(not reported)'}`);
    }
    lines.push('');
    lines.push('=== compare these numbers between WINDOWED and FULLSCREEN ===');
    lines.push('=== and note: rAF rate vs frame median vs slow % ===');

    const text = lines.join('\n');
    console.log(text);
    // Also put it in a box the player can read without the console.
    try {
      const pre = document.createElement('pre');
      pre.textContent = text;
      pre.style.cssText =
        'position:fixed;z-index:2147483647;top:0;left:0;right:0;max-height:100vh;overflow:auto;' +
        'margin:0;padding:12px;background:#000;color:#0f0;font:12px/1.45 monospace;white-space:pre;';
      pre.id = '__bbDiag';
      document.body.appendChild(pre);
    } catch (e) {}
  }, 10000);
})();
