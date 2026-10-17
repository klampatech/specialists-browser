```typescript
/**
 * CTSGunUci::AddAmmo — adds `amount` rounds of `ammoType` to the weapon's
 * ammo count, clamped to the per-ammo-type maximum carry.
 *
 * @param this      The CTSGun entity instance (this in the original C++)
 * @param ammoType  Ammo type index; only 0..0xf are accepted
 * @param amount    Number of rounds to add; must be > 0
 * @returns         1 on success (ammo added, possibly clamped), or 0 if
 *                  the type is out of range, the amount is non-positive,
 *                  or the ammo count is already at the per-type maximum
 */
export function AddAmmo(
  this: CTSGunUci,
  ammoType: number,
  amount: number,
): number {
  // Reject out-of-range ammo type or non-positive amount.
  if (ammoType > 0xf || amount <= 0) {
    return 0;
  }

  // Per-ammo-type max carry lives in a global ammo info table indexed by
  // ammoType. Each entry is 56 bytes; the max carry is the first dword at
  // entry offset 0xc. The table itself is reached via PIC/GOT.
  // TODO: identify the actual symbol for this ammo info table.
  const ammoInfoBase: any = AMMO_INFO_BASE;
  const entryStride = 56;
  const maxAmmo = (ammoInfoBase + 0xc)[ammoType * entryStride];

  // Current ammo count for this type lives at this+0xd4 indexed as a
  // dword array by ammoType. The field name is inferred from the offset
  // pattern (this + ammoType*4 + 0xd4), typical of an `m_iAmmo`-style array.
  // TODO(asm-ambiguous): confirm the CTSGun field name at offset 0xd4.
  const currentAmmo = this.ammoCounts[ammoType];

  // Refuse to add if we're already at or above the per-type max.
  if (currentAmmo >= maxAmmo) {
    return 0;
  }

  // Add the requested amount.
  const newCount = currentAmmo + amount;
  this.ammoCounts[ammoType] = newCount;

  // Clamp to the per-type max if we overshot.
  if (newCount > maxAmmo) {
    this.ammoCounts[ammoType] = maxAmmo;
  }

  return 1;
}
```
