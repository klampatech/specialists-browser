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
made the experience worse. All three are fixed in `0f3c7f3`.

| finding | the naive fix | what was done instead |
|---|---|---|
| the tick count was rounded to the NEAREST one, so on a panel whose rate is not a multiple of a standard rate (100, 75, 165 Hz) the cap could round to one frame in one tick | `ceil` instead of `round` | the promise that matters is PHYSICAL: the engine draws one frame every N ticks, so the slot is N/panelHz long and a frame that does not fit in its slot judders. The gate is now at least the number of ticks the frame needs. `ceil` would have **halved** the frame rate on those panels — the exact failure mode this work exists to avoid. |
| `computeFrameTarget(120, 0)` could produce a ~1 fps gate | clamp the cost | a measurement that cannot be used produces NO gate |
| a NaN panel or cost could produce a NaN gate, and `tick % NaN` is never true, so the engine would never have drawn again | clamp the input | same: no gate |

---

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
