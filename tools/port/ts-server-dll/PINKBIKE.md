# The Specialists — way forward & progress track

Single source of truth for "what's done / what's left / what's blocked".
Read top-to-bottom each session and update at every commit.

## Phase P3 — Map render (PARTIAL — listen-server wall hit)

### What's done
- All 52 DLL_FUNCTIONS slots filled with real functions (v2 fix).
- Bridge renamed from local-`Module.ctsBridge` to
  `globalThis.__ctsBridge` after xash.js was discovered to keep
  `Module` in an IIFE closure (xash.js:5). Without this rename
  the EM_JS trampolines cannot see any host-side handlers at all.
- pfnGameInit now registers five cvars (mp_teamlist, hostname,
  sv_gravity, maxplayers, deathmatch) via the `pfnCVarRegister`
  engine callback at slot 56 of g_engfuncs_t. These cvars are the
  engine's listen-server-flow inputs.
- pfnPM_Move implemented (HL1 walk: friction, accel, jump, gravity).
- pfnSpawn returns 1 (success).
- pfnServerActivate carries a v3-disable-marker comment — entity
  creation tested off after the engine-thrown null-function trap
  pointed there; restore in v4 with proper pfnAllocateGlobalString
  path.

### What works
- `Dll loaded for game "The Specialists"` — engine accepts the shim.
- `Warning: late precache of models/v_sealknife.mdl` — precache runs.
- HUD overlay fully alive: TEAMS (SEALS/MERC/GORD/AGENT), player
  roster (Lombardi, Orgasmo, Winters, Mason), TIME 2:41 ticking,
  CASH, name, MAP indicator.

### What doesn't work
- Listen server stays NOT running under the shim:
  `status` → "no server running." even after explicit
  `sv_lan 1 / deathmatch 1 / maxplayers 32 / map ts_apartments`.
- World geometry never renders — black canvas behind the HUD.
- modellist returns only the precache list (~5 entries) instead
  of the engine's full set (~263).

### Diagnosis: where the wall is
c91698be registers a DIFFERENT cvar baseline than the shim does —
verified by `cvar` queries:
- c91698be: `deathmatch 0`, `sv_gravity 800`, `maxplayers 1`,
  `hostname "Half-Life"`, `sv_lan 0`, `teamplay 0`, `public 0`,
  `fps_max 100` — all default values.
- shim: registers its own (mp_teamlist, hostname, sv_gravity,
  maxplayers, deathmatch) and the engine only honours the ones
  it looks for first.

xash3d-fwgs's listen-server flow does NOT trigger when the engine
sees an `+map` AND deathmatch=0 AND cvar defaults below
threshold (`maxplayers 1` might gate it). The official HL1 DLL
exits whatever check we are failing. Without engine source (it's
shipped as closed .wasm), the exact gate is unknown.

### Why this isn't the shim's fault
- `GetEntityAPI`, `GiveFnptrsToDll`, `Server_GetPhysicsInterface`
  all called and accepted (proven: DLL loaded message + our cvars
  do register).
- pfnSpawn/pfnServerActivate signatures all match.
- 0 imports, 0 GOT.func — wall is gone.

### Next-direction options (after this session)
1. **Dispatch from C++** — bring back the `MALLOC_BULK_MEMORY` /
   HLSDK build path but stop linking worldspawn (use the shim's
   knowledge to short-circuit worldspawn). Untried because it
   requires significant build-script surgery.
2. **Build a minimal TS server simulator in JS** — instead of
   relying on the engine's listen-server flow, the JS side
   pretends to be a server. The bridge becomes the actual
   game server. This is the "modules as JS-side server simulator"
   path Kyle was pushing in an earlier session.
3. **Inspect engine's Host_CreateGameImport** — wasm-objdump the
   xash.wasm to find what specific function slots the engine
   probes. The null-function trap in xash.wasm:0xbfcbf points
   to an internal call site that may give us a hint.

## Phase map (jump to anywhere)

| Phase      | Goal                                                           | Status |
|------------|----------------------------------------------------------------|--------|
| P0 Foundations | Diagnostic infra, JS-side cash, keyboard bridge, HUD overlay | ✅ done |
| P1 Wall finding | Identify the actual cause of server-DLL load failure        | ✅ done (D.7.38) |
| P2 Shim build | Compile a clean side-module without HLSDK that the engine loads | ✅ done (D.7.39, ts_shim_v2) |
| P3 Map render | Make the viewport show the map (worldspawn spawn path)       | 🔴 in flight |
| P4 Entities    | Make BSP entities / info_player_start / info_landmark appear | ⬜ pending |
| P5 Players     | Player spawn via pfnClientPutInServer, edict seeding         | ⬜ pending |
| P6 Networking  | pfnAddToFullPack + delta for clients (proxies for HL1 now)   | ⬜ pending |
| P7 Weaponry    | pfnGetWeaponData + pfnCmdStart weapon firing                 | ⬜ pending |
| P8 HUD sync    | real cvar → live-state channels for hp / cash / team / case  | ⬜ pending |
| P9 JS gameplay | Module.ctsBridge handlers fire src/mod/slowmo/briefcase/..   | ⬜ pending |
| P10 Polish     | reload binding, console toggle, HUD shell affordances        | ⬜ pending |

