# Client performance: FPS and latency at native resolution

**Research date:** 2026-10-28
**Question:** Kyle asked how to maximise performance (FPS and latency) during
gameplay when the game is full screen at the user's screen resolution.
**Subject:** `specialists-browser` / BulletBallet — `https://bulletballet.dev`

---

## TL;DR

The 2026-10-27 "150 ms of client lag" was correctly diagnosed as the engine's
own render frame time, and correctly fixed by capping the render resolution
(PR #79). **But the measurements behind that fix were all taken on a software
rasteriser (SwiftShader), and the default it shipped — a hard 1080p cap — was
derived from that artefact.**

Measured again against production on a **real GPU**, the picture inverts:

- **The engine holds 60 FPS at native 1080p, with 4.2 ms of event-loop lag.**
  The "150 ms" was the software rasteriser, not the client. On real hardware
  the lag matches an *idle* page.
- **The 60 FPS is the display's refresh ceiling, not a cost.** A bare rAF
  loop on an empty page measures 58.5/s in the same browser. Dropping the
  render resolution to 640×360 changes *nothing*.
- **It holds at 1440p and 4K too.** At native 2560×1440: 60.1 rAF/s. At
  3840×2160 — 8.3 megapixels, four times 1080p — ~58–59 rAF/s on
  *integrated* graphics.
- **So the shipped 1080p cap buys zero frames on a real GPU and costs image
  quality.** A player on a 1440p or 4K display is given a blurry upscale for
  no benefit.
- **And there are no free frames hiding in the engine's own switches.** A
  proper interleaved A/B/A sweep of `r_lockpvs`, `r_drawviewmodel`,
  `r_novis`, `hud_scale`, `gl_vsync` and `fps_max` found every one of them
  neutral or actively harmful at both 1080p and 4K.
- **Input latency is already at the floor: 7–11.5 ms, under one 60 Hz
  frame**, measured end to end from a real pointer-lock mouse move to the
  client's own view angles changing. The client predicts locally, so the
  network round trip is not in front of the player's aim. (Rare
  multi-frame stalls appear in the tail; §3.3.)

The conclusion is therefore not "the cap was wrong" but **"the cap was
measured on the wrong machine, and it should be measured per device."**
The engine is not the bottleneck on a machine with a GPU. What remains is
worth measuring properly, and the levers that survive the finding are:

1. **Make the render resolution adaptive** — measure the actual device and
   pick from that, instead of a fixed constant. This fixes both the
   over-capping of strong machines and the under-capping of weak ones.
2. **Try the browser's low-latency canvas** (`desynchronized: true`) — the
   plumbing exists and is unused. But **expect little**: the game's own
   input-to-view path is already at or below one frame, so the compositor's
   delay is all that is left to win.
3. **Rebuild the TS client WASM with `-O3` instead of `-Oz`** — production's
   client module is the Rust TS port, built size-optimised. **Measured: no
   reproducible difference.** Four A/B cycles in the real game, run in **both
   orders**; the build that ran second won three times out of four, and both
   builds have a best-case frame time of 16.64–16.79 ms — all of them 60 Hz.
   A defensible default, not a performance fix.
4. **Move the engine off the main thread** — the deepest ceiling, and
   production already ships the COOP/COEP headers that make WASM threads
   possible.

**And the good news, which is as important as the bad:** input latency is
**7–11.5 ms — under one 60 Hz frame** — measured end to end from a real
pointer-lock mouse move to the client's own view angles changing. The
client predicts locally (`CL_CreateMove`), so the network round trip does
not sit in front of the player's aim. There is no input backlog and no
queue. Input latency is *not* where the remaining budget is.

Everything below is measured against **production**, with a **real GPU**
(`ANGLE (AMD, Vulkan 1.4.305 (AMD Radeon Graphics (RADV RENOIR)), radv)`),
at `https://bulletballet.dev`.

---

## 1. What was already known, and what was wrong with it

### The correct finding

The engine renders **at the browser viewport's resolution**. Its
`vid_width`/`vid_height` cvars and the canvas backing store tracked the
viewport exactly at every size tried, and the engine's frame count equalled
the browser's `requestAnimationFrame` rate at every size — mechanically what a
150 ms event-loop lag *is*. That diagnosis is right, and PR #79's fix (render
smaller, let the browser upscale the canvas) is the right shape of fix.

### The wrong part

Every number behind it came from **one headless Chromium on a box with no
usable GPU**. On this box, Chromium falls back to SwiftShader:

```
renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)
```

SwiftShader rasterises every pixel on the CPU. A real user's browser gets:

```
renderer: ANGLE (AMD, Vulkan 1.4.305 (AMD Radeon Graphics (RADV RENOIR)), radv)
```

The `-ref webgl2` renderer (`webxash/src/services/xash-loader.ts:33,426`) is a
real GL2 backend. On a real GPU the *fill* cost of a GoldSrc-era scene at
1440p or even 4K is negligible — the pixel count still sets the ceiling on how
much work the **CPU** side does, but it is no longer the binding constraint.

**This is why the shipped default is suspect.** `AUTO_MAX_PIXELS = 1920 * 1080`
(`webxash/src/services/video-settings.ts:124`) was chosen on the basis that
"a 1440p display pays 2.3x the fill rate and a 4K display 5x, for detail the
source art does not have." The *detail* argument still holds — the art is
320×240 and upscaling a 1080p buffer to 1440p is invisible. But the *fill
cost* argument does not transfer, and it is the argument that drove the number.

The consequence for the player is concrete: **a player on a good GPU is
rendering at 1080p when their machine could do 1440p or 4K natively, and
seeing a blurry upscale for no reason.** Meanwhile a player on a weak machine
gets the same 1080p and might still be under water.

---

## 2. The measurement harness

New tools, all against production, all measuring inside the page so the
numbers reflect the thread the player's mouse competes with. The operating
note — including the traps that cost time — is `tools/perf/README.md`.

- `tools/perf/measure-client-perf.cjs` — frame rate, event-loop lag, engine
  state (canvas backing store vs CSS size vs GL drawing buffer).
