/**
 * shared-emitter — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/shared-emitter__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className = "shared-emitter";

export interface ClassFieldMap {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount = 10;

/** Names of decompiled methods (sorted). */
export const methodNames = [
  "CTSSharedEmitter__AddEmitter_p_sharedemitter_s",
  "CTSSharedEmitter__AddParticle_p_sharedparticle_s",
  "CTSSharedEmitter__EmitterKeyValue_p_?_?",
  "CTSSharedEmitter__KillAll",
  "CTSSharedEmitter__KillEmitter_int",
  "CTSSharedEmitter__NextEmitter",
  "CTSSharedEmitter__NextParticle",
  "CTSSharedEmitter__ParticleKeyValue_p_?_?",
  "CTSSharedEmitter__SV_UpdateClient_int",
  "CTSSharedEmitter__SetEmitterParticle_int_int",
] as const;
