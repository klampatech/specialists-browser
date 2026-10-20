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

### Boundary as of D.7.47 (re-measured after the slot-table fix)

| Layer | State | Evidence |
|-------|-------|----------|
| DLL load | ok | `Dll loaded for game "The Specialists"` |
| cvars | ok | `mp_teamlist team1;team2;team3;team4` |
| physics interface | ok | no more `SV_LoadProgs: couldn't get physics API` |
| listen server | ok | `TCP/IP Disabled`, `4 player server started` |
| BSP load | ok | `map: ts_apartments` |
| entity classes | partial | 250 exported; a few classnames still log `No spawn function for ""` |
| engine slot table | ok | no `function signature mismatch`, no `pfnWriteEntity` abort |
| **client handshake** | **BLOCKED** | never reaches `Setting up renderer...` |

### The lesson that cost the most time: slot indices

Our `SLOT_*` macros were hand-counted from **eiface.h**'s
`enginefuncs_t`. xash3d-fwgs' actual table disagrees past ~slot 50
because it inserts Xash3D extensions the GoldSrc header does not
declare. `eng_at()` casts a slot straight to a function pointer and
calls it, so a wrong slot is a silent call into the wrong engine
function.

Concretely: we had `SLOT_ALLOC_STRING 64`. In eiface.h, 64 is
`pfnAllocString`. In xash3d-fwgs, 64 is `pfnPvEntPrivateData` and
`pfnAllocString` is **67**. Calling 64 made the engine
`pfnWriteEntity`-range-check a string pointer and abort with
`invalid entnumber 31529152` (0x01E10000 — a string offset, not an
edict number).

**Authoritative source is the initialiser, not the header:**
```c
// engine/server/sv_game.c
static enginefuncs_t g_engfuncs = { pfnPrecacheModel, ..., SV_AllocString, ... };
```
Extract slots from that. Never count from eiface.h.

### Stub structs are the same class of bug

`entvars_t`, `entity_state_t` and `clientdata_t` were all stubs with
the wrong fields. `entity_state_t` was missing `entityType` entirely —
the field whose high byte carries the slot number the engine
range-checks. Every one of these silently produces garbage rather than
erroring, because the engine just memcpy's the struct into a packet.

Rule: for any struct the engine copies wholesale (network structs,
entvars), copy the layout verbatim from the header and say where it
came from.

### Remaining gap: the client handshake

`cl_main.c:1394`:
```c
if( cls.state == ca_disconnected && SV_Active( ) ) {
    cls.state = ca_connecting;
    NET_NetadrSetType( &cls.serveradr, NA_LOOPBACK );
}
```
The client auto-connects to loopback once the local server is live,
then must reach `ca_connected` (`cl_main.c:1753`) to leave the loading
screen. c91698be gets there under the same `-noip -noip6` flags, so
this is our server chain failing to satisfy the first loopback frame,
not the flag.

Still worth trying, in order:
1. `pfnSetupVisibility` (currently `ts_NoopVis`) — no PVS means the
   client has nothing to cull against.
2. `pfnClientUserInfoChanged` — not implemented at all.
3. `pfnClientConnect` return value — we return 0 unconditionally.
4. The residual `No spawn function for ""` — some classnames still
   resolve to empty, meaning `pfnAllocString` is returning 0 for them
   or our classname write is being skipped.

### The string-index dead end (D.7.49) — measured, then abandoned

We chased the residual 207 × `No spawn function for ""` to a definite
answer and it turned out to be the wrong battle:

- `GiveFnptrsToDll(&gpEngfuncs, svgame.globals)` passes a **valid**
  pointer (`0x5148AC`), confirmed by probe.
- `globalvars_t::pStringBase` at byte offset 108 is **not null** — but
  xash3d-fwgs assigns it the literal `""` on the `!XASH_64BIT` path
  (`sv_game.c:3123`). It is a tiny address, not the string-pool base,
  so any pointer→offset conversion using it is meaningless.
- `SV_AllocString` returns `0x66B7978` for every classname: an
  absolute heap address. So this build **is** on the 64-bit string
  path (`str64.pstringarray`), and `SV_GetString`'s read-back is
  `pStringBase + idx` against that same array.