- `tools/perf/measure-input-latency.cjs` — **input latency, end to end**: a
  real pointer-lock mouse move, through to the client's own view angles
  changing. Both timestamps on one clock inside the page. This one has a
  long list of gates to open first (pointer lock, menu dismissed, mouse
  button held, the right cvar) — all documented in §3.3 of the report and
  in the source.
- `tools/perf/sweep-engine-cvars.cjs` — sweeps the engine's own performance
  cvars live, without a rebuild, and reports what each is worth in frames per
  second and in milliseconds of lag removed.
- `tools/perf/ab-wasm-opt-level.cjs` — builds the TS client WASM at two
  optimisation levels and runs the **real game against the real server**
  with each.
- `tools/perf/serve-local-build.cjs` — hosts a local build of the frontend
  and proxies `/api/*` and `/hl/*` to production, so a local build can
  actually find the fleet and play.

All of them take `--gpu`, which forces ANGLE/Vulkan so the numbers come from
a real backend, and all of them print the renderer string with every result,
so a number can never be unattributed.

---

## 3. Results

### 3.1 The headline: on a real GPU, the engine is already vsync-limited

Measured against production, on a real GPU
(`ANGLE (AMD, Vulkan 1.4.305 (AMD Radeon Graphics (RADV RENOIR)), radv)`),
viewport 1920×1080, engine rendering at 1920×1080 with no downscaling at all:

| engine render resolution | canvas backing store | rAF/s | event-loop lag (med) | lag (p95) |
|---|---|---|---|---|
| 1920×1080 (native) | 1920×1080 | **59.9** | **4.3 ms** | 16.7 ms |
| 1280×720 | 1280×720 | 60.0 | 4.2 ms | 14.0 ms |
| 640×360 | 640×360 | 60.0 | 12.4 ms | 17.0 ms |

Raw: `tools/perf/results/prod-resolution-sweep-1080p-runA.json`.

**The engine holds a solid 60 FPS at full native 1080p, and the event-loop lag
is ~4 ms.**

**A second, independent run of the same sweep** (`…-1080p-runB.json`) gives
58.9 / 60.0 / 56.3 / 59.6 rAF/s at the same four resolutions, with median lag
between 11.9 ms and 16.9 ms. **The frame rate is stable across runs; the lag
figure is not** — it tracks the server's state (§5). Read the frame rate as
the finding and the lag as a snapshot.

**The same holds at 1440p**, which is the resolution the shipped
`AUTO_MAX_PIXELS` cap actually bites at. Viewport 2560×1440:

| engine render resolution | canvas backing store | rAF/s | event-loop lag (med) | lag (p95) |
|---|---|---|---|---|
| 1920×1080 (the cap) | 1920×1080 | 60.0 | 4.3 ms | 12.3 ms |
| **2560×1440 (native)** | 2560×1440 | **60.1** | 12.2 ms | 15.9 ms |
| 1920×1080 (forced) | 1920×1080 | 60.0 | 4.4 ms | 12.1 ms |
| 1280×720 | 1280×720 | 60.1 | 4.3 ms | 9.3 ms |

Raw: `tools/perf/results/prod-resolution-sweep-1440p.json`.

At native 1440p the engine holds **60.1 rAF/s** — indistinguishable from
the capped 1080p run, and still the display's refresh ceiling. The lag
rises a little (12.2 ms vs 4.3 ms median), but the frame rate does not
move, because it is not the constraint.

For comparison, the same measurements on the software rasteriser (the
2026-10-28 run) were:

| engine render resolution | rAF/s | event-loop lag (med) |
|---|---|---|
| 1920×1080 | 8.6 | 235.7 ms |
| 2560×1440 | 4.5 | 360.5 ms |

**The "150 ms of client lag" was a software-rasteriser artefact.** On real
hardware the lag is **4.2 ms** — which is the same as the *idle* page
(4.1 ms, measured 2026-10-27). The engine is not the bottleneck at all on a
machine with a GPU.

And the 60 FPS is a **ceiling, not a cost**. A bare `requestAnimationFrame`
loop on an empty page in the same browser measures **58.5/s** — the display's
refresh rate. The engine at native 1080p is hitting the refresh ceiling with
frame budget to spare: dropping the render resolution to 640×360 changes
nothing (60.0 rAF/s, identical).

### 3.2 What this means for the shipped default

`AUTO_MAX_PIXELS = 1920 * 1080` (`webxash/src/services/video-settings.ts:124`)
caps the render at 1080p by default. On real hardware that cap:

- **costs image quality for nothing** — a player on a 1440p or 4K display is
  given a 1080p buffer upscaled by the browser, and gains **zero** frames,
  because the engine was already at the refresh ceiling;
- **is still the right call for a player on a weak machine** — the software
  rasteriser case is real (it is what a GPU-blocklisted browser, a remote
  desktop, or a machine with a broken driver gets), and there the cap is the
  difference between 8 FPS and 60.

So the cap is not wrong; it is **unnecessarily lossy for most players and
insufficiently adaptive for the rest**. It should be measured per device,
not assumed.

### 3.3 Input latency — measured

**This is the number a player feels, and it is good: under one frame.**

The harness (`tools/perf/measure-input-latency.cjs`) measures the real
thing, not a proxy:

1. The page's own `mousemove` listener records `performance.now()` when
   the browser delivers the event.
2. A trusted mouse move is dispatched through CDP, with a real
   `movementX` delta.
3. The client is asked for its view angles (`ts_test_view`), and when the
   angles change, `performance.now()` is recorded again.

Both timestamps are taken on **one clock inside the page**, so the number
is not dominated by the harness's polling interval. The probe's own round
trip — asking for the angles and waiting for the print that answers — is
measured separately and is **0.4 ms**, so it contributes almost nothing.

**Two full runs:**

