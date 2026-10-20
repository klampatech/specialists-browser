# The Specialists — way forward & progress track

Single source of truth for "what's done / what's left / what's blocked".
Read top-to-bottom each session and update at every commit.

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
