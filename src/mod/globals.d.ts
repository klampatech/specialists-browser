/**
 * D.4.9 — ambient declarations for HLSDK globals referenced by
 * the legacy D.4.x consolidated modules (interface.ts, slowmo.ts,
 * weapons.ts, scoring.ts) and the decompiled CTS bodies.
 *
 * These are PLACEHOLDER types — the actual HLSDK layout is documented
 * in tools/decompile/references/hlsdk-goldsrc-interface.md (TODO D.4.10).
 *
 * If you're porting a method to a real binding, replace the `any`
 * with the precise type from src/mod/types.ts.
 */

// ───────────────────────────────────────────────────────────────
// Engine globals (gpGlobals, g_engfuncs, cvars, strings)
// ───────────────────────────────────────────────────────────────
declare let gpGlobals: {
  time: number;
  frametime: number;
  maxClients: number;
  mapname: string;
  deathmatch: number;
  [k: `0x${string}`]: any;
};

declare let g_engfuncs: {
  pfnPrecacheModel: (...args: any[]) => any;
  pfnPrecacheSound: (...args: any[]) => any;
  pfnSetModel: (...args: any[]) => any;
  pfnSetSize: (...args: any[]) => any;
  pfnSetOrigin: (...args: any[]) => any;
  pfnEmitSound: (...args: any[]) => any;
  pfnEmitAmbientSound: (...args: any[]) => any;
  pfnTraceLine: (...args: any[]) => any;
  pfnTraceToss: (...args: any[]) => any;
  pfnTraceMonsterHull: (...args: any[]) => any;
  pfnTraceHull: (...args: any[]) => any;
  pfnGetAimVector: (...args: any[]) => any;
  pfnServerPrint: (...args: any[]) => any;
  pfnClientPrint: (...args: any[]) => any;
  pfnMessageBegin: (...args: any[]) => any;
  pfnMessageEnd: (...args: any[]) => any;
  pfnWriteByte: (...args: any[]) => any;
  pfnWriteShort: (...args: any[]) => any;
  pfnWriteLong: (...args: any[]) => any;
  pfnWriteFloat: (...args: any[]) => any;
  pfnWriteString: (...args: any[]) => any;
  pfnWriteAngle: (...args: any[]) => any;
  pfnPEntityOfEntIndex: (...args: any[]) => any;
  [k: `0x${string}`]: any;
};

// ───────────────────────────────────────────────────────────────
// Common HLSDK constants
// ───────────────────────────────────────────────────────────────
declare const INTERFACE_VERSION: number;
declare const NEW_DLL_FUNCTIONS_VERSION: number;

// ───────────────────────────────────────────────────────────────
// Engine message types
// ───────────────────────────────────────────────────────────────
declare const MSG_ALL: number;
declare const MSGTYPE_ROUND_OVER: number;

// ───────────────────────────────────────────────────────────────
// Game-specific constants
// ───────────────────────────────────────────────────────────────
declare const ROUND_RESTART_DELAY: number;

// ───────────────────────────────────────────────────────────────
// Engine utility helpers
// ───────────────────────────────────────────────────────────────
declare function FireTargets(targetName: string, pCaller: any, pActivator: any, useType: any, delay: number): void;
declare function TSHudMessageAll(ch: number, r: number, g: number, y: number, hold: number, msg: string): void;
declare function UTIL_LogPrintf(...args: any[]): void;
declare function UTIL_MakeVectors(angles: any): any;
declare function UTIL_Remove(ent: any): void;
declare function UTIL_TraceLine(start: any, end: any, flags: number, ignoreEnt: any): any;
declare function UTIL_WeaponTimeBase(): number;
declare function STRING(p: any): string;
declare function INDEXENT(idx: number): any;
declare function CheckHull(...args: any[]): any;
declare function RANDOM_LONG(a: number, b: number): number;
declare function RANDOM_FLOAT(a: number, b: number): number;
declare function CreateSlowMotionPoint(...args: any[]): any;
declare function DoSpectacularNess(...args: any[]): any;
declare function VictimKatanaHold(...args: any[]): any;
declare function ClearMultiDamage(...args: any[]): void;
declare function vec3_add(a: any, b: any): any;
declare function vec3_scale(a: any, s: number): any;
declare function vec3_origin(): any;
declare function sprintf(...args: any[]): string;
declare function getCvar(name: string): number;
declare function GetTeamIndex(...args: any[]): number;
declare function UTIL_PlayerByIndex(idx: number): any;
declare function FMT_LOG_WINNER(...args: any[]): string;
declare function entindexof_edict(...args: any[]): any;
declare function MakeButtons(...args: any[]): any;
declare function GetPlayerByUniqueId(...args: any[]): any;

// ───────────────────────────────────────────────────────────────
// String constants (TS-specific)
// ───────────────────────────────────────────────────────────────
declare const STR_ROUND_RESET: string;
declare const STR_DRAW: string;
declare const STR_LOG_DRAW: string;

// ───────────────────────────────────────────────────────────────
// Cvar constants
// ───────────────────────────────────────────────────────────────
declare const CVAR_WINNER_CASH: string;
declare const CVAR_LOSER_CASH: string;
declare const MSGTYPE_PLAYER_REWARD: number;

// ───────────────────────────────────────────────────────────────
// Cvars (TS-specific)
// ───────────────────────────────────────────────────────────────
declare const cvar_spectacular: any;

// ───────────────────────────────────────────────────────────────
// CTSGameRules and other class refs (legacy)
// ───────────────────────────────────────────────────────────────
declare function CHalfLifeMultiplay(...args: any[]): any;
declare class CHalfLifeMultiplay_ {
  [k: string]: any;
}
type CHalfLifeMultiplay = CHalfLifeMultiplay_;
declare let engine: any;
