# THE PACER, THE READOUT, AND THE 30 FPS — a plan

**THE MEASUREMENTS ARE IN `docs/CLIENT-PERF-RESULTS.md`** — six matched tour runs
(two maps, an empty world and eight bots, six viewpoints each with its own camera
yaw) and the 100-130 second timelines that caught the boot decision and the pump.
This document is the contract; that one is the evidence.

**Written 2026-11-08, after Kyle asked two questions about the "Your Client" tab:**

1. *Is the "locked at 30 fps / 60 fps" an engine limitation? If there is an
   artificial limiter, can we remove it?*
2. *Is the information in my screenshot accurate? How do we fix it?*

**The answers, in one paragraph.** The 30fps is **not** an engine limit — the
engine has no frame limiter in the browser at all (`fps_max` is inert while
vsync is on). It is **our own pacer** (`webxash/src/services/frame-pacing.ts`
and `frame-pacing-apply.ts`), and on Kyle's machine it was choosing 30fps from a
measurement taken **three seconds after the engine booted**, from a **two-second
window**, and **never measuring again for the rest of the match**. The screenshot
is therefore mostly a picture of the engine's *warm-up*, presented as a picture
of the machine — and four of its statements are wrong. This plan fixes the
measurement, the attribution and the wording.

**THE GOVERNING CONSTRAINT, from Kyle:** *"The only thing worse than
performance optimizations that don't do anything is performance optimizations
that actively make performance worse."* So every change here has an
**acceptance criterion that is a measured frame rate**, not a feeling. See
§ THE GATE.

---

## 1. WHAT THE SCREENSHOT ACTUALLY SHOWS

Kyle's screenshot (M3 Pro, 120Hz ProMotion, Vivaldi, 3352×1990 device pixels):

