/**
 * D.5.5 — Decomp integration bridge.
 *
 * This module connects the decompiled TS code (in
 * `tools/decompile/output/*.ts`) to the Babylon game loop. It:
 *   1. Provides a CTSGun stub with the methods the decompiled
 *      PrimaryAttack / Reload / WeaponIdle / Spawn call.
 *   2. Calls the decompiled methods when the user fires.
 *   3. Routes the decompiled methods' engine calls (g_engfuncs,
 *      gpGlobals, etc.) through our engine simulator (engine.ts).
 *
 * This is the FIRST END-TO-END SLICE that runs real decompiled code.
 * The behavior is incomplete (CTSGun has stubs, not real class
 * methods) but the call chain is:
 *   Babylon click → Pistol.fire() → decomp.tryDecompFire()
 *     → PrimaryAttack() (decompiled)
 *       → this.CCombatAttack() / Fire() / etc. (stubs)
 *         → g_engfuncs.pfnEmitSound() (engine simulator)
 *         → g_engfuncs.pfnPlaybackEvent() (engine simulator)
 *         → g_engfuncs.pfnMessageBegin/End/Write* (engine simulator)
 *
 * Open the browser console to see the engine simulator log lines.
 */

import { Vector3 } from "./types";
import { g_engfuncs, gpGlobals, MAKE_STRING } from "./engine";
import {
  CTSGun__PrimaryAttack as PrimaryAttack,
  CTSGun__Reload as Reload,
  CTSGun__WeaponIdle as WeaponIdle,
  CTSGun__Spawn as Spawn,
  CTSGameRules__GlobalSlowMotion2 as GlobalSlowMotion2,
  CTSAmmoPack__WaitThink as CTSAmmoPackWaitThink,
  CBasePlayer__SlowMotionFlow as SlowMotionFlow,
} from "./decomp";

// ───────────────────────────────────────────────────────────────
// Runtime shims for `declare const X` / `declare function X` that
// the decompiled files reference. These are visible to TypeScript
// (via decomp-shims.ts) but are not in JS runtime scope. Install
// the runtime versions on globalThis so the decompiled code can
// call them.
// ───────────────────────────────────────────────────────────────

interface RuntimeShims {
  // CTSGun::Spawn declared locals
  MAKE_STRING_FROM_PTR: (s: string) => number;

  // CTSGameRules::GlobalSlowMotion2 declared locals
  engineTime: number;
  maxPlayers: number;
  slowAmtThreshold: number;
  cvarDelta: number;
  className_0x696dc: string;
  className_0x6e62b: string;
  className_0x6b6c5: string;

  // CTSGun::WeaponIdle / Reload declared locals
  TS_IDLE_RANDOM_INTERVAL: number;
  InfiniteClips: (pPlayer: any) => number;
  DoubleFireRate: (pPlayer: any) => number;

  // TS-specific helpers
  GiveCash: (player: any, amount: number) => void;
  UpdateTeamScores: (player: any) => void;
  TSGetPointsForFrag: (attacker: any, victim: any) => number;

  // TraceResult class for `new TraceResult()`
  TraceResult: new () => any;
}

let _shimsInstalled = false;

