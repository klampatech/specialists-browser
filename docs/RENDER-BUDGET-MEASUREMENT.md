# THE RENDER BUDGET, MEASURED ON THE M3 PRO

**Date:** 2026-11-20
**Machine:** Kyle's MacBook Pro (M3 Pro, Vivaldi 8.3 with the debug port on it), a real
120 Hz panel — 1728x1117 CSS at dpr 2.
**Server:** production (`bulletballet.dev`), the deployed build of the budget policy.
**Subject:** Kyle's own play session — a real fight, fullscreen and windowed, ~3 minutes.

**WHAT WAS MEASURED.** The render budget (`auto` mode: the machine is measured, and the
render resolution is spent to fit the frame the machine can hold) had never been watched
doing its job. The unit suite pins its arithmetic; nobody had seen it run on the machine
the policy exists for.

**THE INSTRUMENTS, AND THE TWO THAT BROKE THE GAME FIRST.**

| instrument | what it answers |
|---|---|
| `tools/perf/measure-render-budget.cjs` | what the budget does: the canvas's backing store over time, the engine's cost, the late-frame fraction, the frame spacing — and the client's own console, where the loader logs every budget decision **and the reason for it** |
| `tools/perf/gl-context-leak-check.cjs` | how many WebGL contexts something creates, counted from the BROWSER'S OWN LOG |
| `tools/perf/watch-context.cjs` | why the canvas went white: the `webglcontextlost` event's own reason, plus the browser's log |
| the screen recording | what the player saw: the presentation intervals, measured with `ffprobe`, with no code in common with the client |

**THE INSTRUMENT BROKE THE SUBJECT, TWICE.** The first probe asked for the GL limits by
doing `document.createElement('canvas').getContext('webgl2')` — once a second. Chrome
keeps about sixteen live WebGL contexts and evicts the OLDEST when the seventeenth
arrives, so the probe evicted the ENGINE's context out from under the game: the engine
kept running at 120 fps and 2.5 ms a frame, and the page went white. The browser's own
log said it plainly, sixteen times over:

```
WARNING: Too many active WebGL contexts. Oldest context will be lost.
```

The second time it was worse: the watcher was killed by PID, but the node child behind
the `timeout` wrapper survived and kept leaking. The probe never creates a context now
(it asks the engine's own canvas, which returns the existing one), and
`gl-context-leak-check.cjs` exists so that claim is measurable rather than asserted.

**A REAL BUG THE INSTRUMENT FOUND.** Once the engine's context is gone, the client's
renderer probe (`clientRenderer()`, reached from `window.__xashPacing()`) created a fresh
WebGL context on EVERY call, because `engineRendererInfo()` returns nothing once the
context is lost — and a lost context is exactly when the readout is asked the most
questions. Measured: forty calls to `__xashPacing()` produced 186 eviction warnings. So
the leak was strongest in the state where the game was already broken, and it made the
loss permanent. Fixed in webXash #61 (the probe runs once per session; a FAILED probe is
not cached).

---

## 1. WHAT THE BUDGET DID, IN ITS OWN WORDS

Three decisions in the capture, each the policy's own log line:

```
[video] the engine costs 20.59 ms a frame against a 14.17 ms target (60 fps at
        0.85 headroom); the machine is measurably over budget, so the render
        budget falls by 25% to 1529136 device pixels; the render resolution -> 768x497 CSS
[video] the engine costs 20.96 ms a frame against a 14.17 ms target (60 fps at
        0.85 headroom); the machine is measurably over budget, so the render
        budget falls by 25% to 1146852 device pixels; the render resolution -> 664x430 CSS
[video] the engine costs 19.85 ms a frame against a 14.17 ms target (60 fps at
        0.85 headroom); the machine is measurably over budget, so the render
        budget falls by 25% to 1529136 device pixels; the render resolution -> 768x497 CSS
```

Each cut is 25% — the step limit, `AUTO_BUDGET_MAX_STEP = 0.75` — and each states the
measurement it was based on.

**THE CANVAS OVER THE CAPTURE** (device pixels):

```
1852x1100 -> 300x150 -> 3456x2168 -> 1802x1130 -> 1560x978 -> 1348x846
          -> 3364x1990 -> 1386x822 -> 1602x952
```

Two things in there are worth naming, because they are not the policy deciding:

- **3456x2168 and 3364x1990 are the display's NATIVE resolution.** The engine boots at
  it, and a fullscreen transition returns to it. The policy re-caps it about a second
  later (the resize watchdog, 50 ms of debounce). This is the "the HUD got sharper"
  moment Kyle saw during the playtest — it is real, and it is the engine following the
  window before the policy re-pins it.
- **1386x822 -> 1602x952 is a page reload**, not a policy decision: the reload resets
  the policy's state, the ceiling applies again (1852x1100), and the budget then has to
  re-decide. The resolution bounces back up to the ceiling and gets cut again.

## 2. THE SIGNAL IS RIGHT