| run | clean samples | min | median | p95 | max |
|---|---|---|---|---|---|
| 1 | 22 / 24 | 9.0 ms | **11.5 ms** | 12.9 ms | 12.9 ms |
| 2 | 24 / 24 | 6.2 ms | **7.0 ms** | 8.1 ms | 93.3 ms |

Run 1's values: 9.0, 9.7, 9.9, 9.9, 10.1, 10.3, 10.5, 10.6, 10.6, 10.7,
11.1, 11.5, 11.5, 11.7, 11.7, 11.8, 12.1, 12.3, 12.3, 12.5, 12.8, 12.9.
Run 2's: 6.2, 6.4, 6.6, 6.7, 6.7, 6.7, 6.8, 6.8, 6.9, 6.9, 6.9, 7.0, 7.0,
7.1, 7.5, 7.5, 7.5, 7.6, 7.7, 7.9, 8.1, **21.2, 82.1, 93.3**.

**Both medians are below one 60 Hz frame (16.7 ms).** The two runs differ
in where their cluster sits (7 ms vs 11.5 ms) because the sample lands on
whichever frame boundary the input happens to cross — but they agree on
the thing that matters: **the input is applied on the frame it arrives
on, not the one after it.**

**Run 2 has three outliers — 21.2, 82.1 and 93.3 ms — and they are
reported rather than trimmed.** They are the tail of the distribution, not
the common case: 21 of its 24 samples are under 8.2 ms. What they most
likely represent is a moment where the client was mid-way through a
respawn, a map transition, or a stall in the server's tick — the view
simply did not update until something else had run. Two runs of 24
samples cannot characterise a 1-in-200 tail, so the honest reading is
**"typically 6–13 ms, with rare multi-frame stalls of unknown cause"**,
not "12 ms, every time".

**And the one caveat that matters most:** an input-latency harness
measures the *view changing*, and the view changing is a proxy for what
the player sees. The compositor's own presentation delay — the part
`desynchronized: true` would target — is **not** in this number at all.

That is the floor. A game rendering at 60 FPS cannot show a response
faster than its own frame time, and this one hits that floor.

This is a consequence of the architecture, and it is the good news in
this report: **the TS client implements its own prediction**
(`CL_CreateMove` in
`tools/port/tsp-rs/crates/client/src/input.rs`), so the local view
updates on the client's own frame rather than waiting for the server to
come back and correct it. The network round trip does not sit in front
of the player's aim.

**What this rules out.** Input latency is *not* where the remaining
budget is. The `desynchronized: true` canvas (§4.2) can only buy the
compositor's own presentation delay — a fraction of a frame at best —
because the game's own input-to-view path is already at or below one
frame. It should still be measured, but it should be expected to be a
small win, and it is Chromium-only.

#### Getting the input-latency probe to work at all

Five separate gates had to be opened, and each one produced a clean "0
responses" rather than an error. This is the most fragile part of the
whole measurement, and the reasons are worth recording because they are
not obvious.

**The menu owns the cursor.** `ts_test_view` reports `menu true` while a
menu has the cursor, and the client keeps the view still and moves a
*virtual* cursor instead (`input.rs`: `cursor_owned()` → `menu_hold()`).
Mouse-look is ignored entirely. The fix is one click into the game, and
the harness verifies `menu false` before measuring.

**The pointer must be locked.** Emscripten only reads `movementX` when
`Browser.pointerLock` is set, which tracks `document.pointerLockElement`
(`raw.js`: `calculateMouseEvent`). Unlocked, it computes a delta from
absolute page coordinates instead. So the harness requests pointer lock
on the canvas — and **the plain `requestPointerLock()` call must be tried
before `requestPointerLock({ unadjustedMovement: true })`**, because the
latter rejects in headless Chromium and the rejection is silent unless
awaited. Asking for unadjusted movement first means never getting the
lock at all.

**The mouse button must be held.** With the menu dismissed and the
pointer locked, a move with the button up still did not move the view.
The client treats the mouse as live only while a button is down
(`mouse.active`), so the harness holds the left button for the duration.

**`v_angle` does not exist in this build.** The engine answers
`Unknown command: v_angle`. The view angles live in the Rust TS client,
which exposes them through its own developer command `ts_test_view`
(`tools/port/tsp-rs/crates/client/src/view.rs:448`), which prints
`... angles [pitch,yaw,roll]`. That is the ground truth: the engine and
the client reporting their own state.

And one more, which is a bug in the *measurement* rather than the game:

**A single mouse move can be dropped.** The client consumes the
accumulated delta once per frame and discards it entirely when the mouse
is not active — the engine sets that by calling the DLL's
`IN_ActivateMouse`. So one move in twenty was silently thrown away and
the view never moved. The harness now repeats the move until the view
responds, taking the timestamp from the **first** move.

**Two traps in the retry mechanism itself**, both of which produced
plausible-looking but wrong numbers before they were found:

- *The retry interval leaked into the result.* A sample that needed three
  retries was timed from the first move, so it reported three retry
  intervals of latency — the harness's delay, not the client's. The
  samples are now split into **clean** (first move landed) and
  **retried**, and only the clean ones measure the client.
- *The retries were no-ops.* With the pointer locked, Chromium derives
  `movementX` from the change in pointer position, so dispatching a retry
  to the *same* coordinates produced `movementX: 0` — a mousemove with no
  delta in it. Each retry now alternates direction, so every dispatch
  carries a real delta. Before this fix the harness reported 0/24
  responses; after it, 22–24 out of 24.

**And one trap in the probe:** asking for the angles faster than the
frame rate backs up the engine's print path. At 125 Hz the median
climbed from 12 ms to 53 ms across runs — the measurement getting
heavier, not the client getting slower. The probe is now driven from
`requestAnimationFrame`, exactly one probe per frame, so it mirrors the
frame instead of competing with it.

### 3.4 What the engine's own cvars are worth

The first sweep (measure a baseline, then each cvar) produced a confounded
result — the "baseline" came out at 38.29 rAF/s while resetting the same
state later measured 57.13. The engine was still warming up. The harness was
rewritten to warm up first and then interleave **A/B/A** for every switch,
so the number reported is the switch's effect rather than the engine's mood.

