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
import { getGlobalPool, EntityPool } from "./entity-pool";
import {
  CTSGun__PrimaryAttack as PrimaryAttack,
  CTSGun__Reload as Reload,
  CTSGun__WeaponIdle as WeaponIdle,
  CTSGun__Spawn as Spawn,
  CTSGun__CCombatBlock as CCombatBlockImpl,
  CTSGun__CCombatAttack as CCombatAttackImpl,
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
  g.TraceAttack = (victim: any, attacker: any, damage: number, dir: any, trace: any, dmgBits: number) => {
    // Look for a bot on the hit target — the decomp's "hit" is the
    // { mesh } object we set in main.ts. The bot meshes are named
    // "bot_<id>_body" so we can find the bot via the entity pool.
    const mesh = victim?.mesh;
    if (mesh) {
      // D.5.6: walk the global entity pool to find the bot whose
      // mesh matches. This replaces the old __botRegistry global.
      const pool = getGlobalPool();
      for (const ent of pool.entities.values()) {
        const entAny = ent as any;
        if (entAny.mesh === mesh || entAny.mesh?.body === mesh) {
          if (typeof entAny.damage === "function") {
            entAny.damage(damage);
          }
          return;
        }
      }
    }
  };
  g.ClearMultiDamage = () => { /* noop */ };
  g.ApplyMultiDamage = (inflictor: any, attacker: any) => { /* noop */ };
  g.FireTargets = (target: string, activator: any, caller: any, useType: number, value: number) => { /* noop */ };
  g.CREATE_NAMED_ENTITY = (classname: string) => null;
  g.GetClassPtr = (classname: string) => null;

  // ─────────────────────────────────────────────────────────────
  // D.5.7 v2 — Runtime shims for the decompiled Fire* methods.
  //
  // These are called by decompiled bodies like CTSGun__CCombatBlock,
  // CTSGun__GrenadeFire, CTSGun__KnifeFire, CTSGun__KatanaFire etc.
  // Most of them log + return a default value; the visible game
  // still routes through the engine simulator's handler system for
  // real Babylon side-effects (sound, raycast, etc.).
  // ─────────────────────────────────────────────────────────────
  g.UTIL_WeaponTimeBase = () => gpGlobals.time;
  g.UTIL_MakeVectors = (vec: any) => { /* TODO: populate gpGlobals.v_forward/v_right/v_up */ };
  g.UTIL_VecToAngles = (vec: any, out?: any) => out ?? { pitch: 0, yaw: 0, roll: 0 };
  g.UTIL_TraceHull = (start: any, end: any, flags: number, hullNum: number, ignoreEnt: any) => ({
    flFraction: 1.0, ent: null, pHit: null, vecEndPos: end,
    vecPlaneNormal: { x: 0, y: 0, z: 0 },
  });
  g.UTIL_FindEntityByClassname = (prev: any, className: string) => null;
  g.UTIL_FindEntityInSphere = (start: any, radius: number) => null;
  g.UTIL_FindEntityByString = (start: any, field: string, value: string) => null;
  g.UTIL_GetAimVectors = (vec: any) => { /* TODO */ };
  g.RANDOM_LONG = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  g.RANDOM_FLOAT = (min: number, max: number) => Math.random() * (max - min) + min;
  g.MESSAGE_WRITE_BYTE = (b: number) => { /* noop — engine simulator handles writes via WRITE_* shims above */ };
  g.MESSAGE_WRITE_SHORT = (s: number) => { /* noop */ };
  g.MESSAGE_WRITE_LONG = (l: number) => { /* noop */ };
  g.MESSAGE_WRITE_STRING = (s: string) => { /* noop */ };

  // Engine singleton vfunc (TS-specific; not the standard pfnPlaybackEvent).
  // The decompiled CCombatBlock calls vfunc_0x1ec with 12 dword args
  // (playback event with event index + flots + ints + bytes). The
  // closest engine equivalent is pfnPlaybackEvent, so route there.
  g.engineSingleton = {
    vfunc_0x1ec: (
      flags: number, who: any, eventIndex: number, delay: number,
      origin1: any, origin2: any, fparam1: number, fparam2: number,
      iparam1: number, iparam2: number, bparam1: number, bparam2: number,
    ) => {
      g_engfuncs.pfnPlaybackEvent(
        flags, eventIndex, delay, origin1, origin2 ?? origin1,
        fparam1, fparam2, iparam1, iparam2, bparam1, bparam2, who,
      );
    },
  };
  g.global_eventIndex = 0;

  // CCombatBlock helpers
  g.Animate = (thisPtr: any, player: any, sequence: number) => {
    // In the original TS mod, this dispatches a view-model animation
    // sequence. In our v1 we just log the call.
    console.log(`[CTSGun::Animate] player=${player?.classname ?? "?"} seq=${sequence}`);
  };
  g.UpdateMeleeBar = (player: any, value: number) => {
    // The TS mod shows a melee-charge HUD bar. In v1 we just log.
    console.log(`[HUD] UpdateMeleeBar(player, ${value})`);
  };
  g.GetMeleeMultiplier = (_player: any) => 1.0;
  g.SetPlayerSpeed = (player: any, speed: number) => { /* TODO: per-player max speed */ };
  g.GetSpeedBySlots = (_player: any) => 1.0;
  g.KungFu = (_player: any) => false;
  g.CloseCombatAttack = (..._args: any[]) => true;
  g.BlockPlayer = (_player: any, _kd: number) => { /* noop */ };
  g.W_FireBullets = (..._args: any[]) => { /* noop */ };
  g.player_GetAutoaimVector = (_player: any, _scale: number) => ({ x: 0, y: 0, z: 1 });
  g.ColdCockAttack = (..._args: any[]) => 0;
  g.FindUseTarget = (_player: any) => null;
  g.ApplyTraceBleed = (..._args: any[]) => 0;
  g.VictimKnifeHold = (_player: any, _victim: any, _dmg: number) => false;
  g.VictimKatanaHold = (_player: any, _victim: any, _dmg: number) => false;
  g.DropWeapon = (..._args: any[]) => { /* noop */ };
  g.Recoil = (..._args: any[]) => { /* noop */ };
  g.StopReload = () => { /* noop */ };
  g.Unzoom = () => { /* noop */ };
  g.GrenadeIdle = (_forceState: number) => { /* noop */ };
  g.ScaleSpread = (..._args: any[]) => { /* TODO */ };
  g.VKickback = (..._args: any[]) => { /* noop */ };
  g.GetClassPtr = (classname: string) => null;
  g.IndexEnt = (idx: number) => {
    // Look up an entity by index in the global pool. Used by INDEXENT
    // macro equivalents in the decompiled code.
    return getGlobalPool().get(idx);
  };
  g.SUB_Remove = (ent: any) => {
    if (ent?.pev?.index !== undefined) getGlobalPool().remove(ent.pev.index);
  };
  // CTSKnife.CreateKnife — would spawn a thrown knife projectile.
  // v1 has no projectile system; return null so callers can no-op.
  g.CTSKnife_CreateKnife = (..._args: any[]) => null;
  // CTSAnimation.Animate — top-level animation dispatcher.
  g.CTSAnimation_Animate = (player: any, sequence: number, mode?: number) => {
    console.log(`[CTSAnimation::Animate] player=${player?.classname ?? "?"} seq=${sequence} mode=${mode ?? 0}`);
  };
  // get_weapon_info(weaponType) — returns the weapon info struct.
  // In v1 we return a minimal stub; production would read from the
  // CVars module's cached s_weapon_info[] array.
  g.get_weapon_info = (weaponType: number) => {
    return {
      [0x10]: 1,    // alive flag
      ammoCount: 12,
      bulletDamage: 25,
      defaultDelay: 0.1,
      baseSpread: 0.0,
      spreadValue: 0.0,
      weaponByte: weaponType,
      tracerType: 0,
      kickbackMode: 0,
      kickbackAngle: 0,
      kickbackCount: 0,
      hasKickback: 0,
      clipIndex: 0,
      weaponType,
    };
  };

  // CVars module — TS-specific cvar statics. Values are placeholder
  // defaults; production would read from the TS engine cvar table.
  // Both forms are installed: the namespaced `CVars.X` for the
  // decompiled methods that read it that way (e.g. StandardFire),
  // and the bare top-level `cvar_X` names for the decompiled methods
  // that read them as free identifiers (e.g. CCombatBlock).
  g.CVars = {
    // CCombatBlock cvars (also bare-installed below)
    blockDuration: 1.0,
    blockStaminaThreshold: 0.0,
    blockIdleDelay: 0.1,
    // StandardFire cvars
    standardFire_initA: 0,
    standardFire_initB: 0,
    standardFire_initC: 0,
    m_vecRecoil: [0, 0, 0],
    m_vecRecoil_ref: [0, 0, 0],
    m_vecSpreadBase: [0, 0, 0],
    m_vecSpreadBase_ref: [0, 0, 0],
    m_vecSpreadCurrent: [0, 0, 0],
    m_vecSpreadCurrent_ref: [0, 0, 0],
    m_flBulletDamage: 25,
    m_flBulletDamage_ref: [0],
    m_bIsEmpty: 0,
    m_flNextPrimaryAttack_delay: 0.1,
    idle_delay_default: 5.0,
    idle_delay_alt: 1.0,
    sv_movespeed_threshold_0x12: 0,
    sv_movespeed_threshold_0x20: 0,
    spread_multiplier_0x20: 1.0,
    spread_modifier_crouching: 0.6,
    delay_cvar1: 0.1,
    delay_cvar2: 0.15,
    // ColdCock cvars
    coldCock_initA: 0,
    coldCock_initB: 0,
    coldCock_initC: 0,
    m_flColdCockDelay: 0.7,
    m_flDamageOrScale_0x7c5c: 0,
    m_flDamageOrScale_0x7c60: 0,
  };
  // Bare top-level cvars — read by decompiled CCombatBlock via
  // `const blockDuration = cvar_blockDuration;` (no namespace).
  // Without these, the decompiled method throws ReferenceError.
  g.cvar_blockDuration = 1.0;
  g.cvar_blockStaminaThreshold = 0.0;
  g.cvar_blockIdleDelay = 0.1;
  // CCombatAttack cvars (also bare-installed for the same reason)
  g.cvar_closeCombat_range = 100.0;
  g.cvar_closeCombat_main = 1.0;
  g.cvar_closeCombat_other = 1.0;
  g.cvar_closeCombat_max = 1.0;
  g.cvar_closeCombat_min = 0.0;
  g.cvar_closeCombat_damMul = 1.0;
  g.cvar_closeCombat_damMax = 100.0;
  g.cvar_closeCombat_lowMul = 0.5;
  g.cvar_closeCombat_lowMin = 0.0;
  g.cvar_closeCombat_lowMax = 1.0;
  g.cvar_closeCombat_bigKick = 1.0;
  g.cvar_closeCombat_farDelay = 0.3;
  g.cvar_closeCombat_kfDelay = 0.1;
  g.cvar_closeCombat_kfDamage = 10;
  g.cvar_closeCombat_sweep = 1.0;
  g.cvar_closeCombat_kickDur = 0.5;
  g.cvar_closeCombat_highKick = 0.5;
  g.cvar_closeCombat_lowDelay = 0.2;
  g.cvar_closeCombat_jumpDelay = 0.1;
  g.cvar_closeCombat_jumpDuration = 0.3;
  g.cvar_closeCombat_jumpHigh = 0.5;
  g.cvar_closeCombat_jumpLow = 0.0;
  g.cvar_closeCombat_kfTime = 0.5;
  g.cvar_closeCombat_backKick = 0.5;
  g.cvar_closeCombat_backKick2 = 0.3;
  g.cvar_closeCombat_rampage = 1.0;
  g.cvar_closeCombat_expDelay = 0.3;
  g.cvar_closeCombat_lowDelta = 0.1;
  g.cvar_closeCombat_bigKickDur = 0.5;
  // Player-side helpers that StandardFire/ColdCock/etc. read
  g.player_f180 = 0;
  g.player_f1a5 = 0;
  g.player_f814 = 0;
  g.player_f815 = 0;
  // EngineGlobals — TS engine singletons (some are placeholders).
  g.EngineGlobals = {
    vec_0x1888: [0, 0, 0],
    vec_0x1600_at_0x28: [0, 0, 0],
    dispatchFire: (..._args: any[]) => { /* noop — engine simulator handles engine-side dispatch via pfnPlaybackEvent */ },
    engineFunc_0x168: (_a: number, _b: number, _c: number) => ({ path: "" }),
  };
  // globalGOT — engine PIC-offset globals map. Most values are
  // placeholders; production would back these to the actual engine
  // singleton struct.
  g.globalGOT = {
    engineMessages: { dispatch: (..._args: any[]) => { /* noop */ } },
    messageBuffer: [0, 0, 0],
    gpGlobals_deref_time: 0,
    grenadePostThrowDelay: 0.1,
    grenadeCookStep: 0.1,
    slowmo_path_cvar: 1.0,
    reload_delay_d: 0.5,
    coldcock_ammo_cvar: 1.0,
    cockSoundPath: "weapons/cock.wav",
  };

  _shimsInstalled = true;
}