The engine's CPU cost against what the player was actually given, 415 sampled seconds of
live game:

| the engine's cost | the delivered rate | seconds |
|---|---|---|
| 0–5 ms | **105.5 fps** | 185 |
| 5–10 ms | 104.9 fps | 22 |
| 10–14.2 ms | 76.6 fps | 69 |
| 14.2–20 ms | **37.3 fps** | 35 |
| 20–30 ms | 35.2 fps | 46 |
| 30+ ms | **23.3 fps** | 58 |

33% of the seconds were over the 14.17 ms slot, and in those the game delivered a median
of 33 fps; the seconds under it delivered 87. The policy's threshold sits exactly at the
knee.

## 3. THE LEVER IS ONLY HALF THE PROBLEM

The canvas size against what the engine cost:

| the canvas | seconds | the engine's cost (median) | the delivered rate |
|---|---|---|---|
| 1.10 MP | 203 | 6.44 ms | 76.6 fps |
| 1.50 MP | 71 | **20.16 ms** | 35.2 fps |
| 2.00 MP | 138 | **3.15 ms** | 53.0 fps |

**The cost tracks the SCENE, not the pixel count.** The seconds at 1.50 MP cost 20 ms;
the seconds at 2.00 MP cost 3 ms. So the pixels are not what makes the frame cost 20 ms,
and cutting them cannot recover the cost that trips the threshold. The budget ratchets
the resolution down 25% a step — and there is no upward path in `decideAutoBudget`, so a
heavy fight permanently degrades the rest of the session — while the frame rate does not
come back.

The deeper fix stays upstream: the CPU cost in a dense fight is the engine's own work
(the upload census measured 116,192 `bufferData` calls a second), and no resolution
policy reaches that.

## 4. THE VIDEO, AS AN INSTRUMENT THAT SHARES NO CODE WITH THE CLIENT

`ffprobe` over the recording's packet timestamps: 7742 frames over 186.8 s.

| | |
|---|---|
| the screen changed every | **16.7 ms** (median) — 60 fps |
| p90 | 41.7 ms |
| p99 | 58.3 ms |
| max | **916.7 ms** |
| gaps over one 60 Hz frame | **44%** |
| gaps over 33 ms | 24% |

Aligning the video with the telemetry (the video starts 524 s into the capture; the
correlation between the video's hitch count and the telemetry's delivered rate is
r = **-0.58**) — the video's worst seconds (25–28 hitches each) are the telemetry's worst
seconds (22–37 fps). Two instruments with no code in common agree on where the stutter
was.

**What the video can and cannot say.** A screen recording is a variable-frame-rate
movie: macOS emits a frame when the screen CHANGES, so a gap means "the screen did not
change" — which in a still scene is not a freeze. The motion segmentation here found the
whole recording in motion, so the gaps are presentation intervals here; on a static
screen they would not be.

## 5. WHAT THIS SAYS ABOUT THE POLICY

1. **The measurement is sound.** The signal tracks the delivered rate tightly and the
   threshold sits at the knee.
2. **The lever is partial.** The pixel cut buys back the GPU/compositor share of the
   frame; it does not touch the CPU share, which is what trips the threshold in a dense
   fight. Two candidate changes, both Kyle's call:
   - **cut pixels only while the frame is pixel-bound** — the pacer has both numbers: if
     the delivered frame time is much worse than the engine's CPU cost, the GPU is the
     rest and pixels will help; if they are the same, cutting pixels buys only blur.
   - **give the pixels back** — there is no upward path today, so one spike costs the
     rest of the session.
3. **The engine's cost is the real target**, and it is upstream work.

## 6. THE RAW NUMBERS

- `profiles/render-budget-1795193514082.json` — 1120 readings, the budget's decisions
  and the client's console
- `profiles/render-budget-1795192220278.json` — 833 readings, an earlier capture
- the recording: `~/Documents/bulletballetplaytest.mov` on the MacBook (1.9 GB)

## THE SECOND MEASUREMENT: THE M3 PRO, A REAL FIGHT, 2026-11-20 (evening)

**The session.** Kyle played a fight on the M3 Pro against production,
with the new policy live (webXash `ceb439e`, specialists-browser
`f5bafac`). The watcher ran for 20 minutes
(`tools/perf/measure-render-budget.cjs`), sampling every second; the
fight itself was **225 seconds and 210 readings**; the capture is
`profiles/render-budget-render-budget-1795216585090.json`.

**WHAT THE POLICY DID: NOTHING. And that is the first finding.**

The canvas held at **1802x1130 device pixels (2.04 MP)** for the whole
fight. There is not one `[video]` decision line in the console -- and
that is not because the console was missed: the policy's CHANGED
decisions are logged with `console.log`, so a single cut would have
shown up. The policy made **zero** changes.

