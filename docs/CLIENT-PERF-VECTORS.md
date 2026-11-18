# CLIENT PERF: EVERY VECTOR, AND WHAT KILLED IT

**WHY THIS FILE EXISTS**

A player hit a 41.94 ms frame on `ts_lobbyduel` and asked why. The
honest answer at the time was "we do not know yet", and the useful
answer is a list of everything that COULD be responsible, what we have
already killed, and how to kill the rest.

So this is that list. It is a working document: every row is a vector,
a measurement, and a verdict. A vector with no verdict is a vector
nobody has looked at yet, and that is the point of writing them down.

**THE TARGET**

A buttery smooth 60 fps on a twenty-year-old game on modern hardware.
The engine has to fit inside a 16.67 ms frame at 60 fps, and inside
8.33 ms if it is to run at the 120 Hz the player's display offers. The
worst reading the whole bot x map matrix can produce -- the heavier map,
the production bot count, the worst viewpoint -- is **15.63 ms**, and
that is inside the 60 fps budget. The 41.94 ms window was **2.7x worse
than that**, so the question is not "how do we make the engine faster" --
it is "what made it 2.7x worse than its worst steady state, for a couple
of seconds".

**HOW TO READ THE VERDICTS**

- **RULED OUT** -- measured, and it is not the cause.
- **THE FIX** -- measured, it IS the cause, and it is fixed.
- **PRIME SUSPECT** -- the evidence points here and it is not measured.
- **UNMEASURED** -- nobody has looked. That is not the same as innocent.

---

## 1. THE READOUT WAS LYING ABOUT ITS OWN WARM-UP

**THE FIX. 2026-11-17.**

The player was told the 41.94 ms frame "describes the engine at steady
state and not its warm-up". It did not. The server rotates its map
roughly every **fifteen minutes**, and a map change makes the engine do at the
start of a map everything it did at the start of a match: load the BSP,
upload the textures, compile the shaders, rebuild the PVS.

The pacer anchored its warm-up on the engine's FIRST FRAME, so every
window after the first rotation was labelled "settled" -- and the
reading was taken **513 seconds into the match**, which is exactly
where a post-rotation transient would land.

| What | Before | After |
|---|---|---|
| Warm-up anchor | the engine's first frame | the later of the first frame and the last map load |
| The map's name | not recorded anywhere | on every timeline window, and on the snapshot |
| "Settled" after a rotation | yes, always | no, until the new map has warmed up |

The engine announces every map it loads on stdout
(`Loading map "ts_lobbyduel"`), and the loader hears that line. The
anchor is now the last map load, so a reading taken three seconds
after a rotation says so in words, and names the map.

## 2. THE EXPORT BUTTON EXPORTED NOTHING

**THE FIX. 2026-11-17.**

The "Export log" button lives on the landing page, and the landing
page has no engine: its live state is a 300x150 placeholder canvas
with no game behind it. The export was built from the live page state,
so every number in the file was zero and the timeline was empty **by
construction, on the one page where a player would press the button**.

The file Kyle sent to prove it was not subtle: `timeline: []`,
`pacing.reason: "not measured yet"`, `backingWidth: 300`.

The timeline is module state, and a match ends with a page load that
destroys it -- so it now travels in the snapshot, in `sessionStorage`,
with the map name on every window.

| What | Before | After |
|---|---|---|
| Export on the landing page | empty by construction | the last match's timeline, from the session |
| The pacer's state in the export | zeroes | the session's state |
| The report's source | `live` | `last-session` |

## 3. THE FIXTURE WAS NOT THE FIXTURE

**THE MEASUREMENT WAS TAKEN AT A BOT'S POSITION, NOT AT THE VIEWPOINT.**

The perf client joins as an **observer**, and an observer's camera
follows a living player. With no bots on the server there was nobody to
follow, so `ts_tp` put the camera on the fixture and it stayed there.
With bots on the map the camera tracked **a bot** -- and the measurement
was taken at wherever that bot happened to be.

That is the worst kind of bug in a measurement: it does not fail, it
produces numbers. The 8-bot run looked like the discovery of the day
("the bots triple the engine's cost") while the camera was flying around
the map at 400 units a second.