With a 25-second warm-up and A/B/A, at viewport 1920×1080 on the real GPU:

| switch | OFF | ON | Δ rAF/s | Δ lag |
|---|---|---|---|---|
| `r_lockpvs 1` | 55.88 (26.2 ms) | 50.15 (38.3 ms) | **−5.73** | **+12.2 ms** |
| `r_drawviewmodel 0` | 51.51 (34.9 ms) | 50.89 (36.8 ms) | −0.61 | +1.8 ms |
| `hud_scale 1.0` | 58.98 (14.3 ms) | 58.13 (18.1 ms) | −0.86 | +3.7 ms |
| `gl_vsync 0` | 59.13 (15.4 ms) | 53.77 (26.4 ms) | **−5.36** | **+11.0 ms** |
| `fps_max 0` | 59.64 (14.2 ms) | 59.32 (13.2 ms) | −0.33 | −1.0 ms |
| `r_novis 1` | 59.15 (8.6 ms) | 60.13 (16.3 ms) | +0.99 | +7.6 ms |

**The settled readings before the sweep were 44.6, 52.3, 58.7 rAF/s** — the
engine takes a long time to reach steady state, and only the last of those
is the real number.

**Every switch is neutral or actively harmful.** Not one of them bought a
frame. And the reason is now clear from §3.1: **at 1080p the engine is
already at the display's refresh ceiling**, so there is no frame budget to
recover. Turning off work that was not the constraint cannot help, and
several of these switches perturb the engine enough to cost a little
(`r_lockpvs` freezing the PVS can make the view pop as entities appear and
disappear; `gl_vsync 0` removes the one thing keeping the frame pacing
smooth).

**This kills §4.2's premise, and that is the finding.** The cvar sweep was
worth running precisely because it showed there was nothing there. The
honest conclusion is:

- On a real GPU at 1080p, **there are no free frames to be had from the
  engine's own switches.** The engine is vsync-limited.
- The switches still matter in the case where the machine is NOT at the
  ceiling — the software-rasteriser case, or a much higher resolution.
- `gl_vsync` should be **left on**. Turning it off measured worse on both
  frame rate and lag, which is the opposite of the usual desktop advice.

### 3.4b The same sweep at 4K — and the resolution cap is never needed

The sweep was repeated at a **3840×2160** viewport, on the same real GPU,
with a 30-second warm-up and the same A/B/A design:

| switch | OFF | ON | Δ rAF/s | Δ lag |
|---|---|---|---|---|
| `r_lockpvs 1` | 57.86 (17.9 ms) | 56.50 (14.7 ms) | −1.36 | −3.1 ms |
| `r_drawviewmodel 0` | 59.03 (17.1 ms) | 48.80 (17.1 ms) | −10.23 | 0.0 ms |
| `hud_scale 1.0` | 58.43 (12.7 ms) | 60.09 (4.2 ms) | **+1.66** | **−8.6 ms** |
| `gl_vsync 0` | 50.65 (28.7 ms) | 54.38 (26.0 ms) | +3.73 | −2.7 ms |
| `fps_max 0` | 58.00 (15.5 ms) | 59.42 (17.6 ms) | +1.42 | +2.1 ms |
| `r_novis 1` | 51.11 (34.4 ms) | 20.09 (93.4 ms) | **−31.02** | **+59.0 ms** |

**At 4K — 8.3 megapixels, four times 1080p — the engine still holds
~58–59 rAF/s on integrated graphics.** The settled readings before the
sweep were 58.5, 55.7, 59.2 rAF/s.

So the engine is **not fill-bound at 4K either.** The 1080p cap does not
just fail to help at 1080p; it is not needed at 4K either, on this
hardware. `r_novis 1` at 4K is a disaster (−31 rAF/s, +59 ms of lag) —
which makes sense, since it makes the engine draw every entity in the
level, and at 4K that is a lot of fill.

The one switch with a consistent positive signal at 4K is **`hud_scale
1.0`** (+1.66 rAF/s, −8.6 ms of lag) — the HUD is drawn at `+hud_scale
2.5` (`xash-loader.ts:426`), which makes it a large scaled surface that
does *not* shrink when the 3D buffer does. That is worth a focused
re-measure before shipping, because the run-to-run spread in these
readings is ±5 rAF/s.

### 3.5 The `-Oz` vs `-O3` client WASM A/B

Both builds were run in the **real game against the real server** — the
local build of the frontend, the client WASM swapped between runs, the
server banner waited for before measuring, and five 5-second windows per
build.

**Four full cycles, run in BOTH orders.** The reversed order matters:
in three of the four cycles the build measured *second* came out ahead,
which is the signature of a position effect rather than a build effect.

| run | order | 1st rAF/s | 2nd rAF/s | 1st min frame | 2nd min frame | ahead |
|---|---|---|---|---|---|---|
| 1 | `-Oz` → `-O3` | 58.96 | 59.63 | 16.65 ms | 16.67 ms | 2nd (`-O3`) |
| 2 | `-Oz` → `-O3` | 59.97 | 59.32 | 16.64 ms | 16.74 ms | 1st (`-Oz`) |
| 3 | `-Oz` → `-O3` | 56.93 | 58.93 | 16.79 ms | 16.65 ms | 2nd (`-O3`) |
| **4** | **`-O3` → `-Oz`** | **57.21** | **58.40** | **16.67 ms** | **16.67 ms** | **2nd (`-Oz`)** |

**Run 4 is the decisive one.** With the order swapped, `-O3` was measured
first and `-Oz` second — and `-Oz` won. The build did not win; **the
position did.**

**And look at the minimum frame time.** Across all eight build
measurements, the fastest frame any build ever produced was **16.64 ms**
and the slowest of those best-case figures was **16.79 ms** — every one of
them within a whisker of **16.67 ms**, which is exactly 60 Hz
(1000/60 = 16.67). Neither build ever renders a frame faster than the
display's refresh period, because there is no faster frame to render. The
*average* differences between builds (2–3 rAF/s) are entirely about **how
many frames get dropped**, not about how fast the surviving frames run.

