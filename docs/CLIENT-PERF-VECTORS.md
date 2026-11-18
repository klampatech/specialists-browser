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

## 5b. THE BUILD FLAGS ARE NOT THE LEVER (measured 2026-11-18)

Two client DLLs, the same camera, the same scene, interleaved, three
rounds each:

- **A** -- the shipping build: rustc `opt-level = "z"`, `wasm-opt -Oz`.
- **B** -- `opt-level = 3`, `+simd128`, `wasm-opt -O3`. About 35% larger.

| view | A (ms) | B (ms) | change |
|---|---|---|---|
| 1 | 4.15 / 5.13 / 8.05 | 5.06 / 5.96 / 4.98 | -1.4% |
| 2 | 6.49 / 7.81 / 7.34 | 8.68 / 7.00 / 7.18 | -2.2% |
| 3 | 3.45 / 2.87 / 2.69 | 2.50 / 2.71 / 2.48 | -12.9% |

All nine readings: A median 5.13 ms, B median 5.06 ms, **-1.4%** -- inside
the noise.

The decisive number is A's own spread at view 1: **4.15 ms and 8.05 ms
for the same build, at the same camera, in the same session.** The scene
moves the cost by 2x; the compiler flags move it by 1-2%.

**So the size-optimized, no-SIMD build of the Rust client is NOT the
cause of the 41.94 ms frame.** The faster build is worth shipping
because it is free to do so, not because it fixes anything.

The SIMD build loads and renders correctly: the engine's WASM runtime
accepts the module, and the measured scene is unchanged.

## 5c. TESTING A DIFFERENT CLIENT BUILD WITHOUT TOUCHING PRODUCTION

The rig serves the same bundle production serves, so a new WASM cannot
be tried there. The recipe that works, all of it on the disposable
rig:

1. Build the bundle with a **relative asset base** (no
   `VITE_ASSET_BASE`), so the client asks for `/hl/ts/manifest.json`
   on its own origin.
2. Serve `webxash/dist` from a local HTTP server that also proxies:
   - `/api/*` to the rig (the registry);
   - `/bridge` as a WebSocket relay to the rig's bridge;
   - **anything not in the bundle** to `https://assets.bulletballet.dev`
   -- the asset host sends no CORS headers, so a page on another origin
   cannot fetch the game files at all.
3. Send **`Cross-Origin-Embedder-Policy: credentialless`**, the same as
   production. `require-corp` blocks the asset host's files and the
   engine never boots.
4. Build with **`VITE_BRIDGE_ADDRESS=localhost:8090`**, or the client
   connects to the fleet's public bridge and the page's cross-origin
   isolation breaks.
5. **Relay the WebSocket's query string.** It carries
   `?address=<ip:port>`, and the bridge refuses anything it does not
   recognise.
6. **Close the stale tab first.** The client allows one game instance
   per browser; a leftover tab holds it and the new page connects to
   nothing, with no error anywhere.

## 5d. THE DRAW-CALL SIGNATURE — MEASURED, AND IT POINTS AT THE TRIANGLES

The probe works now (it hooks `HTMLCanvasElement.prototype.getContext` and
wraps the CONTEXT INSTANCE, not the built-in prototype — patching the
prototype broke the engine's `instanceof` checks and stopped the render,
which is why the first probe measured 0.02 ms of nothing).

`ts_lobbyduel`, 17 bots, the rig's Chromium, the camera held on a
nav-node viewpoint:

| view | GL calls | draws | `bufferData` | `vertexAttribPointer` | `drawArrays` | `bindTexture` | JS-side ms |
|---|---|---|---|---|---|---|---|
| 1 | 8,139 | 1,683 | 3,061 | 3,061 | 1,641 | 312 | 0.004 |
| 2 | 2,104 | 554 | 758 | 758 | 553 | 22 | 0.001 |
| 3 | 4,210 | 947 | 1,573 | 1,573 | 919 | 90 | 0.002 |

**WHAT THIS SAYS, EXACTLY:**

1. **The frame is thousands of GL calls, not one slow thing.** 2,100–8,100
   calls a frame, of which 550–1,680 are actual draws.
2. **The vertex data is re-uploaded every frame.** `bufferData` runs
   about twice per draw, and `vertexAttribPointer` once per draw — the
   vertex layout is re-specified and the buffer re-uploaded for every
   batch, every frame. Nothing is cached.
3. **The JavaScript-side submission time is essentially ZERO** — 0.004 ms
   for 8,139 calls. The browser queues the commands cheaply; the main
   thread is not waiting on the GL boundary. **So the boundary is NOT
   where the frame's time goes** — the engine's own WASM work is.
