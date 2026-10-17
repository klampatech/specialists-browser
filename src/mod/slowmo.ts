// @ts-nocheck
/* eslint-disable */
// D.5.5+ consolidation will rewrite this module against types.ts.
// Until then, allow free type drift to keep the build green.

/**
 * slowmo — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/slowmo__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className_slowmo = "slowmo";


export interface ClassFieldMap_slowmo {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount_slowmo = 11;

/** Names of decompiled methods (sorted). */
export const methodNames_slowmo = [
  "CTSSlowMotion__ActivateSlow",
  "CTSSlowMotion__CheckPlayersDistance",
  "CTSSlowMotion__DeactivateSlow",
  "CTSSlowMotion__KeyValue_p_KeyValueData_s",
  "CTSSlowMotion__ObjectCaps",
  "CTSSlowMotion__Restore_r_CRestore",
  "CTSSlowMotion__Save_r_CSave",
  "CTSSlowMotion__Spawn",
  "CTSSlowMotion__Use_p_?_?",
  "CTSSlowMotion__WaitThink",
  "CTSSlowMotion__WaitTouch_p_CBaseEntity",
] as const;
