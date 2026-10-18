/**
 * D.5.5 — Decomp integration wrapper.
 *
 * Re-exports the canonical decompiled code from
 * `tools/decompile/output/*.ts` and provides the engine
 * simulator that they expect (`g_engfuncs`, `gpGlobals`).
 *
 * Importing this module:
 *   1. Calls `installGlobals()` to make `g_engfuncs` + `gpGlobals`
 *      available as globalThis properties (so the decompiled
 *      modules can reference them as bare identifiers).
 *   2. Re-exports each decompiled function so callers can
 *      `import { PrimaryAttack } from "../../src/mod/decomp"`.
 *
 * The decompiled code itself is unmodified — it lives in
 * `tools/decompile/output/*.ts` and uses bare `g_engfuncs` /
 * `gpGlobals` identifiers. We rely on TypeScript's module-scope
 * resolution + the ambient declarations in `src/mod/globals.d.ts`
 * to make it all type-check.
 */

import { installGlobals, tickGpGlobals, setEngineHandlers, EngineHandlers } from "./engine";
import "./decomp-shims"; // ambient declarations for decompiled code

// Install globals into globalThis so the decompiled modules (which
// don't import them) can find them. Must happen before any decompiled
// module is evaluated.
installGlobals();

// Now re-export the decompiled modules.
export { PrimaryAttack as CTSGun__PrimaryAttack } from "../../tools/decompile/output/CTSGun__PrimaryAttack";
export { Reload as CTSGun__Reload } from "../../tools/decompile/output/CTSGun__Reload";
export { WeaponIdle as CTSGun__WeaponIdle } from "../../tools/decompile/output/CTSGun__WeaponIdle";
export { Spawn as CTSGun__Spawn } from "../../tools/decompile/output/CTSGun__Spawn";
export { WaitThink as CTSAmmoPack__WaitThink } from "../../tools/decompile/output/CTSAmmoPack__WaitThink";
// CHalfLifeMultiplay__PlayerKilled has known C++ scope issues in decomp output — skip
// CTSGroundAmmo__Spawn skipped
// CTSGroundWeapon__Spawn.ts is a codex partial (no export) — skip
// CTSHealthKit__Spawn.ts doesn't exist — skip
// CTSFlag__Fall.ts is a codex partial (no top-level function) — skip
// CTSFlag__PlayerTakeFlag_p_CBaseEntity.ts has a real C++ scope bug (base used outside its decl block) — skip
export { GlobalSlowMotion2 as CTSGameRules__GlobalSlowMotion2 } from "../../tools/decompile/output/CTSGameRules__GlobalSlowMotion2_float_bool";
// CTSGroundWeapon__PutOnWall.ts has type issues with the engine-bindings stub — skip
// CTSShrapnel__BounceTouch.ts is 13K — large method, skip for now
export { WaitThink as CTSShrapnel__WaitThink } from "../../tools/decompile/output/CTSShrapnel__WaitThink";
export { SlowMotionFlow as CBasePlayer__SlowMotionFlow } from "../../tools/decompile/output/CBasePlayer__SlowMotionFlow";

// Engine simulator exports for callers
export {
  installGlobals,
  tickGpGlobals,
  setEngineHandlers,
  engineLog,
  setEngineLogging,
  getCallStats,
  enableCallStats,
  g_engfuncs,
  gpGlobals,
  registerUserMsg,
  lookupUserMsg,
  registerCvar,
  getCvarFloat,
  setCvarFloat,
  setCvarString,
  MAKE_STRING,
  STRING,
  vec3_add,
  vec3_sub,
  vec3_scale,
  vec3_length,
  vec3_normalize,
  sprintf,
  MSG_TYPES,
} from "./engine";
export type { EngineHandlers, TraceResult } from "./engine";

/**
 * Initialize the engine. Call once at app startup. Returns a tick
 * function to be called every frame.
 */
export function initEngine(handlers: EngineHandlers = {}): (dt: number) => void {
  setEngineHandlers(handlers);
  return (dt: number) => tickGpGlobals(dt);
}

/**
 * Wire the engine simulator's pfnEmitSound to a real audio sink.
 * Call this with your GameAudio instance to make the decompiled
 * code's "pfnEmitSound" calls actually play sounds.
 */
export function wireEngineAudio(audio: { gunshot(): void; reload?(): void; pickup?(): void }): void {
  setEngineHandlers({
    onEmitSound: (_ent: any, _channel: number, sample: string, _volume: number, _attenuation: number, _flags: number, _pitch: number) => {
      // Route by sample name to the appropriate sound
      if (sample.includes("reload")) {
        audio.reload?.();
      } else if (sample.includes("fire") || sample.includes("shot") || sample.includes("launcher") || sample.includes("swing") || sample.includes("slash")) {
        audio.gunshot();
      } else if (sample.includes("pickup") || sample.includes("ammo") || sample.includes("health")) {
        audio.pickup?.();
      } else {
        // Default: play a soft beep for any other sound
        console.log(`[engine audio] unhandled sound: ${sample}`);
      }
    },
  });
}