4. **The multiplier is the number of triangles.** A quad is one draw plus
   two buffer uploads plus one attribute pointer. 1,641 draws is 1,641
   quads' worth of geometry submitted per frame, and the port emits its
   particles, HUD, viewmodel and gore through the engine's triangle API.

**⇒ The port's triangle count is the multiplier, and the upstream engine
turns each one into its own GL batch.** That is the root cause to chase,
and it is a port-side lever: fewer triangles, or a path that batches
them.

The port already has `FX_AdaptQuality` — but it is faithful to TS 3.0
(the tests pin its exact bit patterns), and at a 16 ms frame it scales
almost nothing: the quality factor is ~0.96 at 25 ms and only saturates
at 50 ms.

## 5e. WHERE THE DRAWS COME FROM — THE ATTRIBUTION

One command at a time, on the same map, the camera held on the same
viewpoint, the probe counting. **The draw count is the signal** — it
moves ~1% between runs of the same scene, where the frame cost moves by
2x (the cost column below is unreadable for exactly that reason, and is
in the table only so nobody has to wonder).

| setting | calls | draws | drawArrays | bufferData | cost ms | change in draws |
|---|---|---|---|---|---|---|
| baseline | 7,721 | 1,633 | 1,613 | 2,951 | 8.31 | — |
| `r_drawentities 0` | 5,025 | 1,135 | 1,134 | 1,920 | 16.86 | **-30.5%** |
| `r_decals 0` | 6,208 | 1,348 | 1,329 | 2,366 | 7.59 | **-17.5%** |
| `cl_gore 0` | 6,547 | 1,391 | 1,337 | 2,489 | 26.29 | **-14.8%** |
| `r_drawviewmodel 0` | 6,871 | 1,461 | 1,425 | 2,609 | 6.42 | **-10.5%** |
| `cl_fx 0` | 7,066 | 1,495 | 1,455 | 2,691 | 19.20 | -8.5% |
| `cl_updaterate 20` | 7,778 | 1,624 | 1,587 | 2,962 | 25.24 | -0.6% |

**WHAT IT SAYS:**

- **The entities are the biggest chunk: 30%.** Sixteen bots' models.
- **The decals are 17.5%** — and the cap in force is `r_decals 999`.
- **The gore is 15%** (the blood and the gibs).
- **The viewmodel is 10.5%** — the weapon in your hands, drawn every
  frame.
- **The particles are 8.5%** — the smallest, because `FX_AdaptQuality`
  already scales them.
- **The network is not a draw multiplier at all** (-0.6%). Whatever the
  update rate costs, it is not geometry.

**⇒ THE PORT-SIDE LEVERS, IN ORDER:** the decal cap (999 is not a
sensible default for a browser), the gore level, the viewmodel, and the
entities' model detail. Every one of them is a cvar the port or the
engine already has.

**THE COST COLUMN IS THE SCENE MOVING.** `r_drawentities 0` cost 16.86
ms and `cl_gore 0` cost 26.29 ms — because the bots were fighting
differently in those runs. A setting that removes work can read as
"more expensive" if the fight got worse. That is why the draw count is
the instrument here, and why every earlier cost-based sweep of the same
kind was noise.

## 5f. THE COST IS THE SCENE — AND THE DRAW COUNT IS NOT THE COST

Three measurements, two machines.

**THE SAME SCENE, ONE SESSION, ONE MACHINE.** The toggle harness flips
one engine command on and off in eight-second windows, so both arms are
samples of the SAME fight, seconds apart.

On the M3 Pro (`r_drawentities 1` vs `0`):

| round | ON | OFF |
|---|---|---|
| 1 | 22.03 ms, 1,665 draws | **22.03 ms, 819 draws** |
| 2 | 1.70 ms, 942 draws | 2.19 ms, 797 draws |
| 3 | 4.12 ms, 1,681 draws | 1.90 ms, 2,617 draws |

**Round 1 halved the draws and the cost did not move at all.** Round 3
had MORE draws with less than half the cost. The cost in that session
ranged **1.70 to 22.03 ms — thirteen times** — with the same map, the
same bots and the same machine.

**⇒ THE DRAW COUNT DOES NOT DRIVE THE COST. The attribution in 5e says
where the geometry comes from; it does NOT say that removing geometry
removes time.** Halving the entities, the decals, the gore or the
viewmodel is worth nothing on its own.

**THE FROZEN SCENE, THE SAME PLACEMENT.** Seventeen bots placed in the
same ring, frozen and then awake:

