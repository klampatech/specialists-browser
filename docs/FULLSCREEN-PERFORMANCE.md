# The fullscreen question

**Kyle's report, verbatim (2026-10-28):**

> "If i maximize the browser window, but don't put it in 'full screen' mode, the
> FPS is noticeably better (plays like 60+ fps). But as soon as i go full screen
> (such as launching the game with the full screen option checked on the web ui)
> i get perceived FPS drops (plays like it's in the 40s-50s and sometimes feels
> very smooth like 60s). I've watch the in game FPS counter and it doesn't
> quite seem to match with the performance i'm feeling."

This document is the investigation of that report. It is separate from
`docs/CLIENT-PERF-RESEARCH.md` because the answer turned out to be a
different question from the one that report asks.

---

## 1. The short answer

**The symptom was not reproduced on the test machine, and the reason it
could not be reproduced is the most useful thing in this document.**

On the test box — headless Chromium, an AMD Radeon (RADV RENOIR) GPU, a
60 Hz virtual display — fullscreen and windowed measure **identically**:

| state | rAF/s | frame median | slow frames | event-loop lag |
|---|---|---|---|---|
| windowed | 60.1 | 16.7 ms | 0.0 % | 1.2 ms |
| fullscreen | 49.9 * | 16.7 ms | 18.1 % | 20.6 ms |

\* the 49.9 reading is an artefact of the harness — it clicked into the
game to dismiss the menu before measuring, so the game was actually
*playing* rather than sitting in the menu. See §5.

With the menu dismissed and the geometry controlled, the measurement is
flat: **60 rAF/s in every state**, with the frame *median* at 16.7 ms
throughout.

That is not a null result. It says the cause is **specific to the
machine the symptom appears on**, and the test box does not have the
thing that causes it. Kyle's machine is described as a "desktop gaming
rig" — which almost certainly means a **high-refresh-rate display**
(144 Hz, 165 Hz, 240 Hz), which the test box does not have.

**What was built, and what it does:**

- The engine has **no frame limiter** in the browser — `fps_max` is inert
  (§3.4). It renders on every tick the browser offers.
- Its per-frame work is **~7–8 ms**, which fits a 60 Hz budget (16.7 ms)
  and does **not** fit a 144 Hz one (6.9 ms). So on a fast display it
  misses deadlines, the browser drops ticks to catch up, and the frames
  arrive **unevenly** — judder (§3.3).
- The fix is to **cap the tick rate the engine is offered**, so it is only
  ever asked for frames it can finish (§3.5). It is measured at runtime,
  it engages only where the engine would otherwise miss deadlines, and
  it picks a rate that divides the display's rate evenly.
- `desynchronized: true` was implemented and **measured**: it is
  **neutral** for frame rate, so it is off by default (§3.5).

**Two earlier claims in this document were wrong and are corrected in
place:** the resize watchdog **does** exist and works (§3.1), and
`fps_max` **is** inert (§3.4).

---

## 2. What was ruled out

Each of these was tested directly, not assumed.

### 2.1 It is not the render resolution

The obvious hypothesis: going fullscreen makes the engine render more
pixels. **It does not.**