installRuntimeShims();

// ───────────────────────────────────────────────────────────────
// CTSGun stub — a class with all the methods referenced by the
// decompiled PrimaryAttack / Reload / WeaponIdle / Spawn.
// Methods are stubs that route through the engine simulator.
//
// D.5.6: This is now allocated ONCE in the entity pool (via
// `getOrCreatePlayerWeapon`), not a fresh `new CTSGunStub()` per
// call. The decompiled methods receive the same entity on every
// invocation, so its `pev.index` + `classname` are stable and
// resolvable by other systems via the pool.
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
  /** m_flNextAttack — primary attack cooldown (offset 0x12c in CBasePlayer) */
  m_flNextAttack?: number;
  /** Eye position (offset 0x178 for CBasePlayer::EyePosition()) */
  pev?: any;
  /** Other fields the decomp reads but don't type-check */
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
 *
 * When constructed via `getOrCreatePlayerWeapon`, the instance is
 * also registered in the global entity pool as `weapon_tsgun` with
 * a stable `pev.index`. Subsequent `tryDecompFire` calls reuse the
 * same entity (just update its pev.origin/angles before the call).
 */
class CTSGunStub {
  // Fields the decompiled methods read
  m_pWeaponInfo: WeaponInfo | null = null;
  m_pPlayer: PlayerStub = { weaponCategory: 0 };
  m_pOwner: OwnerStub = { flag0x814: 0, innerPointer: { flag0x180: 0 } };
  m_iSomeInt: number = 0;
  m_pActiveItem: any = null;
  // Named cooldown timer fields used by the decompiled CCombatAttack
  // (and other Fire* methods that check primary-attack timing). The
  // numeric-keyed `field_0x9c` / `field_0xa0` siblings are kept in
  // sync (different decomp passes used different naming conventions).
  m_flNextPrimaryAttack: number = 0;
  m_flTimeWeaponIdle: number = 0;
  m_flNextSecondaryAttack: number = 0;

