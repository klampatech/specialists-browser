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
8.33 ms if it is to run at the 120 Hz the player's display offers. On
Kyle's M3 Pro the engine's steady-state cost was **8.20-10.12 ms**
(measured on the rig, `ts_lobbyduel`, pinned fixture, 2026-11). That is
inside the 60 fps budget with room to spare. The 41.94 ms window was
**four times worse than the worst controlled reading of the same map**,
so the question is not "how do we make the engine faster" -- it is
"what made it four times worse for a couple of seconds".

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
every **180 seconds**, and a map change makes the engine do at the
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

## 3. THE VECTOR LIST

| # | Vector | How it is measured | Verdict | Evidence |
|---|---|---|---|---|
| 1 | Resolution / pixel count | a resolution sweep, and `gl.finish` for the GPU's backlog | **RULED OUT** | cost was flat across an **8.4x** sweep; `gl.finish` **0.00 ms**; a 6.11 MP tour canvas ran the engine at **1-11 ms** (`CLIENT-PERF-RESULTS.md`) |
| 2 | GPU fill / rasterisation | `gl.finish` in the same window | **RULED OUT** | the backlog was ~0, so the cost is CPU; the client was hardware accelerated (ANGLE Metal, M3 Pro) |
| 3 | The frame cap | the pacer's own state | **RULED OUT** | 22 fps is the engine's UNCAPPED rate (1 / 0.04194 = 23.8 fps); no cap was in force |
| 4 | The pacer's own wait | the callback's boundaries | **RULED OUT** | the deliberate alignment wait is OUTSIDE the timed callback, so it cannot inflate the frame cost |
| 5 | A leak in the pacer's arrays | the source | **RULED OUT** | samples are trimmed at 240 and the history at 900 |
| 6 | A browser that is throttling | the idle panel rate vs the live tick rate | **RULED OUT** | the browser was delivering 120 refreshes a second |
| 7 | `glGetError` round trips | `measure-geterror-ab.cjs` | **RULED OUT** (fixed earlier) | **8.89 ms -> 1.91 ms**; the patch is live |
| 8 | Static map content | BSP lumps, parsed | **RULED OUT** | `ts_lobbyduel` has **161 entities, 4095 faces, 29 KB of PVS, 3 lights** -- the second-lightest of the twenty maps with nav data. `ts_casa` has **3.4x** the entities and **4x** the faces and measured **CHEAPER** (4.31-4.52 ms vs 8.20-10.12 ms) |
| 9 | Slow drift over a long session | a 13.7-minute session, 2026-11-09 | **RULED OUT** (for that session) | it stayed at or below **11.85 ms** with **0% late frames** |
| 10 | The warm-up anchor | the map's load line on stdout | **THE FIX** (section 1) | the readout called a post-rotation window "settled"; a map load costs **274-1415 ms** |
| 11 | The empty export | the exported file | **THE FIX** (section 2) | `timeline: []` on the landing page, by construction |
| 12 | **The bot count** | the rig, 0 / 8 / 16 bots, same fixture | **MEASURING** | production runs **16 bots**; every controlled reading so far used **0 or 8** |
| 13 | **TS 3.0 debris on breakables** | a long run with the entity and particle counters sampled over time, and a controlled "break 20 columns" run | **PRIME SUSPECT** | TS 3.0 has `break_debris_from_hit()` on and `debris_count_by_quality` on; every breakable that is shot makes debris, and nobody has ever counted the debris |
| 14 | **Decals** | `r_decals` / `mp_decals` sweep, with the decal count read back | **UNMEASURED** | the client ships `mp_decals 300` against the engine's `r_decals` default of **4096**, and TS is effect-heavy |
| 15 | **HUD scale** | `hud_scale` A/B on the failing machine | **UNMEASURED** | the client ships `hud_scale 2.5`; an earlier 4K sweep saw `hud_scale 1.0` save **8.6 ms** |
| 16 | **Violent effects** | `violence_hblood` / `violence_agibs` / `violence_hgibs` / `violence_ablood` A/B | **UNMEASURED** | never swept |
| 17 | **Detailed player models** | `cl_himodels 0/1` A/B at 16 bots | **UNMEASURED** | the client ships `cl_himodels 1`, and production runs 16 bots |
| 18 | **Heap and GL-texture retention across rotations** | the WASM heap and the GL object count, sampled across three rotations | **UNMEASURED** | the match rotated three times, and a map load costs **274-1415 ms**; whether the previous map's textures are released is not known |
| 19 | **The browser** | the same measurement in Vivaldi and in Chrome | **UNMEASURED** | the failing session was **Vivaldi** (UA `Chrome/152`); every controlled measurement was **Chrome 157** |
| 20 | **What was on screen** | the fixture | **RULED OUT as a MAP property, live as a WINDOW property** | the engine's cost is **3-5x** different depending on the view; the failing window's view is not known, and the timeline now records the map so it can be found |
| 21 | `r_lockpvs` | an A/B | **RULED OUT as a fix** | it HURT: the rAF rate fell by **5.7** at 1080p. It is a knob to leave alone |

## 4. THE ORDER OF WORK

The cheap, certain ones first, because they are the ones that make
every later measurement trustworthy:

1. **The readout tells the truth** (sections 1 and 2). Done. Without
   it, every future report is a report about a window nobody can find.
2. **The bot count** (12). The rig matrix, 0 / 8 / 16 bots on
   `ts_lobbyduel` and on `ts_casa`, same fixture, same viewpoints.
   This is the one production difference that every controlled reading
   has been missing.
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

## 5. WHAT WOULD SETTLE THE 41.94 ms WINDOW TODAY

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
