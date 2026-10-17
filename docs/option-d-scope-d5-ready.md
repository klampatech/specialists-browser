# D.5 Ready — Babylon.js Integration Spec

> **Status:** 2026-10-16/17 — D.4.8 + D.4.9 + D.5.1 Stage 1 complete.
> **This doc defines what "ready to begin building in Babylon for the
> full game" means.** All 365 methods of `ts_i386.so` are decompiled
> (or stubbed for v1) and consolidated into `src/mod/<class>.ts` files.
> (Note: the original 281 figure was a raw T-type line count; the
> true unique `(cls, method)` count after deduplication of vtable
> thunks is **365**. Both numbers are correct in different contexts —
> "281" = number of distinct T-type entries, "365" = number of
> distinct method implementations.)

## TL;DR

After D.4 finishes, `src/mod/` will contain all gameplay logic as
TypeScript modules. D.5 wires those into a Babylon.js scene:

- One TypeScript module per source class, with a doc-comment field
  map and consistent type contracts
- A Babylon.js scene with: WebGL2 renderer, UniversalCamera with
  PointerLock, `ts_heresy.bsp` converted to glTF (one-time), the
  pistol viewmodel, basic bot AI (since the .so has 0 bot methods,
  bots come from a stub for v1), HUD overlay
- A small adapter layer (`src/bridge/`) that translates the
  Babylon.js scene state into the decompiled class functions'
  inputs (entvars_t pointers, etc.) and converts the decompiled
  output back into Babylon.js actions (set entity position, apply
  damage, render muzzle flash, etc.)

**Phase 1 MVP exit criterion:** Kyle opens the URL, loads HL1 + TS
assets, spawns at TS player spawn point on ts_heresy, walks around,
fires pistol, kills the bot, takes screenshot. **All from a single
`pnpm dev` (or `bun run dev`).**

## What "100% decompiled" means concretely

All 365 methods of `ts_i386.so` (T-type) decompiled. Per-class target:

```
src/
├── mod/
│   ├── interface.ts          # 4 entry points           (4/4 done)
│   ├── slowmo.ts             # CTSSlowMotion             (11/11 done)
│   ├── slowmo-point.ts       # CTSSlowMotionPoint        (5/5 done)
│   ├── weapons.ts            # CTSGun base + Fire*       (23/33 done)
│   ├── weapons-akimbo.ts     # CTSGuni (dual pistol)     (0/? to do)
│   ├── weapons-uzi.ts        # CTSGunUci                 (0/? to do)
│   ├── weapons-shotgun.ts    # CTSGunShotgun             (0/? to do)
│   ├── weapons-mg.ts         # CTSGunMG                  (0/? to do)
│   ├── weapons-sniper.ts     # CTSGunSniper              (0/? to do)
│   ├── weapon-knife.ts       # CTSKnife (throwing)       (0/8 to do)
│   ├── weapon-grenade.ts     # CTSGrenade                (0/? to do)
│   ├── weapon-smg-ammo.ts    # CTSSMGAmmo                 (0/? to do)
│   ├── scoring.ts            # CHalfLifeMultiplay + CTSGameRules  (2/? done — 29 more game rules methods)
│   ├── gamerules.ts          # CTSGameRules full         (0/29 to do — beyond TeamWin)
│   ├── animation.ts          # CTSAnimation              (0/11 to do)
│   ├── stunt.ts              # CTSStunt (acrobatics)     (0/16 to do)
│   ├── player.ts             # CBasePlayer::SlowMotionFlow (0/2 to do)
│   ├── flags.ts              # CTSFlag (CTF mode)        (0/10 to do)
│   ├── objectives.ts         # CTSBriefcase, CTSBomb, CTSHack, CTSObjective, CTSObjectiveManager, CTSTeamEscape, CTSDMHill, CTSWinGiver  (0/35 to do)
│   ├── world-guns.ts         # CTSWorldGun, CTSGroundWeapon, CTSGroundAmmo, CTSSellZone, CTSAmmoPack  (0/29 to do)
│   ├── powerups.ts           # CTSPowerUp                (0/8 to do)
│   ├── shared.ts             # CTSSharedEmitter, CTSParticle, CTSEmitter, CTSTrigger, CTSTimer, CTSCustomTarget, CTSMapGlobals, CTSPhysicObject, CTSObjectivePointer  (0/30 to do)
│   ├── shrapnel.ts           # CTSShrapnel               (0/4 to do)
│   ├── player-amount.ts      # CTSPlayerAmount           (0/3 to do)
│   ├── wind.ts               # CTSWind                   (0/? to do)
│   └── mod.ts                # barrel: re-exports + helpers
└── bridge/
    ├── engine.ts             # Babylon.js scene driver
    ├── entity.ts             # CBaseEntity / entvars_t adapter
    ├── player.ts             # CBasePlayer adapter (move, view, weapon switch)
    ├── weapon.ts             # weapon-view + weapon-event glue
    ├── damage.ts             # HP, fall damage, weapons damage → scene
    ├── scoring.ts            # score, cash, slowmo trigger → scene
    ├── hud.ts                # HTML overlay (HP, ammo, crosshair, scores)
    ├── bots.ts               # STUB bot AI (TS has none — implement basic)
    └── observe.ts            # spawn/death cam stubs
```

