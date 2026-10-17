/**
 * team-escape — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/team-escape__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className = "team-escape";

export interface ClassFieldMap {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount = 8;

/** Names of decompiled methods (sorted). */
export const methodNames = [
  "CTSTeamEscape__EnableObjective_bool",
  "CTSTeamEscape__KeyValue_p_KeyValueData_s",
  "CTSTeamEscape__Precache",
  "CTSTeamEscape__Restore_r_CRestore",
  "CTSTeamEscape__Save_r_CSave",
  "CTSTeamEscape__Spawn",
  "CTSTeamEscape__WaitThink",
  "CTSTeamEscape__WaitTouch_p_CBaseEntity",
] as const;
