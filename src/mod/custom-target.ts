/**
 * custom-target — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/custom-target__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className = "custom-target";

export interface ClassFieldMap {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount = 5;

/** Names of decompiled methods (sorted). */
export const methodNames = [
  "CTSCustomTarget__FireTarget_int",
  "CTSCustomTarget__GetTargets_p_?_char",
  "CTSCustomTarget__KeyValue_p_KeyValueData_s",
  "CTSCustomTarget__Spawn",
  "CTSCustomTarget__Use_p_?_?",
] as const;
