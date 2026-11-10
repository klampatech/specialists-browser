# THE CLIENT'S PERFORMANCE: WHAT WAS MEASURED, AND WHAT IT SHOWS

**Date:** 2026-11-08
**Machine:** Kyle's MacBook Pro (M3 Pro, Liquid Retina XDR, macOS 26.2, Chrome 157) — a
real 120 Hz panel, not the software renderer.
**Canvas:** 3456x1768 (the panel's full backing store).
**Map under test:** the isolated CI stack only (`ts-ci-0`, `bridge-ci`, `registry-ci`),
never production.
**Harness:** `tools/perf/measure-pacing-tour.cjs` — it enters a game, walks the player
to nav nodes, pins a different camera yaw at each one, holds `W` while it measures, and
reports the ENGINE's own frame rate, the engine's frame cost, the late-frame fraction
and the gate in force.

**THE MATCHED PAIR.** Both builds were served from the same machine over the same
tunnel, against the same map, with the same bots in the world, through the same
tour, at the same viewpoints and the same facings. The only difference between a
baseline run and a branch run is the build.

---

## 1. THE TOUR: WHAT THE ENGINE WAS ACTUALLY DOING

Six viewpoints per run, each with its own camera yaw, the player moving. The
baseline is the shipped build (`44b6167`); the branch is this work.

### `ts_casa`, empty world

| view | yaw | baseline engine fps | baseline cost | branch engine fps | branch cost (med / max) | branch late |
|---|---|---|---|---|---|---|
| 1 | 0 | 120.05 | 1.25 ms | 120.00 | 1.27 / 1.64 ms | 0.00% |
| 2 | 60 | 120.05 | 1.25 ms | 119.99 | 1.64 / 2.09 ms | 0.00% |
| 3 | 120 | 120.05 | 1.25 ms | 119.99 | 2.09 / 2.09 ms | 0.00% |
| 4 | 180 | 120.05 | 1.25 ms | 120.01 | 2.24 / 3.03 ms | 0.00% |
| 5 | 240 | 120.05 | 1.25 ms | 120.06 | 1.55 / 3.03 ms | 0.00% |
| 6 | 300 | 120.05 | 1.25 ms | **107.66** | 2.01 / 2.01 ms | **3.24%** |

### `ts_casa`, eight bots in the world

| view | yaw | baseline engine fps | baseline cost | branch engine fps | branch cost (med / max) | branch late |
|---|---|---|---|---|---|---|
| 1 | 0 | 119.98 | 1.31 ms | 120.00 | 1.60 / 1.60 ms | 0.00% |
| 2 | 60 | 119.98 | 1.31 ms | 119.99 | 2.10 / 2.10 ms | 0.00% |
| 3 | 120 | 119.98 | 1.31 ms | 117.44 | 2.20 / 2.20 ms | 0.84% |
| 4 | 180 | 119.98 | 1.31 ms | 120.00 | 1.66 / 2.89 ms | 0.00% |
| 5 | 240 | 119.98 | 1.31 ms | 120.00 | 2.37 / 2.89 ms | 0.00% |
| 6 | 300 | 119.98 | 1.31 ms | **100.00** | **5.99** / 5.99 ms | **4.48%** |

### `ts_lobbyduel`, eight bots in the world

| view | yaw | baseline engine fps | baseline cost | branch engine fps | branch cost (med / max) | branch late |
|---|---|---|---|---|---|---|
| 1 | 0 | 120.05 | 1.01 ms | 120.05 | 1.80 / 2.30 ms | 0.00% |
| 2 | 60 | 120.05 | 1.01 ms | 120.00 | 1.50 / 1.80 ms | 0.00% |
| 3 | 120 | 120.05 | 1.01 ms | 120.00 | 1.17 / 1.50 ms | 0.00% |
| 4 | 180 | 120.05 | 1.01 ms | 120.00 | 1.19 / **11.17** ms | **15.43%** |
| 5 | 240 | 120.05 | 1.01 ms | **86.54** | **11.17** / 11.17 ms | **15.43%** |
| 6 | 300 | 120.05 | 1.01 ms | 119.97 | 1.72 / 1.77 ms | 0.00% |

### WHAT THE TABLE SAYS

**THE BASELINE REPORTS A CONSTANT.** Every one of its eighteen viewpoint costs is
the same number to two decimals, across two maps and two different worlds — and
`settled` is `false` at every single one of them, because the old build never
settles anything. Its "120 fps" is the BROWSER's tick rate (119.94-120.05 Hz in
every run), not the engine's frame rate.

