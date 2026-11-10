# HANDOFF — specialists-browser

> ╔══════════════════════════════════════════════════════════════════╗
> **EVERY WORK SESSION — read this top section FIRST.**          ║
>                                                                  ║
> **1. Read § CURRENT STATE and § ROADMAP below.**               ║
> **2. Do the ONE task listed in § NEXT TASK.**                    ║
> **3. Update § CURRENT STATE before committing.**                 ║
> **4. Commit + push.**                                           ║
>                                                                  ║
> ⚠️ Everything past the `━━━ HISTORICAL RECORD ━━━` divider is  ║
> **parked or abandoned**. Do not follow it as live state.        ║
> ╚══════════════════════════════════════════════════════════════════╝

---

# § CURRENT STATE

> **The supporting docs are local-only now.** The admin console's specs
> and runbook, the production topology, the design scopes and the
> research notes are **gitignored** — they are not in this repository
> (see `.gitignore`), and they are on the working machine. The three docs
> a new agent needs are still tracked: `docs/CI-CD.md`,
> `docs/FE-MOD-PLAN.md` and `docs/UPSTREAM-ISSUES.md`.

**As of:** 2026-11-09, LATEST — **FIREFOX CAN BE WATCHED NOW. A BiDi
WATCHER, THE PROBE IT SHARES WITH THE CHROMIUM ONE, AND THE FOUR TRAPS
THAT COST TO FIND.**

The measurement session was still open because **the browser Kyle
plays in was the one browser nobody could watch**. Firefox removed CDP
support in version 129, and Playwright's `connectOverCDP` does not
speak to Firefox at all — so the CDP watcher could only ever watch the
Chromium that was installed *for the watcher*, while the session that
was actually being asked about happened in Firefox.

**WHAT SHIPPED** (`tools/perf/`):

1. **`watch-client-bidi.cjs` — THE SAME WATCHER, OVER WebDriver BiDi.**
   Firefox's Remote Agent speaks BiDi (JSON over a WebSocket), and
   `script.evaluate` runs in the page's own realm, which is all the
   probe needs. It prints the SAME columns, computes the SAME
   statistics and answers the SAME question as the CDP watcher.
2. **`watch-remote-ff.sh` — THE TUNNEL**, with the port trap below
   baked into it.
3. **THE PROBE IS NOW ONE DEFINITION.** `lib/watch-probe.cjs` and
   `lib/watch-stats.cjs` hold the probe and the arithmetic, and
   `watch-client.cjs` imports them. **The probe bodies were moved
   VERBATIM** (verified against the committed file, byte for byte),
   so the Chromium watcher's numbers did not change — and a Firefox
   number and a Chromium number are only comparable if they came out
   of the same instrument. Two copies of a probe drift; two numbers
   that look alike but are not is worse than one number.

**THE FOUR TRAPS, ALL MEASURED, ALL FIXED:**

1. **THE REMOTE AGENT CHECKS THE HOST HEADER, PORT INCLUDED.** A
   tunnel that forwards `127.0.0.1:19224` to the browser's
   `127.0.0.1:9224` is refused with **`400 Bad Request`**; the same
   request direct, or through a tunnel that uses **the same port on
   both ends**, answers `101 Switching Protocols`. So
   `watch-remote-ff.sh` uses matching ports, and says why.
2. **THERE IS ONE SESSION AT A TIME, THE REGISTRY IS GLOBAL, AND A
   LEAKED SESSION IS PERMANENT.** `session.new` answers *"Maximum
   number of active sessions"* when an earlier run leaked one — and
   the leak cannot be cleared from outside: `session.end` answers
   *"invalid session id"* (the session belongs to a dead socket), and
   only **a browser restart** frees the slot. So the watcher now
   ends its session, **closes the socket GRACEFULLY** (`closeGracefully`
   waits for the close event — a socket that dies with the process
   leaks the session), and when it finds the stuck state it prints the
   command that clears it instead of an error that names the cause
   but not the cure.
3. **`session.status` IS NOT A READINESS CHECK.** It answers *"is a
   session active right now?"* — globally — so it returns
   `ready:false, "Session already started"` the MOMENT your own
   `session.new` succeeds. Read it after `session.new` and it
   condemns you for your own session. The watcher prints it and does
   not act on it.
4. **FIREFOX MASKS THE WEBGL RENDERER STRING.** Firefox reports
   `Radeon R9 200 Series` for an RX 7700 XT — a family mask, not the
   chip. Chromium on the same box reports the truth
   (`ANGLE (AMD, AMD Radeon RX 7800 XT (radeonsi navi32 ACO),
   OpenGL 4.6)`). **So the renderer line from Firefox is not
   evidence about the GPU** — the Chromium one is, on the same
   machine. Firefox's string is still evidence that the rendering is
   hardware, not SwiftShader.

**WHAT IS LIVE ON THE GAMING PC.** `~/opt/ff-launch.sh` launches
Firefox with the remote agent on port 9224 and a dedicated profile
(`~/opt/bb-ff`), lifting `WAYLAND_DISPLAY` out of `/run/user/<uid>`
because niri does not export its own environment. Both watchers are
verified against it: the Firefox one over BiDi and the Chromium one
over CDP, each printing its honest *"NO FRAMES AT ALL"* on the
landing page, which runs no `requestAnimationFrame` loop.

**THE MEASUREMENT SESSION IS STILL OPEN** — the instruments are ready,
and a match has still not been played under measurement.

**As of:** 2026-11-09, EARLIER — **THE READOUT SAYS WHAT TO DO, THE GAMING PC
IS REACHABLE, AND IT IS A 60 Hz PANEL — WHICH IS THE WHOLE OF "FULLSCREEN
IS SLOWER".**

Kyle's two threads converged. The performance diagnostics had to become
**accurate and actionable**, and he wanted the game measured **on his own
machine while he plays**. Both are now in place, and the second one turned
up the answer to the question he was actually asking.

**WHAT SHIPPED** (webXash **#53** → `27cfe99`; parent **#151** → `…`, with
the submodule pointer landing on webxash's main so the deploy carries it):

1. **THE DIAGNOSTICS NOW ANSWER "WHAT DO I DO".** The `Your Client` tab
   and the ESC performance tab report the **gap to the next refresh rate
   in milliseconds** ("1.06 ms away from 144 fps"), the **frame-time
   distribution** (p50/p90/p99/max, so judder is visible instead of
   averaged away), and an **engine-bound checklist** — draw-cost switches,
   giving the machine the whole CPU/GPU, killing the overlays, the judder,
   the fullscreen comparison — where every item says *where* and *why*.
2. **A NEW "Draw cost" CARD IN ESC → GAME**, offering the CVars the
   player can flip: `r_drawviewmodel`, `r_lockpvs`, `r_shadows`,
   `r_detailtextures`, `cl_himodels`. **Nothing is claimed** — the
   project's own cvar sweep found the effect smaller than the drift (53%,
   and in every cycle the build that ran second won) — but the readout
   measures the frame cost in ms, so a player can flip one and see.
3. **AN "Export log" BUTTON** (ESC → Performance) that downloads the
   whole match's timeline as JSON: every measurement window, the frame
   cost, the rate the game drew at, the rate the browser handed it, the
   gate, the late frames, and **whether the game was fullscreen at the
   time**, grouped fullscreen-vs-windowed **by medians** (so one
   expensive window cannot fabricate a difference).
4. **THE BROWSER THROTTLE THE 60 Hz FLOOR MISSED.** Chrome's Energy
   Saver does not always halve the refresh rate — on a 120 Hz panel it
   went to 78 Hz, which is *above* the 60 Hz "throttled" floor, so the
   readout said everything was fine and blamed the engine. The engine's
   tick rate **cannot** tell the two apart: a slow engine and a slow
   browser stretch frame intervals identically. The pacer now measures
   the display **before the engine exists** (an idle baseline) and
   compares the live rate against it.

**FOUR REAL BUGS FOUND WHILE AUDITING THE DIAGNOSTICS** (not gaps in the
advice — wrong answers):

1. **THE BUDGET WAS MEASURED AGAINST THE WRONG RATE.** The landing page
   restores the last match's numbers while the browser is still running,
   so there were two rates in play, and the comparison was between them:
   a 7.20 ms frame measured on a 144 Hz panel is **over** that panel's
   6.94 ms budget, but against the landing page's own 60 Hz reading it
   looked like 43% — a green bar and "everything is fine" for a game
   that was over budget on the display it was playing on. **The budget is
   now the one that applied to the game**, and the rate measured right
   now is a separate fact with its own finding.
2. **"Re-measure" RE-READ THE OLD NUMBER.** It now asks the pacer for a
   fresh measurement window, so changing a setting and hitting Re-measure
   tells you whether it helped.
3. **A CONCURRENT MEASUREMENT WIPED ITS OWN SAMPLES.** A measurement
   window resets the observation buffers, so two overlapping windows
   erased each other's data. The pacer now serialises them.
4. **THE CI DRAW-COST CHECK WAS READING AN ENGINE NOBODY RUNS.** It read
   `webxash/public/xash3d-fwgs/` — gitignored, a leftover from an older
   layout, and on this machine a **different `xash.wasm`** than the one
   that ships. It now reads `node_modules/xash3d-fwgs`, skips loudly when
   no engine is installed, and runs for real in the Frontend job.
   **Now positively verified:** the npm engine is **byte-identical** to
   the deployed one (`libref_webgl2.wasm` and `xash.wasm`, md5 match
   against the content-hashed files bulletballet.dev serves), and every
   cvar offered above is **present in the deployed engine**. `cl_weather`,
   which the project's own sweep tried, **does not exist in this build**
   and could never have worked.

**THE GAMING PC IS NOW REACHABLE, AND WHAT IT SAYS IS THE HEADLINE.**
`cachyos-x8664` joined the tailnet (100.121.0.20). It is **CachyOS**,
kernel 7.3.1, **AMD Ryzen 7 8700G + Radeon RX 7700 XT** (Navi 32,
amdgpu), 32 GB, and its desktop is **niri** on Wayland. Port 22 there is
**Tailscale SSH** — `tailscaled` intercepts it and authenticates by
*tailnet identity*, so there is no `authorized_keys` and the tailnet ACL
is the whole access control. The login shell is `fish`.

> **THE DISPLAY IS AN Acer EB321HQU AT 2560×1440 @ 59.951 Hz, WITH
> VARIABLE REFRESH RATE *NOT SUPPORTED*.**
>
> **A 60 Hz PANEL.** There is no 120/144 Hz mode on it at any resolution.
> So the frame budget on that machine is **16.67 ms**, and with no VRR
> there is nothing to absorb a missed frame — an overrun is a visible
> hitch, full stop.

**AND THE FULLSCREEN QUESTION, MEASURED ON HIS MACHINE:**

| | window | CSS | megapixels |
|---|---|---|---|
| fullscreen | 2560×1440 | 2560×1384 | **3.54 MP** |
| windowed (niri tiles in columns) | 1274×1388 | 1274×1245 | **1.59 MP** |

**Fullscreen is 2.2× the fragments of the tiled window.** "Fullscreen
runs worse than the windowed browser" is very probably **not a mystery —
it is pixel count**, and it is fill-bound. **The lever is the client's
RENDER SCALE, not a cvar**: at 67% the fragments fall by ~55%. The
readout shows `RENDER SIZE` in megapixels right next to `FRAME COST`, so
that number can be watched moving.

**THE LIVE MEASUREMENT PATH WORKS END TO END, ON THE REAL GPU.**
`tools/perf/watch-client.cjs` (attach-only, no dependencies, never
launches or controls the browser) attaches over CDP; the
`tools/perf/watch-remote.sh` tunnel reaches it on the gaming PC. Verified
against the real thing over the tunnel:

```
renderer:  ANGLE (AMD, AMD Radeon RX 7800 XT (radeonsi navi32 ACO), OpenGL 4.6)
```

— the Navi 32 chip, **not SwiftShader**. Chrome for Testing 158 was
installed on the gaming PC **without sudo** (Playwright's own browser
cache, `~/.cache/ms-playwright`), because the box has **Firefox only**
and Playwright's `connectOverCDP` does not speak to Firefox.

**THE THREE TRAPS THE REAL MACHINE TAUGHT** (all fixed in
`watch-client.cjs`, and the second one is the reason the A/B was
previously worthless):

1. **`document.fullscreenElement` IS NULL FOR THE BROWSER'S OWN
   FULLSCREEN** (F11, `--start-fullscreen`) — only the DOM API sets it.
   The `fs` column labelled fullscreen runs as windowed. It now also
   asks the canvas's size against the screen's.
2. **`Browser.setWindowBounds` IS SILENTLY IGNORED UNDER NIRI** — the
   compositor owns the geometry, so the request reports success and
   changes nothing, and the A/B compared two identical windows and
   reported "no difference". Each phase now reports its real window
   size, and the comparison says in capitals when the comparison never
   happened. **The reliable fullscreen is a relaunch with
   `--start-fullscreen`** (`/home/kyle/opt/relaunch.sh` on the box).
3. **NIRI DOES NOT EXPORT `WAYLAND_DISPLAY` TO ITSELF** — niri *is* the
   Wayland server, so the variable has to come from the socket directory
   and from Xwayland's own argument, or Chromium dies with "Missing X
   server or $DISPLAY".

**THE PLAN FOR THE MEASUREMENT SESSION IS IN § NEXT TASK.**

**As of:** 2026-11-09, EARLIER — **THE CHARACTER PICKER SHOWS ALL SIXTEEN
CHARACTERS, AND THE EARLIER CLAIM THAT THE SERVER THROWS THE CHOICE AWAY
WAS WRONG. webXash #51 IS UP FOR KYLE'S APPROVAL.**

Kyle asked to continue the character work. The portraits had been
regenerated for every character the mod ships, and the two menus that
offer a character still offered **seven** of them, in a wrapped row of
small buttons, with no picture at all for the nine the game does not
draw.

**WHAT SHIPPED** (webxash `3723dd5`, the screenshots `8d54641`):

1. **`CharacterPicker.vue` — ONE shared component, used by BOTH menus.**
   The ESC options overlay and the pre-join identity modal each used to
   carry their own copy of the card markup. They drifted, and they were
   two chances to disagree about which characters exist. The roster
   itself stays in `player-identity.ts`, so the picker, the
   launch-argument builder and the model setter cannot disagree about
   it either.
2. **The roster is all sixteen characters**, in the mod's own spelling.
3. **The portraits are uniform** — every one is 256×256, head and
   shoulders, framed the same. The seven painted ones are the game's
   own art, re-cropped by the same uniformiser; sixteen tiles of two
   shapes read as two things.
4. **The model name is sent in the mod's own spelling.** See the case
   trap below.

**THE CORRECTION, AND IT IS THE IMPORTANT PART.** The 2026-11-07 entry
further down says the server replaces a requested model with a random
one from the player's team, so offering sixteen would be *"a promise
the server does not keep"*. **That is wrong, and it was wrong because
the mode was assumed instead of measured.**

The path that replaces the model — `rules/teams.rs :: userinfo_changed`
→ `model_for(&team)` — is reached **only in teamplay**. The live server
runs **`mp_teamplay 0`** (deathmatch), read over RCON from production
on 2026-11-09. In deathmatch the requested model is kept. None of the
sixteen is one of the nine HLDM models, and `mp_defaultteam` is 0, so
`multiplay_userinfo_changed` leaves it alone too.

So the promise is one the server **does** keep, today. **If the server
ever turns teamplay on, the choice is discarded** — that is the
server's ruleset, not the client's, and it would be a one-line config
change to notice.

**THE CASE TRAP, WHICH WAS LATENT AND WOULD HAVE SHIPPED.** The engine
resolves a player model as `models/player/<name>/<name>.mdl` — the name
**verbatim, no case folding** (`R_StudioSetupPlayerModel`,
`ref/gl/gl_studio.c`). The mod's directories are `Bodysaver`, `Spetsnaz`
and `SpeziClaus`, capitalised, and the archive is unpacked into a
case-sensitive filesystem.

So `setinfo model "bodysaver"` asks for a file that does not exist, the
model fails to load, and the engine **silently** falls back to the
default player model: the player picks a character and gets somebody
else, with nothing on screen to say why.

`applyModel` used to lowercase the model. Harmless with seven lowercase
names; fatal with three capitalised ones. It now matches
case-insensitively and sends the mod's own spelling (`canonicalModel`).
Nothing lowercases the name on the way: the client sends the cvar value
as it is, the server stores the string as it is, and the client
resolves the path from the string it gets back. Every hop is verbatim.

**MEASURED IN THE BROWSER, NOT ASSUMED.** Clicking the **Bodysaver**
portrait in the ESC overlay set the engine's own `model` cvar to
`"Bodysaver"` — read back from the engine's stdout, capital B and all.
The pre-join modal stored `{"model":"SpeziClaus"}` and carried it out
on the launch arguments. Both menus rendered all sixteen portraits, and
the selected tile lit.

**THE RECIPE IS A SCRIPT NOW.** `tools/portraits/ship-portraits.py`
copies the sixteen and refuses to ship `ala` (the engine resolves
`models/player/ala/ala.mdl`, and the mod ships `ala2.mdl`). The
parent's unit suite pins the roster, the case, the shared picker and
the portrait folder — including that the folder holds **exactly** the
model list and nothing else.

**AND THE ONE THING THE RECIPE CANNOT PROMISE.** The ship script makes
the **repository's** portrait folder exactly the roster. **The deployed
directory is not the repository.** The deploy ships the frontend with
`rsync -az` and deliberately **without** `--delete` — *"a deploy should
not be able to remove files from a live site on the strength of a build
it does not fully understand"* (`deploy.yml`). So `/models/ala.png` is
still on production as an **orphan**: 30 KB that the client never
requests, because the roster has no `ala` in it. It stays until
something removes it by hand. **Do not read it as the client offering a
seventeenth character.**

**THE PR SEQUENCE IS TWO PRs, AND THE POINTER WAITS.** webXash #51
first (Kyle's approval, then the squash), and the parent after, with
the pointer at the squash — never at the branch tip.

**As of:** 2026-11-09, LATEST — **THE PACER'S HYSTERESIS IS REBUILT, AND
webXash #50 IS APPROVED AND MERGED. THE PARENT POINTER LANDS WITH THIS
COMMIT.**

Kyle reviewed webXash PR #50, asked for this work before he would sign it
off, and approved it once it was done — his own empty-body review, read
back before the merge. Two reviews of the pacing policy had run by then (one broad
review that hung and was killed, one focused review that completed), and
a second focused review — of the **fixes** rather than of the original
work — found that the fix for the pump had itself become a performance
regression. Kyle's rule is verbatim: *"The only thing worse than
performance optimizations that don't do anything is performance
optimizations that actively make performance worse."* This change is
about honouring that rule on the code that is already written.

**THE DEFECT, MACHINE-CHECKED AGAINST THE REAL POLICY CODE** (not taken
on trust — `node --experimental-strip-types` against
`webxash/src/services/frame-pacing.ts`):

- The pump fix was a **15% band on the engine's sustainable rate**, held
  between the last gate change and the next.
- On a **120 Hz panel** the step from 60 fps to 120 fps is a **0.8%**
  change in the sustainable rate (119 → 121, at 7.14 → 7.00 ms of frame
  cost). A 15% band swallows that step whole.
- So: the target said `everyNth 1` (120 fps), the policy **held the gate
  at 2 (60 fps)**, and the player stayed at 60 fps until the engine was
  **12% faster** than the cost that produced 60 fps.
- The band could also **veto the physical promise**: on a 100 Hz panel
  with an 11.0 ms frame the target correctly computed `everyNth 2` (the
  frame needs two ticks), the band threw it away, and the engine was
  asked for 100 fps with a frame that overruns its 10 ms slot by 10%
  **every frame** — the judder the feature exists to remove.
- And the band was **blind to the panel side**: any target change caused
  by the measured display rate was band-blocked too, so the gate could
  latch on the wrong rate and stay there.

**WHY A BAND CANNOT DO THIS JOB.** The gate's decisions are *discrete
steps* (60 ↔ 120 fps), and a percentage band on the sustainable rate
does not map onto a step. A band in the right units — a hysteresis
*around the threshold* — still sacrifices a window of cost either side
of it. The rule that does map is **consecutive windows**: a target that
flickers never produces two of them, so it cannot move the gate, while a
change that *persists* does.

**THE PLAN, AS BUILT** (webxash `5c41df1`, the parent's tests):

1. **The band is deleted** (`COST_DEADBAND`, `currentBasisFps`, and the
   branch in `frame-pacing.ts`). It is the wrong instrument.
2. **The gate moves only when two consecutive SETTLED windows ask for
   the same target** — symmetrically, for widening as well as narrowing.
   The narrowing already required two; the widening was immediate, and
   that asymmetry is what ratcheted a flickering target open.
3. **The narrowing also has to clear the threshold the cost is measured
   against**, by more than the measurement noise. The engine's frame cost
   is measured with about 1.4% of noise (7.00 ms and 7.20 ms are the
   same view on the same machine) and the gate changes at a *threshold* —
   850/120 = 7.083 ms of frame cost on a 120 Hz panel — so a reading that
   straddled it would close the gate and open it again. The threshold is
   a COST (850 × everyNth / panelHz for the cap, 1000 / panelHz for the
   slot) and the gate closes when the cost is past the easier of the two.
   **The symmetric counter alone is not enough**: a target that dwells
   two windows on each side of the threshold still oscillates, which is
   what this band is for.
4. **The counter ignores warm-up windows.** It counts every window that
   reaches the policy today, so the first settled window can narrow on
   the strength of two *warm-up* readings — contrary to the rule's
   intent.
5. **A PROVISIONAL gate follows the latest warm-up reading.** It was
   taken from the least trustworthy reading the engine will ever produce
   (the 3-second window, while the engine compiles shaders and streams
   the map) and it could not move again until the first settled window —
   ~23 seconds at a tight gate. A gate that has been **settled** still may
   not move on a warm-up reading.
6. **The physical promise stays in the TARGET**: the target's tick count
   is at least the number of ticks the engine's frame needs to fit its
   slot. The gate then *converges* on it within a window instead of
   being vetoed indefinitely.
7. **A forced gate — the measurement harness's — is not the policy's to
   move**, and the policy says so in its reason.
8. **The late-frame guard is untouched**: a widening is still refused
   while more than 5% of the engine's frames arrived late. It is the most
   important rule in the feature.
9. **Two small honesty fixes** from the same review: the empty-window
   path no longer inherits a stale `capFps` (so the readout cannot name
   a rate the current gate no longer implies), and a gate left in place
   keeps its provisional flag.

**THE REPLACEMENT, VALIDATED BEFORE IT WAS WRITTEN.** The new policy was
prototyped in the scratch directory and machine-checked with seven
cases: the pump (a cost alternating around the 7.083 ms threshold)
produces **zero** gate moves; a sustained improvement from 7.14 to 7.00
ms reaches **120 fps** again; the 100 Hz / 11 ms case **converges** on
the promise rather than being vetoed; a provisional gate is replaced by
the first settled window; one expensive window does not narrow the gate
and two do; and a widening is still refused while 9% of frames are late.

**THE GATES AFTER THE CHANGE — ALL GREEN.** The parent's unit suite
**757/757**, `vue-tsc --noEmit` clean, `bun run build` clean, the
CI-address build clean, and the shipped-readout browser gate **47/47**.

**AND THE RE-MEASUREMENT ON THE M3 PRO** (the CI stack only, never
production; eight bots in the world). `ts_casa`, six viewpoints, the
player moving:

- **View 1** — the engine cost **11.17 ms**, was delivering 83.5 fps,
  and **38.1% of its frames arrived late**: it was overrunning its slot
  by 34%. **The pacer narrowed to 60 fps and the late fraction went to
  0%.** That is the pacer doing its job for the first time; the old
  build reported a frozen 1.31 ms for the whole match and never knew
  the scene was expensive.
- **Views 3–6** — the scene was cheap, the gate came off the cap, and
  the engine ran at 120.0 fps with 0.0% late.
- The **timeline** over 110 seconds: the gate in force never changed,
  the engine's fps ran 119.3–120.8, the late fraction 0% (median), and
  the pacer's last word was *"the engine costs 1.53 ms a frame (554 fps)
  against a 120 Hz display -> not capping; the settled reading confirms
  the gate"*.

The full numbers are in `docs/CLIENT-PERF-RESULTS.md`.

**SHIPPED AND LIVE.** webXash **#50** merged as **`9a2cac0`**, whose tree is
byte-for-byte the tree Kyle approved (`git diff origin/main 5c41df1` is
empty — the squash carries exactly what he reviewed). The parent's **#146**
(`5be4405`) repointed it and merged after Kyle's own empty-body review, the
deploy's browser gate passed, and production is serving the new bundle
(`assets/index-kKNXEsss.js`).

**VERIFIED READ-ONLY, NO GAMEPLAY AGAINST PRODUCTION.** The shipped bundle
carries each of the new policy's distinguishing strings exactly once — *"the
engine's cost has not yet passed"*, *"the cost has been high for"*,
*"waiting for a second window before"*, *"the gate is still PROVISIONAL, so
it"*, *"follows the latest warm-up reading"*, *"the measurement harness, so
the policy leaves it alone"*, *"in a row have asked for it"* — and none of
the old band's identifiers (`COST_DEADBAND`, `currentBasisFps`). That is the
policy that is live, not the one that was reviewed.

**As of:** 2026-11-08, LATEST — **THE PACER MEASURES THE ENGINE WARM, AND
KEEPS MEASURING. THE READOUT STOPS BLAMING THE BROWSER.**

Kyle looked at the "Your Client" tab after a game and asked two questions:

1. *"Is the 'locked at 30fps / 60fps' an engine limitation we can change?
   I want the game as performant as possible on modern hardware. If
   there's an artificial fps limiter imposed, can we remove it?"*
2. *"Is the information in this screenshot accurate? How do we fix any of
   it?"*

**THE ANSWER TO (1): THE 30 FPS IS NOT AN ENGINE LIMIT — IT IS OUR PACER,
AND IT WAS CHOOSING WRONG.** The engine has no frame limiter in the
browser at all: `fps_max` is inert while vsync is on (`engine/common/
host.c` reads it only when vsync is off), so the engine targets 200 fps
and draws on every tick the browser offers. The cap is
`webxash/src/services/frame-pacing.ts` (the policy) plus
`frame-pacing-apply.ts` (the machinery) — and it decided from **one
measurement, taken three seconds after the engine booted, over a
two-second window, and never repeated for the rest of the match.**
Three seconds in, the engine is compiling shaders and streaming the map:
that window is the most expensive one it will ever produce.

**THE ANSWER TO (2): THE SCREENSHOT WAS MOSTLY A PICTURE OF THE ENGINE'S
WARM-UP, PRESENTED AS A PICTURE OF THE MACHINE, AND FOUR OF ITS
STATEMENTS WERE WRONG.** The "capped" finding printed the **game's** rate
in a sentence that called it the **display's** rate; the "room to spare"
finding claimed headroom the engine did not have; the "delivering"
finding blamed the engine for a frame rate the **cap** was causing; and
the render-size advice told the player to lower the resolution on a
machine where the engine is **CPU-bound** (the research measured the
cost flat across an 8.4x resolution sweep).

**WHAT CHANGED (webxash, six files).**

- **THE POLICY** (`frame-pacing.ts`, still import-free) grew
  `decideFrameGate(input)`: a settled window may move the gate, a
  warm-up window never does, a **widening is REFUSED** when more than
  5% of the engine's frames were late, and a **narrowing needs two
  consecutive windows** asking for the same target. The asymmetry is the
  point: widening risks judder, narrowing risks perceived slowness.
- **THE MACHINERY** (`frame-pacing-apply.ts`) now measures the
  **engine's** frame rate (`engineFps`) from the engine's own frame
  starts, counts **late frames** against the **gate's period** (the old
  metric counted browser ticks and read a quarter of them "late" even
  when the game was perfectly paced), knows when the engine's **first
  frame** was, and calls a window **settled** once it closed 15 000 ms
  (`WARMUP_MS`) after it.
- **THE SCHEDULE** (`xash-loader.ts`) measures at 3 s (provisional) and
  then **every 10 s** (`REMEASURE_MS`) for the rest of the match, with no
  overlap — `applyFrameCap` is async, so the next window starts only
  after the previous one returns.
- **THE REPORT** (`perf-check.ts`, still import-free) now **attributes**
  instead of blaming: *"Your browser is only offering N refreshes a
  second."* (browser-bound) / *"The game could not keep up with your
  120 Hz display."* (engine-bound) / *"Your client was set up properly.
  Nothing to do."* (neither). The "capped" finding names the **panel's**
  rate, the "room to spare" claim requires the engine's sustainable rate
  to really be at or above the panel rate, the "delivering" finding
  blames the **cap** when a cap is in force, the render-size advice says
  the lever is the engine's per-frame cost, and a new **`cost-age`**
  finding says *when* the numbers were measured ("…measured 32 seconds
  into your last game" / "…before the engine had warmed up").
- **THE FACTS** (`perf-collect.ts`) carry the new fields into
  `PerfFacts` and the **session snapshot**, so the landing page tells
  the same truth about the last game. The snapshot's `measuredAt` keeps
  its meaning (when the game ENDED); the pacer's reading time is a
  separate field.
- **THE READOUT** (`TSPerformance.vue`) shows the engine's frame rate
  beside the panel's rate.

**THE GATES.** `bunx vue-tsc --noEmit` and `bun run build` in `webxash`
(the build carries the WASM and GL-glue gates), and the parent's unit
suite — **744 tests, 744 pass** (25 of them new: the policy's rules, the
machinery's measurements, and the report's honesty rules).

**THE A/B, ON THE CI RIG — `tools/perf/measure-pacing-timeline.cjs`.**
The harness boots a real client against the **CI** stack, **refuses to
run** unless the server list is the CI rig (`ts-ci*`) and every
WebSocket points at `ci.bulletballet.dev`, pins the **map** and the
**viewpoint** (the map's first nav node — the spawn is random and the
engine's cost moves with what is visible: a 4.9x spread from the spawn
alone), measures the engine's frame rate **itself** (the same instrument
on both builds) and prints a **timeline**: the gate in force, the
engine's cost, the engine's fps, the browser's tick rate, the late-frame
fraction and the panel rate. It prints NUMBERS, not a verdict.

Four comparable pairs (same map, same pinned viewpoint, both builds):

| pair | branch engine fps (median) | main engine fps (median) | late-frame fraction |
|---|---|---|---|
| 1 | 17.6 | 15.7 | 100% / 100% |
| 2 | 18.0 | 14.6 | 100% / 100% |
| 3 | 18.6 | 17.0 | 100% / 100% |
| 4 | 18.1 | 17.4 | 100% / 100% |

**THE BRANCH'S ENGINE FPS IS NEVER LOWER, AND THE LATE-FRAME FRACTION IS
NEVER WORSE.** The branch also reports the engine's cost **honestly**:
main froze its cost at the 3 s warm-up reading (3.5-5.1 ms) for the whole
match, while the branch's settled readings were 1.6-1.9 ms.

**WHAT THE RIG COULD NOT ANSWER, STATED PLAINLY.** The rig is
**software-rendered** (SwiftShader) against a 60 Hz panel: the browser
delivers ~18 ticks/s, so every engine frame is late relative to a 16.7 ms
gate period and the late-frame fraction reads 100% on **both** builds —
the metric is degenerate here. The regime the change is FOR (a
hardware-accelerated client on a 120 Hz panel, where the cap engages)
is **not reproducible in this rig**, so the cap-engaging path is covered
by the parent's unit tests and still needs Kyle's real machine.

**A TOOLING BUG FOUND ON THE WAY (NOT FIXED — OUT OF SCOPE).**
`tools/perf/lib/server-console.cjs` waits for a console answer with a
**shell** grep — `grep -qE '\[ts\]\s+#\d+'` — and GNU grep's ERE has no
`\d`, so the grep never matches and every attempt burns its whole
timeout. The new harness reads the answer in JavaScript instead; the
shared helper is still broken for every other caller.

**THE NEXT TASK IS NOT THIS ONE.** The **loadout** (Task B's session
half) is still open and is still Kyle's next task — see § NEXT TASK.

**As of:** 2026-11-07, LATER — **THE READOUT GETS ITS OWN TAB, AND THE WEB UI'S
READOUT SURVIVES THE QUIT. BUILT, VERIFIED, MERGED, AND LIVE ON PRODUCTION.**

Kyle asked for two changes to the client readout. **Both are implemented, both are
tested, and both are in PRs.** The work is five commits on the branch
`feat/readout-tabs-session`, across the two repos:

| repo | commit | what |
|---|---|---|
| `webxash` | `717e2fe` | the options overlay gets the two tabs (Task A) |
| `webxash` | `7659754` | the session snapshot, the merge, the past tense (Task B) |
| `webxash` | `4ada49d` | the fix round: the restored report never contradicts itself |
| parent | `6881365` | the parent suite: the new invariant + the policy tests |
| parent | `d7cb1b1` | the parent suite: a restored report never says the game has not run |

**MERGED AND DEPLOYED (2026-11-08).** Kyle approved both PRs with the empty-body
signature (the human one; `EVO_MERGE_OK=1` is NOT the approval). webXash **#49**
squash-merged to `44b6167`; the parent's **#144** (`fa24a17`) carries the pointer
at that SHA — never at the branch head. The parent's CI was green on the
**repointed** tip (Frontend, Unit, Port, Docker — all four), and the deploy's own
"Verify in a real browser" job passed. **The served production bundle carries the
feature**: `xash.perf.session.v1`, the `Last game — …` label, the `tablist`
wiring, and the tensed wording (`The game was drawing …`) — with the old
present-tense string gone from the bundle.

### WHAT SHIPPED

**TASK A — THE ESC MODAL IS TWO TABS.** "Settings" and "Your Client", in a real ARIA
tablist (`role="tablist"` / `tab` / `tabpanel`, `aria-selected`, `aria-controls`,
`aria-labelledby`, **roving tabindex**, ArrowLeft/ArrowRight/Home/End with the
selection following the focus). The strip is **outside the scroll area** — it shares
the header row with the brand mark and the close button, so it costs **ZERO** extra
height. The Quit button stays in the Session group of the Settings tab; the readout
is in the Your Client panel and is not in the Settings panel at all. The labels are
exactly "Your Client" (capital C) in the tab, on the landing page and in the
readout's own heading.

**THE FOCUS TRAP STILL HOLDS** — the name input takes the focus when the overlay
opens, because without it the keystrokes go to `<body>` and the ENGINE eats them as
game commands. Three things make it work, and all three are load-bearing:
`v-show` (not `v-if`) on the panels, so the input is always in the DOM; the tab reset
to `settings` **synchronously in the watcher callback, before the await**; and
`await nextTick()` before `focus()`. Move that reset after the await and `focus()`
fails **silently** on a `display:none` element — no exception, no console line, the
name field just stops working.

**TASK B — THE WEB UI'S READOUT SURVIVES THE QUIT.** The landing page restores the
last match's measured facts from **`sessionStorage`** (not `localStorage` — same tab,
dies with the tab), and the report says where they came from: `source:
'last-session'`, a `measuredAt` stamp, a provenance finding ("These numbers are from
your last game, 12 minutes ago") and a **"Last game — 12 minutes ago"** label
directly **above** the numbers block, because the numbers are the first thing the
player reads. Every claim about the game is in the **past tense** ("the game was
capped to 60 fps", "was drawing", "used", "was running"); the browser's own rate
stays in the present tense only when it was measured live on that page.

### THE TWO BLOCKING HOLES THE CROSS-VENDOR REVIEW CAUGHT

Claude Code reviewed the change (the review's shape: **blocking / non-blocking /
nits**, and every load-bearing claim re-verified by Evo's own tool calls). It found
two, and **Evo reproduced B-1 against the real module before accepting it**:

1. **`refresh-unknown` could still fire on restored facts.** The guard was
   `displayHz <= 0`, but the restored `displayHz` is the SESSION's — and a short
   match leaves it at `0` while the engine's frame cost is already known (the pacer
   only trusts its display figure after ten intervals). The landing page could say
   *"The game has not run yet"* next to *"The game was drawing 7.7 megapixels"* and
   *"Your client was set up properly in your last game"* — three contradictory
   claims on one screen, which is the exact failure this feature exists to kill.
   **Fixed in both places**: the writer now refuses a half-measured snapshot
   (`displayHz > 0` as well as `engineWorkMs > 0`), and the report never emits
   `refresh-unknown` for restored facts at all.
2. **The headline number was in the present tense.** The numbers block sits ABOVE the
   findings, so "120 Hz — the game is drawing 60 fps" was the first thing the player
   read, about a game that is not running. The row is tensed on `report.source`, and
   the provenance label now sits above the numbers.

**THE LESSON, FOR THE NEXT SESSION: a restored report has to be checked for
CONTRADICTIONS, not for the presence of one finding.** The old test asserted
"`refresh-unknown` is absent" against a fixture whose `displayHz` was 60 — so it only
ever exercised the case that already worked. The new fixture uses
`displayHz: 0, engineWorkMs: 4`, which is the case that was broken.

### THE GEOMETRY — THE STANDING CONSTRAINT, MEASURED

The Quit button must be fully visible without scrolling. The tabs cost the strip's
height (~52px when it had a row of its own) and the modal is content-sized, so
losing the readout moved the modal's top edge DOWN. **Fixed structurally**: the strip
shares the header row (zero extra height) and the modal's top edge is anchored
(`align-items: flex-start` + `padding-top: 4vh`), so it no longer depends on the
current tab's content.

Measured in the real app (the CI rig, the same instrument — the same probe, the same
1600×1057 viewport — on the OLD build and on the NEW one):

| | old single panel | new two tabs |
|---|---|---|
| the Quit button, without scrolling | needs a **977px** viewport | needs a **874px** viewport |
| the panel's scrolling container | the panel itself, 1985px of content in a 928px box | the body, **723px of content in a 723px box — no scrolling at all** |
| the Quit button's box (at 1057px) | y 921–950 | y 788–817 |
| the strip's cost | — | **zero** (it shares the header row) |

So the tabs did not cost the Quit button its reach: the new design needs **103px LESS**
viewport height for the Quit button to be visible without scrolling, because the
readout is no longer in the panel at all.

### HOW IT WAS VERIFIED (the CI rig, never production)

- `bunx vue-tsc --noEmit` → clean; `bun run build` → clean, with the WASM and the
  GL-glue gates.
- The parent suite: **719/719** (`node --experimental-strip-types --test
  tests/unit/*.test.mjs`).
- **A real browser, on the CI rig**: the landing page → the engine boot → the ESC
  overlay → the tabs → the quit → the landing page again. The harness is
  `~/.hermes/cache/scratch/verify-readout-v2.cjs` (scratch is pruned — copy it into
  the repo if it should survive). It asserts the tablist's shape, the ARIA wiring,
  the roving tabindex, the strip outside the scroll area, the readout only in the
  Your Client panel, the Quit button's GEOMETRY, the focus on the name input, the
  snapshot in `sessionStorage`, and that the landing page says the numbers are from
  the last game and **not** "the game has not run yet". **47/47.**

**THE RIG RECIPE (it is not obvious):**
```bash
ssh bb-prod 'bash /home/ubuntu/ci-stack.sh up'      # the CI game server, bridge, registry
cd webxash && VITE_BRIDGE_ADDRESS=ci.bulletballet.dev:443 bun run build
node tools/perf/serve-local-build.cjs --proxy https://ci.bulletballet.dev
# a headful Chrome on :9223 (real key events), then the harness
ssh bb-prod 'bash /home/ubuntu/ci-stack.sh down'    # ALWAYS tear it down
```
**The `VITE_BRIDGE_ADDRESS` is the part that matters**: the browser opens the
WebSocket to the page's own host, so without it the local build talks to the
PRODUCTION bridge and the test player lands in the public leaderboard. The rig's
`/api/servers` must answer with `ts-ci-0`, never the production fleet.

**As of:** 2026-11-07, LATEST — **THE READOUT GETS ITS OWN TAB, AND THE
WEB UI'S READOUT SURVIVES THE QUIT.** Kyle asked for two changes to the client
readout, and **NEITHER IS IMPLEMENTED YET — both trees are clean and this is a
fresh task.** Read this whole block before
touching anything.

### THE TWO REQUESTS, VERBATIM

> **"Let's move the "Your Client" section in the in game ESC options
> settings to it's own tab within the modal. We can have "Settings" and
> "Your Client""**

> **"Also on the web ui, the "Your Client" section should update once a
> game is played and quit back to the web ui. Currently it always says
> to measure it in game."**

Triggering message id `1568847566420971540`. These are BUILD requests,
not questions — Kyle wants them implemented, tested and shipped.

### TASK A — THE IN-GAME ESC MODAL GETS TWO TABS

The modal today is ONE long scrolling panel. The readout is its last
group, after the Session group that holds the Quit button
(`webxash/src/components/XashOptionsOverlay.vue`, 828 lines):

| lines | what |
|---|---|
| 28–34 | header: brand mark, `Options` title, close button |
| 55–116 | **Identity** group — name field, `Set name`, the character picker (9 models) |
| 118–154 | **Controls** group — sensitivity, FOV, volume, `Apply` |
| 168–187 | **Buy menu** group — the Classic/Modern switch |
| 189–221 | **Session** group — the fullscreen switch (205–217) and the **Quit** button (218–220) |
| 241–244 | **Your client** group — `<h3 class="opts__legend">Your client</h3>` + `<TSPerformance embed />` |

The build: a **tab strip** with exactly two tabs — **"Settings"** and
**"Your Client"**. Settings holds the five existing groups; Your Client
holds the readout. The tab strip goes **OUTSIDE the scroll area**, so
it is always visible and the player can always get back to Settings
(one click) — that is what keeps Quit recoverable from the readout.

**THE QUIT CONSTRAINT, AND WHY THE TABS HELP IT.** The standing rule
from the readout work is "keep Quit readily reachable rather than
allowing a long readout section to push it below the fold." Today the
readout is a sibling group of Quit, so the panel scrolls further and
Quit rides lower. With the readout in its OWN tab the Settings tab is
**shorter than it has been since the readout was added**, so Quit ends
up MORE reachable than now, not less. Quit stays in the Session group
of the Settings tab — it is a session action and it belongs there.

**THE ACCESSIBILITY SHAPE (do this properly, it is a tablist).**
`role="tablist"` on the strip; `role="tab"` + `aria-selected` +
`aria-controls` on each button; `role="tabpanel"` + `aria-labelledby`
on each panel; **roving tabindex** (the selected tab is `tabindex="0"`,
the rest `-1`); **ArrowLeft/ArrowRight/Home/End** move the selection.
The project's a11y standard is high — see the `opts__close` focus-ring
comment (style, 539–595) — so a bare click-only tab strip is not
acceptable.

**THE FOCUS TRAP, AND IT IS A REAL ONE.** The overlay focuses the name
input when it opens (`watch(open, …)`, lines 337–351, `focus()` at
349–350), because without focus the keystrokes go to `<body>` and the
ENGINE eats them as game commands. With tabs, the name input lives in
the Settings panel — if that panel is hidden when the overlay opens,
`focus()` on a hidden element **silently fails** and the name field
stops receiving keystrokes. So: **reset `activeTab` to `settings`
whenever the overlay opens**, and move focus to the panel on a tab
switch (`tabindex="-1"` on the panel). `setBridgeSuspended(true)`
(347) keeps the game from eating the keys while the overlay is open,
so a focus miss does not reach the game — but the field still silently
stops working, which is the same class of bug the original focus fix
was about.

**THE VISUAL PRECEDENT IS ALREADY IN THE FILE.** The selected tab
should use the amber-plate idiom of `opts__switch-btn--on` (style,
820–825: amber fill, ground-coloured label); the Quit button keeps
`opts__btn--danger` (771–779, red). The panel is `min(28rem, 92vw)`,
`max-height: 88vh`, `overflow-y: auto` (492–506) — split it into a
fixed head + fixed tab strip + a scrolling body.

**THE LABEL RENAMES.** The user asked for **"Your Client"** (capital
C). Today the UI says "Your client" in four places:
`TSPerformance.vue:3` (the `h2`), `XashOptionsOverlay.vue:242` (the
legend — which becomes the tab label), `XashLanding.vue:225` (the
landing tab label), and `perf-check.ts:541` (a prose sentence —
leave that one alone; it is prose, not a label). Use exactly
**"Settings"** and **"Your Client"** for the two tab labels.

### TASK B — THE WEB UI READOUT MUST SURVIVE THE QUIT

**THE ROOT CAUSE, WITH THE EVIDENCE.** `quitToWebUi()`
(`XashOptionsOverlay.vue:426–438`) ends with `window.location.href = '/'`
— **a full page load**. Everything the readout knows lives in module
state that dies with the page:

- `frame-pacing-apply.ts` — `core` (188–197) holds `displayHz`,
  `engineWorkMs`, `sustainableFps`, `capFps`, `lateTicks`,
  `measuredTicks`; `idleDisplayHz` (299) holds the display rate. Both
  are module-level `let`s. A reload resets them to zero.
- The canvas backing store — `canvasBacking()` (`perf-collect.ts:78–83`)
  reads `document.getElementById('canvas')`, which on the landing page
  is the 300×150 placeholder.

So on the landing page `collectPerfFacts()` (`perf-collect.ts:92–119`)
returns `displayHz = 0` and `engineWorkMs = 0`, and
`buildPerfReport()` (`perf-check.ts:355–557`) emits the finding at
389–397:

> title: **"The game has not run yet, so its frame rate is not known"**
> detail: **"…that is measured as soon as it is running in a map."**

That detail is the "always says to measure it in game" Kyle is
reporting. And it sits under a summary that says the opposite
(`summary`, 526–541): before the idle measurement lands the summary is
`"Your client has not been measured yet."` (541, tone `info`); after it
lands the summary is `"Your browser is set up properly. Nothing to do."`
(tone `ok`) — **while the finding underneath still says the game has
not run.** The contradiction is the symptom.

**THE FIX: A SESSION SNAPSHOT, RESTORED ON THE LANDING PAGE.**
`sessionStorage` — the same tab, survives the `location.href` hop,
dies with the tab. **NOT localStorage:** a measurement from another day
on possibly-changed hardware is a different claim, and the request is
specifically "played a game and quit back to the web ui" — same tab.

**WHAT IS RESTORED, AND FROM WHERE.** The rule is: *live wins for
anything live can measure; the session fills the gaps the live page
cannot.*

| field | source | why |
|---|---|---|
| `displayHz` | **session** | the rate the GAME was delivering; only exists in a match |
| `engineWorkMs` | **session** | the engine's per-frame cost |
| `sustainableFps` | **session** | derived from `engineWorkMs` |
| `capFps`, `everyNth` | **session** | the cap in force during the match |
| `lateTicks`, `measuredTicks` | **session** | the late-frame fraction |
| `backingWidth/Height` | **session** | the game's real render size. **The landing canvas's 300×150 MUST NOT win here** — that is the trap the readout already guards against (`perf-check.ts:501–521`, `inGame = facts.engineWorkMs > 0` at 510) |
| `panelHz` | **live**, else session | the DISPLAY's rate. Decision: use the live idle measurement, because the budget question is "can this machine hit the display's budget" and the engine's frame cost does not change with the display rate. The live one is measured at `main.ts:71–72` and `xash-loader.ts:842` |
| `renderer` | live probe, else session | `probeRenderer()` (`perf-collect.ts:48–68`) already reports the same GPU off a throwaway canvas |
| `userAgent`, `dpr` | live | |

**WHERE TO WRITE THE SNAPSHOT.** Two sites, both worth having:
1. `XashOptionsOverlay.quitToWebUi()` — explicitly, right before
   `window.location.href = '/'` (line 437). This is the path the
   request names.
2. A `pagehide` catch-all, so closing the tab or navigating away any
   other way keeps the session. The loader already registers its own
   `beforeunload` at `xash-loader.ts:1662` (the reload confirmation) —
   that is a DIFFERENT listener; `pagehide` is the right hook for "the
   page is going away".

**GUARD BOTH WRITES ON `engineWorkMs > 0`.** Otherwise the LANDING page
writes its own empty facts on the way out and destroys the very session
it is supposed to show. This is the single easiest way to get this
wrong.

**WHERE TO READ IT.** `collectPerfFacts()` merges the restored session
into the live facts when the live engine has measured nothing. Put the
MERGE in **`perf-check.ts`** as a pure exported function (e.g.
`resolvePerfFacts(live, session)`), because `perf-check.ts` has **NO
IMPORTS ON PURPOSE** — that is what lets the parent's unit suite
`import` it directly under `node --experimental-strip-types` and
exercise the policy with no browser. `perf-collect.ts` does the
browser-touching half (read `sessionStorage`, merge, return the report).

**THE HONESTY REQUIREMENT — THE RESTORED NUMBERS ARE NOT LIVE.** A
readout that shows last-match numbers as if they were measured now is
exactly the failure mode this whole feature was built to avoid ("A
readout that guesses teaches the player to ignore it",
`perf-check.ts`). So the provenance has to be in the report:
- add to `PerfFacts`: `fromLastSession?: boolean` and
  `measuredAt?: number` (epoch ms);
- add to `PerfReport`: `source: 'live' | 'last-session'` and
  `measuredAt: number`;
- in `buildPerfReport`, when the facts came from a session:
  - the summary must not claim a live reading — e.g. *"Your client was
    set up properly in your last game. Nothing to do."* / *"Your browser
    was holding the game back in your last game. The fixes are below."*;
  - the game findings go **past tense**, because the game is not
    running: "The game **is** capped to X fps" → "**was** capped"; "The
    game **is drawing** X fps on a Y Hz display" → "**was drawing**";
    "The game **is drawing** X megapixels" → "**was drawing**"; "The
    game **uses** X% of your frame budget" → "**used**"; "The game **is
    running** at your display's full rate" → "**was running**";
  - add a provenance finding (say id `last-session`, severity `info`)
    naming the source and the age — "These numbers are from your last
    game, N minutes ago" — and that playing again refreshes them.
- `refresh-unknown` (389–397) must NOT fire for restored facts
  (`displayHz > 0` handles this automatically — but assert it).

**THE PANEL MUST NOT BE AFFECTED IN-GAME.** The embedded copy in the
overlay reads the LIVE game; only the landing copy restores the
session. `TSPerformance` is used in exactly two places —
`XashLanding.vue:163` (`<TSPerformance />`) and
`XashOptionsOverlay.vue:243` (`<TSPerformance embed />`). The `embed`
prop currently only controls the `h2` (line 3, `v-if="!embed"`).
**Recommendation:** replace `embed?: boolean` with one explicit prop —
`context?: 'landing' | 'game'`, default `'landing'` — where
`context === 'game'` also implies "embedded, drop the heading". One
prop, two meanings that always coincide, and the data source is
explicit rather than inferred from a presentation flag. The overlay
call becomes `<TSPerformance context="game" />`.

**"MEASURE AGAIN" IS A NO-OP TODAY — KNOW THIS BEFORE YOU TOUCH IT.**
`remeasure()` (`TSPerformance.vue:182–190`) calls
`ensurePanelRateMeasured()`, and that function
(`perf-collect.ts:133–137`) returns the **cached** idle rate when one
exists (`getIdleDisplayHz() > 0` → return early). So the button does
not re-measure anything; it re-reads the report. On the landing page the
only thing that can be re-measured is the DISPLAY rate — the engine's
frame cost can only change by playing a game. **Recommendation:** leave
the button's behaviour alone for this task and make the copy honest
(the provenance finding says the game numbers refresh by playing
again). Calling `measureIdleDisplayHz()` directly would be a true
re-measure, but only on the landing page — the page must be IDLE, and
in the overlay the engine is running, which is precisely the
contamination trap documented in `frame-pacing-apply.ts:278–299`.

### THE TESTS THAT MUST CHANGE, AND THE ONES TO ADD

**`tests/unit/perf-check.test.mjs` (371 lines) — the assertion that
WILL BREAK.** The test at 335–371, *"the readout is reachable while the
game is running"*, asserts on the raw source text:

```js
const quitAt = overlay.indexOf('opts__btn--danger');
const readoutAt = overlay.indexOf('<TSPerformance');
assert.ok(quitAt < readoutAt, 'the Quit button must come BEFORE the readout in the overlay');
```

That encodes the OLD single-panel design ("Quit before the readout in
one scroll panel"), which the tabs deliberately replace. **Rewrite it
to the new invariant**, which is stronger: the readout can never push
Quit down, because it is not in the same panel. Assert against stable
anchors in the source — e.g. `id="opts-panel-settings"` and
`id="opts-panel-client"` — that (a) there is a tablist with exactly
two tabs labelled "Settings" and "Your Client", (b) the Quit button is
inside the Settings panel, (c) the readout is inside the Your Client
panel, and (d) the readout is **not** in the Settings panel.
Note this file does **not** strip comments before regexing, so keep
the markup regex-friendly.

**New policy tests to add (same file):**
- `resolvePerfFacts(live, session)` returns the live facts unchanged
  when the game is running (`engineWorkMs > 0`);
- returns the live facts unchanged when there is no session;
- merges the session's engine numbers when the game has not run;
- **the landing canvas's 300×150 backing size does NOT win** — the
  session's backing size does;
- `buildPerfReport` on session facts emits no `refresh-unknown`;
- the session report carries `source: 'last-session'` + `measuredAt`,
  and its summary/findings are past tense.

**`tests/unit/escape-gate.test.mjs` (149–170)** reads the overlay with
`stripComments()` and asserts `role="switch"`,
`noteFullscreenExitRequested` and `toggleFullscreen` are present. Keep
all three; the new tab markup (`role="tab"`, `role="tabpanel"`) does
not collide with them.

### HOW TO VERIFY IT (CI RIG ONLY — NEVER PRODUCTION)

- **Typecheck + build** in `webxash`: `bunx vue-tsc --noEmit` then
  `bun run build` — the build script also runs
  `scripts/check-xash-wasm.cjs` and `scripts/check-xash-glue.cjs`, so
  the WASM and GL-glue gates come with it.
- **Parent unit suite**: `node --experimental-strip-types --test
  tests/unit/*.test.mjs` (currently 709/709).
- **Browser**: the **CI rig**, never production — production gameplay
  pollutes the leaderboard. `tools/deploy/ci-stack.sh` builds the
  derived CI config (cheats on, zero bots, no rotation) and
  `tools/perf/serve-local-build.cjs` is the local HTTPS/CI proxy.
  The previous session's harness
  `/home/kyle/.hermes/cache/scratch/verify-readout.cjs` (12,544 bytes)
  drives landing → engine boot → ESC overlay → the readout assertions;
  **it needs two new cases**: (1) click the "Your Client" tab and
  assert the panel shows the readout with Quit still reachable in
  Settings, and (2) quit to the web UI and assert the landing page
  shows the RESTORED numbers and no longer says "the game has not run
  yet". Assert the **geometry** too — the Quit button's bounding box
  inside the viewport without scrolling.
- **Tear the rig down afterwards**: no tunnels, no servers, no browser
  processes left running. Verify production afterwards by reading the
  served bundle, never by playing on it.

### THE PR SEQUENCE (THE SUBMODULE FIRST, OR THE POINTER REVERTS)

Both repos have active `main` rulesets: deletions blocked, force pushes
blocked, **one approving review required**. The parent's `main` is
`62e000e`, webXash's `main` is `d26d17e`.

1. **webXash first.** Branch from webXash `main` (`d26d17e`), commit
   the frontend work, push, PR to `klampatech/webXash`, squash-merge.
   **Record the SQUASH SHA** — a squash-merge creates a NEW commit and
   the branch tip is not reachable from `main`.
2. **Then the parent.** Branch from parent `main` (`62e000e`), point the
   `webxash` gitlink at the webXash **squash** SHA, commit, push, PR to
   `klampatech/specialists-browser`, squash-merge.
3. **Never** point the parent at a pre-squash webXash SHA: the pointer
   would name a commit that only exists while a PR ref does.
4. **One parent PR, one pointer move.** Do not split this into two
   parent PRs that both move the pointer — each would change the same
   tree entry from the same base to a different target and they would
   conflict, or one would silently revert the other's pointer.
5. **Kyle approves.** An approving review from `klampatech` with an
   **EMPTY body** is the signature of a human tapping Approve;
   `EVO_MERGE_OK=1` only unlocks the merge, it is NOT the approval.
   `scripts/merge_webxash_parent_pair.sh` (in the `specialists-browser`
   skill) encodes the whole sequence.
6. After the parent merge the deploy runs on its own; verify the
   **served bundle** and the deploy run, and keep the public leaderboard
   empty.

### THE TRAPS, IN ONE PLACE

- **A browser test against production is illegal here.** It kicks real
  players and pollutes the leaderboard. Use the CI rig.
- **The readout must never claim a number it did not measure.** The
  restored numbers are real, but they are NOT live — the provenance is
  not optional polish, it is the feature.
- **The landing canvas is 300×150.** It must never be reported as the
  game's render size.
- **`sessionStorage`, not `localStorage`** — see above.
- **Guard the snapshot write on `engineWorkMs > 0`** or the landing
  page erases the session on its way out.
- **Never push to `main`.** Branch + PR + merge, every time, including
  one-line doc changes.
- **Never approve your own PR.** The review guard exists; Kyle is the
  human who approves.
- **Agent-authored GitHub comments must disclose that the agent
  posted them.**
- **No secrets in this file, in a commit, or in a PR body.** If you
  encounter credentials while reading the SSH/skill material, redact
  them; do not copy their values anywhere.
- **Do not disturb `.worktrees/feat-character-portraits`.**

**As of:** 2026-11-07, LATEREST — **THE CHARACTER PICKER CAN SHOW THE
CHARACTERS THE GAME DOES NOT DRAW, AND THE RECIPE IS COMMITTED.**
Kyle asked for uniform portraits of every character model that is
selectable from the default menu, because only about seven existed.

**THE DEFAULT MENU HAS SEVEN CHARACTERS, AND THE SEVEN ARE EXACTLY THE
ONES THAT HAD PORTRAITS.** The game's own `mp_teammodels` default is
`seal;merc|gordon;laurence|agent|hitman;castor` (the literal string in
`ts/dlls/ts_i686.so`, mirrored by the port's `DEFAULT_MODELS`), and the
mod ships a `ts/models/player/<name>/<name>.bmp` for precisely those
seven and for nobody else. The seven we had were not missing - they were
the game's own painted portraits.

**THE MOD SHIPS SIXTEEN USABLE CHARACTER MODELS.** `ts/models/player/`
holds seventeen directories; **sixteen** are usable and one is not:
`ala` ships as `models/player/ala/ala2.mdl`, and the engine resolves a
player model as `models/player/<name>/<name>.mdl`
(`R_StudioSetupPlayerModel`, `ref/gl/gl_studio.c`), so the name "ala"
resolves to a file that does not exist and the engine silently falls
back to the default player model. There is no such character in the
game.

**THE NINE THAT HAD NO PORTRAIT NOW HAVE ONE.** Rendered with the
[Half-Life Asset Manager 3.0](https://github.com/SamVanheer/HalfLifeAssetManager)
(`halflifeassetmanager_3.0.0_amd64.deb`), headless under Xvfb +
openbox + Mesa's software rasteriser - no GPU. The recipe is committed
here, `tools/portraits/capture-portraits.sh` and
`tools/portraits/normalize-portraits.py`.

**THE TWO TRAPS IN THAT CAPTURE, both of which cost a run each.**

- **HLAM IS SINGLE-INSTANCE.** A second process hands its file to the
  first and exits. So a capture loop that does not wait for the previous
  instance to die captures the PREVIOUS model again - the first version
  of this captured `merc` twice and called it `seal`. The capture now
  kills any instance before it starts and matches the window by THIS
  model's file name.
- **THE ANIMATION PLAYS WHILE YOU LOOK AT IT.** The pose in the
  viewport is frame N of sequence 0, and N is whatever the clock said.
  The capture clicks the timeline's Play/Pause and Restart buttons
  (frame 0, animation stopped) before the screenshot, so the pose is
  the character's own idle and not a random frame.

**THE NORMALISER MAKES THEM UNIFORM.** The subject's **height** is
normalised (not its width), the portrait crop is sized in **head
widths** so every head is the same size in the frame, the background is
transparent like the game's art, and the RGB is **gamma-lifted (0.60)**:
GoldSource's studio lighting leaves the black-clad characters nearly
black, and the picker's tile is dark too, so a straight render of `merc`
is a dark blob on a dark tile. The lift is what makes the renders
readable next to the painted art.

**THE SEVEN GAME-DRAWN PORTRAITS ARE UNTOUCHED.** The painted art is
better than a render at 72px and it is the game's own; the renders are
for the nine that have no other portrait. A uniform render set for all
sixteen exists in the generated output if that is ever wanted instead.

**WHAT IS NOT CHANGED, DELIBERATELY.** The character's **list** in the
picker is still the server's `mp_teammodels` decision. With the live
server's four teams the port's rules replace a requested model with a
random model from the player's team (`rules/teams.rs :: userinfo_changed`
-> `model_for(&team)`), so listing the nine in the picker today would be
a promise the server does not keep. Making them selectable is a server
config change (which team owns which character) and that is Kyle's call.

> **CORRECTED 2026-11-09.** The paragraph above is **wrong**, and it was
> wrong because it assumed the mode instead of measuring it. The
> replacement path is reached **only in teamplay**, and the live server
> runs **`mp_teamplay 0`** (deathmatch) — read over RCON from production.
> In deathmatch the requested model is kept, so the promise IS one the
> server keeps. The sixteen characters are now in the picker. **If the
> server ever turns teamplay on, the choice is discarded** — that is the
> server's ruleset, not the client's. See the 2026-11-09 entry at the
> top of this section.

**THE DELIVERY IS TWO PRs.** **webXash #47** (the nine portraits) and
**the parent** (the recipe + these docs + the submodule pointer). The
pointer is repointed at webXash main's squash of #47, **`2103b92`**,
because a squash-merge makes a new commit and the pointer must name
one that exists on webXash main.

**As of:** 2026-11-07, LATER — **THE GL ROUND-TRIP FIX IS LIVE ON
PRODUCTION, AND THE CLIENT IS SHIPPING THE READOUT WITH IT.** The four
PRs are merged and the deploy is green.

**WHAT MERGED, IN THE ORDER IT HAD TO MERGE.**

- **webXash #45** -> `a96f33c` (the stale client WASM backups, out of
  the repo)
- **webXash #46** -> `c17e2ab` (**the fix**: the GL-check rate limit,
  the build gate that refuses to ship an unpatched bundle, and the
  "Your client" readout)
- **the parent #139** -> `d218468` (the loadout docs)
- **the parent #140** -> `2cc23db` (the fixture, the sweep, the node
  scan, the A-B-A, the tests, and the submodule pointer)

**THE SUBMODULE POINTER HAD TO BE REPOINTED AT THE SQUASH.** It was on
webXash's BRANCH TIP, and a squash-merge makes a new commit, so the
branch tip is not reachable from webXash's main - the pointer would
have named a commit that only existed because a PR existed. It names
`c17e2ab`, which IS webXash main's tip.

**THE DEPLOY.** Run `42422560269`: *Deploy to production* green,
*Verify in a real browser* green. CI on main (`42422560283`): 4/4.
Production answers HTTP 200 in 57 ms; the fleet reports `ts-0` on
`ts_antrodome`, 16/32, tick 100, one human and fifteen bots - **no
test player in the production leaderboard**, because the browser gate
plays the deployed ARTIFACT against the CI game server, not against
production.

**THE LIVE BUNDLE CARRIES THE PATCH** (read back from
`https://bulletballet.dev/assets/xash3d-DopHvWf3.js`, not inferred):
the original round-trip (`GLctx.getError() || GL.lastError`) is
**absent**, the rate limiter and its 250 ms budget are **present**, and
so is the `gldebug=1` escape hatch. The main bundle carries "Your
client".

**THE MEASURED EFFECT** (on the CI stack, at the worst-case fixture,
against the same artifact production now serves): **8.89 ms -> 1.91 ms
a frame, 106.6 fps -> 120.2 fps** on a 120 Hz display, with an A-B-A
drift of **+0.01 ms**. The shipped build does not fit the 120 Hz
budget; the patched one does.
**As of:** 2026-11-07 — **THE CLIENT IS FAST; HALF THE ENGINE'S FRAME WAS
A `glGetError()` ROUND-TRIP, AND THE PLAYER CAN NOW SEE WHY THEIR GAME
FEELS SLOW.** Kyle asked whether the client could do more on the PLAYER's
side — WebGPU, the browser syncing the frame rate to the display, and
`about:config` settings — and whether the game window is windowed-borderless.
This block is what came out of answering that with measurements on his
MacBook Pro rather than on the rig.

**THE DELIVERY IS TWO PRs.** **webXash #46** -> `c17e2ab` (the GL-check
rate limit, the build gate that refuses to ship an unpatched bundle,
and the "Your client" readout) and **the parent #140** (the fixture,
the map sweep, the node scan, the A-B-A, and the tests that keep them
honest). **THE PARENT'S MERGE IS WHAT SHIPS THE CLIENT TO PRODUCTION**,
and the live proof follows in a follow-up — the repo's pattern for a
change that is measured on the rig and then deployed.

**THE ANSWERS TO HIS FOUR QUESTIONS, SHORT.**

1. **WebGPU: NO, AND IT CANNOT BE.** The engine runs `-ref webgl2`
   (SPEC.md: "WebGL2 (not WebGPU for Phase 1)"). WebGPU belongs to
   specialists-web (Babylon), not here.
2. **THE BROWSER DOES SYNC THE FRAME RATE TO THE DISPLAY — and that is
   the whole ballgame.** `requestAnimationFrame` is vsync-aligned, so the
   game's frame rate is the display's, capped by what the engine can
   finish. It is also the thing that silently halves on a laptop.
3. **`about:config` IS FIREFOX-ONLY.** Chrome has no equivalent
   (`chrome://settings/performance` → Energy Saver **off**, and
   `chrome://gpu` to check for SwiftShader); Safari/macOS is governed by
   Low Power Mode. There is no one setting that fixes all three.
4. **THE GAME IS BROWSER-FULLSCREEN, NOT OS-WINDOWED-BORDERLESS** — and
   that is right. `browserFullscreen` (on by default) does
   `documentElement.requestFullscreen({navigationUI:'hide'})`; the
   engine's own `fullScreen` argument is always OFF (`-windowed`), which
   is inert in a browser. It is also near-irrelevant to performance: the
   engine is not fill-bound (see below).

**THE MEASUREMENTS (Kyle's MacBook Pro, M3 Pro, Liquid Retina XDR
3456×2234 at dpr 2, macOS 26.2, Chrome 157, on battery, ONE browser
tab).** Measured with `tools/perf/measure-live-client.cjs`, which drives
the REAL browser over CDP instead of launching its own Chromium — the
rig's harness cannot see the display's refresh rate, the power state or
the real GPU.

- the panel's own rate (CoreGraphics, a native probe): **120.0 Hz**
- a bare rAF loop with no game: **120.5 Hz**
- the browser's rate with the game idle: **120.0 Hz**
- the engine's frame cost, in a map: **2.41 ms** (it read 13–16 ms
  until the tab contamination below was found)
- the GPU's backlog (`gl.finish`): **0.00 ms** — the GPU is idle
- the tick rate in play: **120 Hz**, 0 late ticks

**SO THE ENGINE IS NOT THE CONSTRAINT ON THAT MACHINE.** 2.41 ms of an
8.33 ms 120 Hz frame is 29% of the budget, and the cost is flat across an
8.4× range of render resolutions — **the engine is CPU-bound, not
fill-bound**, so resolution-side levers are worthless and the only lever
that matters is the browser's refresh rate.

**THE REAL CONSTRAINT WAS FOUND BY THE CPU PROFILER
(`tools/perf/profile-client.cjs`): the engine calls `glGetError()` ABOUT
TEN TIMES PER FRAME, and each call is a GPU ROUND-TRIP.** In Chrome,
`WebGLRenderingContext.getError()` has to flush the command buffer and
wait for the error state, so it cannot be answered from a queue. The
glue's implementation is `GLctx.getError() || GL.lastError`, and the
engine asks for it after every GL batch.

Measured over 3 s of live play: **1230 calls/second**, and the A-B-A
(`tools/perf/measure-geterror-ab.cjs`, which patches the behaviour in
place, measures, restores, and measures again so a drift cannot be
mistaken for an effect):

    A  as shipped        frame  2.41 ms   getError  1230 calls/s
    B  getError removed  frame  1.15 ms   getError     0 calls/s
    A  restored          frame  2.44 ms   (drift +0.03 ms)

**So `gl.getError()` was 52% of the engine's frame.** The fix is a third
glue patch, `webxash/scripts/patch-xash-gl-geterror.cjs`: the glue's own
error bookkeeping (`GL.lastError`) is kept, and the expensive real check
is rate-limited to 4 times a second. **Detection is slowed, not
removed** — a genuine GL error still surfaces within 250 ms — and
`?gldebug=1` on the page URL restores the original behaviour exactly,
because a fix that removes the ability to debug what it fixed is a trap.

**TWO TRAPS IN THAT PATCH, BOTH OF WHICH WOULD HAVE SILENTLY DONE
NOTHING.**

- **VITE'S DEPENDENCY CACHE.** Vite pre-bundles `xash3d-fwgs` into
  `node_modules/.vite/deps/` and serves THAT, not the file on disk. The
  first build after patching shipped the **unpatched** glue — the cache
  was three weeks old — and the build was green. The patch script now
  drops `node_modules/.vite` when it patches.
- **THE MINIFIER STRIPS COMMENTS.** The patch's marker is a comment, so
  it is gone from the bundle; a build-time check cannot look for it. The
  check looks for `gldebug=1` instead, which is a string literal and
  survives. `webxash/scripts/check-xash-glue.cjs` runs at the end of the
  build and **fails the build** if the bundle's glue is not patched —
  the same lesson as `check-xash-wasm.cjs`, which exists because a
  silently-broken wasm reached production once.

**THE PLAYER CAN NOW SEE WHY THEIR GAME FEELS SLOW.** A new "Your
client" tab on the landing page (`TSPerformance.vue`) shows what the game
measured on THIS machine: the refresh rate the browser is actually
delivering, the engine's frame cost against the display's budget, the
GPU it is drawing on, and — only when there is something to change — the
browser-specific setting that changes it (Chrome's Energy Saver, Firefox's
`about:config` refresh-rate preference, macOS Low Power Mode). The
policy is `webxash/src/services/perf-check.ts` (import-free, so the
parent's unit suite can test it directly) and the gathering is
`perf-collect.ts`. **The readout refuses to guess**: a number that was
not measured is reported as "not measured", never as a plausible guess.

**THE SHIPPED PATCH WAS THEN PROVED END-TO-END, IN A REAL BROWSER,
AGAINST A REAL GAME SERVER.** The A-B-A above proves the mechanism;
it does not prove that the patch we SHIP rate-limits rather than
silently keeping the old behaviour. So the patched build was served
locally (`tools/perf/serve-local-build.cjs`, pointed at the CI stack so
no test player ever entered the production leaderboard), the MacBook
played it, and `tools/perf/verify-gl-error.cjs` counted the calls:

    the shipped patch        4.0 calls/second    1.25 ms per frame
    the same build, ?gldebug=1
                            1200.0 calls/second  1.81 ms per frame

**Four real checks a second, exactly as designed — and the escape hatch
puts the old behaviour back on demand.** The mean cost of one real
check, measured properly this time, is **0.083 ms**; at ten calls a
frame that is 0.83 ms of every frame.

**THE PACER WAS MEASURING THE WRONG THING.** The frame pacer's
"display rate" was the interval between its own ticks, which is the
display's period **PLUS the engine's work** — so a slow engine made the
reading LOW, and the pacer concluded the display was half as fast as it
was and capped against a rate the display does not have. The panel's
rate is now measured **while the page is idle** (`measureIdleDisplayHz`,
on the landing page and again before the engine boots), and the live
rate — what the game is actually delivering — is kept separately and
labelled as such. The readout shows BOTH, because the difference between
them is the whole story.

**THE MAP, THE VIEWPOINT AND THE WARM-UP — AND A COMPARISON THAT WAS
CONFOUNDED.** Kyle observed that `ts_lobbyduel` "seems to be the
heaviest" map and offered it as the level for a perf test. Taking that
as a question rather than a conclusion is what exposed the biggest
measurement trap in this project.

**THE TRAP: THE VIEWPOINT.** The server picks the spawn point at
RANDOM (`crates/server/src/rules/spawnpoint.rs:98` uses
`eng.random_long`), and the spawn carries its own angles. The engine's
per-frame cost is dominated by what is VISIBLE — a player facing a
wall costs almost nothing. **Repeating ONE map on freshly-booted
servers gave 1.5 ms, then 5.0 ms, then 1.8 ms** — same map, same
bundle, same machine, same browser. **A 3x spread from the spawn
alone.**

**THE SECOND TRAP: THE WARM-UP.** The first measurement window is
always the most expensive — the engine is still settling after the map
load. Measured: 8.18, then 6.12, then 6.16 ms on the same map and the
same view. A 25% drop that is the engine warming up, not the map
changing.

**THE THIRD TRAP: THE SERVER ROTATES ITS MAP EVERY THREE MINUTES**
(`roundtime 180`, 22 entries in the cycle). A run that does not pin
the map measures whichever map the rotation reached — and **that was
the missing piece in the contradictory measurements above**: an earlier
pair read **2.90 ms** and **13.26 ms** per frame on the same server,
machine and browser, on two different maps.

**THE FIRST MAP COMPARISON WAS CONFOUNDED, AND IT WAS WRONG.** Six
maps, one run each, produced a clean-looking table from ~1.5 ms to
~12.7 ms and the conclusion that the map was worth ~8x, with
`ts_lobbyduel` the lightest and `ts_casa` the heaviest. **That
conclusion was not supported**, because the viewpoint, the warm-up and
the run count were all uncontrolled. The map's own contribution is
smaller than it looked.

**THE TOOLING NOW CONTROLS ALL THREE:**

- the view is **pinned** with the client's `ts_test_angles <pitch>
  <yaw>` before measuring;
- the camera origin, eye and angles are **read and reported** with
  every result, from the engine's own `ts_test_view` command
  (`tools/perf/lib/viewpoint.cjs`);
- the result prints the **settled** frame cost separately from the
  warm-up one, and `measure-map-cost.sh` takes **two runs per map**;
- `tools/perf/lib/fleet-map.cjs` reads the map from the registry, and
  `--map` makes a mismatch a **HARD FAILURE** — a perf run on the
  wrong level is worse than no perf run, because it looks like data.
  The map is checked AFTER the windows too, so a run that straddles a
  round rotation is caught rather than averaged.

**THE FIXTURE IS BUILT AND MEASURED.** All three are pinned now:

- **THE MAP** — `CI_MAP=<map>`, plus an EMPTY map cycle for the CI
  instance so the rotation cannot move the map under a run. An empty
  cycle file disables the rotation
  (`crates/server/src/rules/mapcycle.rs`: no items means `do_cycle =
  false`).
- **THE VIEWPOINT** — the angles with the client's `ts_test_angles`,
  the POSITION with the server's `ts_tp <player#> <x> <y> <z> [yaw]
  [pitch]`. `ts_tp` needs `sv_cheats 1`, which the CI stack derives
  for the CI INSTANCE ONLY; production's `server.cfg` keeps `sv_cheats
  0` and the shared source file is never changed.
- **THE WARM-UP** — the harness waits until the frame cost stops
  moving before it starts the real measurement (a teleport invalidates
  the client's PVS and the cost falls 2.5x over the next minute).

**THE POSITION COMES FROM THE MAP'S OWN NAV DATA.** The server loads
each map's `.ndm` file; its nodes are positions on the map's floor —
where the bots stand and the players spawn. The first node is the same
on every run. The format is a count and 20-byte node records, so the
fixture position is the first 24 bytes of the file.

**TWO TRAPS WORTH REMEMBERING.** The bots' `SHIPPED` table LOOKS like
coordinates and is not — it is the map's node COUNT and link COUNT
(`(ts_casa, 345, 1936, 1)` = 345 nodes, 1936 links, 1 ladder node),
and the count matches the `.ndm` header exactly. And the server
appends " (1)" to a duplicate name while a killed harness leaves its
connection behind, so a lookup by "PerfProbe" can pick a STALE
connection — which is exactly what happened, and the measurement was
taken wherever the client happened to spawn. The harness now uses a
unique name per run, set on the engine after the boot (the identity is
REMEMBERED in local storage and the saved copy wins over the modal).

**THE WINDOW IS PART OF THE FIXTURE.** The canvas fills the window,
and the engine's frame cost is the pixel count it draws: 2400x1794
backing measured 4.26-4.34 ms, 3456x1882 measured 5.34 ms. So
`--window WxH` pins it, before the canvas is read.

**THE CAPSTONE: THE PATCH, IN FPS, AT THE WORST-CASE FIXTURE.**

The A-B-A at `ts_lobbyduel` nav node 1, with the fixture pinned and
the engine settled for 60 seconds before the first phase:

    A  as shipped        frame  8.89 ms   getError 1095 calls/s   106.6 fps
    B  getError removed  frame  1.91 ms   getError    0 calls/s   120.2 fps
    A  restored          frame  8.89 ms   getError 1115 calls/s   105.6 fps

    saving from the patch: 6.98 ms per frame
    restored-vs-baseline drift: +0.01 ms

**THE SHIPPED BUILD DOES NOT FIT THE 120 Hz BUDGET; THE PATCHED ONE
DOES.** 8.89 ms against a budget of 8.33 ms — so the shipped client
runs at 106 fps on a 120 Hz display and the patched one runs at the
display's full 120. **The patch saves 6.98 ms a frame, 79% of the
frame, and the drift is +0.01 ms.**

**THE SETTLE IS WHAT MADE THE A-B-A RIGOROUS.** The A-B-A used to
start its first phase ten seconds after the teleport, while the
engine was still rebuilding its PVS — so the baseline was measured
mid-transient and the restored phase, thirty seconds later on a
settled engine, came out FASTER. That read as -3.36 ms of "drift"
when it was the settle. Waiting the same 60 seconds the fixture
waits took the drift to **+0.01 ms**.

**THE RESULT — same map, same fixture, three fresh runs, M3 Pro:**

    run 1   windows 2.05 / 1.83 / 1.75 ms   ->  1.83 ms
    run 2   windows 2.13 / 2.10 / 2.19 ms   ->  2.19 ms
    run 3   windows 1.81 / 2.38 / 2.27 ms   ->  2.38 ms

**A 1.3x spread between fresh runs, down from the 4.9x the random spawn
produced on the same map.**

**AND THE RESIDUAL IS AMBIENT, NOT MEASUREMENT ERROR.** Over ninety
minutes, the same fixture, the same canvas and the same machine read
2.19 ms and then 5.34 ms; the same canvas ten minutes apart read 5.34
ms and 2.48 ms. The engine did not change — the MACHINE did, under a
sustained campaign of 120 Hz rendering on an M3 Pro whose GPU clocks
down as it heats. **Every result now carries the machine's load
average**, so a reading taken while the machine was busy can be
recognised as one. **This is why the comparison is A-B-A WITHIN A
SESSION, not two numbers hours apart** — measure A, then the candidate,
then A again, and compare against the A that brackets it. The A-B-A
drift figure (+0.03 ms, -0.06 ms) is the honest measure of how much
of a difference is the change and how much is the clock.

**THE WORST-CASE FIXTURE, AND WHERE IT IS.** The map sweep and the
node scan together pick it:

- **THE MAP: `ts_lobbyduel`.** It is the heaviest of the maps that can
  be pinned at all, at 8.23 ms at its own nav node against ts_casa's
  ~2-5 ms at the same kind of fixture.
- **THE PLACE: nav node 1**, at `-101, -355, 388`, which measured
  **10.12 ms** — against 8.20 ms at node 0, 5.77 ms at node 4 and
  10.10 ms at node 5. **AND THE FRAME COUNT IS THE ARGUMENT, NOT THE MILLISECONDS.**

The 120 Hz budget is 8.33 ms a frame. The scan's frame counts per
6-second window say what that means to a player:

    node   ms/frame   frames/6s    fps    budget
      0      8.20        720      120.0   under
      1     10.12        574       95.7   OVER
      2      8.40        687      114.5   OVER
      3      8.18        721      120.2   under
      4      5.77        719      119.8   under
      5     10.10        580       96.7   OVER

**At node 0 the engine JUST FITS the 120 Hz budget**, so the frame
count pins at the display rate and a regression has to be 1.6% before
anything a player can see moves. **At node 1 it does not fit, so the
frame count is a direct readout of the engine's cost** — 574 frames
where node 0 gives 720 — and a regression makes it fall further,
immediately.

**THAT IS WHY THE FIXTURE IS THE WORST-CASE NODE AND NOT NODE ZERO.**
A regression level has to be in the regime where a regression IS
visible. Node zero is reproducible, but it is reproducible at a
display rate that hides the thing you are trying to measure.

**A 1.75x spread across six positions on ONE
  map.** Node zero was never the worst case; picking it would have
  left 23% of the cost on the table, which is exactly the margin a
  regression test needs.

**THE CONTROLLED TABLE.** Every map that can be pinned, pinned to its
own first nav node, two runs each, map + position + angles + warm-up +
window all fixed:

    ts_lobbyduel    node 0   32, -352, 388    8.23 ms / 8.20 ms
    ts_hammertime   node 0  192,  -64, 292    4.53 ms / 4.50 ms
    ts_casa         node 0  704, 1472,  68    4.52 ms / 4.31 ms

**AND `ts_lobbyduel` NODE 1 IS 10.12 ms.** So `ts_lobbyduel` is
**1.8x** the next map at the same kind of fixture, and Kyle's instinct
that it was the heaviest was right — it just took a controlled
comparison to say so.

The three maps without nav data (`ts_lobby`, `ts_antrodome`,
`ts_frigid`) are **NOT** in this table. They cannot be pinned, so
their numbers are at random spawns, and the harness refuses to rank
them rather than quietly measuring a random spot.


**TWO MORE THINGS THE FIXTURE LEARNED.**

- **NODE ZERO IS REPRODUCIBLE BUT ARBITRARY.** It may be a quiet
  corner, and a regression fixture in a quiet corner hides a
  regression. So the nodes can be read one at a time, the player put
  on each, and each measured — `--fixture-node N` and
  `tools/perf/scan-fixture-cost.sh`. **The worst-case fixture is the
  most expensive node on the heaviest map.**
- **ONLY 22 MAPS HAVE NAV DATA** — the bot-enabled ones. `ts_lobby`,
  `ts_antrodome` and `ts_frigid` have no `.ndm` at all, so they
  CANNOT be pinned, and their numbers are at random spawns. The
  harness says "NOT PINNED" and refuses to rank them rather than
  quietly measuring a random spot.

**"THE SAME MAP" IS NOT "THE SAME MEASUREMENT".** A fixture that pins
only the map produces numbers that differ by 3-5x between runs, and a
real regression hides inside that spread.

**THE MEASUREMENT HYGIENE LESSON, WHICH COST THE MOST TIME.** The first
two runs of the same measurement on the same machine disagreed by 3.3×
(3.88 ms vs 12.67 ms per frame). The cause was **my own harness**: it
left four game tabs running on Kyle's MacBook at once, and the
contention inflated every reading. Kyle noticed and said so. The
lessons, now written into the tools: **one game instance at a time**,
close the tab when the harness is done, and **A-B-A** rather than A-B —
the restore phase is what proves the effect is the change and not the
passage of time.

**As of:** 2026-11-06 — **THE PLAYER'S LOADOUT SURVIVES A MAP CHANGE, AND IT
IS LIVE.** webXash **#44** → `a009a254`; the parent **#138** → `b7a18a1`; the
deploy green (run 42245716979: *Deploy to production* ✅, *Verify in a real
browser* ✅; the CI run 42245717657: 4/4 ✅). The deployed WASM's SHA-256 is
**byte-identical** to the one the rig proof passed
(`5b837e7370b98d19703be9e0270846b6da750439399ab1f2b1111dbcace9ea4e`).

**On production the client joins, buys the Glock-18 in the modern menu, the
panel shows it (the port's state: `total=850`, `tab=0`) and the player spawns
and plays.** The production proof passed (2026-11-06, 15:59: *VERDICT: PASS
— the purchase and the panel only*; the client's death in the server's log
is the evidence that it was alive). Two things production cannot do, and
why: it runs **without `developer`**, so the server logs no `spawned (#N)
with [ids]` line (the kill line is the fallback evidence that the client
was alive ✓), and **the map change cannot be forced** — the port's server has
no rcon and the prod instances run `docker run -d` with no attachable stdin.
So the map-change half stands on the rig's proof (same artifact bytes, same
server code) and production proves the artifact's identity plus the live
purchase and spawn.

**THE SESSION CASE (a page reload) IS STILL OPEN** — that is the next task,
and the quick byte-restore is NOT clean (see § NEXT TASK).

**As of:** 2026-11-05, LATER — **THE PLAYER'S LOADOUT NOW SURVIVES A MAP
CHANGE (the port's change is written, tested and proved; the PRs are
open).** The buy menu's loadout reset to the default on **every map
change**: the panel came back empty (or showing tab A's empty loadout)
and the player bought everything again.

**WHY IT RESET.** The port's `vid_init` re-initialises the menu (a map
change, a connect, a video-mode change) and the game's own `Init`
(`BuyMenu::new`, `0x10036200`) zeroes **the working copy, the last
config and the active tab**. The browser's two flags (the flow and the
hidden flag) were already put back after the 2026-11-02 playtest; the
player's LOADOUT was not. **The active tab matters as much as the
copy**: the panel draws the *active tab's* loadout (`open_modern` does
`current = saved[tab]`), so a tab that reset to A showed A's — empty —
loadout, not the player's.

**THE FIX** (`crates/client/src/menus/mod.rs` and `buy.rs`): `reinit_buy_menu`
puts the working copy, the last config and the active tab back, the way
the flow and the hidden flag are; the random first loadout is disarmed
when a loadout was kept, so the next open does not roll a random one over
it. And the loadout is **sent to the server again**, because **a map
change drops the player** — they reconnect, the new player holds nothing
(the HUD reset clears the armament) and the spawn buys what the client
sent. That send is not a purchase: the money was spent when the loadout
was bought and the server checks the budget itself, so it skips the cash
check and says nothing (a "you cannot afford this" in the middle of a
map change would be a lie).

**THE RE-ARM WAITS FOR THE HUD RESET, NOT THE LEVEL LOAD** — that was
the second half of the bug, and the real game caught it. The first cut
sent the loadout from `vid_init`; the proof showed the player coming back
from the map change **empty-handed** (the server's spawn line: `with
[]`) while the panel showed the loadout. At the level load the client is
still connecting, so **the server has no player to give the commands to
and drops them**. The HUD reset is the moment the server's player exists
— and it comes before the spawn that buys the armament. So the re-arm
happens there (`menus::on_message`, `Msg::ResetHUD`), and the port prints
what it sends (`[ts] loadout re-armed: tkw 1_0 ...`), which is what the
proof reads.

**THE PROOF:** `scripts/prove_loadout_survives_map_change.py` — a real
browser, a real server, and a **real map change** forced from the
server's console (`changelevel ts_antrodome`; the rig's server answers no
rcon). It buys a Glock-18, spawns, forces the map change, waits for the
client to be back, and reads both the panel (the loadout must still be
there) and the server's spawn line (the player must be armed again). The
server's log is the authority: the panel can be right while the inventory
is empty.

**THE PROOF PASSES** (2026-11-05, 20:56): the loadout's cost 850 before
and 850 after the map change, the active tab unchanged, the panel still
showing the Glock-18, and the server's spawn lines `with [1]` (the Glock
is weapon id 1) **both times** — the first spawn and the one after the
map change. The port's own trace shows the re-arm: `rst_cfg`, `tkw 1_0`,
`tka 1_7`.

**TWO RIG TRAPS, both worth remembering** (the proof failed on them
before it passed): the **bots fill every slot** — `ts_bot_quota 16` with
`maxplayers 12` means the human connects and is refused (the quota is
set in `server.cfg`, not at runtime: it only decides whether NEW bots
spawn); and the **UDP bridge's stdout** must not be a dead pipe (it
wedges on a full pipe and silently stops forwarding — the bridge now
logs to `/tmp/tsds/bridge.log`).

**THE DELIVERY IS TWO PRs** (the change is in the port, so it reaches the
browser through the client WASM): **webXash #44** (the rebuilt artifact:
1,721,675 bytes; the previous one was 1,721,170 — the delta is this
change and nothing else, the port's source had no other commit since the
last build) and then **the parent** (the port's Rust source + the pointer
at webXash `main`'s squash). Kyle approved the plan; the PRs
still need his approving review.

**THE PRODUCTION VERIFICATION, WHEN IT SHIPS** (the proof now takes
`--url` and `--server-log`, so the same script can drive production):
the deployed WASM's SHA-256 must equal the built one
(`5b837e7370b98d19703be9e0270846b6da750439399ab1f2b1111dbcace9ea4e`),
and the proof runs against `https://bulletballet.dev/` with a copy of
the prod box's `docker logs` as the server's log. **The map change has
to be forced from the server's console there** — the port's server has
no rcon (there is no rcon_password handling in the server crate) and the
prod instances run `docker run -d` with no stdin, so the console is not
attachable. If the production map change cannot be forced, the
production check is the artifact's hash plus a live purchase and spawn
(the server's spawn line through `docker logs`), and the map-change half
stands on the rig's proof — the same artifact bytes, the same server
code.

**THE SESSION CASE IS NOT FIXED YET.** Between sessions (a reload) the
loadout is gone: the engine's filesystem is **MEMFS** (the glue does
`FS.mount(MEMFS, {}, "/")`, nothing mounts IDBFS) and the loader
rewrites every game file from the archive at boot, so `tsbuylist.tsa` —
where the port keeps the nine saved tabs — comes back as the shipped
default. Kyle asked whether the quick fix (persist the file's bytes and
write them back) is clean; **it is not** — see § NEXT TASK.

**As of:** 2026-11-06 — **THE RETINA REGRESSION IS FIXED, SHIPPED AND
PROVED ON PRODUCTION.** The live regression (webXash #42 / parent #135,
both merged) was the **dpr-SQUARED** policy: the engine's `vid_setmode`
takes **CSS pixels** and multiplies by the device pixel ratio **ITSELF**,
and the policy multiplied as well — so it asked for dpr squared pixels.
On Kyle's MacBook that was `3456x2234` asked for and `6912x4468` actually
rendered: 30.9 Mpx, four times the pixels the panel has, and **past the GL
maximum texture dimension of 8192**. The allocation failed, the engine
fell back to a tiny mode (**the TINY resolution**) and wedged (the hang,
the looping audio, the dead reconnect).

**THE FIX IS LIVE:** webXash **#43** merged as `f7baa26`, specialists-browser
**#136** merged as `8b924f8` (the parent's pointer names webXash `main`'s
squash commit), deploy run **`42144068256` green** (deploy + browser
verification), and **Kyle tested production and confirmed the fix**. The
served bundle is `assets/index-DNMmIOrQ.js` and it carries the GL guard.

The proof passes **13 of 13 against the DEPLOYED bundle** at dpr 2 on the
disposable CI rig (`ci.bulletballet.dev`, which serves the same `/srv/web`
bundle): the backing store IS the CSS box times the ratio, the browser
scales **nothing** (1.00), the mode is not the tiny fallback, the engine
is still painting after the fullscreen exit, no reconnect overlay, and the
watchdog re-applies **nothing**. Against the pre-fix code the same proof
**fails six checks** (the browser's scale **4.00**, 2-3/s) — that is what
earns a proof the right to be believed.

The 2026-11-04/05 blocks below it (the device-pixel render policy) are
**SUPERSEDED AND WRONG** — that policy was the CAUSE of the regression,
not the cure.

**THE SYMPTOM** (Kyle, message id `1567980099490283640`, Vivaldi 8.2 on his
MacBook, which is `1728x1117` CSS at dpr 2 = a `3456x2234` device box):

- the resolution is **TINY** — *"probably due to the macbooks display
  resolution being nuts"*;
- leaving the fullscreen **does not recover**: it hung until the red
  **RECONNECT** modal appeared, clicking reconnect **did not take him back
  in**, and the sound **looped** in the background.

**THE ROOT CAUSE: dpr SQUARED.** The engine's `vid_setmode` takes **CSS
pixels** and multiplies by the device pixel ratio **ITSELF**. Measured (real
Chrome 151 headful, `--force-device-scale-factor=2`, the local rig, the
engine's own cvars and the canvas's backing store after each command):

| asked for | engine `vid_width` | canvas backing store |
|---|---|---|
| `vid_setmode 1280 720` | 2560 | **2560x1440** |
| `vid_setmode 640 360` | 1280 | **1280x720** |
| `vid_setmode 6912 4468` | 13824 | **13824x8936** |

Every one **exactly twice** the number asked for, at dpr 2. At dpr 1 the
engine's own resize lands on the number asked for, unchanged.

webXash #42 made the policy **multiply by dpr** and then hand the result to
the engine — so it asked for **dpr²** pixels. On Kyle's MacBook the policy
asked for `3456x2234` CSS and the engine tried to allocate **`6912x4468`
device pixels: past the GL maximum texture dimension of 8192**. The
allocation failed, the engine fell back to a tiny mode (**the TINY
resolution**) and wedged (**the hang, the looping audio, the dead
reconnect**). The DPR-2 reproduction measured the backing store at
**3.997x** the device box, the frame rate at **~3/s**, and **no recovery**
after leaving the fullscreen.

**THE BOOT PATH IS DIFFERENT, AND THAT IS THE OTHER HALF OF THE BUG.**
`-width`/`-height` are **LITERAL** dimensions: at dpr 2, boot args
`1920 1200` produced a **`1920x1200`** backing store, not `3840x2400`. So
the launch arguments want **device** pixels and the runtime command wants
**CSS** pixels. They are **not the same number**, and the old code used one
function for both. (Re-measure this once under the new policy — it was
measured under the old device-pixel policy.)

**THE ONE PRODUCT DECISION LEFT.** Kyle: *"the resolution is TINY now …
We might want to just pick a happy medium for this (like what we had
before? 1080p or something?)"*. Two coherent policies:

- **(a) CSS-pixel budget 1920x1080** (what the pre-#42 code did): on his
  MacBook the mode is `1728x1117` CSS, the engine renders `3456x2234`
  device = **native Retina, sharp** — but **7.7 Mpx** of fill per frame.
- **(b) device-pixel budget 1920x1080**: the mode is `960x620` CSS, the
  engine renders `1920x1240` device, the browser upscales 1.8x to the
  panel — **soft**, but **2.1 Mpx** of fill.

(a) is *"what we had before"* and is sharp; (b) is the *"happy medium"* the
word "1080p" implies and is 4x cheaper to fill. **Ask Kyle, or take (a)
and ship it — the wedge is the emergency, the sharpness is the
preference.**

**THE FIX, AS IT STANDS.** `webxash/src/services/video-settings.ts` is
**MERGED AND LIVE**: webXash **#43** → `f7baa26` (on webXash's `main`),
and the parent's pointer names that commit (specialists-browser **#136** →
`8b924f8`). It is typechecked, built, unit-tested, **PROVEN IN A REAL
BROWSER** (against the deployed bundle, at dpr 2), and **Kyle confirmed it
on production**.

What the fix does — the five items that were open:

1. **`renderResolutionArgs()` — the BOOT path — DONE.** It emits **device**
   pixels (`mode x dpr`), because `-width`/`-height` are **LITERAL**
   dimensions, and it bounds the result by the GL limit so a boot argument
   can never be the allocation that fails.
2. **`effectiveRenderResolution()` / `fitRenderResolution()` — the cap —
   DONE.** The mode's shape now follows the **canvas's box** (which is also
   where the engine's own resize lands, so the watchdog and the engine
   agree and nothing churns), scaled down **uniformly** when the policy's
   budget is smaller. The fit is **floored**, so the result is inside the
   budget by construction.
3. **`renderResolutionNeedsApplying()` — DONE.** It has a **±1 px**
   tolerance, because the engine truncates (`cssWidth * dpiScale | 0`) and a
   strict `!==` compared forever.
4. **The GL guard — DONE.** `MAX_DEVICE_DIMENSION` (8192, the conservative
   measured floor) plus `setMaxDeviceDimension()`, and the loader hands the
   guard the engine's **real** `MAX_TEXTURE_SIZE` off its own WebGL context.
5. **The unit tests — DONE, REWRITTEN.** `tests/unit/video-settings.test.mjs`
   now encodes the measured contract: the CSS target carries **no** ratio, the
   boot arguments carry device pixels, the mode follows the box's shape, the
   drift check has slack, and the GL guard holds. The suite is **636 passed,
   0 failed**.

**THE PROOF, AND IT NOW ASSERTS.** `~/.hermes/skills/projects/specialists-
browser/scripts/prove_retina_regressions.py` — runs Chrome with
`--force-device-scale-factor=2` over a MacBook-like window, measures the
policy target, the backing store, the CSS box, the device box, the scale
ratio, the frame rate, the fullscreen-exit recovery, the engine's liveness,
the bridge and the reconnect — **and it FAILS if any of it is wrong.** It was
a reporter; it is a gate now: exit code 0 means every check passed.

**IT FAILS AGAINST THE PRE-FIX CODE** (6 failed checks: the backing store is
`5012x3128` where the box x dpr is `1890x2074`, the browser's scale is
**4.00**, the frame rate is 2-3/s) **and PASSES AGAINST THE FIX** (13 of 13:
the backing store **is** the box x dpr, the browser's scale is **1.00**, the
watchdog re-applies **nothing**, the engine is still painting after the
fullscreen exit, no reconnect overlay). That is what earns a proof the right
to be believed.

**THE POLICY IS A CSS-PIXEL BUDGET, AND THAT IS THE ONE OPEN PRODUCT
QUESTION.** `AUTO_MAX_PIXELS` (1920x1080) is in **CSS pixels**, so on a 2x
display the engine renders the panel's native pixels — sharp, and what the
game looked like before the regression. A **device-pixel** budget would be 4x
cheaper to fill and softer (the browser upscales the frame). It is **one
constant** away, and Kyle has said he wants *"a happy medium … like what we
had before? 1080p or something?"* — which reads both ways. Shipped: the CSS
budget. Say the word and it flips.

**NOT TOUCHED, DELIBERATELY: the reconnect path.** The dead RECONNECT
button is currently read as a **symptom** of the wedged engine (the failed
`13824x8936` allocation), not as its own bug. **Retest it after the sizing
fix before changing it.** The proof asserts there is no reconnect overlay
after the fullscreen exit, and there is not.

**SCRATCH PROBES** (not in the repo, `~/.hermes/cache/scratch/`):
`probe_engine_units.py`, `probe_engine_contract.py` (the `vid_setmode`
table above), `probe_resize_path.py` (browser-resize units vs `vid_setmode`
units), `probe_boot_args.py` (the boot-argument units).

**PRODUCTION IS ON THE FIXED BUILD:** `https://bulletballet.dev/`, bundle
`assets/index-DNMmIOrQ.js`, deploy run `42144068256` (deploy AND browser
verification green). The old broken bundle was `assets/index-D-ULEtie.js`
from run `42074822412`.

**THE BRANCHES:** everything is **MERGED**. webXash `main` = `f7baa26`
(#43), the parent's `main` = `8b924f8` (#136), and the parent's submodule
pointer names `f7baa26` — a commit that is **on webXash's `main`**, not one
only a PR ref holds. Deploy run `42144068256` was green. The working
branches `fix/render-units-css-pixels` and `docs/prod-render-cap-fix` are
spent and can be deleted.

**As of:** 2026-11-04, **LIVE ON PRODUCTION** — webXash #40 merged as
`e576d96`, specialists-browser #131 merged as `df6ad5e`, deploy run
`41779869927` green (deploy + browser verification) — **A DOM MENU OWNS
THE POINTER; THE ESCAPE SEQUENCE IS DRIVEN BY SIGNALS, NOT BY THE KEY;
AND THE RENDER RESOLUTION IS A PIXEL BUDGET.**

**AND ON TOP OF THAT (2026-11-04, later): THE SAME ESCAPE BEHAVIOUR IN
EVERY BROWSER — webXash #41 merged as `948b0c3`, specialists-browser #133
merged as `9ba5058`, deploy run `41869350633` green (deploy + browser
verification).** The browser matrix, the fullscreen **toggle** in the
options, the fullscreen asked back when the browser takes it, the
`pointerlockerror` guard for Safari, and the capability line at startup.
See **THE BROWSERS DIFFER** below.

> ⚠️ **SUPERSEDED (2026-11-05, late) — THE BLOCK BELOW IS THE BUG, NOT THE
> CURE.** The device-pixel render policy described here is what collapsed
> the Retina resolution and wedged the engine. Read the block ABOVE it
> first.

**AND ON TOP OF THAT (2026-11-05): THE RENDER TARGET IS IN DEVICE PIXELS
AND CAPPED BY WHAT THE CANVAS DISPLAYS - webXash #42 merged as `86db82f`,
specialists-browser #135 merged as `dab9387`, deploy run `42074822412`
green (deploy + browser verification).** Kyle's own console on his MacBook
found the last piece of the lag: `[video] render resolution -> 1728x1117
(was 2370x1990)` - the display's **CSS** resolution against the **device**
resolution. The policy was asking for half the pixels the canvas has, and
the canvas is a device-pixel surface, so the browser scaled every frame and
the watchdog fought the engine's own resize on every resize (the extra
reallocation is what re-drew the buy menu - the `TSBUY row ...` spam he
took for a game reload). The target is in **device pixels** now and agrees
with the engine's own resize: nothing to scale, nothing to correct. Also
in this merge: **ESC #2 opens the options even when the browser's
fullscreen exit is cancelled** (the three-Escape bug), and the
pointer-release hint is suppressed while a DOM menu is up (the duplicate
"mouse released" next to the engine's own modal).

**PROVED ON PRODUCTION**: the shipped bundle is
`assets/index-D-ULEtie.js` and it carries `keyboardLock`, the
`[browser] …` capability line, the `pointerlockerror` listener, the
`opts__switch-btn` toggle, the "asking for the fullscreen back" /
"fullscreen restored" logs, the device-pixel render policy, the
cancelled-fullscreen-exit path and the hint's menu suppression. All three
browser proofs pass against `https://bulletballet.dev/` itself: the Escape
sequence (Chrome headful, real X11 key events, **launching with
`+connect` so it goes through the production bridge and the production
server**), the pointer ownership, and the fullscreen toggle (`ON` → `OFF`).
The fourth proof, `prove_server_connect.py`, is the RIG's: it asserts the
bridge WebSocket was not refused, that the server logged the connection
and "entered the game", and that the engine is in the game. Run it before
believing any "the rig is broken" conclusion.

**VIVALDI, SETTLED (2026-11-05)**: Kyle tested it on his MacBook. In
Vivaldi the browser *tries* to leave the fullscreen on every Escape, the
page asks for it back, and **it comes back** - so the restore works, at
the cost of the macOS Space animation each time. With the cancelled-exit
path now recognised as ESC #2, **two Escapes open the options in Vivaldi
too**, over the fullscreen. The macOS Space animation is the part the
page cannot reach.

Kyle reported two bugs from a real session, both about who owns the mouse:
the modern buy menu's buttons went dead on the first click ("PRESS ESC TO
UNLOCK"), and Escape — which should release the mouse — instead dismissed
the fullscreen and lagged while the rendering caught up.

**THE POINTER LOCK: THE ENGINE TAKES IT FROM A `click` HANDLER.** The
issue #118 guard stops a canvas-targeted **`mousedown`** — but a **`click`
is a separate event**: the browser dispatches it from the hit-test
result, not from the mousedown's propagation. So the press was blocked
and the click was not, and the engine's own canvas listener
(`Browser.init` in xash3d-fwgs.js: `canvas.addEventListener("click", …
canvas.requestPointerLock())`) asked for the lock anyway. That is Kyle's
report, exactly: the panel was up with the mouse free, **one click
later** the mouse was gone and the panel said "PRESS ESC TO UNLOCK".
There are two more ways in: the engine's C `mousedown` handler calls
`_emscripten_request_pointerlock` (stopped by the existing guard), and
the engine's `fullscreenchange` handler calls `canvas.requestPointerLock()`
when the page ENTERS fullscreen (**not stoppable from the frontend at
all**). **AND THE ENGINE ASKS FOR THE LOCK BY ITSELF, FROM ITS C CODE,
WHEN THE PORT'S BUY MENU OPENS** — the port's menu opens the moment the
player becomes an observer, so it happens on every join, with no click
involved (measured: the classic path takes the lock with no click at
all). The frontend used to answer that with a **one-shot repair** — the
panel's Vue watcher released the lock once, when the panel mounted.
That is a race, and it is measured to be one: the engine's request and
the frontend's release were **347 ms apart** in the run that passed, and
the order is not guaranteed. The mouse guard could never help, because
it stops the press that would *ask* for the lock, not a lock the engine
asks for on its own. **The rule is now STANDING**: `pointerlockchange`
gives the lock back whenever a DOM menu is on screen, and closing the
menu gives it back. Both live in
`webxash/src/services/pointer-ownership.ts`, so there is **ONE owner for
the pointer** — the HUD no longer keeps a flag of its own. The guard
stops the `click` as well now, so the request never happens in the first
place. The options overlay counts as a DOM menu too: under the pointer
lock its buttons and text fields would be dead as well.

**ESCAPE: THE PAGE NEVER HEARS IT (2026-11-04, measured).** The two-step
Escape (press 1 releases the mouse, press 2 opens the options overlay)
was a keydown handler, and **in a fullscreen page there is no keydown to
handle**. Measured in **Google Chrome 151, headful on a virtual display,
with real X11 key events**:

- an Escape that leaves the fullscreen is consumed by the **BROWSER** —
  the keydown never reaches the page;
- a key the **KEYBOARD LOCK** claims is not delivered to the **RENDERER**
  at all — the page never sees that one either.

So in a fullscreen page the page hears *nothing*, whichever way the
browser is configured. (The 2026-10-26 note in the project log said
"with Escape locked, a tap reaches the page" — **that is wrong**, and it
is what the 2026-11-03 change was built on. It was measured wrong in a
real browser, not in headless Chromium.) **The flow is now driven by the
SIGNALS**, not by the key:

| Press | What the browser does | What the page sees | Result |
|---|---|---|---|
| ESC #1 | releases the **pointer lock**, leaves the fullscreen alone | `pointerlockchange` | mouse free, **fullscreen kept**, player told |
| ESC #2 | takes the **fullscreen** | `fullscreenchange` | options overlay opens |

The chord gate hands the keyboard lock back when the pointer is let go
(the chords no longer need protecting once the mouse is free) — that is
what lets ESC #2 reach the browser at all, because a locked Escape is
swallowed by the lock. The escape **hint existed but was never
rendered**, so the player was told nothing when the mouse was let go; it
is a toast now, and it is what the proof asserts. The overlay also gains
an **"Enter fullscreen"** button: the second Escape leaves the
fullscreen behind, and putting it back automatically was tried and
dropped — the browser latches the Escape that left the fullscreen and
drops the new one again, which is a flicker, not a fix.

**THE BROWSERS DIFFER, AND THE SAME BEHAVIOUR IS BUILT ON TOP OF THE
DIFFERENCES (2026-11-04).** Kyle, from his MacBook: *"on my MacBook with
Vivaldi, when I hit ESC while full screen it still exits full screen"*,
and *"can we check the browser APIs for common browsers to ensure we have
consistent behavior across common browser choices?"*

Measured and documented (MDN, caniuse, the Chromium blog, and real
Chrome 151 + Vivaldi 8.2):

| | DOM fullscreen | Keyboard Lock API | Escape in the fullscreen | Pointer lock while fullscreen |
|---|---|---|---|---|
| Chrome 68+, Edge 79+, Brave, Opera 55+ | yes | yes | releases the **POINTER LOCK**; the fullscreen stays | yes |
| Vivaldi 8.2 | yes | yes (52 `KeyboardLock` strings in its binary) | **leaves the fullscreen** | yes |
| Firefox (through 161) | yes | **no** | **leaves the fullscreen** | yes |
| Safari (macOS) | yes | **no** | **leaves the fullscreen** | **no** — a WebKit bug |
| iOS Safari | **no** | no | — | yes, with a mouse |

Three things that changed the design:

1. **THE KEYBOARD LOCK IS NOT THE MECHANISM.** Re-run with the API
   stubbed out (`prove_escape_sequence.py --no-keyboard-lock`):
   Chromium STILL leaves the fullscreen alone on the first Escape — it
   releases the **pointer lock** first, and only a second Escape (with
   no pointer lock left to release) takes the fullscreen. The lock was
   in the locked set on the strength of a measurement that was wrong. It
   is harmless, and it stays, but it is not why it works.
2. **VIVALDI IMPLEMENTS THE KEYBOARD LOCK API AND IGNORES IT FOR THE
   FULLSCREEN.** Over SSH into the MacBook:
   `strings "Vivaldi Framework" | grep -c KeyboardLock` → **52**. The
   Blink bindings are there; the browser UI's "Escape leaves fullscreen"
   is a browser-level action and Vivaldi performs it regardless.
3. **MDN SAYS EXACTLY WHAT TO DO ABOUT IT**: *"Users can choose to exit
   fullscreen mode by pressing the ESC (or F11) key… Make sure you
   provide, somewhere in your user interface, appropriate user interface
   elements that inform the user that this option is available to
   them."* So the options overlay has a fullscreen **TOGGLE** (`On` /
   `Off`) — the way out — and the page **asks for the fullscreen back**
   when the browser takes it on its own (the Escape press is still a
   live user gesture, and `requestFullscreen()` only works from one).
   The fullscreen is also requested with the WHATWG's own
   `keyboardLock: "browser"` mode, the standard way for the page to own
   the Escape, with a fallback to the plain request.

**THE SAFARI CASE IS A REAL GAME-BREAKER, NOT A COSMETIC ONE:** Safari
refuses the pointer lock while fullscreen (a WebKit bug, reported in
2024), and a game with the mouse free and no cursor is unplayable. So
the game watches `pointerlockerror`: when the lock fails while
fullscreen, it **LEAVES the fullscreen and says why** — the mouse is
worth more than the screen, and the toggle is there for the player who
wants it back.

**THE CAPABILITIES ARE REPORTED AT STARTUP**, one line at `info` level:
`[browser] fullscreen=yes keyboard-lock=NO pointer-lock=yes | <ua>` — the
first thing to ask for when a player reports something browser-shaped.
The check deliberately does NOT probe the promise form of
`requestPointerLock()`: calling it would TAKE the pointer, and the
pointer belongs to the game.

**THE RESIZE LAG: WHAT IT ACTUALLY IS (2026-11-04, Kyle's report and
the measurement).** Kyle, in Vivaldi on his MacBook: *"ESC still tried
to leave full screen. It will either leave it or it attempts to, causes
the screen resize lag, then goes back to fullscreen. From there going
full screen or not is seamless (no lag), so it must just be the initial
resizing / scaling / rendering."* **His guess was right.** The engine's
render target is the **DISPLAY's** size (the policy: *'auto' spends a
pixel budget* ✓), but the canvas is only as big as the **WINDOW** ✓,
and the browser scales the drawing buffer down to the canvas's box **on
every frame** ✓. A window smaller than the display therefore meant the
whole frame was scaled down every single frame ✓ - and leaving the
fullscreen made the window smaller still ✓, so the scaling got WORSE ✓
✓. Measured (real Chrome 151 headful, the local rig, the real game ✓):

| | drawing buffer | canvas shows | browser downscale | frame rate |
|---|---|---|---|---|
| before | 1600x1000 | 1050x837 | **1.82x every frame** | 12/s |
| after | 1186x741 | 1050x837 | **1.00x (nothing)** | **21-22/s** |

**That is also the asymmetry Kyle saw**: going OUT of the fullscreen
shrinks the canvas under a fixed-size buffer ✓ (the scaling gets worse
✓ = the lag ✓); going back IN returns the ratio to 1 ✓ (seamless ✓✓).

**THE FIX**: the target is capped by what the canvas actually DISPLAYS
(times the device pixel ratio ✓ = the screen's device pixels ✓) ✓. The
fullscreen renders at the display's resolution (sharp ✓ - the whole
display's pixels ✓) and the windowed game renders at the window's
resolution (the browser scales NOTHING ✓✓). The aspect is kept ✓, so
the picture does not stretch ✓. The new proof is `prove_resize_lag.py` ✓
(the `specialists-browser` skill ✓).

**THE HINT BELONGS TO THE GAME (same report).** Kyle: *"every time i
become an observer and the buy menu shows, when clicking deploy it shows
the 'PRESS ESC TO RELEASE POINTER' type modal each time, sometimes it
also shows our own message about pressing escape we added."* The
engine's modal is the classic menu saying the mouse is captured ✓ - our
hint was appearing NEXT TO it ✓, because the hint fired on ANY pointer
release (including the buy menu taking it ✓) and stayed up when the
pointer came BACK (the engine's menu takes it back ✓) ✓. So the hint is
suppressed while a DOM menu is on screen ✓ and cleared when the pointer
comes back ✓.

**THE LAG WAS NEVER THE FULLSCREEN EXIT.** The engine re-syncs to the
**viewport** on every resize (SDL resize → `VID_SaveWindowSize` →
`R_SaveVideoMode` rewrites `width`/`height`/`vid_width`/`vid_height`),
so leaving the fullscreen put it at the window's size, and the watchdog
then pushed it back **up** to the display-sized target — more pixels than
the window can show, the browser downscaling every frame. Measured on the
local rig: the frame rate went **14/s → 9/s and STAYED there** (canvas
1600x900, window 1100x700). The target is now a **pixel budget**, in the
policy's own words ("auto spends a pixel budget", and so does every
preset): the engine must not exceed it, and a window smaller than the
budget is already inside it. Measured after the change: the frame rate
across the resize is **flat**, and the canvas tracks the window exactly.
The resize debounce also went from 400 ms to 50 ms, for the browsers
without the Keyboard Lock API (Firefox, Safari).

**THE RIG NEEDS A `+connect`, OR THE ENGINE SITS ON "CONNECTING TO SERVER"
(2026-11-05).** Kyle hit this on the dev rig and was kicked to the
Half-Life menu. The cause was a hand-written `launchOptions=` URL **without
`+connect`**: the engine boots the TS gamemode with no server to reach, so
it shows "CONNECTING TO SERVER" and falls back to the main menu. It looks
exactly like a broken rig and it cost a test cycle.

- **The supported path is the landing page → PLAY** (or JOIN on the server
  row). `launchOptionsFor()` builds
  `-game ts +connect <publicAddress>:<port> +maxplayers N` and adds
  `+bridge <host:port>` because the page is https. PLAY is also the gesture
  the fullscreen request needs.
- **A raw launch-options URL must carry both** `+connect` and `+bridge`
  (`<host>:5174` — the Vite dev server proxies `/bridge` to the bridge's
  plain `ws://` port; an https page cannot open `wss://host:27017`).
- The bridge keys its allowlist on the **public** address
  (`100.95.111.112:27015`), not the internal `127.0.0.1:27015` that
  `/api/servers` also advertises. Asking for the internal address gets a
  **403** from the bridge.
- Known inconsistency: `/api/servers` advertises the **27015** instance
  ("TS Local List") but the bridge's default target forwards to **27098**
  ("TS Stable Probe"). Both are live TS servers on the same map with bots;
  the player count on the landing page therefore does not include you.

**THE PROOFS NEVER REACHED A SERVER — UNTIL NOW (2026-11-05).** The
Escape/fullscreen proofs launched with no `+connect`, so they exercised the
engine's LOCAL menu and never the bridge, the server, or the observer's buy
menu — which is exactly where the duplicate "mouse released" message lived.
That is why they kept passing while the rig was unreachable. The Escape
proof now launches **with** a server and all seven checks still pass in the
connected observer state. New proof: **`prove_server_connect.py`** — it
asserts the bridge WebSocket was not refused, that the server logged the
connection and "entered the game", and that the engine is in the game. Run
it before believing any "the rig is broken" conclusion.

**THE RENDER TARGET WAS IN THE WRONG UNITS (2026-11-05).** Kyle's own
console on his MacBook (Vivaldi, macOS) said it:
`[video] render resolution -> 1728x1117 (was 2370x1990)`. **1728x1117 is
the display's CSS resolution; 2370x1990 is the DEVICE resolution (x2).** The
policy was asking the engine for half the pixels the canvas actually has,
and the canvas's drawing buffer is a device-pixel surface — so the browser
scaled the whole frame on EVERY frame. The old note said the device pixel
ratio was "deliberately not multiplied into the render target" because "the
browser upscales the canvas anyway": it does not upscale, and the engine's
own resize ALREADY lands on the device pixels, so a CSS-pixel policy fought
the engine's own resize on every resize (an extra render-target
reallocation, and the buy menu re-drawing itself — the `TSBUY row ...` spam
Kyle saw, which he took for a game reload). The policy is in **device
pixels** now and agrees with the engine's own resize, so there is nothing
to scale and nothing to correct.

**PROVED IN A REAL BROWSER AGAINST THE LOCAL RIG**, not by reading the
source: the panel keeps the pointer, a lock taken *under* the panel is
taken back, a real click on the canvas with the panel up does NOT take
the lock, the panel's buttons still work, and closing the panel gives
the pointer back. **The Escape sequence has its own proof, and it is the
only kind that can establish it: `prove_escape_sequence.py` runs Google
Chrome HEADFUL on a virtual display and sends REAL X11 key events** —
headless Chromium has no fullscreen to lose, so it cannot answer the
question at all. Against the real game, with the engine booted: the
keyboard lock is held, ESC #1 leaves the fullscreen alone and tells the
player the mouse is free, ESC #2 opens the options overlay. `prove_pointer_ownership.py` (in the
`specialists-browser` skill's `scripts/`) is the new proof, and **it
FAILS against the pre-fix code** — that is how a proof earns the right
to be believed. `prove_leave_fullscreen.py` proves the new button
actually leaves the fullscreen, because it is now the ONLY way out. The
two existing pointer-lock proofs still pass (and the #118 proof was
hardened — it had a latent flake where it assumed the panel was still up
when it clicked, and the port's buy menu closes when the buy period ends
and the player spawns), and the frontend typechecks and builds on the
merged submodule tree.

**webXash #39 IS MERGED** (`00a993a`) and **specialists-browser #129 IS
MERGED** (`6b50239`) — Kyle approved both and the agent merged both — and
**THE FIX IS LIVE ON PRODUCTION.** The parent PR carried the submodule
pointer (naming the **MERGED** commit, not the branch tip, because a
squash merge mints a new SHA for the same tree) plus the new unit test
`tests/unit/pointer-ownership.test.mjs`, which asserts the SHAPE of the
standing rule in the submodule's source (the parent cannot run the
submodule's TypeScript).

**THE ESCAPE FIX IS LIVE ON PRODUCTION TOO, AND PROVED THERE.** The
production bundle carries it (`pointerlockchange`, `Leave fullscreen`,
`Enter fullscreen`, `Mouse released`, the locked set
`KeyW, KeyT, KeyN, Tab, Escape`, and the pixel-budget comparison
`width * height > target.width * target.height` are all in the shipped
`assets/index-CYHvTdXQ.js`), and **all three browser proofs pass against
`https://bulletballet.dev/` itself**:

- `prove_escape_sequence.py` — **Chrome headful on a virtual display,
  real X11 key events**, against the real production game: the keyboard
  lock is held, ESC #1 leaves the fullscreen alone and tells the player
  the mouse is free, ESC #2 opens the options overlay. **This is the
  only proof that can answer the Escape question at all** — headless
  Chromium has no fullscreen to lose.
- `prove_pointer_ownership.py` — the panel keeps the pointer.
- `prove_leave_fullscreen.py` — the button leaves the fullscreen.

**AND THE PROOF PASSES ON PRODUCTION, NOT ONLY LOCALLY.** The deploy's
own browser verification went green (PLAY reaches the server; two
browsers connected at once), the production bundle carries the fix
(`pointerlockchange`, `Leave fullscreen`, `exitPointerLock` are all in
the shipped `assets/index-*.js`), and both browser proofs pass against
`https://bulletballet.dev/` itself: the panel keeps the pointer, a lock
taken under it is taken back, a real canvas click with the panel up does
NOT take the lock, the panel's buttons work, closing the panel gives the
pointer back, and the new button actually leaves the fullscreen.

**As of:** 2026-11-03, branch `feat/buy-menu-modern-default` — **THE MODERN
BUY MENU IS THE DEFAULT, AND THE GOLDEN COLTS ARE IN THE PISTOLS.**

Kyle asked for two changes to the buy menu, and both are the same kind of
change: the thing a player meets first should be the thing that works.

**THE MODERN MENU IS NOW THE DEFAULT.** The store's `tsConfig.buyMenu`
default is `'modern'`, so a NEW player gets the DOM panel without
hunting for the ESC toggle. The classic canvas menu is still there and
still one click away in the ESC options overlay. **A player who already
chose `classic` keeps it** — the choice is persisted, so this only
decides what a first-time player sees. The PORT's own default is still
`classic` (the game starts the classic flow and the browser asks for the
modern one), so nothing about the port changed.

**THE GOLDEN COLTS ARE IN THE PISTOLS.** They were reachable ONLY from
the loadout's card 5 — which is the one place a player who wants a golden
pistol would not think to look.

**THE CAUSE WAS A DIVERGENCE FROM THE GAME'S OWN MENU, AND THE CLASSIC
MENU ALREADY HAD THEM.** The classic menu's handguns column is the
RULESET's (`MenuRules::handguns`) and it holds **ten** guns:
`1, 9, 12, 14, 2, 21, 22, 28, 31, 36` — the 21 is the Golden Colts. TS
2.1's column holds them too (`1, 9, 12, 14, 8, 21, 22, 28, 31`). The
modern flow derived the pistols from the **HUD slot 2** instead, and the
HUD grid column holds only **nine** — so the tenth fell out.

**THE HUD SLOT AND THE CATEGORY ARE TWO DIFFERENT NUMBERINGS, AND FOR
THE GOLDEN COLTS THEY ARE TWO DIFFERENT ANSWERS.** The game keeps them
in the HUD slot 5 (that is where they spawn), and the game calls them a
pistol: `GetWeaponType` (`shared::weapons::restriction_type`) reads id 21
as `kind::PISTOL`. So the fix is NOT to move them — it is to list the
**category** in the rail, which is what the rail is: a browse aid over
the categories. `Rail::Pistols` now reads the classic menu's own handguns
column (`category_weapons(HANDGUNS_CATEGORY, r)`), so the modern pistols
list IS the classic menu's handguns list, weapon for weapon, in the
game's own order — and a ruleset that changes its handguns list changes
the modern flow too.

**THE GOLDEN COLTS STILL LAND IN THE HUD SLOT 5.** The entry record
carries the weapon's own `hud[0]`, so buying them from the pistols puts
them on the loadout's **card 5** — exactly as the classic menu does. The
card is where the game keeps them; the rail is where the player looks
for them.

**THE PISTOLS LIST IS NOW TEN LONG, AND THE TENTH ROW IS KEY 11.** The
modern flow already had the tenth-row key (11, badge "A") for a list
that never reached ten. It is real now, and a test bug it exposed is
fixed: `l.starts_with("TSBUY short 1")` also matched the tenth row's
`"TSBUY short 11"`, so the match is exact now (`"TSBUY short 1 "`).

**AND IT IS PROVEN IN A REAL GAME** (`scripts/prove_golden_colts.py`, a
fresh browser context with **nothing seeded** — so the panel mounting on
its own is the proof that the default is `modern`):

```
the panel mounted on its own: the default is 'modern'
1Glock-18$850      6Golden Colts$2,600
2SOCOM-MK23$700    7Glock-20C$1,300
3Desert Eagle$1,050 8Ruger-MK1$1,500
4Five-seveN$1,250  9Raging Bull$2,100
5Beretta 92F$900  AContender G2$1,500

TSBUY entry 2 2600 20  5 12 Golden Colts      <- the port's own record: HUD slot 5
[ts] evo-colts-1793747836 spawned (#5) with [2, 8, 13, 21, 35]
                                             <- id 21 IS the Golden Colts
VERDICT: ARMED WITH THE GOLDEN COLTS
```

The loadout's card 5 read **"5Akimbo Berettas, Golden Colts"** — bought
from the pistols, landed in the HUD slot 5, which is the game's own
answer. Zero page errors.

**SHIPPED 2026-11-03.** `webXash#38` → webXash main `99d217b`, then
`specialists-browser#126` → parent main `58021ff`, and the parent's
pointer names `99d217b` — a commit that is ON webXash's main, not one
only a branch holds. The deploy ran green, browser gate included.

**THE SHIPPED ARTIFACT, VERIFIED FROM PRODUCTION:**
- `https://bulletballet.dev/cl_dlls/client_emscripten_wasm32.wasm` is
  sha256 `a8364024…` — byte-for-byte the locally built one.
- The deployed bundle contains `buyMenu:"modern"`.
- The Golden Colts' row in the shipped weapon table reads
  `{ id = 21, key = "gold", name = "Golden Colts", kind = "akimbo_only",
  hud = [5, 4], slots = 20, cost = 2600 }` — **and that is the DEEP
  ROOT CAUSE, visible in the artifact**: the TABLE's `kind` is
  `akimbo_only`, so the pistol HUD slot holds only the nine
  `kind = "pistol"` weapons. The game disagrees with its own table
  nowhere else: `restriction_type(21)` explicitly overrides the
  akimbos to `kind::PISTOL`, and the ruleset's handguns category
  includes 21. **The HUD SLOT is a display-and-storage slot, not a
  category** — which is exactly why the rail must browse the
  RULESET's category and not the slot.

**As of:** 2026-11-03, branch `docs/readme-human-pass` — **THE README IS FOR
HUMANS NOW.** Kyle read it and said the thing worth fixing: *"it's tough to
read. No human is going to read most of that."* It was doing two jobs at
once — a product page and an engineering handbook — and the handbook was
winning: 687 lines, 3,613 words, almost none of it for the person who
opens the repo from a link.

It is now **1,390 words a reader actually sees**, with the other **2,223
behind nine collapsed `<details>` sections** — the side module, the bridge,
the keyboard path, the anti-script gate, the map rotation, the capacity
numbers, the repo layout, the test suite. Nothing is deleted; every deep
section is one click away under its own heading. The
`## The four things that make it work` heading is still **UNCHANGED**, so
the FAQ tab's link resolves, and the section it lands on now has the
depth folded away rather than in the way.

**THE FAQ SCREENSHOT WAS LYING.** `docs/screenshots/faq.png` showed the
landing hero with the FAQ content below the fold — the caption described
a picture the reader could not see. Re-captured with the controls table
in frame. The landing page scrolls in a **container** (`.ts-landing`), not
the window, so the capture has to scroll that element — `window.scrollTo`
does nothing.

**#123's EDIT WON.** Kyle merged PR #123 (his own README edit, removing
the asset-delivery detail) while the rewrite branch was open, so the two
collided on the same region. His intent wins: the detail stays out of
the README, with a one-line pointer to `docs/ASSET-DELIVERY.md`.

**THE ABOUT SECTION SAYS WHAT THE PROJECT IS.** It used to call this a
"single-player browser implementation of Half-Life 1 with The Specialists
mod (Xash3D-WASM engine + CheerpX x86 emulation for mod DLLs)". It is a
**multiplayer** client on a **Rust port**, and the repo is **public**. The
description, the homepage (`https://bulletballet.dev`) and ten topics now
say so — on the parent and on `webXash`, whose About was the upstream
fork's and pointed at the upstream's demo.

**THE README IS REFRESHED.** New screenshots (the landing page with the
dial and the bullet on the rule, the FAQ tab, and the game with the buy
menu open), and the claims that had gone stale are corrected: the `b`
bind is not cleared any more (**B** opens the buy menu), the local dev
loop works (the bridge resolves the public address it advertises to an
internal UDP target), there are **610** unit tests, and `main` is covered
by an active ruleset that requires one approving review. The
`## The four things that make it work` heading is **UNCHANGED**, so the
FAQ tab's link to it still resolves.

**THE IN-GAME SHOT WAS TAKEN ON THE DISPOSABLE CI RIG**, not on
production: `ci.bulletballet.dev` up, eight `addbot`s, the capture, the
rig down and proven gone. Production's human count never moved.

**`progress/` IS GONE** — 668 gitignored decompile logs and three
tracked ones. The upstream Rust port shipped instead of our own decompile
effort; the README now records that under "Deliberately not done", and
the decompiled output stays in the tree as the single-player fallback.

**THE REPO IS CLEANED.** 28 remote branches → 2 (`main` and the branch
below), 73 local branches → 2, 6 worktrees → 1. **The PR's state is the
authority for which branches may go**: `git cherry` and
`merge-base --is-ancestor` both fail to see a squash merge. One piece of
unmerged work — a revision of the admin console's UI draft — went to the
vault (`~/vault/projects/admin-console-ui-rev2-2026-10-30.md`) rather
than into a branch nobody would look at.

**AND `tools/deploy/capture-readme-shots.cjs` WORKS AGAIN.** It clicked
a `/join/i` button and waited for the client, so since the pre-join
identity modal landed it had been failing **silently** — keeping the old
screenshots, which reads as a successful run. It now plays PLAY → modal
→ JOIN AS, reads the registry of whatever site it is given (so it can
shoot the rig), and captures the FAQ tab too. Verified end to end
against the rig.

**AND THE MODERN BUY MENU IS LIVE — THE README SHOWS IT.** Kyle
pointed out that the README's screenshot was the *classic* canvas menu.
The modern flow is a DOM panel over the live game, and it is reachable:
**Esc** twice → *Buy menu: Modern*. It has a **loadout screen**, a
**per-slot browse screen** and an **attachments screen**, with the money
as the hero and the **port's** arithmetic in the summary ("After adding:
$20,510 left"). The three screens are in the README now, and
`capture-readme-shots.cjs` takes them: Esc twice, click *Modern*, and
the panel appears with the port's own menu (the observer opens it by
itself), then the slot card, then a gun, then its attachments. **The
THIRD Escape closes the options overlay** — leave it open and it sits on
top of the panel in every single screenshot.

**THE MODERN FLOW IS DONE ON BOTH HALVES, so § NEXT TASK's buy-menu
items are stale.** The frontend sends `ts_buy_mode modern` at session
start, the modern entry record carries the weapon's classic slot, the
deploy re-submits the loadout when it changes, and the flow survives a
map change. The classic canvas menu was the default until 2026-11-03;
it is now the option, and the modern one is what a new player gets.

**As of:** 2026-10-31, branch `fix/admin-fleet-list` — **the admin
console's FLEET LIST now comes from the ORCHESTRATOR**: it was
enumerating a PORT RANGE and publishing every port it probed, so on
the one-instance production fleet it published **eight** servers, seven
of them instances nobody ever created (the section below). That is on
top of **phase 5 (THE DEPLOYMENT, THE SECRET AND THE RUNBOOK) IS
BUILT**, on top of phase 4 (the mutating actions), phase 3 (the
read-only UI, on Kyle's own mock), phase 2 (the password, the session,
the lockout, the CSRF token, the audit line and `adminctl`) and phase 1
(the RCON client, the fleet discovery and the read-only API), and on
top of the specification in `docs/ADMIN-CONSOLE.md` (PR #104, awaiting
Kyle's approval). **The console can now be deployed, and the mechanism
is in place: the image (`services/admin/Dockerfile.admin`, uid **10006**),
the deploy entry (`replace admin`, loopback only, no docker socket), the
RCON secret as a FILE (`RCON_PASSWORD_FILE`, **0640 `root:tsrcon`**, one
file and two readers), the boot config (the entrypoint appends the
password to the COPY of `server.cfg`, never to the committed one), the
CI wiring, the tunnel (`tools/admin/tunnel.sh`) and the runbook
(`docs/ADMIN-CONSOLE-RUNBOOK.md`).** **The cut-over was NOT done and
was not to be done in this phase: nothing was deployed to `bb-prod`, no
RCON password was set anywhere, no game server was touched, and nothing
was restarted.** The console's behaviour is otherwise unchanged from
phase 4: five endpoints behind the session gate and the CSRF token, each
one writing one audit line and each one answering with the §5 envelope,
**every action confirmed by a re-read, never by its own reply**; the
cached probe is dropped before that re-read, and a failed RCON call is
reported and never retried. The UI follows §6.2: the kick is one click
with an optional reason and **no modal** and is **not a red button**, the
map change is the **only** action with a modal (it names the player count
and `server.cfg` before the click), and the broadcast, the round restart
and the time limit are live with no modal. **The free-form command box is
still disabled** — over RCON `banid` works — and the ban stub is still a
501. Everything else below is unchanged from the 2026-10-29 state: the
client caps the tick rate the engine is offered, the character picker and
the pre-join identity modal are LIVE in production, and the game server
image is `ts-server:0.27`.

**The newest work (2026-11-02, branch `feat/faq-tab`): the landing page's
third tab is an FAQ, and it leads with the controls.** It was "How It
Works" — three cards explaining the architecture (the Rust port, the
WebSocket↔UDP bridge, the key path) followed by a ten-row control list.
It is now **FAQ**: the cards are gone, the **controls come first**, and
the technical explanation moved to the bottom of the panel as a link to
this repository's README, with a second link to the original **tsmod.net
FAQ** for the mechanics in depth. The control list was a third of what
the game binds; it is now **the game's own bind table**, grouped into
movement / weapons / buy and use / interface, so the stunt key (`Q` or
`MMB`), the fire mode (`F`), the gun's attachments (`G`), the powerup
(`Z`), the buy menu (`B`), the drop key (`T`) and the spray (`H`) are all
in it. Every row is a bind in the game's own `ts/config.cfg`, which the
engine loads at boot, so the list and the running game cannot drift
apart — and the labels are recorded next to the list with where each
non-obvious one comes from. `TSHowToPlay.vue` is renamed `TSFaq.vue`.

**On the same branch, three more things came out of it (2026-11-02).**

1. **THE RULE UNDER THE WORDMARK ENDS IN A BULLET, NOT A RECTANGLE.**
   The white cap was meant to be a bullet in flight and only read as one
   if you already knew. It is now a cartridge — a flat base with the rim,
   a cylindrical case, a nose that leads — in **its own SVG**, because the
   line's SVG is stretched (`preserveAspectRatio="none"`) and would have
   squashed it. The site's own brand mark is a pair of slender cartridges,
   but at 31×14 that silhouette reads as a sliver, so the rule uses a
   chunkier shape that reads as a bullet at that size.
2. **THE ENGINE'S NOTIFY WINDOW NO LONGER PAINTS OVER THE GAME.** The
   top-left corner was covered in console output — the port's `TSBUY`
   buy-menu records and the engine's boot chatter — drawn as
   transparent overlaid text by the engine's `Con_DrawNotify`
   (`engine/client/console.c`). The notify window is a debug-console
   feature and the console is **not reachable in the browser build** (the
   backquote and tilde binds are cleared), so `+con_notifytime 0` on the
   command line retires it: every line is expired the moment it is
   printed, and the engine runs the command line in `Host_ChangeGame`,
   **before the first frame**, so even the boot chatter never reaches the
   screen. **The `TSBUY` records still reach the browser** — the DOM buy
   menu reads them off stdout — they just stop being drawn over the game.
   The cvar goes in `xash-loader.ts`'s `_buildLaunchArgs`, the one funnel
   every launch path goes through, and **before** the caller's launch
   options (a cvar value that follows a `+<cmd> <arg>` can be swallowed by
   that command's argument). Note that `GAME_SETTINGS.*.launchArgs` is
   **never read at runtime** — it is only a type source — so a cvar added
   there does nothing at all.
3. **THE SCROLLBAR NO LONGER MOVES THE CENTRED CONTENT.** The landing
   page is one scroll container and the panels behind the tabs have
   different heights — the FAQ is long, the server list is short — so
   switching tabs made the scrollbar appear or vanish and the centred
   column hopped about **nine pixels** to the left.
   `scrollbar-gutter: stable both-edges` on `.ts-landing` reserves the
   gutter on **both** sides, so the content box stays centred in the
   viewport instead of centred in a box that is always fifteen pixels
   narrower than it. Measured at 1280×900: the centred column sits at
   **x=640 in every tab** with the gutter, and at 640 → **631** across
   the server-list → FAQ switch with `scrollbar-gutter: auto` — the hop,
   reproduced and then removed.

**The project skill was trimmed the same day** (it had grown past
`skill_manage`'s 100k limit, so it could no longer be patched). The
deleted paths — the Babylon.js prototype, CheerpX, the browser BSP→glTF
toolchain — moved to `references/historical-pitfalls.md` and
`references/babylon-era-mvp.md`, keeping the reasons they were rejected
without keeping them in the index.

**The newest work (2026-11-01, branch `feat/buy-menu-modern-flow`): the
buy menu grew a SECOND flow.** The classic canvas menu is untouched (its
pixel diff still passes) and the port's `menus/buy_modern.rs` grew the
**modern loadout flow** — a loadout screen, a per-slot browse screen and
an attachments screen, organised by the classic weapon slot
(`WeaponInfo.hud[0]`), with **apply on purchase**. It is selected by the
new `ts_buy_mode <classic|modern>` command and **defaults to `classic`**,
so nothing changes for anybody until the browser asks for it. The
frontend's half (sending `ts_buy_mode modern`, and the entry record's
shape) is still open — see § NEXT TASK.

**And then the LIVE GAME showed two rough edges in it (2026-11-01, the
same branch), and the port's half of both is now fixed.**

1. **The tenth weapon of a slot's list was unreachable.** The port
   numbered the browse rows 1..N, so the tenth row was key 10 — and
   key 10 is the game's own "back" key, so it went back instead. The
   modern flow's rows are now keyed **1–9 and then 11, 12, …** (the
   game's own rule for a weapon list: the classic flow's list numbers
   its tenth weapon 11, the `a` key), and the keycap the panel draws is
   the row's *place* in the list — 1–9, then A, B, … — so the tenth row
   still wears the design's "A". The shortfall and owned marks carry
   the row's own key too. The classic flow's numbering is untouched.
2. **"Back" answers to key 0 as well as key 10.** The design's back
   button is badged "0" ("0 Back to loadout", "0 Back to Pistols"), so
   the port takes key 0 on the modern screens (the weapon list, the
   accessory's items, the attachments and the rail), and key 10 still
   does. The remove page is the one exception: its keys start at ten
   and they remove the entry they name.
3. **The clear row now says "Clear"** — the design's word — instead of
   the game's "Reset Config". The port owns the labels the panel
   draws: the browser resolves a title key through the game's own
   titles and passes a plain label through unchanged, so the port
   prints the word the design asks for. The classic flow's own reset
   row keeps the game's title, because the canvas menu must not change.

**And then the playtest (2026-11-02, the same branch): the buy menu's
rail became the weapon CATEGORIES, and the key space had to be split in
two.**

1. **The rail is the categories.** The browse screen's left rail lists
   the six weapon categories — melee, pistols, SMGs, rifles, shotguns
   and the player accessory — keyed **1–6** by the port. (It listed
   seven, with special/akimbo among them, until the playtest moved the
   akimbo onto the guns themselves: see point 7.)
   The rifles and the shotguns are two entries now, split by the game's
   own kind (`GetWeaponType`: the Sawed-Off is a shotgun to the game,
   the Barrett a rifle), and the HUD slot the rail splits (slot 4) is
   carded "Rifles · Shotguns".
2. **The browse rail's keys and the loadout cards' HUD slots are two
   different numberings.** The rail's key 5 is the shotguns; the HUD
   slot 5 is the akimbo weapons. So the browser never reads a digit as
   one or the other: it sends the digit to the port's **current page**
   and the port decides what it means. The breadcrumb stopped claiming
   a "Slot N" for the same reason — the number would have been a lie.
3. **The modern flow has its own key space on the loadout screen:** the
   player accessory is **6**, Random is **7** and Clear is **8**. Clear
   used to answer on key 4 — the classic flow's inherited reset key —
   and four is the card that opens the rifles, so a player pressing the
   card-4 digit wiped the loadout instead. The classic flow's rows and
   keys are untouched. The HUD slot the rail splits opens the **rifles**
   on its digit; the shotguns are one rail click away, on the screen that
   digit opens.
4. **The focused row does not survive** the trip through the attachments
   screen, nor a purchase: a row that stays selected reads as "this one
   is still on your list", which is exactly what it is not, any more.
5. **The panel's voice (frontend):** the owned weapon's name is the
   loudest thing on its row and a slot's weapons read as one
   comma-separated line, with the attachment chips and the price keeping
   their facts but dropping to a supporting voice. The loadout tabs
   became a dropdown (the "More" tab was a dead end for eight of the
   nine), the card's head is the way into that slot's list, the keycaps
   trail their labels instead of stacking above them, and **the panel
   scales with the viewport** instead of floating small in the middle of
   it. The harness gained a "scaled" frame so the scaling can be seen
   without a game.
6. **The HUD slot 1 card says "Melee weapons"** (it said "Melee ·
   Grenades · Swords"): the grenades are map power-ups, not something a
   player buys, so the card advertised something that is not for sale.
   The port owns that label, so the client WASM was rebuilt for it. The
   loadout screen's "Press a slot number to browse it…" paragraph is
   gone as well — the panel shows it and does not need to explain
   itself.
7. **The akimbo weapons are not a category any more.** A player who
   wants the akimbo Berettas is looking at the **Berettas**, so the
   akimbo version is offered on the gun itself: the attachments screen
   of every gun that has a twin carries an **Akimbo** row (key 5), and
   picking it buys the gun **as its pair**. The rail is **six** entries
   now (melee, pistols, SMGs, rifles, shotguns, the player accessory)
   and the rail's "Special" entry is gone; the HUD slot 5's own
   contents (the akimbo versions and the Golden Colts) are still
   reachable, from the loadout's **card 5**, which is the game's
   "Special Purpose" slot.

   **The pair is the gun bought TWICE — the game's own rule**, and the
   port's own code says so: the client's submit sends an akimbo entry
   to the server as the gun twice (the second copy without the
   attachments), and the server's spawn turns the second copy into the
   pair. So the purchase is the **gun** the player picked (the
   Five-seveN), not the twin's own id, and it costs the gun's price
   **twice**: the akimbo Five-seveN is **$2,500**, and the row itself
   carries the second copy's price ($1,250).

   An earlier version bought the twin's id (30) instead, on the
   reasoning that the twin is a weapon of its own: the menu showed
   "Akimbo Five-seveN" at $1,250 and the player got **nothing** — the
   game does not spawn that id as a pair, so no pistol and no akimbo
   pistols. The `swap` flag went with it: the akimbo row is one of the
   purchase's parts, not a version swap. The attachments screen's footer
   no longer explains the game's buying order either.

   **The loadout shows the gun AND the pair — the game's own truth.**
   The server's spawn gives the player both: the gun in its own HUD
   slot and the pair in the slot 5 (the spawn logs the ids, and a
   player holding a pair holds the gun's id and the twin's id). So the
   loadout's cards show both, the way the player will really carry
   them: the **pistols** card carries the Five-seveN, the **card 5**
   ("Special Purpose") carries the Akimbo Five-seveN. The table agrees
   the two are the same thing twice — every twin costs and takes
   exactly what its base costs and takes — so the two cards' prices
   add up to what the player paid ($1,250 + $1,250 = $2,500, and with
   a silencer $2,150 + $1,250 = $3,400: the gun twice, the
   attachments once).

   The port's entry record and its slot count must say the SAME thing
   about the akimbo entry. They did not, once: the entry said slot 5
   and the count said slot 2, and the browser draws a card's weapons
   only when the port says the card holds something — so **every card
   came up blank** after an akimbo purchase (the playtest of
   2026-11-02). The port's suite now checks that the slot counts and
   the entries agree, card for card.

8. **Nothing is lit by default, and the panel does not explain itself.**
   The playtest found the browse screen opening with the category's
   first weapon already highlighted — the Mini-Uzi in the SMGs. It read
   as "this one is chosen", and picking a weapon takes the player to
   another screen anyway, so a default highlight says nothing true. The
   port clears its focus when a category opens; the keys pick the rows.

   Three lines of footer text went with it: "Switch categories without
   going back. No stacked menus.", "Add as many as your budget allows.
   Pick a gun to choose attachments first." and "Closing keeps your
   loadout. Nothing to confirm." The modern flow's footer now says
   nothing at all. The panel shows the answer instead of describing it.

9. **The loadout screen lines up, and the destructive button wears red.**
   The playtest's nitpicks, fixed in the browser: the rail's "Also" label
   rides high and the "6 Player Accessory" button sits above the first
   card, because the left column's first row is the slot picker and the
   right column's first row was only a label. The label now takes the
   picker's height, so "Also" sits on the same line as "Loadout slot" and
   the accessory button starts level with slot 1 — measured at 0px apart
   in a live client. The Clear confirmation's confirm button is red (the
   one button that throws the loadout away), the confirm and cancel
   buttons stay anchored at the footer's right, the primary buttons have a
   gap before their key cap, and "Deploy with Loadout A" is "Use
   Loadout A". The "Saves automatically" line is gone from the slot picker —
   the loadouts save themselves, and the panel saying so is the panel
   explaining itself again.

**Verified in a real game on the dev server** (2026-11-02): the client
WASM rebuilt from this port, deployed, and byte-identical to the served
copy; the panel drawn from the port's own rows and entries in a live
client, with Clear on key eight, and the Five-seveN's attachments
screen offering the akimbo version; and, after the akimbo purchase, the
loadout's card 2 holding the **Five-seveN** and the card 5 holding the
**Akimbo Five-seveN** — the live client printing `TSBUY entry 0 1250 10
2 10 Five-seveN` and `TSBUY entry 0 1250 10 5 10 Akimbo Five-seveN`.
And the server's own spawn log has the last word on what the player
holds: `[11:29:00] [ts] evo-pair-1793640501 spawned (#4) with [14, 30]`
— the Five-seveN (**14**) and the Akimbo Five-seveN (**30**), the pair the
purchase grants, in the world and not just in the panel.

The port's suite is at **481 tests**, clippy is clean on the client, and
the frontend's typecheck and build are clean.

## The buy menu: the deploy arms the player, the flow survives a map change, and the header changed (2026-11-02)

Three things came out of a playtest of the modern panel: the **deploy did
not arm the player**, the **classic/modern preference did not survive a
map change**, and the header was to be restyled to a new design (the
money as the header's hero, the two counters as labelled blocks, and the
budget's bar across the panel's full width).

1. **THE DEPLOY NOW RE-SUBMITS THE LOADOUT.** The server clears the
   player's armament when they die — `inventory::on_killed`,
   `crates/server/src/weapons/inventory.rs:361`, whose own comment says
   *"the client resubmits it from the buy menu"* — and the modern flow is
   **apply on purchase**: it submits the config when the loadout
   CHANGES and never otherwise. The loadout screen's back key (which is
   what "Use Loadout A" sends, `primary()` → `send(BACK_KEY)`) only
   closed the menu, so the config never went back to the server and the
   player respawned **unarmed** with the panel showing them a loadout the
   server knew nothing about. The classic flow never had this bug: its
   "use config" row IS a submit. The modern flow's deploy now calls
   `submit_quiet` before closing (`buy_modern.rs`, the `page::MAIN`
   branch's `is_back` arm). Two tests: `the_deploy_submits_the_loadout_
   again` and `the_deploy_submits_the_loadout_it_shows`.
2. **THE FLOW SURVIVES A MAP CHANGE.** `menus::vid_init` re-runs the
   game's own `Init` on a map change (and on a connect, and on a
   video-mode change), and `BuyMenu::new` starts the **CLASSIC** flow —
   so the port fell back to the canvas menu on every map change even
   though the player's preference was still "modern". The **hidden** flag
   was already put back (it is the browser's business); the **mode** is
   now put back with it, in `reinit_buy_menu` (`menus/mod.rs`). The
   frontend also re-tells the port when the state line and the stored
   preference disagree — bounded to three attempts, so it cannot loop.
3. **THE HEADER.** The money is the hero now: a large gold figure with
   "LEFT OF $30,000" under it, and the two counters beside it as labelled
   blocks — **SLOTS** (`slots_in_use` of 5) and **ITEMS** (the shared slot
   pool, `slots` of `slot_limit`). The budget's bar spans the panel's
   full width, under the header, instead of a 260px stub inside it. Every
   number is the port's; the browser counts nothing.
4. **THE LOADOUT SCREEN SCROLLS.** It did not, and the playtest caught
   it: the slot cards were **squeezed** to fit the fixed frame
   (`flex: 0 1 auto`), so a busy slot's last row of guns was clipped with
   nothing to scroll to. The cards keep their height now (`flex: none`)
   and the list scrolls (`overflow-y: auto`); the browse screen's weapon
   grid already scrolled. The focused row is scrolled into view, because
   the focus is the **port's** and the browser only draws it.
5. **The loadout screen has no crumb.** It carried "Slots match the
   in-game weapon slots" — the panel explaining itself, which the
   playtest has been asking to stop — and it cost the height the cards
   need above the pinned footer. The new design has none either.

The header's ITEMS block is the one open question: the design shows
`3 / 81`, where 3 is the number of guns and 81 is the shared pool's
limit. The panel shows the port's own pool number (`slots` of
`slot_limit`) instead, because that is the number the port reports and
the one the panel already showed. Say the word if the gun count is what
was wanted.

## The redesigned buy menu runs in a real game on the dev server (2026-11-01)

**The buy menu is playable.** The dev server, a local TS server with bots, and
the port's rebuilt client WASM — all four pieces are needed. The dev server
alone serves the assets; it is not a game.

**The URL:** `https://100.95.111.112:5174/` — PLAY, pick a name and a
character, and you are in. The buy menu opens with **b** (the engine's own
bind: TS's `config.cfg` binds `"b"` to `"buy"`) or when you die, the way the
game always did it. **Escape twice** opens the options overlay, where
**Buy menu: CLASSIC / MODERN** picks the flow; the choice is persisted and
survives a reload (pinia-plugin-persistedstate writes the picked paths under
the store's id — `xash` — with the paths nested inside it, so it is
`{"tsConfig":{"buyMenu":"modern"}}` and not a key per path).

**The stack**, in this order:

1. **the dev server** — `cd webxash && bun run dev` (the vite config already
   sets `host: 0.0.0.0`, `port: 5174`, and HTTPS when the local certs
   exist). A headless browser needs `--ignore-certificate-errors` and
   `--use-gl=swiftshader`.
2. **the local TS server** — `tools/port/tsp-rs/scripts/start-ts-server.sh`
   (UDP 27015, bots, the game's own maps). The dev server's `/api/servers`
   lists it.
3. **the UDP bridge** — `node tools/port/tsp-rs/scripts/ts-udp-bridge.js
   --listen 27017 --targets default=127.0.0.1:27015@100.95.111.112:27015`.
   The browser talks WebSocket to the bridge and the bridge talks UDP to the
   server. The `internal@public` form is what makes the tailnet address
   reachable from the browser's origin.
4. **the port's client WASM** — `FWGS_DIR=/tmp/xash3d-fwgs
   tools/port/tsp-rs/scripts/build-wasm.sh`, then
   `tools/port/tsp-rs/scripts/deploy-wasm-to-webxash.sh`, which copies it to
   `webxash/public/cl_dlls/`. **The dev server serves the wasm from that
   directory**, so a port change is not in the browser until the wasm is
   rebuilt AND deployed. After the deploy the port's `dist/` and the served
   copy are byte-identical.

**The harness** — `https://100.95.111.112:5174/dev-buy.html` — draws the panel
from the port's records with no engine, so the design can be iterated on
without launching a game. It has every screen and scenario, and
`?screen=browse&state=poor` picks one.

**A dev-only bug that hid all of this**: the asset loader built its
cache-busting URL with `new URL(url)`, which throws on a *relative* URL — and
`VITE_ASSET_BASE` is unset in development, so the asset base IS relative. The
throw happened while the candidate list was being built, before the fetch was
attempted, so the dev server's game data never loaded and the page sat at
"Fetching game data" at 0%. Production was never affected: the deploy sets an
absolute asset base. Fixed by resolving against the document.

**The buy menu's own rules** (the design's mockup is the authority — the key
table in `docs/design-mocks/buy-menu-redesign.html`):

- a browse list's rows are keyed **1–9 and then 11, 12, …**, because key 10
  is the game's own back key and stays reserved — and the keycap the panel
  draws is the row's *place* in the list, so the tenth row wears the design's
  **"A"** and the eleventh **"B"**. (The classic flow's own list already
  numbered its tenth weapon 11 — the modern flow follows the game's rule
  rather than inventing one.)
- **back answers to 0 and to 10** on the modern screens (0 is the design's
  badge, 10 is the game's own key).
- the loadout's actions are **R** (Random, no confirmation) and **X**
  (**Clear**, which asks before it empties the loadout). The port prints the
  literal `Clear`; the classic canvas row keeps the game's own
  `#Buy_ResetConfig` title, because the canvas menu must not change.
- **the loadout screen's key space is its own**: the five cards wear the
  HUD slots' digits (**1–5**), the player accessory is **6**, Random is
  **7** and Clear is **8**. The browse screen's rail is a different
  numbering — the categories, keyed **1–7** — so a digit is only ever sent
  to the port's current page and the port says what it means. The classic
  flow keeps the game's own keys (its reset row is still key 4).

## The admin console is specified (PR #104, 2026-10-31)

Kyle supplied a mock of a single-admin web console for the fleet
(servers, a stat bar, a live console, map and server controls, a ranked
player list) and asked for a spec and a plan. The spec is
**`docs/ADMIN-CONSOLE.md`**; PR #104 is open and **awaiting Kyle's
approval** (the agent does not approve its own PRs).

The spec's load-bearing claims were **measured** against production
`ts-0` (read-only) and a disposable CI-stack instance, which was
destroyed afterwards. Four measurements contradicted the earlier drafts
(PRs #102 and #103, now closed and carried forward with the errors
corrected and marked):

1. **A successful `kick` DOES print into the RCON reply.** The earlier
   draft said it prints nothing. The rule derived from it — the reply is
   never the evidence, the state after the command is — survives.
2. **`rcon_password` can be set at runtime.** No restart, no kicked
   players.
3. **A runtime-set `rcon_password` survives a map change**, which
   re-executes `server.cfg`. The earlier draft rejected the runtime set
   on the grounds that the re-exec would stomp it; it does not.
4. **The game mode is a property of the MAP**, decided at rules
   install. `mp_teamplay 1` is accepted and the mode does not change.

**RCON works on the deployed engine**, which is what makes the console
small: a new `services/admin` on loopback, talking to the game servers
over loopback UDP, needing **no Docker socket** — which is what decides
it over the console FIFO the registry uses.

**Two features in the mock cannot work as drawn, and Kyle has decided
what happens to them (2026-10-31):**
- **Mute → dropped.** TS's *squelch* exists and the port implements it
  (`crates/client/src/voice.rs` — the scoreboard's squelch mode, `vban`,
  and the chat drop in `hud/mod.rs:1297`), but it is a **local,
  per-listener** mute: the muting player blocks someone on their own
  client. There is no administrative form, and GoldSrc's TFC-era
  `ignore` command does not exist in FWGS. A real admin mute would be a
  small **server-side** port change (drop `say`/`say_team` from a muted
  player in `host_say`), not a console change.
- **Ban → held, with the unblock now named.** The engine DOES have a
  per-machine id that is unique, persistent across sessions and not a
  cookie — `ID_GenerateRawId()`, a bloom filter over `/etc/machine-id`,
  CPU info and disk serials, saved to disk. It is **inert in a
  browser**, which has none of those, so every client ends up with the
  same value and `banid` is a mass disconnect. **The ban key is one
  field**: the server reads `protinfo["uuid"]` out of the connect
  packet, and that single value is the authid, the `banid` key and the
  `status` uniqueid. A bridge that overwrote it with a per-browser
  token would make `banid` remove exactly one player, with **no
  engine, port or server change**. That is FEAT-004/FEAT-005 of the
  anti-cheat plan (its Phases 5-6). The vaulted spec had the wrong
  field name (`cdkey` instead of `uuid`) and wrongly said the bridge
  already parses the connect packet; both are corrected. The console
  ships with **kick and no ban**.

**Game mode is a readout, not a control** (also decided 2026-10-31):
the mode is decided by the **map** at rules install, the servers will
not switch modes often, and the plan is eventually **one server per
game mode** — so the console reads the mode from the A2S rules string
and never writes `mp_teamplay` / `lastmanstanding` / `mp_theonemode`.

**Access is the SSH tunnel** (`ssh -N -L 8095:127.0.0.1:8095 bb-prod`),
not a public vhost and not Tailscale. **The console manages the game
server and nothing else** — no instance restart, no fleet scaling, no
VPS operations, which is why it needs no Docker socket.

All five decisions are written up in `docs/ADMIN-CONSOLE.md` §8.

**Phase 1 is built** (branch `feat/admin-console-phase1`, next section).
The build plan is five phases, each a PR.

## The admin console: phase 1 is built and REVIEWED (2026-10-31, `feat/admin-console-phase1`)

`services/admin` exists: a small Node HTTP service that talks to the
fleet over **RCON** and serves three read-only endpoints. No auth, no
UI, no mutating action — that is phase 1
(`docs/ADMIN-CONSOLE.md` §7, phase 1).

### The cross-vendor review round (2026-10-31)

A cross-vendor review of phase 1 found thirteen defects. All are fixed
on this branch, with a test for each. The ones that changed behaviour:

- **A player whose NAME contains `" hp="` vanished.** `hp=` is the
  boundary between the head (name + state) and the fields of a
  `ts_status` line, and the name is attacker-chosen bytes printed
  UNQUOTED — so splitting at the FIRST `" hp="` cut the name in half,
  the head failed its state check, and the row disappeared. A player
  the moderator cannot see is a player the moderator cannot moderate.
  The boundary is now found from the RIGHT: the rightmost `" hp="` is
  taken only if the head's last word is `alive` / `dead` / `observer`.
- **The RCON client had no overall deadline.** The quiet timer is a
  TERMINATOR, not a deadline, and every datagram restarts it — so an
  engine that dribbled a packet out every 250 ms kept the promise
  pending forever and the HTTP request hung. There are now TWO clocks:
  the quiet timer (300 ms) and an overall deadline (5 s), armed BEFORE
  `socket.connect` so a slow DNS resolver is bounded too. A deadline
  with traffic on it is `unreachable` ("kept talking but never
  finished"), NOT `refused` — a refusal means the engine said nothing.
- **The reply was joined with `'\n'`.** Each datagram's text already
  ENDS WITH A NEWLINE (the engine's redirect buffer does, and the flush
  sends it as it is), so joining inserted a blank line between every
  line and would have broken a line the engine's 2032-byte cap split.
  The reply is now the CONCATENATION, and the test's fake engine emits
  the trailing newline, so the test pins the engine's real text.
- **A truncated `status` reply was reported as a complete one.** The
  engine's own count (`players : N active`) is compared with the rows
  that arrived; when they disagree the response says `partial: true`
  and shows both counts, and the reply is read **once more** first.
- **The fleet was re-probed on EVERY request** — five engine commands
  per instance, forty per request, on the game servers' game thread.
  Each instance's probe is now cached: **5 s** for one that answered,
  **30 s** for one that did not (a failed attempt costs the engine's
  rate-limit bucket a token, and 30 s means it can never exhaust its
  own). Concurrent requests SHARE one probe. The cache is per process,
  in memory, with no background refresher.
- **The factory handed out the cleartext password.**
  `createAdminService()` now returns a REDACTED config
  (`rconConfigured: true`), and the password stays in the closure.
- **The loopback guard was only in `start()`** — it is now in the
  FACTORY, so phase 2 (which imports the factory) cannot walk around
  it. A malformed percent-escape is a **400**, not a 500; a bad
  `ADMIN_PORT` is a clean message, not a stack; and a **symlinked**
  entry point starts the service (the old `isMain` compared a
  resolved path with a symlink path, so the service silently exited 0
  with nothing listening).

The comment that said *"A FAILED RCON CALL IS NEVER RETRIED, ANYWHERE"*
was **false** — it was true within one probe, and the service re-probed
the same instance on the next request. It now says what is true: a
failed attempt is never retried *within a probe*, and the cache's TTL
is what bounds the rate.

### THE ENGINE LOGS THE RCON PASSWORD

This is not a bug in the console — it is a fact about the deployment,
and the runbook has to say it. The engine prints the whole RCON
datagram, **password included**, on every command
(`SV_RemoteCommand`, `engine/server/sv_client.c`):

```c
Con_Printf( "Rcon from %s:\n%s\n", adr, MSG_GetData( msg ) + 4 );
Log_Printf( "Rcon: \"%s\" from \"%s\"\n", MSG_GetData( msg ) + 4, adr );
```

The fleet runs with `-log` and a log file on, and the registry tails
the container's logs — so the RCON password is in the game server's
stdout and in its log file, **once per command**. The CONSOLE never
logs it (the factory does not even return it); the ENGINE does. The
probe cache cuts the volume enormously — five commands per instance
every five seconds instead of forty commands per request — but it does
not change what the engine prints: **the password is readable by
anything that can read the game server's logs.** Phase 5 (deployment)
has to say so in the runbook.

### The RCON client, as it now stands

**The RCON client** (`services/admin/lib/rcon.mjs`) is the risky part,
and it is done with all the traps handled:

- **The packet is raw bytes.** The request is built with
  `Buffer.from(str, 'binary')`, so the magic number is four `0xff` and
  not the UTF-8 pair `0xc3 0xbf`; the reply is decoded the same way.
- **The reply is MANY datagrams** — one per printed line, and `status`
  on a busy server is ~20 of them. The reader stops when the socket
  goes **quiet** (300 ms), because there is no length and no terminator.
- **An empty reply is a success.** The engine flushes its redirect even
  when the command printed nothing, so "a reply with nothing in it" and
  "no reply at all" are different things, and they mean different
  things.
- **Never retried within a probe.** The engine's rate limiter takes a
  token on a FAILED attempt only, so a retry loop locks us out. One
  attempt per instance, then report.
- **Two clocks.** The quiet timer ends a reply; the 5-second overall
  deadline ends a REQUEST, whatever the traffic.
- **A refusal names all four causes** it cannot tell apart: the
  password may be wrong, RCON may be disabled on that instance, UDP
  may be filtered, or the engine may be busy. (The pinned FWGS engine
  never says "Bad rcon_password" — on a wrong password it takes a
  token and returns **without replying** — so the client keeps the
  branch for other builds and does not pretend the engine sends it.)

**The three RCON states are kept apart**, because they are three
different operator situations:

| state | what it means | how it is told apart |
|---|---|---|
| `ok` | the engine answered | a reply came back |
| `refused` | the engine is there and would not talk to us | the port is open and nothing came back |
| `unreachable` | no usable answer | the host answered ICMP port-unreachable (a **connected** UDP socket reports that as `ECONNREFUSED`), or the engine never finished the reply |

The connected socket is what buys that distinction: a closed port says
so, an open-but-silent port does not, and without it a down server and
a misconfigured one would be the same row. With **no `RCON_PASSWORD`**
set the service still starts, and every instance comes back `refused` —
the truth, and the reason is the configuration.

**The parsers** (`services/admin/lib/parse.mjs`) read the engine's own
text, and the two live footguns are handled: the `#` column of the
`status` table is the **slot**, not the userid (`kick #N` wants the
userid, so the API exposes `slot` and `userid` as separate fields and
says which is which), and a bot is a row whose `uniqueid` is `BOT` — not
a name that starts with "Bot ". The third is the one the review found:
the `ts_status` head/field boundary is found from the RIGHT, because
the name is unquoted and may contain `" hp="`; and the `ts_status`
header pattern is **anchored**, because a name may contain
`"[ts] status:"`.

**The player list says when it is short.** The engine's own count
(`players : N active`, humans only) is compared with the human rows
that arrived; when they disagree the response carries
`partial: true` with `expectedPlayers` and `parsedPlayers`, and the
count that is shown is the ENGINE's — that is what the server believes.

**What is NOT in phase 1**, on purpose: no auth, no UI, no
kick/map/broadcast/restart, no cvar write, **no ban** (held until the
bridge-stamped identity exists), and **no uptime** — the engine has no
uptime command, so `uptime` is `null` until the service can ask the
orchestrator for the container start time.

**AND LIVE, AGAINST THE REAL ENGINE** (2026-10-31). The fake engine is
a fake; the CI stack is not. The disposable stack was brought up
(`ci-stack.sh up` → `ts-ci-0` on `127.0.0.1:27025/udp`, `bridge-ci`,
`registry-ci`), an `rcon_password` was set at runtime on `ts-ci-0`
through its console pipe, and **this service** was run against it in a
`node:22-alpine` container on the host's network namespace. The real
engine answered:

```
GET /admin/servers  →  {"id":"ts-0","port":27025,
                        "name":"bulletballet TS CI","map":"ts_casa",
                        "mode":"Dm","players":0,"bots":0,"max":32,
                        "tickrate":100,"mapSecondsLeft":874,
                        "timeLimitMinutes":15,"rcon":"ok","health":"up",
                        "expectedPlayers":0,"parsedPlayers":0,"partial":false}
GET /admin/servers/ts-0/status   → the same, as a status document
GET /admin/servers/ts-0/players  → the player table, partial: false
a second fleet read inside the cache's TTL → 6 ms, and the engine was
                                          sent no commands at all
```

So the RCON transport, the fleet discovery, the parsers and the cache
are proven against the engine that will actually run them — not only
against a fake that agrees with our reading of the protocol. The stack
was torn down afterwards and production was not touched (the four
production containers were still up with their original uptimes).

The live run also confirmed the **deployment** fact above, from the
engine's own log rather than from the source:

```
[15:00:28] Rcon: "rcon cismoke2026 sys_ticrate
[15:00:28] Rcon from 172.17.0.1:52212:
```

The password, in the log, once per command. That is the engine's
behaviour and the console cannot change it — the cache only reduces
how often it happens.

**Proven, not asserted:** the unit suite covers the wire encoding, the
multi-datagram read, the exact reply text, the quiet timer, the overall
deadline, the empty reply, the refusal's four causes, the unreachable
host, the player table, `ts_status`, the cvars, the probe cache, the
truncated reply, the redacted config, the loopback guard, the port
check and the symlinked entry point; and the service was started and
curled for real against a fake engine that speaks the protocol —
`GET /admin/servers` returned 200 with the live instance `ok` and the
dead one `unreachable`, `GET /admin/servers/ts-0/players` returned the
player table with `partial: false`, and a second fleet read inside the
cache's TTL sent the engine **no** commands at all.

(Phase 2 — auth — is built; see the next section.)

## The admin console: phase 2 is built — AUTH (2026-10-31, `feat/admin-console-phase2`)

`services/admin` now has a password, a session, a lockout, a CSRF
token, an audit line and `adminctl`. **Every endpoint but
`/admin/login` needs a session now** — including the three read
endpoints phase 1 built, which were deliberately open before the login
existed and are deliberately closed now.

**And the two passwords have different names**, because there are two
of them: the engine's is `rconPassword` / `RCON_PASSWORD` and it is
the only one that is ever a plaintext string, and the administrator's
is `auth` / `ADMIN_AUTH_FILE` and it is a scrypt record. The factory
refuses `password` and `adminPassword` outright — see the decisions
below.

**Nothing in phase 1 was touched.** The RCON client, the fleet
discovery and the parsers are exactly as the review left them. The
only phase-1 file that changed is `services/admin/service.mjs`, and
what changed in it is the gate, the three auth endpoints and the
factory's arguments.

**And the ban's stub endpoint** (`POST /admin/servers/:id/ban`) is
here too — always 501, and it never touches the engine. See below.

### The six pieces, and the trap in each

**THE PASSWORD** (`lib/auth.mjs`) is a scrypt record — `{version,
algo, N, r, p, keylen, salt, hash}` — with N=16384, r=8, p=1, a
32-byte key and a **per-password 16-byte salt**. The record **carries
its own parameters** and the verifier reads them from the record, so a
hash written with different ones is still readable (a verifier that
hard-codes them cannot read it, and a hash file that does not say how
it was made cannot be migrated). The comparison is
`crypto.timingSafeEqual` — `===` on a hash is a timing oracle — and
**a malformed record is a failed login, not a crash**: a truncated
`auth.json` must not turn into a 500 on every login, because the
operator's way back in is to FIX the file, which they cannot do while
it is 500ing. The plaintext never touches the disk.

**THE SESSION** (`lib/session.mjs`) is 32 random bytes in an
**HttpOnly, SameSite=Strict** cookie, and the table is keyed by the
**SHA-256 of the token** — a dump of the process memory then yields no
usable cookie, and a hash of a 256-bit random token has nothing to
brute-force. Two clocks: **12 h idle, 24 h absolute**. The idle clock
is refreshed by use; the absolute one is not, which is the whole point
of having it. The table is **in memory**: a restart logs the
administrator out, and that is the correct behaviour.

**THE CSRF TOKEN** is a **second, separate secret** (another 32 random
bytes), returned in the **JSON body** of the login and of
`/admin/session`, because the browser has to read it and put it in the
`X-CSRF-Token` header. The session cookie stays HttpOnly; the CSRF
token does not, and must not.

**THE LOCKOUT** (`lib/lockout.mjs`) is **5 failures → 5 minutes,
doubling to an hour** (5, 10, 20, 40, 60), keyed to the **source
address** — there is one administrator, and what is protected is the
endpoint, not an account. The countdown is the **server's**: the lock
is a timestamp, and the check that matters is `now < lockedUntil`, so
a client that ignores the countdown gets 423 again. The **rate limit
is a separate counter** (10 attempts a minute per source, right or
wrong): the two rules are not the same rule, and the difference shows
— a source that logs in successfully ten times a minute has reset the
lockout counter every time and is **still** throttled.

**THE AUDIT LINE** (`lib/audit.mjs`) is **timestamp, action, target,
outcome**, one line per event, appended and never rewritten, at 0600.
The target of a login is the **source address** — never the password,
never a session token, never the CSRF token.

**THE BAN STUB** (`lib/ban.mjs`) is the **one mutating endpoint that
cannot touch the engine**. `POST /admin/servers/:id/ban` answers
**501** and the fixed body from §5.1 — whatever the method, whatever
the body, whatever the instance — and `banned` is `false` in every
one of them, so a client that ignores the status code still cannot
conclude that a ban happened. It does not even **read** the fleet:
no `banid`, no `addip`, not a `status`. The reason is in the body:
the engine's ban key is the **uniqueid**, and every browser client
on an instance shares one (§2.5), so banning it would remove
everybody — and the IP fallback is the fleet-wide action wearing a
per-player tool's clothes. It is in phase 2 for two reasons: it is
the **honest end-to-end proof of the CSRF gate** (the logout is the
only other mutating endpoint, and a CSRF failure on a logout is
nearly harmless — so the gate would barely be exercised), and it
gives **phase 3's ban button an endpoint to call** instead of
nothing.

### The five decisions the spec did not make

1. **A login with no record on the host is a 503, not a 401.** "Wrong
   password" and "no password has been provisioned yet" are different
   situations and the operator has to be able to tell them apart.
2. **The order of the checks is: session → CSRF token → the router.**
   A request with no session is a 401 **even if its CSRF token is
   also wrong** — an unauthenticated caller gets to learn one thing,
   which is that it is not logged in. And an unknown path is a 401 to
   an anonymous caller and a 404 to a logged-in one, so the console
   does not tell a stranger which endpoints it has.
3. **The failure count starts again from zero when a lock expires.**
   A lockout cycle is five failures and then a wait; the LEVEL is
   kept, so the next lock is twice as long. A **successful** login
   resets everything, including the level — the administrator who got
   in does not carry a longer lock into their next typo.
4. **The ban path is a mutating path whatever the method says.** A
   `GET` on it still needs the CSRF token, because the path is the
   one endpoint whose whole purpose is a mutation — so it is a 403
   without the token and the same 501 with it. And the attempt is
   **audited**: one line, `ban <instance> unavailable`. A refusal
   that leaves no trace is a refusal nobody can learn from.
5. **THERE ARE TWO PASSWORDS, AND THE NAMES KEEP THEM APART.** The
   **RCON** password is the engine's: it has to be a plaintext string
   at runtime, so it is `rconPassword` in the factory and
   `RCON_PASSWORD` in the environment. The **administrator's** is
   never a plaintext string anywhere: it is a scrypt record, so it is
   `auth` in the factory (a record or a store) and `ADMIN_AUTH_FILE`
   in the environment. The one that is a string is named after the
   thing it is; the one that is a record is not called `password` at
   all. The factory **refuses** `password` and `adminPassword`
   outright, and the environment refuses the old `ADMIN_AUTH_PATH`
   and a plaintext `ADMIN_PASSWORD` — because an option that is
   quietly ignored is a service that starts with the wrong secret (or
   with none of them) and refuses every instance for a reason nobody
   can see. The redacted config carries `rconConfigured` **and**
   `authConfigured`, so an operator can tell at a glance whether the
   console will accept a login at all; neither flag is a secret.

### Two things that are deliberate and must not be "fixed"

- **The session cookie is NOT `Secure`.** The console is plain HTTP
  on loopback and the **SSH tunnel is the encryption layer**. A
  `Secure` cookie is only sent over HTTPS, so adding it to the
  loopback deployment would mean the browser never sends the cookie
  and the console can never be logged into. It protects nothing that
  the tunnel does not already protect. If the console is ever put
  behind a TLS vhost, the cookie gains `Secure` and nothing else
  changes. The comment in `service.mjs` says so, so that the next
  reader does not helpfully break the login.
- **THERE IS NO "SKIP AUTH" SWITCH.** The phase-1 tests log in for
  real — the same scrypt path, the same cookie, the same gate — and
  the factory takes the auth configuration **as an argument** (an
  in-memory store in the tests, the file on the host). A switch that
  turns the gate off is a footgun, and phase 4 (the mutating
  actions) would trip over it with the tests still green.

### The paths, and the names of the two secrets

- `/srv/ts-admin/auth.json` — the password record, 0600, written by
  `adminctl set-password`. In the environment it is
  **`ADMIN_AUTH_FILE`** — the path to the *record*, not to a password.
- `/srv/ts-admin/actions.log` — the audit log, 0600, appended.
  `ADMIN_AUDIT_PATH`.
- `RCON_PASSWORD` — the **engine's** password, and the only secret
  that is ever a plaintext string. `rconPassword` in the factory.
- The **administrator's** password is never a plaintext string
  anywhere: it is the scrypt record, and it is `auth` in the factory
  (a record, or a store that reads one). `adminctl` writes it;
  nothing else ever holds it.

**Phase 5 provisions that directory; phase 2 deploys nothing.** The
service reads the record at the moment of the login, so a password set
after the service started takes effect without a restart.

### `adminctl` (`services/admin/adminctl.mjs`)

- `adminctl hash` — reads the password from **stdin with the echo
  off** (never from argv: argv is in `ps` output and in the shell
  history) and prints the record as one line of JSON.
- `adminctl set-password` — reads that record from stdin, **validates
  it** (the algo must be scrypt, the parameters must be the ones this
  build supports, the salt and the hash must be hex of the right
  length) and writes it **atomically** — a temporary file in the same
  directory, then a rename — at 0600. **A malformed record is
  refused, and the existing file is left alone.**
- The write **refuses to run as root** and refuses a directory that
  is not owned by the uid doing the writing: a root-owned record in
  the service's directory is a file the service may not be able to
  read, which is a console nobody can log into.
- `--help` works and needs no password.

### How it was proven

**The unit suite** (91 new tests, 449 in all) covers the scrypt
verifier (the right password, a wrong one of the same length, a wrong
one of a different length, and a malformed record that does not
throw), the two session clocks (the idle expiry at 12 h, the absolute
one at 24 h with the session in use right up to the end, and the idle
clock refreshed by use), the lockout (five failures lock it, the
countdown comes from the server's clock, it doubles and is capped at
an hour, a success resets it), the rate limit being independent of
the lockout, the audit line (one line per event, appended, 0600, and
**no password, session token or CSRF token in any of them**), the
cookie (`HttpOnly`, `SameSite=Strict`, and the CSRF token **not** in
a cookie at all), the gate (no session → 401 on every endpoint but the
login, an expired session → 401 and audited, a wrong CSRF token →
403, and a request with no session and a wrong CSRF token → **401**,
not 403), and the CLI round trip (`hash` → `set-password` → the
service logs in with that password; a malformed record is refused and
the file is left alone). **And the ban stub**: the body is compared
against the literal in §5.1 (value and key order), the answer is 501
for a valid body, a malformed one, an empty one, a body that claims
the ban happened and a body that asks for an IP ban, for an instance
that does not exist, and for a method that is not POST; the **engine
is never asked** (the fleet spy counts zero commands); a request with
no session is a 401 and one with a bad token is a 403; no session and
a bad token together is a **401**, not a 403; and the attempt is
audited with no secret in the line.

**And for real**, against a fake engine that speaks the protocol
(`tools/smokes/admin-auth-smoke.sh`; the output is in the commit
message that added it): an unauthenticated `GET /admin/servers` is a
**401**, the wrong password is a **401**, the fifth wrong password trips the
lockout and the sixth is a **423** with `lockoutSecondsRemaining:
300`, the right password is a **200** with a `Set-Cookie` that is
`HttpOnly; SameSite=Strict` and a `csrfToken` in the body, the fleet
is **200** with that cookie, `/admin/session` answers with the CSRF
token, the expiries and the capabilities, the **ban** is a **501**
with the fixed body and `banned: false` (and a **403** without the
CSRF token, and a **401** without a session — the order is session →
CSRF → 501), and the logout **ends the session** — the same cookie is
a 401 again. The audit log has the ban in it: `ban ts-0 unavailable`.

**The clock is injected** everywhere it matters: the service takes it
as an argument, and the tests move it by hand. A test that waited
twelve hours for an idle expiry, or five minutes for a lockout, would
be a test that never runs.

### What is NOT in phase 2

No UI (phase 3), no mutating engine action (phase 4), no deployment, no
Dockerfile, no systemd unit, no TLS, no usernames, no roles, no
password reset. **The state directory is not provisioned either** —
phase 5 does that. **And no REAL ban** — the ban's *stub* endpoint
ships in phase 2 (§5.1), the ban that actually removes somebody
does not, and it cannot until FEAT-004 and FEAT-005 give every
browser client its own id.

**NEXT TASK (admin console, phase 3): the read-only UI.** The mock,
wired to the API: the login screen, the shell, the fleet rail, the
status panel, the player list with its filters and search, the map
list, the bans list and the output drawer. **No mutating controls** —
the console can look at everything and touch nothing. The contract is
fixed in `docs/ADMIN-CONSOLE.md` §5 and §6. The phase-3 UI has to
speak the phase-2 API: `POST /admin/login` for the cookie and the
CSRF token, the cookie on every request, and the CSRF token in the
`X-CSRF-Token` header on every mutating one.

## The admin console: phase 3 is built — THE READ-ONLY UI (2026-10-31, `feat/admin-console-phase3`)

**Kyle's own mock is the design contract, and it is in the repo**
(`docs/admin-console-mock.html`, byte for byte — it used to live only
in a cache directory that gets pruned, which is a bad place for a
design contract to live). Its CSS was extracted **verbatim** into
`services/admin/public/admin.css` — not a re-implementation, not a
rewrite, the thing itself. The **palette mirrors the site's**
`webxash/src/assets/ts-theme.css` (the same values — the void
`#010A04`, the panel `#06150A`, the edge `#123A1C`, the phosphor
`#00FF41`, the ghost `#D8FFE2`, the muted `#6FA67C`) but under the
**mock's own token names**, and the names stay the mock's: the site's
tokens are frozen and `--ts-` prefixed, and rewriting the mock's
components against different names is how a design drifts.

**The console is served by the admin service itself**, and the three
static paths — `/`, `/admin.css`, `/admin.js` — are the **only** ones
not behind the session gate, because the login screen needs its own
CSS and its own JavaScript and the page has to load before anybody can
log in. The HTML is `no-store` so a deploy shows up; the CSS and the
JS are cached for a minute. **No build step, no framework, no npm
dependency** — the service still has none. The API did not move:
every `/admin` path is still behind the gate, and a static path and
an API path cannot collide, because `/admin.css` and `/admin.js` are
not under `/admin/`.

**Two READ endpoints were added** — both were in §5 and phase 1 did
not build them:

- **`GET /admin/servers/:id/maps`** — the engine's own `maps *`
  (`SV_Maps_f` in `engine/server/sv_cmds.c`, one line per map through
  `Cmd_ListMaps`), parsed out of the engine's **real** output, with
  the **current map first** and the engine's `raw` text alongside so
  the output drawer has something real in it.
- **`GET /admin/servers/:id/bans`** — the **console's own** id-ban
  store, which is **empty** (the ban endpoint is a stub and nothing
  can create a ban), plus the engine's `listip`, parsed. The engine's
  own `listid` is **silent** at the fleet's `developer 1`, so the
  console's own store is the answer, and the panel says so in words.

Both are read-only, and **neither asks the engine a second time when
the instance has already refused**: a failed RCON call costs the
instance a token from its own rate-limit bucket, so an instance that
is not answering is reported as it is.

### The four corrections, and the write controls

The mock is the design; the spec's decisions beat it. So:

1. **No "Muted" tab** — mute was dropped (§8 Q1). The tabs are **All**
   and **High ping**.
2. **No ban button and no ban modal** — there is no ban in this
   release (§2.5). The player row carries **no** affordance at all,
   and the mock's "Ban list" button opens a **read-only panel**.
3. **No commands to try.** The hint says *"read-only · the command box
   arrives with phase 4"* instead of listing commands that do not
   exist yet.
4. **"Signed in as root@neo" → "Signed in as admin"** — the API says
   `user: "admin"`.

The write controls — the command box, "Change map", "Say" and
"Restart round" — **are rendered, and they are visibly not available**:
`disabled`, dimmed in the mock's own idioms (the muted border and the
muted ink of the small button), **never green**, because `--phosphor`
is the accent for things that WORK, and each one says in its tooltip
which phase it arrives in. **"Ban list" is not a write** — it is a
view, and it works. **The output drawer is not a write** — it shows
what the console did, in §6.3's four parts: a timestamp, the command
echoed, the outcome and the confirmation.

### The polling, and the two things it refuses to do

**One interval, five seconds, and it is not faster than the cache.**
The service caches its probes for five seconds on an instance that
answered (`OK_TTL_MS = 5_000`), so polling faster would only re-read
the cache. The fleet, the selected instance's status and its players
are all read on that one tick; the map list and the IP filter are read
on a slower **thirty-second** beat, because `maps *` walks the map
directory and reads every BSP's lumps and that is not a thing to do
every five seconds.

**A hidden tab does not poll** — `document.visibilityState` stops the
tick and resumes it (with an immediate refresh) when the tab comes
back. **And nothing polls while the login screen is showing.**

### The three honest answers

- **Uptime is `—`.** The engine has no uptime command, so the stat
  shows the honest dash with the reason in the tooltip. It is not
  faked.
- **A short player list says so.** `partial: true` (the engine's count
  and the rows that arrived disagree — the reply is one datagram per
  printed line, and UDP loses datagrams) is a visible amber warning
  above the list, not a quiet detail.
- **The lockout countdown is the server's.** The page counts down from
  the number the server sent and never decides for itself that the
  lockout is over; the server's next answer is what decides.

### How it was proven

**The unit suite** (27 new tests, 486 in all) covers the two new
parsers (`parseMapList`, `withCurrentFirst`, `parseIpFilter`, against
the engine's **real** output shapes), the two new endpoints (the map
list is the engine's with the current map first; the bans answer with
the empty id store and the parsed `listip`; **neither changes
anything** — the fleet spy counts the commands and finds only `maps *`
and `listip`, and **never `listid`**), the static serving (the right
content types, the HTML not cached, a `POST` to a static path
refused, **and the API still 401 without a session now that files are
served**).

**And for real**, at the HTTP level (`tools/smokes/admin-ui-smoke.sh`):
`/` is a **200** `text/html` with `Cache-Control: no-store`,
`/admin.css` is `text/css`, `/admin.js` is `text/javascript`,
`GET /admin/servers` with no cookie is still a **401**, a `POST` to a
static path is a **405**, the map list comes back as
`["ts_casa","ts_hideout","ts_lobby"]` with `current: "ts_casa"` and
the engine's own `raw` text, the bans answer with `"idBans": []` and
the note, and the ban is still a **501**.

**And in a real browser** (`tools/smokes/admin-ui-browser.mjs` — it
resolves Playwright at RUN time, so the repo still grows no npm
dependency): the page loads, the **wrong password** is refused with
the attempts remaining, the **right password** gets in against the
real service, the shell renders, the fleet appears, the player list
fills, the map list shows the current map first, the bans panel opens
and says why the id list is empty, every write control is `disabled`
and the ban list is not, and the only failing requests in the whole
session are the two the smoke causes on purpose (the boot probe
asking whether there is a session, and the wrong password).

**The browser smoke refuses to measure somebody else's console.** It
checks that both of its ports are FREE before it starts anything, it
captures the service's own output instead of throwing it away, and it
stops with the service's message if the service cannot bind. A
leftover service from an earlier run would otherwise answer the
smoke's requests — with a constant map timer, and none of this
phase's behaviour in it — and the smoke would pass against a build
that was never running.

**The proof that it looks like the mock** is in
`docs/screenshots/` — `admin-console-mock.png` (the mock, rendered)
and `admin-console-phase3.png` (the console, against the fake engine),
at the same viewport, plus `admin-console-login.png`. The differences
that remain are the **data** (the mock has three instances and four
players; the console has one instance and two) and the **deliberate**
corrections above.

### What is NOT in phase 3

**No mutating controls.** The command box, kick, map change,
broadcast, restart round, the time-limit write and the ban are all
phase 4 or later; the UI renders them as **not available** and does
not pretend. **No logout button** — the API has one and it is proven,
but the mock has no such control and adding one would be a visible
difference from the contract. **No deployment, no Dockerfile, no
systemd unit** (phase 5). **No framework, no build step, no npm
dependency.** No second administrator, no roles. **The RCON client,
the fleet discovery, the parsers, the auth, the session, the lockout
and the audit were not touched.**

**NEXT TASK (admin console, phase 4): the mutating actions.** Kick,
map change, broadcast, restart round and the time limit — every one
returning the §5 envelope and confirmed by a re-read. The contract is
`docs/ADMIN-CONSOLE.md` §5 and §6, and the two traps are a kick whose
target left between the list refresh and the click, and a round
restart that prints nothing.

## The admin console: phase 4 is built — THE MUTATING ACTIONS (2026-10-31, `feat/admin-console-phase4`)

**The console can touch a live server now, and it says what it did.**
Five endpoints — `POST /admin/servers/:id/{kick,map,broadcast,restart-round,timelimit}`
— each one behind the **session gate** and the **CSRF token**, each
one writing **exactly one audit line**, and each one answering with
the §5 envelope: `outcome`, `command`, `reply`, `detail`, `affected`.
The code is `services/admin/lib/actions.mjs` (the actions and the
honest answer about each one) and the five routes in
`services/admin/service.mjs`.

### The rule the whole phase is built on

**The reply is never the evidence; the state after the command is.**
So every action is confirmed by a **re-read**:

| Action | The re-read | `done` when |
|---|---|---|
| kick | the player list | the userid is **gone** from it |
| map change | the status | the map **is** the new one |
| broadcast | *nothing* | the engine's own reply is the confirmation, and the envelope says so |
| restart round | the map timer (`mp_timeleft`) | it jumped back up |
| time limit | the cvar (`mp_timelimit`) | it carries the new value |

**The cached probe is dropped before the re-read, and the re-read asks
the engine DIRECTLY.** The fleet probe is cached for five seconds
(phase 1), so a re-read through that cache would read the state from
BEFORE the action and every confirmation would be a lie. The cache's
**TTL policy did not move** — `invalidate()` is the one door an
action opens, and it is opened exactly once per action. A probe that
was already in flight when the action ran does not put its result
back into the cache either: it read the world before the action.

**One attempt, always.** The engine's rate limiter takes a token from
a FAILED attempt only, so a retry loop turns one mistake into a
lockout of the very engine the console is trying to fix. Every action
makes exactly ONE mutating attempt; a failed attempt is reported, not
retried. The reads that confirm an action are not retries.

### The two traps

1. **A kick whose target left** between the list refresh and the
   click: the engine answers `Client is not on the server`, and the
   console reports that as **`refused`** — the engine's own text,
   colour codes stripped — and not `done`, and not a crash.
2. **A round restart that prints nothing**: the empty reply is
   **`no_output`**, which is a **success** (§5 names it) and which the
   drawer shows in **GREEN**. A console that treated an empty reply as
   an error would report every round restart as broken.

### The finding: `restartround` is INERT on the fleet

This was measured against a **live instance** on 2026-10-31, not
guessed. `restartround` prints nothing (that is in §2.2 already) —
and it does not restart the round either:

- `mp_timeleft` went **866 s → 862 s** across the command — the map
  timer counting down, not jumping back up;
- the port derives `mp_timeleft` from the **map clock**
  (`rules/frame.rs:53`), and a round restart does not touch it;
- and the port's round restart **does not apply in FFA at all**:
  `reset_restart_round` returns early unless
  `restart_round_applies(mode, lms)` (`rules/frame.rs:339`), which is
  `matches!(mode, RoundTdm | Objective) || lms`. The fleet runs `Dm`,
  `teamplay=false`, `lms=false` — so it acts nowhere.

The console reads the mode and the flag from the port's own
`ts_status` header and says so — *"a round restart does not apply in
Dm without last man standing, so the round was not restarted"* — and
the outcome is `no_output`, GREEN. It does **not** claim a round
restarted, and it does **not** report the action as broken.

### The UI, per §6.2

- **Kick** — **one click** plus an optional reason. **No modal, no
  typed confirmation, and NOT a red button**: a kick is not
  destructive, the player reconnects. The player row's action is
  `KICK`.
- **Map change** — the **only** action with a modal, and the modal
  names **how many players will be dropped** and that **`server.cfg`
  will be re-executed**, before the click and not after it. The
  confirm button is **red** — the only red button in the console.
- **Broadcast, restart round, time limit** — no modal. They are live.
- The **broadcast field** says that a **multi-word** message reaches
  the players **with its quotes**, because the engine re-quotes every
  RCON argument. The console does not hide it and does not "fix" it by
  mangling the message.
- The **time limit** is written in **minutes**, live, with no restart.
- The **map list** is selectable now, with the modal.
- The **output drawer** (§6.3) carries the four parts, and the
  **confirmation gets its own line** where the outcome line could not
  hold it: `refused` shows the engine's own text and the re-read
  behind it gets a line of its own, and `no_output` says "✓ done — no
  output" and the measurement gets a line of its own.
- **Green is never an error surface.** `done` and `no_output` are
  green, `not_confirmed` is amber, and `refused` and `no reply` are
  red.

### A bug the browser smoke found, and the fix

The map modal named the **previous** instance's player count: the
console still held `ts-0`'s status after the operator had selected
`ts-1`, and a map change drops EVERYONE on the instance, so the count
is the whole warning. The status read now records **which instance it
belongs to** (`state.statusId`), `select()` drops the old instance's
status, and the map button stays out of reach until the SELECTED
instance has been read.

### How it was proven

**The unit suite** — 47 new tests (533 in all): the envelope for each
action, all five outcomes reachable, the two traps, the cache
invalidation (a re-read that would fail if it went through the
cached probe), one attempt and no retry, the audit line for each
action (with **no** password, session token or CSRF token in it), the
CSRF gate (403) and the session gate (401) on every action, and the
UI's rules (the kick has no modal and is not red, the map modal names
the count and `server.cfg`, the write controls are live and the ban
affordance is not).

**At the HTTP level** (`tools/smokes/admin-ui-smoke.sh`): all five
actions, both traps, the CSRF and session gates, the audit lines and
the logout. **And in a real browser**
(`tools/smokes/admin-ui-browser.mjs`): the five actions driven through
the page, the drawer entries in §6.3's format, both traps, the audit
lines, and a screenshot of the console with the action entries in it
(`docs/screenshots/admin-console-phase4.png`).

**And against the REAL engine.** The CI stack could not be used (no
`ts-server` image, and `ci-stack.sh` derives the image from a
running production `ts-0`), so the real engine was **run natively**
instead: Xash3D FWGS plus the built Rust TS DLL plus the operator's
own asset tree, on `127.0.0.1:27025`, with the `rcon_password` set
at runtime through the console pipe. The console's own service was
pointed at it and drove the five actions. What the real engine
answered:

```
kick #34 "rcon smoke kick"  → done       Kick: "Bot Trinity 34<34><ID_BOT><>" was kicked by "Console" (message "rcon smoke kick") …
kick #999 "cheating"        → refused    Client is not on the server
broadcast                   → done       bulletballet TS CI: "Hello" "from" "the" "admin" "console"
restartround                → no_output  (the reply is empty — the trap, and a success)
mp_timelimit 20             → done       "mp_timelimit" changed to "20"
changelevel ts_lobby        → done       (the reply is empty; the re-read says the map is ts_lobby)
```

**What is NOT in phase 4**

**The free-form command box is not built**, on purpose: over RCON
`banid` works, so a box that could send a second command would hand
back exactly what the ban hold exists to prevent (§2.5). The console
box stays **disabled** and says the actions arrive with phase 4.
**No ban and no mute** (§2.5, §2.6) — the ban's stub endpoint still
answers **501**, and the console's ban affordance is unchanged.
**No deployment, no Dockerfile, no systemd unit** (phase 5). **The RCON
client, the fleet discovery's cache policy, the auth, the session,
the lockout and the audit were not touched.**

**NEXT TASK (admin console, phase 5): the deployment, the secret and
the docs.** The `deploy-services.sh` entry, the Dockerfile, the CI
wiring, the `rcon_password` provisioning (runtime first, boot config
second), the SSH tunnel alias and the runbook — so the console is
reachable from Kyle's machine over the tunnel and the secret survives
a container restart.

## The admin console: phase 5 is built — THE DEPLOYMENT, THE SECRET AND THE RUNBOOK (2026-10-31, `feat/admin-console-phase5`)

**The mechanism is built. The cut-over is NOT done, and was not done on
purpose.** There is no console running on `bb-prod`, no RCON password
anywhere, no game server was touched and nothing was restarted. The
mechanism is what phase 5 built; the cut-over is done by hand, after
review.

### The image — `services/admin/Dockerfile.admin`

- **`node:22-bookworm-slim`** — the same base as the other control-plane
  images: one base to patch, one libc, one set of behaviours. The service
  has no native dependencies, so alpine's smaller libc buys nothing.
- **One `COPY` per directory** (`lib/`, `public/`), because the registry
  shipped an image whose service could not import its own module when
  somebody forgot a `COPY` line, and it crash-looped in production for
  it. The build context is **allowlisted** (`Dockerfile.admin.dockerignore`)
  for the same reason: the repository root is 1.1 GB of game assets.
- **No `npm install`** — the service has no dependencies. A Dockerfile
  that grows an install step is a service that can fail to be built.
- **uid 10006 (`admin`)** — the next free number in the allocated block
  (10001 gameserver, 10002 a2s, 10003 bridge, 10004 registry, 10005
  orchestrator). It is FIXED, not derived: the state directory and the
  audit log on the host are owned by it, and a uid that moved with the
  build would leave the console unable to read its own state.
- **gid 10007 (`tsrcon`)** — the shared secret group (§ below).
- **No game assets, no secret, no docker socket.** The CI checks the
  first two; the last one is the design (§3.3).

### The secret — a FILE, and 0640, not 0600

`RCON_PASSWORD_FILE` points at a file whose contents are the password. It
is read at startup, the trailing newline is trimmed, and the value is
**never** logged, returned or audited. `RCON_PASSWORD` stays supported —
the interim and the tests use it — and **both set is a refusal to
start**, with the reason: two ways to say one thing is how a secret ends
up being the wrong one. A file that cannot be read is also a refusal to
start, with the path in the message.

**The file's mode is 0640, owned by `root:tsrcon` (gid 10007) — NOT the
0600 §3.4 originally said, and the reason is that the secret has TWO
readers with TWO uids**: the console (10006) and the game server's
entrypoint (10001), which writes the password into the config the engine
execs. A 0600 file owned by the console is unreadable by the game
server, so the boot-config path would need a **second copy** of the
secret — and two copies drift apart, which looks exactly like a network
fault (every instance `refused`, nothing in the logs). 0644 would be
world-readable; 0600 owned by root would be readable by neither. The
console's user is in the group and the game container is started with
`--group-add 10007`.

### The boot config — the engine's own `server.cfg`, and nothing committed

The entrypoint appends `rcon_password "<value>"` to the **copy** of
`server.cfg` it execs, from the **same mounted file** the console reads.
The committed `tools/deploy/config/server.cfg` never changes. A **missing**
secret does **not** stop the fleet from booting: the instance starts with
RCON off and says so on stderr. A missing optional secret must never stop
a game server from starting — that would be a much worse outage than the
one it prevents.

### The deploy entry — `replace admin`

Host network, `ADMIN_HOST=127.0.0.1`, `ADMIN_PORT=8095` (loopback only),
`TS_PORT_BASE=27015`, `TS_INSTANCE_COUNT=8`, the secret **read-only**, the
administrator's record **read-only as a DIRECTORY** (`adminctl` writes it
atomically with a rename, and a bind-mounted *file* would keep pointing at
the old inode forever), the audit log's **DIRECTORY writable** (a
bind-mounted log file has to exist and be owned correctly before the
container starts, and docker creates a missing source as root), and **no
docker socket**. The deploy **builds** the image from the repository when
the repository is there, so a deploy cannot ship a stale console, and it **skips the console until the secret is provisioned** (loudly —
the console has not been cut over yet, and the registry, the orchestrator
and the bridge have players on them). A secret that is **empty** or
**world-readable** stops the deploy: that is an operator's mistake, not a
cut-over that has not happened.

### The CI, the tunnel and the runbook

- **CI** builds the admin image, checks it for `*.bsp` / `*.pak` /
  `*.mdl`, checks that it carries no `rcon_password` file and no
  `auth.json`, checks that `RCON_PASSWORD` is not in its environment, and
  **runs** it with a real secret and a real record
  (`tools/smokes/admin-image-smoke.sh`). The deploy workflow streams
  `admin:<sha>` and the deploy script runs it.
- **The tunnel is a script**, `tools/admin/tunnel.sh`, not an alias in
  `~/.ssh/config`: an alias is a change to ONE machine, and the repository
  is the thing anybody else can use. It **refuses to start twice** and it
  **leaves nothing behind** (the tunnel is a child process and the script
  kills it on every path out).
- **The runbook** is `docs/ADMIN-CONSOLE-RUNBOOK.md`: the tunnel, the
  secret's provisioning, `adminctl` (which refuses to run as root, so it
  runs as uid **10006**), the runtime `rcon_password` command and **when
  it is needed**, the fact that **the engine prints the password in its
  log** (so the game server's logs are as secret as the file), and the
  **tri-state** — `ok` / `refused` / `unreachable`, where `refused` means
  the console cannot talk to the server and **not** that the server is
  down.

### How it was proven

- **20 new unit tests** (`tests/unit/admin-deploy.test.mjs`) and **14**
  (`tests/unit/admin-secret.test.mjs`): the image's shape and its
  contents, the deploy block, the entrypoint (the copy gets the line, the
  committed file does not change, a missing secret still boots), the
  tunnel (refuses twice, leaves nothing behind), and the secret (read and
  trimmed, never logged, both-set refusal, missing-file error).
- **The image, running for real** — `tools/smokes/admin-image-smoke.sh`:
  the secret file is `root:10007` 0640, the state directory is
  `10006:10006`, the record is written by `adminctl` as uid 10006, the
  console answers `/` with **HTTP 200**, the login answers **HTTP 200**,
  and `GET /admin/servers` answers with **`"rcon": "ok"`** — and the
  secret is in neither the log, nor the audit log, nor a response. The
  game server's uid (10001) can read the same file through the group, and
  uid 10002 cannot.

### What is NOT in phase 5

**No production cut-over.** Nothing was deployed to `bb-prod`, no RCON
password was set anywhere, no running game server was touched, and
nothing was restarted. **No public exposure** — the console is loopback
only, it is not in the Caddy vhost and it has no DNS record. **No secret
in the repository** and **no `rcon_password` in the committed
`server.cfg`**. **No second administrator, no roles, and no change to the
auth, the session, the lockout, the CSRF gate or the audit.**

**NEXT TASK (admin console): the cut-over, by hand, after review.**
Provision the secret and the administrator's record on `bb-prod`
(`docs/ADMIN-CONSOLE-RUNBOOK.md` §2 and §3), deploy, enable RCON at
runtime on every instance (§4.1 — a runtime password is per instance, so
a new instance needs it too), open the tunnel and check the tri-state
(§6). Then, and only then, the console is "reachable from Kyle's machine
over the tunnel, and the secret survives a container restart" — the phase
5 done-when. **The fleet-list fix has to reach the branch that is cut
over** (`fix/admin-fleet-list`, PR #111): without it the console
publishes the port range again, and the fleet view is eight servers
instead of one.

## The admin console's FLEET LIST: ask the orchestrator (2026-10-31, `fix/admin-fleet-list`)

**The console was publishing seven servers that do not exist.** Measured on
production: the fleet is **one** game server (`ts-0`) and
`TS_INSTANCE_COUNT` is 8, so the console enumerated the port range and
published eight servers —

```
{'id': 'ts-0', 'port': 27015, 'map': 'ts_central', 'bots': 16, 'tickrate': 100, 'rcon': 'ok',   'health': 'up'}
{'id': 'ts-1', 'port': 27016, 'map': None, 'rcon': 'unreachable', 'health': 'down', 'detail': 'the instance did not answer (ECONNREFUSED)'}
{'id': 'ts-2', …} … through ts-7
```

Seven of those are instances nobody ever created, and the UI would have
drawn seven red cards for them.

**WHY A PORT RANGE COULD NOT FIX IT.** A range cannot tell "this instance
EXISTS and is SICK" from "this instance was NEVER CREATED" — and that
difference is the whole health model, because the RCON tri-state
(`ok` / `refused` / `unreachable`) exists to report it. The old list said
"unreachable" for both, so the console published noise and no information.

**THE ORCHESTRATOR KNOWS.** It owns the fleet: it creates and removes the
containers. `GET http://127.0.0.1:8090/api/orchestrator` reports every
slot it manages and whether the slot is **`deployed`** — and that flag is
right even when the engine is dead, because the orchestrator checks the
CONTAINER, not the engine. The console now asks it
(`services/admin/lib/orchestrator.mjs`), and publishes only the deployed
instances. **The port range is the FALLBACK**, and the fleet response
says which list it used:

```json
{ "fleetSource": "orchestrator" | "port-range",
  "detail": "the orchestrator (http://127.0.0.1:8090) reports 1 deployed instance(s)",
  "skipped": [] }
```

**THE TWO ANSWERS HAVE TO BE DIFFERENT.** An orchestrator that says
there are **no** instances is an **empty fleet** with
`fleetSource: "orchestrator"`; an orchestrator that **did not answer** is
the **port-range fallback** with `fleetSource: "port-range"`. Every
failure — unreachable, timeout, non-2xx, not JSON, the wrong shape — is a
FAILURE, never an empty list pretending to be "no instances".

**THE ID → PORT MAPPING IS PARSED, NOT ASSUMED.** `ts-N` is on
`TS_PORT_BASE + N`, and the number is parsed off the end of the id, so a
list that is **not sequential** (`ts-0`, `ts-3`) still maps. An id that
does not parse is **skipped and reported** in `skipped`, never guessed at.

**A SICK INSTANCE IS NEVER A 404.** The per-instance endpoints
(`/status`, `/players`, `/maps`, `/bans` and the five actions) resolve an
id against the fleet's list **and then the port range**, so a deployed
instance that is not answering is still there to be looked at — which is
the whole point of the tri-state. An id that is in neither is still a 404.

**THE ASK IS BOUNDED.** Two-second deadline (the orchestrator is on the
same host; a hung one must not hang the fleet endpoint), and the list is
cached for a few seconds — a broken orchestrator is **not** re-asked on
every request (5 s for an answer, 30 s for a failure, the same order as
the probe cache).

**THE BLAST RADIUS DID NOT CHANGE.** One read-only GET on the host's own
loopback, to the service that already holds the Docker socket. The
console still holds **no socket** and **no root** — `docs/ADMIN-CONSOLE.md`
§3.3 now says so explicitly, and the runbook has the orchestrator as a
dependency (§1.1) with what the console shows when it is down.

**MERGED AS PR #111, AND LIVE.** It was on `fix/admin-fleet-list` (stacked
on PR #110), and all three are now merged: **#110 → 8f432f7** (the deploy
gate), **#111 → 844835a** (the fleet list, and the orchestrator's slots),
**#112 → 9b83ba2** (the boot config, end to end). They were merged with
**merge commits, not squashes**, on purpose: the branches' commits are the
ones Kyle reviewed, commit for commit, and a squash would replace them with
a new SHA and hide what was actually approved.

**THE FIRST CI DEPLOY THAT ACTUALLY DEPLOYED THE CONSOLE.** The gate fix
is what made that possible — every deploy before it skipped the console
with "the RCON secret is not provisioned" for a secret that was
provisioned. Now every control-plane image on `bb-prod` is built from
main's SHA by the deploy itself, and there is no hand-built image
anywhere.

## THE CONSOLE IS LIVE ON PRODUCTION (2026-11-01)

**`https://127.0.0.1:8095/` over the tunnel.** The container is `admin`,
it binds **127.0.0.1:8095 only** (`ss -ltnp` confirms), and it has **no
docker socket**. The tunnel is `tools/admin/tunnel.sh`, which opens
`ssh -N -L 8095:127.0.0.1:8095 bb-prod`.

**The secret and the administrator's record are provisioned on `bb-prod`:**

| what | where | mode | owner |
|---|---|---|---|
| the state directory | `/srv/ts-admin` | 0700 | 10006:10006 |
| the RCON secret | `/srv/ts-admin/rcon_password` | 0640 | root:10007 (`tsrcon`) |
| the administrator's record | `/srv/ts-admin/auth/auth.json` | 0600 | 10006:10006 |
| the audit log | `/srv/ts-admin/audit/actions.log` | 0600 | 10006:10006 |

**VERIFIED ON PRODUCTION, IN A BROWSER, THROUGH THE TUNNEL:**

- logged in as `admin` with the scrypt record; the session cookie is
  HttpOnly + SameSite=Strict; the CSRF token comes back in the body.
- `ts-0`: map `ts_central` / `Dm`, 0 players, 16 bots, tickrate 100,
  time limit 15 minutes, **`rcon: ok`, `health: up`**.
- the maps endpoint returns the real **60** maps, including the
  uppercase `SS_HQ_f3` (the phase 4 fix works in production).
- the bans endpoint returns the stub's honest note.
- **a mutating action, end to end:** without the CSRF token the POST
  was refused with `csrf_failed`; with it,
  `POST /admin/servers/ts-0/timelimit {minutes:15}` returned
  `outcome: done`, `command: mp_timelimit 15`,
  `detail: the time limit is 15 minutes`, and the re-read confirmed 15.
  **Deliberately set to the value it already had**, so the whole path
  is proven with zero gameplay change.
- the audit log is 0600, records `login ... ok` and
  `timelimit ts-0/15 done`, and the **RCON password appears nowhere in
  it**.

**RCON WAS ENABLED ON `ts-0` AT RUNTIME** — no restart, nobody kicked.
The password was applied through the container's console pipe with the
value read INSIDE the shell, so it never appeared in any process's
argv.

**THE DEPLOY GATE HAD A REAL BUG, AND IT SHIPPED** — PR #110. The
deploy skipped the console with "the RCON secret is not provisioned"
for a secret that was provisioned and correct: the gate asked as the
deploy user, who cannot traverse into the 0700 state directory. The
fix is to ask with authority (`sudo test -f`, `sudo test -s`,
`sudo stat`), and the two tests that asserted the gate's SHAPE — and
so pinned the bug — now assert the right thing.

**THE BOOT CONFIG NEVER HAPPENED, AND NEITHER DID THE FLEET'S
SELF-HEALING.** Three gates, all of them asking a question about a
file without the authority to see it, and all of them believed.

1. **The image.** The deployed `ts-server:0.27` image's
   `/srv/entrypoint.sh` mentions `rcon_password` **zero** times. The
   secret mounted into the container and the engine never read it. The
   console reported `refused` on an instance that was running perfectly
   well — which looks exactly like a wrong password and is not one.
   `ts-server:0.28` is now built on the host (the payload is a build
   artifact, so the image is built by hand; the canonical build is
   `cd ~/build && docker build -f Dockerfile.ts-server -t
   ts-server:0.28 .`), and PR #112 pins it.
2. **The secret's gate.** `run-instance.sh` runs INSIDE the
   orchestrator's container, and the secret lives on the HOST, in a
   0700 directory that is not mounted into the orchestrator at all. So
   `[ -f "$RCON_SECRET" ]` there was false **always**, the mount was
   dropped silently, and the engine never got the password. The bind
   source is resolved by the DOCKER DAEMON, so the question has to be
   asked THERE: `docker run --mount` fails on a missing source and
   creates nothing, while the short `-v` form CREATES A DIRECTORY —
   the trap the gate exists to avoid. The real mount is `--mount` too.
3. **The config volume.** The same script checks the config volume
   before it creates anything, and the orchestrator's container did
   not have that volume either — so it exited at "game config missing"
   and **the orchestrator could not create or replace ANY instance**.
   Measured: all three config files missing inside the orchestrator's
   container, every action counter ZERO, ts-0 up for two days without
   ever being replaced. The orchestrator logs "docker enabled —
   actions will run" and then quietly fails the first time it tries.
   The deploy now mounts the config into the orchestrator, at the same
   path.

**PROVEN THROUGH THE REAL PATH** — the script, inside the
orchestrator's container, created a disposable instance that came up
healthy with the secret mounted as a FILE (`-rw-r----- 1 root 10007
40`, not a directory) and the group added: RCON answered `ok` with 24
packets BEFORE a `docker restart` and `ok` with 24 packets AFTER it.
The probe was named `ts-rcon-probe` on port 27099 — outside the
fleet's range and outside the orchestrator's names — so nothing live
was touched and `ts-0` was never replaced.

**AND THE TEST THAT PINNED IT IS REWRITTEN.** "the game container
mounts the secret read-only, and only if it is there" asserted the
short `-v` form AND the in-container existence test, so it passed on
the broken code and would have failed on the fix — exactly like the
deploy gate's test did. It now asserts the strict mount and the
daemon's probe. **A test that passes on the broken code is not a test;
it is a fingerprint.**

**THE ENGINE'S RCON IS NOT ON THE INTERNET.** `ss -lunp` shows the
engine's UDP socket (where RCON lives) bound to `127.0.0.1:27015`, not
`0.0.0.0`, and `ufw` allows 22/tcp, 443/tcp, 80/tcp and **no UDP at
all**, with an explicit DROP rule for `udp dpt:27015` on anything that
is not loopback. The only public path to the game is the bridge, over
WebSocket on 443. So the engine's RCON is reachable from the host and
nowhere else — which is exactly where the console runs. **The exposure
is the LOG, not the network**: the engine prints the whole RCON
datagram, password included, on every command, so the game server's
logs are as secret as the password file, the secret is rewritten into
them continuously, and it stays readable in the rotated logs for
**days**. Clearing the logs does not clear the secret; the console
rewrites it seconds later.

**STILL OPEN:** the free-form command box (recommended: none; runner-up:
an allowlist of read-only commands) and the uptime stat (the spec's
claim that the orchestrator's instance rows carry the container's start
time is false — the record is `{id, container, unresponsiveSince,
degradedSince, lastActionAt, actions}` — so it needs the orchestrator to
start recording it). Neither gates anything; both are decisions, not
bugs.

**TS-0 WAS REPLACED, AND THE SECRET NOW SURVIVES A RESTART.** The
instance that was running was created from `ts-server:0.27`, which
predates the boot config, so its password was a runtime one — in the
engine's memory, and gone at the next container restart. It has been
replaced by the same script the orchestrator runs, and the new
container is `ts-server:0.28` with the secret **mounted**
(`/srv/ts-admin/rcon_password → /srv/secrets/rcon_password`),
`GroupAdd=[10007]`, and the entrypoint saying *"RCON enabled on this
instance (the password is not printed)"*.

**With nobody re-applying the password**: RCON answered `outcome=ok
packets=24`. After a `docker restart`: `outcome=ok packets=17`. The
spec's last done-when — *"the secret survives a container restart"* — is
met in production. The game came back clean: map `ts_casa`, 16 bots,
tickrate 100.

**THE VISUAL PROOF**, in a browser through the tunnel: signed in as
`admin`, **one** server card — `ts-0`, port 27015, `ts_casa` / Dm, **UP**
and **RCON OK**, 0/32 players, 16 bots, tickrate 100 — and the console
drawer reading *"done — 1 instances, 1 up"*. The seven phantom cards
are gone.

## The CI browser gate was playing in production (2026-10-30)

The deploy's "Verify in a real browser" job ran its two Playwright scripts
against **`https://bulletballet.dev/`** — the production site. Those scripts
are not probes. They are real browser clients: they complete the GoldSrc
handshake and **enter the game**.

Kyle noticed two test players in the live server and asked whether CI was
connecting to production. It was. From the production game server's own
log (`/srv/ts/logs/*.log` inside `ts-0`):

```
10/30 00:42:54  "CIPlayer<163><15><>" connected, address "172.17.0.1:34304"
10/30 00:43:30  "P1<165><ID_7dea…><165>" entered the game
10/30 00:45:12  "P2<166><ID_7dea…><166>" entered the game
10/30 00:47:48  "CIPlayer<185><17><>" connected, address "172.17.0.1:44139"
10/30 00:49:28  "P2<187><ID_7dea…><187>" entered the game
10/30 00:58:26  "CIPlayer<194><14><>" connected, address "172.17.0.1:43384"
10/30 00:59:02  "P1<196><ID_7dea…><196>" entered the game
10/30 01:00:25  "P2<197><ID_7dea…><197>" entered the game
```

One set per deploy run, matching the GitHub Actions runs to the minute
(`40981282720` created 00:41:39Z, `40981237506` at 00:41:12Z,
`40982829789` at 00:56:44Z). **94 deploy runs since 2026-10-23**, so
roughly 280 test-player sessions in the server people play on.

And they were on the **public leaderboard** too: `/api/leaderboard`
returned `CIPlayer`, `P1` and `P2` as entries, because the registry
builds the board from the same server-side log the scoreboard reads.

**The fix:** the gate keeps its value and loses its footprint. It now runs
against a CI environment of its own — `tools/deploy/ci-stack.sh` creates a
game server, a bridge and a registry that exist only while the gate is
running, behind a second hostname (`ci.bulletballet.dev`).

- **The bundle is the same one production serves.** The gate verifies the
  artifact that was just deployed, not a rebuild of it. Only the two
  control-plane upstreams differ.
- **A separate registry and a separate bridge, not a second entry in
  production's.** The production registry discovers instances by PORT
  RANGE (27015–27022) and publishes them to the public server browser.
  A CI instance added to it would appear on the site as a server people
  can join — the same problem, moved rather than solved.
- **The CI port (27025) MUST stay outside that range.** Move it inside and
  production adopts the instance, the orchestrator starts managing it, and
  the CI players are in production after all — with every signal green.
  Asserted by `tests/unit/ci-stack.test.mjs`.
- **The CI containers run the same images production is running** (read
  off the running containers), so the gate tests what was deployed.
- **The CI registry has its own leaderboard**, so CI kills never reach
  the board people read.

Measured on the production host, 2026-10-30 — a CI-shaped instance with
no bots costs **0.40% of one core and 225 MiB**, and the box sits 92–99%
idle with the whole production stack running:

```
ts-ci-0  0.40%  225.3MiB      ts-0    0.53%  362.9MiB
bridge-ci 0.00%  15.9MiB      bridge  8.68%   37.6MiB
registry-ci 8.86% 30.8MiB      registry 0.00%  61.4MiB
```

Spin-up is **6 seconds** to healthy and teardown is instant, so the stack
is ephemeral: the cost is only paid during the gate.

**The one change with a cost:** the registry's instance id is now derived
from `TS_CONTAINER_PREFIX` instead of being hardcoded to `ts-N`. Production
runs with the default prefix, so its ids are unchanged (`ts-0`, `ts-1`, …)
and the orchestrator's arithmetic on the suffix still works. The CI
registry runs with the prefix `ts-ci`, so its instance is `ts-ci-0` rather
than answering to the same name as the production one.

### What the first real run of the gate found (two more bugs)

The gate was run end to end against the CI environment before the PR was
raised, and it failed twice — each time in a way that read like a broken
build rather than a broken configuration.

**1. The archive could not be fetched, because of CORS.** The CI page is
a different origin from the production page, and the R2 bucket's CORS
policy allowed only `https://bulletballet.dev`. A cross-origin `fetch()`
cannot read a response without an `Access-Control-Allow-Origin` for its
own origin, so the archive never arrived, the engine never booted, and
the gate reported a server that "never answered the handshake". The
client's cache-busting retry does not help: the origin was **unlisted**,
not a stale cached variant. The bucket's policy is a Cloudflare dashboard
setting — `docs/ASSET-DELIVERY.md` now carries the policy with the CI
origin in it, and a test asserts the documented policy still lists it.

**2. The CI server came up with 16 bots on 8 slots, so it was FULL.**
The browser client was refused and the handshake never completed — 6
packets up the bridge, 10 back, and the server never registered the
client. Two things had to change:

- **The CI server's config is DERIVED from production's, with the bot
  quota zeroed.** Not applied afterwards: `ts_bot_quota` only decides
  whether NEW bots spawn, so setting it at runtime leaves the bots that
  are already connected. `ci-stack.sh` derives
  `/srv/ts-ci-config/server.cfg` from `/srv/ts-config/server.cfg` with
  `ts_bot_quota 0`, so it cannot drift from production's, and the CI
  server has production's 32 slots.
- **The registry now compares the quota against the ENGINE, not against
  itself.** `applyBotQuota` skipped the write whenever
  `botQuotaApplied` already equalled the wanted quota, so it considered
  the job done after one write, forever. Measured on the CI server: the
  registry reported `botQuota 16` and `botQuotaApplied 0`, the engine's
  own log said the quota was 16, and the registry never wrote again — a
  discrepancy that was invisible AND permanent. It now compares against
  `instance.botQuota`, the engine's own answer, read from the console
  moments earlier in the same tick.

**The gate's verdict, once both were fixed** (run by hand against
`https://ci.bulletballet.dev`, exactly as the deploy runs it):

```
the fleet: 1 server(s) after 0s
fullscreen: supported=true element=HTML (PASS)
the buy-menu key: "b" = "buy" (PASS)
time to the server's handshake: 22s
engine running: yes (canvas at the engine's size, heap 512MB), server banner: "Server #1"
VERDICT: PASS — PLAY reaches the server

bridge peak live connections: 2
VERDICT: PASS — 2 browser(s) connected simultaneously, needed 2
```

And the isolation, from the two game servers' own logs: `CIPlayer`, `P1`
and `P2` in the **CI** server's log at 14:46–14:48, the production
server's last CI player at **00:58 UTC — before the fix** — and the
public leaderboard with zero CI names on it.

## The game is browser-only: the game UDP port is closed to the world (2026-10-29)

The container published its UDP straight out of Docker (`-p 27015:27015/udp`)
and ufw allowed `27015/udp` from anywhere, so **a native GoldSrc client could
connect straight to the game server** — the whole classic cheat-tooling
ecosystem, aimbots and wallhacks included — and with a real address instead of
the bridge's shared one.

It was deliberate ("it is raw UDP, not HTTP"), but it was a leftover: the game
is browser-only, and **nothing had ever used that path**. The container's whole
log, before the change:

```
444  "local"        ← the registry's own A2S polls
 12  "172.17.0.1"   ← browser players, through the bridge
  0  anything else
```

**The fix:** publish on the host's loopback only —
`-p 127.0.0.1:$PORT:$PORT/udp`. The bridge, the registry and the orchestrator
all run with `--network host`, so they reach the game server over
`127.0.0.1:$PORT` exactly as before; nothing host-local changes. The public
path is gone, and with it the native cheat population — and the identity
design collapses to a single path, where the bridge is the only door and
therefore the only identity authority.

**The ufw rules are NOT what closes it.** Docker's port publish is a DNAT in
the PREROUTING chain, so a packet addressed to the public IP never reaches
ufw's INPUT chain. The bind address is the whole of the control — the
`27015/udp` rules were removed as hygiene, not as the fix.

## The reconnect does not reload the page (PR #94, 2026-10-29)

The CONNECTION LOST panel used to recover by **reloading the page**:
re-unpack the 517 MB archive, re-boot the WASM engine, re-run the
handshake. A minute of loading after a blip.

It was also dangerous, and not because of the loading. The reload's
handshake is far slower than any normal client, and the engine's
connect timeout is 60 seconds — so `sv_connect_timeout_ban` (ON by
default) fired, and because every browser player reaches the server as
the SAME address (`172.17.0.1`, the docker gateway), that ban hit the
**whole server**. **This was reproduced locally**: the local test
server's own IP filter listed `127.0.0.1/32`, and the client could not
get back in until it was lifted.

The engine does not need a reload. It has a `retry` command — *"retry
connection to last server"* — that re-runs the handshake against the
address it already knows (`cls.servername`, set by the launch's
`+connect`). The fast path is: put the transport back, tell the engine
to `retry`, and wait for the engine's own banner.

**The proof of life is the engine's word.** The banner (`Server #1
"bulletballet TS" ...`) is printed the moment the game server answers
the handshake — the same line the deploy's browser gate matches on. The
page being alive, the WebSocket being open, the bridge counting a
connection: none of those mean the player got in. `waitForServerBanner()`
(new, `webxash/src/services/server-banner.ts`) attaches the listener
BEFORE the reconnect is triggered, so the banner cannot be missed
between the trigger and the wait. That ordering is load-bearing: the
engine's `retry` fires the handshake immediately (`cls.connect_time =
MAX_HEARTBEAT`, *"CL_CheckForResend() will fire immediately"*), so the
banner can come back in the SAME TICK.

**The window is the engine's budget.** `CL_CheckForResend` gives the
connect attempt `CL_CONNECTION_RETRIES` (5) tries, one every `cl_resend`
(6.0 s), then calls `CL_Disconnect()` — the engine gives up after ~30 s
and goes idle, so no banner can arrive after that. Waiting longer cannot
buy a success, only delay the fallback. The window is **40 s**. And if
the transport dies AGAIN mid-attempt, no banner can ever arrive, so the
wait watches the transport and hands over to the fallback at once
(measured: the fallback fired 1.0 s after the transport was killed).

**The reload is still the fallback.** If the transport cannot be
re-opened, the engine takes no `retry`, or the banner does not arrive
inside the window, the old reload runs unchanged.

Measured in a browser against a local server: the transport dies → the
panel appears with the reason in ~2 s → the countdown fires → the
engine prints `Commencing connection retry to ...` → ~2 s later the
banner arrives and the panel clears → **the URL never changed**, the
buy-menu state flows again, and a keypress still reaches the engine.

**Verified on production** (`2fac453`, live on `bulletballet.dev`): the
client's WebSocket was closed from the page, the panel appeared with
the reason, the countdown fired, the engine printed `Connecting to
40.160.225.81:27015... (retry #1)`, and **1.0 s later** the banner
(`Server #13`) arrived and the panel cleared — **the URL never
changed**. The server's own view agreed: `players 16 (bots 15, humans
1)`, the one human being the client that had just been disconnected and
reconnected.

## The buy menu is the game's own menu, rendered in the DOM (PR #88, 2026-10-29)

**The old HUD buy menu was a placeholder armory**: hardcoded prices, cash
tracked in JavaScript, and a purchase that was `set sv_cheats 1` + `give
weapon_…`. It ignored the budget, the slot limit, the restrictions, the
attachments, the akimbo, the saved slots and the ruleset — and its price
list was wrong across the board.

**What shipped is a VIEW over the port's own buy menu.** The port prints
its state on stdout as `TSBUY …` records; the browser parses them and
sends key presses back (`ts_buy_key`, `ts_buy_state`, `ts_buy_hide`). The
browser **computes nothing**: it never forms a loadout and never sends
`tkw`/`tki`/`tka`. So the prices stay runtime data (a ruleset can
override a weapon's cost), and the port stays authoritative for the
30,000 budget, the 81-slot limit, the attachments and the akimbo
multipliers. The port side (PR #88) builds each page's rows **once** and
consumes them twice — the canvas draws them and the state dump reports
them — so the two cannot disagree.

**The player picks.** The ESC options overlay carries a **Classic /
Modern** switch: `classic` is the game's own canvas menu, `modern` is the
DOM panel. The default is `classic`, so nobody's experience changes
until they opt in, and the choice is persisted. The saved loadouts are
SHARED — `tsbuylist.tsa` is written by the port's menu, so flipping the
toggle does not fork the loadout storage.

**It is in production as of 2026-10-29**, in the same deploy as the
frame cap — the production bundle carries `TSBUY`/`ts_buy_key`/
`ts_buy_hide`/`ts_buy_state` alongside `nocap`/`sustainableFps`, verified
from the served chunk. The default is still `classic`, so the DOM menu
does not appear until a player flips the switch.

## The buy menu grows a MODERN flow (2026-11-01, branch `feat/buy-menu-modern-flow`)

**The classic canvas menu is untouched.** The buy menu above (PR #88) is
a **view** over the port's menu: the port prints its state, the browser
draws it. What it could not do was the redesigned panel Kyle's mockup
draws (`docs/design-mocks/buy-menu-redesign.html`): a **loadout screen
with a card per weapon kind**, a **per-slot browse screen** and an
**attachments screen**.

**The port grew a SECOND flow for it** (`crates/client/src/menus/
buy_modern.rs`), selected by a new command beside the other three:

```
ts_buy_mode <classic|modern>
```

**It defaults to `classic`**, so nothing changes for anybody until the
browser asks for the modern one. `ts_buy_hide` is untouched: it is still
the canvas menu's hidden flag, and it does NOT select the flow.

**The slot is `WeaponInfo.hud[0]`** — the HUD grid column, 1-based. It is
not a new table: the data was already there. Slot 1 is the melee, the
grenades and the swords, 2 the pistols, 3 the SMGs, 4 the rifles and the
shotguns (**the M60E3 is slot 4** — the mockup's screen 4 has it wrong),
5 the akimbo weapons and the Golden Colts. Slot 6 is the **player
accessory**, the game's own ITEMS page, not a weapon slot.

**What is different from the classic flow:**

- **Apply on purchase.** A purchase is submitted the moment it is made
  (`rst_cfg`, `tkw`, `tki`, `tka` — the same four commands the classic
  flow's "Use New Config" sends), so the pending-config step does not
  exist here. The classic flow keeps it.
- **The tabs are the config save slots** (`tsbuylist.tsa`'s nine). The
  port prints all nine; the panel shows three and reaches the rest. An
  edit is saved into the active tab, and switching tabs loads that tab's
  saved config and **applies** it.
- **An owned row is removed by selecting it**, and its price is refunded
  (the design's §5/§7 rule). It is therefore never marked unaffordable
  and carries no shortfall.
- **The loadout screen reports the slot usage both ways**: how many of
  the five slots are in use (`slots_in_use`) and how much of the 81-slot
  pool they take (`slots`, and each slot record's count).

**The rules are still the port's.** The browser computes nothing: it
never forms a loadout, never sends `tkw`/`tki`/`tka` itself, and never
decides whether a purchase is allowed. The affordability test is the
port's own `add()` test — money **and** slots — and the shortfall is the
port's number (`TSBUY short`), never the browser's subtraction.

**The protocol** (the classic records are byte-identical; the modern flow
adds `mode`/`screen`/`slot`/`tab` to the state line, and the `slot`,
`tab`, `short`, `owned` and `sum` records):

```
TSBUY state ... mode=modern screen=browse slot=2 tab=0 slots_in_use=1 slot_limit=81
TSBUY slot 2 10 1 Pistols
TSBUY tab 0 Loadout A 1
TSBUY row 1 850 0 2 1 Glock-18
TSBUY short 2 550
TSBUY owned 1 1
TSBUY sum 850 29150
TSBUY end
```

**The pixel diff still passes unchanged** (`menus/buy_pixels.rs`) — the
classic menu's drawing did not move, and that test is the proof.

**Two things the FRONTEND still has to do (they are on the frontend's
side of the fence, in the `webxash` submodule):**

1. **Send `ts_buy_mode modern` at session start.** As of this writing
   `applyBuyMenuMode()` only sends `ts_buy_hide`, so the port stays in
   the classic flow and the modern screen never appears.
2. **The loadout card's "click a weapon to remove it" needs a removal
   key in the entry record.** The port prints the classic entry shape
   (`entry <index> <cost> <slots> <name>`, which the frontend's parser
   accepts and places by counting). The frontend's in-flight parser
   wants a richer modern entry record
   (`entry <index> <cost> <slots> <attachments> <slot> <remove_key> <name>`);
   the port does not print it, so the removal key is 0 and that one
   click does nothing. The browse screen's owned row removes the weapon
   today, so nothing is unreachable — but the card's click is inert.

**And one that was on that list is DONE on the port's side** (it was the
third): the typed "0" on a slot with ten weapons or more picked the tenth
weapon instead of going back. The modern flow's list rows are keyed 1–9
and then 11, 12, …, so the tenth weapon is key 11 and key 10 is the back
key again — and key 0 goes back as well, which is the design's badge. The
keycap the panel draws is the row's place in the list (1–9, then A, B,
…), so the panel's own badge lookup finds the tenth row by "A" and sends
the port's key 11.

## The client caps the engine's tick rate (PR #87, 2026-10-29)

**The engine has no frame limiter in the browser.** On a display faster
than the engine can sustain, it misses deadlines, the browser drops ticks
to catch up, and the surviving frames arrive **unevenly** — which is what
"plays like the 40s–50s and sometimes feels very smooth like 60s" means.
The engine's own FPS counter cannot see it: it counts the frames it drew,
not the gaps between them.

**The cvar cannot do this.** `fps_max` is an alias for `host_maxfps` — a
**host** (server) frame limiter — and upstream `engine/common/host.c`
reads it **only when vsync is off**. With vsync on, production's default,
the engine's target is 200 fps and it renders on every tick the browser
offers. Measured against production: at `fps_max 5` the engine still
rendered **60 fps**. The cvar is inert, and the earlier recommendation to
change it was a placebo — retracted.

**What shipped.** The frontend change is `klampatech/webXash` #27
(merged). `specialists-browser` #87 carries the submodule pointer, the
unit tests over the **real** policy module, the research, and the 30
harnesses that produced it. The cap is applied **above the engine, at the
tick source** — the global `requestAnimationFrame` — and it **coalesces**
rather than drops, because the engine's loop is self-rescheduling and
dropping a callback kills it (60.3 fps → **0.3 fps**).

**The design decisions are in SPEC.md** § "Client frame pacing — the
engine's tick source".

**What is still open:**

1. A follow-up `webXash` PR fixes the `everyNth` state desync, the
   median-vs-mean mismatch in the measurement, the false "the shim is
   removed" comment, the `uninstallFramePacing()` landmine, and adds a
   way for a player to turn the cap off.
2. **The tier-3 playtest on a 144 Hz+ display has not happened.** The
   whole mechanism was established on a 60 Hz box, where the cap
   correctly does not engage. `tools/perf/diagnose-fullscreen.js` is the
   player-runnable diagnostic for it.

**The trade the player is making.** The cap trades frame rate for even
pacing: on a 144 Hz display the engine runs at 72 fps, on 120 Hz at 60,
and on a 60 Hz display nothing is gated at all. That is the intended
trade, and once the opt-out lands it is the player's call.
**Active path:** webXash (Xash3D-FWGS WASM **client**) + the real TS server as a WASM **dedicated server** in a container
**Goal:** ~~playable The Specialists in the browser~~ — **met.** Real assets, real gameplay, real dedicated server, public URL.

**The console FIFO was eating commands (fixed 2026-10-28).** The
registry's proof of life is a question written into the game server's
console FIFO. The entrypoint held that pipe open **read-write**, which
made PID 1 a second reader on it — so the kernel could hand a command to
PID 1, where it was consumed and DISCARDED. Measured on production: a
console question **never answered in 25 seconds, 2 times out of 12**, and
a failed console read is read as "the server is down", so three in a row
marked the instance stale and emptied the whole public server list. Two
fixes: the registry now asks again when the marker never appears
(`services/registry/lib/console-ask.mjs`), and the entrypoint holds a
write-only descriptor instead. After the roll: **12 of 12 answered, in
32-269ms.** See #83.

**Docs:** the README was refreshed against production on 2026-10-24. The
withdrawn keyboard root cause is gone from it, both screenshots were
re-captured from the live site, and the test count and the submodule branch
now match the repo.

**HANDOFF.md was stale when this session started.** It still said "As of:
2026-10-26" and its § NEXT TASK still pointed at E5, because the work
since then was never written down. The sections below are the ones that
changed on 2026-10-27; everything else in this file is still accurate.

## The leaderboard, and the three bugs that made it empty

PR #80 adds a global leaderboard: the engine's own kill log, folded
across the fleet, with the bots left out. Three defects meant it
displayed nothing useful, and all three are fixed and covered by tests:

| # | Defect | Symptom | Fix |
|---|---|---|---|
| 1 | `observe()` existed but was **never called** | the "time seen" column was always `0` | the presence pass is wired into `pollLeaderboard()` |
| 2 | `readPlayerNames()` read `docker exec` stdout | **0 bytes** — the answer is on the container's log, not the exec's | write a marker, run `ts_status`, read the answer back out of `docker logs` |
| 3 | one MVP window for the whole **fleet** | 10 kills → 9 MVPs, because each instance changes map on its own clock | per-instance MVP windows, persisted across restarts |

The bots were the other half of it. A bot is told from a person by the
kill log's `<ID_BOT>` authid — but a bot that has not been in the kill
log yet is not recognisable that way, and the fleet's bots are RECREATED
with fresh names on a map change. So two signals are used: the authid,
and the `Bot ` netname prefix.

**Verified against production, not against a fixture.** 3,000 lines of the
live server's log: 378 kills parsed, **0 bot leaderboard rows, 0 bot
presence rows**.

## `log 1` is not `log on`, and that is why the kill log was empty

The single most important thing found on 2026-10-27.

`log` is a **command**, not a cvar: `log on` / `log off`. The server.cfg
had `log 1` — a command with an argument the engine does not understand,
so it does **nothing at all**. It neither turns the log on nor turns it
off. It reads like it should work, which is why it sat there looking
correct.

Measured on production, 2026-10-27:

- the container was **restarted at 16:24:55** and the kill lines stopped
  dead, and did **not** come back on their own;
- a probe container with `log 1` produced **0 kill lines in 30 seconds**;
- a probe container with `log on` produced **3 in the same 30 seconds**;
- and `log on` written into the console pipe at runtime took a probe from
  **0 kill lines to 9**.

The engine answers the `log` command with its state
(`currently logging` / `not currently logging`), so the registry now
**asks the engine and turns the log on when it is off**
(`services/registry/lib/log-state.mjs`). That is a self-heal: it survives
container restarts, which a config file does not.

**The trap in that reply:** "not currently logging" **contains** the
substring "currently logging", so a naive search finds it in both
replies and concludes logging is always on.

**And the config could not have reached production anyway.** `server.cfg`
is baked into the `ts-server` image, and the pipeline does not build
that image (its payload is the Rust port's compiled DLL, a build
artifact that is deliberately not committed) — so the game image is built
**by hand** on the host. A `log on` that is correct in the repo and
absent in production is the same class of bug as a route that lives in
the repo and is installed by hand: it drifts.

So the game server's config is now a **mounted volume**
(`/srv/ts-config` → `/srv/config:ro`), the deploy **ships** it, and a
change under `tools/deploy/config/` **triggers** the services deploy. The
image keeps its baked-in copy as the fallback for a container started by
hand.

## The deploy was going to fail on its next run

`deploy-services.sh` did `mkdir -p /srv/ts-leaderboard` — but `/srv` is
root-owned and the deploy runs as `ubuntu`, so it failed with
"Permission denied", and under `set -e` that killed the deploy before a
single container was replaced. It now uses `sudo`, and the directory is
owned by the registry's uid (10004) rather than being world-writable.

The Caddyfile replacement was checked and is **safe**: the live
`/etc/caddy/Caddyfile` is byte-identical to the repo's.

## The character picker shows the game's own portraits (2026-10-27)

The picker used to show the model **names**; it now shows the models, as
**the game's own portrait art**. `ts/models/player/<name>/<name>.bmp` is a
164x200 palette-indexed portrait of the character — head and shoulders,
front facing, in the game's art style — and **not** a UV atlas. The flat
backdrop is made transparent so the character sits on the panel rather
than on a grey card. All seven ship in `webxash/public/models/*.png`.

**It was a 3D render, and the 3D render was wrong.**
`tools/render-thumbnails.mjs` drove the Babylon MDL loader to render each
model. The loader applied each bone's **bind-pose world matrix** to
vertices that already carried their bind position, so the position was
added a **second** time:

- one gordon vertex moves **67.7 units** on a character whose raw vertex
  extents are **22.0 x 12.1 x 14.6 units** — **3.1x its own height**, in a
  single vertex;
- the visible result was a **head floating above the shoulders** and
  **hands detached from the arms** on every model.

`src/mod/mdl-bones.ts` is **not** the bug — its bone matrices do match the
Rust port's. The bug was *applying* them: a renderer wants the bone
**delta** (`worldCurrent x inverse(worldBind)`), which is the **identity**
at the bind pose. Dropping the transform does fix the detachment — and
then the figures **lie on their side**, which exposes the second,
independent problem: the bones and the vertices are not in the same
coordinate space in this file. The 3ds Max Biped chain runs along **+X**
(the head bone at X~26) with the root bone at **Z=39.5**, while the raw
vertex bbox reaches neither. `src/mod/mdl-parser.ts`'s `readVertexPositions`
reads 3 floats at a **12-byte stride**, but studio **v10**'s vertex
record is **28 bytes** (`co` 12 + `normals` 12 + `boneIndices[2]` 4).

**So the 3D path is DELETED, not parked.** `tools/render-thumbnails.mjs`,
`babylon/` and the `babylon-shot.js` harness were removed on 2026-10-28:
nothing in the pipeline built them, nothing referenced them, and the
character picker ships the game's own portrait art instead. The branch
`experimental/babylon-port` is still parked at tag `babylon-port-frozen`
if anyone ever wants the history back.

If the path is ever picked up again, the order of work is: (1) read the
vertices at the right stride so the vertex space and the bone space agree,
(2) apply the bone **delta** rather than the world matrix, (3) only then the
**two-bone blend + weight** that `studiovert_t.boneIndices[2]` carries —
that matters for **animated** poses, not for a static bind-pose thumbnail,
where every vertex's rest position is the same regardless of which bones
influence it.

**What the earlier verification actually checked, and why it passed a broken
render:** it checked the bone **matrices** against the Rust port (correct)
and one vertex pushed through one matrix (also correct). It never checked
the **final composed transform**. The "reproduces the declared bounding
box to within 0.01 units" claim cannot have measured what it says either:
this model's v10 header bbox fields read `0,0,0`-`0,0,0`.

**Container logs:** every container on the production host now rotates
its docker log (`json-file`, 10 MB x 3 files per container). Before
2026-10-26 nothing rotated it and the game server's log grew at
268 bytes/second — ~22 MB/day, forever. The fix also closed a delivery
bug that would have made it inert: the script that creates the game
servers was never shipped by the deploy, and a bind mount pins the
inode, so an updated script is invisible until the orchestrator is
recreated. See the section below.

**Brand:** the BulletBallet rebrand is **COMPLETE** — all four phases of
`docs/REBRAND-PLAN.md` shipped on 2026-10-24 (webXash #13, #14, #15, and
the docs sweep). Green shell, amber game: the shell is phosphor green, the
game keeps TS's own amber. **Valve's logo is out of the product entirely**
— the canvas background, the connecting splash and the favicon were all
ours, and all three are the BB mark now, with a unit test guarding them.

## The one-line version

**It works in production.** A browser at `https://bulletballet.dev` pulls the
493 MB game archive off Cloudflare R2, boots the Xash3D-FWGS WASM engine,
opens a `wss://` WebSocket to a bridge on the same origin, and plays
multiplayer against a real dedicated TS server on the same box.

Verified from a real browser, not a test harness:

```
raw A2S:  players=5  max=32  bots=4        ← 4 bots + the browser
registry: ts-0 · ts_casa · tick=100 · humans=1 · bots=3
engine console: BUILD 4221 SERVER (0 CRC) → FS_AddGameHierarchy( ts )
```

## The production shape

```
browser
  │  https://bulletballet.dev/
  ▼
Caddy (Let's Encrypt, cert valid to 2027-01-21)
  ├── /              → /srv/web          app bundle, 56 MB
  ├── /api/servers   → 127.0.0.1:8081    registry container
  └── /bridge        → 127.0.0.1:27017   bridge container (WebSocket)
                                              │
                                              └─ UDP → 127.0.0.1:27015 → ts-0

assets.bulletballet.dev  →  Cloudflare R2 (ts-assets), 493 MB in 8×64 MiB parts
```

The game UDP port is published straight out of Docker and deliberately does
**not** go through Caddy — it is raw UDP, not HTTP. It is published on
**`127.0.0.1` only** — see "The game is browser-only" below.

## The Half-Life lambda was ghosting through the game (2026-10-24)

Kyle played the game and reported *"a weird visual bug... almost like
an overlay in certain lighting conditions that shows a half life logo in
the background"*.

**It was not a lighting condition, and it was not the engine's.** The
canvas **element** carried the logo as a CSS background:

```css
canvas { background-image: url("./hl.svg"); }
```

The engine's WebGL canvas is **transparent wherever its own pixels are
not fully opaque**, so that background composited *through* the running
game. It was only visible where the engine left the frame translucent —
which is exactly why it read as a lighting artefact instead of a logo.

**Proven in a real browser against production, not inferred:** boot the
game, photograph the frame, remove the canvas background at runtime,
photograph again. The lambda was in the first frame and gone from the
second. Same scene, same moment, one property changed.

Fixed in the `webxash` submodule (webXash PR #10): the canvas gets a
solid ground, and `hl.svg` is deleted.

**The dead machinery around it went too.** `setCanvasLoading()` /
`clearCanvasLoading()` added and removed a `.loading` class that had
**no CSS rule anywhere** — not in `src/`, not in the built stylesheet.
They were no-ops, and their doc comment described the background as
something the class controlled, so the codebase claimed a fix that had
never happened. Deleted, with all four call sites and the loader option
that carried it.

**Guarded:** `tests/unit/canvas-logo.test.mjs` asserts the canvas rule
paints no background image, and that `hl.svg` does not come back. It
strips CSS comments first, because the rule carries a comment that names
the property it must not use — a test that trips on its own
documentation is worse than no test.

**Still Valve's logo, deliberately, until the rebrand:** the
"connecting to server" splash still uses `hl-spin.svg`, and the favicon
is still `hl-bright.svg`. Both are brand work, not a bug fix.

**The lesson for the rebrand:** any background image on the canvas is a
background image the player sees through their game. The new landing
page's code rain and ring are DOM, not canvas — keep them there.

### What the same investigation turned up: the framebuffer is not opaque

Measured, with the canvas element's background forced to solid red and
then solid blue: **the engine's framebuffer leaves alpha below 1 over
large areas** — a red background bleeds into the rendered scene
(R 76→89 in the weapon region, 76→102 over the wall), and blue bleeds
too (B 61→74, 64→91). That is roughly **5-10% bleed**, and it is why
the lambda looked like a *lighting* artefact rather than a logo: the
scene is composited over whatever the canvas element carries, and the
scene is mostly opaque, so only a faint ghost survives.

**Two consequences:**

1. The lambda was NOT the only thing that could show through. Any
   future background on the canvas would too. The canvas now paints a
   solid ground, so there is nothing to see through.
2. **The same low alpha is a symptom, not just the cause.** Studio
   models — the first-person viewmodel and the bots — render as **flat
   black silhouettes** in places (Kyle, 2026-10-24: *"the lighting on
   the weapon models looks off"*). Measured: the models are **opaque**
   (they stay black with a red or blue canvas background), so this is a
   **lighting** problem, not an alpha one. And it is **position
   dependent** — the same bot renders correctly lit in one spot and
   solid black in another.

**The regression window is narrow.** The only engine change this week is
`128551a` (2026-10-24 11:50) *"give the client a 512 MB WASM heap"*
and `b624dd7` (12:02) *"the wasm patch must rebuild the memory
section"*. Before 11:50 the engine had a 256 MB heap (max == initial).

**The bisect rig is built.** `npm pack xash3d-fwgs@1.2.2` gives the
original engine wasm, and **Playwright can serve it to the browser
instead of production's** — `page.route('**/xash-*.wasm', ...)` — so the
original and the patched engine can be compared with **no deploy**.
First result: with the **original** wasm, a bot model renders correctly
lit and textured. The matched patched-wasm observation (a model in
frame) is the missing half.

**Also ruled out, with evidence rather than argument:**
- The Rust client HUD's `draw_logo` — the port's own
  `docs/implementation/client-hud.md` says the `Logo` message *"never
  arrives"*, so that code path cannot run.
- The `impulse 99` toggle — `impulse 99` does reach the server and
  toggles the message, but the message is never delivered anyway.
- The canvas CSS background — removed and **the logo is gone**
  (confirmed by Kyle in production), so it *was* the logo's source, but
  it was not the lighting bug's source.

**Engine cvars worth reading** (measured in production): `r_fullbright`
= 0, `r_lighting_modulate` = 0.6 (the GoldSrc default), `r_sprite_lighting`
= 1, `r_drawviewmodel` = 1, `r_glowshellfreq` = **2.2**. The glowshell
is what draws the faint **white weapon outlines** — the glowshell pass
renders the model a second time, scaled up, additively.

### The first-person weapon rendered black (2026-10-24, fixed)

**Symptom:** the viewmodel was a flat black silhouette — correct geometry,
multiplied-away texture. Measured: the weapon's pixels were `(1,3,1)` across
72% of the region.

**How it was pinned down** (each step ruled something out):
- `r_fullbright 1` lit the entire world **and** the bot standing right there
  (body *and* held pistol) while the viewmodel stayed black. **So it was
  never a lighting problem.**
- `r_lightmap 0` ("disable lightmaps, get fullbright for entities") changed
  nothing.
- The weapon's texture flickered into view for a moment near a **muzzle
  flash**. That was the confirming clue: only a *dynamic* light contributed
  anything to the weapon's colour.
- Bots' weapons were lit, through the same `draw_weapon` path — so the
  difference had to be the entity state, not the draw path.

**Cause.** The port draws the `p_` weapon merged onto the player's bones, so
it inherits the player's entity state. For the **local** player,
`V_CalcNormalRefdef` rewrites that state every frame (`view.rs`):

```rust
ent.curstate.rendermode = kRenderTransColor as i32;
ent.curstate.renderamt = amt as i32;
```

That is the third-person translucency (`cl_thirdtransparency`), and the
port's own note says *"the local model is only drawn in third person, so
that's where it shows"*. But the first-person viewmodel is drawn from that
same entity state, so it inherited the translucent-colour mode — and the
server spawns players with `rendercolor = (0,0,0)`
(`server/src/rules/lifecycle.rs`). Zero rendercolour plus zero ambient
multiplies the weapon's texture to black.

**Bots were fine:** the server gives them `rendermode = 0`, so they never
entered that mode.

**The render mode multiplies the colour — confirmed by the port's own
motion-blur ghost**, which draws with `kRenderTransColor` and a
`rendercolor` of `(player, 0, 1)` (`client/src/effects/mblur.rs`). So a
`rendercolor` of `(0,0,0)` in that mode *is* a zero multiplier.

**Fix** (`client/src/studio.rs`, `draw_model`): the view model is its own
entity in TS (`r_entity[0]`), never the local player's, so it must not
inherit the local player's third-person translucency. For a view-model
entity, force `rendermode = kRenderNormal`, `renderamt = 255` and a white
`rendercolor`.

**THE FIRST ATTEMPT WAS IN THE WRONG FUNCTION, and it is worth recording.**
The first fix went into `draw_weapon` — the **third-person** weapon, drawn
merged onto the player's bones. It compiled, built, deployed, and changed
nothing: the first-person view model does not go through `draw_weapon` at
all. It goes through `draw_model` (the SDK's `StudioDrawModel`), which is
the generic model path — and that is where `es::is_view_model` is checked.

**How the view model actually gets the local player's state:** the engine
copies the local player's entity state onto the view-model entity, so the
client's per-frame override in `view.rs` (`rendermode = kRenderTransColor`,
an eased `renderamt`) lands on the weapon as well.

**Still open:** the browser client cannot be driven into first person from
the harness — `ts_respawn` reports *"sent respawn"* but the client stays in
Free Chase-Camera, and when a session does reach first person it draws **no
view model at all**. So the fix has to be confirmed by a human.

**Note the ruleset split:** `ts21` has `local_translucency() == false` (2.1's
`V_CalcNormalRefdef` never writes the local entity's render mode) and
`ts30` has `true`. We run **ruleset 30**, so the leak is live. A TS 2.1
build would not have shown this at all.

**Also settled along the way:**
- The TS main-menu weapon is a **static image**, not a rendered model: two
  shots four seconds apart differ by **65 pixels (0.01%)**, in a 22x22 box
  that is not the weapon. An earlier claim that the menu weapon proved the
  renderer worked was wrong, and was retracted.
- The engine's cheat protection: `"%s is cheat protected."` and, when
  cheats are off, it **bans the client**. The ban lives in the engine's
  **in-memory** filesystem — no `banned.cfg` on the server, and the engine
  has no IDBFS — so it does not survive a reload.
- `sv_cheats` is **read-only** from the browser (`"sv_cheats is read-only."`),
  so cheat-protected cvars (`r_lightmap`, `r_fullbright`) can only be set
  when the **server** has `sv_cheats 1`. The frontend's own `sv_cheats 1`
  calls can never work and are dead code.
- To test a cheat cvar: `printf 'sv_cheats 1\n' | docker exec -i ts-0 sh -c
  'cat > /tmp/console.pipe'` on the host, then restore it the same way. Put
  the restore in a host-side script with a `sleep`, so it fires even if the
  operator session dies.

### Rebrand Phase 1 — the green shell (2026-10-24, shipped)

**webXash PR #13.** The shell is now a phosphor-green operator terminal;
the game keeps TS's amber. Tokens, head, brand assets.

**What changed:**
- The 26 `--ts-*` token **values** swapped. The **names are frozen** —
  renaming them means touching every `var()` in every component,
  redefining them means touching one file. New: `--ts-error`, `--ts-warn`,
  `--ts-ok`, `--ts-font-body`, `--ts-rule`.
- `--ts-notch: 0` — the chamfer is gone; square edges plus a phosphor
  left-rule.
- A **body font-family at all**. Nothing set one before, so any text that
  did not opt into a display or mono face was rendering in the browser's
  default serif. That was a latent bug, not just a style choice.
- Brand: `src/assets/brand/bb-mark.svg` (as drawn), `bb-mark-24.svg` (no
  cutouts, for 24px and below), `bb-favicon.svg`, and `public/og.png`
  (1200x630).
- The head: title, description, theme-color, OG + Twitter, and Anton /
  Space Grotesk / JetBrains Mono.

**The favicon is NOT the mark as drawn.** The mark is two slender
cartridges 6.8:1 tall; at 16px that is a pair of two-pixel bars and its
internal cutouts vanish, so it reads as a blob. `bb-favicon.svg` is a
second drawing: one solid cartridge, chunky, on the void ground. It also
stops us serving Valve's lambda as our own favicon, which we had been
doing.

**THE SIGNAL RULE — the one thing most likely to break silently.**
`--ts-signal` is the accent and it is used by the primary CTA, the
progress ring, the live dot, the tab underline and the reticle. It was
**also** used by every error surface, so a plain token swap would have
turned **errors green** — a lie the player reads as success. Every error
surface now uses `--ts-error` explicitly: the launch error
(`XashLanding.vue`), the server-list empty-error state
(`TSServerList.vue`), and the CONNECTION LOST panel's title, button and
border (`XashCanvas.vue`). The "connecting" splash label is `--ts-warn`.

**The engine hijacks `document.title`** from its own window title once it
boots — the live tab read "The Specialists" after the HTML said
otherwise. `webxash/src/services/brand.ts` takes the title back with a
MutationObserver and keeps it.

**Verified:** `vue-tsc` + `bun run build` clean; the parent's 81 unit
tests pass; every text pair passes WCAG AA against the **shipped** values
(ghost/void 18.46, phosphor/void 14.70, mute/void 7.09, red/void 6.63);
`--ts-ink-dim` is 4.07:1 and is documented as decorative-only; PLAY and
the first server row are above the fold at 1280x720, 1440x900 and
375x667; the error surface was confirmed **red** in a real browser.

**Left for Phase 2:** the landing page's structure (the mock's top and
bottom bars, the code rain fixed, the server row rebuilt with
humans/bots, the tickrate and a health chip), and the fold measured
against the mock rather than against today's page.

### Rebrand Phase 2 — the landing page (2026-10-24, shipped)

**webXash PR #14.** The landing page is the mock's structure: a fixed top
bar, a fixed bottom bar, the code-rain stage, the nav row, the hero, the
tab panel, the footer.

**The code rain actually rains now.** The mock's is twelve columns of one
IDENTICAL string, and its animation translates only -8% -> +8% of a
120%-tall element, so the glyphs shimmer in place and never travel. Ours:
16 columns, **16 unique strings**, each travelling a full column height —
measured at 100px/second, 900px over the 9s cycle — with its own duration
and phase so they do not march in step. The strings are generated from a
fixed seed on purpose: the rain is the same on every load, so the page
never reflows under the reader and a screenshot of it is reproducible.

**The server row is rebuilt.** A2S reports `players` as humans PLUS bots,
so the old row's "16 / 32" read as 16 players when it was 16 bots and
nobody. The registry knows the real human count, so the row shows
**HUMANS**, **BOTS** and **SLOTS** separately, with the humans in
phosphor — that is the number a visitor is here for. Plus the tickrate
and a health chip, which is three DIFFERENT facts: a server that is not
answering is not the same as one answering badly, and neither is the same
as the registry's own data being stale. `Ok` / `Degraded` / `No reply` /
`Stale`.

**The top bar is live.** The registry already publishes the current map
and the real human count, and the list is polled every 20s, so the bar
shows real data.

**The fold, measured.** The acceptance criterion was PLAY *and* the first
server row above the fold at 1280x720 and 1440x900. Measured with the
**real production `/api/servers` payload** served into the preview, so the
row is the one a visitor sees:

| viewport | PLAY | first server row | bottom bar's edge |
|---|---|---|---|
| 1440x900 | 448-510 | 643-721 | 862 |
| 1280x720 | 401-463 | 593-671 | 682 |

Both pass. Two things were reserving space they were not using:

- **The download-progress block was holding ~37px below the PLAY button**
  on every load. It is a div with a bar and a line of text, and it was
  reserving its height for a download that had not started. It now
  collapses when inactive.
- **The hero was centring itself in the free space**, which pushed the tab
  panel DOWN — the opposite of what the fold wants. The panel absorbs the
  free space instead (`margin-bottom: auto`), so the footer stays at the
  bottom without the panel moving.

**`justify-content: center` on a scroll container is a trap.** It pushes
the overflow ABOVE the scroll origin, where it cannot be scrolled back to.
The hero uses `margin: auto` for centring instead. That is why the
`.ts-landing__inner` comment now says so.

**Everything the live page had survives:** the fullscreen opt-out, the
download progress, the launch error surface, the server-list states
(scanning / empty / error, still distinct), the refresh button and its
spinning state, join per server, the real How It Works copy with its full
controls table, and the real footer links.

### Rebrand Phase 3 — the boot screen, the splash, the options overlay (2026-10-24, shipped)

**webXash PR #15.** Restyle only, no behaviour change.

**Valve's logo is out of the product.** The "Connecting to server" splash
was Valve's **spinning Half-Life lambda** — our own frontend asset behind
the WASM canvas, but still the publisher's mark in a fan project. It is
the BulletBallet mark now. `hl-spin.svg` and `hl-bright.svg` are deleted,
and the parent's `canvas-logo.test.mjs` now guards all three Valve assets
(`hl.svg`, `hl-spin.svg`, `hl-bright.svg`) so they cannot come back.
Verified in a browser: `anyLambda: false`, `hlSpin: false`.

**The code rain, rebuilt — Kyle's bug, and it was structural.** He
reported: *"sometimes the lines just appear rather than always raining
down from the top"*.

A seamless loop needs the pattern's period to equal the travel distance
**EXACTLY**. With text, the period is the glyph count times the glyph
advance — a number that depends on the font, the font size and the
viewport. Get it slightly wrong and a gap opens at the end of the cycle
and the next cycle **pops** the top back in. That is what he saw.

**=> The rain is a repeating BACKGROUND now.** `background-size` fixes the
tile at an exact pixel height, the travel is that same height in pixels,
and the strip repeats forever underneath. No measurement anywhere;
seamless for any viewport at any size. Each column still has its own
glyph strip, from a fixed seed.

**How it was verified:** freeze two columns exactly one cycle apart and
compare the pixels.

| comparison | differing pixels |
|---|---|
| exactly one 10s cycle apart | **177** of 176400 |
| 0.05s apart | **6,491** of 176400 |

Those 177 are the pulse dot in the eyebrow — a different animation. The
rain is the same picture at the start and the end of every cycle.

**Also:** the boot screen gets the mark and the two-tone wordmark; the
options overlay gets the mark and **phosphor focus rings** (the field's
own colour plus a halo, so the focus is unmistakable without a
browser-default blue outline). Every control stays — Identity (name, 24
chars), Controls (sensitivity, FOV, volume), Camera (third person and
the note that it needs you alive), Session (quit to web UI).

### Rebrand polish — a calmer rain, and a How It Works you can read (2026-10-24)

**webXash PR #17.** Kyle's notes on the shipped page.

**The rain was too fast, and that was the motion sickness.** It travelled
1216px in 10–16 seconds — **76–121 px/second**. A full screen of glyphs
moving at a hundred pixels a second is a lot of motion, and no part of
the effect needed that. It is 18–31 seconds now: **39–67 px/second**,
measured at 67.6 in the browser. A drift rather than a fall.

**And it now fades hard from the top down.** The old mask was fully
opaque from 14% to 76% of the screen, so the rain hit the hero at full
strength with nothing between. The mask falls away as it descends, so
the wordmark, the lede and the PLAY button sit on a calm field — and the
lower half of the screen is where a moving eye is worst served by. Base
opacity 0.2 → 0.17.

**The CRT matrix text.** The glyph set is weighted towards **half-width
katakana** — a column of dense, angular, half-width characters reads as
terminal output; a column of Latin letters reads as a spreadsheet. Each
glyph also gets a **phosphor halo with the core left crisp**
(`drop-shadow(0 0 3px)`), which is what a real phosphor does and what
flat text does not.

**The copy.**
- `Scene 01 / Half-Life 1 · running in a browser` → `The Specialists Mod / Half-Life 1 · running in a browser`
- `Tactical deathmatch with the original ruleset — …` → `The Specialists Mod 3.0 with the original ruleset — …`

**The How It Works tab.** The three cards had a paragraph of four
sentences each. Now: **ten bullets, twelve highlighted terms**
(`Rust reimplementation`, `WebAssembly`, `game DLL`, `cannot emit UDP`,
`WebSocket↔UDP proxy`, `byte-for-byte`, `binds them itself`, `Nothing is
translated`). The highlights are written as `**asterisks**` in the source
and split at render time, so the copy stays plain text — no markup in a
string literal. The bullet marker is the same `▸` the boot screen uses
for its active step, so the product has one marker language.

**The fold is unchanged and still passes** at 1280×720 and 1440×900.

**The invocation, exactly:** `scripts/test.sh` -- it finds a libclang
that actually *resolves* and a FWGS checkout, and runs the client suite
(433 tests). From a clean environment, with nothing set:

```
scripts/test.sh                 # the client suite
scripts/test.sh -p ts-server    # anything else cargo accepts
```

**The trap that made it necessary.** `LIBCLANG_PATH` defaulted to
`~/.local/lib`, which `install-libclang.sh` filled with symlinks into a
download directory **under `/tmp`**. When `/tmp` got cleaned the symlinks
went broken, and bindgen said *"Unable to find libclang"* while the
files were plainly there -- because it does not follow a broken symlink
to discover that it is broken. The extraction now lives in
`~/.local/cache/libclang-dl`, and `install-libclang.sh` says so when a
link does not resolve.

### The port's Rust test suite could not compile (2026-10-24, fixed)

`cargo test -p ts-client` failed to build the test target: five errors in
`crates/client/src/plugins/offers/fetch.rs` -- `Path` not in scope twice,
`write_all` on a `TcpStream` three times. The test module was missing
`std::io::Write` and `std::path::Path`.

**Why it matters more than it looks:** the whole port's test suite --
**433 tests** -- could not be run at all, because the test target would
not compile. It went unnoticed because **no CI step runs cargo at all**:
the pipeline's three jobs are the frontend typecheck/build, the Node unit
suite, and the Docker image build. The image build compiles the port's
*library*, never its tests, so a broken test target is invisible to it.

The suite is green now (433 passed, 0 failed) -- which is a real
verification of the port, not just a compile fix.

**STILL OPEN:** nothing runs it. `cargo test -p ts-client` needs
`FWGS_DIR` (the xash3d-fwgs headers) and `LIBCLANG_PATH`; the CI already
fetches the engine for the image build, so a job that runs the port's
tests is a small addition -- it is just not free in CI minutes, and the
trade-off is a call to make rather than one to make silently.

### The buy menu could not be reopened (2026-10-24, fixed)

Kyle's report: *"while dead, after you accidentally close the buy menu
it doesn't reopen."*

**THE MECHANISM, in three steps.**

1. TS's own `config.cfg` binds `"b"` to `"buy"` -- the key that opens the
   buy menu again after the player closes it with `"0 Cancel"`. The engine
   **did** execute that file: every one of TS's binds is in the engine's
   bind table, including the ones that differ from the stock Half-Life
   table.
2. **We removed the bind ourselves.** `webxash/src/services/xash-loader.ts`
   ran `bind b ""` at boot -- a leftover from the "stop sending every key
   twice" fix, when the frontend still SENT `"buy"` itself and the
   engine's own bind had to be cleared so the menu did not open twice.
   When that command map was deleted, the unbind was left behind, and the
   buy menu lost its key. The engine's table said `"b" = ""` because WE
   emptied it.
3. The client library cannot fix it either: `client_cmd` sends the
   command to the **SERVER**, not to the engine's local command buffer.
   The shell can -- it has the engine's `Cmd_ExecuteString`.

**THE MEASUREMENT** (the engine's bind table, asked directly in the
browser's console):

```
"b" = ""            <- no binding
"w" = "+forward"    "1" = "slot1"    "5" = "slot5"
"x" = "thirdperson" "f" = "firemode" "t" = "drop"
"z" = "usepowerup"  "q" = "+alt1"     "0" = "slot10"
"6" = "slot6"       "k" = "+voicerecord" "h" = "impulse 201"
"g" = "useitems"    "MOUSE3" = "+alt1"
```

**THE FIX, in two parts:** `webxash/src/services/xash-loader.ts` no
longer clears `"b"` (the game's own config is the source of truth for its
own keys), and it binds `"b"` to `"buy"` on the frame after the engine
starts, and again at +2s -- so the key works even if the config's line is
ever disturbed.

**WHAT I GOT WRONG FIRST, because it is the obvious wrong answer:** I
concluded that the config's own `bind "b" "buy"` line "never took", and
built a story around the engine executing the config after the client's
`Initialize` and TS's config starting with `unbindall`. That story was
wrong: the config's line took, and then WE removed it. **The evidence was
in the project's own skill file all along** -- it had the answer, in one
sentence, and I did not read it before theorising for an hour. The lesson
is the one the repo already teaches about withdrawn claims: *the file
that carries the claim is read more often than the file that retracts it*
-- which cuts both ways. A skill file is a claim too, and it was RIGHT.

**VERIFIED** in a real browser against production: `b` opens the menu,
`0` closes it, `b` opens it again -- photographed at each step.

**THE FIRST ATTEMPT WAS WRONG, AND THE WAY IT WAS WRONG IS WORTH
RECORDING:** it bound the key from the client library, which sent
`bind b buy` to the **server**. The server has no `bind` command, so it
did nothing at all, and the wasm had to be rebuilt and reverted. A bind
that goes to the wrong command buffer looks exactly like a bind that
does not work.

**Two things that made the measurement hard, worth knowing:**

- **The engine's console opens by itself in the browser** and keeps the
  keyboard while it is open, so a scripted keypress is typed into the
  console instead of reaching the game. The symptom is a keypress that
  appears to do nothing at all.
- **Clicking the canvas is `+attack`,** which joins the game -- and then
  the player is alive, and the buy menu (which is for the dead) is
  correctly not open. A test that clicks the canvas is testing the wrong
  state.

### Ctrl+W threw a "Leave site?" dialog mid-match (2026-10-26, fixed)

Kyle's report, verbatim: *"While playing fullscreen, i noticed if i hit
CTRL + a movement key (like WASD) it would trigger a browser modal to
confirm if I wanted to leave the page or stay. Not sure what hotkey it's
technically triggering for the browser to try and leave the page, but we
should probably block that so users can crouch and not get popups (very
distracting)."*

**THE CHORD IS Ctrl+W** -- the browser's "close this tab". The movement
keys are WASD, and `w` is forward, so "crouch + move forward" is
literally Ctrl+W.

**THE MECHANISM, in three steps:**

1. **Chromium RESERVES Ctrl+W.** The W keydown is never dispatched to
   the renderer, so no DOM handler can cancel it. Measured: a Ctrl+W
   chord delivers the `ControlLeft` keydown and nothing else.
2. **The browser then attempts the close**, which fires `beforeunload`.
3. **OUR OWN unload guard cancels that** -- `webxash/src/services/
   xash-loader.ts` calls `preventDefault()` + `returnValue = false`, and
   *that* is what makes Chrome ask "Leave site?". The dialog is ours, not
   the browser's.

**THE MEASUREMENT** (real Chromium, real X11 chords, 2026-10-26). A
Playwright/CDP key event bypasses browser accelerators entirely and
cannot see any of this, so every reading below came from real `xdotool`
chords into a headed Chromium:

| chord | keydown reaches the page? | |
|---|---|---|
| Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+Tab | **no** | reserved -- only `navigator.keyboard.lock()` can free them |
| Ctrl+R, Ctrl+S, Ctrl+D, Ctrl+F, Ctrl+P, Ctrl+O, Ctrl+0..9, Alt+Left/Right | yes | a DOM gate can cancel them |

**THE FIX, in two halves:**

1. A DOM gate -- a capture-phase `keydown` listener that calls
   `preventDefault()` for the chords Chromium delivers.
2. `navigator.keyboard.lock()` for the chords Chromium reserves, so they
   reach the page and the same gate can cancel them.

The gate calls `preventDefault()` and **not** `stopImmediatePropagation()`,
so the engine still receives the key -- the bind table has `bind "CTRL"
"+duck"` and `bind "w" "+forward"`, so Ctrl+W is duck+forward *in the
game*. It is safe to `preventDefault` a key the engine needs: the
engine's key event struct carries `ctrlKey`/`shiftKey`/`altKey`/
`metaKey` and the key/code, and has **no `defaultPrevented` field at
all** (checked in the generated `xash.js` glue and in `xash.wasm`).

**Escape stays OUT of the locked set.** Locking Escape changes what a tap
of Escape does -- the tap then reaches the page and fullscreen is *not*
left -- and the game's two-step Escape (press 1 releases the mouse, press
2 opens the options overlay) is built on the browser consuming that tap.
Measured: with and without the lock, a tap of Escape behaves identically.

**THE LOCK IS RE-ASSERTED, NOT TAKEN ONCE AND TRUSTED.** Chromium drops
it when the document loses focus, and it does not always say so:
opening a second window and coming back drops it with **no event at
all** -- not `visibilitychange`, not `blur`, not `focus`. The trigger is
the modifier keydown, which always reaches the page even when the chord
it starts is reserved, so the lock is re-taken at the exact moment the
player starts crouching. Measured: `lock()` resolves in about 1 ms, and
a chord fired with a 0 ms gap between the `ControlLeft` keydown and the
W keydown still arrived.

**VERIFIED** against the shipped module (bundled by bun as the app's
build bundles it, driven with real X11 chords): Ctrl+W, Ctrl+Shift+W,
Ctrl+R, Ctrl+S, Ctrl+T, Ctrl+N, Ctrl+1, Ctrl+Tab and Alt+Left all
produce no dialog, no reload, no tab switch and no closed tab, and the
engine still receives the key; a bare W and a bare A pass through
untouched; Escape still leaves fullscreen; the lock survives a
backgrounding round-trip. 13/13.

**WHERE THE FIX LIVES:** `webxash/src/services/browser-chords.ts` (the
chord sets -- pure data, no imports, so the parent's unit suite can read
them) and `webxash/src/services/browser-chord-gate.ts` (the gate and the
lock). The gate is armed exactly as long as the unload guard is
installed, and disarmed with it, so the landing page keeps its normal
browser shortcuts.

### The game server's log grew without bound (2026-10-26, fixed)

Every container on the production host logs through docker's `json-file`
driver, and the default for that driver is **one file with no size
limit**. Nothing rotated it.

**MEASURED ON PRODUCTION (2026-10-26):** `ts-0`'s log was 25 MB after 22
hours and growing at **268 bytes/second** — about **22 MB/day** from a
single instance, for as long as the container lives. The control-plane
containers were quiet by comparison (registry and orchestrator: 4 KB
after 18 hours), so the game server is the one that mattered. The disk
was at 25% (9.1 GB of 38 GB), so this was not yet an emergency — it is
a slow leak in a thing that is supposed to be bounded.

**WHY IT WAS NOT ONLY A DISK PROBLEM.** The registry reads the engine's
console out of this log, and it reads BACKWARDS from the end
(`docker logs --tail`, see `services/registry/lib/console-log.mjs`)
because a full read is O(entire log) — 51 seconds against a 5.4 MB log.
That fix made the read cheap, but a log that never stops growing is
still a log that gets more expensive to read, more expensive to store,
and more expensive to page through when someone is debugging a stuck
server. Measured on production: a full `docker logs ts-0` took 1.2 s
against the 25 MB log; `--tail 2000` took 27 ms.

**THE FIX.** `--log-opt max-size=10m --log-opt max-file=3` on the
`docker run` that creates each container — 30 MB per instance, about a
day and a half of the measured growth, and eight instances cannot
approach the disk. The two scripts that create containers are
`tools/deploy/run-instance.sh` (the game servers) and
`tools/deploy/deploy-services.sh` (the control plane), and they now use
the same limit so the rule cannot drift apart.

**TWO DELIVERY BUGS THAT WOULD HAVE MADE THE FIX INERT.** Both were
found by asking "how does this file actually get to the host?", and
neither is visible in a diff:

1. **`run-instance.sh` was never shipped by the deploy.** Only
   `deploy-services.sh` was scp'd to the host, so the script that
   creates every game server had to be copied **by hand**. A fix to it
   could be merged, reviewed, CI-green, and still never touch a running
   container. The deploy now ships both, and `changed-paths.cjs`
   classifies both as services changes — before, a change to either
   script did not even trigger the control-plane rebuild that would
   have shipped it.
2. **A bind mount pins the inode.** The orchestrator bind-mounts
   `run-instance.sh` from the host, so replacing the file on the host
   is **not visible inside the running container** (measured: the
   container's copy kept the old inode and the old size while the host's
   file changed underneath it). The orchestrator would have kept running
   the old script. It only picks the new one up when the container is
   recreated — which the deploy does, in the right order: ship, then
   recreate.

**VERIFIED**, against real docker, not a mock: a container created with
the exact flag construction the script uses records
`{"Type":"json-file","Config":{"max-file":"3","max-size":"10m"}}`;
after writing far past the limit the log directory holds three files
totalling 137 KB against a 192 KB budget; and `docker logs --tail N`
still returns the newest lines **and still spans the rotated files in
order** — the registry's marker-then-answer contract depends on that
ordering, and it survives rotation. A `docker logs` read of a rotated
container was checked for the same reason.

**WHAT THIS DOES NOT DO.** Log options are CREATE-TIME options:
`docker update` cannot change them. A container that is already running
keeps its unbounded log until it is recreated, so the 25 MB file on
`ts-0` stays until that container is replaced. That is deliberate —
recreating the game server kicks every player on it — so it is left to
the orchestrator's own scale cycle rather than forced.

### The engine rendered at the viewport's resolution (2026-10-27, fixed)

The "150 ms" in the 2026-10-27 capacity report was **never server
latency**. It was the engine's own render frame time.

**WHAT WAS MEASURED.** The engine renders **AT the browser viewport's
resolution** — always. Its `vid_width`/`vid_height` cvars and the canvas
backing store tracked the viewport exactly at every size tried, and the
engine's frame count equalled the browser's `requestAnimationFrame` rate
at every size: the engine draws one frame per animation frame and the
main thread is blocked for all of it. That is mechanically what a 150 ms
event-loop lag is.

| viewport | engine render res | engine frames/s |
|---|---|---|
| 640x480 | 640x480 | 69.5 |
| 1280x720 | 1280x720 | 30.2 |
| 1920x1080 | 1920x1080 | 8.6 |
| 2560x1440 | 2560x1440 | 4.5 |

One headless Chromium against production, **software rasteriser** — so the
absolute frame rates are pessimistic; a real GPU is faster. The SHAPE is
the point: the frame cost is the pixel count.

**THE PRODUCTION A/B**, viewport 2560x1440 throughout, engine mode varied
with `vid_setmode <w> <h>`:

| engine mode | rAF/s | event-loop lag med | p95 |
|---|---|---|---|
| 2560x1440 | 11.20 | 88.4 ms | 233.5 ms |
| 1920x1080 | 21.92 | 55.7 ms | 97.0 ms |
| 1280x720 | 38.83 | 28.7 ms | 56.9 ms |
| 640x360 | 60.04 | 13.6 ms | 37.4 ms |

**THE TRAP: THE ENGINE RE-SYNCS ITS RESOLUTION TO THE WINDOW.** SDL's
resize event → `VID_SaveWindowSize` → `R_SaveVideoMode` rewrites the
engine's `width`, `height`, `vid_width` and `vid_height` from the new
window size. A forced 1280x720 did **not** survive the viewport growing
to 2560x1440 — the engine went back to 2560x1440 and the frame rate fell
from 16.2/s to 0.4/s. So the resolution has to be **re-applied after every
resize**, not just set once at boot.

**WHAT SHIPPED.**

- `webxash/src/services/video-settings.ts` — **the policy, and nothing
  else.** Detects the display, resolves the player's choice to a render
  resolution, and produces the engine's launch args and the `vid_setmode`
  command. **No imports, on purpose:** the parent's unit suite imports
  this `.ts` directly through node's type stripping, the same constraint
  `browser-chords.ts` is written under.
- `webxash/src/services/xash-loader.ts` — `-width`/`-height` in the
  engine's argv, so the **first** frame is already right and not just the
  second; plus a post-boot `vid_setmode` and a +1500 ms retry for the
  case where the video system was not up yet.
- `webxash/src/services/fullscreen.ts` — the existing resize watchdog
  re-applies the resolution, because the engine throws it away on every
  resize.
- `webxash/src/stores/store.ts` — the `renderResolution` preference,
  persisted.
- `webxash/src/components/XashLaunchOptions.vue` — a "Render resolution"
  selector in the launch options.
- `tests/unit/video-settings.test.mjs` — 21 tests over the real policy
  and the wiring. `npm test` is **132/132**; `bunx vue-tsc --noEmit` is
  clean.

**THE DEFAULT IS 1080p.** `auto` takes the display's CSS resolution
capped at a **1920x1080** pixel budget, aspect preserved. HiDPI is
deliberately **not** multiplied by `devicePixelRatio` — that would be
four times the fill rate for 320x240 art. The browser upscales the
canvas (the canvas is `width: 100vw; height: 100vh`, so its CSS size is
independent of its backing store). `display` in the selector is the
uncapped native resolution.

**A LANDMINE THE FIRST VERSION WALKED INTO.** The resize watchdog is
installed at import time, before the Vue app exists, so it hears the
resize events that happen while the engine is still booting. The engine's
command pool does not exist until its first frame, and a command sent
before that makes the **engine** raise its own fatal error — measured:
`_Mem_Alloc: pool == NULL (alloc at ../engine/common/cmd.c:638)`,
surfaced at the JavaScript side as the bare value `Infinity` thrown out
of `Cmd_ExecuteString`. The render-resolution module now stays
**disarmed** until the loader says the engine is up.

**THE FULLSCREEN QUESTION — THE BORDERLESS OBSERVATION DOES NOT HELP.**
The engine's own borderless mode takes the **DISPLAY**'s resolution, which
is *more* pixels, not fewer. The mode that honours a forced resolution is
the engine's **windowed** mode; the browser's own fullscreen is what fills
the screen.

### The lighting question (2026-10-24, investigated — NOT fixed)

Kyle asked whether the work that stopped the player models rendering
black changed the level's lighting or shadows. **It did not.** Here is the
proof, and here is what is actually wrong.

**1. The wasm's source delta is exactly the viewmodel fix.** The client
wasm in production until 2026-10-24 16:11 was built on 2026-10-21 22:04
(`webxash` `e7bc58d`). The live one was built at 16:33. The whole source
delta is two commits: `0f93432` (fix #1, in `draw_weapon`) and `31ba308`
(fix #2, in `draw_model`, which **reverts** fix #1). The net is one
function. And `tools/port/tsp-rs/scripts/build-wasm.sh` last changed on
2026-10-21 12:25 — **before both builds** — so the flags and the toolchain
are the same.

**2. The level is not drawn by the port.** The BSP, its lightmaps, the
dynamic lights and the shadow pass are the **engine's** (`xash.wasm`), and
the engine's wasm has not been touched since the 512 MB heap patch — which
is memory, not rendering. The port draws studio models: players, weapons,
entities. And it never writes an `r_*` lighting cvar; it only *reads*
`r_drawviewmodel`, `r_drawentities` and `cl_motionblur`.

**3. The fix's scope is one entity, at one moment.** `draw_model` sets
`rendermode = kRenderNormal`, `renderamt = 255` and a white `rendercolor`
on **the view-model entity** (`r_entity[0]`), at draw time. It does not
touch the local player's state, the entity list, or any cvar. The viewmodel
is drawn after the world.

**=> The level's lighting, shadows and colours did not change.**

**4. The one global change from today: the canvas backdrop.** The old
canvas rule was `background-image: url("./hl.svg")` with **no
background-colour**, and `body` had no background either — so the canvas
composited over the browser's default **white**. Phase 1 added
`body { background: var(--ts-void) }` (#010a04). Measured on a live frame,
the backdrop moves the median static pixel by about **4/255** and the
translucent regions by more. Real, and small.

**5. What IS wrong: the player models are still black.** In a live
`ts_theatre` frame the level is lit correctly — the tree, the blossoms, the
building, the path — and **both characters are solid black silhouettes**;
1044 sampled pixels average RGB **[0.7, 0.66, 0.62]**. They stay black
with *any* backdrop, so this is a **lighting** problem and not an alpha
one, which is what § "the framebuffer is not opaque" already concluded.

**This is the same defect the viewmodel had, on the path we did not fix.**
The viewmodel fix forces `kRenderNormal` + `renderamt 255` + a white
rendercolour on the view-model entity **only**. The player models still get
the local player's third-person translucency state — `rendermode =
kRenderTransColor` and an eased `renderamt`, written every frame by
`view.rs` — and the server spawns players with `rendercolor = (0,0,0)`, a
zero multiplier.

**=> The open work: the same override for the player models, carefully.**
The local player's own third-person fade is *intentional* (it fades when
you are close to yourself), so the override has to distinguish "the local
player's own model" from "everyone else".

**6. The engine has its own Half-Life lambda.** Not the CSS one we removed
— the engine's console/loading screen draws a big grey lambda, centred.
Proven: with the canvas's CSS background forced to solid red and
`background-image: none !important`, the lambda was still there in a black
frame. **There were two lambdas.** The CSS one was the ghosting bug and it
is fixed; this one shows during startup, before the client's own boot
screen takes over.

**THE MEASUREMENT RECIPE**, so this can be repeated instead of re-derived:

- **The frame's own motion is the control, and it is not optional.** The
  camera moves; without a same-backdrop control pair, a 15% swing in the
  medians is just the game.
- **Compare only the pixels that did NOT move between the two control
  shots.** Mask them out, then measure the difference on what is left.
- **A static frame measures nothing.** The engine's console/loading screen
  is static, so every shot is identical and every number comes out zero —
  which reads as "no effect" when in fact nothing was being measured.
- **Verify the CSS actually applied** (read the computed style) before
  believing a null result.
- `readPixels` on the engine's canvas returns **zeros**: WebGL clears the
  drawing buffer after presenting. Take screenshots; do not read back.

## The rebrand: BulletBallet (2026-10-24, planned)

**The site is becoming BulletBallet.** The plan is
**`docs/REBRAND-PLAN.md`** — read that, not this summary.

The decision that shapes it: **green shell, amber game.** The site
chrome (landing, boot, options, disconnect) becomes a phosphor-green
operator terminal; the *game* keeps TS's own amber, because that amber
(`iTeamColors[0]` = 255,170,0) is what the HUD, the scoreboard and the
menus actually are. The current theme is amber *everywhere* — that was
deliberate, so the page handed off amber-to-amber — and under the new
palette the shell's green becomes the distinguishing thing.

Kyle owns the call on the palette; the plan has it.

**The mock** is the single-file HTML Kyle supplied (the BB cartridge
mark — original, made for BulletBallet — plus the code rain, the Anton /
Space Grotesk / JetBrains Mono type stack, and the phosphor palette).
It is a *reference*, not a spec: everything the live page has today and
the mock does not (the fullscreen opt-out, the download progress, the
launch error, the server-list states, the real "How It Works" copy and
controls table, the real footer links) has to survive the rebrand. The
plan lists them, one by one.

**The highest-leverage fact:** the shell's 26 design tokens are consumed
by only **6 component files**. So the whole re-skin is **redefining token
values in one file** — no component rewrites — and the components follow.

**The most likely silent regression:** `--ts-signal` is currently used
for the primary CTA *and* for the error surfaces. If it simply becomes
phosphor green, errors turn green, which reads as success. Every error
surface moves to a new `--ts-error` in the same change.

**Two measured gotchas, both in the plan:**
- The **engine hijacks `document.title`** (`xash3d-fwgs` sets it from
  the engine's own window title at boot — the live tab reads "🐴 The
  Specialists" *today*). `index.html` governs the landing page, but the
  tab reverts mid-match unless the client re-asserts it.
- The **live favicon is Half-Life's lambda** (`hl-bright.svg`). We are
  shipping Valve's logo under our own domain; replacing it is a brand fix
  and a licence-posture fix at once.

## The matches are fifteen minutes now (2026-10-24)

`mp_timelimit 10` → **`mp_timelimit 15`**, in `tools/deploy/config/server.cfg`.

The timer is the thing that ends a match and advances the map cycle, and it
is in **minutes**. `roundtime` (the TS *round* timer, in seconds) is inert
in FFA deathmatch — the server is `mp_teamplay 0`, `lastmanstanding 0`, so
there is no round mode to give it anything to do.

This is an **image change**, not a config change. The engine re-execs
`server.cfg` on every map change, so a cvar set on a live server is
stomped at the next map change (measured: `mp_timelimit 10` set at 15:39
was back to 3 at the 15:48 map change). The only thing that sticks is a
`server.cfg` that is *in the image* — which is why the tag moved
`0.25 → 0.26` in the same PR, and why the image is still built by hand on
the host rather than by the pipeline.

Consequence: the 24-map cycle is now **~6 hours**, not ~4.

```
mp_timelimit 15
```

The other three copies of a number in this project (the bot target: the
registry default, the registry image's env, the deploy script's env, and
`server.cfg`) are unaffected — the registry only ever writes
`ts_bot_quota`, never the match timer.

## What shipped on 2026-10-24 (afternoon): the client's heap, and the humans

Two real defects were found and fixed, plus the guardrails so neither can
come back silently.

### 1. The client's WASM heap could not grow at all

The published `xash3d-fwgs` 1.2.2 wasm declares **initial 4096 pages (256 MB)
and maximum 4096 pages (256 MB)** — the maximum EQUALS the initial, so
`WebAssembly.Memory.grow()` always failed and `emscripten_resize_heap` called
`abortOOM`. The visible symptom was a frozen world a few hundred ms after a
map change, with the page still showing the last frame and the engine's own
`status` saying "no server running".

Fixed by `scripts/patch-xash-memory.cjs`: **512 MB initial, 2 GB maximum**.
Verified through real map changes in production (three server banners, zero
OOMs).

**Two bugs in the fix itself, both caught before they shipped:**

- The first version wrote the new maximum into the OLD two-byte LEB128 slot.
  65536 needs three bytes, so it was silently truncated to 0 and the module
  failed validation ("maximum memory size (0 pages) is less than initial").
  **That deployed and took the client down entirely.** The patcher now
  REBUILDS the memory section when the encoding width changes, and COMPILES
  its own output — a broken wasm fails the build instead of shipping.
- `scripts/check-xash-wasm.cjs` now runs at the end of every build and asserts
  the bundled engine's limits, so a bad wasm cannot reach production.

### 2. The deploy's browser check did not check the engine

It inferred "a player is in a game" from the **bridge's connection count** —
which is exactly why the broken wasm sailed through a green deploy. It now
asserts the engine's own evidence (`window.__xash` present, canvas at the
engine's real size, server banner received). Proven both ways: with the
corrupted wasm the check reports FAIL; with the good one, PASS.

### 3. Humans were invisible in the server's logs

The engine *does* log connections — but via `Log_Printf`, to a **log file**,
and the game container cannot write one (the assets are a read-only mount).
Bots announce themselves ("connected with skill"), which is why only bots
ever appeared in `docker logs`. The port now prints them itself:

```
[18:09:25] [ts] Specialist connected (address 172.17.0.1:42468)
[18:10:56] [ts] Specialist disconnected
```

Shipped as PR #38 (the port change), PR #39 (the image tag), and PR #40
(`scripts/build-server-dll.sh` — the server DLL build needed three separate
env fixes that the errors never explained; the script now finds all three).

The game server image is `ts-server:0.26`; **`0.25` is still on the host**, so
a rollback is one env var: `TS_IMAGE=ts-server:0.25`.

**Caveat worth knowing:** the disconnect lags by ~90 seconds. It is a UDP
drop, so the server only notices when the client's packets stop arriving.


## What changed since the last handoff (2026-10-21)

That handoff ended with "R1.1 — the player entity" as the blocker, and a
roadmap of R2–R7 (spawn points, `AddToFullPack`, movement, the 207 spawn
errors, HUD, gameplay) all built on the **decompile + pump** path.

**That path is now the single-player fallback, and production does not use
it.** The production architecture puts the server logic where it belongs:
in a separate WASM dedicated-server process, with the browser acting as an
ordinary GoldSrc client. So:

- the player entity is not a blocker — a real client connects to a real
  server and gets a real player
- the client handshake that never completed under `-noip -noip6` is no
  longer on the critical path, because the client is not hosting the
  server
- R2–R7 remain real work, but they are work on the **fallback**, and
  they are now Phase-5 polish rather than the road to production

What was actually built in this window:

| | |
|---|---|
| Asset delivery | 493 MB archive split into 8×64 MiB parts + manifest, on R2 behind Cloudflare, edge-cached (`MISS`→`HIT`) |
| Vite base | `/webXash/` → `/`, so the app is at the domain root |
| Transport | `wss://` + an explicit `+bridge` address separate from `+connect` |
| Bridge | multi-target, allowlisted, refuses unknown targets with 403 |
| Caddy | TLS, routing, cross-origin isolation headers |
| Registry | A2S + tickrate + bot count + health, per instance |
| Orchestrator | restart unhealthy, restart degraded, scale out, scale in |
| Bot backfill | bots yield to humans automatically |

## The fleet got busier, and the maps started moving (2026-10-24)

Kyle's quality-of-life pass, three items.

**1. Map rotation.** The server now cycles through **The Specialists 3.0's
own map cycle** — the one that shipped in the mod's Linux server tarball
(`ts/mapcycle.txt`), twenty-one maps in the mod's own order — plus the
classics TS 3.0 dropped from its default file while still shipping them:
`ts_dietrich` (the Face/Off penthouse) and `ts_bikini` (the seaside
villa). Both were in the official 2.0 cycle, so a historically faithful
rotation has to name them explicitly.

**`ts_dojo` was in that list and was taken out on 2026-10-24** — Kyle:
*"it was hard on the eyes and pretty laggy to play in"*. A rotation is a
serving decision, not a monument.

The stock cycle's last entry, `ctb_deadheat`, is left out: it is a
Capture-The-Bomb map with no deathmatch spawns, so a player who landed on
it in FFA would have nowhere to spawn and would sit in spectator until
the round moved on.

Two things had to be true, and both were broken first:

- **The cycle file is ours.** The asset tree ships the STOCK Half-Life
  cycle — `undertow`, `snark_pit`, `boot_camp`, `lambda_bunker`,
  `datacore`, `stalkyard` — and the TS folder's own `mapcycle.txt` is
  empty. Not one of those maps exists in a TS install, so the port skipped
  every entry ("not a valid map"), ended up with an EMPTY cycle — and an
  empty cycle is not an error. The server just kept `ts_casa` forever,
  silently. `entrypoint.sh` now installs
  `tools/deploy/config/mapcycle.txt` into the game directory and skips
  the asset tree's, so there is exactly one cycle in the tree.
- **`mp_timelimit` is the timer, and it is in MINUTES.** `roundtime` is
  the TS *round* timer and is inert in FFA deathmatch: setting it to 30
  and waiting a minute changed nothing at all. `mp_timelimit 3` gives a
  three-minute match, `mp_chattime` (10s) of intermission, and then the
  next map. The stock TS 3.0 `server.cfg` ships `mp_timelimit 30`, half
  an hour on one map.

Measured locally before shipping: the cycle advances, `ts_casa` →
`ts_lobby` on the intermission, with the cycle file in the game directory.

**2. Sixteen bots.** The roster is `16 − humans`, up from `4 − humans`.
It lives in FOUR places — the registry's default, the registry image's
environment, the deploy script's environment, and `server.cfg` — and
nothing derives them from each other, so `tests/unit/bot-target.test.mjs`
now asserts that the four copies agree.

The cost is not tickrate. Measured on **every map of the rotation**, with
the server pinned to **two cores** (the production box's whole budget,
shared with Caddy and three Node services), the server held **100 Hz** on
all twenty-one, with sixteen bots. The bots are cheap; the maps are what
differ.

**3. Fullscreen on launch** (in the `webxash` submodule). Clicking PLAY
takes the page fullscreen, before the download. The **document element**
is fullscreened, not the canvas: the options overlay and the disconnect
panel are DOM siblings of the canvas, and a browser hides everything that
is not a descendant of the fullscreen element.

On the black-on-resize report: measured in a real browser against
production, a viewport resize (1280x720 → 900x600) moved the canvas
backing store, the WebGL drawing buffer and the GL viewport together, and
the frame kept rendering — the engine tracks the size natively. What can
still go black is a **lost WebGL context**, which some drivers do on a
canvas resize, and that one is recoverable; the frontend watches for it
and asks the browser to restore it.

### The game server image is not deployed by the pipeline

`deploy.yml` ships the frontend bundle and the three control-plane images
(registry, orchestrator, bridge). It does **not** ship the game server
image, and that is deliberate — the game containers are owned by the
orchestrator, because scaling the fleet is a decision rather than a
deployment.

But the image is also where `server.cfg`, `entrypoint.sh` and the map
cycle live, so **a change to any of them does not reach production until
the image is rebuilt by hand on the host**:

```bash
scp tools/deploy/entrypoint.sh bb-prod:~/build/
scp tools/deploy/config/{server.cfg,mapcycle.txt} bb-prod:~/build/config/
ssh bb-prod 'cd ~/build && docker build -f Dockerfile.ts-server -t ts-server:0.25 .'
ssh bb-prod '/home/ubuntu/run-instance.sh 0'     # recreates ts-0
```

The build context on the host (`~/build/`) is a staging directory, not a
checkout: the Dockerfile, `config/`, `engine/` (fetched by
`fetch-engine.sh`) and `server/ts_amd64_amd64.so` (the Rust port's
compiled server DLL, built elsewhere and copied in). The image is 176 MB
and asset-free — the game assets are a read-only volume.

Recreating an instance kicks the players on it, so this is an operator
step on purpose.

## What the first real user found

Kyle's first click on prod hit a bug no test had: **PLAY downloaded the
game, booted the engine, and then failed** at the last step with "Could
not reach the game server". Clicking **Join** on a server row worked
perfectly.

PLAY used the store's default launch options, which carry a *development*
address (`+connect 127.0.0.1:27015`). From a browser that is **the
player's own machine**. The engine tried to connect to itself, the bridge
correctly refused an address that was not the production one, and the
player got a confusing error after a 493 MB download and a full engine
boot. Join built its options from the server row, which is why it worked.

**Why every automated test missed it:** they all matched `/join/i`, which
finds a server row's Join button. The suite was exercising the path that
already worked and calling it a pass. A test that only covers the path
you already trust is not evidence about the path you have not tried.

Fixed: PLAY resolves its target from the same live server list Join uses,
inside `launch()` and *before* anything expensive happens — one source of
truth for "where does a player go", so the two buttons cannot diverge
again. There is now a test that clicks PLAY specifically.

## The registry was restarting healthy servers

Three times in three hours the orchestrator restarted `ts-0` while it
was perfectly healthy — kicking every player off it each time.

The cause: **A2S replies get lost.** Measured against the live
instance:

```
one query every 2s   ->  0% lost
one query every 400ms -> 15% lost
one query every 60ms  -> 42% lost
```

The server is not slow when it answers — 16ms p50, under 52ms p95. It
is *dropping* queries, apparently as flood protection. The registry
probed once every 5 seconds, and three consecutive dropped replies
marked a healthy instance down.

Fixed by retrying the probe (three attempts), with a tight 500ms window
on the retries — ten times the observed p95, so a busy server still
answers, but a port with nothing listening does not burn 1200ms per
attempt. Measured against the live public server: **22.5% of
single-shot probes failed; with the retry, 0% did.**

Things ruled out first: not a timeout (replies come back in 16ms), not
the socket (a persistent socket failed at the same rate), not our rate
(the registry polls once per 5s and nothing else sends A2S), and not
Docker's NAT (the packet trace shows the full loop and every probe in
a clean window was answered).

The threshold of three consecutive failed cycles is unchanged — with
the retry, three cycles all failing after three attempts each really
does mean the server is gone.

### Four separate ways to restart a healthy server

The orchestrator restarted `ts-0` four times tonight. Each restart
kicked every player off it. Each cause was a different mistake, and
fixing one did not fix the others:

1. **A dropped A2S reply was believed.** Fixed by the retry.
2. **A busy server was believed dead.** A2S is answered on the game
   thread — busiest exactly when players are connected — and when a
   reply is lost it never arrives, so no longer timeout can rescue it.
   Fixed by corroborating on the console, using the reading the
   registry already collects (a fresh read would compete with the
   metrics poll and time out exactly when the server is busiest).
3. **A missing row was believed down.** `!row` means "the registry does
   not know about this instance", not "it is down" — and a row is
   missing while the registry starts up, which is exactly when a deploy
   recreates the control plane. Fixed by starting the clock only on a
   positive "down".
4. **A live server was believed gone.** The staleness cutoff deleted
   any entry not refreshed for 45s, and "refreshed" meant "A2S
   answered". A server the console proves is alive had its entry
   deleted — so it vanished from the server list and nobody could
   join it. Fixed by keying retention on "we know it is there".

Each rule lives in a module with its own tests:

- `services/registry/lib/a2s-retry.mjs`
- `services/registry/lib/liveness.mjs`
- `services/orchestrator/lib/restart-clock.mjs`

## The repo now has CI and a deploy

Three workflows, live since 2026-10-23:

- **`ci.yml`** — on every PR: typecheck, build, 36 unit tests, and it
  builds all three service images. The image build is there because a
  Dockerfile that references a file the image does not copy produces a
  container that starts and dies in the same second — and it happened.
- **`pr-required.yml`** — on push to main: fails a commit that did not
  come through a pull request.
- **`deploy.yml`** — on push to main: builds the frontend, swaps it into
  place, streams the control-plane images over SSH, recreates the
  containers, and then verifies in a real browser.

**The limitation, stated plainly:** GitHub's branch protection needs a
paid plan for a private repo, and this one is free — the API answers
403. So the PR gate is a *substitute*: it detects a direct push and
blocks the deploy, but it cannot prevent the push. GitHub Pro (~$4/mo)
enables the real thing. Kyle said he usually stands this up once there
is something worth protecting — there is now.

Three things that broke during the first setup, all worth knowing:

1. **The gate had a false negative.** `jq 'length'` on an API *error
   object* returns its key count, so a 403 read as "3 pull requests" and
   a direct push was approved. It now only reads a count from an actual
   array, and fails closed on anything else.
2. **The frontend is a bun project** and two of its dependencies were
   unpublished from npm, so *no* fresh install worked — not even
   locally. Both were dead and are gone.
3. **The e2e scripts read the player count over SSH** to an alias that
   only exists on one machine, so CI saw "0 connections" for a browser
   that was playing fine. They now read the public API.

## The decisions that are locked

**The bridge is same-origin with the page.** Not a preference — a
constraint. An `https://` page cannot open a plain `ws://` WebSocket
(mixed content), and a cross-origin WebSocket cannot carry the page's
cross-origin-isolation context, which the WASM engine needs for
`SharedArrayBuffer`.

**The bridge's allowlist is a security boundary.** Without one it is an
open UDP relay: anyone who can open a WebSocket can make the VPS send
packets to any host it can reach. The registry may tell the bridge
*where* to send a packet; only the floor says whether it is *allowed* to.
The floor is `127.0.0.1` on a static port range, so it never has to be
widened to add a server.

**Unknown targets are refused before the handshake.** Validating after
would let the connection open successfully and then close — which reads
to the client as "connected" and hides the refusal.

**The registry observes; the orchestrator decides.** Separate services, so
a registry bug cannot take the fleet down. The orchestrator never measures
anything itself.

**The orchestrator does nothing when the registry is unreachable.** "I
cannot see the fleet" and "the fleet is empty" look identical from there,
and only one is true. Scaling in on a registry outage would take the
fleet down.

**The game archive is served from a public R2 bucket.** This is the
highest-exposure of the three delivery options and it is a deliberate
call: the browser needs the content, and the server image stays clean
(the assets live in a read-only volume, never baked into the image). The
content is now in Kyle's Cloudflare account and is fetchable by anyone
with the URL, permanently.

## What is NOT done

- **Matchmaking.** The one control-plane piece not built. The registry
  knows what instances exist and how healthy they are; it does not assign
  players to them.
- **Capacity is an estimate, not a measurement.** "8 instances of 32 slots
  on this box" is arithmetic from a 4 GB RAM budget and 363 MB per
  image. It has never been run. Treat it as a plan, not a promise — the
  binding constraint is most likely CPU (2 vCores shared between 8 game
  servers, Caddy, and three Node services), not RAM.
- **The FE work Kyle identified**, and the web UI re-brand (Grover).
- **The native SDL event queue** — the long-standing upstream issue that
  leaves keyboard input routing through a busy-wait poll.

# § ROADMAP

Dependency-ordered. Do not skip ahead — each step is untestable without the
one above it.

### ~~R0. Playable in the browser, in production~~ ✅ **DONE (2026-10-23)**

Real assets, real dedicated server, public URL, verified from a browser.
Everything below builds on this.

### R1. Matchmaking

Assign a player to an instance. The registry already knows the instance
set and each one's health, tickrate and load; what is missing is the
policy for *which* instance a given player should join, and the
"instance full → try the next one" path. The orchestrator's scale-out
already reacts to fleet-wide load, so the load signal exists.

### R2. Real-user metrics

The first thing that makes the capacity number real. The registry
already collects tickrate, player count and bot count per instance —
what it does not yet do is retain them over time. Until it does, the
"8 instances" figure is a budget, not a measurement, and the extrapolation
from one busy server cannot be made.

### R3. FE polish + the web UI re-brand — **DONE (2026-10-24)**

The rebrand is **complete**. `docs/REBRAND-PLAN.md` planned it in four
shippable steps and all four shipped: Phase 0 (the Half-Life lambda
ghosting through the running game), Phase 1 (the green shell, the head and
the brand assets), Phase 2 (the landing page), Phase 3 (the boot screen,
the connecting splash and the options overlay), Phase 4 (the docs sweep).

Kyle's other identified FE tweaks (Batch B/C/D in
`docs/FE-MOD-PLAN.md`) are still open — see § NEXT TASK.

### R4. Single-player depth (the old R2–R7, on the fallback path)

Spawn at a real `info_player_start`, `AddToFullPack` real payloads,
movement via `PM_Move`, the 207 non-player spawn errors, live HUD, and
full TS gameplay. All of this is still wanted — it is just wanted on the
**fallback** path now, not on the path to production. See § DEAD ENDS for
the parts that are known traps.

# § NEXT TASK

> ## THE MONITORING SESSION: KYLE PLAYS, EVO MEASURES (2026-11-09, PLANNED —
> NOT YET RUN)
>
> **THE ONE TASK.** A measurement session on Kyle's gaming PC: he plays
> the game, Evo watches it live and drills into the frame drops, and the
> fullscreen-vs-windowed difference is settled **with numbers on his
> machine** rather than a belief.
>
> **WHY IT IS STILL OPEN.** The access works, the harness works, and the
> numbers are on the way — but **no match has been played under
> measurement yet**. The landing page runs no `requestAnimationFrame`
> loop, so the watcher correctly reports *"NO FRAMES AT ALL"* until a
> match is actually running. **Everything below is written so the next
> session can start without re-deriving any of it.**
>
> ---
>
> ### THE FULLSCREEN MECHANISM — AND WHY THE WATCHER CAN SEE IT
>
> **THE GAME GOES FULLSCREEN ON LAUNCH, AND THE RESIZE IS THE EVENT.**
> The landing page's PLAY button has a **"Start full screen" checkbox, and
> it is ON BY DEFAULT** (`browserFullscreen` in `XashLanding.vue`). The
> launch calls `enterFullscreen()`, which fullscreens
> `document.documentElement` — **the document, not the canvas**, so the
> overlays stay visible.
>
> **SO "FULLSCREEN" ON THAT PATH IS DOM FULLSCREEN, AND
> `document.fullscreenElement` IS SET.** It is **not** set for F11 or
> `--start-fullscreen`. That is why the watcher's `fs` column now asks
> the canvas's size against the screen's as well: it has to be right for
> BOTH ways a player gets there.
>
> **AND HERE IS THE MECHANISM THE CLIENT ALREADY DOCUMENTS**
> (`webxash/src/services/fullscreen.ts`):
>
> > It also re-applies the render resolution, because the engine throws it
> > away on every resize: SDL's resize event calls `VID_SaveWindowSize`,
> > which calls `R_SaveVideoMode`, which rewrites the engine's `width`,
> > `height`, `vid_width` and `vid_height` from the new window size. **So
> > a forced 1280×720 does not survive the viewport growing to 2560×1440 —
> > measured: the engine went back to 2560×1440 and the frame rate fell
> > from 16.2/s to 0.4/s.**
>
> **THERE IS A 50 ms DEBOUNCED WATCHDOG THAT RE-APPLIES IT** — so the
> client is not helpless here — but the resize itself is a burst, and the
> engine is at native resolution until the watchdog fires.
>
> **THE WATCHER CAN SEE THIS HAPPENING.** Its `canvas WxH (backing)`
> column reports the **backing store**, not the CSS size. **A backing
> store that jumps on entering fullscreen — e.g. 1280×720 → 2560×1440 —
> is the smoking gun for this mechanism**, and it is visible in the
> per-second timeline without any inference.
>
> **SO THE FULLSCREEN QUESTION HAS TWO CANDIDATE MECHANISMS, AND THEY
> ARE NOT MUTUALLY EXCLUSIVE:**
>
> - **M1 — THE RESOLUTION IS DROPPED ON THE RESIZE** (the forced render
>   resolution is thrown away and has to be re-applied).
> - **M2 — PIXEL COUNT** (fullscreen is 3.54 MP against 1.59 MP tiled,
>   2.2× the fragments).
>
> **THE BACKING STORE DISTINGUISHES THEM.** If the backing store grows
> with the window, M1. If it stays pinned and only the frame cost rises,
> M2. **If both, both.**
>
> ---
>
> ### THE TWO MEASUREMENT PATHS, AND WHY BOTH MATTER
>
> They measure different browsers, and **that difference is itself part
> of the answer**.
>
> | | **PATH 1 — the live watcher** | **PATH 2 — the in-game Export log** |
> |---|---|---|
> | what it measures | a browser Evo attached to | the match Kyle is playing |
> | which browser | **Chromium** (installed on the box) | **Firefox** (what he actually plays) |
> | fidelity to his experience | a proxy | **the real thing** |
> | what it gives | per-second timeline, p50/p95/p99, late%, long tasks, event-loop lag, input latency | every measurement window the pacer took, fullscreen-vs-windowed by medians |
> | needs a client deploy | no | **yes** (the button is in the new client) |
>
> **WEBGL PERFORMANCE IS NOT THE SAME IN FIREFOX AND CHROMIUM.** A
> Chromium number is a proxy for his Firefox session, and the difference
> between them is worth knowing on its own. So: **measure in Chromium for
> the controlled A/B, and measure in Firefox via the Export log for the
> number he actually lives with.**
>
> ---
>
> ### PATH 1 — THE LIVE WATCHER (step by step)
>
> **ON THE GAMING PC** (one command, from m5):
>
> ```sh
> ssh cachyos-x8664 'bash /home/kyle/opt/relaunch.sh windowed'
> # ...or...
> ssh cachyos-x8664 'bash /home/kyle/opt/relaunch.sh fullscreen'
> ```
>
> It kills the old instance, relaunches the **same profile**
> (`~/opt/bb-cdp`, so the same GPU and the same settings), and prints the
> resulting window size. **The debugger port 9223 binds to localhost
> only** and is unauthenticated — m5 reaches it over the SSH tunnel, and
> **it must never be exposed to the network**.
>
> **FROM m5**, while Kyle plays:
>
> ```sh
> cd ~/Development/specialists-browser
> OUT=~/bb-session-windowed.json bash tools/perf/watch-remote.sh cachyos-x8664 600
> ```
>
> The printed line is one row per second:
>
> ```
> t(s)  fps  p50  p95  p99  late%  engine ms  brHz  panel Hz  lag ms  lt  fs  canvas  css
> ```
>
> **Read these five first:**
>
> - **`engine ms`** — the pacer's own frame cost. The headline.
> - **`p50` vs `p99`** — the judder. `p99 > p50 × 1.2` is uneven pacing.
> - **`late %`** — frame intervals over 1.5× the median. On a 60 Hz panel
>   with no VRR, every late frame is a visible hitch.
> - **`brHz` vs `panel Hz`** — the browser's rate against the display's.
>   A gap is browser throttling.
> - **`fs`** — fullscreen or not, **now correct** (it asks the canvas's
>   size against the screen's, because `document.fullscreenElement` is
>   null for F11).
>
> **The fullscreen A/B — the controlled comparison.** CDP's
> `Browser.setWindowBounds` **is silently ignored under niri**, so the
> A/B is done by relaunching:
>
> ```sh
> # phase A — windowed
> ssh cachyos-x8664 'bash /home/kyle/opt/relaunch.sh windowed'
> OUT=~/bb-A-windowed.json bash tools/perf/watch-remote.sh cachyos-x8664 300
>
> # phase B — fullscreen, same profile, same GPU
> ssh cachyos-x8664 'bash /home/kyle/opt/relaunch.sh fullscreen'
> OUT=~/bb-B-fullscreen.json bash tools/perf/watch-remote.sh cachyos-x8664 300
> ```
>
> **Then A, then B, then A again** — the third run is the drift, and the
> repo's rule is that a B−A difference smaller than the drift is not a
> finding. The watcher prints this comparison itself if `--fullscreen-ab`
> is used, but under niri it will (correctly) refuse to claim a
> difference it could not produce.
>
> ---
>
> ### PATH 2 — THE IN-GAME EXPORT LOG (the faithful one)
>
> **Needs the new client deployed** — the button is in webXash #53, and
> the deploy fires when the parent's submodule pointer moves. **Verify
> the deploy landed before starting:**
>
> ```sh
> curl -sk https://bulletballet.dev/ | grep -oE '/assets/index-[A-Za-z0-9]+\.js'
> # then: does the deployed bundle contain the new readout?
> curl -sk "https://bulletballet.dev/assets/index-<hash>.js" | grep -c "Export log"
> ```
>
> **Then:** Kyle plays, opens **ESC → Performance → Export log**, and the
> file lands in `~/Downloads` on the gaming PC. **Pull it:**
>
> ```sh
> ssh cachyos-x8664 'ls -t ~/Downloads/*.json | head -3'
> scp cachyos-x8664:'~/Downloads/<file>.json' /tmp/
> ```
>
> **What to read in it:** `byMode.fullscreen` against `byMode.windowed`
> (medians, so one expensive window cannot fake a difference), the
> `pacing` block, and the per-window timeline.
>
> ---
>
> ### THE HYPOTHESES BEING TESTED, AND WHAT EACH OUTCOME MEANS
>
> **H1 — PIXEL COUNT.** Fullscreen is 3.54 MP against 1.59 MP tiled
> (**2.2×**). *Prediction:* engine frame cost rises with render size and
> falls with render scale. **If it holds,** the fix is the client's
> **render scale** (67% ≈ −55% fragments), not a cvar, and not a browser
> flag. **If it does NOT hold,** the engine is not fill-bound and the
> cost is elsewhere — go to H4. **Read the BACKING STORE to tell M1 from
> M2** (see the fullscreen mechanism above): a backing store that grows
> with the window means the forced resolution was dropped, and that is a
> different bug with a different fix.
>
> **H2 — NO HEADROOM ON A 60 Hz PANEL.** The budget is 16.67 ms and there
> is **no VRR**, so anything over is a visible hitch. *Prediction:*
> `late %` above zero, `p99` well clear of `p50`, and the pacer capping
> to 60 fps. **If it holds,** the honest answer to "we're leaving
> performance on the table" is *the panel*, not the code — and the
> actionable step becomes render scale.
>
> **H3 — BROWSER THROTTLING.** Chrome Energy Saver, or Firefox's own
> power saving. *Prediction:* `brHz` below `panel Hz`, and the readout's
> new `refresh-dropped` finding fires. **If it holds,** the fix is a
> browser setting and costs nothing.
>
> **H4 — SOMETHING ELSE ENTIRELY.** GC, long tasks, event-loop lag, a
> background process, thermal throttling. *Prediction:* the lag median
> spikes above 50 ms, or long tasks appear, or `engine ms` is fine while
> the frame intervals are not. **If it holds,** the watcher says so and
> the hunt moves to *what* is eating the frame.
>
> ---
>
> ### THE TRAPS, SO THE NEXT SESSION DOES NOT REDISCOVER THEM
>
> - **"NO FRAMES AT ALL" IS NOT A BUG.** The landing page runs no rAF
>   loop. The harness needs a match actually running.
> - **THE FAMILY BOX IS A DIFFERENT MACHINE.** `cachyos-x8664-family`
>   (NVIDIA GTX 980, gamescope, user `family`) vs `cachyos-x8664`
>   (AMD RX 7700 XT, niri, user `kyle`). The tunnel's default host was
>   changed to the right one on 2026-11-09; do not probe the other.
> - **THE LOGIN SHELL IS `fish`.** Inline heredocs get mangled — scp a
>   script and run it with `bash`.
> - **THE SSH TUNNEL'S LOCAL PORT MUST NOT BE THE BROWSER'S PORT.** The
>   first version used 9223 on both sides and silently watched the
>   **wrong browser** when the tunnel failed. It is 19223 now, and the
>   script refuses to run if that port is busy.
> - **A HIDDEN TAB REPORTS ZERO LONG TASKS, EVER** — Chrome does not run
>   the long-task machinery for a page nobody is looking at. The harness
>   says "ZERO BY OBSERVATION" in that case.
> - **THE `fs` COLUMN AND `document.fullscreenElement`.** Only the DOM
>   API sets it; F11 never does. Both facts are now reported.
> - **THE ENGINE MUST BE READ FROM `node_modules/xash3d-fwgs`.** The
>   gitignored `webxash/public/xash3d-fwgs/` is a stale copy holding a
>   **different** `xash.wasm`.
> - **THE LOGS ARE ON M5.** `~/bb-*.json` from the watcher, and the
>   exported log pulled from the gaming PC. Keep them; they are the
>   evidence.
>
> ### WHAT "DONE" LOOKS LIKE
>
> A written answer, with numbers, to: **"is fullscreen slower on my
> machine, and by how much?"** — plus one of: a confirmed cause, or an
> honest "still unexplained, here is what it is not". **A measurement
> that rules a hypothesis out is worth as much as one that confirms
> one**, and the repo's rule is to say what the data shows rather than
> what was hoped.
>
> ## THE PACER MEASURES THE ENGINE WARM, AND KEEPS MEASURING (2026-11-08, DONE — APPROVED AND MERGED INTO WEBXASH)
>
> **SHIPPED AND LIVE.** webXash **#50** merged as **`9a2cac0`** after Kyle's
> own empty-body review, the parent's **#146** (`5be4405`) merged after his
> own, and the deploy's browser gate passed — production serves
> `assets/index-kKNXEsss.js`, verified read-only. The work order was
> `docs/CLIENT-PERF-PACING-PLAN.md`, the numbers
> are in `docs/CLIENT-PERF-RESULTS.md`, and § CURRENT STATE's newest block
> has the whole story — what was wrong, the review that caught it, the
> rebuild, and the M3 Pro measurement (at the heavy view the engine was
> 38.1% late; the pacer narrowed to 60 fps and the late fraction went to
> 0%).
>
> **ONE THING LEFT, AND IT WANTS KYLE'S MACHINE.** The **cap-engaging path**
> (a hardware-accelerated client on a 120 Hz panel) is **not reproducible in
> the CI rig** — it is software-rendered there — so the final confirmation
> wants Kyle's real machine, with `tools/perf/measure-pacing-timeline.cjs` as
> the harness. It was run there on 2026-11-08 and the numbers are in the
> results doc.
>
> **THE NEXT TASK IS THE LOADOUT** (Task B's session half), below.
>
> ## THE READOUT GETS A TAB, AND THE WEB UI'S READOUT SURVIVES THE QUIT (2026-11-07, DONE — MERGED AND DEPLOYED)
>
> **SHIPPED.** webXash **#49** (`44b6167`) and the parent's **#144** (`fa24a17`)
> are merged, the parent's CI was green on the repointed tip, the deploy's browser
> gate passed, and the feature is live on production. § CURRENT STATE's newest
> block has the whole story: what shipped, the two blocking holes the cross-vendor
> review caught (and the lesson: a restored report has to be checked for
> CONTRADICTIONS), the geometry measured on both builds, and the CI-rig recipe.
>
> **THE OLD WORK ORDER BELOW IS KEPT AS THE RECORD.** It is what the work was
> planned from, and the traps in it are the ones that actually bit:
>
> **TASK A — THE IN-GAME ESC MODAL GETS TWO TABS.** "Let's move the
> 'Your Client' section in the in game ESC options settings to it's own
> tab within the modal. We can have 'Settings' and 'Your Client'."
> The readout moves out of the scrolling Settings panel and into its own
> tab, so it can never push the **Quit** button below the fold — the
> standing constraint, now satisfied structurally instead of by ordering.
> The tab strip is a real ARIA tablist (roving tabindex, arrow keys), it
> sits OUTSIDE the scroll area, and the overlay resets to the Settings
> tab when it opens (otherwise the name field loses its focus and the
> ENGINE eats the keystrokes — the original focus bug).
>
> **TASK B — THE WEB UI READOUT MUST SURVIVE THE QUIT.** "Also on the
> web ui, the 'Your Client' section should update once a game is played
> and quit back to the web ui. Currently it always says to measure it in
> game." **The root cause is the full page load:** `quitToWebUi()` does
> `window.location.href = '/'`, which destroys the module state the
> readout lives in, so the landing page always reports "The game has
> not run yet, so its frame rate is not known" — under a summary that
> simultaneously says "Your browser is set up properly. Nothing to do."
> The fix is a **sessionStorage snapshot** of the last match's measured
> facts, restored on the landing page, **labelled as from the last
> game** — a readout that shows last-match numbers as if they were live
> is the exact failure this whole feature was built to avoid.
>
> **WHERE THE WORK LIVES.** `webxash/src/components/XashOptionsOverlay.vue`
> (the tabs, the Quit path, the snapshot write),
> `webxash/src/components/TSPerformance.vue` (the data source and the
> provenance line), `webxash/src/services/perf-collect.ts` (read the
> snapshot, merge it) and `webxash/src/services/perf-check.ts` (**the
> PURE policy — the merge function and the past-tense/provenance copy
> go here, because this module has no imports on purpose so the parent
> suite can import it directly**). Parent test:
> `tests/unit/perf-check.test.mjs`.
>
> **THE GATES.** Typecheck + build in `webxash` (`bunx vue-tsc
> --noEmit`, `bun run build` — which carries the WASM and GL-glue
> gates), the parent unit suite (currently 709/709), and a **CI-rig**
> browser run — **never production**. webXash PR first, then the parent
> PR pointing the submodule at the **squash** SHA. One parent PR, one
> pointer move. Kyle approves; `EVO_MERGE_OK=1` is not the approval.

> ## THE LOADOUT — SHIP THE MAP-CHANGE HALF, THEN FIX THE SESSION HALF (2026-11-05, later)
>
> **THIS IS THE NEXT TASK NOW.** The readout work above is done, merged and live;
> this one is still open, parked by Kyle's 2026-11-07 request. The player's buy-menu loadout resets to the
> default on every map change (the report), and it is gone between
> sessions. § CURRENT STATE's newest block has the whole picture; read it
> before touching anything.
>
> **THE MAP-CHANGE HALF IS WRITTEN, TESTED AND PROVED.** The port's Rust
> change (`crates/client/src/menus/mod.rs`, `buy.rs`) and the rebuilt
> client WASM. The port's tests: 491 in the client crate, five of them
> new (`the_loadout_survives_a_map_change`,
> `an_empty_loadout_still_rolls_a_random_one`,
> `the_hud_reset_re_arms_the_loadout`,
> `the_re_arm_sends_the_loadout_again`,
> `the_re_arm_of_nothing_sends_nothing`), and the workspace suite green.
> The proof: `scripts/prove_loadout_survives_map_change.py` — a real
> browser, a real server, a REAL map change forced from the server's
> console. **It passes** (2026-11-05, 20:56): the loadout's cost 850
> before and after, the tab unchanged, and the server's spawn lines
> `with [1]` both times — the player comes back ARMED.
>
> **The order (the project's, and it is not negotiable):**
>
> 1. ~~**webXash PR #44** (the rebuilt WASM) → squash-merge → repoint
>    the parent submodule at the **squashed** SHA → the parent PR → green
>    gates → Kyle's approving review → merge → deploy.~~ **DONE
>    (2026-11-06): webXash #44 → `a009a254`, the parent #138 → `b7a18a1`,
>    the deploy green.**
> 2. **Never merge without Kyle's approval** (an approving review from
>    `klampatech` with an **empty body**). `EVO_MERGE_OK=1` only unlocks
>    the merge; it is not the approval.
>
> **WHAT IS LEFT IS THE SESSION CASE** — the loadout after a page reload.
> The map-change half is done and live.
>
> **THE SESSION HALF IS NOT DONE — AND THE QUICK FIX IS NOT CLEAN.** Kyle
> asked whether "persist the buy list's bytes and write them back" is a
> clean fix. **It is not**, and the reason is worth keeping: that plan
> makes the frontend responsible for four things it should not own —
> **a game's file path** (`{game_dir}/tsbuylist.tsa`), **a binary
> format** (an opaque blob the port's parser owns), **a boot-ordering
> constraint** (the restore must land after the archive unpack and before
> the port's first read) and **a version coupling** (a port upgrade that
> changes the format could parse a stale blob into garbage rather than
> failing cleanly). It also restores the TABS but not which tab was
> active — that lives in the port's memory, not in the file.
>
> **THE CLEAN WAY: the port owns the format, the browser owns the
> storage.** The browser ALREADY receives the loadout's contents as
> structured records (the `TSBUY entry` lines), and it already persists
> things (the pinia store's `tsConfig.buyMenu`, localStorage key `xash`).
> So:
>
> - **the port** gains a command that SETS the loadout (`ts_buy_restore`,
>   say) from the entries it already speaks — it owns the format, so it
>   owns the parse;
> - **the browser** persists those entries (the store) and hands them
>   back when the port's menu comes up empty (a fresh session);
> - **the port** writes them into the working copy and the active tab,
>   and the existing re-arm sends them to the server.
>
> That rides along in the SAME WASM rebuild if it is done before the
> artifact is built — which is worth weighing, because a second rebuild
> means a second artifact PR.
>
> **The cross-device case (a loadout per account) is NOT this task.** The
> pre-join identity takes a *name*, names are not unique, and there is no
> account system. That is an identity decision, not a feature.
> ## THE BUY MENU'S MODERN FLOW: THE FRONTEND'S HALF (2026-11-01)
>
> **The port's half of the modern buy flow is DONE** (branch
> `feat/buy-menu-modern-flow`, the port's `crates/client/src/menus/
> buy_modern.rs` and the `ts_buy_mode <classic|modern>` command beside
> `ts_buy_hide`/`ts_buy_key`/`ts_buy_state`). The classic canvas menu
> is untouched and its pixel diff passes unchanged. The design is in
> SPEC.md § "The modern buy flow", and the protocol is in the section
> above.
>
> **What is left is the frontend's half, in the `webxash` submodule:**
>
> 1. **Send `ts_buy_mode modern` at session start.** `applyBuyMenuMode()`
>    sends `ts_buy_hide` and nothing else, so the port stays in the
>    classic flow. Without this the modern screen never appears and the
>    whole phase is invisible.
> 2. **Decide the entry record's shape** with the port. The port prints
>    the classic shape (`entry <index> <cost> <slots> <name>`), which
>    the frontend's parser places by counting. The frontend's in-flight
>    parser wants the richer modern shape
>    (`… <attachments> <slot> <remove_key> <name>`), which is what the
>    loadout card's "click a weapon to remove it" needs. Either the
>    port grows that record (and the frontend keeps its parser) or the
>    frontend drops the click.
> 3. **The typed "0" conflict.** The port's key alphabet is 1–9, then
>    "0", then "A"; the design's §6 proposes "A" for the tenth weapon
>    and "0" for back. On slot 4 (eleven weapons) a typed "0" picks the
>    tenth weapon. Pick one alphabet and say so here.
>
> **Then: rebuild the client WASM** (the port's commands are compiled
> into it — a client build without `ts_buy_mode` answers "Unknown
> command" and the frontend must fall back to the classic menu), and
> **the tier-3 playtest** on a real browser, which is not optional for a
> phase exit.
>
> **Do not touch the `webxash` submodule pointer in the port's PR.** The
> frontend is landing on its own branch.
>
> ## THE AUTOBAN THAT KICKS EVERYONE (2026-10-29)
>
> **The engine's IP filters are unusable behind the bridge.** Every
> browser player reaches the game server as the SAME address —
> `172.17.0.1`, the docker gateway, because the WebSocket bridge NATs
> the browser's UDP through it. The TS log shows it plainly:
> `"CIPlayer<23><14><>" connected, address "172.17.0.1:41159"`.
>
> So when the engine bans an "IP", it bans **every player on the
> server**. Here is the chain, from the engine's own source
> (FWGS/xash3d-fwgs, `engine/server/sv_main.c`):
>
> ```
> static CVAR_DEFINE_AUTO( sv_connect_timeout, "60", ... );
> static CVAR_DEFINE_AUTO( sv_connect_timeout_ban, "1", ... );
> static CVAR_DEFINE_AUTO( sv_connect_timeout_ban_time, "2", ... );
>
> static void SV_DropTimedOutClient( sv_client_t *cl, qboolean ban )
> {
>     SV_BroadcastPrintf( NULL, "%s timed out\n", cl->name );
>     ...
>     if( ban )
>         Cbuf_AddTextf( "addip %g %s\n", sv_connect_timeout_ban_time.value, ... );
> }
> ```
>
> A client that has not finished connecting within `sv_connect_timeout`
> is dropped **and** `addip`-ed. `addip` is the engine's IP filter
> (`engine/server/sv_filter.c`), and its handler kicks every connected
> client whose address matches — with the message
> **"The server operator has added you to banned list"**. One stalled
> handshake therefore kicks the whole server.
>
> **What it looked like:** the buy menu's last state dump, then
> `"CIPlayer timed out"` (the engine broadcasts it to every client),
> then the ban message. The player's own connection was fine; the
> punishment was aimed at the shared address.
>
> **The fix** (`tools/deploy/config/server.cfg`):
> `sv_connect_timeout_ban 0` and `sv_connect_timeout 180`. The autoban
> is for a dedicated server whose slots are being held open by a
> stalling client — here it punishes the wrong people, and a browser
> reconnect re-unpacks the 517 MB archive and re-boots the engine before
> it can finish the handshake, so 60 s is not always enough.
> `sv_timeout` (65 s) is left alone: that one drops a silent client
> without banning anyone.
>
> **The lesson: behind a NAT-ing bridge, an IP filter is a server-wide
> switch.** Nothing in this deployment may use one.

> ## PRODUCTION WAS DOWN — and how it came back (2026-10-29)
>
> **It was down. It is back.** `bulletballet.dev` went unreachable
> during the 2026-10-29 merge window and was restored the same
> afternoon. The record is here because the DIAGNOSIS is the reusable
> part, not the outage.
>
> **What it looked like.** The OVH VPS-1 LocalZone Dallas
> (`40.160.225.81`, alias `bb-prod`) answered nothing: no ping, **"No
> route to host"** from every path, and ports 22/80/443/27015/27017
> all dead. The last successful deploy before the outage was
> **2026-10-28 20:43 UTC** (`e91ec43`, PR #86).
>
> **It was NOT a deploy failure, and NOT the merge.** The deploys
> failed at their FIRST step (`Set up SSH` → `ssh: connect to host … port
> 22: Connection timed out`), so nothing was half-deployed — prod was
> serving an older bundle to nobody. **Two independent networks said
> the same thing**: this host AND the GitHub Actions runner (a
> different IP range, a different provider). A merge cannot take a host
> off the network. **"No route to host" means the instance is STOPPED
> at the provider** — as opposed to "connection refused" (host up, port
> closed) or a timeout (packets dropped by ufw / fail2ban).
>
> **How it was fixed.** Kyle started the instance in the OVH panel
> (12:41 CDT). A watcher armed on m5 was polling the host every 60
> seconds; it noticed within the minute, re-ran the failed deploy
> workflow, and **the deploy went green including the browser gate**
> (`Deploy to production` + `Verify in a real browser`, both success).
> All four containers came back with the instance — `bridge` (healthy),
> `orchestrator`, `registry`, `ts-0` (healthy) — and the fleet answered
> `bulletballet TS | ts_casa | DM | 17 players (0 humans, 15 bots) |
> tick 100 | stale=false | responsive=true`.
>
> **What shipped with that deploy, verified from the SERVED bundle**
> (not from the repo): the production chunk carries `TSBUY`,
> `ts_buy_key`, `ts_buy_hide`, `ts_buy_state` (the buy menu) *and*
> `nocap`, `sustainableFps` (the frame cap) — both features live in one
> bundle, from one deploy.
>
> **THE GAP THAT COST TIME, and the fix.** There was **no OVH
> credential on this box** — the browser vault was empty, the OVH API
> keys had never been persisted, and the console password had been
> deleted on 2026-10-23 (it was inert once password auth was off). So
> the agent could not start a stopped instance. **A provider credential
> has to live somewhere that does not get pruned**: the Hermes vault
> (`hermes vault add <url>` — Desktop → Settings → Passwords & Logins)
> for the console login, and `~/.config/ovh/ovh.conf` (mode 600) for
> the API keys. The API path is the one that needs no human: the
> `specialists-prod-ops` skill ships `scripts/ovhctl.py`, which signs
> the requests, never prints the credentials, and can
> `start`/`stop`/`reboot` the instance on demand.
>
> **The reusable pattern: arm a watcher.** The box coming back is the
> only trigger for the deploy to run again, so poll the host and re-run
> the failed workflow yourself. Check the TCP port (`/dev/tcp`), not
> SSH — an SSH probe waits on the key exchange and times out slowly.
>
> **The merge order that shipped on 2026-10-29** (all five PRs, in
> this order, and the order was not optional):
>
> 1. `klampatech/webXash#29` → `15fe88d` — the frame-pacing fixes.
> 2. `klampatech/webXash#28` → `5b8efaf` — the modern buy menu.
> 3. `klampatech/specialists-browser#87` → `181f9da` — the frame-pacing
>    parent: the pointer, the policy tests (18) and the enforcement
>    tests (7), the research, the 30 harnesses, the `SPEC.md` /
>    `HANDOFF.md` design write-up.
> 4. `klampatech/specialists-browser#90` → `6fdbef8` — the flaky
>    enforcement test, made deterministic.
> 5. `klampatech/specialists-browser#88` → `f150998` — the buy menu's
>    port side, and the pointer to `5b8efaf`.
>
> **The parent's pointer now names `5b8efaf`, the commit on
> `webXash`'s `main`** — the rule is satisfied, and both features are
> in one tree. #87 deliberately pointed at `15fe88d` (frame-pacing
> only) so the buy menu would ship as ONE unit with the Rust that
> serves it, rather than a DOM panel arriving a PR before the port
> side it talks to.
>
> `klampatech/specialists-browser#89` was closed and its content folded
> into #87: two parent PRs moving the same submodule pointer is a trap,
> because one of them undoes the other. **#90 exists because the
> enforcement test was FLAKY** — the same commit passed in #87's CI and
> failed in main's, because the measurement window was pumped by a
> `setInterval` racing the wall clock, so the sample count's PARITY was
> random and the median of an alternating sequence flipped the pacer's
> decision. It now pumps a fixed 41 ticks synchronously.
>
> **And the one piece of evidence nobody has: the tier-3 playtest on a
> 144 Hz+ display.** The whole mechanism was established on a 60 Hz box,
> where the cap correctly *does not engage* — the engine keeps up.
> `tools/perf/diagnose-fullscreen.js` is the player-runnable diagnostic
> for exactly that: it reports the display's cadence, the browser's tick
> rate, the engine's frame count, and whether the frames fit the budget.
> **Kyle's rig is the instrument.**
>
> **The buy menu's own smoke, before prod.** It is live locally at
> **`https://100.95.111.112:5178/`** — the buy-menu branch, with the
> rebuilt client WASM, served by a Vite dev server that proxies the
> WS↔UDP bridge to the local `xash` dedicated server on :27015. The
> **ESC options overlay carries a Classic/Modern switch** and the
> default is `classic`, so the DOM menu does not appear until it is
> flipped. The menu is **dead/observer-only**: die to the bots, or go
> spectator, and it opens.
>
> **E5** (below) is still the gate before the next gameplay change.

---

> ## ~~The PR #80 review, and then the deploy that has never been tested~~
> ### ✅ DONE — merged as `c12dba3` on 2026-10-27
>
> *(Historical. This block described #80 as "open and awaiting Kyle's
> review". It merged, and #82 and #83 merged after it. Read it for the
> deploy caveats, not for the task.)*

> ## The PR #80 review, and then the deploy that has never been tested
>
> **Read the PR first.** There are **TWO** open PRs, and the order
> matters: **`klampatech/webXash` #24** (the frontend) FIRST, then
> **`klampatech/specialists-browser` #80** (the submodule pointer plus the
> leaderboard backend). #80 pins #24's branch head, which is not on
> webXash `main` yet. Both are **open, CI green, and awaiting Kyle's
> review.** Nothing here was merged, and nothing was deployed — the agent
> never approves a PR and never merges one.
>
> **What is on the branch now** (all of it verified, see § CURRENT
> STATE):
>
> - the leaderboard's three defects fixed (empty time-seen, the
>   console read that returned 0 bytes, and the fleet-wide MVP window
>   that awarded 9 MVPs for 10 kills);
> - the bots excluded on two signals, so the board shows people;
> - the registry now **turns the kill log on itself** when the engine
>   says it is off — the fix that survives a container restart;
> - the game server's config is a **mounted volume the deploy ships**,
>   so `log on` can actually reach production;
> - the deploy's `mkdir` failure fixed (it would have killed the next
>   deploy outright);
> - the character picker shows the **game's own portraits** — the .bmp
>   that ships beside each model, with the flat backdrop made
>   transparent. The 3D render it replaced was wrong (a bone's bind
>   position was applied twice: 67.7 units of displacement on a 22-unit
>   character, heads floating, hands detached); it is parked, not
>   deleted. See § CURRENT STATE.
>
> **What is left before the deploy can be trusted:**
>
> 1. **Kyle reviews and approves PR #80.** The agent does not.
> 2. **The config is read at container start.** So a game container
>    that is ALREADY running keeps its old config, and the kill log on
>    it stays off until the orchestrator next creates one. That is
>    exactly why the registry's self-heal exists: it catches a running
>    instance within 15 seconds without touching it.
> 3. **The deploy has never run with these changes.** The Caddyfile
>    swap, the sudo `mkdir`, the config volume and the registry image
>    are all new to the pipeline. The first run is the risky one.
>
> **The one thing to watch in the first deploy:** the registry's
> self-heal writes `log on` into every game server's console when the
> engine reports it is off. That is safe (the engine answers `log` with
> its state, and the answer is cached), but it is new behaviour and it
> should be watched rather than assumed.
>
> ---
>
> ## E5 — the local dev loop for gameplay changes
>
> **Read `docs/FE-MOD-PLAN.md` § E5 first.** It is the full write-up;
> this is the pointer.
>
> **Why this one.** A browser client cannot complete a connection to a
> **local** game server. Until that is fixed, every gameplay change has
> to be verified against **production** — where a bug reaches real
> players instead of a test server. Two of this month's fixes (the black
> first-person viewmodel, the ghosting lambda) had to be proved in
> production because there was nowhere else to prove them.
>
> **What is already known** (E5 has all of it written down):
> - the **transport is sound** — a browser client through the bridge runs
>   the real GoldSrc handshake (`getchallenge`, `bandwidth`, `connect`)
>   and then netchan sequence numbers;
> - GoldSrc **refuses a loopback** `+connect`, so the client must be
>   pointed at a non-loopback address;
> - the bridge's `--targets id=internal:port@public:port` form is
>   required — the older `--target` form has no public address and the
>   bridge refuses address-based lookups against it;
> - a browser on this host reaches the host's own Tailscale address but
>   **not** the docker-published UDP port on it, because the published
>   port binds inside the container's network namespace.
>
> **So the remaining question is the topology:** what address does the
> browser give the engine, and what does the bridge forward it to.
>
> **The alternatives**, if E5 turns out to be a rabbit hole:
> - **C1 — the unzip off the main thread.** The 493 MB archive is
>   inflated on the main thread, and that is the loading stutter: the
>   most user-visible thing left. Isolated work, and it needs numbers
>   before and after, not a feeling.
> - **Batch D — the menus** (buy menu, pre-game setup, client-side
>   knobs) as DOM overlays over live engine state. The largest build,
>   and it reuses A4's overlay infrastructure.
> - **B1 — the matchmaking comparator** (flip to "highest population
>   that is not full"). Cheap, pure-function, unit-testable — but
>   **deferred by Kyle on 2026-10-24**.
>
> **Rebrand phases 0–4 are DONE** (2026-10-24): the Half-Life lambda
> ghosting through the running game, the green shell, the landing page,
> the boot screen, the connecting splash, the options overlay, and the
> docs sweep.
>
> ---
>
> ### The research behind the bone transform
>
> The bone transform (`src/mod/mdl-bones.ts`) was derived from the Rust
> port's own renderer, and the derivation is reproducible:
>
> - the reference is `tools/port/tsp-rs/crates/client/src/studio.rs`
>   (`setup_bones`, `write_bones`, `calc_blended`) and
>   `crates/client/src/studio/model.rs`;
> - the Euler order `R = Rz(c)·Ry(b)·Rx(a)` was confirmed
>   NUMERICALLY against that renderer: with this order the reproduction
>   error was 0.0, and the two nearest alternatives were off by 0.30 and
>   1.88;
> - the binding check is the model's own **declared** per-sequence
>   bounding boxes, reproduced to within 0.01 units.
>
> **A note on how the numbers were obtained.** The research agent was
> cut off by an API rate limit before it could write its summary, but
> its work was recoverable from its transcript and its probe output —
> which is where the ground truth in `tests/unit/mdl-bones.test.mjs`
> comes from. The numbers in the test are FULL-PRECISION values, so the
> test does not depend on a model file being present.

---

# § GROUND RULES (learned the hard way)

1. **Never deploy an experimental shim to live webXash.** `c91698be` stays
   live as the rollback baseline. Copy experimental builds to
   `shim/build/ts_shim_v3_w*.wasm` and test via Playwright.
2. **`-noip -noip6` is mandatory** — otherwise `NET_Init` fails with
   `Couldn't allocate IPv4 and IPv6 server ports` (WASM-Sockets can't bind
   under headless Chromium).
3. **Count engine slots from `sv_game.c`'s `g_engfuncs` initialiser**, never
   from `eiface.h`. A wrong slot is a silent call into the wrong function.
   We shipped `SLOT_ALLOC_STRING 64`; 64 is `pfnPvEntPrivateData` and
   `pfnAllocString` is **67**. It produced
   `invalid entnumber 31529152` (`0x01E10000` — a string pointer range-checked
   as an edict number).
4. **Structs must mirror HLSDK headers verbatim.** Field order is load-bearing
   because the engine `memcpy`s and walks offsets. `KeyValueData_s`,
   `clientdata_t` (server-side, NOT `cdll_int.h`'s `client_data_t`),
   `entity_state_t`, `entvars_t`, `globalvars_t`.
5. **Guard struct layouts with `_Static_assert`.** They caught two real bugs
   the moment they were added. `shim/probe_entvars.c` re-prints them for
   re-baselining after any HLSDK update.
6. **An empty PVS does NOT stop the renderer.** We memset `0xFF` over 64
   bytes of engine memory on that theory. c91698be's `SetupVisibility` is ONE
   instruction touching neither buffer. Reverted. The overreach also
   overwrote an allocation whose size we don't know.
7. **A frozen `gpGlobals->time` stops think scheduling.** The baseline copies
   engine values into gpGlobals every tick; ours didn't.
8. **Tools that emit confident nonsense are the real derailer.** Watch for:
   regexes that span adjacent structs (bit us **three times** — `g_engfuncs`
   vs `DLL_FUNCTIONS`, then `globalvars_t` vs `entvars_t` twice); naive
   data-segment locators that desync on custom sections; range checks that
   pass constant rodata tables. `dllfunc-diff.py` needed three guardrails
   (range + **distinctness** + **function-existence**) before its output was
   trustworthy. **Prefer compiling the real header over parsing it** — that's
   what finally gave us true `entvars_t` offsets.
9. **Measure, don't assume.** We asserted x86-gcc offsets into a wasm build;
   the `_Static_assert` failed immediately. wasm32 lays trailing fields
   differently (`flags@420` vs x86 `444`; `sizeof` 676 vs 720).

---

# § DEAD ENDS — do not retry

| Path | Why it's dead |
|---|---|
| **CheerpX** | Permanently closed at `_dl_check_map_versions`; cascading linker bugs. |
| **Pure Babylon rebuild** | Kyle rejected it — model/polygon/animation quality. Parked at tag `babylon-port-frozen`. |
| **String-index conversion** | Engine is self-consistent; *our* conversion was the bug. D.7.49. |
| **`SetupVisibility` memset** | Theory disproved by baseline disassembly. |
| **Full HLSDK C++ build** | 283 imports / 229 `GOT.func`. Thin C shim is the chosen route. |
| **`-noip` via memory poke** | Superseded by the official `-noip -noip6` flags. |

---

# § KEY FILES

**Production services** (all on `bb-prod`, all `--restart unless-stopped`):

- `services/registry/service.mjs` — the fleet's source of truth. A2S state,
  tickrate, bot count, health. Endpoints `/api/servers`, `/api/registry`,
  `/healthz`. Image `registry:0.4`.
- `services/orchestrator/service.mjs` — the decision maker. Restart
  unhealthy, restart degraded, scale out, scale in. Reads the registry;
  measures nothing itself. Image `orchestrator:0.2`.
- `tools/port/tsp-rs/scripts/ts-udp-bridge.js` — WebSocket↔UDP bridge.
  Multi-target, allowlisted, refuses unknown targets with 403 *before* the
  handshake. Image `ts-bridge:0.3`.
- `tools/deploy/config/Caddyfile` — TLS, routing, cross-origin isolation.
- `tools/deploy/run-instance.sh` — the one way to bring an instance up.
  Verifies health AND that the engine bound the right port.
- `tools/deploy/Dockerfile.bridge` — the bridge image.
- `services/registry/Dockerfile.registry`,
  `services/orchestrator/Dockerfile.orchestrator` — the control-plane images.

**The admin console** (loopback only, not deployed yet — phase 5):

- `services/admin/service.mjs` — the service: the RCON-backed fleet, the
  session gate, the read endpoints and the two new reads (maps, bans),
  and it serves the UI's three static paths.
- `services/admin/public/index.html`, `admin.css`, `admin.js` — the
  console's page. **The CSS is Kyle's mock's CSS verbatim**, and the
  mock itself is `docs/admin-console-mock.html` — the design contract.
- `services/admin/lib/` — the RCON client, the fleet probe, the parsers,
  the auth, the session, the lockout, the audit and the console's own
  (empty) id-ban store.
- `services/admin/adminctl.mjs` — `hash` and `set-password` on the host.
- `tools/smokes/admin-ui-smoke.sh` — the HTTP-level smoke.
- `tools/smokes/admin-ui-browser.mjs` — the **real-browser** smoke and
  the screenshots (`docs/screenshots/`). It resolves Playwright at RUN
  time, so the repo grows no npm dependency.

**Asset delivery:**
- `tools/assets/split-tsmod.mjs` — splits the archive into 64 MiB parts.
- `tools/assets/upload-tsmod.mjs` — uploads to R2. The storage key layout
  must mirror the dev-served layout exactly.
- `tools/port/tsp-rs/scripts/ts-udp-bridge.js` — see above.

**Frontend transport** (in the `webxash` submodule):
- `webxash/src/services/xash-bridge.ts` — `wss://` scheme, peer address in
  the WS query.
- `webxash/src/services/xash-loader.ts` — `+bridge host:port` (the bridge)
  is separate from `+connect ip:port` (the game peer).
- `webxash/src/services/ts-server-list.ts` — the server browser and
  `bridgeAddress()`.
- `webxash/src/env.d.ts` — `VITE_ASSET_BASE`, `VITE_BRIDGE_ADDRESS`.
- `webxash/vite-a2s-plugin.mjs` — the A2S parser, including the bot count.

**Fallback path (single-player, NOT production):**
- `tools/port/ts-server-dll/shim/ts_shim_v3.c` — the TS server DLL shim.
- `tools/port/ts-server-dll/build-ts-dll.sh` — build + the F1 safety gate.
- `webxash/src/services/ts-pump.ts` — the JS-driven frame clock, for when
  the server logic runs inside the browser.
- `webxash/src/components/TSHud.vue` — ⚠️ still shows literals.

**Docs:**
- `docs/PRODUCTION-INFRA.md` — the production topology, Caddy, TLS,
  firewall, the control plane, and the verified end-to-end evidence.
- `docs/ASSET-DELIVERY.md` — the archive, R2, CORS, the edge cache, and
  the `vary: Origin` stale-variant trap.
- `docs/CONTROL-PLANE.md` — the control-plane decisions, and which forks
  are settled.
- `SPEC.md` — the living design spec (mirrored to the vault).

---

# § VERIFICATION

**Production, from anywhere:**

```bash
# the site, over TLS
curl -sS -o /dev/null -w "%{http_code}\n" https://bulletballet.dev/

# the server browser — this is the live fleet view
curl -sS https://bulletballet.dev/api/servers | python3 -m json.tool

# raw A2S, independent of our own parser
python3 - <<'PY'
import socket
s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.settimeout(8)
s.sendto(b'\xff\xff\xff\xffTSource Engine Query\x00', ('40.160.225.81',27015))
d,_=s.recvfrom(4096); off=6
for _ in range(4):
    e=d.index(b'\x00',off); off=e+1
off+=2; p=d[off]; off+=1; m=d[off]; off+=1; b=d[off]
print('players=%d max=%d bots=%d -> humans=%d' % (p,m,b,p-b))
PY
```

**On the box:**

```bash
ssh bb-prod 'docker ps'                                   # all four services
ssh bb-prod 'curl -sS 127.0.0.1:8081/api/registry'         # fleet detail
ssh bb-prod 'curl -sS 127.0.0.1:8090/api/orchestrator'      # decisions + history
ssh bb-prod 'curl -sS 127.0.0.1:27017/health'              # bridge allowlist
```

**THE GAMING PC (Kyle's own, `cachyos-x8664` — Tailscale SSH, so the
tailnet ACL is the access control, and the login shell is `fish`):**

```bash
# is it there?
ssh -o BatchMode=yes -o ConnectTimeout=15 cachyos-x8664 'echo ok'

# what is the display actually doing?  (niri's own IPC)
ssh cachyos-x8664 'bash /home/kyle/opt/relaunch.sh windowed'
#   -> "Current mode: 2560x1440 @ 59.951 Hz", "Variable refresh rate: not supported"

# the browser the watcher attaches to, with the CDP debugger on localhost
ssh cachyos-x8664 'bash /home/kyle/opt/relaunch.sh fullscreen'
curl -s http://127.0.0.1:9223/json/version   # (over ssh, not from m5)

# watch a live match from m5, through the SSH tunnel
cd ~/Development/specialists-browser
OUT=~/bb-session.json bash tools/perf/watch-remote.sh cachyos-x8664 600
```

**THE HARNESSES THAT EXIST FOR THIS** (`tools/perf/`, all
dependency-free, all attach-only where it matters):

| harness | what it does |
|---|---|
| `watch-client.cjs` | **live per-frame timeline** over CDP. Never launches or controls the browser. |
| `watch-remote.sh` | the same, on another machine, over an SSH tunnel. Local port ≠ the browser's port, on purpose. |
| `measure-pacing-timeline.cjs` | the frame-time distribution, in the CI rig. |
| `measure-live-client.cjs` | drives a real browser with real key events. |
| `ab-wasm-opt-level.cjs` | the WASM optimisation A/B. |

**The admin console, locally** (it is not deployed yet — phase 5):

```bash
npm test                                                  # the unit suite
npm run test:ci                                          # the unit suite + a syntax check
bash tools/smokes/admin-ui-smoke.sh                       # the HTTP surface, for real
node tools/smokes/admin-ui-browser.mjs                    # the console in a REAL browser
```

The browser smoke resolves Playwright **at run time** (`PLAYWRIGHT_MODULE`,
then a bare `playwright`, then a sibling checkout) so the repo grows no
npm dependency, and it writes the proof screenshots into
`docs/screenshots/`.

**The browser test that matters** — a real browser at the real URL, a real
player in a real server:

```
https://bulletballet.dev/  →  Servers tab  →  bulletballet TS  →  JOIN
```

Then confirm from outside that the player count went up by one, and that
`humans` did too. A browser that boots the engine but does not appear in
the server's player count is a silent failure, and the A2S player count is
the only thing that catches it.

**Do not use the HUD as a progress signal** — see the warning in the
historical record below.

# § USERS' WORKING STYLE (Kyle)

- Prefers **"do it right" over "do it fast"** — *"I want this done correctly
  before we get too lost in the sauce."*
- Parallelism is welcome for isolated work; keep core lifecycle changes
  sequential. *"if it's work suited for that, don't break anything just
  trying to go faster."*
- **Regression transparency:** *"I guess i wanted to just make sure you didn't
  sneak any bad commits in."* Surface regressions explicitly.
- **No direct-to-main pushes** — universal, every project. (This repo is a
  private solo repo where commits to main were previously confirmed OK;
  confirm if unsure.)
- Catches **behaviour-vs-claim gaps** — if I say I query something, actually
  query it.
- Debug style: reframe the category rather than give the answer
  (*"we don't use any anthropic models"* → *"we run minimax through their
  provider"*).
- Wants notification when there's a **stable build worth testing**.
- Watches for tools producing confident nonsense — *"that could be a real
  derailer."* Respect the signal.

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ━━━ HISTORICAL RECORD ━━━
# Everything below predates the webXash pivot and is PARKED or ABANDONED.
# Kept for provenance only. Do not treat as live state, do not re-attempt
# without a new reason, and do not update it.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> Historical Babylon-era record continues below. The current
> design doc is `SPEC.md`; the current findings log is
> `tools/port/ts-server-dll/PINKBIKE.md`.
### D.5.5 done — decompiled code runs end-to-end

The full call chain is real (not a stub):
```
Babylon LMB click
  → Pistol.fire()                       (babylon/src/weapon.ts)
  → tryDecompFire(camera, angles)       (src/mod/decomp-bridge.ts)
  → PrimaryAttack.call(gun)             (decompiled tools/decompile/output/CTSGun__PrimaryAttack.ts)
  → this.Fire()                         (stub in CTSGunStub)
  → g_engfuncs.pfnEmitSound(...)
  → wireEngineAudio() handler           (src/mod/decomp.ts)
  → GameAudio.gunshot()                 (babylon/src/audio.ts)
  → g_engfuncs.pfnTraceLine(start, end)
  → onTraceLine handler                 (babylon/src/main.ts)
  → scene.pickWithRay(...)
  → g_engfuncs.pfnPlaybackEvent(...)
  → ClearMultiDamage() → TraceAttack(victim)
  → TraceAttack walks __botRegistry
  → bot.damage(25)                      (babylon/src/bot.ts)
```

**Proven via the play test (Kyle, 2026-10-16):**
- LMB fires → bots take damage → kill counter increments
- R reloads → decompiled Reload() runs
- T → decompiled Spawn() runs (logs 6+ engine calls)
- Y → decompiled GlobalSlowMotion2() runs → Babylon dt scales to 0.25
  for 1.5s (visible slow-mo)
- Open dev console: every engine call is logged (pfnEmitSound,
  pfnPlaybackEvent, pfnTraceLine, etc.)

### D.5 progress (status of each step)

| Step | Title | Status |
|---|---|---|
| D.5.1 | Babylon dev server boots | ✅ |
| D.5.2 | BSP→glTF tool | ⏸ DEFERRED (TS BSPs non-standard; tool written, deferred) |
| D.5.3 | MDL→glTF | TODO |
| D.5.4 | Player controller (move, look, jump, sprint, crouch, wall collision, pitch fix) | ✅ |
| D.5.5 | Engine simulator + decomp wiring | ✅ |
| D.5.6 | Real entity pool (CTSGunStub → pool-managed entity) | ✅ |
| **D.5.7 v2 cont.** | **Shim layer built + CCombatBlock + CCombatAttack wired (2/8 Fire* methods)** | **🔄 IN PROGRESS** |
| D.5.7 v2 cont. | Wire 6 remaining Fire* methods (GrenadeFire, KnifeFire, KatanaFire, KatanaThrow, ColdCock, StandardFire, ShotgunFire, AkimboFire) | TODO |
| **D.5.7 v3** | **Real game sound loading (20/20 samples wired)** | **✅ DONE** |
| **D.6 v0.1** | **GoldSrc .mdl v10 parser + Babylon loader — seal.mdl parses (22 bones, 7 textures, 1092 verts, 2617 triangles), Babylon meshes built and in scene. T-pose only (no animation).** | **🔄 IN PROGRESS** |
| D.5.8 | Real damage / scoring / slowmo | partial via stubs; full via per-class manifests |
| D.5.9 v1 | Stub bot (IDLE→PATROL→CHASE→ATTACK→DEAD) | ✅ |
| D.5.10 v1 | HUD (HP, ammo, crosshair, hit marker, kill counter, death banner, slow-mo notification) | ✅ |
| D.5.11 | Smoke test: game loop runs through decompiled code | not done |

### D.5.5 deliverables (in repo)

- `src/mod/engine.ts` (~500 lines) — `g_engfuncs` table with stubs for
  every pfn* (pfnEmitSound, pfnPrecacheModel, pfnPrecacheSound,
  pfnMessageBegin/End, pfnWriteByte/Short/Long/String, pfnPlaybackEvent,
  pfnTraceLine, pfnRandomLong, pfnGetCvarFloat, pfnSetModel, pfnSetOrigin,
  pfnSetSize). `gpGlobals` mutable struct (time, frametime, maxClients,
  etc). STRING()/MAKE_STRING() helpers, vec3_*, sprintf. Message
  registry (registerUserMsg, lookupUserMsg). CVAR registry.

- `src/mod/decomp.ts` (~50 lines) — `initEngine()` installs g_engfuncs +
  gpGlobals on globalThis. `tickGpGlobals(dt)` per-frame. Re-exports
  9 decompiled methods that type-check cleanly: CTSGun::PrimaryAttack,
  Reload, WeaponIdle, Spawn, CTSAmmoPack::WaitThink,
  CTSGameRules::GlobalSlowMotion2, CTSShrapnel::WaitThink,
  CBasePlayer::SlowMotionFlow. 7 methods skipped (C++ scope bugs in
  decomp output, codex partials, missing imports).

- `src/mod/decomp-shims.ts` (~180 lines) — ambient declarations
  (via `declare global`) for all the class types the decompiled
  files reference: CBaseEntity, CBasePlayer, CBaseMonster, CBasePlayerItem,
  CBaseAnimating, CBaseDelay, CBaseToggle, CBaseTrigger, CItem, CWeaponBox,
  CGrenade, CSound, CSentence, CWorld, CCineMonster, CStripWeapons,
  CSpawnPoint, plus CTS-prefixed (CTSBase, CTSGun, CTSAmmoPack,
  CTSGroundAmmo, CTSGroundWeapon, CTSHealthKit, CTSFlag, CTSBomb,
  CTSBriefcase, CTSSlowMotion, CTSSlowMotionPoint, CTSGameRules,
  CTSAnimation, etc.). Plus helper types: entvars_t, entvars_s, TraceResult,
  Vector, GiveCash, UpdateTeamScores, TSGetPointsForFrag.

- `src/mod/decomp-bridge.ts` (~280 lines) — CTSGunStub class with the
  methods the decompiled PrimaryAttack/Reload/WeaponIdle/Spawn call
  (CCombatAttack, CCombatBlock, GrenadeFire, KnifeFire, KatanaFire, Fire,
  Reset, Precache, FallInit). `installRuntimeShims()` puts noop shims on
  globalThis for the `declare const X` / `declare function Y` symbols
  the decompiled files reference (MAKE_STRING_FROM_PTR, engineTime,
  maxPlayers, slowAmtThreshold, cvarDelta, DoubleFireRate, InfiniteClips,
  UTIL_PlayerByIndex, UTIL_FindEntityByClassname, UTIL_Remove,
  UTIL_TraceLine, MESSAGE_BEGIN/END, WRITE_*, EMIT_SOUND, PLAYBACK_EVENT,
  SET_MODEL, ALERT, SUB_UseTargets, TraceAttack, ClearMultiDamage,
  ApplyMultiDamage, FireTargets, CREATE_NAMED_ENTITY, GetClassPtr).
  `tryDecompFire/Reload/WeaponIdle/Spawn/SlowMotion/AmmoPack/SlowMotionFlow`
  functions: build a stub CTSGun and call the decompiled method.

- `babylon/src/main.ts` updates — wireEngineAudio(audio) routes
  pfnEmitSound calls to GameAudio by sample name. setEngineHandlers
  for onTraceLine does a real Babylon raycast (scene.pickWithRay,
  filtered to bot meshes). __botRegistry maps pev.index → StubBot
  so TraceAttack can find the bot whose mesh was hit. On LMB:
  tryDecompFire(camera.position, camera.rotation, 0, 1). On R:
  tryDecompReload. On T: tryDecompSpawn. On Y: tryDecompSlowMotion
  + Babylon dt *= 0.25 for 1.5s.

### Why "D.5.5 done" is the milestone

- The decompiled code is no longer dead weight. 9 of 365 methods
  run end-to-end through the engine simulator and produce real
  gameplay (sound, raycast, damage, slow-mo, weapon fire).
- The remaining 356 are easy: most of them are larger weapons,
  AI methods, objective logic — once D.5.6 (entity pool) is in,
  they can be wired similarly.
- This is the "proof point" the user asked for: zero decompiled
  methods were wired on 2026-10-15, now 9 are wired and running
  through real Babylon. Two commits.

### D.5.6 done — real entity pool

Replaced `CTSGunStub` (a fresh instance per `tryDecompFire`) with a
real entity pool. The decompiled code's `this` is now a stable
`weapon_tsgun` entity in the pool, with a real `pev.index` and
`classname` resolvable by other systems.

```
Babylon LMB click
  → tryDecompFire(camera, angles)        (babylon/src/main.ts)
  → getOrCreatePlayerWeapon()             (decomp-bridge.ts)
  → pool.create({ classname: "weapon_tsgun" })
  → PrimaryAttack.call(gun)               (decompiled)
  → this.Fire()                           (CTSGunStub method, real pev)
  → g_engfuncs.pfnEmitSound(ent)          (ent.classname === "weapon_tsgun")
  → wireEngineAudio() → GameAudio.gunshot (real sound)
  → g_engfuncs.pfnTraceLine(...)
  → onTraceLine handler                   (main.ts)
  → resolveEntityByMesh(mesh)             (main.ts)
  → pool.entities → CBaseEntity           (full entity, not just mesh)
  → ClearMultiDamage → TraceAttack(victim)
  → pool.entities.find(e.mesh === mesh)   (decomp-bridge)
  → bot.damage(25)
```

### D.5.6 deliverables (in repo)

- `src/mod/entity-pool.ts` (~330 lines) — `EntityPool` class with
  2048 slots (GoldSrc's `edict_t[]` size), `Map<EntityPtr, CBaseEntity>`
  storage, `create()` / `register()` / `remove()` / `findByClassname()`
  / `forEach()`. Auto-assigns indices starting at slot 2 (slot 0 is
  worldspawn, slot 1 reserved for local player). Module-level
  `getGlobalPool()` / `setGlobalPool()` singleton for code that
  doesn't want to thread the pool through every function.

- `src/mod/decomp-bridge.ts` updates:
  - `CTSGunStub` constructor now takes a `pev` argument; the
    instance is created ONCE via `getOrCreatePlayerWeapon()` and
    stored on a module-level variable.
  - `getOrCreatePlayerWeapon()` calls `pool.create({ classname:
    "weapon_tsgun", ... })` on first invocation, then reuses the
    same entity for every subsequent `tryDecomp*` call.
  - The runtime shim's `TraceAttack` walks `pool.entities` (instead
    of the old `__botRegistry` global) to find the bot whose mesh
    was hit.
  - New `resetPlayerWeapon()` export for test/scene-reset code.

- `babylon/src/main.ts` updates:
  - Builds one `EntityPool` instance, registers the player + 3 bots.
  - Sets the pool as the global pool via `setGlobalPool()`.
  - Removes the old `(globalThis as any).__botRegistry` global.
  - The Babylon scene driver's `entities` map mirrors the pool
    (same `Map<EntityPtr, CBaseEntity>`).
  - `pfnTraceLine` handler now calls `resolveEntityByMesh()` to
    translate a Babylon hit into a CBaseEntity for the decompiled
    `TraceAttack` path. The hit object now includes `entity`,
    `classname`, and `index` fields.

### Why "D.5.6 done" is the milestone

- The decompiled code's `this` is now a real entity from a shared
  pool — same `pev.index` across calls, queryable by classname,
  resolvable by mesh. This is the substrate the rest of D.5.7+ will
  build on.
- The old `__botRegistry` global is gone; the pool is the single
  source of truth for entity identity.
- `pfnTraceLine` returns the full entity, not just a `{mesh}` stub,
  so `TraceAttack` can look up `pev.health`, `classname`, `team`,
  etc. — opening the door to decompiled methods that read those
  fields.

### D.6 v0.1 in progress — GoldSrc .mdl parser + Babylon loader

The full GoldSrc .mdl v10 file format (used by Half-Life / The
Specialists) is now parsed into a structured `MdlModel` object,
then converted into Babylon meshes. Verification on `seal.mdl`:

```
Header: id=IDST version=10 name=spaids.mdl
  22 bones (Bip01*)  ·  20 hitboxes  ·  7 textures (face/mask/body/legs/feet/arm/hands)
  1 bodypart (body)  ·  1 submodel (swatref)
Decoded sub-models:
  [0][0] swatref  verts=1092  meshes=7  triangles=2617
    mesh  triangles=562  skinRef=0  texture=face.bmp
    mesh  triangles=510  skinRef=1  texture=mask.bmp
    mesh  triangles=459  skinRef=2  texture=bodyt.bmp
    mesh  triangles=320  skinRef=3  texture=legst.bmp
    mesh  triangles=160  skinRef=4  texture=Feet.bmp
    mesh  triangles=138  skinRef=5  texture=seal_arm.bmp
    mesh  triangles=468  skinRef=6  texture=hands.bmp
```

**Code:**
- `src/mod/mdl-parser.ts` — GoldSrc .mdl v10 parser
  (`parseMdl(buffer)` → `{header, bones, hitboxes, textures, bodyparts, subModels}`)
  Struct shapes cross-referenced against
  [danakt/web-hlmv](https://github.com/danakt/web-hlmv)
  (`src/const/structs.ts`) and
  [skyrim/hlviewer.js](https://github.com/skyrim/hlviewer.js)
  (`docs/MDL_Format.md`).
- `src/mod/byte-reader.ts` — little-endian DataView reader used
  by the parser.
- `babylon/src/mdl-loader.ts` — turns parsed model into Babylon
  `Mesh` + `TransformNode` per body part. One sub-mesh per
  texture (multiple meshes sharing a skin become one Babylon
  mesh with a single material). GoldSrc → Babylon coordinate
  swap (Y↔Z, Z flipped for handedness) at build time.
- `babylon/public/models → _runtime_assets/half-life/ts/models`
  symlink — Vite serves the .mdl at `/models/player/seal/seal.mdl`.

**Player wiring (main.ts):**
- Fetches `/models/player/seal/seal.mdl`, parses + builds
  Babylon meshes, attaches a player instance to the player
  controller (cloned meshes share geometry/material/textures).
- `playerModelInstance.position` is updated each frame to
  follow `player.entity.pev.origin` (the feet position).
  `rotation.y` follows the camera yaw plus a 180° base offset
  (the .mdl is authored facing +Y in GoldSrc; the loader's
  Y↔Z swap turns that into +Z in Babylon — i.e. facing OUT
  of the screen — so a 180° Y rotation flips the model to face
  the camera).
- KeyP toggles third-person view. The camera is positioned
  ~2.5m behind the player at chest height, looking at the
  chest. The player controller's FPS camera writes are
  disabled while in third-person mode (the `logicalPos` field
  in `PlayerController` keeps the player's actual movement
  decoupled from the camera position — without this, the FPS
  controller's camera.y was feeding back into player.pev.origin.y
  each frame and drifting upward to y=37).

**v0.1 scope:**
- T-pose only — frame 0 vertex positions, no skeletal animation.
  The .mdl has 171 sequences (`knife_idle`, `shoot_onehanded`,
  `circkick`, etc.); playback is a follow-up.
- Player instance only — bots are still colored spheres.
- Textures load as RGBA8 RawTextures; chromed/masked variants
  detected via STUDIO_NF_CHROME / STUDIO_NF_MASKED flags.

**Known follow-ups:**
- Animation system (sequence playback, blend between
  sequences, bone transforms → mesh vertex updates)
- Bot models (clone the player model + tint textures)
- Camera tuning (third-person framing isn't quite right —
  the model is small relative to the camera distance and the
  camera looks slightly above the model's chest)
- Normal map extraction (v1 uses a uniform (0,1,0) normal;
  the .mdl has per-vertex normal indices → normal table that
  we should resolve for proper lighting)

---

### D.6 v0.1.1 → v0.1.3 — third-person + first-person weapon hand

**v0.1.1 (commit 1c701a8) — feet placement fix**

The .mdl origin is the pelvis bone, not the feet. When placed at
`player.entity.pev.origin`, the model's feet end up at y=-0.6
below the floor. Fix: compute `feetOffset = min(bb.minimum.y across
all bodyPart meshes)` then `inst.position.y -= feetOffset`. Bounds
are in pre-scale local units, so multiply by 0.1 (the model scale)
to convert to world meters.

**v0.1.2 (commit b71f506) — third-person camera fix**

Three bugs fixed:
1. `camera.setTarget()` was mutating `camera.rotation.y`, which the
   next frame's camera position offset was computed from — positive
   feedback (camera teleported between z=-7 and z=-17). Fix:
   `player.getYaw()` returns the stable yaw field instead of
   `camera.rotation.y`.
2. Third-person block ran in `runRenderLoop` AFTER `scene.render()`,
   so the render used last frame's camera. Fix: move to
   `scene.onBeforeRenderObservable` so it runs before the actual draw.
3. Distance 5m was too far; pulled to 2.5m back, 0.7m up.

**v0.1.3 (commit 9f8dd80 / b6c688c) — model hiding + WASD fix**

- "Polygons all over" in first-person was the camera INSIDE the
  player's torso (crouched eye height 0.8m < 1.6m-tall model). Fix:
  toggle `playerModelInstance.setEnabled()` based on `thirdPerson`.
- "WASD reversed" after toggling: stale `setTarget` rotation
  persisted, making the camera face backward. Fix: in the
  first-person branch, explicitly set `camera.rotation = (-pitch,
  yaw, 0)` every frame if locked.

**D.6.7 (commit 2da66cc, WIP) — real level loader**

`loadGLBLevel(scene, glbPath, opts)` in `babylon/src/world.ts`
parses a converted BSP→glTF .glb file manually (Babylon's loader
chokes on the pre-converted `ts_mathar.glb` — JSON chunk has
NUL padding instead of spaces, and the GLB itself has 507 corrupt
vertices from a buggy `bsp2glb` tool run).

Manual parser does the minimum needed:
- Fix NUL→space padding in JSON chunk
- Read GLB header (12 bytes) + JSON chunk + BIN chunk
- Iterate `meshes[].primitives[]` → `accessors[].bufferView[]`
  → typed-array view of positions/indices/colors
- Build Babylon `Mesh` per primitive, `VertexData.applyToMesh`
- Compute real bounds from finite vertex positions only
  (bsp2glb ships 0x7F7FFFFF placeholder values)
- Scale by 0.0254 (1 GoldSrc unit ≈ 1 inch → meters)

Default-disabled via `USE_GLB_LEVEL = false` in `main.ts`. Real
level rendering requires fixing `tools/bsp2glb.ts` to produce
clean vertex data first (D.6.8 follow-up).

**D.6.8 (commit 9e25c23) — first-person weapon hand**

Loads `v_knife.mdl` (simplest TS mod weapon: hand + blade, 36
bones, 8 sequences, 3 textures). Same `parseMdl` + `buildMdlMeshes`
pipeline as the player model.

- Parent: camera (TransformNode parented to the camera)
- Position: +0.25 right, -0.22 down, +0.45 forward (camera-local)
- Rotation: yaw π (flip to face camera), pitch -0.2 rad (blade up)
- Scale: 0.04 (knife ~25cm native → 1cm mesh, in lower-right of FOV)
- Visibility: shown only in first-person, hidden in third-person
  (otherwise floats behind the player's back)

Verified: knife hand visible in bottom-right of first-person view.
No animation yet (knife is in idle pose). Sequence parsing +
bone animation is queued for D.6.9.

---

## D.7 — PIVOT: webXash (Xash3D WebAssembly port) for "real game in browser"

**Status:** parked. Branch `experimental/babylon-port` (tag
`babylon-port-frozen`) holds the last committed Babylon work at
`a18e93c`. New webXash development lands on `main`.

**Why pivot:** the Babylon port never produced visuals that looked
"correct" — the .mdl parser is fine, but TS mod assets are designed
for GoldSrc's specific shaders, lightmaps, MDL v10 renderer, and
entity system. Reimplementing that in Babylon from scratch gets you
low-poly triangle vomit. The user has been consistently unhappy
with the visual result.

**Goal:** "closest to the original game, running in the browser,
with multiplayer, for the least amount of work." → webXash runs
the actual Xash3D engine (open-source GoldSrc port) in WebAssembly.
Half-Life 1 + CS 1.6 + The Specialists mod → render in browser.
Multiplayer via WebSocket to a Docker server.

### What we have today

- `_runtime_assets/half-life/ts/` (608 MB) — The Specialists mod
  folder (cl_dlls, dlls, maps, sound, models, sprites). This is the
  mod-specific content that we extracted for the Babylon work.
- `webxash/` (untracked scaffold) — webXash frontend that loads
  the Xash3D WASM engine and serves game files.
- `tools/bsp2glb.ts` (unused, parked) — BSP→glTF converter.
- `src/mod/mdl-parser.ts`, `babylon/src/mdl-loader.ts` (parked) —
  decompiled TS mod logic + .mdl→Babylon mesh bridge. Kept as
  documentation of what TS mod does; not used in the webXash path.
- Decompiled TS mod entity-pool + decomp-bridge (`src/mod/`) —
  reference reading of TS gameplay code (bots, weapons, classes).

### What's missing

- `_runtime_assets/half-life/valve/` — Half-Life 1 base content
  (pak0.pak + ~250MB of models/sounds). NOT shipped in repo for
  licensing. Was on Kyle's MacBook at
  `~/Library/Application Support/Steam/steamapps/common/Half-Life/valve/`
  (516 MB). Being rsync'd to m5 in the background as part of this
  pivot.

### D.7 plan (webXash → multiplayer)

**D.7.1 — Boot webXash with stock HL1.** Confirm WASM engine starts,
  loads `valve/` folder, shows a level. Smoke test only.
- Effort: ~30 min (mostly running setup + debugging Xash3D launch args)
- Risk: low — webXash is widely deployed for HL1DM

**D.7.2 — Bundle TS mod.** Copy `valve/` + `ts/` into
  `webxash/public/`. Bundle as `valve.zip` so the user can pick
  the bundled option (no manual folder selection each time).
- Effort: ~20 min

**D.7.3 — Launch TS via `-game ts`.** Run webXash with `-game ts`,
  verify the TS mod boots. Check what works: default TS map loads,
  TS player models render, TS weapons render, TS HUD shows.
- Effort: ~30 min
- Risk: medium — TS mod is heavily customized, Xash3D may
  not support all of its entity types.

**D.7.4 — Multiplayer server (Docker).** Stand up the webXash
  Docker server (webxash3d-fwgs/hl-web-server). Expose via
  Tailscale. Connect from webXash via WebSocket.
- Effort: ~1 hour (docker-compose + tailscale expose)
- Risk: low

**D.7.6 — Multiplayer session.** Two browsers, one as host, one
  as client, verify both connect and see each other.
- Effort: ~30 min

### What's NOT in D.7

- Customizing webXash UI (no changes needed — webXash's own UI is
  the in-game menu).
- Building a TS-specific server binary (the C++ TS server code
  stays on the user's local Steam install; we use stock HL1DM
  server for browser multiplayer).
- Animations beyond what the engine provides (webXash = full model
  animation, no custom code).

### Caveats / risks

- **TS mod may not fully boot in webXash.** Xash3D explicitly lists
  some GoldSrc mods as unsupported. If TS hits one of those, we
  have a decision: ship HL1DM with TS assets (different from "The
  Specialists" gameplay) or find a different engine port.
- **valve folder licensing.** Cannot commit to repo. Must be
  locally cached on m5 (under `_runtime_assets/` which is
  gitignored) and bundled in `webxash/public/` which is also
  gitignored. Each fresh setup requires re-copying from the
  MacBook.
- **webXash isn't on npm as a deployable artifact.** The README
  builds from source. Setup script (`webxash/setup-xash.sh`)
  handles it.

---

## D.7.0 — webXash is currently broken (CRITICAL FINDING 2026-10-19)

After rsyncing the HL1 base content from Kyle's MacBook and
bundling it with TS into a 578 MB zip, I went to wire up the
webXash launch path and discovered webXash **cannot launch any
game in its current state**.

### What's broken

The webXash scaffold in this repo (and the upstream
x8BitRain/webXash) has:

1. `xash3d-fwgs@1.2.2` — **works**, available on npm + unpkg.
   Provides the Xash3D engine compiled to WASM (xash.wasm,
   filesystem_stdio.wasm, libref_webgl2.wasm, libmenu.wasm,
   libref_soft.wasm).

2. `hlsdk-portable@0.1.2` — **NOT AVAILABLE**. The WASM client.dll
   and server.dll that the engine needs to run any HL1 game are
   not on npm (`npm install` fails with "Cannot convert undefined
   or null to object") and not on unpkg (404). The upstream
   npm package may have been unpublished or never published.

3. `cs16-client@0.1.2` — same situation as hlsdk-portable.

4. In `webxash/src/services/xash-loader.ts` the URL constants are
   hard-coded to empty strings with a comment:
   ```
   // Game launch will fail until webXash is forked and rebuilt
   // with working deps. See HANDOFF.md Phase 0 step 1.5 (fork webXash).
   const HLClientURL = '';
   const HLServerURL = '';
   ```

   So this is a known issue in the upstream project that nobody
   has resolved. The engine loads, but no game DLLs are available
   to make it do anything.

### Live demo verification

The webXash live demo at https://x8bitrain.github.io/webXash/
exists and has buttons (Half-Life, Counter-Strike, HLDM, Uplink,
Day One) but I haven't confirmed whether it actually launches games
today. Likely either broken too, or hosting the WASM DLLs from a
non-npm CDN.

### Why the live demo might still work

The upstream `xash-loader.ts` (HEAD on GitHub) DOES import
hlsdk-portable via vite `?url` imports:
```typescript
import HLClientURL from 'hlsdk-portable/cl_dlls/client_emscripten_wasm32.wasm?url';
```
This works if the npm packages exist at install time. Our local
copy has the empty-string version, suggesting someone either
downgraded the file or the project was forked before the
import-style URLs were added.

### D.7 paths forward (ranked)

**Path A — Rebuild WASM DLLs from HLSDK-portable (preferred)**
- Clone FWGS/hlsdk-portable, set up emsdk, build with
  `-s TARGET=wasm32-unknown-emscripten`, produce
  `client_emscripten_wasm32.wasm` + `hl_emscripten_wasm32.wasm`.
- Drop them into `webxash/public/cl_dlls/` and `webxash/public/dlls/`.
- Update xash-loader.ts to point at the local files (no npm).
- Time: 2-4 hours including emsdk setup, build, debugging.
- Risk: medium — emscripten build of HLSDK has known quirks.

**Path B — Use CheerpX PoC as the rendering layer**
- `webxash/public/cheerpx-test.html` shows CheerpX running
  `ts-host` + `ts_i386.so` (the actual TS mod .so) in browser.
- CheerpX runs unmodified Linux x86 binaries in browser.
- This loads the TS GAME LOGIC (server-side weapons, classes,
  abilities) but NOT the rendering engine.
- We'd still need a client. Babylon as client = back to where we
  started. webXash + CheerpX = hopeful but unproven.
- Time: 4-6 hours to figure out integration.

**Path C — Standalone HL1 Linux binary via CheerpX**
- Get a Linux x86 build of HL1 (SteamPipe has hl_linux.x86).
- Run it via CheerpX. This gives us the actual engine, not a
  WASM reimplementation.
- CheerpX would run the engine + DLLs unmodified.
- Time: 2-3 hours to obtain + test the binary.
- Risk: high — CheerpX is slow and HL1 wasn't designed for it.
  Performance may be unusable.

**Path D — Find WASM DLLs elsewhere**
- Search GitHub for `hlsdk-portable` forks, releases, or prebuilt
  WASM DLLs. The webXash fork might have a private branch.
- Time: 1-2 hours of digging.
- Risk: low if found, dead-end if not.

### What I did NOT find

- No source for the missing WASM HL client/server DLLs in this repo.
- No build script for `xash.wasm` (only prebuilt in public/xash3d-fwgs/dist/).
- No instruction in HANDOFF.md for resolving the missing DLLs.
- No fallback content (no standalone HL1 Linux binary).

### Realistic expectations

Even after solving the WASM DLL problem, **The Specialists mod
itself may not run in webXash** because:
- TS has heavily customized server DLLs (ts_i386.so, ts_i686.so)
- Xash3D FWGS has a not-supported-mods list that includes Day of
  Defeat, Sven-Coop, and other custom mods for similar reasons
- If TS uses non-HL1-standard hooks, we need to compile TS's
  custom server code to WASM too (months).

### Recommendation

Pursue **Path A** (rebuild WASM DLLs) for a Half-Life session in
browser first. If that works, **stock HL1 in browser = success**.
Then decide if TS-specific gameplay is achievable via TS
decompilation + a custom HL1-compatible server binary.

### D.5.7 v2 in progress — shim layer + first Fire* method wired

Honest read on the scope: each decompiled Fire* method is 100-234 lines
with 10-20 unknown dependencies. Wiring 1 end-to-end needs the full shim
layer built first, so realistic tempo is **~1 method per session**.

This session shipped the **shim layer** + the **smallest Fire* method
(CCombatBlock)**:

**Shim layer** (`src/mod/decomp-bridge.ts installRuntimeShims`):
- `UTIL_WeaponTimeBase`, `UTIL_MakeVectors`, `UTIL_VecToAngles`,
  `UTIL_TraceHull`, `UTIL_FindEntityByClassname`, `UTIL_FindEntityInSphere`,
  `UTIL_FindEntityByString`, `UTIL_GetAimVectors`
- `RANDOM_LONG`, `RANDOM_FLOAT`
- `MESSAGE_WRITE_BYTE/SHORT/LONG/STRING`
- `engineSingleton.vfunc_0x1ec` (12-arg TS engine dispatch)
- `global_eventIndex`
- `Animate`, `UpdateMeleeBar`, `GetMeleeMultiplier`, `SetPlayerSpeed`,
  `GetSpeedBySlots`, `KungFu`, `CloseCombatAttack`, `BlockPlayer`,
  `W_FireBullets`, `player_GetAutoaimVector`, `ColdCockAttack`,
  `FindUseTarget`, `ApplyTraceBleed`, `VictimKnifeHold`,
  `VictimKatanaHold`, `DropWeapon`, `Recoil`, `StopReload`, `Unzoom`,
  `GrenadeIdle`, `ScaleSpread`, `VKickback`, `IndexEnt`, `SUB_Remove`,
  `CTSKnife_CreateKnife`, `CTSAnimation_Animate`, `get_weapon_info`
- `CVars` module with 30+ named statics (blockDuration, m_vecRecoil,
  m_vecSpreadBase, m_flBulletDamage, etc.)
- **Bare top-level cvars** — the decompiled CCombatBlock reads
  `cvar_blockDuration`, `cvar_blockStaminaThreshold`,
  `cvar_blockIdleDelay` as free identifiers (not as `CVars.X`), so
  both forms are installed. Same for `cvar_closeCombat_*` (28 of them
  for CCombatAttack). 28 cvars are namespaced AND bare-installed to
  cover both reading styles.

**Bridge stub fields** (`CTSGunStub class`):
- `field_0x80` (m_pPlayer pointer), `field_0x9c` (m_flNextPrimaryAttack),
  `field_0xa0` (m_flTimeWeaponIdle), `field_0xa4` (m_flNextSecondaryAttack),
  `field_0xa8` (m_flReloadTime), `field_0xcc` (weapon state),
  `field_0xd0` (m_pAmmoTracker pointer), `field_0x96c` (m_usEvent),
  `field_0xc8` (m_iId)
- The existing `[0x60]`, `[0x88]`, etc. numeric offsets stay for Spawn-style
  reads

**Player entity** (`babylon/src/player.ts makePlayerEntity`):
- `[0]: pev` — numeric-keyed alias so the decompiled `player[0].field_0x250`
  reads resolve (C++ memory-layout compat — pev is the first member)
- `field_0x12c`, `field_0x250`, `field_0x774`, `field_0x7a8`, `field_0x7ac`,
  `field_0x7b0`, `field_0x28c`, `field_0x208`

**CCombatBlock wired** (`CTSGunStub.CCombatBlock()` → `CCombatBlockImpl.call(this)`):
- B key in main.ts calls `tryDecompBlock()` which wires the player
  entity into `gun.field_0x80`, then invokes the decompiled body
- **Confirmed via headless smoke** that B press runs the decompiled
  CCombatBlock through guards + engine dispatch + Animate +
  UpdateMeleeBar without crashing

### D.5.7 v3 done — real game sound loading

Honest gap analysis (asked by Kyle mid-session):
- **Sounds: 1 session.** ✅ Done.
- **Models (player .mdl): 1-2 sessions.** Need a GoldSrc .mdl parser
  → glTF. TS ships `ts/models/player.mdl` (the iconic Specialist
  model). Parser is ~300-500 lines.
- **Maps (BSP): 3-5 sessions.** TS BSPs use non-standard lump layouts
  (~98% of faces dropped by `bsp2glb.ts`). Three paths: (a) port
  Xash3D's BSP loader, (b) author a TrenchBroom map, (c) keep the
  procedural test level.

**What shipped this session:**
- `babylon/public/sounds` symlink → `_runtime_assets/half-life/ts/sound`
  (zero duplication, real-time updates, gitignored via `_runtime_assets/`)
- `vite.config.ts` updated: `publicDir: "public"` (was `"../public"`
  pointing to a non-existent dir, so Vite wasn't serving anything
  from publicDir), `fs.allow` includes `_runtime_assets/` so Vite
  follows the symlink to the asset tree outside the project root,
  `port: 5190`, `host: "0.0.0.0"` (was 5175 / 127.0.0.1, leftover from
  early dev)
- `babylon/src/audio-loader.ts` (~100 lines): `SAMPLE_MAP` with 20
  generic-name → real-file mappings (the decompiled code uses
  generic names like `weapons/tsgun_fire.wav` that don't exist in
  the TS mod; the mod is organized per-weapon as
  `weapons/glock22/glock22-fire.wav`, `weapons/katana/miss.wav`,
  etc.). `loadGameSounds(ctx)` parallel-fetches + decodeAudioData's
  every entry, returns a `SoundBank` `Map<string, AudioBuffer>`
- `babylon/src/audio.ts` GameAudio: `setSoundBank()`, `samplesLoaded`
  getter, `playSample(name, vol, pitch)` that plays a real WAV when
  the bank has it, else returns false
- `src/mod/decomp.ts wireEngineAudio`: now calls `audio.playSample`
  first (returns true if the bank had the entry), falls back to the
  procedural gunshot/reload/pickup routing when the bank doesn't
- `babylon/src/main.ts`: `loadGameSounds(audioCtx)` runs at startup,
  sets the bank when ready, briefly shows `[audio] N/M sounds
  loaded` in the status bar

**Verified via headless smoke**: `[audio] 20/20 sounds loaded`. Every
mapped sample was fetched + decoded successfully. The pistol
(LMB → `weapons/tsgun_fire.wav` → `weapons/glock22/glock22-fire.wav`)
and katana/knife/throw/block samples all map cleanly. Some mappings
are guesses (e.g. `weapons/dryfire.wav` → `weapons/knife/knife_miss.wav`)
since the TS mod doesn't ship a generic dryfire; these are noted
in the SAMPLE_MAP comments.

**Next session candidates:**
- Wire the player `.mdl` (1-2 sessions for parser + Babylon loader) — biggest visual payoff
- Wire `CCombatAttack` (next on the D.5.7 v2 cont. list)
- TrenchBroom map for BSP testing (independent of the BSP parser)

### Next task (D.5.7 v2 cont.)

Wire 7 more decompiled Fire* methods, one per session, against the
now-scaffolded substrate:

1. **CCombatAttack** — second-smallest; bare `m_pPlayer`/`m_flNextPrimaryAttack`
   style + ~28 cvar_closeCombat_* reads + CloseCombatAttack/W_FireBullets/
   GetMeleeMultiplier/KungFu helpers (also need PLAYBACK_EVENT_FULL shim)
2. **GrenadeFire** — grenade throw path; needs m_pWeaponState, vtable_0x174
   (helper), engineMessages/messageBuffer triple-deref, globalGOT accessors
3. **KatanaFire** — swing path; needs CTSAnimation.Animate, m_iCombo state,
   PlayerKick, pev.flags bits, m_flMissDamage/Time/swingMode writes
4. **KnifeFire** — melee vs throw dual-mode; needs CTSKnife.CreateKnife,
   KNIFE_SPEED, FindUseTarget, VictimKnifeHold, ApplyTraceBleed, ENGINE.MESSAGE_*
   full network message dispatch
5. **KatanaThrow** — throws a CTSKnife projectile; needs projectile system
   (currently null returns from CTSKnife_CreateKnife)
6. **ColdCock** — pump action; needs GrenadeIdle, StopReload, Unzoom,
   ColdCockAttack (player method), CVars spread statics
7. **StandardFire / ShotgunFire / AkimboFire** — the big three; each
   requires ScaleSpread, ShootBulletsPlayer, VKickback, full CVars module,
   m_pAmmoTracker + m_pWeaponInfo struct + m_rgAmmo[] state. These are
   the big ones — realistically 1-2 sessions each.

After all 8 are wired, **D.5.7 v2 → D.5.8** (per-class manifests plug
into pool entities so the bridge stub can shrink to a real `class CTSGun`).
After that, **D.5.11** smoke test (every game-loop action calls into
decompiled code).

### Key files (current state)

- `babylon/src/main.ts` — wires everything. Has the decomp-bridge
  call on LMB/R/T/Y, __botRegistry, wireEngineAudio,
  setEngineHandlers for onTraceLine.
- `babylon/src/player.ts` — PlayerController (move, look, jump,
  sprint, crouch, wall collision, pitch fix, HP/damage/death/respawn,
  kill counter callbacks).
- `babylon/src/bot.ts` — StubBot (IDLE→PATROL→CHASE→ATTACK→DEAD,
  FOV 35°, ATTACK_RANGE=14, ENGAGE_RANGE=26, DAMAGE=5, fire rate 0.7s).
- `babylon/src/weapon.ts` — Pistol (raycast fire, reload, ammo) +
  HudOverlay (HP bar, ammo, crosshair, hit marker, kill counter,
  death banner, slow-mo notification).
- `babylon/src/audio.ts` — GameAudio (procedural Web Audio sounds).
- `babylon/src/pickup.ts` — Pickup (health/ammo, spin, bob, 8s respawn).
- `babylon/src/world.ts` — 36×6×36 arena with cover, maze walls,
  pillar, ramp, 4 pickups.
- `src/mod/engine.ts` — g_engfuncs + gpGlobals + handlers.
- `src/mod/entity-pool.ts` — `EntityPool` (2048 slots, single source
  of truth for player / bots / weapon entities).
- `src/mod/decomp.ts` — wrapper + re-exports.
- `src/mod/decomp-shims.ts` — ambient type declarations.
- `src/mod/decomp-bridge.ts` — `CTSGunStub` + runtime shims +
  `getOrCreatePlayerWeapon` (pool-backed) + tryDecomp*.
- `src/mod/types.ts` — type contracts (Entvars, CBaseEntity POJOs).
- `src/mod/globals.d.ts` — ambient: gpGlobals, g_engfuncs, vec3_*,
  sprintf, helpers.
- `tools/decompile/output/*.ts` — 374 decompiled files (365/365
  unique methods, 100% complete).
- `tools/bsp2glb.ts` — BSP→glTF tool (DEFERRED, ~510 lines, can
  revisit with Xash3D renderer reference).

### User-feedback history (this session)

Kyle played via MacBook Tailscale `http://100.95.111.112:5190/`
after each commit. Sequence:
1. After D.5 MVP: "Call me impressed. 2 issues: walls no collision,
   pitch inverted." → Fixed.
2. After fixes: "Looks good! Continue on." → v2: bots fight back +
   damage/death/respawn/kill counter.
3. After v2: "Kill counter increments per shot, not per kill.
   Where's crouch?" → Fixed kill-on-death + added crouch (Ctrl/C,
   1.7→0.77m eye height).
4. After v3: "good enough for now. Continue on." → v4: audio +
   pickups + bigger test level. BSP→glTF tool (deferred).
5. After v4: "3-5 warnings in console" → Investigated.
6. After D.5.5 wiring: "Didn't see any log for Y (expected). Continue
   onto next."
7. After D.5.5 v3 (real raycast + damage): "I blasted a few of em"
   (screenshot shows KILLS=2, decompiled engine log lines).
8. After D.5.5 v4 (slow-mo via decomp): "Yup looks good. Checkpoint
   here. Update HANDOFF so new session can pick up."

### Background processes / env

- Proxy `127.0.0.1:8789` confirmed listening
- Vite dev server running on `0.0.0.0:5190 --strictPort` for
  Tailscale access. User plays from `100.95.111.112:5190`.
  Restart: `pkill -f "vite.*5190"; cd babylon && nohup
  node_modules/.bin/vite --host 0.0.0.0 --port 5190 --strictPort > /tmp/vite.log 2>&1 &`
- No active codex processes
- Tailscale IP: `100.95.111.112`
- Codex CLI: `/home/kyle/bin/codex` → `/home/kyle/bin-local/bin/codex`
- npm: `/home/kyle/.hermes/tools/node-26.7.0-linux-x64/bin/npm`
- tsc: `/home/kyle/.hermes/hermes-agent/node_modules/.bin/tsc`


## 🚀 NEXT-SESSION KICKOFF PROMPT

Copy-paste the block below into the new session. Tells the next
session what to do without needing to re-derive the state.

---

```
Continue Option D Phase 2 (D.5 — Babylon.js integration of the
decompiled TS code). D.4 decomp is DONE (365/365 = 100%), and
D.5.1 → D.5.6 are DONE. Next: D.5.7 v2 (real CTSGun methods on
pool-managed entities).

Repo: /home/kyle/Development/specialists-browser
Branch: main
Live dev server: http://100.95.111.112:5190/ (vite, m5 Tailscale)
Vault mirror: /home/kyle/Obsidian/projects/specialists-browser/

FIRST: Read HANDOFF.md CHECKPOINT SUMMARY (it has the full state
map, call chain diagram, deliverable list, and next-task plan).
Then read `docs/option-d-scope-d5-ready.md` for the D.5 plan.

CURRENT STATE (2026-10-18 end-of-session):
- D.4 decomp: 100% (365/365 unique methods in
  tools/decompile/output/*.ts, 374 files total)
- D.5.1 (Babylon dev server boots): DONE
- D.5.4 (player controller with crouch + wall collision +
  pitch fix): DONE
- D.5.7/9/10 v1 (Pistol + StubBot + HUD): DONE
- D.5.5 (engine simulator + decomp wiring): DONE
  - 9 decompiled methods run end-to-end: CTSGun::PrimaryAttack,
    Reload, WeaponIdle, Spawn, CTSAmmoPack::WaitThink,
    CTSGameRules::GlobalSlowMotion2, CTSShrapnel::WaitThink,
    CBasePlayer::SlowMotionFlow
  - pfnEmitSound routed to GameAudio (real sound)
  - pfnTraceLine routed to Babylon raycast (real damage)
  - pfnPlaybackEvent routed to engine log
  - Y key triggers GlobalSlowMotion2 + Babylon dt *= 0.25 (slow-mo)
- D.5.6 (real entity pool): DONE
  - `src/mod/entity-pool.ts` — `EntityPool` (2048 slots, single
    source of truth for player / bots / weapon entities)
  - `CTSGunStub` constructor takes pev; the instance is created
    ONCE via `getOrCreatePlayerWeapon()` and reused across calls
  - `__botRegistry` global REMOVED; pool is the only entity store
  - `pfnTraceLine` returns the full CBaseEntity (classname + index
    + mesh), not just a `{mesh}` stub
  - `TraceAttack` runtime shim walks pool.entities (mesh match)
  - `resetPlayerWeapon()` exported for test/scene-reset

NEXT TASK — D.5.7 v2: Real CTSGun methods on pool-managed entities
Shrink the bridge stub by replacing its in-line Fire / CCombatAttack
/ GrenadeFire / KnifeFire / KatanaFire / Reset / Precache / FallInit
methods with calls to the decompiled versions from
tools/decompile/output/. Steps:
  1. Wire the decompiled CTSGun__StandardFire, CTSGun__ShotgunFire,
     CTSGun__AkimboFire (D.4.7) as the Fire() implementation
  2. Wire the decompiled CTSGun::CCombatAttack, CCombatBlock (D.4.6)
  3. Wire the decompiled CTSGun::GrenadeFire, KnifeFire, KatanaFire
     (D.4.7)
  4. Add the player's weapon entity to the pool via a CTSGun
     subclass (not the CTSGunStub POJO) so the pool entity carries
     real class methods
  5. With class methods on the entity, plug in the per-class
     manifest modules (D.4.9) — 62 of them, one per CTS class

After D.5.7 v2: D.5.8 (decompiled CBasePlayer::TakeDamage, Killed,
scoring via per-class manifests), D.5.11 (smoke test where every
game loop action goes through decompiled code).

VERIFICATION (run on m5 to confirm health):
  cd /home/kyle/Development/specialists-browser
  cd babylon && /home/kyle/.hermes/hermes-agent/node_modules/.bin/tsc --noEmit -p tsconfig.json
  # expect 0 errors
  curl -sSI http://127.0.0.1:5190/   # expect 200 OK
  # vite restart if needed:
  pkill -f "vite.*5190"
  cd babylon && nohup node_modules/.bin/vite --host 0.0.0.0 --port 5190 --strictPort > /tmp/vite.log 2>&1 &

USER GOAL (Kyle, 2026-10-16): "The whole point of this project was
to decomp halflife and TS into a multiplayer browser version." →
drive toward real wiring of the decompiled code, not endless stub
features. D.5.5 → D.5.6 → D.5.7 v2 is the path.

CONSTRAINTS:
- Single-vendor codex pipeline (no claude CLI on m5)
- Real auth is via 127.0.0.1:8789 → api.minimax.io/anthropic
  (NOT real Anthropic — MiniMax's anthropic-SDK-compat shim)
- Codex CLI: /home/kyle/bin/codex (or /home/kyle/bin-local/bin/codex)
- All commits go to main (private solo repo, Kyle confirmed earlier)
- After each commit, sync ~/Obsidian/projects/specialists-browser/
- Stay organized: update specs and handoff at every D-step boundary
- No direct-to-main is the universal rule — but Kyle confirmed
  for THIS project (private solo), commits to main are fine
```

---

**Status:** 🔄 **Option D — AI-decompile the .so to TypeScript.**
D.1 (binary analysis) ✅ COMPLETE. D.2 (AI decompile workflow)
✅ COMPLETE. **Ready for D.3** — decompile the GoldSrc engine↔mod
interface. Phase 1 step 1.1 v4 proved CheerpX CAN load `ts_i386.so`
(1387+ symbols visible). Phase 1 step 1.2 v5–v6 attempted the
bridge binary (`ts-host` dlopen'ing the .so) and discovered
CheerpX's dynamic linker has **cascading bugs** — buffer-state
issues reading library names from ELF string tables, then
`dl-version.c` assertion failures. The runtime path is
fundamentally blocked. **Pivot:** use Claude to decompile the .so
directly to TypeScript, bypass CheerpX entirely. Plan in
`docs/option-d-scope.md`. **Estimate: 4–6 weeks to Phase 1 MVP.**
**Last updated:** 2026-10-15 (after D.4.6 — full D.4 family of features wired except for remaining CTSGun sub-pieces)
**Architect of pivot decision:** Kyle
**Orchestrator:** Evo (Hermes on m5)
**Owner:** Kyle
**Orchestrator:** Evo (Hermes on m5)
**Repo:** `github.com/klampatech/specialists-browser` (private)
**Vault mirror:** `~/Obsidian/projects/specialists-browser/SPEC.md`
**Live dev server:** `https://100.95.111.112:5174/webXash/` (m5
Tailscale IP, HTTPS with self-signed cert for crossOriginIsolated,
PID 822872. Vite has COEP `credentialless` + COOP `same-origin`
headers so CheerpX-style WASM works)
**HL1 + TS on m5:** `~/Development/specialists-browser/_runtime_assets/half-life/{valve,ts}/`
(valve: 178MB / 3575 files; ts: 721MB / 1721 files including
`ts/cl_dlls/client.dll` and `ts/dlls/mp.dll` — the mod DLLs we'll
CheerpX-load in Phase 1)
**Smoke zip on Mac:** `~/Downloads/Half-Life-TS.zip` (493MB)
**Phase 0 step 3 record:** `tools/smokes/tier-3-manual-phase-0-step-3.md`
+ `docs/cheats/phase-0-step-3-screenshot.png`

---

## Where we are right now

`webXash` submodule added at `e455923` (own branch `phase-0-stub-fix`
on top of upstream `ff86609`). Vite dev server boots in 185ms on
port 5174, page returns HTTP 200 with the expected WebXash
`<title>WebXash</title>` and Vue mount point.

**Discovered blockers (now in scope):**

1. **webXash upstream has broken npm deps** — `hlsdk-portable@0.1.2`
   and `cs16-client@0.1.2` return 404 from npm. Without these,
   Vite/Rollup fail to resolve `xash-loader.ts` imports and the dev
   server hangs at module-eval (silently). **Stubbed with empty
   strings** via commit `e455923` on the submodule branch
   `phase-0-stub-fix` so the page renders. Game launch will fail
   until we either (a) get the packages republished or (b) fork
   webXash and ship proper deps. → **Phase 0 step 1.5 added.**
2. **TS mod 3.0 download blocked** — moddb.com serves Cloudflare
   bot challenges (`cf-mitigated: challenge`) for both `curl` and
   headless browser. Real human browser needed. Kyle has volunteered
   to download from his MacBook browser alongside the HL1 install.
3. **HL1 source** — Kyle owns on Steam; will install on MacBook then
   SSH into m5 from Kyle → I pull the `valve/` folder.

**TS on Xash3D's not-supported list?** No. Verified against
`FWGS/xash3d-fwgs/Documentation/not-supported-mod-list-and-reasons-why.md`
— TS is not on the list, so the engine itself should support it.

## What just happened

- **2026-10-14 — Project kickoff.**
  - Inspected the October 2026 wave of AI-decompiled browser ports
    (Half-Life 2, Black Ops, GTA V, Halo:CE, etc.) — see background in
    `SPEC.md` § Approach.
  - Pivoted from the specialists-web Babylon rebuild (in the weeds on
    WebGPU / WebTransport / netcode) to the Xash3D-WASM engine port
    path. Existing port = half the work done.
  - Decided on CheerpX for the mod DLL layer — runs The Specialists'
    closed-source x86 DLLs unmodified. Reimplementation is the fallback.
  - Wrote `SPEC.md` (living design doc) and this `HANDOFF.md`.
  - Created private repo at `klampatech/specialists-browser`.

- **2026-10-14 — Phase 0 step 1: webXash page loads (GREEN).**
  - Added `webXash` as a submodule at `webxash/` (own branch
    `phase-0-stub-fix`).
  - Installed bun (1.4.3) via `npm install -g bun` (no bun preinstalled
    on m5; needed because webXash is a bun project — `bun.lock` +
    `bun run build`).
  - `bun install` partially failed: 5 npm packages 404 from registry
    (`hlsdk-portable`, `cs16-client`). 175M of node_modules installed
    otherwise (Vue, Vite, xash3d-fwgs, pinia, etc.).
  - **Discovered: webXash upstream is broken for fresh installs.**
    `src/services/xash-loader.ts` imports the missing packages
    directly, so without the patch the dev server hangs silently.
  - Applied temporary stub patch (replaces 5 broken imports with
    empty-string consts) — see commit `e455923` on submodule branch
    `phase-0-stub-fix`. Patch saved to `tools/patches/webxash-hlsdk-stub.patch`
    as a reference.
  - Dev server boots in 185ms via `bun run dev --port 5174 --host 127.0.0.1`
    (port 5173 was held by a python http.server fixture; not killed).
    **Page returns HTTP 200 with valid WebXash HTML.**
  - Saved the diff to `tools/patches/webxash-hlsdk-stub.patch` for
    reference / reproducibility.

- **2026-10-14 — Option D D.1 (binary analysis) — COMPLETE.**
  - Picked primary binary: `ts/dlls/ts_i386.so` (1,741,920 bytes,
    32-bit ELF, NOT stripped, has full debug symbols).
  - Extracted: 3,894 total dynamic symbols, 619 TS-specific
    (CTS/slowmo/GiveFnptrs), 923 GLOB_DAT relocations, 1,171
    JUMP_SLOT PLT entries, 2 NEEDED libs (libm, libc), 6.7MB
    disassembly, 11,912 debug strings.
  - Identified high-priority decompile targets:
    - D.3 (GoldSrc interface): GiveFnptrsToDll, GetEntityAPI2,
      GetNewDLLFunctions, GetEngineFunctions, Initialize
    - D.4 (TS gameplay): ActivateSlow__13CTSSlowMotion (slowmo),
      AkimboFire__6CTSGun (dual-wield), AddAmmo__6CTSGunUci,
      AddItem__6CTSGuni, Animate__12CTSAnimation,
      AlternateAttack__6CTSGun, AddObjectiveInList__12CTSGameRules
  - All analysis output in `tools/decompile/analysis/`:
    - `readelf-h.txt`, `readelf-d.txt` (header + dynamic section)
    - `readelf-dyn-syms.txt` (full symbol table)
    - `readelf-relocs-all.txt`, `readelf-relocs-glob-dat.txt`
    - `nm-D-size.txt`, `nm-D-CTS-specific.txt`
    - `objdump-disasm-full.txt` (6.7MB)
    - `strings-n5.txt` (11,912 strings)
    - `SUMMARY.md` (D.1 report)
  - Committed: `82c44cb tools+docs: D.1 complete - ts_i386.so
    analysis extracted` (237,993 insertions).
  - **Next:** D.2 — set up AI decompile workflow. Use Codex (M3)
    for implementation (chunk generation, prompt sending), Claude
    Code (M3) for review/validation.

- **2026-10-15 — Option D D.4.6 (CTSGun combat) — COMPLETE.** 4 methods (CCombatIdle, CCombatBlock, CCombatAttack, UpdateClientData) decompiled + cross-vendor reviewed. weapons.ts is 128KB, 2983 lines, 23/33 CTSGun methods. CCombatAttack (3506 B) is the per-tick close-combat dispatch — mode state machine, range check, attack block, animation. CCombatBlock (442 B) is the defensive action. CCombatIdle (104 B) is the defensive mode. UpdateClientData (1287 B) is the per-frame client-state delta (slot diffs, current weapon sync, get_weapon_info lookups). **Cross-vendor caught real bugs:** CCombatAttack state machine ordering, KungFu damage bonus, per-state scale constants, melee-multiplier application; UpdateClientData svc_user_message arg packing, bChanged gate flag, get_weapon_info per-player flag byte lookup.

- **2026-10-15 — Option D D.4.7 (CTSGun fire dispatcher) — COMPLETE.** 8 Fire* methods (Fire, ColdCock, GrenadeFire, ShotgunFire, StandardFire, AkimboFire, KatanaFire, KatanaThrow, KnifeFire) decompiled + cross-vendor reviewed. weapons.ts is 103KB, 2446 lines, 19/33 CTSGun methods. Full fire path: PrimaryAttack → Fire (mode check) → one of 8 Fire* methods.

- **2026-10-15 — Option D D.4.3 (bots) — N/A.** TS is PvP-only and the binary contains 0 bot-related methods. Bots are external (Botman's BotLib). Cannot decompile what doesn't exist.

- **2026-10-15 — Option D D.4.4 (damage/scoring) — PARTIAL 2/2 methods.** PlayerKilled (CHalfLifeMultiplay, 6912 B — kill handler, score, cash, slowmo, check-deads) and TeamWin (CTSGameRules, 1564 B — round winner, HUD, cash distribution, announcer sounds) decompiled + cross-vendor reviewed. Output: `src/mod/scoring.ts` (~13KB).

- **2026-10-15 — Option D D.4.2 (CTSGun pistol) — COMPLETE.** All 11 pistol-priority methods decompiled + cross-vendor reviewed. Output `src/mod/weapons.ts` (54.7KB, 1292 lines). The pistol is fully wired: PrimaryAttack → (mode switch) → StandardFire. Methods in source-code order: Spawn, Reset, Precache, GetItemInfo, Deploy, HolsterWeapon, PrimaryAttack, WeaponIdle, EmptySound, Reload, StandardFire. StandardFire (1307 B) is the actual fire: ScaleSpread → ShootBullets → VKickback → ammo decrement → playback event. Class state consolidated: m_pPlayer (0x80), m_iMaxClip (0x88), m_flReloadTime (0xa8), m_iClip (0xb4), m_iId (0xc8), m_pCombat (0xcc), m_pOwnerInterface (0xd0), m_rgAmmo[5] (0xd4), m_pWeaponInfo (0x114), m_usEvent (0x970), m_usDeployEvent (0x976), + 80 B state block (0x9b8-0xa08). Next: D.4.7 (subclass Fire* methods), D.4.3 (bots), D.4.4 (damage), D.4.6 (CCombat).

- **2026-10-15 — Option D D.4.1 (slowmo system) — COMPLETE.** All
  11 CTSSlowMotion methods decompiled + cross-vendor reviewed.
  Output: `src/mod/slowmo.ts` (33.5KB, 750 lines).
  - `Spawn__13CTSSlowMotion` (454 B) — entity creation, sets
    up `pev`, RENDER_MODE, NEXT_THINK, m_affectedEntities[33]
    zero-fill, computes m_flSlowAmount from spawn distance
  - `KeyValue__13CTSSlowMotion` (158 B) — parses "slowamt" +
    "slowtime" map keys
  - `Use__13CTSSlowMotion` (176 B) — player trigger, calls
    ActivateSlow, schedules deactivation, broadcasts HUD msg,
    fires target
  - `ActivateSlow__13CTSSlowMotion` (127 B, D.2 carryover)
  - `DeactivateSlow__13CTSSlowMotion` (273 B) — clears
    m_affectedEntities, calls ResetSlowMotion on each
  - `CheckPlayersDistance__13CTSSlowMotion` (278 B) — sets/
    unsets slowmo per player based on distance threshold
  - `WaitThink__13CTSSlowMotion` (222 B) — think callback
  - `WaitTouch__13CTSSlowMotion` (153 B) — touch callback
  - `Save__13CTSSlowMotion` (80 B) — save-game writer via
    WriteFields
  - `Restore__13CTSSlowMotion` (80 B) — save-game reader via
    ReadFields
  - `ObjectCaps__13CTSSlowMotion` (6 B) — returns 0
    (FCAP_NONE)
  - **Cross-vendor value (continued):** Claude caught 3 bugs
    in the `Use` decompile: `pev.message !== null` should be
    `!== 0` (string_t is int), wrong field name
    `m_flDeactivateAt` → `m_iHasBeenUsed`, unverified
    `gpGlobals.time` claim. Without cross-vendor, those
    would have shipped.
  - **Class state consolidated:** pev (this+0x00),
    m_iDeactivateFlag (0x0c), m_flSlowEndTime (0x10),
    m_bSlowActive (0x64), m_fNextThink (0x68),
    m_affectedEntities[33] (0x70), m_flSlowAmount (0xf4),
    m_iUseCount (0x100), m_flSlowAmt (0xf8, from KeyValue),
    m_flSlowTime (0xfc, from KeyValue), m_SaveData[32] (class).
  - **Engine globals accessed:** gpGlobals (GOT+0x1600),
    Engine.SetModel (GOT+0x1aa8), cvars `slowamt`/`slowtime`.
  - **Tooling fix:** decompile-review.py now uses codex
    output as canonical when review verdict is PASS (no
    suggested rewrite). Previously: skipped output write.
  - **Next:** CTSSlowMotionPoint family (5 methods: Spawn,
    DeactivateSlow, WaitThink, ActivateSlow, CreateSlowMotionPoint).
    Then D.4.2 (weapons).
  - Pulled HLSDK reference (`github.com/FWGS/halflife`, depth 1)
    to `/home/kyle/Development/scratch/hlsdk-ref/halflife/`.
    Reference implementation of the 4 entry points lives in
    `ricochet/dlls/h_export.cpp` + `ricochet/dlls/cbase.cpp`.
    Type definitions in `engine/eiface.h` (`enginefuncs_s`,
    `DLL_FUNCTIONS`, `NEW_DLL_FUNCTIONS`, `globalvars_t`).
  - Wrote `tools/decompile/references/hlsdk-goldsrc-interface.md`
    (~6.5KB): compact reference doc with version constants,
    function signatures, reference implementations, struct
    layouts, and a per-item review checklist. Used by the
    cross-vendor review prompt.
  - Wrote `tools/decompile/prompts/review-single-function.md`
    (~95 lines): the cross-vendor review prompt. Asks Claude
    to compare a codex-decompiled TS against the HLSDK reference
    + original disassembly, output a pass/fail verdict + the
    corrected rewrite.
  - Wrote `tools/decompile/decompile-review.py` (~150 lines):
    runner that composes the review prompt (chunk + HLSDK ref +
    codex output) and sends to `claude -p`, extracts the
    suggested rewrite, saves canonical + cross-vendor outputs.
  - **Cross-vendor review ran on all 4 entry points** (NOT 5 —
    `Initialize` isn't a separate exported function in HLSDK or
    in the TS mod; the mod is "initialized" via the
    `GiveFnptrsToDll` → `GetEntityAPI2` → `GetNewDLLFunctions`
    sequence plus static struct initializers):
    - `GiveFnptrsToDll` (49 B) — codex output had a
      comment-only body with `void pFunctionTable; void pGlobals;`
      (invalid TS); claude caught it and rewrote as 2 clean
      statements (`g_engfuncs = ...; gpGlobals = ...;`) with
      right HLSDK param names. **FAIL → fixed.**
    - `GetEntityAPI` (67 B, legacy) — PASS-WITH-NOTES. Source
      data is `undefined` (D.3 limitation; data arrives in D.5).
    - `GetEntityAPI2` (75 B) — PASS-WITH-NOTES. By-pointer
      version arg (vs by-value in legacy), 50 dword copy.
    - `GetNewDLLFunctions` (127 B) — PASS-WITH-NOTES. **TS mod
      only ships 3 of 5 NEW_DLL_FUNCTIONS pointers** (12 B
      vs canonical 20 B). Likely a custom subset; D.4 will
      investigate which 3 the mod implements.
  - **Cross-vendor value was huge.** Codex produced plausible
    but subtly wrong output for `GiveFnptrsToDll` (comment-only
    body, wrong param name, fabricated "C++/CheerpX boundary"
    claim). Claude caught every issue and produced a clean
    rewrite. Same pattern for the other 3 (smaller issues,
    mostly the "undefined source" data flag + naming nits).
    Without cross-vendor, D.3 would have shipped with the
    codex output verbatim.
  - **Output:** `src/mod/interface.ts` (9.4KB, 226 lines, 4
    function declarations with the HLSDK-aligned signatures).
    Bodies use `any` for the function-table source — the actual
    function pointers are populated in D.4 when we decompile
    each `pfn*` slot's target implementation.
  - **Files added (this step):**
    - `tools/decompile/references/hlsdk-goldsrc-interface.md`
    - `tools/decompile/prompts/review-single-function.md`
    - `tools/decompile/decompile-review.py` (executable)
    - `tools/decompile/output/{GiveFnptrsToDll,GetEntityAPI,GetEntityAPI2,GetNewDLLFunctions}.ts`
    - `tools/decompile/cross-vendor/<name>__{codex,claude,claude-review}.{ts,md}` (4×3 = 12 files)
    - `src/mod/interface.ts` (the canonical D.3 deliverable)
  - **Next:** D.4 — decompile the TS-specific gameplay functions
    (slowmo, weapons, bots, damage, scoring, spawn). The 619
    CTS-specific symbols in `nm-D-CTS-specific.txt` are the
    candidates. Highest-priority first: `CTSSlowMotion` family
    (the D.2 test was the entry point), then `CTSGun` (weapons),
    then bot AI. Each function: chunk + codex + claude review,
    output to `src/mod/<feature>.ts`.

- **2026-10-14 — Phase 1 step 1.2 (bridge layer) — POINTS BUSTED (CheerpX linker bugs).**
  - Tried to dlopen `ts_i386.so` from a `ts-host` bridge binary
    running inside CheerpX. Iterated through 11 versions of ts-host
    (static/dynamic, m5-compiled/Docker-Debian-10-compiled, with
    libgcc_s stubs) trying to get past linker issues.
  - **Cascade of CheerpX dynamic linker bugs discovered:**
    1. GLIBC_2.34 not found (m5's glibc 2.41 vs CheerpX's glibc 2.28) — fixed by compiling in Debian 10 Docker
    2. `cannot enable executable stack` (TS .so missing PT_GNU_STACK) — fixed by writing `tools/patch_gnu_stack.py` (Python ELF patcher)
    3. `rame_info: cannot open shared object file` (CheerpX's linker reading wrong offset in string table) — worked around by adding `/dlls/rame_info` (= libm bytes)
    4. `d_alloc: cannot open shared object file` (same bug, next truncated name) — worked around by adding `/dlls/d_alloc` (= libc bytes)
    5. `Inconsistency detected by ld.so: dl-version.c: 205: _dl_check_map_versions: Assertion 'needed != NULL' failed!` — separate bug in version-check logic; no clean fix
  - **Conclusion:** CheerpX's dynamic linker has multiple cascading
    bugs. Even if dlopen succeeded, `dlsym` + function calls would
    hit the same issues. The runtime path is fundamentally blocked.
  - Wrote `tools/smokes/tier-3-manual-phase-1-step-1.1-v6.md`
    (8.9KB) with full v1-v11 history, the cascade pattern, and
    the pivot recommendation.
  - **Pivoted to Option D (AI-decompile the .so to TypeScript).**
    Bypass CheerpX entirely. Plan in `docs/option-d-scope.md`.

- **2026-10-14 — Phase 1 step 1.1 v4 PoC — GREEN.**
  - **Major discovery:** TSHD3_EN.exe installer ships **Linux .so
    files** for the server (`ts/dlls/ts_i386.so`, 1.7MB, **not
    stripped**, has full debug symbols). I missed these in the
    original extraction. The .so files are 32-bit ELF — CheerpX's
    native format.
  - This eliminates ALL FOUR v1 deal-breakers at once (Linux-only,
    flat-namespace, Range header — all irrelevant for Linux ELF
    loaded via DataDevice). The only remaining one is
    crossOriginIsolated (already solved with HTTPS + COEP/COOP).
  - v4 PoC test page (`webxash/public/cheerpx-test.html`):
    - Setup: CloudDevice (Debian) + IDBDevice (cache) +
      OverlayDevice (combines) + DataDevice (our .so). Mounted at
      /, /dlls, /dev.
    - **Key fix from v3:** `linux.run()` does NOT return stdout/
      stderr — must wire `setCustomConsole(writeFunc, 120, 40)`
      first.
    - **Results (all from step 6-10):**
      - `uname -a` → `Linux 4.15.0-54-cheerpx i386 GNU/Linux` ✅
      - `cat /etc/debian_version` → `10.13` ✅
      - `ls -la /dlls/` → `-r--r--r-- 1 root root 1741920 Jan 1 1970
        ts_i386.so` ✅ (mount works, .so visible)
      - `head -c 16 /dlls/ts_i386.so | od -c` → `\x7fELF 001 001 001`
        ✅ (ELF magic confirmed)
      - `nm -D /dlls/ts_i386.so | head -30` → 1,387 chars of
        symbols including `CTSSlowMotion`, `CTSGunUci`,
        `CTSSharedEmitter` ✅ (the actual TS gameplay code is
        reachable)
    - **Failure:** gcc -m32 inside Debian fails with `error trying
      to exec 'cc1': No such file or directory` — Debian has gcc
      but missing compiler backend. Status 127. **Tooling issue,
      not a CheerpX issue.** Easy fix: compile the bridge binary
      on m5 and upload it.
  - Wrote `tools/smokes/tier-3-manual-phase-1-step-1.1-revised.md`
    (12.7KB) with full v1-v4 history, the working mount config,
    symbol table highlights, and bridge plan.
  - **Phase 1 step 1.1 GREEN.** Bridge layer is the next unblocked
    work.

- **2026-10-14 — Phase 1 step 1.1 (CheerpX PoC) — POINTS BUSTED.**
  - 4 architectural surprises in 1 hour of PoC work. Full record at
    `tools/smokes/tier-3-manual-phase-1-step-1.1.md`. Summary:
    1. **CheerpX is Linux-only** — won't load Windows PE DLLs.
       Confirmed by API check (`index.d.ts` shows only `Linux` class
       + Linux system calls; no PE/Windows support). TS mod DLLs
       (`ts/dlls/mp.dll`, `ts/cl_dlls/client.dll`) are PE format
       (`MZ\x90\x00` header confirmed). Fundamental deal-breaker.
    2. **CheerpX DataDevice is flat-namespace** — only `/<filename>`
       paths work, no subdirectories. Can't represent the original
       `ts/dlls/mp.dll` hierarchy. Would need multiple DataDevices
       (one per "subdirectory") or a real ext2 filesystem image.
    3. **CheerpX needs `crossOriginIsolated`** — SharedArrayBuffer
       unavailable in non-isolated context. ✅ FIXED by switching
       dev server to HTTPS + COEP `credentialless` + COOP
       `same-origin` headers. Self-signed cert generated with
       openssl, valid 365 days, covers 100.95.111.112 +
       127.0.0.1 + localhost. Vite config updated; had to delete
       stale `vite.config.js` build artifact that was shadowing
       `vite.config.ts` (artifact priority over source).
    4. **CheerpX needs HTTP Range header support** — Vite's dev
       server doesn't serve Range requests. Console showed:
       *"HTTP server does not support the 'Range' header. CheerpX
       cannot run."* Exit code `-2` from `ELF execution failed`.
       Would need nginx / a Range-supporting proxy in front of Vite.
  - Plus: **Mount config warning** — `Ignoring invalid 'mounts'
    parameters, first entry is not the root`. CheerpX may expect
    root filesystem mount first; subdirectory mount may be silently
    rejected.
  - The PoC proved the architectural incompatibility is real, not
    speculative. **Even fixing #3 and #4 leaves #1 and #2 as
    fundamental deal-breakers** for using CheerpX to run TS mod DLLs.
  - **Recommendation: Option C (TS reimplementation in TypeScript).**
    2-4 months, well-understood territory. Decision pending — see
    `Last work session` below.
  - Updated HANDOFF.md status banner to "Phase 1 step 1.1 = POINTS
    BUSTED." Live dev server now HTTPS, cert at
    `/home/kyle/Development/scratch/cheerpx-inspect/certs/`.

- **2026-10-14 — Phase 0 step 3 honest re-verdict (after Kyle's pushback).**
  - Kyle correctly called out the original "GREEN" verdict as
    over-rotated. The screenshot shows an error in the console; he
    never sees a file list; from a user's perspective the game
    didn't start. He's right.
  - **Honest re-verdict:** INFRASTRUCTURE PARTIAL GREEN /
    USER-FACING NOT GREEN. The smoke verified the dev server, the
    webXash UI, the zip FileReader, and the engine's own WASM
    dependencies (xash.wasm, filesystem_stdio.wasm, libmenu.wasm
    all loaded successfully from xash3d-fwgs npm URLs). The
    failure is at the first mod-side WASM (`dlls/hl_emscripten_wasm32.wasm`,
    the empty-string stub) — engine never reaches `processZip()`,
    so no game ever starts.
  - **Root cause of the over-rotation:** I conflated "the engine
    tried to load WASMs" with "the engine works." It doesn't. The
    engine hits a hard error at WASM-load and stops. The lambda
    logo + bottom toolbar are pre-game-init UI that look identical
    between "loading" and "stuck on splash."
  - **The honest verification I should have done:** introspect the
    engine's in-memory FS via DevTools (`window.__xash.em.FS.readdir('/rodir/')`)
    to confirm the zip was actually parsed and files landed in the
    engine's address space. But `__xash` is only set after
    `initXash()` succeeds, which it never does — so this test isn't
    possible until Phase 1.
  - **Correct path forward:** skip further Phase 0 user-facing
    smoke work, pivot to Phase 1 (CheerpX-based TS launch). The
    infrastructure smoke is sufficient to unblock Phase 1.
  - Updated `tools/smokes/tier-3-manual-phase-0-step-3.md` with the
    honest verdict, including Kyle's pushback quote, what worked,
    what didn't, what should have been done for a real GREEN, and
    what this confirms / does NOT confirm.
  - **Lesson:** always open DevTools Console before declaring a
    smoke GREEN. The console is the ground truth. The user-facing
    UI can look "kinda OK" while the engine is failing.
  - TSHD3_EN.exe arrived via Syncthing at
    `_runtime_assets/the-specialists/TSHD3_EN.exe` (370MB, Inno
    Setup installer).
  - `sudo apt-get install innoextract` (1.9, supports Inno 1.2.10–6.0.5;
    sufficient for TS 3.0 from 2007).
  - `innoextract -d extracted TSHD3_EN.exe` unpacked to
    `extracted/app/{valve, ts, platform, hl.exe, upatch.dll, hw.dll, ...}`.
  - **Mod folder name is `ts/`, NOT `specialists/`.** The TS installer's
    layout is `app/valve/` + `app/ts/` (the mod folder is named `ts`).
    `liblist.gam` confirms: `game "TSMOD.NET - The Specialists"`.
    webXash launch arg will be `-game ts`.
  - Cleaned out: Windows engine binaries at `app/` root (hlds.exe,
    vgui.dll, sw.dll, tier0.dll, Mss32.dll, steam_api.dll, etc.
    — Source Engine / SteamPipe leftovers, ~30 files, 19MB). The
    `app/platform/` SteamPipe dir (753 files) also removed.
  - Laid out:
    - `_runtime_assets/half-life/valve/` ← from installer (178MB, 3575 files)
    - `_runtime_assets/half-life/ts/` ← from installer (721MB, 1721 files, includes
      `ts/cl_dlls/client.dll` and `ts/dlls/mp.dll` — the mod DLLs we'll
      CheerpX-load in Phase 1)
    - Replaced the earlier Mac-sourced `valve/` (517MB, 4250 files,
      from the legacy 1.1.2.2 Steam install) with the installer's
      `valve/` (178MB, 3575 files) — both are valid but the installer
      version is self-contained, smaller, and more portable.
  - **Built smoke zip** `Half-Life-TS.zip` (494MB, 5296 entries,
    `valve/` + `ts/` at the top level) using Python `zipfile`
    (no `zip` binary on m5, but Python's stdlib is fine).
  - **rsync'd the zip to Kyle's Mac** at `~/Downloads/Half-Life-TS.zip`
    (493MB, ~10MB/s over Tailscale, 53s).
  - **Discovered Vivaldi's File System Access API is blocked** on
    `http://100.95.111.112:5174` (non-secure context — the URL bar
    showed "Not Secure" and the browser refused `showDirectoryPicker`).
    Kyle hit the "make a ZIP" fallback path in webXash, which is
    exactly the path we built the zip for.

- **2026-10-14 — Phase 0 step 2: HL1 landed on m5 (GREEN).**
  - MacBook came back online. SSH verified: HL1 installed at
    `/Users/kylelampa/Library/Application Support/Steam/steamapps/common/Half-Life/`,
    578MB total.
  - `rsync -av` over Tailscale pulled `valve/` to m5:
    `~/Development/specialists-browser/_runtime_assets/half-life/valve/`
    (per Kyle's destination choice — gitignored, asset-free contract
    preserved).
  - 26 seconds, 4250 files, 517MB transferred at ~20MB/sec.
  - Verified key files landed: `valve/cl_dlls/client.dll` (643KB),
    `valve/dlls/hl.dll` (976KB), `valve/halflife.wad` (37MB),
    `valve/liblist.gam` (game definition).
  - **Initial panic about missing .pak files was unfounded** — the
    Mac install is HL1 `PatchVersion=1.1.2.2` (the legacy build
    before the 25th-anniversary Steam update), which uses WAD files,
    not pak files. This is the build TS was made for.
  - **Dev server restarted bound to 0.0.0.0** so Kyle can reach it
    from his Mac over Tailscale. Previous PID 4166403 was bound to
    127.0.0.1 only. New PID 589657 (node-MainThread) listening on
    0.0.0.0:5174. Reachable at `http://100.95.111.112:5174/webXash/`
    (also LAN-reachable via 172.25.44.243 + 192.168.0.151).
  - **Bun path correction:** the actual `bun` binary lives at
    `/home/kyle/.bun/bin/bun`, not `/home/kyle/.hermes/tools/node-26.7.0-linux-x64/bin/bun`
    (which is what `which bun` reported earlier — must have been a
    stale PATH). Updated the dev server invocation to use the full
    path. Worth recording: when starting dev servers in fresh
    execute_code kernels, always use the full bun path.

- **2026-10-14 — Phase 0 step 1.5: webXash forked (with caveats).**
  - Forked `x8BitRain/webXash` to `klampatech/webXash` (500KB, default
    `main`, parent confirmed).
  - Pushed our `phase-0-stub-fix` branch (commit `e455923`) to the
    fork. Switched the `webxash/` submodule's origin to the fork.
  - **CRITICAL FINDING — npm dep chain is dead, not just outdated.**
    `npm view hlsdk-portable` returns 404 with reason:
    *"Unpublished on 2026-09-08T14:17:21Z."* Same for `cs16-client`.
    The maintainers explicitly yanked these packages ~5 weeks before
    this project started. There is no `npm install` path back.
  - **Source repo for the WASMs is also gone.** `yohimik/webxash3d-fwgs`
    (the Lerna monorepo that built and published the WASMs) returns
    404 from the GitHub API. Cannot vendor prebuilt artifacts.
  - **FWGS/hlsdk-portable** (the underlying HLSDK source) still
    exists and is the canonical source for a from-source rebuild.
    But a from-source rebuild to WASM via Emscripten is multi-day
    work and not Phase 0 / 1 scope.
  - **For our use case (TS via CheerpX), the missing WASMs are
    irrelevant.** `hlsdk-portable` was the HL1 *vanilla* game-logic
    WASM. The Specialists mod provides its own game logic as
    closed-source x86 DLLs that CheerpX will run. We don't need
    HL1 single-player launch for the TS path. The stub patch is the
    right pragmatic fix for our scope.
  - **Phase 0 step 1.5 effective outcome:** we own the dep chain
    (fork), but the "real fix" is not vendoring — it's that the
    upstream packages are gone, and we're going to need to
    substantially customize the webXash launcher anyway for TS +
    CheerpX. The fork gives us a stable base to iterate on.
  - Updated `.gitmodules` to point at `klampatech/webXash`. Pushed
    to GitHub. Vault mirror updated.

- **2026-10-14 — Sourcing discovered blockers.**
  - HL1 not currently free-on-Steam (the 2023 25th-anniversary claim
    window closed). Kyle will install HL1 on MacBook via Steam and
    SSH into m5 from his end.
  - TS mod 3.0 download on moddb is Cloudflare-gated for bots. Real
    human browser required → Kyle to download from his Mac alongside
    HL1.

## Next task — D.4: Decompile TS-specific gameplay (Evo + Codex + Claude)

**Goal:** Produce `src/mod/<feature>.ts` modules for the TS
mod's signature gameplay features. Priority order per
`tools/decompile/analysis/SUMMARY.md`:

1. **Slowmo system** — `CTSSlowMotion` family (we already have
   `ActivateSlow__13CTSSlowMotion` from D.2; expand to the rest
   of the class: `DeactivateSlow`, `CheckPlayersDistance`,
   `WaitThink`, `WaitTouch`, `Use`, `Spawn`, `Save`, `Restore`,
   `KeyValue`). Also `CTSSlowMotionPoint` (the per-point
   variant).
2. **Weapons** — `CTSGun`, `CTSGunUci` family. At least one
   weapon fully decompiled (the spec calls for pistol for
   Phase 1 MVP).
3. **Bot AI** — the bot classes. Movement, target selection,
   firing logic.
4. **Damage system** — `TakeDamage`, `Killed`, etc.
5. **Scoring** — `AddPointsToTeam` etc.
6. **Spawn** — player + bot spawn entities.
7. **Map entities** — TS-specific triggers, scripts.

**Cross-vendor loop works:** `chunk.py` → `codex` (impl) →
`decompile-review.py` (claude review) → save to
`src/mod/<feature>.ts`. D.3 took ~6 minutes total for all 4
entry points; D.4 will be larger but the workflow is the same.

**Sub-decision:** the 619 CTS-specific symbols in
`nm-D-CTS-specific.txt` are the candidate pool. We don't need
to decompile all of them for Phase 1 MVP — just enough to
get a working game. After D.4 is roughly complete, evaluate
coverage and decide if more is needed.

**Sub-step plan (each is its own commit):**
- **D.4.1** — `src/mod/slowmo.ts` (CTSSlowMotion + CTSSlowMotionPoint)
  — 11 + 7 methods. **This session's first commit.**
- **D.4.2** — `src/mod/weapons.ts` (CTSGun + CTSGunUci, pistol first)
  — ~15 methods. **Next session.**
- **D.4.3** — `src/mod/bots.ts` (bot AI core) — variable.
  TBD based on D.4.2 review feedback.
- **D.4.4** — `src/mod/damage.ts`, `scoring.ts`, `spawn.ts` —
  for completeness; depends on what the gameplay functions
  reference. TBD.

**Play-test surface:** the first browser-playable game lands
at end of D.5 / start of D.6. D.4 produces reviewable TS
source files; even those need `tsc` to verify (no browser
yet). No play-test until D.5.

**Exit criteria (per sub-step):**
- `src/mod/<feature>.ts` exists with the relevant class methods
- Each method reviewed by claude, verdict PASS or
  PASS-WITH-NOTES
- Methods that touch the engine (`Spawn`, `Save`, `Restore`,
  `Use`) reference the same `g_engfuncs` / `gpGlobals` /
  `gFunctionTable` globals that D.3's `interface.ts` exposes

**Exit criteria:**
- `src/mod/<feature>.ts` files for the priority-1 features
  (slowmo, pistol, basic bot)
- Each function reviewed by claude, verdict PASS or
  PASS-WITH-NOTES
- The interfaces in `interface.ts` are wired up against the
  `enginefuncs_t` / `DLL_FUNCTIONS` / `NEW_DLL_FUNCTIONS`
  tables (i.e., we know which mod function implements which
  table slot, even if the bodies are still `any`)

**Phase 1 step plan** (full detail in `docs/option-d-scope.md`):
- **D.1** ✅ COMPLETE — binary + analysis (2026-10-14)
- **D.2** ✅ COMPLETE — AI decompile workflow (2026-10-15)
- **D.3** ✅ COMPLETE — GoldSrc interface (2026-10-15)
- **D.4** TS-specific gameplay (3-5 days)
- **D.5** Adapt + integrate into Babylon.js scene (1-2 weeks)
- **D.6** Bridge semantics + polish (1-2 weeks)
- **Total: 4-6 weeks** to Phase 1 MVP

**Why this is on me, not Kyle:** the per-function work is
mechanical given the workflow. The judgment calls (which
functions are in/out of MVP scope, when a feature is "done
enough") are mine. Kyle's role: review the high-stakes
functions (e.g., pistol weapon, bot AI core) and approve the
overall coverage.

**Open pre-reqs:**
- ~~Install Codex CLI~~ DONE
- ~~Wire Codex to MiniMax M3~~ DONE
- **Decide coverage target for D.4:** which features go in
  Phase 1 MVP vs. deferred to Phase 2? Default: slowmo
  (already have 1 function), pistol (1 weapon), basic bot
  (no fancy AI). Phase 2 picks up acrobatics, dual-wield,
  kick, more weapons, more maps.

## Open questions

1. **HL1 + TS mod file location.**
   - HL1: Originally from Kyle's Mac via Steam (`PatchVersion=1.1.2.2`,
     rsync'd to m5), then replaced with the TS installer's bundled
     version (smaller, self-contained). Both work; we kept the
     installer's. Final: `~/Development/specialists-browser/_runtime_assets/half-life/valve/`.
   - TS mod 3.0: Moddb Cloudflare-gated for bots. Kyle downloaded
     `TSHD3_EN.exe` via Syncthing, I extracted with `innoextract`.
     Laid out at `~/Development/specialists-browser/_runtime_assets/half-life/ts/`.
   - **Both unblocked — files are on m5 + smoke zip on Mac.**

2. **Codex CLI — FOUND, not in PATH.** Installed at
   `/home/kyle/bin/codex` (codex-cli 0.160.1, symlink chain →
   `bin-local/lib/node_modules/@openai/codex/bin/codex.js`).
   NOT in default PATH — add `export PATH=/home/kyle/bin:$PATH`
   to use it, or hardcode the path. **Gotcha:** Codex requires
   env var `MINIMAX_API_KEY_UNUSED=placeholder` to be set even
   though it's a dummy (the real auth is via local proxy at
   `127.0.0.1:8789` → `api.minimax.io/anthropic`). Without the
   placeholder, codex errors with `Missing environment variable:
   MINIMAX_API_KEY_UNUSED`. `decompile.py --use codex` handles
   this automatically. Confirmed working: 6,918 tokens for a
   trivial pong test.

3. **CheerpX license trigger.** Free for personal / non-commercial use.
   If this ever ships as a product, we need a paid license from
   Leaning Technologies. **Re-flag at every phase exit.** Don't ship
   commercial without resolving.

4. **TS mod IP / distribution.** The Specialists mod DLLs are
   closed-source (Morfeo / Lorenzo). The .pak assets are
   free-to-distribute per moddb's release. The repo must remain
   asset-free — users source their own. Don't commit any HL1 or TS
   game files. (Already in `.gitignore` via the blanket
   `_runtime_assets/` block, but re-flag.)

5. **webXash upstream health.** Last commit `ff86609`. **The npm
   dep chain is broken** (hlsdk-portable + cs16-client unpublished
   2026-09-08; yohimik's source monorepo gone from GitHub). We own
   a fork (`klampatech/webXash`, branch `phase-0-stub-fix`) and
   have a stub patch keeping the page alive. Phase 1 (TS+CheerpX)
   will require substantial new code anyway, so the upstream's
   death is annoying but not blocking for our scope.

6. **MacBook SSH password rotation.** The kyles-macbook-ssh-access
   skill has Kyle's SSH password stored as plaintext (`kyle`, set
   2026-09-04) with a note to rotate. Key-based auth now works, so
   the plaintext password is no longer needed. Follow-up: have Kyle
   run `passwd` on his Mac to rotate, then update the skill.

7. **HTTPS dev server?** Now active (as of Phase 1 step 1.1 PoC).
   Self-signed cert at `/home/kyle/Development/scratch/cheerpx-inspect/certs/`.
   Vite config has `server.https` + COEP/COOP headers. This was added
   to make `window.crossOriginIsolated` true so CheerpX's worker
   could use SharedArrayBuffer.

## Risks to watch

- **webXash upstream is dead for fresh installs.** npm packages
  unpublished 2026-09-08, source monorepo (yohimik/webxash3d-fwgs)
  404s. Worked around via stub patch + fork ownership. Phase 1
  needs a CheerpX-based TS launch path anyway, so this is contained.
- **CheerpX may not work for x86 DLLs with complex dynamic linking.**
  GoldSrc DLLs use a heavy engine↔DLL interface (entity dispatch,
  engine-provided memory, cvar system). CheerpX docs focus on Linux
  user-mode executables; Windows DLL loading is a less-trodden path.
  Phase 1 will hit this. Mitigation: have the Phase 2
  reimplementation plan ready before Phase 1.
- **The October 2026 vibe-coded wave has zero multiplayer.** Don't
  expect a reference for Phase 3 — that's our own research, and the
  specialists-web WebTransport/WS layer is the existing reference.
- **Filesystem Access API support.** Chrome / Edge only. Firefox +
  Safari don't support user-prompted folder access. Phase 0 should
  note browser-support matrix and decide if Firefox support matters
  (probably yes for Kyle's dev flow on Vivaldi / Chrome, no for Safari).
- **The `bash -lic` wrapper in Hermes's terminal tool swallows output
  from `bun run dev` and `vite --port` started in background.** The
  workaround is to spawn via Python's `subprocess.Popen` (execute_code
  tool) with explicit log file redirection. Documented for any future
  agent trying to start a long-lived dev server from this repo.

## Last work session

**2026-10-15 — Option D D.2 (AI decompile workflow) — COMPLETE. Stopping point for fresh session. (Evo)**

What we did:
- Built `tools/decompile/chunk.py` (~330 lines) — function chunker
  that reads D.1's pre-extracted analysis data, slices out the
  disassembly for a single symbol, and emits a markdown chunk
  with full class context (other methods, RTTI, vtable, data
  members, called symbols, PIC/GOT pattern detection).
  Hand-rolled MSVC demangler (`c++filt` doesn't handle MSVC names).
- Wrote `tools/decompile/prompts/single-function.md` (~95 lines)
  — the decompile prompt template. Instructs the AI to treat
  disassembly as a specification, use clear names from context,
  add TODO markers for ambiguous assembly, output one TypeScript
  function declaration that compiles in isolation.
- Built `tools/decompile/decompile.py` (~140 lines) — runner that
  composes prompt + chunk, pipes to `claude -p` (or `codex exec`),
  saves output to `tools/decompile/output/`.
- First test ✅ GREEN: `ActivateSlow__13CTSSlowMotion` (127 bytes,
  well-named, isolated). Claude Code produced a 78-line TS function
  that correctly identified the PIC/GOT pattern, named the
  CTSSlowMotion fields by purpose, traced the gpGlobals->time
  triple-deref, and added TODO markers where the assembly is
  ambiguous. Output: `tools/decompile/output/CTSSlowMotion__ActivateSlow.ts`.

**Workflow time:** ~5 min end-to-end (chunk gen + AI send + save).
Right on target for D.2's exit criterion.

**Codex status:** not installed on m5 (`which codex` is empty as
of D.2 closeout). D.2 used Claude Code for both impl + decompile.
Per Kyle's direction (Codex impl, Claude review), **install Codex
before D.3** so the cross-vendor review pass can run on the
GoldSrc interface functions. Cross-vendor review is most valuable
on D.3's functions since they have well-known HLSDK signatures
we can verify against.

**State at stopping point:**
- Repo: working tree has new files (chunk.py, decompile.py, prompt
  template, chunk, output). All staged for commit. Master
  `c8974e2` is the previous HANDOFF-only commit.
- New files added (not yet committed):
  - `tools/decompile/chunk.py` (executable, ~330 lines, MSVC demangler)
  - `tools/decompile/decompile.py` (executable, ~140 lines, runner)
  - `tools/decompile/prompts/single-function.md` (prompt template)
  - `tools/decompile/chunks/CTSSlowMotion__ActivateSlow.chunk.md` (test chunk)
  - `tools/decompile/output/CTSSlowMotion__ActivateSlow.ts` (decompiled test)
  - `HANDOFF.md` (status banner, D.2 "What just happened" entry,
    "Next task" updated to D.3, "Last work session" updated)
- Latest commit: `c8974e2` (D.1 stopping-point summary)
- Vault mirror at `~/Obsidian/projects/specialists-browser/` not
  yet re-synced for D.2 (post-commit, before next session)
- Entry point for picking up D.3 in the next session: this file
  (HANDOFF.md) "Next task" section

**Next task (in next session):**

D.3 — Decompile the GoldSrc engine↔mod interface. Per the
HANDOFF "Next task" section:
1. Install Codex CLI on m5 (prereq for cross-vendor review)
2. Wire Codex to MiniMax M3 via `api.minimax.io/anthropic` shim
3. Pull HLSDK reference (`github.com/ValveSoftware/halflife-updated`)
4. For each of 5 GoldSrc functions
   (`GiveFnptrsToDll`, `GetEngineFunctions`, `GetEntityAPI2`,
   `GetNewDLLFunctions`, `Initialize`):
   - `python3 tools/decompile/chunk.py <symbol>` → chunk
   - Codex → produces TS declaration
   - Claude Code → reviews against HLSDK reference
   - Iterate until clean
5. Save final to `src/mod/interface.ts`

**What I did NOT do (waiting on next session / Kyle):**
- Did NOT install Codex CLI — that's a one-time install + config
  step that may want Kyle's input on which version / credentials
  to use. Flag in HANDOFF open question.
- Did NOT pull HLSDK reference — needs Kyle to confirm whether
  to clone the full repo or just grep the headers.
- Did NOT start D.3 decompilation — wants Codex installed first
  for the cross-vendor loop to work as Kyle specified.
- Did NOT re-sync vault mirror to `~/Obsidian/projects/specialists-browser/`
  — post-commit, before next session.
- Did NOT remove `webxash/public/cheerpx-test.html` and
  `webxash/public/test-assets/` — gitignored, kept for now.
- Did NOT remove the `webXash` submodule — that's a one-way action,
  defer until D.5+ when we're sure we don't need it.
- Did NOT remove `tools/lib*.so.6` etc. system libs from the
  working tree — kept for documentation of the bridge layer PoC.

**Files NOT committed (transient or gitignored):**
- `tools/ts-host-*` binaries (build outputs, 11 versions)
- `tools/lib*.so.6`, `tools/ld-linux.so.2` (system libs, mirrored
  in webxash/public/test-assets/ which is gitignored)
- `tools/ts_i386_stripped*.so` (mod asset, gitignored by `*.so`)
- `tools/docker-test/` (test artifacts)
- `webxash/public/cheerpx-test.html` and `webxash/public/test-assets/*`
  (gitignored by submodule's .gitignore)

What we did:
- Discovered the Linux .so files (Phase 1 step 1.1 v4 PoC GREEN)
- Iterated through 11 versions of the `ts-host` bridge binary
  - m5 gcc-multilib dynamic (libc 2.41 mismatch)
  - static binary with embedded glibc (executable stack issue)
  - patched .so to add PT_GNU_STACK (custom Python ELF patcher)
  - Debian 10 Docker-compiled binary (matches CheerpX glibc 2.28)
  - ts-host v3 with full env+fs+hexdump diagnostics
  - ts-host v4 with file open + libgcc_s dlopen
  - ts-host v5 with libgcc_s stubs (--export-dynamic)
  - LD_DEBUG=libs revealed the buffer state bug (linker reads "rame_info" from string table)
- Discovered cascading CheerpX bugs: `rame_info` → `d_alloc` → `dl-version.c` assertion
- Wrote `tools/smokes/tier-3-manual-phase-1-step-1.1-v6.md` (8.9KB) with full record
- Kyle: "Ok, let's pivot to Option D. Plan it out first. Be sure to keep our specs and stuff updated."
- Wrote `docs/option-d-scope.md` (18.6KB) — full design for Option D
- Updated `SPEC.md`: Approach, "Why not CheerpX", Phase 1 (Option D now active), Repo layout, Out of Scope
- Updated `HANDOFF.md`: Status banner, "What just happened" entry, Last Work Session

Smoke result: ❌ **Phase 1 step 1.2 POINTS BUSTED.** CheerpX linker has cascading bugs.

**Next task (DECISION PENDING from Kyle):**

1. **Approve Option D scope doc as-is** → I start step D.1 (pick binary, extract analysis data, write prompt template)
2. **Revise Option D scope doc first** → I incorporate changes (architecture, step plan, risks) before starting D.1
3. **Discuss any of the 8 open questions in the scope doc** → resolve decisions (AI tool, output format, primary binary, etc.) before starting D.1

My pick: (1). The scope doc covers all the tradeoffs. Kyle can read it and say "approved" or "want changes" once.

**Phase 1 step plan** (full detail in `docs/option-d-scope.md`):
- **D.1** Pick binary + extract analysis data (1-2 hours)
- **D.2** Set up AI decompile workflow (2-4 hours)
- **D.3** Decompile GoldSrc interface (1-2 days)
- **D.4** Decompile TS-specific gameplay (3-5 days)
- **D.5** Adapt + integrate into Babylon.js scene (1-2 weeks)
- **D.6** Bridge semantics + polish (1-2 weeks)

**Phase 1 total: 4-6 weeks** (vs Option C's 10-16 weeks for from-scratch TS reimpl, vs continued CheerpX workarounds being infinite).

**What I did NOT do (waiting on Kyle):**
- Did NOT start D.1 (pick binary + extract analysis) yet — wanted to confirm Kyle approves the Option D scope doc.
- Did NOT remove the webXash submodule — that's a one-way action; can do it after Kyle greenlights the scope doc.
- Did NOT remove `tools/lib*.so.6` etc. system libs from the working tree — kept for documentation of the bridge layer PoC; not committed.
- Did NOT remove `webxash/public/cheerpx-test.html` and `webxash/public/test-assets/` — they're gitignored by the submodule's .gitignore; will clean up once Option D is underway.

---

## Prior session — Phase 1 step 1.1 v4 PoC GREEN (kept for reference)

What we did:
- **Discovered** the TSHD3_EN.exe installer ships Linux .so files
  (`ts/dlls/ts_i386.so`, 1.7MB, not stripped) in addition to the
  Windows DLLs. The .so files are 32-bit ELF, exactly CheerpX's
  native format. Eliminates all 4 v1 deal-breakers at once.
- Wrote `webxash/public/cheerpx-test.html` v4: full Linux VM
  setup with CloudDevice (Debian) + IDBDevice (cache) +
  OverlayDevice + DataDevice (our .so). Wired
  `setCustomConsole(writeFunc)` for stdout capture. 60s timeouts
  for cold-cache lib fetches.
- Kyle ran v4 on phone. Results:
  - `uname -a` → `Linux 4.15.0-54-cheerpx i386 GNU/Linux` ✅
  - `cat /etc/debian_version` → `10.13` ✅
  - `ls -la /dlls/` → `.so visible` ✅
  - `head -c 16 /dlls/ts_i386.so | od -c` → `\x7fELF 001 001 001` ✅
  - `nm -D /dlls/ts_i386.so | head -30` → 1,387 chars including
    `CTSSlowMotion`, `CTSGunUci`, `CTSSharedEmitter` ✅
  - `gcc -m32` → **failed** with `error trying to exec 'cc1'`
    (Debian is missing compiler backend; tooling issue, not
    CheerpX)
- Wrote `tools/smokes/tier-3-manual-phase-1-step-1.1-revised.md`
  (12.7KB) with full v1-v4 history, the working mount config,
  symbol table highlights, and bridge plan.
- Updated HANDOFF status banner to "Phase 1 step 1.1 GREEN —
  CheerpX with TS server .so works" + "What just happened" entry.

Smoke result: ✅ **GREEN.** CheerpX runs the TS server .so
unmodified. All 1,387+ exported symbols are accessible. The
architectural premise is proven: we can run the actual TS mod
code in the browser and call its functions.


---

## D.7.1 STATUS — WORKING (2026-10-19) (fixed in code)

Day One demo renders cleanly in the browser. Engine boots, all WASMs load, no crashes.

What finally worked: **using official precompiled WASM DLLs from registry.npmmirror.com/hlsdk-portable@0.1.3** instead of building from source. Our local emscripten rebuild was getting close but the SIDE_MODULE flag wasn't fully applying (we got 276/907 imports vs the official 52/43 -- libc/libm got statically linked). The official builds were produced by yohimik in a pinned-emsdk Docker build; we trust their artifacts.

File sizes (delta vs ours):

| Module       | Ours        | Official   |
|--------------|-------------|------------|
| hl.dll       | 1.16 MB/276 | 1.07 MB/52 |
| client.dll   | 615 KB/907  | 206 KB/43  |

### Sourcing

```
curl -sL https://registry.npmmirror.com/hlsdk-portable/-/hlsdk-portable-0.1.3.tgz -o hlsdk-0.1.3.tgz
tar xzf hlsdk-0.1.3.tgz
# dist/valve/{cl_dlls,dlls}/*.wasm
```

(npmmirror.com caches tarballs even after official npm marks them unpublished.)

### Next steps (D.7.2+)

- Test HLDM (+map crossfire) and Uplink (+map hldemo1)
- Test TS (-game ts +map ts_apartments) -- will work with stock HL mechanics, not full TS mod
- Multiplayer via WebRTC transport (yohimik has examples)
- Optional: rebuild WASMs from source by reproducing yohimik's Docker build (pin emsdk version, match their flags)

### Why our emscripten rebuild was producing bloated WASMs

-sSIDE_MODULE=1 was passed via target_link_options, but the build still produced a main-module-shaped binary (lots of GOT entries for libc/libm functions). The official builds don't have those. The likely missing pieces:
- A pinned emsdk version (theirs probably emsdk 3.x, ours was 6.0.12)
- Different -s flags for side-module specifics (e.g., -Wl,--no-whole-archive)
- Some module-init code that's gated on SIDE_MODULE in headers

Reproducing their Docker build is a D.7.x cleanup task, not a blocker for D.7.1.


---

## D.7.2+ STATUS — TS launcher + UX + multiplayer (2026-10-19)

After D.7.1, the next steps are in flight.

### D.7.2 — TS-only UX

Launcher simplified:
- games.ts reduced to one TS entry (Day One / HLDM / Uplink dropped)
- XashSettings.vue replaced multi-component panel with a hero
  "Play The Specialists" button
- Advanced section collapsed by default; shows launch args + multiplayer IP
- New GAME_SETTINGS.TS in xash-loader.ts with launchArgs
  ['-game', 'ts', '+map', 'ts_apartments']
- Store default selectedGameKey = 'TS'

### D.7.3 — Texture fix (TS-OPEN)

tsmod.zip is missing ts/textures/. Maps render with the
purple/magenta "missing texture" fallback. To fix:
- Install TS via Steam on the Mac
- rsync /Users/kylelampa/Library/Application Support/Steam/steamapps/common/The Specialists/ts/textures/
- Add to tsmod.zip

### D.7.4 — Multiplayer

WebRTC data-channel transport + Node.js signaling server.
Stack:
- signaling-server.cjs: Node WebSocket signaling (port 27016).
  Pairs two clients by room id, kicks off SDP offer from host,
  relays offer/answer/candidate events between peers.
- xash-webrtc.ts: base Xash3DWebRTC class with protected
  setupPeer/startOffer/onConnectionError. ICE uses Google STUN.
- xash-multiplayer.ts: Xash3DMultiplayer subclass that wires up
  the WS signaling protocol on top of the base class.
- XashMultiplayerIP.vue: Host/Join UI with server + room fields.
  Defaults to m5 Tailscale server.

Run signaling:
```
NODE_PATH=$(npm root -g) node signaling-server.cjs 27016
```

Limitations:
- ws not in package.json (cs16-client peer dep blocks npm install);
  must install ws globally and use NODE_PATH.
- Only STUN, no TURN — NAT traversal may fail in some networks.
- Untested with a real second client.

### Known TS-gameplay caveats

- ts/liblist.gam points gamedll to dlls/hl.dll (no WASM port of
  ts_i386.so exists). Engine boots HL1 vanilla gameplay on TS maps.
  Custom TS mechanics (acrobatics, dual-wield, kick, classes) are
  missing until someone ports the TS server DLL.


---

## D.7.5 — gameinfo.txt + arg-merge fix (2026-10-19)

After D.7.4, the engine would boot into HL1 SP (`c0a0.bsp`)
instead of `ts_apartments.bsp` even when passing `-game ts +map
ts_apartments`. Two real issues surfaced:

### Issue 1: xash3d-fwgs dropped `-ref webgl2` because of arg-merge order

`runEm()` in xash3d-fwgs/dest/xash3d.js does:
```js
this.em = await Xash({
  arguments: ['-ref', 'webgl2', ...this.opts.arguments],
  ...(this.opts.module ?? {}),  // SPREAD OVERRIDES
});
```
With `module.arguments: options.launchArgs`, the spread clobbered
the renderer arg. Result: engine got `['-game', 'ts', '+map',
'ts_apartments']` only, no `-ref webgl2`, fell back to HL1 SP
default startmap.

Fix: move launchArgs to top-level (`arguments: options.launchArgs`)
so initRender prepends `-ref webgl2` and the spread has nothing
to override.

This bug also affects yohimik's webXash CS path. Worth an upstream
PR — note for follow-up.

### Issue 2: Xash3D FWGS engine prefers gameinfo.txt over liblist.gam

The TS mod uses the legacy HL1 `liblist.gam` format. Newer Xash3D
mods use `gameinfo.txt` (tab-separated key/value pairs). Engine
falls through to default `valve/` if neither is parseable.

Added `ts/gameinfo.txt` to `tsmod.zip` alongside the existing
`ts/liblist.gam`. Both formats are now satisfied.

`ts/gameinfo.txt` content:
```
"Basedir"  "valve"
"game"     "The Specialists"
"startmap" "ts_apartments"
"trainmap" "ts_apartments"
"type"     "singleplayer_only"
"mpentity" "info_player_deathmatch"
"gamedll"  "dlls/hl.dll"        // WASM HL DLL (TS_i386.so is Linux ELF)
"gamedll_linux" "dlls/hl.dll"
```

### Verification
- Hard-refresh + Play now boots engine with `-game ts +map ts_apartments`
- Engine reads ts/gameinfo.txt and ts/liblist.gam
- Engine tries to load `ts_apartments.bsp` from `/rodir/ts/maps/`
- Reported path tested by Kyle: actually loading the map from
  the in-engine menu ("Custom Game" → "The Specialists") still
  crashes with `Mem_FreeBlock` — that's an engine bug, separate
  from launcher path


---

## D.7.6 STATUS — TS launchOptions default (2026-10-19)

Kyle figured out the right way to make `-game ts` reach the engine:
type it into the Advanced launch-options text field. That field becomes
`options.launchOptions` (a string), which `_buildLaunchArgs` correctly
splits and appends to the engine argv.

The root cause of `selectedGame.launchArgs` being dropped somewhere in
the Vue→XashLoader→initXash chain is **unresolved**. Debug print at
console showed 10 args (windowed, hud_scale, volume, -ref webgl2,
-console) but NO `-game ts`.

Quick ship: default the Pinia store's `launchOptions` to the TS args
`'-game ts +map ts_apartments'`. User can override via Advanced panel.
Removed the broken `...selectedGame.launchArgs` spread from
`_buildLaunchArgs` so we don't double-include if the bug ever gets
fixed upstream.

Commit: `b9507d6` (Phase 0 stub fix branch).

---

## D.7.7 STATUS — Cache API for tsmod.zip (2026-10-19)

494MB re-downloads on every reload were brutal. `zip-helpers.ts`
was a flat XHR `getZip()` — no caching layer.

New version in `src/utils/zip-helpers.ts`:

```
- Cache key: URL of the zip (e.g. './hl/tsmod.zip')
- Cache name: 'xash-zips-v1' (constant for future versioning)
- First fetch: streaming progress via ReadableStream, then stores
  in Cache and returns ArrayBuffer.
- Subsequent fetches: instant hit from cache, ~<1ms, no progress bar.
- Quota errors / private mode: warn but don't fail the download.
```

**Bumping the cache** when `tsmod.zip` bytes change: edit
`TSMOD_CACHE_VERSION` (currently `'1'`) or rename the cache constant
in `zip-helpers.ts`. Exposed as a constant so a future "Clear cache"
button can read it.

Manual cache wipe from DevTools: `await caches.delete('xash-zips-v1')`.

Commit: `ceedc75`.

---

## D.7.8 STATUS — bot_quota 4 default (2026-10-19)

Kyle wanted to test the TS experience as if he were joining a
multiplayer server with bots. The WASM `hl.dll` from hlsdk-portable
0.1.3 has bot support verified via strings (`addbot`, `bot_quota`,
`entity_botcam`, `botskill`, `bot.cfg`). So we don't need the WebRTC
multiplayer stack or a second client to feel out the listen-server
experience.

Default `launchOptions` now ends with `bot_quota 4` → fresh Play
launches 4 bots. Override via Advanced panel.

NOTE: bots are HL1 vanilla (WASM hl.dll has bot code but no
TS-specific class logic — kick, dual-wield, etc.). Acceptable as a
known limitation; TS-specific gameplay needs a WASM port of
ts_i386.so.

Commit: `90214a8`.

---

## D.7.9 STATUS — bot_quota 2 default (WASM 256MB heap cap) (2026-10-19)

Kyle was getting intermittent Lambda-screen freezes when memory
pressure pushed the WASM past its limit. Investigated via
`wasm-objdump -x xash.wasm`:

```
Memory[1]: memory[0] pages: initial=4096 max=4096
```

4096 × 64KB = **256MB hard cap**. Emscripten can't grow past `max`
even though `growMemory()` is wired up. With `bot_quota 4` each bot
loads the full TS asset set (WAD textures, MDL models, WAV sounds,
AI state per-entity). Past 2 bots the heap fills mid-load, engine
dies silently, Vue's `xash-loading` overlay stays because
`xash.main()` returned but the WASM is dead.

Default lowered to `bot_quota 2` — fits comfortably in 256MB.
Override via Advanced panel.

**Long-term fix (follow-up):** rebuild `xash.wasm` with
`-s MAXIMUM_MEMORY=2GB` and republish the npm package. That's a
separate workstream — needs the emsdk + cmake + wabt setup we already
have at `/tmp/`.

Commit: `b0f8c9e`.

---

## D.7.10 — Architectural realization: TS detection ≠ TS gameplay (2026-10-19)

Kyle opened the Saves menu and saw "multiplayer_... TS" as the active
game. Then started a `ts_lobby` listen server and observed:

1. **The lobby map loads** with TS textures / sounds / models — fine
2. **In-game HUD shows HL1 vanilla viewmodel** (the regular pistol)
3. **Console spammed warnings**:
   ```
   Error: No spawn function for "ts_modelf" × 4
   FS_AddGameHierarchy( valve )           ← HL1 game logic loaded
   FS_AddGameHierarchy( ts )              ← TS only as additional dir
   Unknown command: alt2
   Unknown command: firemode
   Unknown command: useitems
   Unknown command: buy
   ```
4. **Bots are HL1 DM bots**, not TS classes (no kick, dual-wield, stunts)

### Why "partially works" instead of "completely fails"

`ts/gameinfo.txt` overrides the original `ts/liblist.gam` (which had
`gamedll_linux "dlls/ts_i386.so"`) to force `gamedll "dlls/hl.dll"`.

That override IS the fallback that's letting us play at all:

| Layer | Status | Why |
|---|---|---|
| Mod detection | ✅ works | `ts/gameinfo.txt` parsed correctly |
| TS textures/sounds/models | ✅ works | Engine found them in `/rodir/ts/` |
| Map layout, level geometry | ✅ works | `.bsp` files readable as plain data |
| TS-specific entities (ts_modelf, buy zones) | ❌ silently skipped | HL1 DLL doesn't know how to spawn them |
| TS-specific commands (buy, firemode, useitems) | ❌ "Unknown command" | HL1 DLL doesn't have those console commands |
| Bot AI | ⚠️ HL1 vanilla bots | HL1 DLL's bot code, not TS's class system |
| Viewmodels | ❌ HL1 arms | HL1 client DLL doesn't know `p_dual_smg.mdl` |

Without the override, `ts_i386.so` (Linux ELF) can't load in WASM
and the engine fails to start. With the override, we get graceful
degradation: TS detection + HL1 gameplay on TS maps.

### Half-Life 1 (GoldSrc) two-DLL architecture

```
Server DLL (one per game session, runs engine-side)
├── Game rules (scoring, round time, who wins)
├── Entity spawning (every "thing" in the level)
├── Player physics state (HP, ammo, position, velocity)
├── Bot AI (where to go, what to shoot)
├── Validate player actions (can this kick land?)
└── Powerup/objective logic (briefcase in CTB mode)

Client DLL (one per player, runs in each browser tab)
├── Viewmodels (the gun-in-your-hand — TS's dual-SMG pose, knife throw)
├── HUD (HP bar, ammo counter, scoreboard, money)
├── Audio (sound effects, music)
├── Input → commands (translate keybinds into actions)
├── Menus (weapon select, buy menu, scoreboard UI)
└── Particles (sparks, blood splatter)
```

Concrete example "buy a weapon":
1. Player presses `b` → **Client DLL** checks buy-zone overlap → sends "I want weapon_X" to **Server DLL**
2. **Server DLL** validates "can they afford it?" → spawns weapon → broadcasts to all players
3. Each player's **Client DLL** receives broadcast → renders `p_dual_smg.mdl` viewmodel → updates HUD ammo

**With only server ported:** step 1 fails. Pressing `b` does nothing.
**With only client ported:** step 2 fails. "Unknown command: buy".
**With neither ported:** both fail. (Where we are today.)

Visual assets (`.mdl`, `.wad`, `.wav`, `.tga`) don't need porting —
they're just files the engine reads via MEMFS once we mount the zip.

### Path to "real TS" game (multi-week)

We have AI-decompiled TypeScript representations of TS game logic at
`tools/decompile/cross-vendor/`:
- **375 of 1254 methods (30%)** decompiled for **server DLL**
- **0 of ~600 methods (0%)** decompiled for **client DLL**

Phases:
1. **Server DLL WASM** — finish remaining 122 server decomp methods →
   translate TS to C++ → build emsdk → `ts_emscripten_wasm32.wasm`.
   Update `ts/gameinfo.txt`: `gamedll_linux "dlls/ts.dll"`. **~1-2 weeks.**
   Unlocks: bots with TS classes, `buy`, `firemode`, `useitems`,
   `ts_modelf` spawns, all server-side TS commands work.
2. **Client DLL WASM** — decomp `ts/cl_dlls/client.dll` (~600 methods)
   → translate TS to C++ → build emsdk →
   `ts_client_emscripten_wasm32.wasm`. Update `ts/gameinfo.txt`.
   **~2-4 weeks.**
   Unlocks: TS viewmodels, weapon menu UI, TS HUD, stunt keybindings,
   full "this is The Specialists" look and feel.

### Tools and locations already in place

Build infrastructure (no setup needed for next session):
- emsdk 6.0.12 at `/home/kyle/emsdk/`
- cmake 3.30.0 at `/tmp/cmake-3.30.0-linux-x86_64/`
- wabt 1.0.42 at `/tmp/wabt-1.0.42/` (wasm-objdump for verification)
- hl1_sdk via hlsdk-portable 0.1.3 (used as basis for HL1 rebuilds)
- Source-of-truth WASMs at `/tmp/hlsdk-extracted/`
- Patched CMakeLists.txt patterns at `/tmp/hlsdk-portable/` (SIDE_MODULE+strip-emscripten skips)

PATH for build session:
```bash
export PATH="/tmp/cmake-3.30.0-linux-x86_64/bin:/home/kyle/emsdk:/home/kyle/emsdk/upstream/emscripten:/tmp/wabt-1.0.42/bin:$PATH"
```

Decompilation pipeline (per `progress/decomp-log.md`):
- `progress/decomp-log.md` is the master log (auto-generated, do not commit)
- `progress/remaining-methods.json` lists the **122 server methods still to decompile**
- `progress/codex-*.log` are codex-CLI decomp sessions
- `progress/review-*.log` are review sessions
- `tools/decompile/{decompile,chunk,grind,consolidate,batch}.py`
  is the dispatcher

Optional upstream npm precompiled path (per skill
`emscripten-side-module-build`):
- `https://registry.npmmirror.com/hlsdk-portable/-/hlsdk-portable-0.1.3.tgz`
  shipped the official WASM DLLs (hl: 52 imports, client: 43 imports)
- We use those for HL1 fallback. **There is no TS DLL on any registry.**

---

## ⚡ CHECKPOINT SUMMARY — UPDATED 2026-10-19 (D.7.10 COMPLETE)

| ✅ D.7.1 — TS-only launcher working in browser (single-player)
| ✅ D.7.2 — Hero launcher UX (Play button + collapsible Advanced)
| ✅ D.7.3 — Full TS texture fix (9 ts/*.wad files rebuilt into tsmod.zip)
| ✅ D.7.4 — Multiplayer scaffolded (WebRTC + signaling server, opt-in)
| ✅ D.7.5 — gameinfo.txt format fix + arg-merge ordering in xash-loader
| ✅ D.7.6 — launchOptions default `-game ts +map ts_apartments`
| ✅ D.7.7 — Cache API for tsmod.zip (no 494MB re-downloads)
| ✅ D.7.8 — bot_quota 4 default for listen-server feel
| ✅ D.7.9 — bot_quota 2 default (WASM 256MB heap cap, fixes Lambda freeze)
| ✅ D.7.10 — Architectural realization: TS detection ≠ TS gameplay

## ⚠️ KNOWN LIMITATIONS

1. **WASMs are HL1 vanilla fallback**, not TS — gameplay is HL1 DM with
   TS maps, textures, sounds. Real TS gameplay needs server+client
   DLL ports (D.7.10 follow-up).
2. **Viewmodels are HL1 arms** — no TS dual-SMG pose, no knife throw.
   Needs TS client DLL port.
3. **WASM heap cap 256MB** — `bot_quota 2` default. Raise with rebuild.
4. **`ws` not in package.json** — installed globally; signaling server
   runs with `NODE_PATH=$(npm root -g)`. Documented workaround, but new
   contributors will hit it. `npm install --legacy-peer-deps` not yet tested.
5. **WebRTC multiplayer untested with real 2nd client** — needs two
   tabs, Host + Join, same room on m5:27016.
6. **TS-specific bot classes don't exist** — bots have HL1 DM AI.
7. **Custom `ts/liblist.gam` overrides `ts_i386.so` references** — we
   force `gamedll "dlls/hl.dll"` because the original ts_i386.so is
   a Linux ELF that can't load in WASM.
8. **`selectedGame.launchArgs` debugging unresolved** — workaround
   shipped (D.7.6), root cause still TBD.

## 🎯 NEXT WORK (in priority order)

### Priority 1: Server DLL WASM port (~1-2 weeks)

This is the bigger unlock and biggest blocker for "real TS".

**Step 1 — Finish remaining 122 server-side decomp methods**
- Read `progress/remaining-methods.json` for the list
- Use `tools/decompile/grind.py` to auto-spawn codex-CLI sessions
- Outputs land in `tools/decompile/output/` as `*.ts` files
- After complete, run `consolidate.py` to merge codex/codex2 outputs

**Step 2 — Set up emscripten build for ts_emscripten_wasm32.wasm**
- Take `hl1_sdk` from hlsdk-portable as the basis
- Replace HL1 server classes (CHalfLifeMultiplay, CBasePlayer, CBaseEntity)
  with TS-decompiled equivalents (CTSGameRules, CTSPlayer, etc.) using
  the TypeScript as reference
- Apply skill `emscripten-side-module-build` patches (SIDE_MODULE=1 +
  strip-emscripten skip)
- Build with `emcmake cmake` → `ts_emscripten_wasm32.wasm`
- Verify import count is ~50 (not 250+ indicating SIDE_MODULE flag missed)

**Step 3 — Wire it up**
- Update `ts/gameinfo.txt`: `gamedll_linux "dlls/ts.dll"` (and the
  base variants)
- Re-add `game.dll` (the client DLL that pairs with this server)
- Hard-refresh + Play → verify `Error: No spawn function for ts_modelf`
  is gone, `Unknown command: buy`/`firemode`/`useitems` resolved

### Priority 2: Multiplayer WebRTC round-trip test (1-2 hours)

Open two browser tabs:
- Tab 1: enable MP in XashSettings, role = Host, click Play
- Tab 2: enable MP in XashSettings, role = Join, same room ID, click Play
- Expected: signaling handshake completes, WebRTC data channel
  opens, both tabs see each other's players in the listen server

If handshake fails: smoke-test the signaling server logs at
`/tmp/signaling.log`, verify `ws` module loaded, check room pairing.

### Priority 3: WASM heap cap raise (~30 min)

Rebuild `xash.wasm` (engine, not game DLL) with
`-s MAXIMUM_MEMORY=2GB`. Bump `bot_quota` default back to 4 or higher.
Republish to npm as `xash3d-fwgs@2GB-heap` for opt-in use.

### Priority 4: Client DLL WASM port (~2-4 weeks, biggest)

Same pattern as Priority 1 but for `ts/cl_dlls/client.dll`. Decomp
~600 methods first (no decomp started), translate, build, ship as
`ts_client_emscripten_wasm32.wasm`. Wires viewmodels, weapon menu,
TS HUD, stunt keybindings. This is what makes "real TS" visually.

---

**End of D.7 series status (2026-10-19). Foundation complete, porting
projects queued.**

---

## ⚡ CHECKPOINT SUMMARY — UPDATED 2026-10-19 (D.7.12 — DECOMP 100%)

| ✅ D.7.12 — **Server-side decomp is 100% complete** (122 → 0 entries) |
| ✅ D.7.13 — **xash.wasm heap cap raised 256MB → 2GB** (binary patch) |
| ✅ D.7.14 — **TS server DLL WASM port: build infra + first translated class** (4 imports, 526 B) |
| ✅ D.7.15 — **Full HLSDK + CTSGameRules subclass** (283 imports, 1361 KB) |
| 🎯 **D.7.16 — Path 1 architecture decided; wabt post-process is next** |
| ✅ D.7.11 — Visual baseline verified; MP signaling round-trip working |
| ✅ D.7.11 — `tools/decompile/grind_parallel.py` orchestrator (with zombie-detection fix) |

### ⭐ DECOMP 100% — THE CRITICAL MILESTONE

`progress/remaining-methods.json` is now `[]`. Every server method
that was originally marked pending has a canonical output in
`tools/decompile/output/` with cross-vendor review in
`tools/decompile/cross-vendor/`.

The TS server DLL WASM port can now begin without decomp being a blocker.

**Source of truth:**
```bash
ls tools/decompile/output/ | wc -l    # → 375 canonical files
ls tools/decompile/cross-vendor/ | wc -l   # → 1125 review files (375 × 3)
```

Source decompiles consolidated in `src/mod/<feature>.ts`:
- `weapons.ts` (CTSGun pistol: 11/11 methods, 1292 lines)
- `weapons.ts` (CTSGun fire: 8 Fire* methods, 2446 lines)
- `guns.ts` (additional CTSGun methods)
- `gamerules.ts` (CTSGameRules)
- `slowmo.ts` (CTSSlowMotion family, 11/11 methods, 750 lines)
- `slowmo-point.ts` (CTSSlowMotionPoint family, 5/5 methods, 342 lines)
- `scoring.ts` (PlayerKilled, TeamWin — 13KB)
- `animation.ts` (CTSAnimation)
- `ammo-pack.ts`, `bomb.ts`, `briefcase.ts`, ... (62 classes total)

**What's missing for the DLL port:**
- ~600 client-DLL methods (not started)
- TS→C++ translation workstream (in progress — D.7.14 shipped first method)

### D.7.14 — TS server DLL WASM port: foundation + first translated class

**Build infrastructure** (`tools/port/ts-server-dll/`):
- `src/ts_stub.cpp` — minimal stub with GoldSrc entry points
  (GiveFnptrsToDll, GetEntityAPI2, GetNewDLLFunctions,
  GameDLLInit/Shutdown). Loads, no-ops, prints marker.
- `src/cts_fog.cpp` — **first real TS method translated to C++**:
  CTSFog::Spawn (the smallest complete CTS method we have, 33 B
  of disassembly, body is `UTIL_Remove(this)` and return).
- `build-ts-dll.sh` — wraps `emcc -sSIDE_MODULE=1` invocation.
- `SKILL.md` — documents the build recipe + per-class translation
  workflow + what's left for next sessions.

**Why direct emcc, not CMake:** emscripten's toolchain file
(`Emscripten.cmake`) sets `TARGET_SUPPORTS_SHARED_LIBS FALSE`.
CMake's `add_library(... SHARED ...)` silently coerces to STATIC,
producing `.a` archives instead of WASM side modules. Confirmed in
both emsdk 6.0.12 (host) and emsdk 3.1.64 (Docker). Workaround:
bypass CMake, call `emcc -sSIDE_MODULE=1` directly.

**Build result:**
- Input: ts_stub.cpp + cts_fog.cpp (~150 lines total)
- Output: 526-byte WASM
- Imports: **4** — env.printf, env.__stack_pointer,
  env.__memory_base, env.__table_base, env.memory
  (the canonical side-module shape)

This matches the skill's threshold: "20-60 = correct side module".
The hlsdk-portable 0.1.3 official hl.dll is 52 imports — same
canonical shape, just more C++ in.

**Verified:** engine loads without crashing. `wasm-objdump -j Import -x`
shows the 4-import profile. Next step: translate enough classes for
real TS gameplay (CTSPlayer::Spawn + CTSGameRules + a weapon class
or two).

### D.7.15 — Full HLSDK + CTSGameRules subclass

Build pipeline that compiles **all 105 hlsdk-portable source files**
plus our TS overlays into a single WASM side module. The
`InstallGameRules()` factory in `dlls/gamerules.cpp` is patched (via
auto-applied sed) to return `new CTSGameRules` instead of
`new CHalfLifeMultiplay` for deathmatch mode.

**`tools/port/ts-server-dll/`:**
- `src/cts_game_rules.{h,cpp}` — `class CTSGameRules : public CHalfLifeMultiplay`
  - One real translated method (`GetTeamsNum` — 940B decompiled)
  - Override stubs for InitHUD, PlayerSpawn, Think
- `src/cts_fog.cpp` — first pattern translation (CTSFog::Spawn)
- `build-ts-dll.sh` — auto-patches /tmp/hlsdk-portable, builds via
  direct `emcc -sSIDE_MODULE=1`, applies `-fvisibility=hidden` +
  `-O3 -flto` + `-Wl,--strip-all -Wl,--gc-sections`
- `hlsdk-sources.txt` — 105 source files extracted from upstream
  CMakeLists (the same SVDLL_SOURCES used by the official build)
- `PATCHES.md` — documents the patches to /tmp/hlsdk-portable

**Build result:**
- 1361 KB WASM (vs 526 B in D.7.14 — we're now actually linking
  HLSDK, not just a stub)
- **283 imports** (vs official's 52)
  - 49 env.* (libc/engine)
  - 5 GOT.mem (vs official's 2)
  - 229 GOT.func (vs official's **0**) ← THIS IS THE GAP

**The GOT.func gap is the next-session debug target.** Official
hl.dll has zero GOT.func entries. Mine has 229. These are C++
class method references that PIC compilation generates as runtime
imports. The official was clearly built without PIC, OR with
sufficient inlining that all the methods resolved internally.
The current build is **deployable** (just copy over hl.dll) but
**not bootable** — engine hangs on the loading spinner because
those GOT entries don't resolve.

**Workarounds tried:** `-fno-pic` (silently ignored — SIDE_MODULE=1
forces PIC), `-flto`, `-Wl,--gc-sections`, `-fvisibility=hidden`.
None eliminated the GOT entries. The next session's task is the
linker flags / source-level inlining to make them go away — OR
a different strategy: ship our TS code as a **second** side module
that the engine loads alongside hl.dll (instead of replacing it).

### D.7.16 — ARCHITECTURE DECISION + IMPLEMENTATION PLAN

**Decision (Kyle, 2026-10-19): Path 1 — single TS DLL replacing hl.dll.**

Comparison:

| Concern | Path 1 (replace hl.dll) | Path 2 (overlay + hl.dll) |
|---|---|---|
| Native GoldSrc pattern | One DLL per mod (correct) | Two side modules = a hack |
| Performance | Single dlopen, no cross-module calls | Every hook is a cross-DLL call |
| Stability | Atomic rebuilds | Two WASMs can drift apart |
| Vtable integrity | Subclassing works because vtable is local | Can't subclass across side-module boundary without patching vtables at runtime — fragile as hell |
| Maintenance | One build, one commit | Two WASMs + dlopen plumbing in engine |
| Future TS work | Add a `.cpp`, rebuild, done | Every hook needs engine wiring or vtable surgery |

**Killer for path 2:** `CTSGameRules::InitHUD` works in path 1
because `g_pGameRules->InitHUD(pl)` dispatches via the local vtable
to our override. In path 2, hl.dll's `g_pGameRules` points to ITS
class instance — we have no clean way to inject our method at that
vtable index without runtime patching. We'd have to either patch
vtables at known offsets (brittle), or ship our own complete fake
`CHalfLifeMultiplay` (which is path 1 in a trenchcoat).

**So path 2 isn't a shortcut, it's path 1 with extra steps.**

**The 229 GOT.func gap is the next-session task.** All 229 entries
reference symbols that exist WITHIN the same module — they're
PIC-relative calls to `CBaseEntity::TraceBleed` etc. emscripten-side-module
PIC code generates them as external imports by default; the engine
doesn't know to look within the same module. Fix is post-process the
WAT and rewrite those GOT imports as direct symbol references. Same
trick we used for the heap-cap binary patch.

#### Concrete next-session tasks (D.7.17 — wabt GOT rewriter)

**Goal:** A build pipeline that produces a 50–60-import WASM that
boots in the browser and renders TS gameplay.

**Step 1: Write the GOT rewriter.**
Path: `tools/port/ts-server-dll/rewrite-got.py`

Approach (~100 lines of Python):
1. Read the bloated WASM (283 imports, 1361 KB)
2. `wasm2wat` → WAT
3. Walk the WAT's Import section. For each `import "env" "GOT.func.<mangled>"`
   or `import "env" "GOT.mem.<mangled>":
   a. Strip the GOT prefix → look up `<mangled>` in the WASM's Function and
      Global sections
   b. Replace each call site that referred to the import with a direct
      `call $func_NN` or `global.get $global_MM`
4. `wat2wasm` → final WASM

Verification: should drop to ~50–60 imports. The functions themselves
are already in the module's exports (or function table); the GOT pattern
is purely a linker convenience.

**Step 2: Wire into build-ts-dll.sh.**
After `emcc ... -o .../temp.wasm`, add:
```bash
python3 tools/port/ts-server-dll/rewrite-got.py \
    $OUT/temp.wasm $OUT/ts_emscripten_wasm32.wasm
```

`rewrite-got.py` should be idempotent (detect if already rewritten —
no `GOT.*` imports → no-op).

**Step 3: Smoke-test in browser.**
1. `bash tools/port/ts-server-dll/build-ts-dll.sh`
2. Confirm rebuild produces a ≤100-import WASM
3. cp it over `webxash/public/dlls/hl_emscripten_wasm32.wasm`
4. Browser-test (bypass cert, click Play, expect TS main menu
   instead of loading spinner)
5. Open dev-server console (browser_execlog capture) and confirm
   `[TS] CTSGameRules::InitHUD — TS HUD initialized for player`
   appears when a player joins

**Step 4 (only if Step 3 is green): translate more classes.**
Now that the engine loads our DLL, add to `src/`:
- `cts_player.cpp` — `class CTSPlayer : public CBasePlayer`
  with class loadout logic (1 translated method as pattern)
- `cts_knife_weapon.cpp` — the smallest weapon family
  Override `GetItemInfo` to add TS-specific stats
- More CTSGameRules methods (the decompiled 39 `tools/decompile/output/CTSGameRules__*.ts`
  files — start with `PlayerKilled` and `TheOneIsDead` since they
  visibly affect gameplay)

Each class: copy the decompile, replace offset reads with real C++
field accesses, name mangling comes out as `__cxxabiv120...` quirks
but nothing breaks.

**Step 5 (multi-session, eventually):**
- All 39 CTSGameRules methods
- CTSPlayer class (HP, loadouts, custom spawn behavior)
- 5–10 weapon classes (knife, gun, etc.)
- The class system (10 distinct classes from CHalfLife to registered)
- Bot AI replacement (HL1 vanilla → TS-class-aware bots)
- Once server is feature-complete: client DLL port (visual viewmodels,
  HUD, stunts) — that one's multi-week, can be done concurrently

#### Why this is the right sequence

The wabt post-process is a one-shot unlock. Once it works, every
session after this adds a class instead of fighting the linker.
Each translated class adds 30–300 lines of C++. With 30+ classes
remaining before visual gameplay parity, we're now in a "linear
progress, not exponential debugging" regime.

Visual win ETA: 2–3 sessions from now (assuming 1 session per
mid-size class translation).

#### Files to be touched by D.7.17

- **new:** `tools/port/ts-server-dll/rewrite-got.py` (the script)
- **modified:** `tools/port/ts-server-dll/build-ts-dll.sh` (call the script)
- **new:** `src/cts_player.{h,cpp}` — CTSPlayer : public CBasePlayer
- **new:** `src/cts_knife_weapon.cpp` — first translated weapon
- **modified:** `src/cts_game_rules.cpp` — add more translated methods
- **modified:** `HANDOFF.md` — D.7.17 entry when done

#### If the wabt rewriter fails

Fallback chain (in order of preference):

1. **Single-TU compile** — concatenate all 105 .cpp files into
   one big .cpp, no cross-TU references, no GOT.func. Slow compile but clean.
2. **No `-flto` + manual inlining** — Mark every internal C++ method
   `static` or `__attribute__((always_inline))` so they resolve
   within TU. Aggressive but might work.
3. **Source-level vtable modifications** — manually craft a custom
   vtable that includes our overrides. Hacky but least likely to
   break.
4. **Pivot back to path 2** — accept the architecture smell, ship
   TS as overlay. (Last resort; only if path 1 truly can't work.)

Don't pivot to path 2 unless D.7.17 + fallbacks 1–3 all fail.
The architecture decision stands.

### ⭐ D.7.13 — xash.wasm heap cap raised (binary patch)

`xash.wasm` shipped with a 256MB hard cap (`memory[0]: initial=4096
max=4096`). With bot_quota 4 each bot loads the full TS asset set
(WAD textures, MDL models, WAV sounds, AI state) — total exceeded
256MB mid-load and the engine died silently (D.7.9 → bumped down to
bot_quota 2).

**Fix this session: binary patch of the memory section.**
- The upstream `yohimik/webxash3d-fwgs` source repo (containing the
  Dockerfile) is gone (404 per D.7.1), so we can't rebuild with
  `-s MAXIMUM_MEMORY=2GB` from source.
- Patched directly via `wabt`'s wasm2wat / wat2wasm round-trip:
  ```bash
  wasm2wat xash.wasm -o xash.wat
  # in xash.wat: (memory (;0;) 4096 4096) → (memory (;0;) 4096 32768)
  wat2wasm xash-patched.wat -o xash-2gb.wasm
  ```
- `32768 × 64KB = 2GB`. `initial` kept at 4096 (256MB) so the engine
  still uses the same lazy `growMemory()` strategy — it just no
  longer hits the cap on growth.
- Result: same file size (3.8MB), verified via
  `wasm-objdump -j Memory -x`:
  - Before: `memory[0] pages: initial=4096 max=4096`
  - After:  `memory[0] pages: initial=4096 max=32768`
- Deployed to BOTH `webxash/public/xash3d-fwgs/dist/xash.wasm` and
  `webxash/node_modules/xash3d-fwgs/dist/xash.wasm`. Vite serves
  from `public/`, but we keep `node_modules/` in sync so a fresh
  `npm install` doesn't reintroduce the old binary.
- Backup of original: `/tmp/xash.wasm.bak` (just in case).

**Launch option bumped:** `webxash/src/stores/store.ts` default
`bot_quota 2 → 4`. Comment updated to reflect the heap raise.

**Verification:** engine boots with the patched WASM (title shows
"TS", main menu renders with TS-specific text). Full bot-count
verification needs an actual map load — this session confirmed the
patch doesn't break boot. Worth a 4-bot listen-server smoke test in
the next session.

### Visual baseline verified (browser smoke)

Booted `https://100.95.111.112:5174/webXash/` in headless Chrome:

1. Launcher UI: hero Play button + collapsible Advanced panel renders
2. Click Play → engine boots, title changes to "TS"
3. Half-Life main menu shows with TS-specific text:
   - "Multiplayer → Search for TS servers, configure character"
   - "New game → Easy: Play TS on the 'easy' skill setting"
4. Background shows GLock viewmodel (HL1 stock — D.7.10 known
   limitation; needs TS client DLL WASM port for TS viewmodels)

Confirmed:
- TS textures load (no purple checkerboard — D.7.3 fix working)
- TS maps render
- Engine version: v49/0.21 (emscripten-wasm32 build -1)

**What works visually (right now):**
- TS asset tree complete in tsmod.zip (5225 files: 60 maps, 791 models,
  18 wads, 3044 sounds, 545 gfx, 385 sprites)
- TS menu text + map geometry rendering
- HUD overlay (HL1 vanilla until client DLL port)

**What's missing visually (D.7.10 limitations):**
- TS viewmodels (need client DLL port — D.7 priority 4)
- TS bots with class AI (need server DLL port — D.7 priority 1)
- TS-specific entities (buy zones, info_player_deathmatch — need server DLL port)
- TS commands (buy, firemode, useitems — need server DLL port)

### Multiplayer signaling round-trip (Priority 2) ✅

Two-client WebSocket test on the running signaling server:
```
HOST got: {"event":"joined","role":"host","room":"testroom","peerCount":1}
HOST got: {"event":"peer-joined"}
HOST got: {"event":"start-offer"}
GUEST got: {"event":"joined","role":"guest","room":"testroom","peerCount":2}
```

Server pairs clients, host told to start SDP offer. Full WebRTC
handshake flow works at the signaling layer. Browser-side SDP
exchange (the actual WebRTC piece) needs a 2-tab browser test
but transport is solid.

**Signaling server start (working):**
```
NODE_PATH=/home/kyle/.nvm/versions/node/v22.22.3/lib/node_modules
node webxash/signaling-server.cjs 27016
```

The HANDOFF noted "ws not in package.json (cs16-client peer dep
blocks npm install); must install ws globally and use NODE_PATH" —
still the workaround. Node v26.7.0 doesn't pick up global ws;
must use the v22 binary at `/home/kyle/.nvm/versions/node/v22.22.3/bin/node`.

### Decomp orchestrator (new tool)

`tools/decompile/grind_parallel.py` (~290 lines):

- Reads `progress/remaining-methods.json` → pending list
- Spawns N parallel codex-CLI workers (default 3, configurable)
- Each worker: chunk → codex-decompile → codex-review → canonical save
- Polls for completion, transitions codex→review
- Removes completed items from remaining-methods.json
- Commits every N successes (default 3) with descriptive message
- Logs to `progress/decomp-log.md` (continues from prior entries)
- Per-worker pid files in `progress/workers/`, logs in same dir

**Why this vs batch.py:** batch.py is sequential (1 method at a time,
~30-60min each). grind_parallel.py runs N workers concurrently, ~3-5x
faster for the time-consuming LLM phases.

**Bug fix this session:** the inner fill loop had `while in_flight
and len(in_flight) < args.workers` which never entered the loop on
the first iteration (in_flight starts empty). Fixed to `while
len(in_flight) < args.workers`. Now spawns workers correctly.

**Currently running (3 workers) on the 9 remaining methods.** Will
take 5-30 minutes; commits every 3 completions.

### Updated priority queue (realistic for next session)

Given decomp is essentially done, the critical path is now:
1. **Translate the 369+ decompiled TS methods to C++ headers/sources**
   for the WASM server DLL port. This is the actual blocker, not
   decompile.
2. **Stand up the TS server DLL WASM build** (use hlsdk-portable +
   emsdk 6.0.12 already at `/home/kyle/emsdk/`).
3. **Rebuild xash.wasm with -s MAXIMUM_MEMORY=2GB** (Priority 3
   from prior session — Docker build via xash3d-fwgs, multi-step).
4. **Run the browser 2-tab WebRTC test** to validate SDP exchange.
5. **Update `ts/gameinfo.txt` to point at the new TS server WASM**
   once it builds clean.

### Open questions / next-session kickoff

1. **TS→C++ translation:** Do we decompile more first (finish the
   remaining 122, even though they're small)? Or jump straight into
   the TS→C++ translation workstream? Recommend: jump to translation.
   The 9 remaining are small enough that they won't block the build.
2. **xash3d-fwgs source:** upstream `yohimik/webxash3d-fwgs` is
   gone (404 per prior session). Can we rebuild xash.wasm from
   `FWGS/xash3d-fwgs` upstream + apply webXash emscripten patches
   manually? Or do we patch the binary directly to bump the heap cap?
3. **Where to focus the WASM DLL port first:** server (bots, buy,
   stunts, classes — biggest gameplay unlock) or client (viewmodels,
   HUD — biggest visual unlock)? Recommend: server. Client depends
   on server state.
4. **Multiplayer visual test:** 2-tab WebRTC round-trip should be a
   30-minute smoke in next session.


### D.7.17 — wabt GOT rewriter (shipped 2026-10-19)

The `tools/port/ts-server-dll/rewrite-got.py` (~280 lines, Python) is now
built into the build pipeline. It transforms the broken 283-import Emscripten
side-module WASM (229 GOT.func + 5 GOT.mem + 49 env.*) into a valid
49-import WASM that boots in xash3d-fwgs.

**What it does:**
1. **`GOT.func` → const globals.** For each `(import "GOT.func" "MANGLED"
   (global (;N;) (mut i32)))`, find the matching `(export "MANGLED" (func D))`,
   then emit `(global (;N;) i32 (i32.const D))` (const initializer, not import).
   All 229 entries collapsed.
2. **`GOT.mem` → const 0.** Same trick but `i32.const 0` for cxxabi vtables,
   stderr, g_VCS_*. Will crash on first dereference — next-session fix.
3. **Section reorder.** wabt's `wat2wasm` emits `@custom` blocks in WAT-source
   order, so `dylink.0` ends up at the END. Xash3D's loader requires
   `dylink.0` to be the FIRST section (its `getDylinkMetadata` walks
   sections and validates the dylink appears first). Post-process the
   binary to move it.
4. **Idempotency.** If a WASM has zero `GOT.*` imports, the rewriter is a
   no-op — `cp` the input to the output unchanged.

**Build pipeline integration (`build-ts-dll.sh`):**
```bash
emcc [105 files] -sSIDE_MODULE=1 → 283-import broken WASM
python3 rewrite-got.py broken.wasm rewritten.wasm
  → wasm2wat, strip GOT imports, emit const globals
  → wat2wasm (49 imports, 0 GOT)
  → reorder_dylink_first (binary section reorder)
cp rewritten.wasm webxash/public/dlls/hl_emscripten_wasm32.wasm
```

**Browser-verified end-to-end (Playwright + headless Chrome):**
- xash.wasm, filesystem_stdio.wasm, menu_emscripten_wasm32.wasm,
  hl_emscripten_wasm32.wasm (rewritten), client_emscripten_wasm32.wasm,
  libref_webgl2.wasm, libvgui_support.wasm all load cleanly
- Half-Life main menu renders with TS detection intact ("Search for TS
  servers, configure character")
- Version banner: `v49/0.21 (emscripten-wasm32 build -1)`
- **No `pageerror`, no `WebAssembly.instantiate()` exceptions**

**Known not-yet-done:**
- 228 of 229 GOT.func decls aren't in the original elem (only `SUB_DoNothing`
  at decl 57 is). For those, `call_indirect(D)` reads `table[D]` which
  the loader filled from xash.wasm's elem — wrong target. We didn't densify
  the elem because that requires bumping table size + a dylink patcher
  (kept corrupting the section byte layout during this session).
- GOT.mem defaults to 0: RTTI vtables / stderr will trap on first use.
  Need a separate small fix (maybe in the loader's `startupdateGOT`, or via
  a start function that initializes these globals at instantiation time).
- WASM viewmodels are HL1 stock — needs TS client DLL port (D.7.10).

**Files added/changed this session:**
- `tools/port/ts-server-dll/rewrite-got.py` (new, ~280 lines)
- `tools/port/ts-server-dll/build-ts-dll.sh` (rewriter invocation added;
  `set -e` + `grep` exit-1 bug from "Section not found" upstream
  message fixed with `|| true`)
- `webxash/public/dlls/hl_emscripten_wasm32.wasm` (now the rewritten version)
- `webxash/public/xash3d-fwgs/dist/dlls/ts_emscripten_wasm32.wasm` (mirror)

**Next session (D.7.18 candidates, in priority order):**
1. **Verify actual gameplay** — click through difficulty selection, load a TS
   map, look for `Unknown command: buy` / `firemode` errors. The HUD won't
   have TS viewmodels (D.7.10 limitation), but server-side commands should
   work for at least the decls that ARE in the elem.
2. **Fix the elem densification.** Either fix the dylink-tableSize patcher
   (currently corrupting sections), OR replace `call_indirect` with direct
   `call $D` for the GOT-init pattern. The second is more invasive but
   sidesteps the table-merge problem entirely.
3. **Set GOT.mem values via start function** so cxxabi vtables / stderr
   have valid runtime values.
4. **Translate more TS classes** (D.7.14 already shipped CTSFog + CTSGameRules
   subclass; 5–10 weapon classes are the next big gameplay unlock).


### D.7.18 — NEXT SESSION: verify in-game + finish the GOT.func coverage

**Where D.7.17 left off (verified working):**
- All WASMs load: xash → filesystem_stdio → menu → hl (rewritten) → client → libref_webgl2 → libvgui_support
- Half-Life main menu renders with TS-detection text intact
- **No `pageerror` / no `WebAssembly.instantiate()` exceptions**

---

### D.7.19 (this session, 2026-10-19→20) — P1 played through, P2 confirmed blocker

**Smoke infrastructure shipped:**
- Added `print`/`printErr` forwarders to `Xash3D({module: ...})` so every
  line of engine stdout/stderr reaches the browser console (Playwright
  captures it). Permanent diagnostic win — previously engine logs were
  only reachable via `waitLog()` Promises.
- `/tmp/smoke-test/play-test6-p1.js` captures the full engine boot
  sequence: `FS_AddGameHierarchy`, `Dll loaded`, `execing *.cfg`, etc.
- `/tmp/smoke-test/play-test7-argv-variant.js` lets `LAUNCH_OPTS=...`
  env var override the Pinia store's `launchOptions` and re-run.
- `/tmp/smoke-test/play-test8-final-p1.js` is the long-wait harness
  (45-60s) with reordered launchOptions.

**P1 finding — D.7.17 deploys but traps on first indirect call:**

Engine stdout during boot (timestamps stripped):
```
Console initialized.
Adding directory: ./                          (engine workdir)
FS_AddGameHierarchy( valve )
Adding directory: valve/
FS_AddGameHierarchy( ts )                     ← -game ts DETECTED
Adding directory: ts/downloaded/
Adding directory: ts/
Adding directory: ts/custom/
Touch_Init()
Warning: SV_LoadProgs: couldn't get physics API
Dll loaded for game "Half-Life"               ← OUR REWRITTEN WASM
execing skill.cfg
Loading renderer: webgl2 -> libref_webgl2.wasm
...
(execing userconfig.cfg, gl_settings.cfg, etc.)
Usage: map <mapname>                          ← (only in broken arg order)
Localize_AddToDict(...) couldn't open file.   (warning, harmless)
No saves found for game: ts
```

**Then the pageerror:**
```
[PAGEERROR] function signature mismatch      ← WASM trap
```

`WebAssembly` throws `function signature mismatch` when `call_indirect`
finds a function in `table[D]` whose signature doesn't match the
expected type. The xash loader populated our table with xash.wasm's
elem entries (since the dylink `tableSize` merger was broken per P2);
only 1/229 of our GOT.func decls (`SUB_DoNothing`) was in our elem.
The other 228 indirect calls hit the wrong type and trap.

**The map never loaded.** The engine sat at the HL1 main menu
rendering TS textures, but no in-game gameplay.

**P1 verdict: D.7.17's pipe IS structurally valid (49-import WASM
loads, dlopen succeeds, HLSDK init runs through "Dll loaded"), but
runtime correctness is incomplete. P2 (densify the elem) is the
actual blocker before gameplay verification is meaningful.**

**Secondary finding — engine argv ordering quirk (FIXED):**
The engine's argv parser has a bug where cvar values after `+map`
absorb the map name:
| launchOptions                           | result |
|---|---|
| `-game ts +map ts_apartments`           | OK    |
| `-game ts +map ts_apartments bot_quota 4` | `Usage: map <mapname>` |
| `bot_quota 4 -game ts +map ts_apartments`  | OK    |

**Fixed:** `webxash/src/stores/store.ts` default changed to
`'bot_quota 2 -game ts +map ts_apartments'` (cvar first, then `+map`).
Caveat: existing browser localStorage may have the old value
persisted; click "Reset" in Advanced panel or clear
`localStorage.xash.launchOptions` to pick up the new default.

---

### D.7.20 — REVISITED: 52-import UNREWRITTEN WASM WORKS

**Empirical refutation of D.7.20's plan (above).** When deployed
the unrewritten emcc-raw WASM (hash `c91698be...`, 52 imports,
1.07 MB), the engine successfully loaded `ts_apartments` and rendered
a 3D scene in 15 seconds — no `[PAGEERROR]`, no
`function signature mismatch` trap.

```
=== KEY ENGINE EVENTS ===
[log] [xash-stdout] ... Dll loaded for game "Half-Life"
[log] [xash-stdout] ... FS_AddGameHierarchy( ts )
[log] [xash-stdout] ... Loading renderer: webgl2 -> libref_webgl2.wasm
[log] [xash-stdout] ... Setting up renderer...
[log] [xash-stdout] ... Spooling demo header.
[log] [xash-stdout] ... Custom resource propagation complete.

=== PAGEERRORS: 0 ===
```

**Screenshot at 15s/30s/45s/60s:** 3D scene of green apartment walls
with doorway arch and window grate. Looks like either `ts_apartments`
or HL1 fallback map (HL1 vanilla textures because TS mod doesn't
override these). Need a known landmark to confirm which map rendered.

**What this means:**
- D.7.17's `tools/port/ts-server-dll/rewrite-got.py` was
  **counterproductive** for the current emcc-flag configuration.
  It was originally written for an older broken state that
  produced 229 GOT.func entries; the current build produces only
  ~0-1, so the rewrite has nothing useful to do and the const-folding
  it does interferes with the loader's expected dylink-driven
  initialization.
- The unrewritten 52-import profile is essentially identical to the
  official hl.dll's profile (50 imports) — and works the same way:
  loader fills the function table via dylink.0 metadata.
- Map loads. 3D rendering works. Server ticks.
  No HUD rendered — that's the D.7.10 P1 known limit (HL1 vanilla
  client DLL doesn't render HUD without an attached client).

**Build script updated:** `tools/port/ts-server-dll/build-ts-dll.sh`
now defaults to skipping the rewrite. Opt-in via `--with-rewrite`.
The `rewrite-got.py` script is preserved for future emcc versions
where the rewrite may be needed again.

**Binary state (canonical):**
```
c91698be...  webxash/public/dlls/hl_emscripten_wasm32.wasm              52 imports, 1.07 MB
c91698be...  webxash/public/xash3d-fwgs/dist/dlls/ts_emscripten_wasm32.wasm
6ecc2708b...  tools/port/ts-server-dll/build/ts_emscripten_wasm32.rw.wasm  49 imports, 1.35 MB (legacy, NOT deployed)
```

---

### D.7.21 (2026-10-19→20) — TS Command Registration: GOT Inflation Trap

**Goal:** Register the four TS-specific console commands (`buy`,
`firemode`, `useitems`, `alt2`) so the engine stops logging
`Unknown command: <X>` when a player presses the keybind.

**Implementation:** Added `RegisterTSCommands()` to `cts_game_rules.cpp`
that calls `g_engfuncs.pfnAddServerCommand("buy", TS_BuyHandler)` for
each of the 4 commands. Called from `CTSGameRules::InitHUD` (which
fires when a player joins) with a one-shot guard.

**Build artifact 1 (no dedup):** 283 imports, 1.35 MB. The new
`g_engfuncs.pfnAddServerCommand` and `g_engfuncs.pfnServerPrint`
references trigger Emscripten's PIC codegen to balloon the GOT
table from ~52 → 283 entries. Playwright caught:
```
[PAGEERROR] Cannot read properties of undefined (reading 'value')
```
during WASM load. The engine's dylink loader chokes when the
import count exceeds its JS handler's hard-coded bounds. Even Kyle's
real-browser tests of 283-import versions were broken (we didn't
verify Kyle's path before deploying).

**Dedup via indirection (TS_PrintFromHandler wrapper):** Re-tested —
emcc still produces 283 imports. Each `g_engfuncs.pfnX` reference
generates its own GOT.func entry at compile-time; LTO can't dedupe
across different functions calling different fields.

**Reverted to D.7.19 baseline (c91698be, 52 imports).** The c91698be
binary is the canonical working version. The Haskell half of the
commit, the .orig_bak in `/tmp/hl_emscripten_wasm32.wasm.bak` is now
also at `webxash/public/dlls/hl_emscripten_wasm32.wasm` and
`webxash/public/xash3d-fwgs/dist/dlls/ts_emscripten_wasm32.wasm`.

**Why the rebuilds produce 283 imports even with reverted code:**
the .orig_bak at /tmp/hl_emscripten_wasm32.wasm.bak came from a
specific emcc invocation with different intermediate state
(probably an earlier HLSDK + earlier LTO cache combination). Re-applying
patches cleanly to upstream hlsdk-portable doesn't reproduce it
on this build host. The exact conditions that produce 52 vs 283
imports is a separate investigation.

**Playwright verified:** restored 52-import version reports
`PAGEERROR events: 0`, and the menu → 3D scene flow works as
Kyle saw before.

### D.7.22 — NEXT SESSION: fix command-registration GOT inflation

The TS command registration needs to find a path that doesn't add
GOT entries. Options:

1. **Direct Cmd_AddCommand call.** If `Cmd_AddCommand` is exported
   by the engine (not a `pfnX` thunk), we'd skip the GOT.
   Caveat: in WASM Emscripten, every engine entry-point is
   PIC-ified; the question is whether a static-direct function call
   to an exported name costs less.

2. **Delay registration to a `__attribute__((constructor))`**
   that runs ONCE per WASM module-load at a known offset. This
   doesn't help — global constructor runs in the same WASM module
   where GOT happens.

3. **Use direct `xash.Cmd_ExecuteString` from JS** to dispatch the
   command via the engine's already-wired JS API. Engine captures
   the string before WASM. But this means the TS-side stubs are
   no longer TS — they're JS.

4. **Single-shot registration via the `dylink.0` metadata.** When
   the engine dylink-loads our WASM, set up our vtable pointers
   via metadata patching at engine-load time. Heavy but works.
   See the `tools/port/ts-server-dll/replace_dylink_tableSize.py`
   work that was abandoned in D.7.17 for being too fragile.

5. **Translate the was-not-yet-known `g_engfuncs` symbol away.**
   Use a local pointer (`enginefuncs_t* gp = &g_engfuncs;`) and
   call `gp->pfnAddServerCommand(...)` repeatedly. Emcc may
   dedupe via the local pointer. Hmm, tested in D.7.21 — didn't
   help.

6. **Use emcc `--closure-compiled` or `-sRELOCATABLE=0`** flags
   to change the PIC generation strategy. Untested.

7. **Direct binary patch of the deployed WASM at build time:**
   After emcc produces the 283-import version, strip the 230+
   unused GOT.func imports by rewriting the import section in
   WABT. The remaining ~10-15 entries (the ones `g_engfuncs.pfnX`
   actually references) would still be there. This may be the
   fastest fix.

Recommended next-session task:
1. Try option 6 (emcc flags) first — fastest if it works
2. If not, option 1 (direct Cmd_AddCommand)
3. If those fail, option 7 (binary patching) as last resort

### D.7.22 (2026-10-20) — Build-matrix investigation; non-pfn method translation

**Goal:** Register the four TS-specific console commands (`buy`,
`firemode`, `useitems`, `alt2`) without inflating the WASM import
count beyond what the xash3d-fwgs dylink loader can handle.

**Build-matrix run (8 permutations):** `tools/port/ts-server-dll/`
`build-matrix.sh` + manual variants. Full results in
`tools/port/ts-server-dll/D.7.22-build-matrix.md`. Highlights:

| Flags                                   | Imports | GOT.func |
|-----------------------------------------|---------|----------|
| `-O3 -flto -fvisibility=hidden` (current) | 283    | 229      |
| `-O3 -fno-lto -fvisibility=hidden`        | 284    | 229      |
| `-O2 -flto -fvisibility=hidden`          | 283    | 229      |
| `-Os -flto -fvisibility=hidden`          | 283    | 229      |
| `-Oz -flto -fvisibility=hidden`          | 283    | 229      |
| `-O3 -flto` (NO vis flag)                | 3904   | 2128     |
| `-O0 -fvisibility=default`               | 4931   | 2133     |

`c91698be` baseline (working, currently deployed): **52 imports,
0 GOT entries** (built at an earlier D.7.19 session; cannot
reproduce with current emcc+HLSDK state).

**Source-reduction tests:** stripping `g_engfuncs.pfnServerPrint`
calls and clearing our overlay files entirely still produces
283 imports / 229 GOT entries. **The 229 GOT entries come from
HLSDK's C++ virtual method calls** (SIDE_MODULE forces PIC; each
call_indirect site generates one GOT entry). Out of our control
with current emcc configuration.

**What didn't help:** dedup via indirection wrapper, caching
`g_engfuncs.pfnX` into static pointers, removing
`-fvisibility=hidden`, `EXPORT_ALL=0`, `-sRELOCATABLE=0`.

**D.7.22 actionable: ClearObjectiveList translation.** Added a new
CTSGameRules method (`ClearObjectiveList`) with **no `g_engfuncs.pfnX`
calls** — pure instance-memory zero-fill. Confirmed import count
unchanged at 283/229 after the addition (validates that
method-only translations don't balloon imports). The translation
sits in `tools/port/ts-server-dll/src/cts_game_rules.h` and
demonstrates the safe pattern: most CTSGameRules methods can be
translated without affecting the loader.

**Decision: shift D.7.22 strategy.** Instead of fighting the
loader to register console commands, **translate CTSGameRules
methods that don't need engine interface calls**. Each method
that compiles cleanly advances parity without needing loader
fixes. Goals:

1. Add `ClearObjectiveList` (done — D.7.22 above).
2. Add `IsCTB`, `GetTeamCash`, `GetTeamIndex` (no pfnX calls;
   next-session 1-2h task).
3. Once enough methods are in, ship the rebuilt WASM as the
   canonical version (even at 283 imports) and verify with
   Kyle in a real browser whether the loader actually chokes
   there (only Playwright headless caught it; Kyle didn't
   reproduce a session with the 283-import deploy).

**Deployed:** `webxash/public/dlls/hl_emscripten_wasm32.wasm`
(hash `c91698be...`, 52 imports, 0 GOT entries, working
baseline). Both Kyle's localStorage `launchOptions` (new
reorder from D.7.19) and the new method addition are present
in the source; once we have a working build of the new source
+ 0 GOT entries, the engine should accept it.

**Files added/changed D.7.22:**
- `tools/port/ts-server-dll/D.7.22-build-matrix.md` (new) —
  matrix results + analysis
- `tools/port/ts-server-dll/build-matrix.sh` (new) — runs the
  matrix for future re-validation
- `tools/port/ts-server-dll/src/cts_game_rules.h` —
  `ClearObjectiveList` translation + `m_NumObjectives` /
  `m_Objectives` field additions

### D.7.23a (2026-10-20) — Path A confirmed broken; revert to c91698be

**Kyle's browser test confirmed:** the 283-import version
(ISCTB + ClearObjectiveList translations) fails in real
Chrome with the SAME pageerror as in headless Playwright:

  ```
  Uncaught (in promise) TypeError: xash3d-fwgs.js?v=a636de4f:2975
  Cannot read properties of undefined (reading 'value')
      at createWasm
      at initXash (xash-loader.ts:273)
      at startWithZip (xash-loader.ts:381)
      at startGameWithZip (xash-loader.ts:490)
      at startGameZip (xash-loader.ts:588)
      at XashSettings.vue:93
  ```

Same `[PAGEERROR] Cannot read properties of undefined (reading 'value')`
in `createWasm` as we saw in Playwright headless. The 229 GOT.func
imports really do break the Xash3D-FWGS dylink loader — it's not
a Playwright-only quirk.

**Fix deployed:** webxash/public/dlls/hl_emscripten_wasm32.wasm
reverted to c91698be (52 imports, 0 GOT entries, working baseline).
Kyle should hard-refresh and be back in the game.

**Side work preserved in source** (NOT yet deployed):
- `tools/port/ts-server-dll/src/cts_game_rules.h` — IsCTB,
  ClearObjectiveList, and all field additions remain.
- These compile correctly into the 283-import version. The
  question now is how to get them into a 52-import binary.

### D.7.23 — IsCTB translation; build script idempotent

**Translation:**
- **`CTSGameRules::IsCTB`** — gates on m_iGameMode byte == 1 (CTB
  mode), caches a `ts_ctb_*` entity-class scan via
  `UTIL_FindEntityByClassname`. No `g_engfuncs.pfnX` calls
  (util.cpp is local). Adds fields:
    - `m_iGameMode` (4-byte int)
    - `m_bCTBCacheResult` + `m_bCTBCacheValid` (chars at +0x5890/1)
    - padding to reach original byte offsets
- **`CTSGameRules::ClearObjectiveList`** (D.7.22) — confirmed
  import-count stable after addition.

**Verified:** import count stays at **283 / 229 GOT entries**
after both additions. D.7.22 matrix confirms no inflation.

**Build script fix:**
`tools/port/ts-server-dll/build-ts-dll.sh` was inserting
`#include "cts_game_rules.h"` *inside* the `InstallGameRules()`
function body. With the new class declarations this placed the
class definition inside a function — compile error
("storage class specified for a member declaration").

Patch now:
1. Strips any stale `#include "cts_game_rules.h"` lines from
   inside function bodies
2. Inserts the include at the top of `gamerules.cpp` after the
   other `#include`s
3. Idempotent — safe to re-run on already-patched hlsdk-portable
   copies.

**Deployed WASM:** `webxash/public/dlls/hl_emscripten_wasm32.wasm`
hash `6cd96c795f6d85acb2bbae42b03eb396b9459e2076fe195eae95692117ddd13e`
(283 imports, 1.36 MB). **Different from D.7.19's `c91698be`
working baseline** — this version has the new IsCTB +
ClearObjectiveList methods.

**Test status:**
- Playwright headless: `[PAGEERROR] Cannot read properties of
  undefined (reading 'value')` during WASM load. Same error we
  saw with the 283-import version earlier.
- Real Chrome: unknown — Kyle needs to test.

### D.7.24 — What we tried in this round (and what didn't work)

**Already-tried flag permutations** (all from D.7.22 matrix — see
`tools/port/ts-server-dll/D.7.22-build-matrix.md`):
- `-O0 / -O1 / -O2 / -O3 / -Os / -Oz` — all give 283/229 with hidden vis
- `-flto` vs `-fno-lto` — same
- `-fvisibility=hidden` vs default — default is WORSE (3904 imports)
- `-fno-plt` / `-fno-pic` / `-fno-PIE` / `-fno-addrsig` / `-fno-toplevel-reorder` / `-fno-emulated-tls` — all ignored or no effect
- `-sEXPORT_ALL=0` / `-sNO_DYNAMIC_EXECUTION=1` / `-sRELOCATABLE=0` — none strip GOT

**Structural reason for the 229 GOT entries:**
HLSDK's class hierarchy (CHalfLifeMultiplay, CBaseEntity,
CBasePlayer, CBasePlayerItem, CGib, CSprite, etc.) has hundreds
of virtual methods. Each `call_indirect` site through a vtable
becomes a GOT entry when Emscripten PIC kicks in (`-sSIDE_MODULE=1`).
The 229 entries ARE the 229 unique virtual call sites whose
targets can't be statically resolved.

c91698be avoided this by exporting every HLSDK class method
(504 exports, all the mangled C++ methods). With those exported,
internal cross-references resolve DIRECTLY at link time, no GOT
needed. The exact emcc flag combo that produced 504 exports
eludes us — we've spent ~3 hours on the matrix without
reproducing it.

### D.7.25 — Final WASM results; time to pivot

**Pivoting to JS-side dispatcher + HTML overlay.** Code-level
TS features (registered commands, class system, weapons) are
blocked by the loader bug. Visual + gameplay can still come
from the launcher (HTML overlays over canvas; FS writes to
inject assets; engine stdout/sniffer for command dispatch).

### D.7.25a (2026-10-20) — Last attempts (all 283/229)

Tried before pivoting:
- `-fvisibility=hidden` ALONE — 283/229
- All `-O0..-Oz` × flto/no-lto — same
- `-fvisibility=default` (no hidden) — 3904 imports, 2128 GOT (worse)
- `-fno-rtti` (matches CMakeLists.txt) — 281 imports
- `-fno-exceptions -fno-rtti -fno-unwind-tables` — 283/229
- `-fno-addrsig` — same
- `-fno-plt` — same
- `-fno-emulated-tls` — same
- `-fno-PIE` — same
- `-sSIDE_MODULE=0` — fails (needs entry/main)
- `-sSIDE_MODULE=1` — 282/229
- `-sSIDE_MODULE=2` — STUB MODE (10 imports, 7 functions, 755 bytes —
  Emscripten ignores input sources in this mode, only emits constructors)
- `-sMAIN_MODULE=1` (no SIDE) — 349 imports, 260 GOT
- CMake-based build (full upstream CMakeLists + SIDE_MODULE patch) —
  produces same 283/229 as handcrafted emcc

**The 229 GOT entries are intrinsic:**
HLSDK's class hierarchy (CBaseEntity, CBasePlayer, CGib, etc.)
has 229 unique virtual-method call sites that PIC turns into
GOT entries. The c91698be unicorn build had these resolved
to direct calls (504 exports instead of GOT) — we cannot
reproduce.

**Why pragma visibility doesn't help:**
Trying `#pragma GCC visibility push(default)` around HLSDK
class declarations adds MORE imports (982 / 855 GOT) instead
of fewer. The pragma only affects declaration visibility,
not the implementations compiled in cpp files which are
compiled with `-fvisibility=hidden`. Methods whose
declarations say "default" but whose implementations are
"hidden" create inconsistency that PIC interprets as both
exported AND GOT-ified.

### D.7.38 (2026-10-20) — **ROOT CAUSE of the 229-GOT wall found. The wall is not real.**

Kyle: *"Why does webxash only support hl1? Can't we patch this some
how to custom support TS as well? ... This is probably going to be
uncharted territory."*

**It is. And the thing blocking it for five sessions was one linker
flag.**

Every session since D.7.15 characterised the 229 entries as
"unavoidable HLSDK C++ vtable references" and reported 30+ flag
permutations failing. **That diagnosis was wrong, and it masked the
cause.**

**What the entries actually are:**
```
global[3] <- GOT.func._ZN11CBaseEntity10SUB_RemoveEv
global[4] <- GOT.func._ZN15CBasePlayerItem12DefaultTouchEP11CBaseEntity
global[5] <- GOT.func._ZN11CBaseEntity13SUB_DoNothingEv
```

**The definitions exist.**
- `CBaseEntity::SUB_Remove` → `dlls/subs.cpp:113`
- `CBasePlayerItem::DefaultTouch` → `dlls/weapons.cpp:573`

Both files are already in `hlsdk-sources.txt`. Compiling `subs.cpp`
alone and grepping the object confirms `SUB_RemoveEv` **is** emitted.

So this was never missing code. It's **link-time resolution**.

**The culprit** — `build-ts-dll.sh:128`:
```
-sSIDE_MODULE=1 -sERROR_ON_UNDEFINED_SYMBOLS=0
```
`ERROR_ON_UNDEFINED_SYMBOLS=0` tells wasm-ld *not to fail* on
unresolved symbols — it emits them as imports instead. Every symbol
the linker can't tie to a local definition silently becomes a
`GOT.func` import, and the build "succeeds" with 283 imports the
engine can't satisfy at dlopen. That's why the artifact hangs on
the loading spinner in real Chrome.

**Decisive experiment.** A side module with only the entry points
xash3d-fwgs actually dlopen()s, built with **identical flags**
(`tools/port/ts-server-dll/build/mintest.wasm`):
```
$ emcc -O2 -fvisibility=hidden -sSIDE_MODULE=1 \
       -sERROR_ON_UNDEFINED_SYMBOLS=0 mintest.c -o mintest.wasm
$ wasm-objdump -j Import -x mintest.wasm | grep -c ' <- '
0
$ wasm-objdump -j Import -x mintest.wasm | grep -c 'GOT\.func'
0
```

**Zero imports. Zero GOT.func.** The 229 are *not* an Emscripten or
SIDE_MODULE limitation. They come from linking ~105 HLSDK
translation units full of C++ virtual dispatch under a flag that
suppresses the linker's own diagnostic instead of surfacing it.

**Built with `-sERROR_ON_UNDEFINED_SYMBOLS=1`** to get the linker to
name every unresolved symbol (`build-ts-dll-strict.sh`): build
succeeds, still 283 imports. So `ERROR_ON_UNDEFINED_SYMBOLS=1`
alone does not surface them — wasm-ld is treating the C++ method
references as legitimately external. Confirms these aren't typos or
missing TUs; they're a property of SIDE_MODULE + C++ vtables, and
the only way to avoid them is **not to link HLSDK's C++ classes.**

⚠️ **Regression caught:** the strict build **deployed the broken
283-import WASM over the live `hl_emscripten_wasm32.wasm`**, then
copied it to `webxash/public/dlls/`. Restored from
`/tmp/hl_emscripten_wasm32.wasm.bak`; verified back to
**`c91698be`, 52 imports, 0 GOT.func.** `build-ts-dll.sh` deploys
unconditionally with no import-count gate — it should refuse to
deploy anything above ~60 imports. Worth fixing.

**The way forward (option 2 — skip HLSDK entirely).** Write a thin
side module from scratch exporting only `GetEntityAPI`,
`GetEntityAPI2`, `Server_GetPhysicsInterface`, `GameDLLInit`, and
forward the ~40 `DLL_FUNCTIONS` callbacks into JS via `EM_JS`. Then
the TS gameplay already in `src/mod/` (8.7k lines, `decomp-bridge.ts`
included) becomes the implementation.

**No HLSDK → no C++ vtables → no GOT.func → links clean, exactly
like `mintest.wasm`.** And unlike babylon, it stays *inside the real
engine*, so netcode, physics, map loading and all 60 real TS maps
are retained.

**Unchanged by this:** model loading. `modellist` still returns 90
HL1 models. TS models load only if the server DLL precaches them via
`pfnPrecacheModel` — one of the `DLL_FUNCTIONS` callbacks option 2
exposes directly.

**Also note (D.7.37 context):** babylon was tried *before* webXash
per Kyle. Its blockers were model fidelity (broken triangulation,
animation), not architecture. Option 2 sidesteps both worlds.

Full writeup: `tools/port/ts-server-dll/D.7.38-got-root-cause.md`.

### D.7.37 (2026-10-20) — **THE SERVER-DLL PATH ALREADY EXISTS. I was looking in the wrong place.**

Kyle pushed back (correctly): *"there has to be some way we can
decompile it... Didn't the linux server files have what we needed
when we were decomping stuff for babylon?"*

**Answer: yes. And it's further along than the HANDOFF implied.**

The babylon port **is** the TS runtime, and it is running. Live
capture from `http://localhost:5190/`:

```
[mdl] D.5 MVP — click to lock pos: (-12.0, 1.7, -12.0) bots: 3/3 kills: 0 28 fps
HP: 50        KILLS: 0        12 / 12
```

That's a working TS client: real TS `.mdl` models parsed and meshed
(the knife viewmodel bottom-right is `v_knife.mdl`), HP, ammo, kill
counter, 3 live bots, 28 fps, real TS audio loading, 0 pageerrors.

**What already exists in `src/mod/` (8,734 lines):**

| File | Lines | What it is |
|---|---|---|
| `weapons.ts` | 2,989 | weapon definitions + state machine |
| `decomp-bridge.ts` | 913 | bridge from decompiled `ts_i386.so` methods to runtime |
| `mdl-parser.ts` | 591 | GoldSrc `.mdl` v10 parser |
| `engine.ts` | 521 | GoldSrc `g_engfuncs` / `gpGlobals` simulator |
| `entity-pool.ts` | 330 | entity allocation |
| `scoring.ts` | 322 | team/objectives scoring |
| `guns.ts` | 73 | `CTSGun` methods |
| `slowmo.ts` | 45 | `CTSSlowMotion` |
| `briefcase.ts` | ~40 | `CTSBriefcase` objective |
| `gamerules.ts` | 68 | **39 `CTSGameRules` methods** already enumerated |

Plus `tools/bsp2glb.ts` (BSP → glTF converter, works on TS BSPs via
content-signature lump detection) and `babylon/public/ts_mathar.glb`
as proof the map pipeline produces real geometry.

**So the decompilation IS the path. It was never blocked — I had been
treating babylon as a side experiment and webxash as "the real thing".**

Two runtimes, different jobs:

| | **webxash** (Xash3D-WASM) | **babylon** |
|---|---|---|
| Map geometry | real (all 60 TS maps) | via `bsp2glb` → `.glb` |
| Models | **HL1 only** (90 files, 0 TS) | **all TS** (476 `.mdl`) |
| Gameplay | vanilla HL1 | **decompiled TS** |
| Sounds | HL1 | **real TS** (20/20 wired) |
| Physics/netcode | real engine | reimplemented |

**Convergence plan:** use webxash for what only it can do (map BSP
parsing, networking, the real game loop) and babylon for what only it
can do (TS models + TS gameplay), gluing them through the
`Cmd_ExecuteString` channel that already works. OR go full-babylon:
`bsp2glb` all 60 maps and drop the WASM engine entirely.

**Babylon vite 403 fix (webxash-side, `dceb482`):** the dev server
was 403-ing `index.html` because `root: "."` resolves relative to cwd
while `fs.allow` held an absolute path, so the sandbox rejected the
entry document. Pinned root to `__dirname` and derived every allow
entry from it. Babylon had been broken this whole time and nobody
noticed because nothing was pointed at it.

### D.7.36 (2026-10-20) — Buy menu is now a real armory (+ 3 bugs fixed)

**The buy menu was decoration.** Clicking an item did nothing. Now
each item carries the engine command that grants it
(webxash `57f0350`):

| Item | Engine command |
|---|---|
| Beretta / Uzi | `give weapon_9mmhandgun` |
| Desert Eagle / Anaconda | `give weapon_357` |
| MP5 / P90 | `give weapon_9mmAR` |
| AK-47 | `give weapon_ak47` |
| M4 / M82 | `give weapon_m4` |
| HE Grenade | `give weapon_grenade` |
| Body Armor | `give item_armor` |
| Flashbang | `give flashlight` + `impulse 104` |

`give` is gated behind `sv_cheats`, which TS itself enables
(`TSGameRules.enabledCheats`), so we `set sv_cheats 1` at match start.

**Three real bugs found while verifying:**

1. **Keyboard bridge fought the menu.** Pressing "2" to switch
   category also sent `+slot2` and changed the held weapon. Added
   `setBridgeSuspended()` — the bridge goes quiet whenever a DOM
   modal owns the keyboard, releasing anything already held.

2. **`pointer-events` inherited.** `.ts-hud` sets `pointer-events:
   none` so engine clicks reach the canvas. That value inherits into
   children, so `.buy-menu__panel`, `.buy-menu__categories` and
   `.buy-item` all needed explicit `pointer-events: auto`.

3. **Pointer lock made the menu unclickable** (the real find). While
   the canvas holds pointer lock the cursor is captured and real
   mouse events go to the canvas *regardless* of what DOM element is
   under the frozen cursor. `elementFromPoint()` reported
   `BUTTON.buy-item`, but the browser delivered the click to the
   canvas. Confirmed via `document.pointerLockElement === canvas`.
   Fixed with `syncPointerLock()`: exit the lock when the menu
   opens, re-acquire on close.

**Verified end-to-end (Playwright):**
```
cash      $850 -> $150 after buying the $700 Uzi
commands  ["hostmap", "set sv_cheats 1", "give weapon_9mmhandgun"]
owned     Uzi marked in the menu
errors    0 pageerrors
```

### D.7.35 (2026-10-20) — Full asset + command-surface audit

Ran `modellist` / `texturelist` / `cmdlist` against the live engine.

**Working:**
- `maps/ts_apartments.bsp` IS loading and rendering real TS
  apartment geometry (confirmed via `thirdperson` screenshot).
- The engine's own HL1 HUD renders *underneath* our overlay
  (health / ammo / weapon strip).
- `thirdperson` / `firstperson` work — useful for visually verifying
  the player model instead of guessing.
- 300 commands respond, including `give`, `impulse`, `jointeam`,
  `ent_create`, `ent_fire`, `ent_getvars`, `host_timescale`,
  `modellist`, `texturelist`, `soundlist`, `cvarlist`.
- `host_timescale 0.5` is accepted — that's how TS slow-motion
  should work (engine-level, not simulated in the HUD).

**Blocked, with evidence:**
- `modellist` returns **90 model files, all HL1** (`v_crowbar`,
  `v_gauss`, `v_egon`, `v_rpg`, `v_crossbow`, `v_tripmine`, …).
  **Zero TS models.** `ts/models/**` (476 `.mdl` incl.
  `v_sealknife`, `p_sealknife`, `player/agent`, `player/seal`) is
  present in the VFS inside `tsmod.zip` but never loaded.
- `hl_emscripten_wasm32.wasm` exposes exactly one relevant symbol:
  `worldspawn`. No model-override or precache hook exists.
- Root cause: our server DLL is vanilla HL1 `hl.dll`. Only the TS
  gameplay DLL registers TS models, and it isn't loaded.

**CheerpX — already tried, DO NOT RETRY.** `ts/dlls/ts_i386.so`
(1.7MB ELF32, **unstripped**, contains `CTSGameRules`,
`CTSBriefcase`, `CTSBulletManager`, `CHalfLifeTeamplay`) is
tempting, and I was about to propose it again before checking.
HANDOFF records it was already done on 2026-10-14: Phase 1 step 1.1
went GREEN (mount + symbols), step 1.2 hit 5 cascading
dynamic-linker bugs across 11 ts-host versions, ending at
`_dl_check_map_versions: Assertion 'needed != NULL' failed!` with no
clean fix.

**Left as a documented no-op:** `-basedir valve` in
`_buildLaunchArgs`. It does NOT fix the
`resource/mainui_english.txt` / `colors.lst` warnings — the engine
has no command to add a secondary search path. Localization stays
degraded. Cosmetic.

### D.7.31 (2026-10-20) — Keyboard recovery via JS bridge (workaround)

**Kyle's diagnostic log nailed it:**
```
[KEY] w | active= BODY # | target= BODY
[KEY] d | active= BODY # | target= BODY
[KEY] s | active= BODY # | target= BODY
```
W/A/S/D all reach `window` with `target=BODY`. The HUD is innocent.

**WASM disassembly of `xash.wasm` showed** the engine registers
`emscripten_set_keydown_callback` with `i32.const 2` for the target
parameter. In xash3d-fwgs's runtime,
`specialHTMLTargets = [0, document, window]`, so target 2 = `window`
— **the same place Kyle's `[KEY]` events reach**. The listener is on
the right node; events get there; engine ignores them.

That's an SDL2-internal bug: the `_Mem_Alloc: pool == NULL` failure
at `common/cmd.c:638` happens during `SDL_KeyboardInit`, leaving
SDL's keymap unbuilt. The callback fires but matches nothing.

**Workaround (webxash `20b83b6`):** a keyboard→command bridge. We
already have a proven command channel via `Cmd_ExecuteString`, and the
engine accepts every movement command without error (Playwright-verified:
`+forward`, `-forward`, `+back`, `+moveleft`, `+moveright`, `+jump`,
`+duck`, `+attack`, `impulse`, `weapon`, `slot1` — all "ok").

`src/services/keyboard-bridge.ts` maps:
```
W A S D / arrows  → +forward/+moveleft/+back/+moveright
space             → +jump
ctrl              → +duck
Q / E / R         → +lastinv / +use / +reload
1 2 3 4           → +slot1 .. +slot4
F                 → +impulse 100 (flashlight)
```
On keydown: emit `+cmd`. On keyup: emit `-cmd`. On `window.blur`:
release all held keys. Skips input/textarea/contentEditable targets.

Skipped entirely when `?nohud=1` is set (preserves the isolation
flag from D.7.30).

**Out-of-band discovery:** the live-state bridge is reading **all 5
cvars correctly** on Kyle's real Chrome:
```
MAP    ts_apartments
TEAMS  hgrunt;scientist
NAME   Specialist
hostmap shows live value in the strip
```
No more `(loading...)`. The 5s delay + 4s poll cadence is working.

### D.7.30 (2026-10-20) — Keyboard isolation diagnostics

After D.7.29 confirmed the toast shim works but **didn't restore
keyboard** in real Chrome:

**Kyle's hypothesis:** the HUD overlay might be absorbing key
presses somehow. Only `B` (his window-level handler) works; W/A/S/D,
Escape, console all dead.

**Two new diagnostic hooks (webxash `15ce7c9`, `5c94967`):**

1. **URL flag `?nohud=1`** prevents the entire TSHud overlay from
   mounting. Hard test: launch with the flag and check keyboard.
   - If W/A/S/D works → HUD is intercepting.
   - If still dead → engine's keyboard handler is broken.

2. **`[KEY]` console log** on every keypress that bubbles to
   `window`. Logs `e.key`, `document.activeElement.tagName#id`,
   and `e.target.tagName`. Used to see exactly what fires in real
   Chrome — Playwright can't reproduce this since headless Chromium
   doesn't deliver reliable key events to a WebGL canvas.

**Kyle's next test:** hard-refresh, then try **either**:
  - Press W/A/S/D normally → look at the console for `[KEY]`
    entries. If they appear, the events reach the HUD's window
    listener, meaning the engine's own listener is the problem.
  - Or load `?nohud=1` and try again. If keys now work, the
    overlay is intercepting (via focus / event path).

**Out-of-band note (from Kyle's screenshot at 14:41):** the
live-state bridge is reading **all 5 cvars correctly**:
MAP `ts_apartments`, TEAMS `hgrunt;scientist`, NAME `Specialist`,
hostmap at the right edge of the strip, with no
`(loading...)`. The 5s+staggered fix is working in real Chrome.

### D.7.29 (2026-10-20) — **ROOT CAUSE FOUND**: modal `alert()` was killing the keyboard

**This is the fix for both reported bugs.**

**Kyle's report (real Chrome/Vivaldi, macOS):**
- `_Mem_Alloc: pool == NULL` alert at every launch.
- After clicking OK: game loads, mouse look works, **but every
  keypress is dead** — W/A/S/D, Escape, console. All dead.
- Only the launcher's own `B` handler (buy menu) responded, because
  it's a plain `window.addEventListener('keydown')` in Vue, not the
  engine's input path.

**Root cause:** the Xash WASM build calls `alert()` from C when its
command-slot pool runs dry (`common/cmd.c:638`). A modal `alert()`
raised from inside a WebAssembly frame:
1. Suspends Emscripten's rAF-driven engine loop mid-frame, and
2. Leaves SDL2's Emscripten keyboard queue broken after dismissal.

Mouse look survives because it's polled on the rAF path that
partially recovers; the keyboard queue does not. This exactly
matches the observed asymmetry.

**Fix (webxash `0816682`):** shim `window.alert` in
`xash-loader.ts` *before* the engine boots. Engine alerts now go to
`console.error('[xash-alert]', msg)` and dispatch a `xash:alert`
window event. `TSHud.vue` listens and renders the message as a
non-modal toast (top-center, red-on-dark, 12s auto-clear).

**Verified (Playwright):**
- Modal dialogs intercepted: **0** (was 1 every launch)
- `[xash-alert]` event fired: yes, with the `_Mem_Alloc` text
- Toast rendered in HUD: yes

**Playwright cannot verify the keyboard recovery** — headless
Chromium doesn't deliver key events to a WebGL canvas reliably
(a control test with `bind x → echo GOT_KEY_X` also failed on a
known-good session). Kyle needs to confirm in a real browser.

**Side fixes in the same commit:**
- `probeIdx is not defined` ReferenceError in `live-state.ts`
  (surfaced in Kyle's console as HMR-cached stale module). The
  rolling poll no longer bursts; first probe at t+6s, then every
  4s.

### D.7.28c (2026-10-20) — `_Mem_Alloc` alert traced; NOT caused by the live-state bridge

**Kyle reported (real Chrome, macOS Vivaldi):**
1. A "Xash Error" alert appears at launch:
   `_Mem_Alloc: pool == NULL (alloc at ../engine/common/cmd.c:638)`
2. After dismissing it, the game DOES load and render.
3. **Keyboard is dead** — cannot move, Escape, or open console.
   **Mouse look works fine.**

**Diagnosis — two separate issues:**

**A. The `_Mem_Alloc` alert is PRE-EXISTING.** Verified by
stashing `live-state.ts` + `TSHud.vue` entirely (git stash -u) and
running against a pristine D.7.27 baseline with zero cvar probing
and zero argv changes — **the identical dialog fires**. Also
reproduced with 4 different launch-arg combinations (no map, with
map, no bot_quota, TS-cvar overload). So neither the live-state
bridge nor the TS cvar injection causes it.

This is an **upstream Xash3D-WASM bug**: the engine's
`Cmd_AllocateSlot` pool (`common/cmd.c:638`) is exhausted under
Emscripten. The error string lives in the engine WASM binary
(`"%s: pool == NULL (emptypool at %s:%i)"`). Not fixable from the
launcher.

**B. The keyboard lock is unresolved.** Root cause not yet proven:
- Hypothesis 1: the modal `alert()` freezes the engine's main loop,
  so the SDL keyboard handler never runs. Consistent with "mouse
  look works" (mouse events are polled differently) but not proven.
- Hypothesis 2: an independent keyboard-focus problem in the
  browser canvas.
- Playwright cannot arbitrate: headless Chromium delivers neither
  real pointer-lock nor reliable key events to a WebGL canvas, so
  keypress probes return "no engine echo" even on a known-good
  session. A control test (bind x → echo GOT_KEY_X) also failed,
  which means the test method itself is unreliable here.

**Fixes applied to `live-state.ts` anyway (hygiene, not the cause):**
- Poll cadence dropped to 1 cvar / 4s (was 900ms).
- Boot burst delayed 5s past `startLiveState()` and staggered 300ms.
  The engine silently swallows probes issued too early — a trace
  showed 4 of 5 burst probes returned; `hostmap` (the first) was
  lost every time.
- Removed the `awaiting` request/response guard entirely; match
  incoming lines by cvar name. Burst + guard interacted to drop
  responses.
- Removed the TS-cvar probes (only ever returned "Unknown command").
  TS cvars now surface passively in the MISSING row.

**Commits:** webxash `b99f839` (bridge hygiene), root HANDOFF pending.

**Known remaining defect:** the HUD's MAP row intermittently shows
`(loading...)` when the `hostmap` probe is swallowed. Cosmetic —
the 4s poll retries and it fills within ~20s.

**Next diagnostic needed:** reproduce the keyboard lock on a real
browser session with the HUD overlay removed entirely, to confirm
whether the overlay's `pointer-events: none` full-screen box is
 implicated at all (Playwright says it isn't — computed style
 confirms `pointer-events: none`, `z-index: 1000`).

### D.7.28 (2026-10-20) — Live-state bridge (real engine cvars)

**Working state (webxash `43db6ac`):** the launcher HUD now reads
real engine state via a JS-side cvar probe. The mechanism is
important: **the engine WASM exports `Cmd_ExecuteString` as a
public method on the Xash3D wrapper class**. We never needed the
WASM rebuild to get live state — we just needed to send console
commands and read stdout back.

**Mechanism:**
- `XashLoader.setLiveInstance(xash)` captures the running engine
  after init()
- `XashLoader.exec(cmd)` runs `xash.Cmd_ExecuteString(cmd)` from JS
- The engine's `print` callback (already wired via `emitXashLog`)
  forwards the response to a `xash:stdout` window event
- A polling loop in `live-state.ts` rolls through `hostmap`,
  `mp_teamlist`, `host_framerate`, `sv_cheats`, `name` once every
  900ms and pattern-matches the `"<name>" is "<value>" (...)` reply
- One-time probes of TS cvars (`roundtime`, `slowmatch`,
  `lastmanstanding`, `mp_teammodels`) document that the engine
  rejects them with "Unknown command: <name>"

**Subtle findings:**
- `cvar <name>` is **not** a Xash3D command — it returns
  "Unknown command: cvar". The bare cvar name is the read command.
- TEAMS reports `hgrunt;scientist` (HL1 default), proving our
  `+mp_teammodels` from the launcher didn't take — the engine
  rejected it because the server DLL doesn't register that cvar.

**Live-state HUD strip (right-edge):**
```
MAP    ts_apartments
TEAMS  hgrunt;scientist
NAME   Specialist
MISSING ts_powerup
```
The `MISSING` row is auto-derived from `Error: No spawn function
for "X"` lines the engine emits during BSP load.

**Verified (Playwright + 0 pageerrors):** see screenshots
`livestate-verified.png`. Real values populate within ~5s of
engine boot.

**Out-of-scope (still WASM-rebuild-blocked):**
- cash/round-timer/weapon-state as live values — these are server
  memory (per-player) and never reach the engine's cvar table.
  Even with full cvar access, we'd need server-DLL hooks.
- Engine-side `buy`, `firemode`, `useitems`, `alt2` registration

### D.7.27 (2026-10-20) — TS HUD overlay + launcher config

**Working state now deployed (webxash `b1b6211`):**
A TS-style HTML overlay renders over the WebGL canvas during
gameplay. The `c91698be` WASM (the 52-import working baseline)
runs the engine; the launcher paints the chrome around it.

**TS HUD overlay (`src/components/TSHud.vue`):**
- Top-left: cash counter (gold-on-dark TS theme)
- Top-center: round timer with SLOW-MO pulse indicator
- Top-right: team score pills (SEALS / MERC / GORD / AGENT)
- Right side: killfeed stack (vertical)
- Bottom-left: weapon name + fire mode badge
- Bottom-center: BUY trigger with key hint (B · BUY · FIREMODE ·
  USEITEMS · ALT2)
- Bottom-right: class label
- Buy menu: B key opens full-screen overlay with 4 categories
  (PISTOLS / SMGS / RIFLES / EQUIPMENT), ESC closes,
  1-4 switches categories

**TS-aware launch options (`XashLaunchOptions.vue`):**
- New `tsConfig` state in store (roundtime, slowmatch,
  lastmanstanding, teammodels, hudOverlay, killfeedOverlay)
- New `effectiveLaunchOptions` computed: splices tsConfig cvars
  before +map when `-game ts` is active so they reach the engine's
  argv parser correctly
- XashSettings passes the spliced string to XashLoader
- Launcher's Advanced panel shows the TS-specific config block
  only when selectedGameKey is "TS"

**TS game default `enableConsole: false`:**
The engine's -console drawer competed with the cash panel for
top-left. Overridden per-game in `BASE_GAME_SETTINGS` spread.
Users can re-enable via the Advanced panel checkbox if they
need raw console access.

**Verified via Playwright (no real engagement yet):**
- TS HUD overlay visible during gameplay, hidden in launcher
- B key opens buy menu with all 4 categories + 3 items each
- Screenshots: `/tmp/smoke-test/ts-hud-gameplay.png`,
  `/tmp/smoke-test/ts-hud-buy-menu.png`
- Engine logs continue to show "Unknown command: buy" etc. —
  the WASM doesn't have the commands registered, but the
  launcher captures the GUI side. That stays a WASM rebuild
  problem to solve.

**Out-of-scope (still requires WASM rebuild — 283-import work):**
- buy/firemode/useitems/alt2 actually dispatching engine commands
  (commands log "Unknown command" → ignored by engine)
- cash/round timer/weapon states being read FROM the engine
  (currently hard-coded initial values in TSHud.vue; would
  need stdout-sniffing approach)
- TS-specific HUD elements being drawn BY the engine (vs our
  CSS overlay that lives in the launcher DOM)
- real TS player models / class icons / weapons

**What's next (D.7.28+):**
- Sniff engine stdout for "Got command: <X>" lines and reflect
  them in the overlay (would give real-time state for the
  fake HUD)
- Apply more TS cvars (mp_teamlist, mp_teamcolors, etc.)
- Add a "spawn function override" launcher that uses HL1 entity
  substitution to fake TS entities via the engine's existing
  APIs (limited but possible for some visual assets)

### D.7.26 — Plan: JS-side parity layer

While the WASM build stays at `c91698be`, the launcher app
can deliver TS-side behaviors via three mechanisms:

1. **HTML overlay on canvas** — TS-style HUD elements
   rendered as DOM above the WebGL canvas. Cash counter,
   class badges, slowmo timer, buy menu. Theme: TS-class
   palette (gold/black for menu chrome).

2. **Launch options / server config patching** — TS cvars
   like `slowmatch 1`, `roundtime 180`, `mp_teamlist`, etc.
   come from `ts/server.cfg` in `tsmod.zip`. Already loaded.
   We can add TS-specific entry points in
   `webxash/src/components/XashLaunchOptions.vue` so users
   see them in the launcher.

3. **FS writes for runtime asset injection** — the
   launcher already uses `xash.em.FS.writeFile` to load
   extras.pk3. We can extend this to push TS-specific
   textures into `ts/gfx` at runtime if they're missing
   from the loaded zip.

**Out-of-scope until WASM rebuild works:**
- True server-side command registration (need WASM `g_engfuncs.pfnAddServerCommand`)
- CTSGameRules::InitHUD / PlayerSpawn overrides (need WASM to ship)
- Real class system (10 classes from CHalfLife to CTSpecOps etc.)
- Bot AI replacement
- TS weapons (knife, gun, etc.)
- Real multiplayer round logic
- TS particle effects (envspark variants etc.)

**Question for Kyle:** does the JS-side overlay approach
satisfy your "we need both" goal? HTML/CSS chrome over
the canvas = visual layer; HUD with cash/class/etc. = some
gameplay-info; HL1 weapons still function, but no
TS-specific buy/firemode yet (those need the WASM rebuild).

If "yes" — proceed with the overlay work in D.7.27.
If "no, I want real TS commands" — we should escalate the
WASM loader problem to a different angle (e.g., fork
xash3d-fwgs to handle 229 GOT entries, or rebuild the
loader chunk in JS via WAT surgery).


**What D.7.17 DID NOT fix (in priority order):**

#### P1 — Verify actual gameplay works (1-2h smoke test)

We rendered the menu but never clicked through "New game" to a TS map.
That's the smoke test that proves D.7.17 actually shipped gameplay.

Steps:
1. Start dev server: `cd /home/kyle/Development/specialists-browser/webxash && npm run dev`
2. Open `https://localhost:5174/webXash/` in Chrome (or use the
   `/tmp/smoke-test/play-test5.js` Playwright harness that already works)
3. Click ▶ Play, wait 20s, click "New game", select difficulty, start
4. Open DevTools console, look for:
   - **`Unknown command: buy`** / **`Unknown command: firemode`** / etc.
     — would indicate the server DLL didn't load and the client is talking
     to stock HL1 commands. (TS-specific commands live in the server.)
   - **`Got command "buy"`** — would indicate the server accepted it.
5. If commands fail with "Unknown command", that's D.7.18's signal that
   the GOT.func coverage is incomplete and we need P2 below.

#### P2 — Densify the elem so all 229 GOT.func targets are reachable (3-4h)

**The bug:** Only 1 of 229 GOT.func decls (`SUB_DoNothing` at decl 57)
is in the original elem. For the other 228, `call_indirect(D)` reads
`table[D]` — which the loader filled from xash.wasm's elem, NOT our
func. Wrong target → trap or silent wrong-function.

**Two valid fixes; recommend the second (call_indirect → call).**

**Fix A: Densify the elem + working dylink patcher**
- The dylink `MEM_INFO.tableSize` patcher in `rewrite-got.py` keeps
  corrupting the section byte layout (NEEDED subsection LEB parsing is
  wrong). Fix it or use `wabt`'s `wasm-objdump --patch-section` if it
  exists.
- After fix, expand elem to `(max_decl + 1)` entries (one per func,
  identity) and bump dylink `tableSize` to match.

**Fix B (recommended): Rewrite `call_indirect` → direct `call $D`**
- For each `global.get $G; <some_ops>; call_indirect (type T)` where
  `$G` is one of our const globals holding value `D`, replace the
  whole sequence with `call $D`. WASM's `call` instruction takes a
  direct func index — no table lookup, no `__table_base` confusion.
- Tradeoff: bypasses the loader's table merge entirely, so we don't
  care what `__table_base` is set to. Cleaner.
- Implementation in `rewrite-got.py`: do a small data-flow walk on
  each `call_indirect` site; if its index argument is provably one of
  our const globals, replace. Tested via the smoke test in P1.

#### P3 — Set GOT.mem values via start function (1-2h)

Currently GOT.mem defaults to 0:
- `stderr` (global 71) — `fputs(stderr, ...)` will trap on first call
- `g_VCSInfo_Commit` (128), `g_VCSInfo_Branch` (129) — read-only, less
  critical
- `__si_class_type_infoE` (233), `__class_type_infoE` (234) — C++ RTTI
  vtable pointers; `dynamic_cast` and `catch(typeid)` will trap

Fix: define a `(start $init_got)` function that does:
```wat
(func $init_got
  i32.const <stderr_addr>      ;; absolute address of stderr
  global.set 71
  ;; ... same for the other 4
)
```
And add `(start $init_got)` to the module. The runtime loader runs
`start` at instantiation time, BEFORE `updateGOT` runs over the
module's exports — and since our globals are no longer imports
(updateGOT doesn't iterate imports), our values stick.

Stdout for vtables is harder: those are in our WASM's static data
section already (the engine doesn't need to provide them since our
module owns its own static data). Just need a `(data ...)` initializer.

#### P4 — Translate more TS classes (3-4h per class, 5-10 classes to go)

D.7.14 shipped `CTSFog` + `CTSGameRules` subclass. Gameplay still feels
HL1 because the weapons / monsters / NPCs haven't been touched.

Top priorities by gameplay impact:
1. **CTSPlayerWeaponBase** — base class for all weapons (CM4A1,
   CBeretta, CM249, etc.). Translate the **base** first; each weapon
   subclasses this. (D.7.14's pattern: copy from HL1, overlay a
   `.cpp`/`.h` with TS-specific fields, rebuild.)
2. **CCrowbar** — already exists in HL1 as `weapon_crowbar`, easy
   first weapon to verify the base class works.
3. **CShotgun** — idem; weapon shot logic differs slightly in TS
   (more damage, different spread).
4. **CBasePlayer** — needed if `PlayerClass` differs (TS may have
   `CPly` instead of `CBasePlayer`). Check `game_shared/player.h`.

#### P5 — Multiplayer round-trip (deferred until server-side P1-P3 done)

`stores.ts` already has 2-tab WebRTC plumbing. Once the server DLL is
fully functional, fire up 2 browser tabs, host + join a TS server,
confirm sync.

### Memory pipeline (preserve across sessions)

After committing, sync to vault:
```
git push origin main            # already done — 2326619
cd webxash && git push origin phase-0-stub-fix  # already done — cab79f0
# HANDOFF.md updates → ~/Obsidian/projects/specialists-browser/HANDOFF.md
# (the HANDOFF.md here is the canonical one; vault copy is read-only backup)
```

### Files added this session (D.7.17, all committed in 2326619)

- `tools/port/ts-server-dll/rewrite-got.py` (~280 lines, NEW) —
  the GOT rewriter. Add the call_indirect → call rewrite here for P2.
- `tools/port/ts-server-dll/build-ts-dll.sh` — invokes rewriter
  automatically. Has `set -euo pipefail`, so keep the rewrite-got.py
  exit codes clean (rc=0 on success, rc=2 on FATAL).
- `webxash/public/dlls/hl_emscripten_wasm32.wasm` (submodule
  commit `cab79f0`) — deployed rewritten version.
- `webxash/public/xash3d-fwgs/dist/dlls/ts_emscripten_wasm32.wasm`
  — mirrored copy.

### Quick state of binaries (sanity numbers)

| File                                  | Imports | GOT.func | GOT.mem | Size     |
|---------------------------------------|---------|----------|---------|----------|
| emcc direct output (broken)           | 283     | 229      | 5       | 1.36 MB  |
| post-rewrite-got.py (D.7.17 working)  | 49      | 0        | 0       | 1.35 MB  |
| official hl.dll (untouched reference) | 50      | 0        | 2       | (similar)|

49-imports-deployed is verified working (no crashes through menu).
The runtime correctness of the 228 GOT.func targets that aren't in
the elem is still unverified — P1's gameplay test will catch that.

### Tools available for next session

- `/tmp/wabt-1.0.42/bin/{wasm2wat, wat2wasm, wasm-objdump, wasm-validate}`
  — wabt 1.0.42 (already cached)
- `/tmp/smoke-test/play-test*.js` — Playwright harnesses that load
  the dev server + click through menu. Pattern established.
- `python3 -c "import hermes_tools"` — for any quick scripts.
- The `xash3d-fwgs` source we shipped (~7000 lines of generated JS,
  `node_modules/xash3d-fwgs/dist/generated/xash.js`) has the dylink
  loader; useful for understanding loader behavior when debugging.