**v1 may stub classes that aren't game-critical:**

- vfx.ts (CTSSharedEmitter, etc.) — stub for v1, fill in v2
- shared.ts utility classes — most can be stub if not load-bearing
- shrapnel.ts, wind.ts — stub for v1
- weapon-grenade.ts, weapons-sniper.ts, weapons-shotgun.ts, weapons-mg.ts — keep just the Fire dispatch (already done in CTSGun)

The truly critical path:

```
interface.ts + slowmo.ts + slowmo-point.ts + weapons.ts (done)
+ gamerules.ts (new) + scoring.ts (extend) + animation.ts (new) + stunt.ts (new) + player.ts (new)
+ world-guns.ts (new) + flags.ts (new) + objectives.ts (new) + powerups.ts (new)
+ bridge/{engine, entity, player, weapon, damage, scoring, hud, bots}.ts
= minimum Phase 1 MVP (Kyle plays, pistols, kills 1 stub bot)
```

That's roughly **365 methods** to decompile before D.5 can start.
(Phase 1 MVP-critical, not "100%".)

**"Full game" requires all 365** minus lower-priority stubs.

## D.5 architecture

### Type contracts between `src/mod/` and `src/bridge/`

The decompiled TypeScript functions take `entvars_t*` / `CBaseEntity*`
parameters. Those are Pointer-like abstractions in the original C++.
In D.5 we define the TS analogues:

```typescript
// src/mod/types.ts
export type EntityPtr = number;        // index into entityPool
export type Entvars = {
  index: number;                       // entity index
  origin: Vector3;
  angles: Vector3;
  velocity: Vector3;
  model: string;                       // .mdl path
  health: number;
  armor: number;
  teamId: number;
  // ... ~80 fields from entvars_t in HLSDK
};
export type CBaseEntity = {
  pev: Entvars;                        // at offset 0
  // Class vtable (offsets vary per class)
};
```

The bridge layer (`src/bridge/entity.ts`) maintains a `Map<EntityPtr,
CBaseEntity>` and provides:

```typescript
export function getEntityByIndex(i: number): CBaseEntity | null;
export function createEntity(className: string): EntityPtr;
export function removeEntity(ptr: EntityPtr): void;
export function forEachEntity(callback: (e: CBaseEntity) => void): void;
```

The decompiled functions (in `src/mod/*.ts`) call these. For example,
`PlayerKilled(this: CHalfLifeMultiplay, ...) → { ... }` becomes:

```typescript
// src/mod/scoring.ts (already decompiled)
export function PlayerKilled(this: CHalfLifeMultiplay, victim: EntityPtr,
                              attacker: EntityPtr, ent: Entvars): void {
  // ... decompiled body references gpGlobals->time, etc.
}

// src/bridge/scoring.ts (D.5 wraps it for Babylon)
export function playerKilled(victim: EntityPtr, attacker: EntityPtr): void {
  const vr = getEntityByIndex(victim);
  const ar = getEntityByIndex(attacker);
  PlayerKilled.call(globalGameRules, victim, attacker, vr.pev);
  // Then update HUD, broadcast to clients, etc.
}
```

### Babylon.js scene

```
src/bridge/engine.ts:
  - createScene(canvas, audioCtx)
  - loadMap(gltfUrl)         → Babylon scene + physics world
  - createPlayer(spawnPos)   → UniversalCamera with PointerLock
  - createBot(spawnPos, ai)  → animated mesh + CharacterController
  - onTick(deltaMs)          → call into decompiled TS to step the world
  - dispose()
```

```
src/bridge/entity.ts:
  - entityPool: Map<EntityPtr, CBaseEntity>
  - syncEntities(sceneMeshes)
  - applyDamage(target: EntityPtr, hp: number, source: EntityPtr)
  - getPlayerView(): { pos: Vector3, angles: Vector3 }
  - getPlayerWeapon(): string
```

### Listener architecture

For Phase 1 MVP, we don't need a separate web worker for the mod
(the original TS is single-threaded C++; in TS land, everything
runs on the main thread). Phase 3 (multiplayer) is when the
decompiled TS moves into a Web Worker.

## D.5 sub-steps (in dependency order)

1. **5.1 Project scaffolding** — `pnpm add babylonjs babylonjs-loaders`
   (or `bun add`), wire into vite, set up the canvas + scene.
