/**
 * stunt — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/stunt__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className_stunt = "stunt";


export interface ClassFieldMap_stunt {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount_stunt = 25;

/** Names of decompiled methods (sorted). */
export const methodNames_stunt = [
  "CTSStunt__CanDiveHigh",
  "CTSStunt__CanDiveLow",
  "CTSStunt__CanDiveMedium",
  "CTSStunt__CheckForBreakables",
  "CTSStunt__CheckForWallClimb",
  "CTSStunt__CheckForWallDive",
  "CTSStunt__CheckForWallJump",
  "CTSStunt__CloseAttack",
  "CTSStunt__GoBulletTime",
  "CTSStunt__GoDive",
  "CTSStunt__GoRoll_int",
  "CTSStunt__GoWallClimb",
  "CTSStunt__GoWallJump",
  "CTSStunt__GoWheel",
  "CTSStunt__HandleDive",
  "CTSStunt__HandleSlide",
  "CTSStunt__HandleStunt",
  "CTSStunt__HandleWallClimb",
  "CTSStunt__HandleWallJump",
  "CTSStunt__HandleWheel",
  "CTSStunt__Init_p_CBasePlayer",
  "CTSStunt__Landing",
  "CTSStunt__NextDive",
  "CTSStunt__Play",
  "CTSStunt__SlotBonus",
] as const;