- frozen: **3.18 ms**
- awake: **7.16 ms**, at only 619 draws

Same geometry, same draws, 4 ms apart. **The difference is the engine's
per-entity work — the animation and the interpolation.**

**THE PROFILE OF A FIGHT** (12 s, the client forced into the game):

- the main thread is **63.9% idle** — the frame is not CPU-bound
- the engine's WASM: **0.85 ms a frame**
- the Rust port's WASM: **1.56 ms a frame**
- the rest: the JavaScript-side WebGL calls

**⇒ THE PORT'S CODE IS NOT THE COST.** It is 1.56 ms of a 7 ms frame,
and the build flags move it by 1.4%. The engine's own WASM is 0.85 ms.

**⇒ SO THE COST IS PER-ENTITY, AND IT IS THE FIGHT.** More bots, more
moving entities, more animation: 0 bots 2.43 ms, 8 bots 14.05 ms, 16 bots
37-41.94 ms (on the M3 Pro). The scene swings an order of magnitude
inside one match.

**⇒ AND THAT IS WHAT THE PACER IS MEASURING.** It reads a cost, maps it
to a sustainable rate, and pins a frame rate. A heavy moment therefore
becomes the frame rate for the rest of the fight. `chooseFrameCap(120,
53) = 30 fps` — one frame in four — from a single reading taken while
the fight was at its worst. The pacer does recover when the engine
speeds up, and the 40 fps added to the rate table means a 16-25 ms frame
now lands on 40 rather than 30.

## 5g. WHAT THE PLAYER'S OWN EXPORT SHOWED (2026-11-18)

The dev-server export from the M3 Pro, `ts_lobbyduel`, fullscreen, 126 Hz
display, DPR 2, 3352x1990.

**THE TIMELINE (five windows, twelve seconds apart):**

| window | engine cost | late | gate |
|---|---|---|---|
| 1 | 18.56 ms | 73% | everyNth 3 (warm-up, provisional) |
| 2 | 5.13 ms | 27% | everyNth 3 |
| 3 | 5.22 ms | 44% | everyNth 3 |
| 4 | 19.18 ms | 81% | everyNth 3 |
| 5 | **3.60 ms** | 2.4% | everyNth 3 |

**⇒ THE 40 FPS LANE IS LIVE AND WORKING.** The gate is everyNth 3 --
one engine frame every three display ticks -- which is the 40 fps entry
in the rate table. Before that entry existed, this same reading chose
30 fps.

**⇒ THE GATE NEVER MOVED, AND THE TIMELINE SAYS WHY.** The engine's cost
swings 3.60 to 19.18 ms -- the fight -- and in the expensive windows the
frames genuinely miss their slot: 73-81% late. The pacer is RIGHT to
refuse to widen a gate whose engine is already missing its slots. It is
the wrong kind of right: the cure for a frame that misses its slot is a
cheaper frame, not a wider gate.

**⇒ THE MACHINE IS NOT THE PROBLEM.** 3.60 ms a frame is 236 fps
sustainable and 45% of the frame budget. The engine can do it; it is the
fight that it cannot.

**⇒ THE JUDDER IS THE TAIL.** The gaps at a 40 fps gate: p50 23.0 ms,
p90 30.2 ms, p99 43.1 ms, max 125 ms. The p50 is BELOW the gate's
nominal 25 ms, which means the browser's tick rate is degrading under
load -- the frames are arriving every 30 ms when the cap says 25 --
and the tail is the browser dropping ticks. That is what the player sees.

**⇒ TWO DEFECTS IN MY OWN WORK, FOUND BY THE EXPORT:**