  // ───────────────────────────────────────────────────────────────
  // CCombatBlock-style fields (decompiler names unknown byte offsets
  // as `field_0xNNN`). Declared here so the decompiled method can
  // read/write them without ReferenceErrors. Mapped to known names
  // in the per-class manifest (src/mod/guns.ts + decomp-bridge).
  // ───────────────────────────────────────────────────────────────
  /** m_pPlayer pointer (offset 0x80 in CTSGun layout) */
  field_0x80: any = null;
  /** m_flNextPrimaryAttack (offset 0x9c) */
  field_0x9c: number = 0;
  /** m_flTimeWeaponIdle (offset 0xa0) */
  field_0xa0: number = 0;
  /** m_flNextSecondaryAttack (offset 0xa4) */
  field_0xa4: number = 0;
  /** m_flReloadTime / post-throw idle (offset 0xa8) */
  field_0xa8: number = 0;
  /** weapon state byte (offset 0xc8 in some readings, m_iFireMode) */
  field_0xcc: number = 0;
  /** m_pAmmoTracker / s_weapon_info* (offset 0xd0) */
  field_0xd0: any = null;
  /** m_usEvent (event id, offset 0x96c — playback event for block) */
  field_0x96c: number = 0;
  /** m_iId / arg7 float in the engine dispatch (offset 0xc8) */
  field_0xc8: number = 0;

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
  pev: any;