Conclusion: the engine is self-consistent about string representation;
our conversion was the bug, not the engine. `ts_NormalizeStringIndex`
now passes the value through unchanged and says why. The 207 empty
classnames remain and are **not** a client-handshake cause — the spawn
failures happen server-side during `SV_LoadFromFile`, long before the
client connects.

**Do not re-attempt the pointer/offset conversion.** If this needs
fixing, the correct lever is `physFuncs.pfnAllocString` /
`pfnMakeString` / `pfnGetString` (`physint.h:156-160`), which let the
DLL own the representation outright. That is a real feature, not a
debugging detour — add it with the other unimplemented physics hooks.

### Next-direction options (after this session)

**Kyle chose #1 for the next session. #2 and #3 stay queued — do NOT
lose them.**

1. ~~wasm-objdump the listen-server gate~~ **[IN PROGRESS — chosen]**
   `xash.wasm` throws `RuntimeError: null function` at function[434]
   offset `0xbfcbf`. That is the engine calling through a null
   table entry on the listen-server path. Decompile around that
   offset to name the cvar / state check it is gating on.
   - Stack (v2, pageerror):
     ```
     wasm-function[434]:0xbfcbf
     wasm-function[435]:0xc0919
     wasm-function[733]:0xe2719
     wasm://wasm/2ec199da:wasm-function[49]:0xb28   <-- OUR shim
     wasm-function[731]:0xe2200
     wasm-function[842]:0xea360
     wasm-function[301]:0x9eac0
     ```
     Note frame 4 is in OUR module — so the shim calls something
     that returns null and the engine then calls through it.
   - c91698be produces NO such trap, so the gate is reachable only
     via our shim's incomplete table.
   - Tools on hand: `/tmp/wabt-1.0.42/bin/wasm-objdump`,
     `/tmp/wabt-1.0.42/bin/wasm2wat`, `/home/kyle/emsdk`.

2. **Match c91698be's cvar baseline exactly.** It registers
   `teamplay 0`, `public 0`, `sv_lan 0`, `fps_max 100`, plus
   `sv_gravity 800`, `maxplayers 1`, `hostname "Half-Life"`,
   `deathmatch 0`. Our shim registers a different set with
   different defaults. Register c91698be's set verbatim first, then
   layer TS cvars on top. Cheapest experiment on the list.

3. **JS-side server simulator.** Stop relying on the engine's
   listen flow. `globalThis.__ctsBridge` becomes the authoritative
   game server; state lives in JS; engine sync happens via
   `Cmd_ExecuteString`. This is the path Kyle pushed earlier, and
   the harder the engine gate proves, the more compelling it is.

### FOLLOW-UP BACKLOG (log first, do later — do not lose these)

| # | Item | Why it matters | Status |
|---|------|----------------|--------|
| F1 | `build-ts-dll.sh` has no import-count gate | it deployed a 283-import broken WASM over the live build mid-session (D.7.38). Add `if imports > 60: refuse to deploy`. | TODO |
| F2 | Restore v2/v3 shim to primary `hl_emscripten_wasm32.wasm` once the gate is cracked | c91698be is currently primary; v3 lives at `shim/build/ts_shim_v3*.wasm` | blocked on #1 |
| F3 | Wire `installCTSBridge()` into `xash-loader.ts` before engine boot | `ts-bridge.ts` exists but nothing calls it yet | TODO |
| F4 | `ts-bridge.ts` targets `Module.ctsBridge`; shim v3 targets `globalThis.__ctsBridge` | MISMATCH — must reconcile before F3, or every handler silently no-ops | TODO — **easy trap** |
| F5 | Re-enable `ts_ServerActivate` entity creation | disabled behind `v3-disable-marker` while diagnosing the null trap; restore with proper string alloc | blocked on #1 |
| F6 | `pfnAddToFullPack` + delta | even with entities created, nothing reaches the client. Needed for T5 (bots). | TODO |
| F7 | `pfnGetWeaponData` | needed for T4 combat parity | TODO |
| F8 | Expand precache list to all 476 `.mdl` | each entry is another TS model the engine can render (T7) | TODO |
| F9 | `Reload` felt unbound to Kyle | `R` → `+reload` is mapped in the keyboard bridge, but vanilla HL1 only reloads clip-fed weapons | verify with a clip gun |
| F10 | All 60 TS `.bsp` maps loadable from the launcher | T8; currently only ts_apartments confirmed | TODO |

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
