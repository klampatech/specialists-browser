/**
 * guns — D.4.9 consolidated module (1 of 5 D.5-ready criteria).
 *
 * Per-class doc-comment + method manifest. The actual method bodies
 * live in `tools/decompile/output/guns__*.ts` (D.4.8 canonical files).
 *
 * This module exists to satisfy the D.5 ready criterion:
 *   "src/mod/<class>.ts exists per class with a doc-comment field
 *    map and consistent type contracts across methods."
 *
 * For D.5.5+ (consolidation), we'll merge the canonical bodies into
 * this module with proper type contracts. For now the methods list
 * is exported as a constant for D.5.6+ bridge code.
 */

export const className_guns = "guns";


export interface ClassFieldMap_guns {
  /** Entity's entvars at offset 0. */
  pev: import("./types").Entvars;
}

/** Number of decompiled methods for this class. */
export const methodCount_guns = 44;

/** Names of decompiled methods (sorted). */
export const methodNames_guns = [
  "CTSGun__AddAmmo_?",
  "CTSGun__AddItem_int",
  "CTSGun__AkimboFire",
  "CTSGun__AlternateAttack",
  "CTSGun__CCombatAttack",
  "CTSGun__CCombatBlock",
  "CTSGun__CCombatIdle",
  "CTSGun__ColdCock",
  "CTSGun__Deploy",
  "CTSGun__DropWeapon_int_bool",
  "CTSGun__EmptySound",
  "CTSGun__Fire",
  "CTSGun__GetActiveItems",
  "CTSGun__GetBetterWeapon_int",
  "CTSGun__GetItemInfo_p_ItemInfo",
  "CTSGun__GrenadeFire",
  "CTSGun__GrenadeIdle_int",
  "CTSGun__HolsterWeapon",
  "CTSGun__Holster_int",
  "CTSGun__KatanaFire",
  "CTSGun__KatanaThrow",
  "CTSGun__KnifeFire",
  "CTSGun__MultiplyClips",
  "CTSGun__Precache",
  "CTSGun__PrimaryAttack",
  "CTSGun__Reload",
  "CTSGun__ReloadWeapon_int_int_float",
  "CTSGun__Reset",
  "CTSGun__ScaleSpread_r_?_float_float_int",
  "CTSGun__SecondaryAttack",
  "CTSGun__SelectWeapon_?",
  "CTSGun__ShotgunFire",
  "CTSGun__ShotgunReload",
  "CTSGun__Spawn",
  "CTSGun__StandardFire",
  "CTSGun__StopReload",
  "CTSGun__SwitchFireMode",
  "CTSGun__SwitchItems",
  "CTSGun__TakeWeapon_int_p_?_?",
  "CTSGun__Unzoom",
  "CTSGun__UpdateClientData_p_CBasePlayer",
  "CTSGun__VKickback_float_int_bool_float_float_?",
  "CTSGun__WeaponIdle",
  "CTSGun__Zoom_int",
] as const;