| What | Before | After |
|---|---|---|
| The camera | follows a living player | **roaming** (`ts_observe <player#> 3`): it stays where it is put |
| The "walk forward while it measures" | on | **off**: the camera is a free-flying observer, so walking moves it hundreds of units |
| A reading's fixture | assumed | **checked** against the server's own status, and re-measured if it drifted |
| The output | a cost | a cost **and how far the camera ended up from the fixture** |

**THE LESSON IS GENERAL: A FIXTURE IS AN ASSERTION, AND NOTHING CHECKS IT
FOR YOU.** `ts_tp` says it moved the player. It does not say the camera
stayed there afterwards, and it cannot -- the camera is the client's.
So the harness has to read back where the player ended up (the server's
own status is the truth about the player) and put the drift in the
output next to the number.

A cost measured somewhere else is not a number about the map. It is a
number about the map, at a place nobody chose, wearing the map's name.

**AND THE SERVER'S IDEA OF THE PLAYER IS NOT THE CAMERA.** The server
goes on believing the player is where it put it while the client
interpolates somewhere else -- and then the client arrives and the
camera is somewhere else AGAIN, because the client owns the camera.
Measured: the same fixture, the same bot count, **16.63 ms** with the
camera at the fixture and **2.19 ms** with the camera somewhere else,
with nothing in the output saying so.

So the harness now checks the CLIENT's own view -- the position AND the
yaw -- and a reading whose camera left the fixture is discarded and
re-measured instead of being reported as that viewpoint.

**WHAT IS LEFT IS THE SCENE, AND IT IS NOT SMALL.** With the camera
verified, three runs of the same six viewpoints, sixteen bots, the same
rig:

| Viewpoint | run 1 | run 2 | run 3 | spread |
|---|---|---|---|---|
| 1 | 9.01 ms | 4.35 ms | 8.33 ms | **2.3x** |
| 2 | 5.53 ms | 9.04 ms | 6.97 ms | 1.6x |
| 3 | 5.42 ms | 5.07 ms | 5.33 ms | 1.1x |
| 4 | 3.07 ms | 2.57 ms | 2.34 ms | 1.3x |
| 5 | **16.63 ms** | **17.35 ms** | **17.19 ms** | **1.1x** |
| 6 | 2.20 ms | 3.55 ms | 3.93 ms | 1.8x |

The heavy viewpoint is stable to 6%, and the mid-cost ones swing by 2x.
**The engine's cost follows what is IN SHOT**, and how many of the
sixteen bots are in shot of a given viewpoint is not a thing the
fixture controls. So the matrix's heavy-viewpoint numbers are solid, and
its mid-range numbers are single samples of a scene.

## 3b. THE CONTROLLED SCENE, AND WHAT IT KILLED

**THE BOTS' PRESENCE IS FREE. THEIR ACTIVITY IS NOT.**

With the bots **frozen** (`ts_bot_stop 1`, which skips their AI) and
**placed at fixed positions around the camera** (`ts_tp` works on any
client index), the scene is identical on every run. And the engine's
cost at the heavy viewpoint, with all sixteen bots in view, is:

| The scene | The engine's cost |
|---|---|
| 16 bots, frozen and placed in view | **2.76 ms** |
| the same camera, the bots awake and fighting | **15.63 - 17.35 ms** |

So the thirteen milliseconds are not the bots' models, their transforms
or their place in the PVS. **They are the bots FIGHTING**: the shots,
the blood, the gibs, the decals, the entities they spawn, the network
messages, and the map changing under the camera as they move.

**AND EVERY SWITCH IS WORTHLESS ON THAT SCENE.** The same controlled
scene, swept, with a noise floor of **0.08 ms**:

| The switch | The cost |
|---|---|
| baseline | 2.76 ms |
| `hud_scale 1.0` | 2.81 ms |
| `r_decals 0` | 2.77 ms |
| `mp_decals 0` | 2.79 ms |
| `cl_himodels 0` | 2.73 ms |
| `r_drawviewmodel 0` | 2.76 ms |
| no blood, no gibs | 2.80 ms |

**Nothing. Not one of them.** Not the HUD, not the decals, not the
detailed player models, not the blood. The earlier "4K sweep saw
`hud_scale 1.0` save 8.6 ms" did not survive a controlled scene, and the
project's own rule -- *a lever must win in EVERY appearance to be real*
-- is why it was suspect in the first place.

**THE SCENE VARIANCE WAS THE SCENE.** The same camera measured 17.35 ms
in one run and 2.84 ms in another, with the camera verified in both.
The difference was how many of the sixteen bots were awake and in the
player's cluster. **A pinned camera does not pin a scene**, and the
harness could not tell the difference until the bots were frozen.

