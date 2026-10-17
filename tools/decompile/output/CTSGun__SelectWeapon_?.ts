/**
 * CTSGun::SelectWeapon — Attempt to switch this gun to the given
 * weapon. Returns true if the active weapon changed, false if no swap
 * happened (already holding it, out of range, or unavailable).
 *
 * Demangled: `CTSGun::SelectWeapon(?)` — param type unknown, compared
 * as a 32-bit int in the disassembly. Treat as a `tsweapon_t` enum
 * by ordinal.
 */
export function SelectWeapon(this: any, weapon: number): boolean {
  // Same-weapon guard — [this + 0xc8] holds the active weapon slot.
  if (this.m_currentWeapon === weapon) {
    return false;
  }

  // Range guard — `weapon > 0x25` (37) is rejected.
  // TODO(asm-ambiguous): confirm 0x25 == TS_LAST_WEAPON or similar.
  if (weapon > 0x25) {
    return false;
  }

  // Two availability flags must both be non-zero for a normal swap:
  //   * per-entity flag at  [this + 0x114 + weapon * 0x38]   (byte)
  //   * global registry at [GOT + 0x7d30 + weapon * 0x3DC] (byte)
  // The0x38 / 0x3DC strides are struct sizes, not 1-byte element
  // arrays — only byte-offset-0 of each struct is being read.
  // TODO(asm-ambiguous): confirm field/global names against CTSGun
  //   layout and the mod's weapon registry.
  const perEntitySlot = this.m_WeaponData[weapon] !== 0;
  const globalSlot = g_WeaponRegistry[weapon] !== 0;

  // Selection is permitted when both flags are set, OR as a
  // special-case fallthrough when weapon === 0 (the bare-hands slot
  // is always selectable regardless of the flags).
  const canSelect = (perEntitySlot && globalSlot) || weapon === 0;
  if (!canSelect) {
    return false;
  }

  // Swap: holster what we're currently holding, then record the new
  // active slot. The disassembly pads the stack with `sub esp, 0xc`
  // before pushing `this` — a 32-bit MSVC stack-alignment quirk;
  // semantically a normal thiscall.
  this.HolsterWeapon();
  this.m_currentWeapon = weapon;
  return true;
}

// Globals (defined elsewhere in the mod) — stubbed so this file
// compiles in isolation. Replace with the real type when D.4 wires
// up the weapon registry.
declare const g_WeaponRegistry: any;