That is the whole finding in one column: **the client module's
optimisation level cannot change the frame time, because the frame time
is set by the display.** It can only change how often the main thread
misses a deadline, and that is governed by the server's state — how many
bots are alive, how much is being printed, where in the map cycle the
sample landed.

**The result is that there is no result.** Across four cycles the sign
flips twice, and the one cycle that controls for ordering shows the
"winner" following the position rather than the build.

The reason is visible in the per-window data. Run 1's `-O3` row: the lag
drops from ~16 ms to ~4 ms across the last three windows *of a single
run*. Run 3's `-Oz` row: 59.57, 55.62, 56.26, 59.38, 53.83 rAF/s. Neither
is an optimisation effect — it is the machine's state changing (the map
rolling over to a lighter one, bots dying, the client idling between
spawns). The measurement window is not long enough to average that out,
and the position effect sits on top of it.

**What the A/B does establish, firmly:**

- **The frame rate is identical.** Both builds sit at the display's
  refresh ceiling (56.9–60.0 rAF/s) and both have an identical best-case
  frame time of 16.64–16.79 ms (all of them 60 Hz). There is no frame to be
  won, and neither build wins one.
- **The client DLL is not the bottleneck.** It is a real chunk of work —
  HUD, prediction, effects — but on this hardware it is not what decides
  whether the game feels smooth. §3.1 already established that the engine
  is vsync-limited, and this says the same thing from the other side.

**So `-O3` is not worth shipping on performance grounds.** The honest
recommendation is unchanged in what it says about `-Oz` being the wrong
*default* for a speed-tuned module, but the measurement does not support
claiming a win. The `-msimd128` idea is untested and would need its own
A/B on the same harness — run in both orders.

**The method lesson, which generalises past this project:** a two-way A/B
measured once in a single order cannot distinguish a build effect from a
position effect. It takes a reversed-order run to make the difference,
and it is cheap. **If an A/B result flips sign between runs, run it in the
other order before believing either result.**

**The raw JSON for all four cycles is in `tools/perf/results/`**, so every
number in this section can be checked against the data that produced it.

---

## 4. The levers, ranked by what they are actually worth

### 4.1 Make the render resolution adaptive, not fixed

**The change:** replace the fixed `AUTO_MAX_PIXELS` constant with a measured
budget.

The policy already lives in one pure, import-free module
(`webxash/src/services/video-settings.ts`) with a 21-test unit suite
(`tests/unit/video-settings.test.mjs`). The policy is the *right* place to
change this, and the module's shape (pure functions, display passed in as an
argument) makes it testable.

**The cheap half first: the cap's default is simply wrong now.** The
measurements say a player with a real GPU gains **nothing** from the 1080p
cap — not at 1080p, and not even at 4K — and loses sharpness. So the
highest-value change today is not an adaptive scheme at all; it is
**raising or removing the default cap**, because on real hardware it is a
pure image-quality loss and buys nothing.

That said, a fixed constant cannot be right for everyone: the software
rasteriser case is real (a GPU-blocklisted browser, a remote desktop, a
broken driver, a very old machine), and there the cap is the difference
between 8 FPS and 60. So the end state is a measured policy:

On first run, measure the machine's actual frame budget — render at a known
resolution, time the frames, and pick the largest resolution that fits inside
a target frame time (say 11 ms, leaving headroom under 16.7 ms). Cache the
answer per device in `localStorage`, keyed on a coarse device signature
(`screen.width × screen.height`, `devicePixelRatio`, the renderer string).
Offer `auto` (measured), `display` (native, uncapped) and the fixed presets
as now.

**A cheaper way to get the same answer:** the engine is vsync-limited, so
the measurement only needs to distinguish "at the refresh ceiling" from
"not". Draw a handful of frames at 1080p and time them; if the worst frame
is comfortably inside the frame budget, the device is fast enough for
native resolution, and the cap can be raised to the display's own size.

**One caveat on the 4K result.** The test machine is a laptop with
*integrated* graphics (Radeon 780M-class, RADV RENOIR). It held 60 FPS at
4K, which is a strong result — but a 4K display is usually paired with a
discrete GPU, and the 4K case was measured on a 4K *viewport* rather than
on a 4K *panel*, so the browser was still compositing to a 1080p screen.
A real 4K player on a real 4K panel would also pay the compositor's cost at
4K. The adaptive policy handles this without anyone having to guess.

**Why this is the top lever:** it is the only one that makes the *right*
answer for every player without shipping a new build — and right now it is
wrong in both directions at once (over-capping strong machines, under-capping
weak ones).

### 4.2 Sweep the engine's cvars — measured, and there is nothing there

**This section originally proposed a sweep of the engine's performance
cvars as lever #2. The sweep was run. It found nothing. That result is
recorded here rather than quietly dropped, because "we checked" is worth
more than a plausible-sounding recommendation.**

The switches and what they were supposed to be worth:

| cvar | what it does | why it was expected to matter |
|---|---|---|
| `r_lockpvs 1` | freezes the Potentially Visible Set between frames | GoldSrc's BSP tree walk is the most expensive per-frame CPU work in the engine; locking it skips the walk. |
| `r_drawviewmodel 0` | skips the first-person weapon pass | The weapon is a **second full scene render** every frame. |
| `r_novis 1` | skips visibility entirely | Blunt instrument; measures the size of the visibility prize. |
| `hud_scale 1.0` | smaller HUD surface | The HUD is a separate scaled surface; its fill does not scale down with the 3D buffer. |
| `gl_vsync 0` | drops the GL backend's vsync | The browser's rAF is *already* vsync'd, so a second one could cost a frame. |
| `fps_max 0` | uncaps the engine's frame rate | The engine might be capping itself below the display rate. |

The measured result is in §3.4: **every one of them is neutral or harmful,
and `gl_vsync 0` is the worst of them.** The reason is the finding from
§3.1: at 1080p on a real GPU the engine is **already at the display's
refresh ceiling**, so there is no frame budget to recover. There is nothing
for these switches to give back.

