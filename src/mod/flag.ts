/**
 * flag — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/flag__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className_flag = "flag";


export interface ClassFieldMap_flag {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount_flag = 13;

/** Names of decompiled methods (sorted). */
export const methodNames_flag = [
  "CTSFlag__BounceTouch_p_CBaseEntity",
  "CTSFlag__CanInteract_p_CBasePlayer",
  "CTSFlag__CreateFlag_p_?_?",
  "CTSFlag__Destroy",
  "CTSFlag__Fall",
  "CTSFlag__OnGround",
  "CTSFlag__PlayerTakeFlag_p_CBaseEntity",
  "CTSFlag__Precache",
  "CTSFlag__RespawnFlag",
  "CTSFlag__Spawn",
  "CTSFlag__Use_p_?_?",
  "CTSFlag__WaitThink",
  "CTSFlag__WaitTouch_p_CBaseEntity",
] as const;