The app's resolution policy caps the engine at `AUTO_MAX_PIXELS =
1920 * 1080` (`webxash/src/services/video-settings.ts:124`). Measured
with the engine's own `vid_width`/`vid_height` cvars and its canvas
backing store:

| state | viewport | engine `vid_width`×`vid_height` | canvas backing store | rAF/s |
|---|---|---|---|---|
| at boot | 1280×800 | 1280×800 | 1280×800 | 60.0 |
| after resize to 2560×1440 | 2560×1440 | **1280×800** | **1280×800** | 51.3 |
| after resize back | 1280×800 | 1280×800 | 1280×800 | 59.4 |
| after fullscreen | 1280×800 | 1280×800 | 1280×800 | 59.7 |

The engine's render resolution **does not change** between windowed and
fullscreen. The cap holds in every state.

### 2.2 It is not the compositor's upscale — at this refresh rate

The canvas is CSS-sized `100vw × 100vh` (`webxash/src/assets/main.css:22-27`)
while the engine rasterises into a smaller backing store, so the browser
*does* scale the engine's output every frame. Measured at 3840×2160:

| state | viewport | engine backing | upscale | rAF/s | slow frames |
|---|---|---|---|---|---|
| window | 1280×800 | 1920×1080 | 0.67× | 60.1 | 0.0 % |
| fullscreen, capped | 3840×2160 | 1920×1080 | 2× | 60.0 | 0.0 % |
| fullscreen, native | 3840×2160 | 3840×2160 | 1× | 59.2 | 1.0 % |
| fullscreen, capped again | 3840×2160 | 1920×1080 | 2× | 59.9 | 0.2 % |

A 2× upscale of a 1080p canvas to 4K costs **nothing** measurable on
this hardware. So on a gaming rig with a discrete GPU, the upscale is
not the cost either.

### 2.3 It is not an input-event flood

With the pointer locked, Chrome delivers raw mouse deltas. If fullscreen
delivered vastly more of them, the main thread would be busy with input
handling while the engine's frame timer stayed healthy — which is
exactly the shape of "the counter doesn't match the feel".

It does not happen. Measured with the mouse moving continuously:

| state | mouse events/s | rAF/s | slow frames | event-loop lag |
|---|---|---|---|---|
| windowed | 158 | 57.9 | 3.7 % | 16.1 ms |
| fullscreen | 154 | 57.7 | 4.0 % | 18.8 ms |

Identical. No flood.

### 2.4 It is not a bigger window costing frames

A maximised window and fullscreen differ in how much canvas the
compositor has to scale, so the resize was measured directly, with three
readings after the resize to see whether any cost SETTLES:

| state | viewport | engine backing | upscale | rAF/s | slow frames |
|---|---|---|---|---|---|
| A. small window | 1280×800 | 1280×800 | 1× | 59.8 | 0.3 % |
| B1. +4 s after resize | 2560×1440 | 1280×800 | 2× | **56.4** | **2.0 %** (p99 233 ms) |
| B2. +16 s after resize | 2560×1440 | 1280×800 | 2× | 60.0 | 0.0 % |
| B3. +28 s after resize | 2560×1440 | 1280×800 | 2× | 60.0 | 0.0 % |
| C. native engine | 2560×1440 | 2560×1440 | 1× | 59.6 | 0.5 % |
| D. small engine again | 2560×1440 | 1280×800 | 2× | 59.8 | 0.0 % |

There IS a cost immediately after a resize — B1 is measurably worse, with
a 233 ms tail — and it **fully settles by 16 seconds**. A transient
during a resize, not a standing cost.

Note the earlier run of this same harness had **no** transient at all
(B1 read 60.0/s). So it is a transient that is not always present, which
is consistent with it being the compositor reconfiguring rather than
anything about the geometry.

### 2.5 It is not the engine dropping frames

The engine's `fps_max` is 100 — above 60. If the browser offered more
ticks than the engine drew, the engine would be skipping frames
irregularly, and its own counter would report the healthy number it
drew while the display showed the gaps.

It does not happen. Counting the engine's own `gl.clear` calls — one
per rendered frame — against the browser's rAF rate in the same window:

| state | browser rAF/s | engine frames rendered/s | skipped |
|---|---|---|---|
| `fps_max 100` (shipped) | 54.3 | 54.6 | −1 % |
| `fps_max 60` | 53.7 | 54.0 | −1 % |
| `fps_max 30` | 49.3 | 49.6 | −1 % |

The engine renders **1:1 with the browser's rAF rate**. It never skips.
And `fps_max` does not limit it at all — the browser is the only limit.

---

## 3. What was found

### 3.1 CORRECTED — the resize watchdog DOES exist, and it works

**An earlier version of this document claimed the resolution cap was
never re-applied after a resize, and that the comment at
`xash-loader.ts:1273-1277` described a mechanism that did not exist.
Both claims were wrong.** The watchdog is real:

```ts
// webxash/src/services/fullscreen.ts:164-195
export function installFullscreenWatchdog(): () => void {
  ...
  const check = () => {
    timer = null;
    recoverLostContext();
    // The render resolution is a consequence of the resize, so it is
    // repaired here too.
    applyRenderResolution((cmd) => XashLoader.exec(cmd), logDebug);
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(check, 400);
  };
  window.addEventListener('resize', schedule);
  document.addEventListener('fullscreenchange', schedule);
  ...
}
```

It is installed at import time (`main.ts:35`), it listens for both
`resize` and `fullscreenchange`, it is debounced by 400 ms, and it
calls `applyRenderResolution`.

**And the app's own measurement already proved it works.** The
cap-survival run recorded the engine's `vid_width`/`vid_height` and the
canvas backing store across a resize:

| state | viewport | engine `vid_width`×`vid_height` | canvas backing | rAF/s |
|---|---|---|---|---|
| at boot | 1280×800 | 1280×800 | 1280×800 | 60.0 |
| after resize to 2560×1440 | 2560×1440 | **1280×800** | **1280×800** | 51.3 |
| after resize back | 1280×800 | 1280×800 | 1280×800 | 59.4 |

The engine's resolution **stayed at 1280×800** through a resize to
2560×1440. That IS the watchdog re-applying the cap. I had read the
same table as evidence that the cap was *lost* — the opposite reading.

So there is **no fix needed here**, and the recommendation to add a
resize watchdog is struck. The lesson is recorded in the skill: a
comment that describes a mechanism is not evidence that the mechanism
is absent, and the app's own measurements are the better witness.

### 3.2 The in-game counter cannot see the thing that matters

The engine's FPS counter is drawn by the engine, from the engine's own
frame timing. The format string is in the engine WASM:

```
"Client FPS: ^1%i min, ^3%3i cur, ^2%2i max"
```

It reports **how many frames the engine drew**. It cannot see:

- frames the browser failed to present,
- uneven spacing between the frames it did draw,
- anything the compositor did while scaling.

So "the FPS counter doesn't match what I'm feeling" is not a bug in the
counter. It is the counter answering a different question — and on a
machine where the browser is presenting fewer of the engine's frames, or
presenting them unevenly, the two answers diverge **by construction**.

### 3.3 The measured mechanism: the engine has no frame limiter, and a
### high-refresh display asks for more than it can deliver

The test box runs a 60 Hz virtual display. A gaming rig does not.

The decisive question is therefore: **how much work does one engine
frame cost, and can it fit inside a high-refresh display's frame
interval?**

Measured by running the browser with the frame-rate limit disabled, so
the engine runs at its natural maximum rate. That maximum is the
inverse of its per-frame work:

| run | engine's max rate | per-frame work |
|---|---|---|
| uncapped, run 1 | 121.7 fps | **8.22 ms** |
| uncapped, run 2 (best of 4 windows) | 145.6 fps | 6.87 ms |
| uncapped, run 3 (best of 3 baselines) | 127.6 fps | 7.84 ms |
| uncapped, run 4 (best of 4 windows) | 124.0 fps | 8.06 ms |

**~7–8 ms per frame.** That is the number that decides everything:

| display | frame budget | can the engine hold it? |
|---|---|---|
| 60 Hz | 16.67 ms | YES — uses ~50 % of the budget |
| 75 Hz | 13.33 ms | YES |
| 90 Hz | 11.11 ms | YES |
| 120 Hz | 8.33 ms | marginal (99 % of budget) |
| **144 Hz** | **6.94 ms** | **NO — needs ~8 ms, has 6.9 ms** |
| **165 Hz** | **6.06 ms** | **NO** |
| **240 Hz** | **4.17 ms** | **NO** |

And here is the part that makes it bite: **the engine has no limiter of
its own.** It renders on *every* tick the browser hands it. So on a
144 Hz display it is asked for a frame every 6.94 ms, spends 8 ms
producing it, and **cannot finish in time**. The browser then skips
ticks to catch up, and the frames that do arrive are **unevenly
spaced**.

That produces exactly the reported symptom:

- the engine's counter reads a healthy number (it drew its frames),
- the frames arrive **unevenly**, which the eye reads as "40s-50s and
  sometimes feels very smooth like 60s",
- and the counter cannot report the unevenness, because the unevenness
  is *between* the frames it counted.

This also explains the **maximised-vs-fullscreen** difference. A
maximised window is not necessarily presenting at the panel's full
refresh rate the way a true fullscreen surface is; when the page does
go fullscreen, the browser starts driving the engine at the display's
native rate — and if that rate is above what the engine can sustain,
the engine misses deadlines. The windowed case was simply never
demanding as much of it.

**The remaining unknown is whether Kyle's display is actually
high-refresh.** That is one line in the diagnostic in §6, and it is the
one number that turns this from a mechanism into a diagnosis.

### 3.4 `fps_max` is INERT — the earlier recommendation was a placebo

This is a correction to an earlier conclusion, and it matters.

The engine's `fps_max` was recommended for change on the theory that
100 does not divide into 144 and therefore makes the engine skip
refresh ticks irregularly. **That theory was wrong**, because
`fps_max` is never even consulted.

Measured, sweeping the cvar and counting the engine's own rendered
frames (`gl.clear` calls) against the browser's rAF rate in the same
window:

| cvar | browser rAF/s | engine frames/s | engine/browser |
|---|---|---|---|
| `fps_max 100` (shipped) | 60.0 | 60.0 | 100 % |
| `fps_max 30` | 60.0 | 60.0 | 100 % |
| `fps_max 15` | 60.0 | 60.1 | 100 % |
| `fps_max 5` | 60.1 | 60.1 | 100 % |
| `fps_override 30` | 57.9 | 58.1 | 100 % |
| `fps_override 5` | 59.6 | 59.8 | 100 % |
| `cl_maxframetime 30` | 54.2 | 54.4 | 100 % |
| `cl_maxframetime 5` | 53.4 | 53.6 | 100 % |

**At `fps_max 5` the engine still rendered 60 fps.** The cvar does
nothing.

The upstream source says why. In `engine/common/host.c`:

```c
CVAR_DEFINE( host_maxfps, "fps_max", "72", FCVAR_ARCHIVE|FCVAR_FILTERABLE, "host fps upper limit" );
```

`fps_max` is an alias for `host_maxfps` — a **host** (server) frame
limiter. And in `Host_CalcFPS`:

```c
else
{
    const double max_fps = fps_override.value ? MAX_FPS_HARD : MAX_FPS_SOFT;

    if( gl_vsync.value )
        fps = max_fps;                 // <-- fps_max NOT consulted
    else
    {
        fps = host_maxfps.value;       // <-- only when vsync is OFF
        if( fps == 0.0 )
            fps = max_fps;
        fps = bound( MIN_FPS, fps, max_fps );
    }
}
```

**`fps_max` is only read when `gl_vsync` is 0.** With vsync on
(production's default, and confirmed `gl_vsync: 1` in the live client)
the engine's target is `MAX_FPS_SOFT` = 200 fps, and the effective
target frame time is 1/200 = 5 ms — shorter than any real refresh
interval. So the engine renders every tick, exactly as measured.

`MIN_FPS` is 20, `MAX_FPS_SOFT` is 200 and `MAX_FPS_HARD` is 1000.

This is a genuinely useful negative result, and it rules out the entire
family of "tune `fps_max`" fixes — including the `fps_max 0` that was
recommended earlier in this document.

**The consequence is that the engine has no frame limiter at all in the
browser**, which is precisely what makes §3.3 bite on a high-refresh
display. The fix is *not* a cvar; it is either reducing the engine's
per-frame work, or capping the tick rate the engine is offered.


### 3.5 The fixes, as built and measured

Both fixes are in `webxash/src/services/`:

| file | what it does |
|---|---|
| `frame-pacing.ts` | the POLICY — pure functions, no imports, unit-tested from the parent's suite |
| `frame-pacing-apply.ts` | the ENFORCEMENT — the rAF shim that measures and gates |
| `webgl-context.ts` | pre-creates the engine's WebGL context so `desynchronized` can be set |

#### The frame cap

The engine's loop is driven by Emscripten's `requestAnimationFrame`, and
`MainLoop` is not reachable from the page — but the global
`requestAnimationFrame` **is** the engine's tick source. Verified against
production: with every second callback forwarded, the engine's rendered
frame rate fell from 60.3/s to 0.3/s.

**The gate COALESCES rather than DROPS.** That 0.3/s is the lesson: the
engine's loop is self-rescheduling (`MainLoop.runner` asks for the next
frame from inside the frame it just ran), so dropping a callback kills the
loop rather than skipping a frame. A skipped tick HOLDS the engine's
callback and runs it on the next one.

**The cap is measured, not assumed.** The shim times the engine's own
callback — which *is* its frame — and reads the display's refresh rate from
the tick intervals. On a display the engine can already sustain, nothing is
gated at all.

**The chosen rate divides the display's rate evenly**, which is the
evenness guarantee: on a 144 Hz display, a 60 fps cap holds each frame for
2.4 refreshes (an uneven 2/3 pattern — judder in a different place), while
a 48 fps cap holds each for exactly 3.

Measured on the test box, A/B/A/B against a real match:

| configuration | `desynchronized` | engine fps | median | p99 | buckets | evenness |
|---|---|---|---|---|---|---|
| base | false | 60.0 | 16.7 ms | 18.0 ms | 36 | 10 % |
| desync | **true** | 60.0 | 16.7 ms | 17.9 ms | 36 | 13 % |
| both (cap forced to 1-in-2) | **true** | **30.0** | **33.3 ms** | 38.2 ms | 36 | 9 % |
| base again | false | 60.0 | 16.7 ms | 17.8 ms | 35 | 9 % |
| desync again | **true** | 60.0 | 16.7 ms | 17.7 ms | 27 | **13 %** |

The cap does exactly what it is supposed to: the engine runs on **exactly
one tick in two**, at **exactly 30.0 fps**, with a **33.3 ms median** — the
display's own 30 Hz grid. That is the even pacing the fix is for, and it is
on the display's grid rather than drifting off it (which is what
`gl_vsync 0` + `fps_max` does: 19.5 ms median on a 60 Hz display).

`desynchronized` is **neutral** on this hardware: the same 60.0 fps, the
same 16.7 ms median, and the p99 slightly *better* (17.7–17.9 ms against
17.8–18.0 ms). It is not a frame-rate fix. It is worth keeping as a
**latency** option — that is what `desynchronized` is for — but it is not
what fixes the judder, and it is off by default.

#### `desynchronized`: how it is actually set

`Module.webGLContextAttributes` does **not** reach the engine's context:
the generated glue never reads it, and the engine's renderer creates the
context through `_emscripten_webgl_create_context` with attributes from
the WASM side.

A canvas keeps the context its **first** `getContext` created, so the
launcher pre-creates it. That only works if the launcher is first — and it
was not, twice over:

1. The pre-creation was in `startWithFiles`, which the **ZIP boot path**
   never calls. The real boot path is the ZIP path.
2. Even in `initXash`, the app's OWN resize watchdog had already created
   the context: `fullscreen.ts`'s `engineContext()` calls
   `canvas.getContext('webgl2')` to check for a lost context, and it fires
   on a resize while the **landing page** is up — before the engine has
   booted.

Both are fixed: the pre-creation is in `initXash` (which both paths call),
and the watchdog's context lookup now returns null until the engine is
armed, because a lost context can only happen after the engine has created
one.

Verified: with `?desync=1`, the launcher's `getContext` is the **only**
call on the canvas, and the live context reports `desynchronized: true`.

### 3.6 A lever sweep that was inconclusive, and why

Having established that the engine's per-frame work is the constraint
(§3.3), the obvious next step was to sweep the knobs that cost fill
rate and see which ones buy headroom:

`hud_scale` (the HUD is drawn at 2.5x by default), `r_drawviewmodel`,
`r_lockpvs`, `r_novis`, `cl_weather`.

**The sweep was inconclusive and no lever is recommended.** The run
drifted badly:

| configuration | best rate | per-frame work | windows |
|---|---|---|---|
| baseline (shipped) | 124.0 fps | 8.06 ms | 124, 122, 115, 104 |
| `hud_scale 1.0` | 98.4 fps | 10.16 ms | 98, 74, 68, 69 |
| baseline (restored) | 127.6 fps | 7.84 ms | 100, 128, 119, 113 |
| `hud_scale 1.0` (again) | 108.4 fps | 9.23 ms | 99, 108, 101, 88 |
| `r_drawviewmodel 0` | 81.6 fps | 12.25 ms | 79, 81, 82, 80 |
| baseline (end) | 81.6 fps | 12.25 ms | 70, 66, 71, 82 |

The baseline itself ranged from 7.84 ms to 12.25 ms across the run —
a **53 % drift**, and `hud_scale 1.0` measured *slower* than baseline
in both of its appearances while the baseline got slower over the same
run. The effect being looked for is smaller than the noise.

Two lessons, both now in the skill:

- **Compare against the nearest baseline, not the best one.** Drift is
  common to both, so a paired comparison cancels it.
- **A lever must win in EVERY appearance to be real.** `hud_scale 1.0`
  won 0/2.

The fix for the sweep would be to hold the scene constant (a fixed
viewpoint in a fixed spot, no other players) and to interleave more
tightly. That was not done here, so the honest result is
**inconclusive** — not "no lever helps".

---|
| `fps_max 100` (shipped) | 60.0 | 60.0 | 100 % |
| `fps_max 30` | 60.0 | 60.0 | 100 % |
| `fps_max 15` | 60.0 | 60.1 | 100 % |
| `fps_max 5` | 60.1 | 60.1 | 100 % |
| `fps_override 30` | 57.9 | 58.1 | 100 % |
| `fps_override 5` | 59.6 | 59.8 | 100 % |
| `cl_maxframetime 30` | 54.2 | 54.4 | 100 % |
| `cl_maxframetime 5` | 53.4 | 53.6 | 100 % |

**At `fps_max 5` the engine still rendered 60 fps.** The cvar does
nothing.

The upstream source says why. In `engine/common/host.c`:

```c
CVAR_DEFINE( host_maxfps, "fps_max", "72", FCVAR_ARCHIVE|FCVAR_FILTERABLE, "host fps upper limit" );
```

`fps_max` is an alias for `host_maxfps` — a **host** (server) frame
limiter. And in `Host_CalcFPS`:

```c
else
{
    const double max_fps = fps_override.value ? MAX_FPS_HARD : MAX_FPS_SOFT;

    if( gl_vsync.value )
        fps = max_fps;                 // <-- fps_max NOT consulted
    else
    {
        fps = host_maxfps.value;       // <-- only when vsync is OFF
        if( fps == 0.0 )
            fps = max_fps;
        fps = bound( MIN_FPS, fps, max_fps );
    }
}
```

**`fps_max` is only read when `gl_vsync` is 0.** With vsync on
(production's default, and confirmed `gl_vsync: 1` in the live client)
the engine's target is `MAX_FPS_SOFT` = 200 fps, and the effective
target frame time is 1/200 = 5 ms — shorter than any real refresh
interval. So the engine renders every tick, exactly as measured.

`MIN_FPS` is 20, `MAX_FPS_SOFT` is 200 and `MAX_FPS_HARD` is 1000.

This is a genuinely useful negative result, and it rules out the entire
family of "tune `fps_max`" fixes — including the `fps_max 0` that was
recommended earlier in this document.

**The consequence is that the engine has no frame limiter at all in the
browser**, which is precisely what makes §3.3 bite on a high-refresh
display. The fix is *not* a cvar; it is either reducing the engine's
per-frame work, or capping the tick rate the engine is offered.


## 4. What was done

**a. ~~Set `fps_max` to the display's refresh rate, or to 0.~~
**RETRACTED — this recommendation was wrong.** See §3.4: `fps_max` is
inert in this build. Changing it does nothing at all.

**b. ~~Add the resize watchdog the comment already promises.~~
**STRUCK — it already exists and works.** See §3.1: the watchdog is in
`services/fullscreen.ts:164`, and the app's own measurement shows the
cap surviving a resize. There is nothing to add.

**c. DONE — the tick rate the engine is offered is now capped.**
See §3.5 for the mechanism, the files, and the measurement.

§3.4 established that the engine has **no frame limiter** in the
browser: `fps_max` is inert with vsync on, and the engine's own target
(200 fps) is faster than any display. So the engine renders on every
tick the browser offers, and on a display faster than the engine can
sustain, it misses deadlines and the browser drops ticks unevenly.

There were two ways out, and they were not equivalent:

1. **Reduce the engine's per-frame work** so it fits the budget.
   Measured headroom is ~7–8 ms/frame, so a 144 Hz display needs that
   down to ~6.9 ms — a ~15 % reduction. The levers were swept
   (`hud_scale`, `r_drawviewmodel`, `r_lockpvs`, `r_novis`,
   `cl_weather`) but the run drifted by 53 %, so **the sweep was
   inconclusive and no lever is recommended**. See §3.6.

2. **Cap the tick rate the engine is offered** so it is only ever asked
   for frames it can actually finish. This is the more robust fix: it
   does not depend on shaving a particular number of milliseconds off
   the engine's work, and it degrades gracefully on hardware slower
   than the test box.

   The cost is that the engine gives up the headroom above the cap. On
   a 240 Hz display, capping at 120 Hz costs 120 fps of potential and
   buys perfectly even pacing. Given that the alternative is judder,
   that is the right trade for a shooter.

**d. MEASURED — `desynchronized: true` is neutral for frame rate.**
See §3.5. It is implemented and behind `?desync=1`, but it is **off by
default**: the measurement showed the same 60.0 fps and the same 16.7 ms
median, with the p99 marginally *better*. It is a latency lever, not a
judder fix, so it needs an input-latency A/B before it ships on.

---

## 5. A measurement artefact, recorded so it is not mistaken for a result

The first fullscreen-vs-windowed run reproduced the symptom beautifully:

```
windowed (A)      rAF=60.0/s  slow=0.0%
fullscreen (B)    rAF=49.9/s  slow=18.1%
windowed (A again) rAF=59.4/s slow=0.5%
```

It was an artefact. The harness needed a user gesture to request
fullscreen, so it dispatched a **real mouse click at the centre of the
canvas** first. That click dismissed the game's menu — so the "fullscreen"
measurement was taken while the game was **actually playing**, and the
"windowed" measurements were taken while it sat in the menu. The
difference was the *game running*, not fullscreen.

Two lessons, both now in the skill:

1. **A click is a state change.** Dispatching input to a live game
   changes what the game is doing. Any harness that clicks must
   establish the post-click state before measuring.
2. **The A/B/A ordering caught it.** Because the third measurement went
   back up, the pattern was visibly not monotonic. A single A/B would
   have "confirmed" the fullscreen hypothesis.

---

## 6. The diagnostic

Since the symptom is specific to a machine the test box does not
resemble, the deliverable that actually helps is a probe Kyle can run
on **his** rig.

**`tools/perf/diagnose-fullscreen.js`** — paste into DevTools → Console
while in a match. It prints a report and renders it as an overlay in the
top-left of the page.

Also as a one-line bookmarklet:
**`tools/perf/diagnose-fullscreen.bookmarklet.txt`**

Full instructions: **`tools/perf/diagnose-fullscreen.md`**

It reports:

- **the key comparison: browser ticks/s vs engine frames/s.** The
  engine's frames are counted by patching
  `WebGL2RenderingContext.prototype.clear` — the engine clears the
  framebuffer once per frame it renders, so counting clears counts its
  frames. (The prototype is patched rather than `getContext`, because
  the engine already holds its context by the time the diagnostic
  runs.) If the engine renders **fewer** frames than the browser offers
  ticks, it is missing deadlines, and the diagnostic says so in plain
  words.
- the rAF rate and the **full frame-interval distribution** (median,
  p90, p99, max),
- the **frame buckets** — the most common intervals and how many of
  each. *One* dominant bucket means even pacing; several means uneven.
  This is the clearest single line in the output, and it is the one that
  settles §3.3 directly.
- **slow frames**, as a fraction of frames longer than **1.5 frame
  periods** — deliberately relative to the display, not a fixed 20 ms.
  A fixed 20 ms is right for 60 Hz but would *miss* the dropped frames
  on a 165 Hz monitor, where one frame is 6.1 ms and a dropped frame is
  only 12.1 ms. That would report "0 % slow" while the pacing was
  visibly uneven.
- the canvas backing store vs its CSS size (**the upscale factor**),
- the engine's own `vid_width`, `vid_height`, `fps_max`, `gl_vsync`,
- whether the page is fullscreen and whether the pointer is locked.

### What to look for

| if you see | then |
|---|---|
| `frame buckets` shows **several** buckets | uneven pacing — the §3.3 mechanism, and `fps_max 100` on a fast display is the prime suspect |
| `display Hz` is **144/165/240** and `fps_max` is **100** | the non-integer division. Fix: `fps_max 0` |
| `upscale factor` is **> 1** and the slow % is high | the compositor's scaling is the cost. Fix: raise the render resolution |
| `vid_width` is **> 1920** | the cap has been lost (§3.1) |
| `slow %` is **~0** but it *looks* bad | the problem is not frame rate at all — it is input feel, and the input-latency work in the main report applies |

---

## 7. Harnesses written for this investigation

All in `tools/perf/`, all run against production with a real GPU.

| harness | what it does |
|---|---|
| `measure-fullscreen-vs-windowed.cjs` | windowed → fullscreen → windowed, with the frame-interval distribution |
| `measure-fullscreen-real.cjs` | the same, with `window.screen` emulated to a real display size — **necessary**, because headless Chromium reports `window.screen` as 800×600 regardless of the viewport, which made the app's resolution policy resolve to 800×600 and meant every earlier measurement was of a render size no player would get |
| `measure-fullscreen-matrix.cjs` | the two fullscreen switches (`fullScreen` = the engine's `-fullscreen` argument, `browserFullscreen` = the page taking over the screen) set independently via the persisted store — they are separate refs in `stores/store.ts` and are easy to conflate |
| `measure-cap-survival.cjs` | whether the render-resolution cap survives a resize |
| `measure-resize-cost.cjs` | whether a bigger window costs frames, and whether it settles |
| `measure-upscale-cost.cjs` | the compositor's upscale cost at 4K |
| `measure-fullscreen-input.cjs` | whether fullscreen floods the main thread with input events |
| `measure-engine-frame-skips.cjs` | whether the engine skips browser frames (counts its own `gl.clear` calls) |
| `measure-client-fps-counter.cjs` | the engine's counter vs the browser's rate |
| `verify-diagnostic.cjs` | proves the **bookmarklet artefact** works against production |
| `measure-engine-limiter.cjs` | does the engine's OWN limiter (`gl_vsync 0` + `fps_max N`) work, and what does it cost? |
| `diag-frame-pacing-hooks.cjs` | which hooks are actually reachable: `MainLoop`, the global rAF, the WebGL attributes |
| `probe-desynchronized.cjs` | can `desynchronized` be set on the engine's context at all, and how? |
| `diag-desync.cjs` | records every `getContext` call with its attributes and its stack — finds who creates the context first |
| `ab-client-fixes.cjs` | the A/B/A/B of `desynchronized` and the frame cap, against a real match |
| `verify-client-safety.cjs` | the safety check: the changed client boots, renders, and behaves like production |

### Traps found along the way

- **`window.screen` is 800×600 in headless Chromium**, whatever the
  viewport. `detectDisplay()` reads `window.screen`, so the app's
  resolution policy resolves to 800×600 and the 1080p cap never binds.
  Every fullscreen measurement must emulate `screenWidth`/`screenHeight`
  via CDP `Emulation.setDeviceMetricsOverride` to be meaningful.
- **A fullscreen window refuses a window-bounds resize**
  ("To resize minimized/maximized/fullscreen window, restore it to
  normal state first"). `page.setViewportSize` throws. Use the CDP
  device-metrics override instead.
- **A click is a state change** — see §5.
- **`src.split('*/', 1)` returns the part BEFORE the delimiter.** The
  code is *after* the first `*/`. `split('*/').slice(1).join('*/')` is
  the correct form. (It bit the bookmarklet builder twice.)
- **`document.getElementById is not a function`** was seen from a
  `page.evaluate` while the same page answered `querySelector` fine
  moments later. `querySelector('#canvas')` is used instead, with a
  retry and a context dump on failure.
- **`waitForFleet(page, URL_)`** — the second argument is an options
  object, not a URL. Passing a URL makes it fetch a relative
  `api/servers` from `about:blank`.
- **A missing GPU flag makes the diagnostic look broken.** The verify
  harness launched without `--use-angle=vulkan` etc., so Chromium fell
  back to SwiftShader and the page crawled at ~9 rAF/s. The
  diagnostic then reported a 300x150 canvas (the engine never got a
  real frame), zero `gl.clear` calls, and a 2149 ms p99 — all of it
  an artefact of software rendering, not a fault in the diagnostic.
  **Always launch the verify harness with the GPU flags**, and wait for
  the in-game banner before measuring: frame pacing is meaningless
  until the engine is rendering a scene.
- **A diagnostic that renders a verdict from a measurement that did not
  happen.** The first version printed "engine work (0.00 ms) FITS the
  budget — it can hold this refresh rate" when the engine frame count
  came out ZERO. That is a failed measurement presented as a PASS, and
  it asserts the opposite of the truth. The count is now checked, and
  an unusable count prints "CANNOT BE DETERMINED" with the reason
  instead of a verdict.
- **`split('*/', 1)` returns the part BEFORE the delimiter.** The code
  is *after* the first `*/`. `split('*/').slice(1).join('*/')` is the
  correct form. (It bit the bookmarklet builder twice.)
- **An engine cvar can exist, be settable, read back correctly, and
  still do nothing.** `fps_max` reads back as 5 and changes nothing.
  Verify that a cvar *does* what its name says before recommending a
  change to it — measure the thing it claims to control, not the cvar
  value.
- **The bookmarklet was broken and the harness did not catch it.** The
  bookmarklet is built by collapsing the diagnostic to one line, and
  collapsing with `replace(/\s+/g, ' ')` turns every `//` comment into
  a comment that swallows the rest of the file. The source was valid;
  the shipped artefact was syntactically invalid and did nothing.
  It stayed hidden because the harness evaluated the **source**.
  Fixed: the builder now uses **esbuild** (already a Vite dependency)
  to strip comments with a real parser, syntax-checks its own output
  with `vm.Script`, refuses to write a broken file, and escapes the
  newlines that survive inside template literals (a `javascript:` URL
  must be one line — a raw newline truncates it). The harness now
  evaluates the **built file** and asserts the numbers are *plausible*,
  not merely present.

  The general lesson: **verify the artefact you ship, not the source
  you built it from.**
