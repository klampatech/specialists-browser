/**
 * D.5.5 — Decomp shims.
 *
 * The decompiled code from `tools/decompile/output/*.ts` references
 * class names (CTSGun, CTSFlag, CBaseEntity, etc.) and helper
 * functions (DoubleFireRate, InfiniteClips, etc.) that don't exist
 * yet as TypeScript types. This file declares them as `any` so the
 * decompiled code type-checks.
 *
 * Most engine globals (g_engfuncs, gpGlobals, STRING, RANDOM_LONG,
 * FireTargets, etc.) are already declared in `globals.d.ts`. We only
 * add the things that file doesn't cover.
 *
 * For now: shim the types so we can import the decompiled code and
 * call the engine simulator. The runtime behavior of the shimmed
 * types is `undefined` — the decompiled code can be CALLED but it
 * won't do anything meaningful until the class skeletons exist.
 */

import { Vector3 } from "./types";

// ───────────────────────────────────────────────────────────────
// Class type stubs (shim — the real classes are reconstructed in D.4.x)
// ───────────────────────────────────────────────────────────────

declare global {
  type CBaseEntity = any;
  type CBasePlayer = any;
  type CBaseMonster = any;
  type CBasePlayerItem = any;
  type CBaseAnimating = any;
  type CBaseDelay = any;
  type CBaseToggle = any;
  type CBaseTrigger = any;
  type CItem = any;
  type CWeaponBox = any;
  type CGrenade = any;
  type CSound = any;
  type CSentence = any;
  type CWorld = any;
  type CCineMonster = any;
  type CStripWeapons = any;
  type CSpawnPoint = any;

  // CTS-prefixed (The Specialists specific)
  type CTSBase = any;
  type CTSGun = any;
  type CTSAmmoPack = any;
  type CTSGroundAmmo = any;
  type CTSGroundWeapon = any;
  type CTSHealthKit = any;
  type CTSFlag = any;
  type CTSBomb = any;
  type CTSBriefcase = any;
  type CTSSlowMotion = any;
  type CTSSlowMotionPoint = any;
  type CTSGameRules = any;
  type CTSPhysicObject = any;
  type CTSShrapnel = any;
  type CTSStunt = any;
  type CTSEmitter = any;
  type CTSCustomTarget = any;
  type CTSAnimation = any;

  // entvars_t / entvars_s
  type entvars_t = any;
  type entvars_s = any;

  // TraceResult
  type TraceResult = any;

  // Vector
  type Vector = Vector3;
}

// ───────────────────────────────────────────────────────────────
// Additional global function stubs (NOT in globals.d.ts)
// ───────────────────────────────────────────────────────────────
//
// globals.d.ts already declares: g_engfuncs, gpGlobals, engine, STRING,
// RANDOM_LONG, RANDOM_FLOAT, FireTargets, ClearMultiDamage, UTIL_Remove,
// UTIL_TraceLine, UTIL_PlayerByIndex, UTIL_LogPrintf, DoSpectacularNess,
// CreateSlowMotionPoint, TSHudMessageAll, cvar_spectacular, CHalfLifeMultiplay, etc.
// We only add the missing ones here.

declare global {
  // ── Class methods / properties referenced as global (rare) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DoubleFireRate: (pPlayer: any) => number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const InfiniteClips: (pPlayer: any) => number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TS_IDLE_RANDOM_INTERVAL: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FLAG_DAMAGE_SCALE: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FLAG_DAMAGE_FINAL_MULTIPLIER: number;

  // ── HLSDK macros (uppercase names that the decompiled code uses) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MAKE_STRING: (s: string) => number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MAKE_STRING_FROM_PTR: (s: string) => number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FStrEq: (a: string, b: string) => boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MESSAGE_BEGIN: (msgType: number, msgId: number, origin?: any, client?: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MESSAGE_END: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WRITE_BYTE: (b: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WRITE_SHORT: (s: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WRITE_LONG: (l: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WRITE_STRING: (s: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WRITE_FLOAT: (f: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WRITE_ANGLE: (f: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WRITE_COORD: (f: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EMIT_SOUND: (ent: any, channel: number, sample: string, vol: number, attn: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EMIT_SOUND_DYN: (ent: any, channel: number, sample: string, vol: number, attn: number, flags: number, pitch: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PLAYBACK_EVENT: (flags: number, eventIndex: number, ent: any, origin: any, angles: any, fparam1: number, fparam2: number, iparam1: number, iparam2: number, bparam1: number, bparam2: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SET_MODEL: (ent: any, model: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ALERT: (level: number, msg: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SUB_UseTargets: (pEntity: any, pActivator: any, useType: number, value: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TraceAttack: (victim: any, attacker: any, damage: number, dir: any, trace: any, dmgBits: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ApplyMultiDamage: (inflictor: any, attacker: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const UTIL_GetAimVectors: (vec: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CREATE_NAMED_ENTITY: (classname: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GetClassPtr: (classname: string) => any;

  // TS-specific helpers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const GiveCash: (player: any, amount: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const UpdateTeamScores: (player: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TSGetPointsForFrag: (attacker: any, victim: any) => number;

  // Class values (used as constructors or static method holders)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TraceResult: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CTSGameRules: {
    TheOneIsDead: (victim: any, killer: any) => void;
    CallCheckDeads: () => void;
  };
}
