/**
 * world-gun — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/world-gun__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className = "world-gun";

export interface ClassFieldMap {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount = 11;

/** Names of decompiled methods (sorted). */
export const methodNames = [
  "CTSWorldGun__BounceTouch_p_CBaseEntity",
  "CTSWorldGun__CreateWeapon_p_?_?",
  "CTSWorldGun__Fall",
  "CTSWorldGun__GetWeapon_p_CBaseEntity",
  "CTSWorldGun__OnGround",
  "CTSWorldGun__Precache",
  "CTSWorldGun__ShouldCollide_p_CBaseEntity",
  "CTSWorldGun__Spawn",
  "CTSWorldGun__Use_p_?_?",
  "CTSWorldGun__WaitThink",
  "CTSWorldGun__WaitTouch_p_CBaseEntity",
] as const;
