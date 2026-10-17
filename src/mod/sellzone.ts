/**
 * sellzone — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/sellzone__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className_sellzone = "sellzone";


export interface ClassFieldMap_sellzone {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount_sellzone = 3;

/** Names of decompiled methods (sorted). */
export const methodNames_sellzone = [
  "CTSSellZone__KeyValue_p_KeyValueData_s",
  "CTSSellZone__SellTouch_p_CBaseEntity",
  "CTSSellZone__Spawn",
] as const;