**THE BRANCH REPORTS THE MACHINE.** Its cost moves with what is on screen: 1.17 ms
to 11.17 ms on one map, 1.60 ms to 5.99 ms on another with bots in the world. Its
engine frame rate follows the cost down — 86.54 fps at the heavy view of
`ts_lobbyduel`, 100.00 fps at the heavy view of the populated `ts_casa` — and its
late-frame fraction rises with it, to 15.43%.

**AND THE AVERAGE ALONE WOULD HAVE MISSED IT.** View 4 of `ts_lobbyduel` is the
case in one line: the engine's **median** frame rate over that window was
**120.00 fps**, its **minimum** was **86.54 fps**, its **median** frame cost was
1.19 ms and its **maximum** was **11.17 ms**. The scene got expensive in the
middle of the window and the average never showed it. The late-frame fraction
did — 15.43% — because it counts the frames that missed their slot rather than
averaging over the ones that did not. A pacer that only ever looked at the
average cost would have seen a comfortable 1.19 ms at the exact moment the
engine was missing one frame in six.

**THE VARIANCE IS REAL AND IT IS BIG.** The same map, the same machine, the same
build: 11.17 ms in one corner and 1.17 ms in another, with the frame rate moving
from 120 to 86.5. Any single measurement — and the old build only ever took one —
is a picture of one view.

**THE GATE NEVER FLAPPED.** `cap 0` (uncapped) at every viewpoint of every run,
including the 11.17 ms one. At 11.17 ms the sustainable rate is 76 fps and the
panel is 120, so the target gate is 60 fps — but the engine's 11.17 ms frame
does not fit in a 120 Hz slot (8.33 ms), and the measured late fraction says the
engine was already missing slots at 120. Narrowing needs two consecutive SETTLED
windows, and the heavy view only lasted the tour's 12 seconds, so the gate had
not moved by the time the tour moved on. The readout reports what it knows
rather than pretending: at that moment the honest statement was "the engine
costs 11.17 ms a frame, 15.43% of its frames arrived late, no cap is in force
yet".

---

## 2. THE TIMELINE: THE BOOT DECISION, AND THE PUMP

100-130 second runs on one fixed viewpoint, sampling the pacer's state every ~2 s.

| run | the caps seen | the final cost | the engine's fps | the late fraction | `measured-at` | `settled` |
|---|---|---|---|---|---|---|
| baseline, cold | 0, 29.994 | 14.17 ms | (not published) | 5.2% | (none) | null |
| baseline, cold, 2nd | 0 only | 1.45 ms | (not published) | 1.3% | (none) | null |
| baseline, warm | 0 only | 1.70 ms | (not published) | 1.3% | (none) | null |
| branch, cold | 0, 29.994, 59.988 | 2.03 ms | 120.0 | 0.0% | 2026-11-08T23:23:34Z | true |
| branch, warm | 0 only | 1.20 ms | 120.0 | 0.0% | 2026-11-08T23:03:52Z | true |

**THE BOOT LOTTERY.** The baseline, same machine, same method, cold profile:
**14.17 ms -> 30 fps** in one run and **1.45 ms -> uncapped** in another. A 9.8x
swing in the measured cost, from the three-second window the old build measured
once and never revisited — the window in which the engine is compiling shaders
and streaming the map, i.e. the most expensive one it will ever produce.

**THE BRANCH ADAPTS.** The cold branch run went 30 fps -> 60 fps -> uncapped as the
engine warmed, and settled at 2.03 ms with 0.0% late, `settled: true` and a
timestamp.