**What this means:**

- **Do not ship these as defaults.** Shipping `r_lockpvs 1` would make the
  view pop as entities appear and disappear, and would make the game
  *slower*, for no benefit.
- **`gl_vsync` should stay on.** The desktop folklore ("turn vsync off for
  latency") is **wrong here**, and measurably so: turning it off cost 5.4
  rAF/s and added 11 ms of lag. In a browser the frame pacing is the
  browser's rAF, and removing the GL layer's vsync just lets frames pile up
  unevenly.
- **The switches still matter in the case where the machine is NOT at the
  ceiling** — a software rasteriser, or 4K. §5 measures the 4K case, and
  if the engine is fill-bound there, the resolution cap is the right lever
  and the cvars are a second-order one.

This is the value of having measured on the right hardware: **the
recommendation that survives is "there is nothing to do here",** which is
only knowable by measuring.

### 4.3 Rebuild the TS client WASM with `-O3` instead of `-Oz`

**Measured, and it did not produce a win.** The section stays because the
*argument* against `-Oz` is still sound — but the claim of a speed benefit
is not supported, and saying otherwise would be overclaiming.

`tools/port/tsp-rs/scripts/build-wasm.sh:99` runs:

```bash
wasm-opt -Oz --strip-debug "${WASM_OPT_FLAGS[@]}" "$SRC_TARGET" -o "$DEST"
```

`-Oz` optimises for **size**. `-O3` optimises for **speed**. For a module
whose entire job is to run 60 times a second on the player's CPU, `-O3` looks
like the obviously-correct choice — but "looks like" is not a measurement,
and the module is mostly *not* on the hot path (the engine's renderer does
the drawing; the client DLL does HUD, prediction and effects).

**This module is what production actually ships.** Verified by hash:

```
tools/port/tsp-rs/dist/ts-client_emscripten_wasm32.wasm
  0d8b3896d74acb73cdc5896420930537120a1c0d1bac1dd5ef204de08870d03a
webxash/public/cl_dlls/client_emscripten_wasm32.wasm
  0d8b3896d74acb73cdc5896420930537120a1c0d1bac1dd5ef204de08870d03a
https://bulletballet.dev/cl_dlls/client_emscripten_wasm32.wasm
  0d8b3896d74acb73cdc5896420930537120a1c0d1bac1dd5ef204de08870d03a
```

So the `-Oz` build *is* the production client. Both variants were built from
the same source with the same feature flags:

| build | size | functions |
|---|---|---|
| `-Oz --strip-debug` (production) | 1,676,915 B (1.60 MB) | 3,502 |
| `-O3 --strip-debug` | 1,691,006 B (1.61 MB) | 3,388 |

**The size argument for `-Oz` does not survive contact with the numbers:**
`-O3` is 14 KB larger (0.8%), and the module is fetched once and cached by
the service worker. There is no meaningful size pressure to buy speed with.

`tools/perf/ab-wasm-opt-level.cjs` builds both, swaps one into a local build
of the frontend, and runs the **real game against the real server** with
each, measuring over five windows. The result is in §3.5, and it is
**negative**: four runs in both orders, the build measured second ahead
three times out of four, and both builds with an identical best-case frame
time of 16.64–16.79 ms, all of them 60 Hz. The frame rate is identical
because both are at the refresh ceiling.

The harness supports `--reverse` to swap the order, and **that flag is
what turned this from "the sign flips, so it is noise" into an actual
explanation**: with the order swapped, the build that ran *second* still
won. The measurement was picking up the position, not the build.

**Recommendation: treat this as a neutral change, not a performance fix.**
It is defensible to switch (the size cost is negligible, and optimising a
hot module for speed is the right *default*), but it must not be presented
as making the game faster, because it does not measurably do so.

Two further flags worth an A/B on the same harness:

- **`-msimd128`** — WASM SIMD. The current build has **no `target_features`
  custom section at all**, so it is running with no SIMD and no relaxed SIMD.
  The CPU-side math in a player-movement and weapon-simulation module is
  exactly the kind of code SIMD accelerates well. This is a one-line
  addition to the same build script — and it needs the same A/B harness to
  be worth anything.
- **Keep the name section** (or drop `--strip-debug`) if the module is ever
  to be profiled — a stripped module is very hard to profile.

Note the engine WASM (`xash.wasm`) is **not** ours to rebuild — it comes from
the upstream `xash3d-fwgs` npm package. But the TS client DLL is built in
this repo, so it is in scope.

### 4.4 Rebuild the engine with WASM threads

Production already ships the headers that make this possible:

```
cross-origin-embedder-policy: credentialless
cross-origin-opener-policy: same-origin
```

Those are the COOP/COEP headers, which mean `SharedArrayBuffer` is available
in production — the precondition for WASM threads. The engine is currently
built single-threaded, so the main thread does everything: BSP visibility,
entity logic, the client DLL, the network, and the WebGL calls.

Moving the engine's render loop onto a worker thread would let the simulation
run concurrently with the frame. This is the deepest change on the list and
the one with the largest ceiling, but it also changes the input path (the
worker would need the pointer-lock deltas forwarded to it), so it is a
project rather than a patch.

### 4.5 Turn on the browser's low-latency canvas

**Free, unused, and on the latency path — but the measured input latency
now sets a low ceiling on what it can buy.**

Chrome supports a `desynchronized` hint on the canvas context. From the
Chrome team's own write-up:

> The `desynchronized` hint for `canvas.getContext()` invokes a different
> code path that bypasses the usual DOM update mechanism. Instead the hint
> tells the underlying system to skip as much compositing as it is able and
> in some cases, the canvas's underlying buffer is sent directly to the
> screen's display controller. This eliminates the latency that would be
> caused by using the renderer compositor queue.

**The plumbing already exists and is simply never used.** Emscripten's
runtime honours `Module.webGLContextAttributes` — it merges those attributes
into the context it creates:

```js
// node_modules/xash3d-fwgs/dist/raw.js
createContext(canvas, useWebGL, setInModule, webGLContextAttributes) {
  var contextAttributes = { antialias: false, alpha: false, majorVersion: 2 };
  if (webGLContextAttributes) {
    for (var attribute in webGLContextAttributes) {
      contextAttributes[attribute] = webGLContextAttributes[attribute];
    }
  }
  ...
}
```

But `webxash/src/services/xash-loader.ts` never sets it — the `module` object
it passes to the engine (`xash-loader.ts:665-708`) configures `print`,
`printErr` and `locateFile`, and nothing else. So the canvas is created with
the default attributes, and every frame goes through the normal renderer
compositor queue.

**The change** is one line in the loader's `module` object:

```ts
webGLContextAttributes: {
  desynchronized: true,
  preserveDrawingBuffer: true,
},
```

`preserveDrawingBuffer: true` is the companion — Chrome's guidance is that a
desynchronized canvas can flicker if the drawing code clears the screen, and
the engine does clear. It also makes the canvas readable for debugging
(a screenshot of a WebGL canvas without it comes back blank).

**Three honest caveats:**

1. **The ceiling is now known, and it is low.** §3.3 measured the game's
   own input-to-view latency at 7–11.5 ms — at or below one 60 Hz frame.
   `desynchronized` can only remove the *compositor's* presentation delay,
   which is a fraction of a frame. It cannot make the game respond in less
   than the frame it renders on. **Expect a small win, not a large one** —
   and it will be hard to measure through a harness whose own resolution is
   one frame.
2. **The evidence for the benefit is mixed.** The Chrome team's own demo
   shows it working, but an independent write-up
   (james.darpinian.com, "Input Latency: Platform-specific Considerations")
   reports being unable to wring any latency benefit out of
   `desynchronized`, `pointerrawupdate` or `OffscreenCanvas` on Windows.
   **This must be measured here, not assumed** — and the measurement needs
   to be sharper than one frame to see the effect, which may not be
   achievable with the current harness.
3. **It is Chromium-only.** Firefox and Safari do not implement it. It has to
   be feature-detected (`getContextAttributes().desynchronized`) and used
   conditionally, or it is simply ignored elsewhere.

Note also the pointer-lock side: `requestPointerLock` is called without
options (`XashCanvas.vue:180`), so the browser applies its default mouse
acceleration and smoothing. The `unadjustedMovement: true` option requests
**raw** mouse deltas, which removes the OS-level acceleration curve from the
aim. That is a feel change rather than a latency change — some players
prefer the acceleration — so it should be an option, not a default.

### 4.6 The client-side work that competes with the frame

**First, a correction to an earlier draft of this report.** The Vue HUD is
**off by default** — `showVueHud` is `?hud=vue` only
(`webxash/src/components/XashCanvas.vue:149-150`), because its values are
JS-simulated and would contradict the engine's own HUD. `TSHud.vue` is
therefore not mounted in a normal match, which means:

- `startLiveState()` — and with it the 4-second cvar polling loop over five
  cvars (`live-state.ts:179-182`) — **does not run in production**. It is
  called only from `TSHud.vue:369`.
- The four `TSHud.vue` intervals (500 ms pump stats, 1 s round timer, 5 s
  cash ticker, 9 s killfeed ticker, `TSHud.vue:372-439`) **do not run in
  production either**. They are demo-mode stubs, and the file says so.

So this lever is much smaller than it first looked. It is worth a cleanup
(the polling code is still reachable via `?hud=vue`, and the demo-mode
stubs should not be able to fire at all), but it is **not** a per-frame cost
for a normal player, and it is not where the win is.

What *does* run in production, on the main thread, every frame:

1. **The `ts_pump` tick** — `ts-pump.ts:92-105` calls
   `Cmd_ExecuteString('ts_pump_think')` on a **16 ms `setInterval`**, i.e.
   60 synchronous calls into the WASM module per second. This one is
   load-bearing: it *is* the game's frame clock, because the engine's
   loopback connect never completes in webXash, so the engine never
   dispatches the server frame loop and `g_pGameRules->Think()` never runs
   (`ts-pump.ts:11-22`).

   **The problem is the clock, not the work.** A `setInterval` at 16 ms cannot
   keep up if the frame takes 100 ms — the browser clamps the interval to
   the frame time, so under load the game logic silently runs slower than
   the render and the two drift apart. The fix is to drive the pump from
   the engine's own frame rather than from a timer, so the game logic and
   the render are the same clock by construction.

2. **The input bridge** (`keyboard-bridge.ts`) — installed from
   `XashCanvas.vue:218`, so it *is* live in production. On every gated
   keydown it issues **two** synchronous engine commands: `ts_gate 200`
   and then `+forward`/`+jump`/etc (`keyboard-bridge.ts:145-152`). Each
   is a `Cmd_ExecuteString` into the WASM module, on the main thread, in
   the same task as the input event. This is small in absolute terms, but it
   sits directly on the input path — the one place where added latency is
   felt rather than merely observed.

3. **The `exec` calls themselves.** `XashLoader.exec` is a synchronous
   `ccall` into WASM (`xash3d.js:51-54`). Every one of them blocks the main
   thread for the duration of the engine's command dispatch.


### 4.7 Consider `OffscreenCanvas` for the render loop

The engine draws into a `<canvas>` on the main thread. `OffscreenCanvas` would
let the render happen in a worker with the canvas transferred to it — a
different route to the same goal as §4.4, and cheaper to reach because it
does not require rebuilding the engine with threads. It does require the
engine's renderer to be able to target an `OffscreenCanvas`, which the
current Emscripten build does not.

---

## 5. Caveats

- **The test machine is a laptop.** AMD Ryzen 7 5700U (16 threads) with
  integrated Radeon Graphics (RADV RENOIR). Real players will have a mix of
  laptops, desktops with discrete GPUs, and low-end machines. The harness
  exists so that the *policy* can be measured per device rather than
  assumed.
- **The 4K result was measured on a 4K viewport, not a 4K panel.** The
  browser still composited to the machine's 1080p screen, so the
  compositor's own 4K cost was not exercised. A real 4K player on a real 4K
  panel pays that too — which is exactly why the recommendation is an
  adaptive policy rather than "remove the cap".
- **The engine takes a long time to reach steady state.** The settled
  readings before the 1080p sweep were 44.6, 52.3, 58.7 rAF/s across three
  consecutive 5-second windows after a 25-second warm-up. **Any measurement
  taken before the engine has settled measures the warm-up, not the thing
  being measured.** This is the single biggest trap in this work, and it
  produced a nonsense baseline the first time round.
- **Run-to-run spread is ±5 rAF/s.** Differences smaller than that in the
  cvar tables are noise. That is why the cvar conclusions are stated as
  "neutral or harmful" rather than as precise deltas.
- **A 5-second measurement window is not long enough to average the
  server's state.** The `-Oz` vs `-O3` A/B was run twice and the sign
  flipped. The per-window data shows why: within a *single* run the lag
  fell from ~16 ms to ~4 ms across three consecutive windows, which is
  the map rolling over to a lighter one, not the build changing. Any
  claim smaller than that drift needs a longer window or repeated runs.
  Two runs with opposite signs means "no reproducible difference", not
  "the second run corrected the first".
- **The event-loop lag figure varies between runs (4.2 ms to 16.9 ms
  median) while the frame rate does not.** Both were measured against
  production on the same machine, minutes apart, with the same server.
  The lag moved with the server's state — how many bots are alive, how
  much is being printed to the console — not with the render resolution.
  **The frame-rate numbers are the reliable ones** (56–60 rAF/s at every
  resolution in every run); treat any single lag figure as a snapshot of
  a busy moment.
- **The input-latency numbers are from a game session, not a benchmark
  harness.** The measured 7–11.5 ms is the client's own input-to-view
  path, timed on one clock inside the page. It does not include the
  compositor's presentation delay (which `desynchronized` would target),
  nor the display's own scanout, and it was measured on one machine with
  the button held — a player moving the mouse freely will see a similar
  input-to-view latency but a different *feel*. Two runs of 24 samples
  also cannot characterise the tail: run 2 had three outliers (21.2, 82.1,
  93.3 ms) that are reported but not explained. **Treat 6–13 ms as the
  typical case and the tail as an open question**, not as a measured p99.
- **The network path is not the bottleneck, and was not re-measured here.**
  It was measured on 2026-10-27: the browser→bridge→server round trip is
  ~32 ms from an idle page, and ~112 ms measured from inside the running
  game — a difference that is the page competing with itself. The server
  answers in one 10 ms tick; the wire is 4–6 ms. The client is the slow part.
  This run's network conditions were healthy: ICMP to the VPS measured
  3.4–4.3 ms.
- **Frame-rate numbers here are the *engine's* rAF rate**, which is the
  number that matters (it is the frame the player sees), but it is measured
  in a headless browser whose rAF cadence is not identical to a foreground
  tab's.
- **The engine's `-fullscreen` argument is a red herring for this question.**
  As recorded in `HANDOFF.md`, the engine's own borderless mode takes the
  *display's* resolution — more pixels, not fewer. The mode that honours a
  forced resolution is the engine's **windowed** mode, with the *browser's*
  fullscreen doing the filling. `webxash/src/services/fullscreen.ts` already
  gets this right, and the shipped defaults are `fullScreen: false` (the
  engine stays windowed) and `browserFullscreen: true` (the browser fills
  the screen).
- **A local build cannot be hosted by a plain static server.** The frontend
  fetches the server list from the *relative* path `api/servers`, so a
  local build shows "SCANNING FOR SERVERS…" forever and PLAY has no
  target. `tools/perf/serve-local-build.cjs` proxies `/api/*` to
  production to fix that.

---

## 6. Recommended order of work

| # | Change | Effort | Expected effect |
|---|---|---|---|
| 1 | Raise (or remove) the default render-resolution cap; make it measured per device | Medium | On a real GPU the cap buys zero frames — at 1080p *and* at 4K — and costs sharpness. This is the change that most directly answers "why is my game soft?" |
| 2 | Re-measure `hud_scale 1.0` on its own | Low | The only engine switch with a positive signal at 4K (+1.66 rAF/s, −8.6 ms lag); needs a focused run to confirm |
| 3 | Try `desynchronized: true` on the canvas context | Low | One line, unused plumbing. **But expect little** — input latency is already at or below one frame, so the compositor's delay is all that is left to win |
| 4 | Switch the client WASM to `-O3` (and A/B `-msimd128`) | Low | **Neutral, not a win** — measured over four runs in both orders; the winner followed the position, not the build. Defensible as the right default; not a performance fix |
| 5 | Drive the TS pump from the engine's frame instead of `setInterval` | Medium | Game logic stops drifting behind the render under load |
| 6 | Clean up the dead demo-mode HUD/polling code | Low | Not a per-frame cost today (the HUD is off by default), but it is a trap for whoever re-enables it |
| 7 | Move the engine onto a worker (WASM threads, or `OffscreenCanvas`) | High | The largest ceiling; changes the input path |

**What is explicitly NOT on this list**, because it was measured and did not
work:

- **The engine's own performance cvars** (`r_lockpvs`, `r_drawviewmodel`,
  `r_novis`, `gl_vsync`, `fps_max`). Every one of them was neutral or
  actively harmful at both 1080p and 4K. `gl_vsync` in particular should
  stay **on** — turning it off cost 5.4 rAF/s and added 11 ms of lag.
- **`-O3` as a performance fix.** Four A/B runs, in both orders. The build
  measured second came out ahead three times out of four, and both builds
  share a best-case frame time of 16.64–16.79 ms — all of them 60 Hz. The
  measurement was picking up the position, not the build.
- **Anything aimed at input latency.** It is already at 7–11.5 ms, at or
  below one 60 Hz frame. There is no backlog to remove.