function installRuntimeShims(): void {
  if (_shimsInstalled) return;
  const g = globalThis as any;

  g.MAKE_STRING_FROM_PTR = (s: string) => MAKE_STRING(s);
  g.engineTime = () => gpGlobals.time;
  // Make engineTime callable both as fn and as value (some decomp code does `engineTime + x`)
  // Actually for simplicity, store as number; the decomp code uses it as a value
  g.engineTime = gpGlobals.time;
  g.maxPlayers = gpGlobals.maxClients;
  g.slowAmtThreshold = 1.0; // cvar at [ebx-0x6f408]
  g.cvarDelta = 0.5;        // cvar at [ebx-0x6f010]
  g.className_0x696dc = "func_slowmo";
  g.className_0x6e62b = "func_slowmo_point";
  g.className_0x6b6c5 = "info_target";
  g.TS_IDLE_RANDOM_INTERVAL = 5;
  g.InfiniteClips = (pPlayer: any) => 0;       // off → no infinite clips
  g.DoubleFireRate = (pPlayer: any) => 0;       // off → normal fire rate

  g.GiveCash = (player: any, amount: number) => { /* noop */ };
  g.UpdateTeamScores = (player: any) => { /* noop */ };
  g.TSGetPointsForFrag = (attacker: any, victim: any) => 1;

  g.TraceResult = class { /* stub class for `new TraceResult()` */ };

  // Common engine utility stubs (already declared in decomp-shims.ts)
  g.UTIL_PlayerByIndex = (i: number) => null;
  g.UTIL_FindEntityByClassname = (prev: any, className: string) => null;
  g.UTIL_Remove = (ent: any) => { /* noop */ };
  g.UTIL_TraceLine = (start: any, end: any, flags: number, ignore: any) => ({
    flFraction: 1.0,
    ent: null,
    pHit: null,
    vecEndPos: end,
    vecPlaneNormal: { x: 0, y: 0, z: 0 },
  });
  g.UTIL_VecToAngles = (v: any) => ({ pitch: 0, yaw: 0, roll: 0 });
  g.MESSAGE_BEGIN = (msgType: number, msgId: number, origin?: any, client?: any) => { /* noop */ };
  g.MESSAGE_END = () => { /* noop */ };
  g.WRITE_BYTE = (b: number) => { /* noop */ };
  g.WRITE_SHORT = (s: number) => { /* noop */ };
  g.WRITE_LONG = (l: number) => { /* noop */ };
  g.WRITE_STRING = (s: string) => { /* noop */ };
  g.WRITE_FLOAT = (f: number) => { /* noop */ };
  g.WRITE_ANGLE = (f: number) => { /* noop */ };
  g.WRITE_COORD = (f: number) => { /* noop */ };
  g.EMIT_SOUND = (ent: any, channel: number, sample: string, vol: number, attn: number) => { /* noop */ };
  g.EMIT_SOUND_DYN = (ent: any, channel: number, sample: string, vol: number, attn: number, flags: number, pitch: number) => { /* noop */ };
  g.PLAYBACK_EVENT = (...args: any[]) => { /* noop */ };
  g.SET_MODEL = (ent: any, model: string) => { /* noop */ };
  g.ALERT = (level: number, msg: string) => { console.log(`[ALERT ${level}] ${msg}`); };
  g.SUB_UseTargets = (pEntity: any, pActivator: any, useType: number, value: number) => { /* noop */ };
  g.TraceAttack = (victim: any, attacker: any, damage: number, dir: any, trace: any, dmgBits: number) => { /* noop */ };
  g.ClearMultiDamage = () => { /* noop */ };
  g.ApplyMultiDamage = (inflictor: any, attacker: any) => { /* noop */ };
  g.FireTargets = (target: string, activator: any, caller: any, useType: number, value: number) => { /* noop */ };
  g.CREATE_NAMED_ENTITY = (classname: string) => null;
  g.GetClassPtr = (classname: string) => null;

  _shimsInstalled = true;
}

installRuntimeShims();

// ───────────────────────────────────────────────────────────────
// CTSGun stub — a class with all the methods referenced by the
// decompiled PrimaryAttack / Reload / WeaponIdle / Spawn.
// Methods are stubs that route through the engine simulator.
// ───────────────────────────────────────────────────────────────

/** Minimal stub for the "weapon info" struct the decomp reads. */
interface WeaponInfo {
  fireMode: number;
  burstResetFlag: number;
  accumulator: number;
  [k: string]: any;
}

/** Minimal stub for the player object the decomp reads. */
interface PlayerStub {
  weaponCategory: number;
  [k: string]: any;
}

/** Minimal stub for the "owner" object the decomp reads. */
interface OwnerStub {
  flag0x814: number;
  innerPointer: any;
  [k: string]: any;
}

/**
 * CTSGun stub. The decompiled methods take `this: CTSGun` and access
 * fields. This stub provides the methods the decomp calls (Fire,
 * GrenadeFire, KnifeFire, etc.) and routes everything through the
 * engine simulator.
 */
class CTSGunStub {
  // Fields the decompiled methods read
  m_pWeaponInfo: WeaponInfo | null = null;
  m_pPlayer: PlayerStub = { weaponCategory: 0 };
  m_pOwner: OwnerStub = { flag0x814: 0, innerPointer: { flag0x180: 0 } };
  m_iSomeInt: number = 0;
  m_pActiveItem: any = null;
  /** Dispatch table for virtual calls — populated with no-ops so the
   *  decompiled Spawn() can call methods via table[0x28 / 4](this). */
  [0x60]: { [k: number]: (self: any) => void } = {
    10: (_self: any) => { /* would be Precache() */ },
  };
  /** Numeric offset fields the decompiled Spawn() sets. */
  [0x88]: number = 0;
  [0xb4]: number = 0;
  [0xc4]: number = 0;
  [0xc8]: number = 0;
  [0x9e4]: number = 0;
  [0x9e8]: number = 0;
  pev: any = {
    classname: "weapon_tsgun",
    index: 0,
    origin: { x: 0, y: 0, z: 0 },
    angles: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
  };

  // Stub methods called by PrimaryAttack
  CCombatAttack(): void {
    g_engfuncs.pfnEmitSound(this.pev, 1, "weapons/melee_swing.wav", 1.0, 1.0, 0, 100);
  }