**THE PUMP, ON REAL HARDWARE.** A branch run before the tolerance fix shows the
gate oscillating between one frame in one and one frame in two:

```
  60.8s  -> 1 frame in 2 (60 fps)
  62.8s  -> not capping
  ...
  75.0s  -> 1 frame in 2 (60 fps)
  ...
  87.3s  -> not capping
```

The cap reads **59.988 fps = 119.976 / 2**: the browser measured the 120 Hz panel
at **119.976 Hz**, and the old chooser excluded 120 for that reason, so the
target flipped to 60 fps and back as the panel's measurement jittered. Two
distinct mechanisms were at work, and they needed two distinct fixes:

1. **The display measurement jittering** -> `DISPLAY_RATE_TOLERANCE = 0.005`
   (commit `922baec`). The panel is measured at 119.976 Hz in one run and
   120.120 Hz in another: about +/-0.1%, comfortably inside the band.
2. **The engine's cost crossing the boundary** where its sustainable rate equals
   the display's rate (850/120 = 7.083 ms of frame cost) -> `COST_DEADBAND =
   0.15` (commit `0f3c7f3`). A 1.4% change in the measured cost moved the target
   across the boundary, and with the widening immediate and the narrowing needing
   two windows, the gate pumped every half minute.

**THE ANTI-PUMPING PROPERTY IS PINNED.** `tests/unit/frame-pacing.test.mjs`
feeds the policy a sequence of windows whose target alternates around the
boundary. With the deadband switched off it fails with **twelve flips**
(`1, 2, 1, 2, ...`); with it, none.

---

## 3. WHAT THE REVIEW FOUND, AND WHAT IT COST

An independent review of the pacing policy found three things that would have
made the experience worse. All three were fixed in `0f3c7f3` — and a second
review, of those fixes, found that **the fix for the pump had itself become a
performance regression**. Kyle's rule is verbatim: *"The only thing worse than
performance optimizations that don't do anything is performance optimizations
that actively make performance worse."*

### The first round (fixed in `0f3c7f3`)

| finding | the naive fix | what was done instead |
|---|---|---|
| the tick count was rounded to the NEAREST one, so on a panel whose rate is not a multiple of a standard rate (100, 75, 165 Hz) the cap could round to one frame in one tick | `ceil` instead of `round` | the promise that matters is PHYSICAL: the engine draws one frame every N ticks, so the slot is N/panelHz long and a frame that does not fit in its slot judders. The gate is now at least the number of ticks the frame needs. `ceil` would have **halved** the frame rate on those panels — the exact failure mode this work exists to avoid. |
| `computeFrameTarget(120, 0)` could produce a ~1 fps gate | clamp the cost | a measurement that cannot be used produces NO gate |
| a NaN panel or cost could produce a NaN gate, and `tick % NaN` is never true, so the engine would never have drawn again | clamp the input | same: no gate |

### The second round: the band was in the wrong units

The fix for the pump was a **15% band on the engine's sustainable rate**. The
gate's decisions are *discrete steps*, and on a 120 Hz panel the step from
60 fps to 120 fps is a **0.8%** change in the sustainable rate (119 → 121, at
7.14 → 7.00 ms of frame cost). A band swallows that step whole:

- the target said `everyNth 1` (120 fps) and the policy **held the gate at 2
  (60 fps)** — the player stayed at 60 fps until the engine was **12% faster**;
- the band could also **veto the physical promise** — on a 100 Hz panel with
  an 11 ms frame the target correctly computed `everyNth 2` and the band threw
  it away, leaving the engine asked for 100 fps with a frame that overruns its
  10 ms slot by 10% **every frame**;
- and it was **blind to the panel side**, so a reading of the display's own
  rate could latch the gate on the wrong rate and leave it there.

**WHY A BAND CANNOT DO THIS JOB.** A percentage band on the sustainable rate
does not map onto a discrete step. A band in the right units — a hysteresis
*around the threshold* — still sacrifices a window of cost either side of it.
The rule that does map is **consecutive windows**: a target that flickers never
produces two of them, so it cannot move the gate, while a change that
*persists* does.

### The rebuild (`5c41df1`)

- **The band is gone.**
- **The gate moves only when two consecutive SETTLED windows ask for the same
  target** — in *both* directions. The narrowing already required two; the
  widening was immediate, and that asymmetry is what ratcheted a flickering
  target open.
- **The narrowing also has to clear the threshold the cost is measured
  against**, by more than the measurement noise. The engine's frame cost is
  measured with about 1.4% of noise (7.00 ms and 7.20 ms are the same view on
  the same machine), and the gate changes at a threshold — 850/120 = 7.083 ms
  of frame cost on a 120 Hz panel — so a reading that straddled it would
  close the gate and open it again. The threshold is a **cost**
  (850 × everyNth / panelHz for the cap, 1000 / panelHz for the slot), and the
  gate closes when the cost is past the easier of the two.
- **A PROVISIONAL gate follows the latest warm-up reading.** It was taken
  from the least trustworthy reading the engine will ever produce — the
  warm-up window, while it compiles shaders and streams the map — and it
  could not move again until the first settled window, which is 15–20 seconds
  into a match. A gate that has been **settled** still may not move on a
  warm-up reading.
- **The counter counts settled windows only.** It counted every window that
  reached the policy, so the first settled window could narrow the gate on the
  strength of two *warm-up* readings.
- **A forced gate — the harness's — is not the policy's to move**, and says so.
- **Two honesty fixes**: the empty-window path no longer inherits a stale cap
  rate, so the readout cannot name a rate the gate no longer implies; and a
  gate left in place keeps its provisional flag.

### The rebuild, on the M3 Pro, with eight bots in the world

`ts_casa`, six viewpoints, the player moving. This is the run that shows the
pacer doing its job for the first time:

| view | yaw | engine cost | engine fps | late fraction | the gate |
|---|---|---|---|---|---|
| 1 | 0 | 11.17 ms | 83.5 (min 60.0) | **38.1%** | narrowed to 60 fps |
| 2 | 60 | 1.84 ms | 60.0 | **0.0%** | 60 fps (the widening takes two windows) |
| 3 | 120 | 1.98 ms | 120.0 | 0.0% | off the cap |
| 4 | 180 | 1.61 ms | 120.0 | 0.0% | off the cap |
| 5 | 240 | 1.65 ms | 120.0 | 0.0% | off the cap |
| 6 | 300 | 1.30 ms (max 11.54) | 120.0 (min 78.4) | 44.9% | off the cap (the spike did not last a window) |

**At view 1 the engine was overrunning its slot by 34% — 38% of its frames
arrived late. The pacer saw that, narrowed to 60 fps, and the late fraction
went to 0%.** The old build could not do that: it reported a frozen 1.31 ms
for the whole match, so it never knew the scene was expensive.

**And the timeline is quiet.** 110 seconds on one viewpoint: the gate in force
never changed, the engine's fps ran 119.3–120.8, the late-frame fraction 0%
(median) with a 1.6% maximum, and the pacer's last word was *"the engine
costs 1.53 ms a frame (554 fps) against a 120 Hz display -> not capping; the
settled reading confirms the gate"*.

## 4. THE CAVEATS, STATED PLAINLY

- **The pump fix is proven by a pinned unit test and by the timeline logs, not by
  a live A/B in the same scene.** The scenes measured here (1.17-11.17 ms) do
  straddle the 7.083 ms boundary, but the bots were not in the heavy corner
  during the fixed build's tour, so the live run never sat on the boundary. The
  unit test exercises that mechanism directly.
- **The tour's raw logs live in the session's scratch directory** (pruned after
  24 hours). The numbers above are the measurement; `tools/perf/measure-pacing-tour.cjs`
  is the committed instrument that produced them, and it is re-runnable.
- **The late-frame fraction is a property of the engine's frames against the
  active gate**, not of the browser's tick gaps. At one frame in four, a quarter
  of the browser's ticks read "late" even though the game is perfectly paced —
  that was the old metric, and it is what produced the screenshot's "16% of
  frames arrived late".
- **No resolution advice is included.** The engine is CPU-bound here (the cost
  moved with the scene, not with the pixel count), and the resolution
  investigation is a separate piece of work that this change does not bundle.

## 5. THE GAMING PC, IN FIREFOX: THE FULLSCREEN QUESTION, MEASURED (2026-11-09)

**Machine:** `cachyos-x8664` — Kyle's own gaming PC. CachyOS, Ryzen 7 8700G +
Radeon RX 7700 XT, **niri on Wayland**, and an **Acer EB321HQU at 2560x1440 @
59.951 Hz with variable refresh rate NOT SUPPORTED**. A 60 Hz panel with nothing
to absorb a missed frame: the frame budget is 16.67 ms and an overrun is a
visible hitch, full stop.

**Browser:** **Firefox 159.0.1** — the browser Kyle actually plays in, which is
the whole point. Until 2026-11-09 it was the one browser nobody could watch:
Firefox removed CDP support in version 129 and Playwright's `connectOverCDP`
does not speak to Firefox, so the CDP watcher could only see a Chromium that
was installed *for the watcher*.

**Instrument:** `tools/perf/watch-client-bidi.cjs` (WebDriver BiDi) over
`tools/perf/watch-remote-ff.sh`, with the probe in **non-invasive mode**
(`--no-raf-wrap`): it reads the client's own pacer, the canvas, the event-loop
lag and the input latency, and **leaves `window.requestAnimationFrame` alone**.

### THE TWO PHASES — AND THE SECOND RUN

**Run 1** (45 rows maximized, 57 fullscreen):

| | css box | canvas BACKING | megapixels | engine cost | browser | panel | lag | late |
|---|---|---|---|---|---|---|---|---|
| **maximized window** | 2560x1315 | 2009x1032 | **2.07** | **3.69 ms** | 60.0 Hz | 60 Hz | 4.08 ms | 0.0% |
| **fullscreen (niri)** | 2560x1440 | 1920x1080 | **2.07** | **4.45 ms** | 60.0 Hz | 60 Hz | 4.08 ms | 0.0% |

**Run 2** (52 rows maximized, 14 fullscreen — the browser died at the
transition, so the drift phase never ran):

| | css box | canvas BACKING | megapixels | engine cost | browser | panel | lag | late |
|---|---|---|---|---|---|---|---|---|
| **maximized window** | 2560x1315 | 2009x1032 | **2.07** | **2.44 ms** | 60.0 Hz | 60 Hz | 4.08 ms | 0.0% |
| **fullscreen (niri)** | 2560x1440 | 1920x1080 | **2.07** | **2.98 ms** | 60.0 Hz | 60 Hz | 4.08 ms | 0.0% |

**THE RELATIVE DIFFERENCE REPRODUCES; THE ABSOLUTE ONE DOES NOT.** Run 1:
**+0.76 ms, +21%**. Run 2: **+0.54 ms, +22%**. The absolute cost of BOTH
phases fell by about 1.25 ms between the runs (a different map, a different
scene), and the absolute gap shrank with it — while the ratio held at ~21-22%.
That is suggestive and NOT a finding: two runs on two maps, with no drift
phase in either, cannot separate the window state from the scene.

### WHAT THIS SETTLES: THE PIXEL-COUNT STORY IS OUT

**The fragment count is IDENTICAL in both phases — 2.07 MP either way.** The
client forces the render resolution and RE-APPLIES it when the window grows
(the 50 ms debounced watchdog in `webxash/src/services/fullscreen.ts`), so
fullscreen does not cost more pixels: it upscales the same frame to a taller
box.

That contradicts the figure the earlier session worked from — *fullscreen is
3.54 MP against 1.59 MP tiled, 2.2x the fragments* — and the contradiction is
explained: that figure was measured on a window whose backing store FOLLOWED
the window. **With the forced render resolution in force, the backing store does
not follow the window.** So M2 (pixel count) is not the mechanism, and the
"fullscreen is slower because more pixels" explanation does not survive
contact with the instrument.

### WHAT THIS DOES NOT SETTLE

**The +0.76 ms (+21%) is a LEAD, not a finding.** The engine's per-frame cost
is dominated by what is on screen — the repo's own measurements put the same
map at **1.87 ms and 9.12 ms** a minute apart, a 4.9x spread from the spawn
point alone — and this is ONE sample per phase with no drift control. The
repo's own rule is A, then B, then **A again**: the third run is the drift, and
a B-A difference smaller than the drift is not a result. The A/B/A is the next
run.

### THE CRASH, AND WHY THE SESSION AFTER IT WORKED

The first Firefox session died mid-game. Its log:

```
JavaScript warning: .../xash3d-....js, line 8: Script terminated by timeout at:
_emscripten_glEnableVertexAttribArray@.../xash3d-....js:8:106477
@... line 1 > WebAssembly.Module:wasm-function[0]:0x0
@... line 1 > WebAssembly.instantiate:wasm-function[72]:0x5254
```

**"Script terminated by timeout" is Firefox's script run-time watchdog**
(`dom.max_script_run_time`, default 10 seconds): a main-thread call that runs
longer than the budget is interrupted, and when the call is inside WebAssembly
the whole WASM execution is killed with it — **the engine, not the page**. The
client's rAF shim then threw on every frame, and the browser went down with
the pointer-lock teardown errors.

**THE FIRST FIX WAS A NO-OP, AND THE PROFILE PROVES IT.** The pref was
written as `dom.max_script_run_time = 0` ("disable the watchdog"). Firefox
**silently refused the value**: the profile's `prefs.js` came back with

```
user_pref("dom.max_script_run_time.require_critical_input", false);
```

and **no `dom.max_script_run_time` line at all** — while the second pref from
the very same file landed perfectly. A value outside the pref's static range
is refused outright, and that range starts at 1, so **`0` is not a value this
pref will take**. The watchdog was never disabled, and the next run crashed
at exactly the same place — the transition into fullscreen — which is what a
watchdog that was still armed would do.

The pref is now **3600 seconds**, and `prefs.js` confirms it landed:

```
user_pref("dom.max_script_run_time", 3600);
user_pref("dom.max_script_run_time.require_critical_input", false);
```

So a ten-second main-thread block inside the engine should now PAUSE the game
instead of killing it. **That is a profile pref on the PERF profile — not a
code change, and not a change to the player's own browser.**

### THE TRANSITION ITSELF COSTS A SECOND

In run 2, the event-loop lag spiked to **1258 ms** on the sample where the
canvas backing store changed to the fullscreen resolution
(`1978x1048 -> 1920x1080`). Entering fullscreen is a **1.26-second freeze**
of the main thread. On a 60 Hz panel with no VRR that is a stall the player
feels, and it is the same resize whose re-application the client's 50 ms
debounced watchdog performs — the re-application is fast; the STALL is
somewhere else in that path and is not yet explained.

### THE CAVEATS

- **There is NO frame-interval distribution in these numbers.** The probe was
  deliberately non-invasive (it does not replace `requestAnimationFrame`), so
  the frame-interval histogram comes from the client's own pacer and from the
  in-game **Export log** instead. The engine cost, the browser rate against
  the panel rate, the late-frame fraction, the canvas backing store and the
  event-loop lag are all measured; the p50/p95/p99 spacing is not.
- **Firefox MASKS the WebGL renderer string** — it reports `Radeon R9 200
  Series` for an RX 7700 XT. Chromium on the same box reports the truth
  (`ANGLE (AMD, AMD Radeon RX 7800 XT (radeonsi navi32 ACO), OpenGL 4.6)`), so
  the Firefox renderer line is NOT evidence about the GPU. It is evidence that
  the rendering is hardware rather than SwiftShader.
- **The panel is 60 Hz and the browser delivered 60.0 Hz in both phases**, so
  no browser throttling is in play here and the budget is 16.67 ms throughout.
- **A scene change invalidates a phase.** The A/B/A must be on ONE map: the
  engine cost moved with the map, not with the window.
