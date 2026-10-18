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
import { g_engfuncs } from "./engine";
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
