# Bookmarklet: diagnose the fullscreen frame-rate question on YOUR machine

The Playwright harnesses in this directory cannot reproduce the
fullscreen symptom on the test box (a headless Chromium on integrated
graphics): there, windowed and fullscreen measure identically. Your
machine is a desktop gaming rig with a real display, a real GPU and a
real window manager, and that is where the difference is.

So: run this yourself and read the numbers.

## Use

1. Open https://bulletballet.dev and get INTO A MATCH.
   (The numbers are meaningless on the landing page -- there is no
   frame loop running there.)
2. Open DevTools -> Console.
3. Paste the bookmarklet below and press Enter.
4. PLAY for at least 10 seconds -- the probe reports after 10s, and it
   measures the frame pacing during that time. Move the mouse: the
   input path only matters while the mouse is moving.
5. Compare the two states.

The result is printed to the console AND shown in a black overlay in
the top-left of the page, so you can read it without leaving the game.

## The bookmarklet

Paste this into the Console and press Enter:

javascript:(() => { const c = document.getElementById('canvas'); const gl = c && (c.getContext('webgl2') || c.getContext('webgl')); const ticks = []; let raf; const onRaf = (t) => { ticks.push(t); raf = requestAnimationFrame(onRaf); }; raf = requestAnimationFrame(onRaf); const lines = []; lines.push('=== BulletBallet client diagnostics ==='); lines.push(`fullscreen : ${document.fullscreenElement ? 'YES (' + document.fullscreenElement.tagName + ')' : 'no'}`); lines.push(`pointer locked : ${document.pointerLockElement ? 'yes' : 'no'}`); lines.push(`devicePixelRatio: ${window.devicePixelRatio}`); lines.push(`screen : ${window.screen.width}x${window.screen.height}`); lines.push(`viewport : ${window.innerWidth}x${window.innerHeight}`); if (c) { lines.push(`canvas backing : ${c.width}x${c.height} (what the engine rasterises)`); lines.push(`canvas css : ${c.clientWidth}x${c.clientHeight} (what the compositor scales to)`); const up = c.clientWidth / c.width; lines.push(`upscale factor : ${up.toFixed(2)}x ${up > 1.01 ? ' <-- the browser is SCALING every frame' : ' (1:1, no scaling)'}`); lines.push(`inline width : ${c.style.width || '(none)'}${c.style.getPropertyPriority('width') ? ' !' + c.style.getPropertyPriority('width') : ''}`); } if (gl) { lines.push(`drawing buffer : ${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`); } // The engine's own cvars, through the console bridge. const cvarNames = ['vid_width', 'vid_height', 'fps_max', 'gl_vsync', 'host_framerate']; const cvarOut = {}; const onOut = (e) => { const line = (e.detail && e.detail.line) || ''; for (const n of cvarNames) { if (cvarOut[n] !== undefined) continue; const m = line.match(new RegExp(''' + n + ''\\s+is\\s+'(-?[\\d.]+)'')); if (m) cvarOut[n] = parseFloat(m[1]); } }; window.addEventListener('xash:stdout', onOut); try { for (const n of cvarNames) window.__xash.Cmd_ExecuteString(n); } catch (err) {} // Report after a window, so there is something to report. setTimeout(() => { cancelAnimationFrame(raf); window.removeEventListener('xash:stdout', onOut); const d = ticks.slice(1).map((t, i) => t - ticks[i]).sort((a, b) => a - b); const q = (f) => (d.length ? d[Math.floor(d.length * f)] : 0); const elapsed = (ticks[ticks.length - 1] - ticks[0]) / 1000; const rate = elapsed > 0 ? (ticks.length - 1) / elapsed : 0; const slow = d.filter((x) => x > 20).length; lines.push(''); lines.push('--- frame pacing (measure AFTER ~10s of gameplay) ---'); lines.push(`rAF rate : ${rate.toFixed(1)}/s`); lines.push(`frame median : ${q(0.5).toFixed(1)} ms (${(1000 / q(0.5)).toFixed(0)} Hz equivalent)`); lines.push(`frame p90 : ${q(0.9).toFixed(1)} ms`); lines.push(`frame p99 : ${q(0.99).toFixed(1)} ms`); lines.push(`frame max : ${d.length ? d[d.length - 1].toFixed(1) : 0} ms`); lines.push(`slow frames : ${slow}/${d.length} = ${d.length ? ((slow / d.length) * 100).toFixed(1) : 0}% (>20ms, i.e. a missed vsync)`); lines.push(`display Hz : ${q(0.5) ? (1000 / q(0.5)).toFixed(1) : '?'} (from the frame median -- this is what the display is actually running at)`); lines.push(''); lines.push('--- engine cvars ---'); for (const n of cvarNames) { lines.push(` ${n.padEnd(16)}: ${cvarOut[n] !== undefined ? cvarOut[n] : '(not reported)'}`); } lines.push(''); lines.push('=== compare these numbers between WINDOWED and FULLSCREEN ==='); lines.push('=== and note: rAF rate vs frame median vs slow % ==='); const text = lines.join('\n'); console.log(text); // Also put it in a box the player can read without the console. try { const pre = document.createElement('pre'); pre.textContent = text; pre.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;right:0;max-height:100vh;overflow:auto;' + 'margin:0;padding:12px;background:#000;color:#0f0;font:12px/1.45 monospace;white-space:pre;'; pre.id = '__bbDiag'; document.body.appendChild(pre); } catch (e) {} }, 10000); })();

## Or drag it to the bookmarks bar

The one-line form is in `diagnose-fullscreen.bookmarklet.txt`, ready to
drag. (Browsers strip a `javascript:` URL when you paste it into the
address bar -- the Console accepts it, the address bar does not.)

## What to compare

| number | what it means |
|---|---|
| `browser ticks/s` vs `engine frames/s` | **THE KEY COMPARISON.** The browser's tick rate is what the display is asking for; the engine's rate is what it managed to deliver. If the engine renders fewer frames than the browser offers ticks, it is missing deadlines, and the browser skips ticks to catch up -- that is the judder, and the in-game counter cannot show it to you |
| `engine work/frame` | the engine's own per-frame cost. It can hold a refresh rate R only if this is under 1000/R. Measured at ~7-8 ms on the test box, which means 60 Hz is comfortable but 144 Hz is not |
| `verdict` | plain-language: does the engine's work fit the display's frame budget? If the count was unusable it says "CANNOT BE DETERMINED" rather than guessing |
| `rAF rate` | the average frame rate the browser is delivering |
| `frame median` | the TYPICAL frame time. If this is 16.7 ms but the rAF rate is ~50, the frames are IRREGULAR, not slow -- that is judder, and it is exactly what "plays like the 40s-50s but sometimes feels very smooth like 60s" means |
| `slow frames` | the fraction of frames longer than **1.5 frame periods** — i.e. dropped frames. The threshold scales with your display rather than being a constant, because a fixed 20 ms is right for 60 Hz but would MISS the dropped frames on a 165 Hz monitor (where one frame is 6.1 ms and a dropped frame is only 12.1 ms) |
| `frame buckets` | the most common frame intervals and how many there were. **One** dominant bucket means even pacing; several means uneven. This is the single clearest line in the output |
| `display Hz` | derived from the frame median: what the display is actually running at. On a 144 Hz gaming monitor this is the key number |
| `upscale factor` | the canvas CSS size divided by its backing store. Above 1.0 the browser is SCALING the engine's output every frame, and that cost lands on the compositor rather than the engine |
| `vid_width`/`vid_height` | the engine's own render resolution. If these are LARGER than the `AUTO_MAX_PIXELS` cap (1920x1080), the cap has been lost |
| `fps_max` | production ships 100. If your display runs faster than that, the engine cannot divide the refresh rate evenly and the frames land unevenly -- while the engine's own counter still reads fine |
| `engine vid` vs `canvas backing` | if these disagree, the engine and the compositor are out of step |

## The most likely thing to find

**The engine has no frame limiter in the browser.** `fps_max` is inert
with vsync on -- upstream, it is an alias for `host_maxfps`, a *host*
(server) limiter that is only consulted when `gl_vsync` is 0. So the
engine renders on every tick the browser offers.

The engine's per-frame work was measured at **~7-8 ms**, which is
comfortable at 60 Hz (16.7 ms budget) but **over budget at 144 Hz**
(6.9 ms), 165 Hz and 240 Hz. On a display faster than that, the engine
cannot finish in time, the browser drops ticks to catch up, and the
frames arrive unevenly.

So if `display Hz` comes back at 144/165/240, you should also see:

- `engine frames/s` **below** `browser ticks/s`, and
- `engine work/frame` **above** the frame budget, and
- **several** `frame buckets` rather than one.

That is the diagnosis. Send me those numbers and I can tell you
whether capping the tick rate the engine is offered is the right fix
for your machine.

**The counter cannot see it.** The engine's "Client FPS" counter
reports how many frames it *drew*, which is healthy. The gaps are
*between* those frames, so the counter has nothing to report.