## 3c. THE ENGINE'S ACTUAL DEFAULTS, READ BACK

**THE NOTES WERE WRONG ABOUT WHAT THE CLIENT SHIPS.** These were read
out of the running engine, not assumed:

| The cvar | The notes said | The engine says |
|---|---|---|
| `cl_himodels` | 1 | **0** -- the detailed player models are already OFF |
| `mp_decals` | 300 | **999** |
| `r_decals` | 4096 | **999** |
| `cl_updaterate` | (not recorded) | **80** |
| `cl_cmdrate` | (not recorded) | **80** |

So the "detailed player models" vector was never switched on, and the
decal budget was never the number in the notes. It also means the
`cl_himodels 0` rows in the sweeps below were sweeping a setting that
was **already off** -- which is why they showed nothing.

## 3d. THE PIXELS, ON A SCENE THAT IS MOVING

**THE RESOLUTION RESEARCH WAS MEASURED ON A STILL SCENE.**

The engine's cost was flat across an 8.4x resolution sweep, `gl.finish`
was 0.00 ms, and a 6.11 MP tour canvas ran the engine at 1-11 ms. So
the note in the client's own source said a device-pixel budget would
"cost sharpness for zero frames", and the sharp one was shipped.

Every one of those measurements was taken with the scene **still**. With
sixteen bots frozen and placed in view, 14x the pixels moved the
engine's cost by **0.00 ms**. So the conclusion was true -- and useless.

**THE SAME TOUR, THE SAME SIX VIEWPOINTS, THE SAME FIXTURE (verified
6/6), AT THE PLAYER'S 6.7 MP INSTEAD OF THE RIG'S 0.48 MP:**

| Viewpoint | at 0.48 MP | at 6.7 MP | |
|---|---|---|---|
| 1 | 14.24 ms | 13.64 ms | 0.96x |
| 2 | 6.78 ms | 6.21 ms | 0.92x |
| 3 | 5.10 ms | 6.85 ms | 1.34x |
| 4 | 2.25 ms | 2.76 ms | 1.23x |
| 5 | **15.63 ms** | **25.15 ms** | **1.61x** |
| 6 | 2.41 ms | 5.11 ms | 2.12x |

The heavy viewpoint goes from 60 FPS to **32**, with **60% of the frames
late**. The quiet viewpoints barely move: it is the busy scene that
pays for the pixels, because the busy scene is the one with work in it.

**AND THE BUDGET WAS IN THE WRONG UNITS.** The engine's mode is in CSS
pixels and the device pixel ratio is applied on top, so the backing
store is the CSS size times the ratio in **both** dimensions. The
`auto` policy budgeted the CSS size, so a 2x display rendered **four
times** the pixels the budget allows: the player's session was **6.7
megapixels** against a budget of **2.07**.

So `auto` now budgets the backing store, and `display` is still there
for the player who wants the sharpness.

## 3e. THE PLAYER'S OWN MACHINE, AND WHAT IT CHANGED

**THE MACBOOK CAME BACK ONLINE, AND THE MEASUREMENT WAS TAKEN ON IT.**

The rig is a Ryzen 7 5700U (a 2020 laptop APU) in headless Chromium.
The player's machine is an M3 Pro, 3456x2234 Retina, in Vivaldi. Same
map, same sixteen bots, same rig server, the client's camera pinned and
verified:

| viewpoint | the rig | the MacBook |
|---|---|---|
| the heavy one, at the rig's canvas | 15.63 - 17.35 ms | -- |
| the heavy one, at 6.5 MP | 25.15 ms | 21.28 ms, 84% late |
| the same viewpoint, the next run | -- | **2.82 ms**, 23% late |
| the same viewpoint, at a 0.5 MP canvas | -- | **37.00 ms**, 89% late |
| another viewpoint, the same run | -- | **59.54 ms**, 86% late |

**THREE THINGS FELL OUT OF THAT, AND ONE OF THEM OVERTURNED A
CONCLUSION.**

**1. THE PIXELS ARE NOT THE STORY ON HIS MACHINE.** The 0.5 MP canvas
measured SLOWER than the 6.5 MP one. The rig's 1.61x at the heavy
viewpoint is real and repeatable (four runs at the small canvas within
6%), but on the player's machine the scene's state swamps it. The
resolution fix is still right -- the budget was in the wrong units -- but
it is second order, not the headline.

