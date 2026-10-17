/**
 * CTSWorldGun::Precache — empty no-op override. The base class
 * CBaseEntity::Precache() handles all asset precaching for the
 * world-gun entity, so this derived override intentionally does nothing.
 *
 * Demangled symbol: Precache__11CTSWorldGun  (size: 1 byte — single `ret`)
 * Other siblings in this class: Spawn, CreateWeapon, BounceTouch,
 * Fall, WaitThink, OnGround, Use, GetWeapon, WaitTouch, ShouldCollide,
 * ObjectCaps, CanUsedTroughWalls.
 *
 * @param this  The CTSWorldGun entity instance (`this` in the original C++)
 * @returns     void
 */
export function Precache(this: any): void {
  // Intentionally empty: the disassembly at 0x90b08 is a single `ret`.
  // The full CTSWorldGun class shape (so this parameter can be properly
  // typed) is reconstructed in D.4.
}
