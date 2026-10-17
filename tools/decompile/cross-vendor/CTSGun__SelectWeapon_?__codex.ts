```typescript
/**
 * CTSGun::SelectWeapon — Attempt to switch this gun to the given weapon.
 * Returns true if the active weapon changed, false if no swap happened
 * (already holding it, out of range, or unavailable).
 *
 * @param this   The CTSGun entity instance (this in the original C++).
 * @param weapon The weapon slot to switch to (tsweapon_t — see TODO).
 * @returns      1 if the weapon was switched, 0 if the request was refused.
 */
export function SelectWeapon(
  this: CTSGun,
  // TODO(asm-ambiguous): original param type was demangled as `?` (likely
  // `tsweapon_t` enum, originally passed as an int). Compare as a number.
  weapon: number
): boolean {
  // Already holding this weapon — nothing to do.
  if (this.m_currentWeapon === weapon) {
    return false;
  }

  // Hard upper bound on the valid weapon index. The byte at [edi+0xc8]
  // is compared against weapon, and `weapon > 0x25` (37) is rejected.
  // TODO(asm-ambiguous): confirm 0x25 == 37 == TS_LAST_WEAPON or similar.
  if (weapon > 0x25) {
    return false;
  }

  // Two availability flags must both be non-zero for a normal swap:
  //   * per-entity slot flag at   [this + 0x114 + weapon * 0x38]   (byte)
  //   * global registry flag at  [ebx  + 0x7d30 + weapon * 0x3DC] (byte, GOT-relative)
  // The compiler expands the second index into the awkward
  //   `(weapon<<5 - weapon)<<3 - weapon) * 4 + 0x7d30`
  // pattern, but the net scale per weapon is 0x3DC = 988 bytes; that's
  // almost certainly a struct stride, not a literal byte offset.
  // TODO(asm-ambiguous): confirm which global registry this is (probably
  //   an array of per-weapon dynamic-state structs sized 0x3DC).
  const perEntitySlot = this.m_WeaponData[weapon] !== 0;       // byte at this + 0x114 + weapon*0x38
  const globalSlot    = g_WeaponRegistry[weapon] !== 0;         // byte at GOT + 0x7d30 + weapon*0x3DC

  // Selection is permitted when both flags are set, OR as a special-case
  // fallthrough when weapon === 0 (the bare-hands / null-weapon slot
  // is always selectable regardless of the flags).
  const canSelect = (perEntitySlot && globalSlot) || weapon === 0;
  if (!canSelect) {
    return false;
  }

  // Swap: holster what we're currently holding, then record the new active slot.
  // The disassembly passes `this` via stack (sub esp, 0xc; push edi) even
  // though 32-bit thiscall conventionally uses ECX — likely a stack-alignment
  // pad from the MSVC compiler. Semantically a normal HolsterWeapon(this) call.
  this.HolsterWeapon();
  this.m_currentWeapon = weapon;       // [this + 0xc8]
  return true;
}
```