- **A comment that describes a mechanism is not evidence that the
  mechanism is absent.** This investigation claimed the app had no
  resize watchdog — the comment describing one lived in a different
  file from the code I had read, and the only `resize` listener I
  found was named for context loss. The watchdog existed, in
  `services/fullscreen.ts`, 200 lines from the `getContext` call I had
  found. And the app's own measurement had already proved it worked:
  the engine's `vid_width` stayed at 1280×800 across a resize to
  2560×1440 — which I read, from the same table, as evidence that the
  cap was LOST. Grep for the BEHAVIOUR, not the name, and let the
  app's own measurements settle it.
- **Whoever calls `getContext` first owns the context's attributes.**
  A canvas keeps the context its first `getContext` created. Setting
  `desynchronized` means winning that race, and the app lost it twice:
  first because the pre-creation was in a boot path the real one never
  took, and then because the app's OWN resize watchdog called
  `getContext('webgl2')` to check for a lost context — firing on a
  resize while the landing page was up. Instrument the `getContext`
  calls (attributes + stack) to find out who is first, and do not call
  `getContext` in your own diagnostic: that creates the context and
  destroys the thing you are trying to observe.
- **A summary block that references a variable that was never assigned.**
  `measure-resize-cost.cjs` did `await snap('A. ...')` without keeping
  the result, then read `A1` in the KEY summary. The run produced a
  complete, correct measurement table and then **threw on the last
  line**, so the run was a "TEST ERROR" despite the data being fine.
  The tell: the harness's own exit was non-zero while the table above
  it was complete. Fixed by keeping the result (`const A = await snap`)
  and reading `A`. A scanner that cross-checks every identifier used in
  a summary against the declarations in the file now covers all the
  harnesses — that class of bug is cheap to find and easy to miss,
  because the data is all there and only the tail is broken.