| the readout | the fact behind it |
|---|---|
| DISPLAY: `120 Hz — the game was drawing 60 fps` | `panelHz` 120 (idle-measured), `displayHz` 60 (the game's live tick rate) |
| FRAME COST: `15.94 ms against the 8.33 ms budget` | 8.33ms = 1/120Hz; the engine used **191%** of the budget |
| RENDER SIZE: `6.7 megapixels` | 3352×1990 at dpr 2 |
| GRAPHICS: `Hardware accelerated` | ANGLE / Metal / Apple M3 Pro |
| `16% of frames arrived late` | `lateTicks / measuredTicks` in the boot window |
| `The game was capped to 30 fps` | `capFps` 30, `everyNth` 4 (one frame in four 120Hz ticks) |
| `The game was drawing 60 fps on a 120 Hz display` | `displayHz` 60 < 120 |

### 1.1 The cap's arithmetic, run through the REAL policy code

```
sustainableFps(15.94)        = 53      (floor(1000 / (15.94 / 0.85)))
chooseFrameCap(120, 53)      = 30 fps  (the highest even divisor of 120 that is <= 53)
```

So the chain is: **15.94ms → 53fps → 30fps**. Three things produced that, and
each one is ours:

- **The cost number.** 15.94ms is what the engine cost **three seconds after
  boot**, during the warm-up. The research (`docs/CLIENT-PERF-RESEARCH.md`) says
  the engine needs **25–30 seconds** to reach steady state, and that the first
  window is the most expensive.
- **The 0.85 safety factor.** Without it, 15.94ms sustains 62fps and the cap
  would be **60fps**.
- **The even-divisor rule.** 120 ÷ 30 = 4 exactly; 120 ÷ 60 = 2 exactly. Both
  divide evenly, so the rule is not what halved it — the safety factor and the
  cost number are.

The same policy, fed a **settled** cost:

| engine cost | sustainable | cap on a 120Hz display |
|---|---|---|
| 15.94ms (the boot reading) | 53 | **30 fps** (1 frame in 4) |
| 12ms | 70 | **60 fps** (1 frame in 2) |
| 8ms | 106 | **60 fps** (1 frame in 2) |
| 6ms | 141 | **120 fps** (uncapped) |

**So the whole difference between "30fps on a machine that was drawing 60" and
"60 or 120fps" is the quality of one measurement.** That is the whole bug.

**The good news:** the engine's `getError` patch **is** in the deployed build
(verified: the `gldebug=1` marker is in the deployed `xash3d-*.js` glue). At the
research's worst-case fixture that patch took the frame from **8.89ms to
1.91ms**. So the settled cost on real hardware should be well under the 15.94ms
the boot window reported — which means the cap should be **60fps or 120fps**, and
the 30fps is an artefact.

### 1.2 The four wrong statements

1. **"Your browser was holding the game back in your last game."** — **wrong.**
   The browser delivered 120 of 120Hz (the green finding says so), the GPU was
   hardware-accelerated, and the engine used 191% of the frame budget. The
   summary is hardcoded to blame the browser whenever *anything* is a `warn`,
   and the late-frame count is the only `warn` here. **The browser held nothing
   back; the engine could not keep up.**
2. **"Your display ran at 60 Hz"** (in the `capped` finding) — **wrong.** 60 is
   the *game's* delivered rate. The display is 120Hz: the budget above it
   (8.33ms = 1/120) says so, and "one frame in 4" of 120Hz = 30fps says so. The
   code prints `displayHz` in a sentence that calls it the display's rate, and
   `displayHz` is documented in that same file as *"NOT the display's rate when
   the engine cannot keep up"*.
3. **"The game could sustain 53 fps, so it had room to spare."** — **false.**
   53fps against a 120Hz panel with an 8.33ms budget is the opposite of
   headroom; the engine was ~2.3x over budget. The sentence borrows the
   browser's green tick to attach an engine claim that is untrue.
4. **"Lowering the render resolution in the options makes the game lighter on
   the GPU."** — **wrong on a machine with a GPU.** The research measured the
   engine's cost *flat* across an 8.4x resolution sweep: it is CPU-bound, not
   fill-bound, and 640×360 changed nothing. The advice buys blur, not frames.

Plus one that is real but mis-scoped: **"16% of frames arrived late"** was
measured in the same two-second boot window, against a threshold computed from
the *engine-stretched* live rate rather than the panel's 120Hz — so it describes
the warm-up, not the match.

---

## 2. WHAT WE ARE CHANGING (items 1–4)

### 2.1 The measurement: warm, repeated, and never worse than the engine

**Today:** `xash-loader.ts` measures **once**, `setTimeout(..., 3000)`, over a
**2000ms** window (`OBSERVE_MS`), and never again.

**After:**

- **A provisional cap early, a settled cap later.** The first measurement stays
  early (the player gets protection from judder in the first seconds), but it
  is labelled **provisional** and the pacer **keeps measuring**.
- **The settled decision** is made from a window that starts after the warm-up
  (the engine's first frame + `WARMUP_MS`, default **15s**). The research's
  25–30s is the conservative figure; 15s is where the curve has flattened
  enough for the median to be representative, and the safety factor covers the
  rest.
- **Re-measure every `REMEASURE_MS` (default 10s)**, for the whole match. The
  server rotates the map every three minutes and the engine's cost moves with
  what is on screen, so a one-shot number cannot be right for a match.
- **The measurement's age travels with the facts** (item 4), so the readout can
  say when it measured, and say that a provisional number is provisional.

### 2.2 The hysteresis: the rules that stop the pacer from oscillating

A cap that chases the cost oscillates: a quiet corner lifts it, a firefight
lowers it, and the player's frame rate pumps. A cap that never moves is what we
have today. The rules:

- **Widening the cap** (more frames) is allowed as soon as a **settled**
  window supports it — the engine getting faster after the warm-up is the
  normal case and it is the case worth acting on.
- **Widening is BLOCKED while frames are already arriving late.** If the last
  window had more than 5% late ticks, the engine is already missing deadlines;
  asking it for more frames would make the judder worse. This is the single
  most important rule in the plan: **it is the guard against making things
  worse.**
- **Narrowing the cap** (fewer frames) requires **two consecutive windows** to
  ask for the same lower value. One expensive window (a firefight, a
  compilation) must not halve the player's frame rate.
- **A provisional window never moves a settled cap.** Only a settled window
  changes an existing cap.
- **The pacer can never ask for more than the engine sustains** — that is
  `chooseFrameCap`'s existing contract and it is unchanged.

### 2.3 The attribution: say WHO is the bottleneck

The report decides between two causes, from facts it already has:

- **Browser-bound:** the browser is delivering materially less than the
  display's rate (`browserHz < panelHz * 0.9`) while the engine's cost fits the
  budget. → *"Your browser is only offering N refreshes a second."* (Energy
  Saver / Low Power Mode — the browser-specific fix the readout already knows
  how to name.)
- **Engine-bound:** the browser is keeping up (`browserHz >= panelHz * 0.9`) but
  the engine's cost exceeds the budget. → *"The game could not keep up with
  your 120 Hz display."* **Never "your browser was holding the game back."**
- **Neither:** *"Your client was set up properly. Nothing to do."*

### 2.4 The facts: the game's own frame rate, measured directly

Today `displayHz` means two different things depending on whether the cap is
engaged: before the cap it is the game's tick rate; **after** the cap it is the
panel's rate (the browser keeps ticking at 120Hz while the engine draws every
4th tick). Re-measuring would have made the readout claim *"the game was
drawing 120 fps"* while the game drew 30. So:

- **`engineFps`** (new): the rate the game is actually drawing frames — the
  engine's callback count over the window. This is what the readout's
  "the game was drawing N fps" must use.
- **`browserHz`** (new): the rate the browser is delivering ticks right now
  (the existing tick-interval median).
- **`panelHz`** (existing): the display's rate, measured while the page was
  idle. This is the one the cap divides, and the one the readout's budget is
  computed against.
- **`costMeasuredAt`** + **`costSettled`** (new): when the engine's cost was
  measured, and whether that measurement was past the warm-up.

### 2.5 The late-frame metric has to measure the ENGINE's frames, not the browser's ticks

This one is not in Kyle's list, but the readout makes a claim with it and the
claim is currently untrue, so it has to move with the rest.

Today `lateTicks` counts the gaps between the **browser's rAF ticks** that
exceeded 1.5× the tick budget. With the cap engaged, the engine's frame takes
longer than the panel's period, so the tick after it is late **by construction** —
at one frame in four, a quarter of the ticks read "late" even though the game is
perfectly paced at 30fps. The screenshot's "16% of frames arrived late" is that
number, and "the cap above existed to prevent this" is not what it describes.

**The metric that answers "is the judder gone" is the ENGINE's frame spacing
against the gate's period**: did each engine frame land on its slot?

- With the cap at 30fps (a slot every 33.3ms) and the engine's frames landing
  every 33.3ms → **not late**. The game is smooth.
- With no cap and the engine taking 15.94ms on a 120Hz panel (a slot every
  8.33ms) → the frames land every ~16.7ms → **late**. That is the judder the
  cap exists to remove, and it is what the readout should be counting.

The shim already times the engine's callback, so recording the engine's frame
starts costs nothing. The threshold stays relative (`isLate` against the gate's
period), never a constant.

**This also makes the widening rule in § 2.2 work**: with the metric corrected,
a settled window at a healthy cap reads ~0% late (so widening is allowed),
while an engine that cannot hold even its current slot reads high (so widening
is correctly refused).

### 2.6 The wording (items 3 and 4)

- The `capped` finding says **"Your display ran at 120 Hz"** — the panel rate,
  never the game's rate.
- The `refresh-ok` finding claims headroom **only when the engine has it**
  (`sustainableFps >= panelHz`); otherwise it says what is true (the browser is
  keeping up, and the budget finding carries the engine's story).
- The `delivering` finding attributes correctly: **the cap's doing** when the
  cap is in force, **the engine's limit** when it is not.
- The render-size advice is **rewritten**: on a hardware-accelerated client the
  engine is CPU-bound, so lowering the resolution buys no frames. The advice
  that is true is about the engine's per-frame cost.
- A **provenance line says when the numbers were measured**: *"…measured 32
  seconds into your last game"*, or *"…measured in the first seconds after the
  game started, before the engine had warmed up"* for a provisional reading.

---

## 3. THE GATE — what "did not make it worse" means

**Every claim in this plan is a measured frame rate.** The acceptance criteria:

1. **The unit suite** (the parent repo's `tests/unit/frame-pacing*.test.mjs`
   and `perf-check.test.mjs`) proves the policy: the hysteresis rules, the
   widening-blocked-while-late rule, the attribution, the wording. **TDD: the
   test fails first.**
2. **A real-browser A/B on the CI rig** (never production): the same rig, the
   same map, the same window, the same client — the current `main` build and the
   branch build. It reports, over time: the cap in force, the engine's cost,
   the engine's fps, the browser's tick rate and the late-tick fraction.
   **Acceptance: the branch's engine fps is never LOWER than main's, and the
   late-tick fraction is never WORSE.** If it is worse, the change does not
   ship.
3. **The readout's own numbers** are checked against the harness's numbers
   (the panel must not claim 120fps for a game drawing 30).

**The rig is 60Hz with a software rasteriser**, so the cap behaviour is
exercised there (a slow engine on a 60Hz display caps), but the 120Hz case is
not. The 120Hz case is confirmed on Kyle's own machine (a ProMotion display and
a real GPU) with the same harness, against the CI stack.

---

## 4. THE FILES

| file | change |
|---|---|
| `webxash/src/services/frame-pacing.ts` | the **policy**: `decideFrameGate()` — the hysteresis, the widening-while-late block, the settled/provisional rules. **No imports** (the parent suite runs it directly). |
| `webxash/src/services/frame-pacing-apply.ts` | the **machinery**: the engine's frame rate, the measurement's age, the settled flag, the consecutive-window counter. |
| `webxash/src/services/xash-loader.ts` | the **schedule**: provisional at 3s, then every 10s. |
| `webxash/src/services/perf-check.ts` | the **report**: the attribution, the corrected wording, the measurement's age. **No imports.** |
| `webxash/src/services/perf-collect.ts` | the **facts**: the new fields, and the session snapshot carries them. |
| `webxash/src/components/TSPerformance.vue` | the readout's rows, if a field's meaning changed. |
| `tests/unit/frame-pacing.test.mjs` | the policy's tests. |
| `tests/unit/frame-pacing-apply.test.mjs` | the machinery's tests. |
| `tests/unit/perf-check.test.mjs` | the report's tests. |
| `tools/perf/measure-pacing-timeline.cjs` | the **A/B harness**: the timeline of the cap, the cost, the fps and the late fraction. |

## 5. WHAT IS NOT IN THIS PLAN

- **Removing the cap.** `?nocap=1` exists and stays. Removing the cap on a
  machine whose engine cannot finish inside 8.33ms gives judder, not frames.
- **Lowering the resolution.** The research measured the engine's cost flat
  across an 8.4x resolution range. It is CPU-bound. (The readout must stop
  *advising* it; the research's `r_scene_scale` TODO is a separate piece of
  work for a machine that is genuinely fill-bound.)
- **`hud_scale 2.5 → 1.0`** — the one lever the cvar sweep found consistently
  positive, and it is still unmeasured at the player's fixture. It is a
  **separate** change with its own measurement, because it changes what the
  player sees.
- **The 25–30s warm-up figure.** 15s is used, because a 30s wait would leave
  the first half-minute of a match on a provisional cap. The number is a
  parameter, not a constant, and the measurement records which one was used.