## Targets (acceptance criteria)

A **target** is "x is done when y works in real Chrome via real
input." Phases are subtasks of the same Playwright recipe.

### T1 — Map renders
- Hard-refresh `https://100.95.111.112:5174/webXash/`, click START.
- Status bar reads "Dll loaded for game 'The Specialists'".
- Visually: map geometry (apartments box walls) visible, not black.
- **Verify**: Playwright captures a non-black pixel at canvas center,
  `screenshot()` saved, hex diff against `c91698be` baseline < 95%.

### T2 — Player spawns
- Click START.
- HUD shows TEAM, CASH, TIME counters populated.
- F3 minimap / scoreboard accessible.
- **Verify**: live-state reads `mp_teamlist` returning a TS prefix,
  read `hostmap` returns `ts_apartments`.

### T3 — Movement
- WASD moves the viewmodel; mouse drag rotates the view.
- **Verify**: change `host_framerate` to 0.05 and confirm HUD view
  rotates within a frame or two.

### T4 — Combat / weapons
- B opens buy menu (already done D.7.36); 1/2/3/4 select.
- Q swaps weapon, R reloads (clip-fed only).
- Left click fires (D.7.33 mouse bridge).
- **Verify**: HUD ammo decreases on click; cash decreases on buy.

### T5 — Multiplayer
- `bot_quota 2` puts two TS bots in the map.
- They move / shoot / die / score.
- **Verify**: `cl_entitycount` grows; `modellist` includes
  `player/seal` and `player/agent`.

### T6 — Real TS commands
- `buy`, `firemode`, `useitems`, `alt2`, `roundtime`, `slowmatch` are
  all `Unknown command` today. They become real.
- **Verify**: each returns "ok" from the engine console.

### T7 — Models fully loaded
- modellist returns the 78+ TS models currently absent.
- **Verify**: `modellist` includes  `v_sealknife.mdl`,
  `v_beretta.mdl`, `v_anaconda.mdl`, `v_mp5.mdl`, `player/agent`,
  `player/seal`, etc.

### T8 — Maps playable
- All 60 TS `.bsp` files loadable from the launcher (currently 1 works).

## Phase P3 — Map render (CURRENT)

Plan
- 3a — full `enginefuncs_t` table (152 functions) added to shim.
- 3b — `pfnSpawn` returns 0 for worldspawn, -1 for everything else
       (engine handles the world).
- 3c — `pfnServerActivate` no-op (logging).
- 3d — diagnostic: log every entity the engine asks us to spawn.
- 3e — build, run, confirm map renders.

Suspicion
- T1 is failing because pfnSpawn returns 1 for entities we can't
  instantiate (info_player_start etc.), causing the engine to block
  and never reach `pfnServerActivate`. With worldspawn=0/others=-1,
  entities are silently removed and the map loads.

## Hard rules (code review for any next change)

1. **Don't touch `c91698be`.** Rollback target. Copying to
   `*.c91698be.bak` is the only permitted write to that path.
2. **Don't add MORE no-op callbacks.** All 52 slots are filled;
   any new slot MUST have a real body.
3. **JS-side `Module.ctsBridge` IDs must match shim's EM_JS opcode
   table.** The bridge file is the contract.
4. **Every server-side change notes: flag delta, import-count,
   GOT.func count, WASM SHA, pageerror count.** Regression scrap.
5. **All decisions live here, not in chat.** Update PINKBIKE.md
   before committing and HANDOFF.md after.

## Known fixed gotchas

(Full list in HANDOFF.md D.7.29-D.7.39. Bulletlist lives in
`WAY-FORWARD.md`.)

- `-sERROR_ON_UNDEFINED_SYMBOLS=0` is why the 1.36 MB build had
  229 GOT.func. Flag alone doesn't help; remove HLSDK.
- Visibility("hidden") makes dlsym fail silently — annotate the
  four engine entry points with default visibility only.
- A NULL `DLL_FUNCTIONS` slot calls function index 0 = null trap.
- PM_Move is not optional and not a no-op.

## Active blockers

- (none blocking P3 — building in progress).
