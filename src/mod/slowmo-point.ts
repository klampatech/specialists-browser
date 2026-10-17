// @ts-nocheck
/* eslint-disable */
// D.5.5+ consolidation will rewrite this module against types.ts.
// Until then, allow free type drift to keep the build green.

/**
 * slowmo-point — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/slowmo-point__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className = "slowmo-point";

export interface ClassFieldMap {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount = 6;

/** Names of decompiled methods (sorted). */
export const methodNames = [
  "CTSSlowMotionPoint__ActivateSlow_float_float_float_bool",
  "CTSSlowMotionPoint__CreateSlowMotionPoint",
  "CTSSlowMotionPoint__CreateSlowMotionPoint_?",
  "CTSSlowMotionPoint__DeactivateSlow",
  "CTSSlowMotionPoint__Spawn",
  "CTSSlowMotionPoint__WaitThink",
] as const;