**2. THE SCENE'S STATE IS THE HEADLINE.** The same camera, the same
canvas, the same sixteen bots measured 2.82 ms, 21.28 ms and 37.00 ms in
three runs, and 59.54 ms at another viewpoint. That is a twenty-fold
swing, and it is not the pixels, the map's content, or the cvar
settings. It is what the bots are doing.

**3. HIS DISPLAY IS 120 Hz, SO THE BUDGET IS 8.33 ms.** The original
readout said "display budget 8.33 ms" -- it was measuring against a
ProMotion refresh rate, not 60. The engine's best case on that machine
is 2.1-2.4 ms (no bots), so 120 fps is reachable when nothing is
happening. With sixteen bots fighting, the worst case is 40-60 ms --
five to seven times the 120 fps budget, and two and a half to four times
the 60 fps budget.

**AND THE ENGINE ALREADY SCALES ITS PARTICLES WITH THE FRAME TIME.**
`FX_AdaptQuality` (`0x10057a70`) samples the frame time every 0.1 s and
maps the mean from 1.11..3.33 (of 1/100 s) onto a quality of 1..0,
which scales the particle count (the multiplier is `max(2q, 0.1)`), the
spawn interval, the muzzle dynamic lights, the shell life, and the
physics divisor (the particles are updated every 6th frame below q =
0.374). So the particles cannot be the whole story either: the engine
has already scaled them down when the frames are slow.

That leaves the drawing itself, the gore, the trails and the network --
and the decomposition sweep is the test.

## 4. THE BOT x MAP MATRIX

**MEASURED. 2026-11-17, on the CI rig, with a fixture that holds.**

Six runs: two maps, three bot counts, the same six viewpoints, the same
pinned fixture — **6/6 viewpoints held in every run, drift 0** — ten
seconds per viewpoint. The rig's bot target is `TS_BOT_TARGET`, and the
registry keeps `TARGET - humans` bots, so the tour's own player is
counted out.

| Map | Bots | Engine cost, median | Engine cost, worst | Late frames | Gate |
|---|---|---|---|---|---|
| `ts_lobbyduel` | 0 | **4.17 ms** | 8.58 ms | 0.0% | open |
| `ts_lobbyduel` | 8 | **4.91 ms** | 14.15 ms | 2.5% | open |
| `ts_lobbyduel` | 16 | **5.94 ms** | **15.63 ms** | 6.8% | **30 fps at the heavy views** |
| `ts_casa` | 0 | **2.85 ms** | 6.44 ms | 0.0% | open |
| `ts_casa` | 8 | **3.29 ms** | 8.10 ms | 0.0% | open |
| `ts_casa` | 16 | **3.24 ms** | 6.49 ms | 0.0% | open |

**THE MAP IS THE HEAVIER ONE, BUT NOT BY MUCH.** `ts_lobbyduel` costs
**1.46x** `ts_casa`'s median at the same bot count (4.17 vs 2.85 ms), and
`ts_casa` has **3.4x** the entities and **4x** the faces. So Kyle's
instinct was right — the level IS the heavier one — and the static
content is not what makes it heavy.

**THE BOTS COST TWICE AS MUCH ON THE SMALL MAP.** On `ts_lobbyduel`,
sixteen bots add **+5.7 ms** at the heavy viewpoint (8.58 -> 14.24 ms)
and take the late fraction from 0% to **6.8%** — and that is what made
the pacer engage its 30 fps cap. On `ts_casa`, sixteen bots add **+0.4
ms** (2.85 -> 3.24 ms). The bots are spread over a big map and few of
them are visible; `ts_lobbyduel` is a small arena and they are all in
shot. **The bot count's cost is a function of how many bots are VISIBLE,
which is a function of the map.**

**AND THE WHOLE MATRIX IS STILL 2.7x SHORT OF THE 41.94 ms.** The worst
number the matrix can produce — the heavier map, the production bot
count, the worst viewpoint — is **15.63 ms**. Kyle's bad window was
**41.94 ms**. The map and the bots together do not explain it.

So the map vector is MEASURED (a real one: 1.46x), the bot vector is
MEASURED (the bigger of the two on this map: +5.7 ms), and **neither of
them reaches 42 ms.**

## 5. THE VECTOR LIST

