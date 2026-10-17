```typescript
/**
 * CTSGun::GetActiveItems — Returns the active weapon's status flag
 * bitmask, OR-ing in the akimbo bit (0x40) when the current weapon
 * id is akimbo-capable or akimbo-only. Returns 0 when there is no
 * active weapon.
 *
 * @param this  The CTSGun entity instance
 * @returns     Status bitmask from the active weapon's status struct,
 *              with the akimbo bit set if applicable; 0 if no active
 *              weapon is set.
 */
export function GetActiveItems(this: CTSGun): number {
  // [edi+0xcc] — pointer to the active weapon's status struct.
  const activeItem = this.m_pActiveItem;
  if (activeItem === null) {
    return 0;
  }

  // [eax+0x14] — int flags field inside the status struct.
  let flags = activeItem.m_iFlags;

  // [edi+0xc8] — current weapon id.
  const weaponId = this.m_iId;
  if (IsWeaponAkimbo(weaponId) || IsOnlyAkimbo(weaponId)) {
    flags |= 0x40; // akimbo flag bit
  }

  return flags;
}
```
