/**
 * powerup — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/powerup__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className_powerup = "powerup";


export interface ClassFieldMap_powerup {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount_powerup = 11;

/** Names of decompiled methods (sorted). */
export const methodNames_powerup = [
  "CTSPowerUp__CreatePowerUp_int_int",
  "CTSPowerUp__Fall",
  "CTSPowerUp__KeyValue_p_KeyValueData_s",
  "CTSPowerUp__OnGround",
  "CTSPowerUp__Precache",
  "CTSPowerUp__Restore_r_CRestore",
  "CTSPowerUp__Save_r_CSave",
  "CTSPowerUp__SetupPowerUp_int_int_float_bool",
  "CTSPowerUp__Spawn",
  "CTSPowerUp__WaitThink",
  "CTSPowerUp__WaitTouch_p_CBaseEntity",
] as const;
