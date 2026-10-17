/**
 * CTSGun::GetActiveItems — Returns the active weapon's status
 * flag bitmask, OR-ing in the akimbo bit (0x40) when the
 * current weapon id is akimbo-capable or akimbo-only.
 * Returns 0 when there is no active weapon.
 *
 * ASM offsets on `this`:
 *   [this+0xcc] — pointer to active item's status struct
 *   [this+0xc8] — current weapon id (int)
 *   [activeItem+0x14] — flags field inside the status struct
 */
export function GetActiveItems(this: CTSGun): number {
  const activeItem = this.m_pActiveItem;
  if (activeItem === null) {
    return 0;
  }

  let flags = activeItem.m_iFlags;
  const weaponId = this.m_iId;

  //0x40 is the akimbo bit in the weapon status flags word.
  // Short-circuit OR matches the disassembly's branch order:
  // IsOnlyAkimbo is only called when IsWeaponAkimbo returns false.
  if (IsWeaponAkimbo(weaponId) || IsOnlyAkimbo(weaponId)) {
    flags |= 0x40;
  }

  return flags;
}