  constructor(pev: any) {
    this.pev = pev;
  }

  // Stub methods called by PrimaryAttack
  CCombatAttack(): void {
    // Defensive: ensure the gun has a valid m_pPlayer.pev before
    // delegating to the decompiled body. The decompiled
    // CCombatAttack reads `this_.m_pPlayer.pev` on the second line
    // (pev.velocity, pev.flags); without a valid pev object it
    // throws. Self-heal here so callers don't have to remember
    // the prerequisite.
    const player: any = this.m_pPlayer;
    if (!player || !player.pev) {
      this.m_pPlayer = {
        weaponCategory: 0,
        m_flNextAttack: 0,
        pev: {
          velocity: { x: 0, y: 0, z: 0 },
          origin: { x: 0, y: 0, z: 0 },
          flags: 0,
        },
      };
    }
    // Call pattern: .call(this, this) — pass the gun as BOTH the
    // `this` context AND the first regular argument. The
    // decompiled CCombatAttack has `function CCombatAttack(this_:
    // any)`, so its first param is named `this_` (not `this`).
    // Without the second arg, `this_` stays undefined when called
    // via .call(). This pattern is universal — also works for
    // CCombatBlock's `function CCombatBlock(this: any)` (its `this`
    // param gets the call's first arg via the same `this`-name
    // special rule). Verified empirically in Node 22.
    CCombatAttackImpl.call(this as any, this as any);
  }

