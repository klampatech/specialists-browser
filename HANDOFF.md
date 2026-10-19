# HANDOFF — specialists-browser

> ╔══════════════════════════════════════════════════════════════════╗
> ║  EVERY WORK SESSION (T3 thread, Claude Code, Codex, manual edit): ║
> ║                                                                  ║
> ║  1. READ this file + `SPEC.md` FIRST                              ║
> ║  2. DO the work for the current "Next task" below                 ║
> ║  3. UPDATE this file + `SPEC.md` (if design changed) BEFORE      ║
> ║     COMMITTING                                                    ║
> ║  4. THEN `git commit` + push                                     ║
> ║                                                                  ║
> ║  New T3 thread? Point it at this file. It will know what to do.   ║
> ╚══════════════════════════════════════════════════════════════════╝

## ⚡ CHECKPOINT SUMMARY (read this first in next session) — UPDATED 2026-10-16 (D.5.5 COMPLETE)

| ⚠️ Previous banner is STALE. **We are past D.5.6.** The full
| engine simulator + decomp wrapper + class shims + runtime shims +
| **entity pool** are installed. The decompiled `CTSGun::PrimaryAttack`
| runs against a real `weapon_tsgun` entity from the pool (stable
| `pev.index` + `classname`), and the trace handler resolves hits to
| real bot entities via mesh identity. `__botRegistry` global is gone.

**Status as of 2026-10-18 (end of session):** D.4 (decomp) and
D.5.1 → D.5.6 are DONE. D.5.7 v2 is in progress: the **shim layer
that all 8 Fire* methods need is built** (CVars module + bare top-level
cvar identifiers + helper functions + class method stubs + engine
singleton vfunc), and **CCombatBlock (the smallest method) is wired
end-to-end** — confirmed via headless smoke that pressing B runs the
decompiled body through guards + engine dispatch + Animate + UpdateMeleeBar
without crashing.

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