1. **The map-change detection listens for a line the client never
   prints.** `Loading map "%s"` is the SERVER's -- `engine/server/
   sv_init.c:957`. The client's engine never emits it, so `mapName` is
   always empty and `mapChangedAt` is always 0. **The map-rotation part
   of PR #57 does not work in production.** The client has to learn the
   map change from a source that actually fires: the port's client DLL
   knows the level name (`r::level_name()`), and the engine changes its
   level on a change.
2. **The pacer uses two different display rates.** The gate is chosen
   with `idleDisplayHz` (119.976 Hz -- the display's real rate, measured
   while the page was idle) and the late-frame budget is computed with
   `Math.max(browserHz, idleDisplayHz)` (126.3 Hz -- the browser's tick
   rate under load). The budget is therefore 23.76 ms where the slot is
   25.01 ms, and the readout reports a cap of 42.1 fps for a gate that
   is actually 39.99. **One rate, used everywhere.**

**⇒ THE READOUT'S OWN FINDINGS CONTRADICT EACH OTHER.** "The game was
capped to 42 fps -- it could not finish a frame inside that" and "the
game used 45% of your frame budget -- that was comfortable" are both
true of different moments, and the resolution finding ("lowering the
resolution buys blur, not frames") is measured on the engine's CPU
cost, which says nothing about what the GPU is doing with 6.7
megapixels.

## 5h. THE RESOLUTION SWEEP, WITH THE GATE HELD STILL

The M3 Pro, `ts_lobbyduel`, the gate FORCED to one frame in three ticks
(the gate the player's own export was running on), and the engine's own
`vid_setmode` changing the canvas:

| canvas (device pixels) | engine cost | late frames | gap p50 | gap p99 |
|---|---|---|---|---|
| 3352x1990 (6.67 MP) | 2.71 ms | 0.0% | 25.0 ms | 26.4 ms |
| 2400x1500 (3.60 MP) | 2.96 ms | 78.6% (a resize spike) | 25.0 ms | 33.4 ms |
| 1800x1120 (2.02 MP) | 3.90 ms | 6.5% | 25.0 ms | 26.9 ms |

**⇒ THE PIXEL COUNT DOES NOT DRIVE THE COST EITHER.** A third of the
pixels cost nothing -- the cost went slightly UP, which is the noise of
a scene moving. The gaps are identical in all three arms because the
gate was held still, which is the point of forcing it: without a fixed
gate the sweep compares two frame rates as well as two canvases.

**⇒ SO THE COST IS NOT THE PIXELS, NOT THE DRAW CALLS, AND NOT THE
PORT'S BUILD FLAGS.** It is the number of visible entities that are
moving, and the engine's per-entity work on them.

**⇒ AND THE REPORT'S RESOLUTION FINDING IS WRONG.** "Lowering the
resolution buys blur, not frames" is measured on the engine's CPU cost,
and it cannot see the GPU. `AUTO_MAX_PIXELS` in `video-settings.ts` is
2.07 MP of CSS pixels -- and the pacer's own `auto` policy had a real
bug (it budgeted CSS pixels while the engine multiplied by the device
pixel ratio on both axes), which is fixed.

## 5i. THE PORT OWNS THE MODEL RENDERER — AND THAT IS THE COST

**THIS CORRECTS AN EARLIER CLAIM IN THIS DOCUMENT.** It said the
renderer, the entity and animation code, and the draw submission were
all upstream C++ in the engine's WASM. That is wrong, and it matters.

`tools/port/tsp-rs/crates/client/src/studio.rs` is 1,875 lines and it is
**the TS studio model renderer** — `CStudioModelRenderer`, reached
through `HUD_GetStudioModelInterface`, built from the SDK's
`StudioModelRenderer.cpp`, with TS's changes on top:

| the port's function | what it does |
|---|---|
| `draw_player` | the whole per-player path, called once per player per frame |
| `sample_pose` | the pose sampling — per bone, per frame |
| `split_torso` | the upper body and the legs, which means a SECOND pose sampled |
| `bone_adj` | the bone adjustment |
| `interpolant`, `seq_blend`, `prev_seq_weight` | the animation blending |
| `gait_frame`, `gait_step`, `torso_turn` | the gait, TS's leg sequence |

**⇒ THE PER-ENTITY WORK THE COST FOLLOWS IS IN THE RUST PORT ✓✓✓** —
the bones and the pose sampling for every visible player, every frame ✓✓✓.

**AND THE PROFILE AGREES ✓✓✓:** the two hottest functions in the fight
profile were `wasm-function[365]` and `wasm-function[351]`, both in
`000cd2ea` — the port's WASM ✓✓✓ — together 4.1% of the wall clock
against the engine's WASM's 5.1% ✓✓✓.

**⇒ SO THE PORT IS NOT THE COST** — its WASM is 1.56 ms of a 7 ms frame
✓✓✓, and the build flags move it 1.4% ✓✓✓ — **but the port is where
the cost comes from ✓✓✓✓, because the cost is the animation of the
visible players ✓✓✓✓, and the port animates them ✓✓✓✓.**

**⇒ THE NEXT STEP IS TO NAME THE FUNCTIONS ✓✓✓.** The profile's hot
entries are `wasm-function[365]` and `wasm-function[351]` — index
names, because `wasm-opt -Oz` strips the name section ✓✓✓. The
PORT's source has the names ✓✓✓; the WASM's symbol table has the
indices ✓✓✓; the two together turn a number into a line of Rust ✓✓✓✓.

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
