```typescript
/**
 * CTSGun::DropWeapon — drops the weapon in the given slot; switches to a
 * replacement or holsters if it was the active weapon.
 *
 * @param this  The CTSGun entity instance (this in the original C++)
 * @param slotIndex  Slot index of the weapon to drop (valid range: 1..0x24)
 * @param selectBetter  When the active slot is dropped, whether to call
 *                      GetBetterWeapon (true) or HolsterWeapon (false)
 * @returns  1 on success, 0 if the slot was empty / out of range /
 *          rejected by the owning player
 */
export function DropWeapon(
  this: CTSGun,
  slotIndex: number,
  selectBetter: boolean
): number {
  // Validate the slot index. The asm does an unsigned compare
  // (slotIndex - 1) > 0x24, which rejects slotIndex <= 0 and > 0x25.
  if (slotIndex < 1 || slotIndex > 0x24) {
    return 0;
  }

  // Each weapon slot is 56 bytes; the weapons array starts at this+0x114.
  // The first byte of each slot is a "has weapon" flag.
  // TODO: slot array at offset 0x114 / slot[0] "has weapon" flag not yet named.
  const slotOffset = 0x114 + slotIndex * 56;
  if (this.mem.getUint8(slotOffset) === 0) {
    return 0;
  }
  // Clear the slot — the asm zeroes 14 dwords (56 bytes) starting at slotOffset.
  for (let i = 0; i < 14; i++) {
    this.mem.setUint32(slotOffset + i * 4, 0);
  }

  // Validate via the owning player (this->m_pPlayer is at offset 0x80).
  // The asm reaches the validator as:
  //   edx = *(m_pPlayer + 0x60); call [edx + 0xb4](m_pPlayer)
  // Returning 0 rejects the drop (we return 0).
  // TODO(asm-ambiguous): the chain *(m_pPlayer+0x60)→+0xb4 is engine-
  // specific; the exact entity/method name is unknown. The calling
  // convention here looks __cdecl (no `mov ecx, eax` to set `this`; the
  // caller cleans up 16 bytes after the call).
  const player = this.m_pPlayer;
  if (player !== null) {
    const allowed: number = (player as any).onWeaponDrop(player);
    if (allowed === 0) {
      return 0;
    }
  }

  // If the dropped slot was the active weapon (this->m_iActiveWeapon at
  // offset 0xc8), switch to a replacement or holster per selectBetter.
  // TODO: m_iActiveWeapon field name at offset 0xc8 not yet mapped.
  if ((this as any).m_iActiveWeapon === slotIndex) {
    if (selectBetter) {
      this.GetBetterWeapon(slotIndex);
    } else {
      this.HolsterWeapon();
    }
  }

  return 1;
}
```