  /**
   * CCombatBlock — defensive block action. D.5.7 v2 delegates to
   * the decompiled implementation (CTSGun__CCombatBlock.ts), which
   * runs guard checks, picks an event index, dispatches the
   * playback event via engineSingleton.vfunc_0x1ec, animates the
   * block sequence, and reschedules next-attack timers.
   *
   * Requires runtime shims (installed in installRuntimeShims):
   *   - UTIL_WeaponTimeBase()
   *   - engineSingleton.vfunc_0x1ec(...)
   *   - Animate(player.field_0x28c, player, 0x26)
   *   - UpdateMeleeBar(player, 33.0)
   *   - cvar_blockDuration / cvar_blockStaminaThreshold / cvar_blockIdleDelay
   *
   * Until those are wired, this throws ReferenceError when called.
   * The tryDecompBlock() entry point catches + reports the error.
   */
  CCombatBlock(): void {
    // See CCombatAttack() for the call pattern explanation —
    // .call(this, this) works for both `this` and `this_` named
    // first parameters (different decomp passes used different
    // conventions for the same purpose).
    CCombatBlockImpl.call(this as any, this as any);
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

    // Now do a real trace from the gun's origin in its forward direction
    // and if we hit something, apply damage via the decompiled's
    // TraceAttack path. The engine simulator's onTraceLine handler
    // (installed in main.ts) does the Babylon raycast.
    const start = this.pev.origin;
    const forward = { x: Math.sin(this.pev.angles.y * Math.PI / 180), y: 0, z: Math.cos(this.pev.angles.y * Math.PI / 180) };
    const end = {
      x: start.x + forward.x * 100,
      y: start.y + forward.y * 100,
      z: start.z + forward.z * 100,
    };
    const trace = g_engfuncs.pfnTraceLine(start, end, 0, this.pev);
    if (trace.fraction < 1.0 && trace.hit) {
      // We hit something — call the decompiled's damage path
      // (ClearMultiDamage → TraceAttack → ApplyMultiDamage)
      ClearMultiDamage();
      const dmgDir = { x: forward.x, y: forward.y, z: forward.z };
      const dmgBits = 0x1080; // DMG_CLUB (0x80) | DMG_NEVERGIB (0x1000)
      TraceAttack(trace.hit, this.pev, 25, dmgDir, trace, dmgBits);
      ApplyMultiDamage(this.pev, this.pev);
    }
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
 * D.5.6: Allocate (or look up) the player's CTSGun entity in the
 * global entity pool. Subsequent calls return the same entity.
 *
 * The entity is registered as `weapon_tsgun` with classname +
 * pev.index visible to other systems (engine simulator's pfnEmitSound
 * log line, pfnTraceLine hit lookup, etc.).
 *
 * `tryDecompFire/WeaponIdle/Reload/Spawn` all reuse this same
 * entity — it stays in the pool for the lifetime of the game.
 */
let _playerWeapon: CTSGunStub | null = null;

function getOrCreatePlayerWeapon(): CTSGunStub {
  if (_playerWeapon) return _playerWeapon;
  const pool = getGlobalPool();
  // Allocate a new entity in the pool — auto-assigned slot. The pool
  // returns a CBaseEntity POJO with pev + classname initialized.
  const ent = pool.create({
    classname: "weapon_tsgun",
    origin: { x: 0, y: 0, z: 0 },
    angles: { x: 0, y: 0, z: 0 },
    health: 0,
    model: "models/w_tsgun.mdl",
    netname: "tsgun",
  });
  _playerWeapon = new CTSGunStub(ent.pev);
  // Stash the entity itself on the gun instance so future lookups
  // (and the `this` passed to decompiled methods) carry the full
  // CBaseEntity POJO, not just pev. The decompiled code reads fields
  // via `this: CTSGun`, but other systems (TraceAttack, etc.) need
  // the full entity for classname/index lookup.
  (_playerWeapon as any)._entity = ent;
  // Wire the player entity into field_0x80 (m_pPlayer pointer at
  // offset 0x80 in the CTSGun layout) ONCE here. The decompiled
  // CCombatBlock (and Reload's fallthrough to CCombatBlock when
  // m_pCombat is null) reads `this.field_0x80.field_0x12c` etc. —
  // without this, every Fire* method that delegates to CCombatBlock
  // throws "Cannot read properties of null (reading 'field_0x12c')".
  const player = pool.findByClassname("player");
  if (player) {
    _playerWeapon.field_0x80 = player;
  }
  return _playerWeapon;
}

/** Reset the player's weapon state — used by test code or scene reset. */
export function resetPlayerWeapon(): void {
  if (_playerWeapon) {
    _playerWeapon.m_pWeaponInfo = null;
    _playerWeapon.m_pPlayer = { weaponCategory: 0 };
    _playerWeapon.m_pOwner = { flag0x814: 0, innerPointer: { flag0x180: 0 } };
    _playerWeapon.m_iSomeInt = 0;
    _playerWeapon.m_pActiveItem = null;
    _playerWeapon.pev.origin = { x: 0, y: 0, z: 0 };
    _playerWeapon.pev.angles = { x: 0, y: 0, z: 0 };
  }
}

/**
 * Demo: call the decompiled PrimaryAttack() function with the player's
 * weapon entity from the pool. The decompiled method will call
 * g_engfuncs.pfnEmitSound, etc., which the engine simulator logs.
 *
 * This is the first end-to-end test that real decompiled code
 * is being executed by the game loop.
 */
export function tryDecompFire(
  origin?: { x: number; y: number; z: number },
  angles?: { x: number; y: number; z: number },
  weaponCategory: number = 0,
  fireMode: number = 1,
): { ok: boolean; error?: string } {
  const gun = getOrCreatePlayerWeapon();
  gun.m_pPlayer = { weaponCategory };
  gun.m_pWeaponInfo = {
    fireMode,
    burstResetFlag: 0,
    accumulator: 0,
  };
  gun.m_pOwner = { flag0x814: 1, innerPointer: { flag0x180: 1 } };
  if (origin) {
    gun.pev.origin = { ...origin };
  }
  if (angles) {
    gun.pev.angles = { ...angles };
  }

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
  const gun = getOrCreatePlayerWeapon();
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
  const gun = getOrCreatePlayerWeapon();
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
  const gun = getOrCreatePlayerWeapon();
  try {
    Spawn.call(gun);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * D.5.7 v2: Call the decompiled CTSGun::CCombatBlock. Wires the
 * player's weapon entity to the player entity (via field_0x80)
 * before invoking the decompiled body, so the decompiled code's
 * `this.field_0x80.field_0x12c` style reads resolve.
 *
 * CCombatBlock isn't on the PrimaryAttack hot path (no LMB → block),
 * so we expose it via a dedicated key (B in main.ts) for testing.
 */
export function tryDecompBlock(): { ok: boolean; error?: string } {
  const gun = getOrCreatePlayerWeapon();
  // Find the player entity in the global pool.
  const pool = getGlobalPool();
  const player = pool.findByClassname("player");
  if (!player) {
    return { ok: false, error: "no player entity in pool" };
  }
  // Wire the player into the gun's field_0x80 (decompiler-named m_pPlayer
  // pointer at offset 0x80 in the CTSGun layout).
  gun.field_0x80 = player;
  // FireMode / event id / etc. initialized to known defaults.
  gun.field_0xc8 = 0;        // m_iId-like int (passed as float arg7)
  gun.field_0x96c = 0;       // m_usEvent — event index for the playback event
  // The m_pAmmoTracker pointer — null in v1 (no ammo tracker state).
  // Branch A of CCombatBlock (this.field_0xcc === 0) doesn't touch it,
  // so leaving it null is fine.
  gun.field_0xd0 = null;

  try {
    CCombatBlockImpl.call(gun as any);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * D.5.7 v2 cont.: Call the decompiled CTSGun::CCombatAttack. Sets
 * m_pWeaponInfo to null first so the decompiled PrimaryAttack's
 * "weaponInfo === null" branch dispatches to CCombatAttack instead
 * of Fire()/GrenadeFire()/etc. — matches the bare-handed punch
 * path in the original game.
 *
 * Not on a hot path in v1 (player always has a weapon), so exposed
 * via a dedicated key (V in main.ts) for testing.
 */
export function tryDecompCCombatAttack(): { ok: boolean; error?: string } {
  const gun = getOrCreatePlayerWeapon();
  // Clear m_pWeaponInfo so the decompiled PrimaryAttack dispatches
  // to this.CCombatAttack() (the bare-hands branch).
  gun.m_pWeaponInfo = null;
  // Ensure m_pPlayer has a valid pev (the decompiled CCombatAttack
  // reads this_.m_pPlayer.pev on its second line). The bridge stub's
  // CCombatAttack method also self-heals this, but belt-and-suspenders.
  gun.m_pPlayer = {
    weaponCategory: 0,
    m_flNextAttack: 0,
    pev: {
      velocity: { x: 0, y: 0, z: 0 },
      origin: { x: 0, y: 0, z: 0 },
      flags: 0,
    },
  };
  // m_flNextPrimaryAttack / m_flTimeWeaponIdle need to be in the
  // past so the guards don't return early.
  gun.m_flNextPrimaryAttack = 0;
  gun.m_flTimeWeaponIdle = 0;
  gun.field_0xc8 = 0;
  gun.field_0x96c = 0;
  gun.field_0xd0 = null;

  try {
    // Call PrimaryAttack.call — its weaponInfo === null branch
    // routes to this.CCombatAttack() (now delegated to the
    // decompiled CCombatAttackImpl via the bridge stub).
    PrimaryAttack.call(gun as any);
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