| # | Vector | How it is measured | Verdict | Evidence |
|---|---|---|---|---|
| 1 | Resolution / pixel count | a resolution sweep on a still scene, and then the same sweep on a busy one | **THE PIXELS ARE FREE ON A STILL SCENE AND NOT FREE ON A BUSY ONE** | with sixteen bots frozen, 14x the pixels moved the cost by **0.00 ms**; with them fighting, the same 14x cost **1.61x** at the heavy viewpoint -- **15.63 ms to 25.15 ms**, 60 FPS to 32 (section 3d) | cost was flat across an **8.4x** sweep; `gl.finish` **0.00 ms**; a 6.11 MP tour canvas ran the engine at **1-11 ms** (`CLIENT-PERF-RESULTS.md`) |
| 2 | GPU fill / rasterisation | `gl.finish` in the same window | **RULED OUT** | the backlog was ~0, so the cost is CPU; the client was hardware accelerated (ANGLE Metal, M3 Pro) |
| 3 | The frame cap | the pacer's own state | **RULED OUT** | 22 fps is the engine's UNCAPPED rate (1 / 0.04194 = 23.8 fps); no cap was in force |
| 4 | The pacer's own wait | the callback's boundaries | **RULED OUT** | the deliberate alignment wait is OUTSIDE the timed callback, so it cannot inflate the frame cost |
| 5 | A leak in the pacer's arrays | the source | **RULED OUT** | samples are trimmed at 240 and the history at 900 |
| 6 | A browser that is throttling | the idle panel rate vs the live tick rate | **RULED OUT** | the browser was delivering 120 refreshes a second |
| 7 | `glGetError` round trips | `measure-geterror-ab.cjs` | **RULED OUT** (fixed earlier) | **8.89 ms -> 1.91 ms**; the patch is live |
| 8 | Static map content | BSP lumps, parsed | **RULED OUT** (the map is still 1.46x the median) | `ts_lobbyduel` has **161 entities, 4095 faces, 29 KB of PVS, 3 lights** -- the second-lightest of the twenty maps with nav data. `ts_casa` has **3.4x** the entities and **4x** the faces and measured **CHEAPER** (4.31-4.52 ms vs 8.20-10.12 ms) |
| 9 | Slow drift over a long session | a 13.7-minute session (2026-11-09) and an 8-minute sampled one on the rig (2026-11-17) | **RULED OUT** (for both) | the first stayed at or below **11.85 ms** with **0% late frames**; the second ran 16 bots on `ts_lobbyduel` for **479 s** with a median of **8.49 ms**, a p90 of **15.47 ms** and a maximum of **17.83 ms** -- and no upward drift |
| 10 | The warm-up anchor | the map's load line on stdout | **THE FIX** (section 1), and the transient is now SMALLER than it looked | the readout called a post-rotation window "settled"; a map load costs **274-1415 ms**, and the rig's post-load warm-up peaked at **15.00 ms** -- so a rotation alone does not reach 42 ms |
| 11 | The empty export | the exported file | **THE FIX** (section 2) | `timeline: []` on the landing page, by construction |
| 12 | **The bot count** | the rig, 0 / 8 / 16 bots, same fixture, fixture verified | **MEASURED** | 16 bots add **+5.7 ms** at the heavy view on `ts_lobbyduel` and **+0.4 ms** on `ts_casa`; the late fraction goes 0% -> **6.8%** and the pacer engages (section 4) |
| 13 | **TS 3.0 debris on breakables** | the active-scene sweep, and a controlled "break 20 columns" run | **PRIME SUSPECT** | the thirteen milliseconds are the bots' ACTIVITY (section 3b), and debris is activity | TS 3.0 has `break_debris_from_hit()` on and `debris_count_by_quality` on; every breakable that is shot makes debris, and nobody has ever counted the debris |
| 14 | **Decals** | `r_decals` / `mp_decals` on the controlled scene | **RULED OUT as a static cost** | 2.77 / 2.79 ms against a 2.76 ms baseline -- noise is 0.08 ms. What the bots SHOOT can still make decals; that is the active-scene sweep | the client ships `mp_decals 300` against the engine's `r_decals` default of **4096**, and TS is effect-heavy |
| 15 | **HUD scale** | `hud_scale` on the controlled scene, and at the player's 6.7 MP | **RULED OUT** | 2.81 ms against 2.76 ms; and at 6.7 MP, `hud_scale 1.0` was 3.56 ms against 3.61 ms. The old "8.6 ms" did not survive | the client ships `hud_scale 2.5`; an earlier 4K sweep saw `hud_scale 1.0` save **8.6 ms** |
| 16 | **Violent effects** | `violence_*` on the controlled scene | **RULED OUT as a static cost** | 2.80 ms against 2.76 ms -- but the bots were FROZEN, so no blood was being made. The active-scene sweep is the real test | never swept |
| 17 | **Detailed player models** | `cl_himodels 0/1` on the controlled scene, 16 bots in view | **RULED OUT as a static cost** | 2.73 ms against 2.76 ms | the client ships `cl_himodels 1`, and production runs 16 bots |
| 18 | **Heap and GL-texture retention across rotations** | the WASM heap and the GL object count, sampled across three rotations | **UNMEASURED** | the match rotated three times, and a map load costs **274-1415 ms**; whether the previous map's textures are released is not known |
| 19 | **The browser** | the same measurement in Vivaldi and in Chrome | **UNMEASURED** | the failing session was **Vivaldi** (UA `Chrome/152`); every controlled measurement was **Chrome 157** |
| 20 | **What was on screen** | the fixture, checked against the CLIENT's own view -- position and yaw | **THE FIXTURE WAS NOT THE FIXTURE, AND THE SCENE IS STILL LOOSE** (section 3) | the engine's cost is **3-5x** different depending on the view; the failing window's view is not known, and the timeline now records the map so it can be found |
| 21 | **The map rotation's frequency** | the production's own logs | **CORRECTED** | the rotation is every **~15 minutes** (`ts-0`: 00:36 -> 00:51 -> 01:06), not every 3 minutes: `roundtime` is **INERT in FFA**, so the round does not end on a timer. So the 41.94 ms window at 513 s into a match was probably **not** next to a rotation |
| 22 | `r_lockpvs` | an A/B | **RULED OUT as a fix** | it HURT: the rAF rate fell by **5.7** at 1080p. It is a knob to leave alone |