2. **5.2 Map conversion** — `tools/convert-bsp.ts` reads `ts_heresy.bsp`,
   parses the GoldSrc BSP (decompression, planes, textures), writes
   out `ts_heresy.glb`. Use `bspc` (Quake bsp compiler) as reference
   or write a thin wrapper around `quake3-bsp-loader`.
3. **5.3 Asset loader** — load `.mdl` files (convert to glTF via
   `tools/convert-mdl.ts`) for the pistol viewmodel + player model.
4. **5.4 Player controller** — UniversalCamera + PointerLock +
   WASD movement + jump. Use Babylon's `CharacterController` if
   using Havok; manual integration otherwise.
5. **5.5 Type contracts** — `src/mod/types.ts` + `src/mod/mod.ts`
   barrel + `tsc --noEmit` to find type errors in the decompiled
   TS. Fix cross-method inconsistencies (different field names for
   same offset, etc.). This is where D.4.11 "consolidation" lands.
6. **5.6 Bridge: entity pool** — `src/bridge/entity.ts`, the
   `entityPool` Map and helpers.
7. **5.7 Bridge: weapon system** — `src/bridge/weapon.ts`, glue
   between input, scene state, and the decompiled `weapons.ts`.
8. **5.8 Bridge: damage + scoring + slowmo** — same pattern for
   `scoring.ts` + `slowmo.ts` + `slowmo-point.ts`.
9. **5.9 Bridge: bot AI (STUB for v1)** — TS .so has 0 bot methods.
   Must implement a basic bot that uses the decompiled
   `PrimaryAttack` / `WeaponIdle` / `Move` methods. Bring back
   Botman's BotLib patterns OR write a simple state machine.
10. **5.10 HUD** — HTML overlay (HP, ammo, crosshair, scores).
    Driven by decompiled `UpdateClientData`, `RestartRound`,
    `TeamWin`, `PlayerKilled`.
11. **5.11 Tier-3 smoke** — Kyle plays, screenshots, commits.

**Exit:** Kyle plays. Screenshots in `docs/cheats/phase-1-smoke/`.

## Honest timeline

- D.5.1-5.4 (project + map + assets + player): ~1-2 weeks
- D.5.5 (type contracts consolidation): ~3-5 days (this is where
  bugs in the decompiled TS surface)
- D.5.6-5.8 (bridge glue): ~1-2 weeks
- D.5.9 (bot AI): ~1-2 weeks
- D.5.10-5.11 (HUD + smoke): ~3-5 days

**Total Phase 1 MVP: 4-7 weeks** of D.5 work after D.4 finishes.

**Phase 2 (TS-specific features): 6-10 weeks.** All the acrobatics,
slowmo, dual-wield, etc. land here. They're decompiled in D.4 but
need Babylon.js integration for movement, animation blending,
weapon viewmodels, etc.

**Phase 3 (multiplayer): 6-10 weeks.** WebRTC datachannel between
browser tabs. Server in Web Worker, client on main thread.

## What "ready to begin building in Babylon" means

In Kyle's words: "ready to begin building in Babylon for the full game."

This is **achieved when**:

1. All 365 methods of `ts_i386.so` are decompiled (or explicitly
   stubbed for v1 with a `// STUB for v1` comment + reason).
2. `src/mod/<class>.ts` exists per class with a doc-comment field
   map and consistent type contracts across methods.
3. `tsc --noEmit` passes with no errors against `src/mod/types.ts`.
4. A `src/bridge/engine.ts` skeleton exists that imports the
   decompiled TS and stubs the Babylon.js calls.
5. The dev server boots and renders an empty Babylon canvas
   (`pnpm dev` / `bun run dev` → `https://localhost:5174/scenes/test`).

**This is 100% D.5-ready.** Then D.5 sub-steps 5.1-5.4 land the
3D scene, and 5.5-5.11 land the gameplay wiring.

## What we explicitly defer (for v2/v3)

- **Bot AI quality** — v1 is a stub state machine. v2 brings in
  Botman's BotLib pattern (long-term).
- **All objective modes** — v1 has DM only. v2 adds CTF, briefcase,
  bomb, hack, VIP, KOTH (all already decompiled).
- **Custom HUD** — v1 uses HTML overlay (simple). v2 uses Babylon
  GUI (matches better).
- **Multiplayer** — deferred to Phase 3.
- **All 11 TS-specific weapons** — v1 has the pistol. v2 adds
  shotgun, SMG, sniper, katana, throwing knives, etc.
- **Mod sharing** — TS has many mods (acrobaz, realism, etc.).
  v2 framework lets you load different decompiled `.so` files.

## Cross-references

- `HANDOFF.md` — current state + next task
- `SPEC.md` — overall design spec (updated to reflect 365-method scope)
- `docs/option-d-scope.md` — Option D plan with 281-method scope
- `references/` — workflow docs
- `tools/decompile/batch.py` — the decomp pipeline
- `progress/decomp-log.md` — per-method status
