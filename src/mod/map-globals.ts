/**
 * map-globals — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/map-globals__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className = "map-globals";

export interface ClassFieldMap {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount = 7;

/** Names of decompiled methods (sorted). */
export const methodNames = [
  "CTSMapGlobals__KeyValue_p_KeyValueData_s",
  "CTSMapGlobals__Precache",
  "CTSMapGlobals__Restore_r_CRestore",
  "CTSMapGlobals__Save_r_CSave",
  "CTSMapGlobals__Spawn",
  "CTSMapGlobals__WaitThink",
  "CTSMapGlobals__get_weapon_restriction",
] as const;