  CCombatBlock(): void {
    g_engfuncs.pfnEmitSound(this.pev, 1, "weapons/melee_block.wav", 1.0, 1.0, 0, 100);
  }

  GrenadeFire(): void {
    g_engfuncs.pfnEmitSound(this.pev, 1, "weapons/glauncher.wav", 1.0, 1.0, 0, 100);
  }

  KnifeFire(): void {
    g_engfuncs.pfnEmitSound(this.pev, 1, "weapons/knife_slash.wav", 1.0, 1.0, 0, 100);
  }

  KatanaFire(): void {
    g_engfuncs.pfnEmitSound(this.pev, 1, "weapons/katana_swing.wav", 1.0, 1.0, 0, 100);
  }

  /** Fire — called for standard firearms in PrimaryAttack. */
  Fire(): void {
    // Play a sound
    g_engfuncs.pfnEmitSound(
      this.pev,        // ent
      1,               // CHAN_WEAPON
      "weapons/tsgun_fire.wav",
      1.0,             // volume
      0.8,             // attenuation
      0,               // flags
      100,             // pitch
    );
    // Muzzle flash
    g_engfuncs.pfnPlaybackEvent(
      0,                                 // flags
      0,                                 // event index
      0.0,                               // delay
      this.pev.origin,                   // origin
      { x: 0, y: 0, z: 0 },              // angles
      0.0, 0.0,                         // fparam1, fparam2
      0, 0,                              // iparam1, iparam2
      0, 0,                              // bparam1, bparam2
      this.pev,                          // ent
    );
  }

  // Methods called by Reload
  Reload(): void {
    console.log("[CTSGun::Reload] called");
  }

  // Methods called by WeaponIdle
  WeaponIdle(): void {
    console.log("[CTSGun::WeaponIdle] called");
  }

  // Methods called by Spawn
  Reset(): void {
    console.log("[CTSGun::Reset] called");
  }

  Precache(): void {
    g_engfuncs.pfnPrecacheModel("models/w_glock18.mdl");
    g_engfuncs.pfnPrecacheSound("weapons/tsgun_fire.wav");
  }

  FallInit(): void {
    g_engfuncs.pfnSetOrigin(this.pev, this.pev.origin);
  }
}

// ───────────────────────────────────────────────────────────────
// Bridge functions called from Babylon's main.ts
// ───────────────────────────────────────────────────────────────

/**
 * Demo: call the decompiled PrimaryAttack() function with a stub.
 * The decompiled method will call g_engfuncs.pfnEmitSound, etc.,
 * which the engine simulator logs.
 *
 * This is the first end-to-end test that real decompiled code
 * is being executed by the game loop.
 */
export function tryDecompFire(
  weaponCategory: number = 0,
  fireMode: number = 1,
): { ok: boolean; error?: string } {
  const gun = new CTSGunStub();
  gun.m_pPlayer = { weaponCategory };
  gun.m_pWeaponInfo = {
    fireMode,
    burstResetFlag: 0,
    accumulator: 0,
  };
  gun.m_pOwner = { flag0x814: 1, innerPointer: { flag0x180: 1 } };

  try {
    // Call the DECOMPILED function
    PrimaryAttack.call(gun);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Demo: call the decompiled Reload() function.
 */
export function tryDecompReload(): { ok: boolean; error?: string } {
  const gun = new CTSGunStub();
  try {
    Reload.call(gun);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Demo: call the decompiled WeaponIdle() function.
 */
export function tryDecompWeaponIdle(): { ok: boolean; error?: string } {
  const gun = new CTSGunStub();
  try {
    WeaponIdle.call(gun);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Demo: call the decompiled Spawn() function.
 */
export function tryDecompSpawn(): { ok: boolean; error?: string } {
  const gun = new CTSGunStub();
  try {
    Spawn.call(gun);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Demo: call the decompiled GlobalSlowMotion2() function.
 */
export function tryDecompSlowMotion(slowAmount: number, resetFlag: boolean): { ok: boolean; error?: string } {
  const gameRules = { accumulator_0x56c: 0 };
  try {
    GlobalSlowMotion2.call(gameRules, slowAmount, resetFlag);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Demo: call the decompiled SlowMotionFlow() function.
 */
export function tryDecompSlowMotionFlow(player: any): { ok: boolean; error?: string } {
  try {
    SlowMotionFlow.call(player);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Demo: call the decompiled CTSAmmoPackWaitThink() function.
 */
export function tryDecompAmmoPackWaitThink(ammoPack: any): { ok: boolean; error?: string } {
  try {
    CTSAmmoPackWaitThink.call(ammoPack);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