## 6. THE ORDER OF WORK

The cheap, certain ones first, because they are the ones that make
every later measurement trustworthy:

1. **The readout tells the truth** (sections 1 and 2). Done. Without
   it, every future report is a report about a window nobody can find.
2. **The bot count** (12). **DONE** — the rig matrix, 0 / 8 / 16 bots
   on `ts_lobbyduel` and on `ts_casa`, same fixture, same viewpoints
   (section 4). The bots cost **+5.7 ms** on the small map and **+0.4
   ms** on the big one, and the map costs **1.46x**. Neither reaches
   42 ms.
3. **The long run** (13, 18). One 15-minute session on one map, with
   the engine's entity count, particle count, decal count, WASM heap
   and frame cost sampled every 10 seconds, and 20 breakables
   destroyed on purpose halfway through. If the curve rises, it is a
   leak; if it steps up at the breakables, it is the debris.
4. **The switches that have never been swept** (14, 15, 16, 17). Each
   one is an A/B/A on the same fixture, interleaved so the drift
   cancels, with the engine's cost as the number. Four of them is an
   afternoon of rig time and they are all "free" wins if they land.
5. **The browser** (19). One run on Kyle's M3 Pro in Vivaldi and one
   in Chrome, same map, same fixture, same bot count. This is the one
   vector that cannot be measured on the rig, because the rig's
   browser is not the player's browser.

## 7. WHAT WOULD SETTLE THE 41.94 ms WINDOW TODAY

The export button now carries the match's timeline with the map name
on every window. One export from a bad session answers most of it:

- the windows around the 42 ms reading, **with their maps**;
- whether the cost was a single spike or a plateau;
- how many rotations happened before it, and whether the cost sits
  next to one.

If the bad window sits next to a map change, it is the warm-up (1),
and the fix is to stop calling it steady state until the engine has
settled on the new map. If it does not, it is one of rows 12-19, and
the next measurement is the one that kills it.

---

**THE SOURCES**

- `docs/CLIENT-PERF-RESEARCH.md` -- the measurements and what they
  killed.
- `docs/CLIENT-PERF-RESULTS.md` -- the result tables.
- `docs/CLIENT-PERF-PACING-PLAN.md` -- the pacer's policy.
- `tools/perf/` -- the harnesses. `measure-pacing-tour.cjs` is the
  instrument for anything that needs a map, a fixture and a tour.