**AND THE OLD POLICY WOULD HAVE MADE ZERO TOO.** The old rule was "the
engine's cost is over the target -> cut 25%", and the engine's cost WAS
over the target for **72 of the 210 readings** -- in five bursts:

    32 ms (5 readings)   46 ms (9)   37 ms (12)   56 ms (10)
    45 ms (11)           27 ms (11)

But the policy does not read those per-second samples: it reads the
PACER'S MEASUREMENT, which arrives every `REMEASURE_MS` -- about 10 to
18 seconds -- and it needs **two in a row** before it moves. The bursts
lasted 9 to 12 seconds each, so most of them contained a single
measurement. **This session did not distinguish the two policies.** Both
would have held the resolution.

**THE NEW GUARD DID WHAT IT WAS BUILT TO DO.** In every one of those
bursts the frame was waiting on the CPU, not on the pixels: the
delivered frame time tracked the engine's own work almost exactly
(45.94 ms of engine work -> 52.0 ms delivered; 56.15 -> 57.2; 45.31 ->
50.9). The GPU's share in those moments was 1 to 6 ms. The old policy
read the engine's cost and would have cut the pixels for a problem the
pixels were not causing. The new one read the difference and left the
resolution alone.

**THE REAL FINDING: THE POLICY IS NEARLY INERT IN A REAL FIGHT.**

The engine's cost is tiny almost all the time (median **3.29 ms**) and
the GPU's share is the rest (median **11.39 ms**, p90 18.84 ms). The
delivered frame time was **outside** the 14.17 ms target in **175 of the
210 readings** (median 20.44 ms) -- so in most readings the machine
genuinely was not holding its 60 fps target and the pixels WERE the
bottleneck.

So the policy had the right verdict and did not act, for one reason:
**the evidence window is the pacing measurement (10-18 s), not the
second.** Two windows of evidence is 20 to 35 seconds of sustained
pressure, and a fight's structure -- alternating bursts and calm --
never sustains that long. The last session's policy cut three times
because those periods were long; this session's were not.

**THE GROWTH PATH WAS NOT EXERCISED, AND IT CANNOT BE, ON ITS OWN.**

The growth fires only when `devicePixels < ceilingDevicePixels` -- and
the ceiling is the client's own fixed "auto" resolution, which is where
the budget STARTS. So the budget begins at the ceiling, and the growth
can only ever undo a cut. That is coherent ("one heavy fight does not
cost the whole session its sharpness"), but it means the growth is
unreachable in a session where nothing was cut -- which, after this
change, is most sessions.

**SO THERE ARE TWO THINGS TO FIX, AND NEITHER IS THE FORMULA:**

  1. **The decision should run on the pacer's rolling frame timeline**
     (the p50/p90 the pacer already keeps), not on the sparse
     pacing measurement. Then "two windows in a row" means two SECONDS,
     and the policy can see a GPU-bound stretch of 3 seconds instead of
     needing 20.
  2. **The growth needs a way to exist without a cut.** Either the
     ceiling should be the display's own resolution (the measured
     budget may then rise above the client's fixed half-resolution
     default), or the growth should be measured against the ceiling as
     a reference rather than as a hard stop.

Neither was fixed in this session: the session was a measurement, and
what it measured is that the policy needs a finer signal than the one
it is given.
## THE POLICY WAS REMOVED. 2026-11-20, after the player's own play test.

Kyle played lobby duel on his gaming rig and came back with:

> the resolution switching was weird and eventually upscaled it so much
> the text was massive. I think we should just auto set it to whatever
> the native desktop resolution is using and maybe add a resolution
> switcher to the ESC options menu for people who want to change it.
> The scaling based on performance measuring seems over engineered and
> was interupting the experience by having the HUD (crosshair) disappear
> for a bit on the switch.

**THE MEASURED BUDGET IS GONE** — the pacing measurement, the CPU/GPU
split, the formula, the growth path, the ceiling and the floor. About
700 lines of client and tests, out of the client.

**THE HUD IS WHY THE SECOND COMPLAINT MATTERS**, and it was not obvious.
The engine draws the HUD in VIEWPORT units, so the HUD's size on screen
is

    H * (the canvas's CSS box / the canvas's backing store)

— a smaller backing store means the browser upscales more, and the HUD
inflates with the picture. Measured on the player's own recording, in
the same session: before the policy's cuts the crosshair was the size
it should be; **after them it was about 20% BIGGER**, and the picture
was soft.

**'AUTO' IS NOW THE DISPLAY'S OWN RESOLUTION.** No cap, no measurement.
The old 'auto' was the display's size capped at 1920x1080 of CSS pixels,
which on a 1440p display is a picture the browser stretches.

**AND THE PLAYER GETS A SWITCHER**, in the ESC menu: Native, 1920x1080,
1600x900, 1280x720, 960x540, 640x360.

**WHAT IS LEFT IS THE PACER**, which holds the frame rate by deciding
how many ticks the engine draws in, and does not move the resolution.

This document is the record of what the policy was and why it went. The
measurements in it are still true; the policy is not.
