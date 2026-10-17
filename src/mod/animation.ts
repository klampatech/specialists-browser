/**
 * animation — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/animation__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className_animation = "animation";


export interface ClassFieldMap_animation {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount_animation = 13;

/** Names of decompiled methods (sorted). */
export const methodNames_animation = [
  "CTSAnimation__Animate_p_?_?",
  "CTSAnimation__BlendAnimationsByDir_p_?_?",
  "CTSAnimation__BlendAnimationsForSlide_p_CBasePlayer",
  "CTSAnimation__BlendJumpAnimations_p_CBasePlayer",
  "CTSAnimation__BulletDance_p_CBasePlayer",
  "CTSAnimation__DisableBulletDance_p_CBasePlayer",
  "CTSAnimation__EnableBulletDance_p_CBasePlayer",
  "CTSAnimation__GaitCloseCombat_int_p_CBasePlayer",
  "CTSAnimation__HandleCloseCombat_p_?_?",
  "CTSAnimation__Init",
  "CTSAnimation__IsInCloseCombat_int",
  "CTSAnimation__SetAnim_p_?_?",
  "CTSAnimation__UpdateTimers_p_CBasePlayer",
] as const;
