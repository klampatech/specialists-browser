/**
 * CTSGun::DropWeapon — drop the weapon in the given slot; if it
 * was the active weapon, switch to a replacement (GetBetterWeapon)
 * or holster (HolsterWeapon) per `selectBetter`.
 *
 * Asm refs:
 *   - Valid slot range: 1..0x25 (37). Pattern:
 *       lea eax, [esi-0x1]; cmp eax, 0x24; ja fail
 *   - Slots are 56 bytes; slot table at this+0x114; first byte
 *     of each slot is the "has weapon" flag.
 *   - The dropped slot is zeroed (14 dwords = 56 bytes).
 *   - If this->m_pPlayer (offset 0x80) is non-null, a virtual
 *     validator is called as:
 *       edx = *(m_pPlayer + 0x60);  // vtable
 *       result = (*(edx + 0xb4))(m_pPlayer);
 *     A zero result rejects the drop.
 *   - If the dropped slot equals m_iActiveWeapon (offset 0xc8),
 *     run GetBetterWeapon(slot) when selectBetter, else
 *     HolsterWeapon().
 *   - Returns 1 on success, 0 on rejection.
 */

// CTSGun is provided by the harness; declared as `any` here so
// this snippet compiles in isolation per the D.3 review rules.
type CTSGun = any;

export function DropWeapon(
  this: CTSGun,
  slotIndex: number,
  selectBetter: boolean
): number {
  // Range check. Asm rejects (slotIndex - 1) > 0x24 unsigned,
  // i.e. slotIndex >= 0x26, so valid is 1..0x25 (37).
  if (slotIndex < 1 || slotIndex > 0x25) {
    return 0;
  }

  // Slot geometry: 56 bytes per slot, base offset 0x114.
  const slotOffset = 0x114 + slotIndex * 56;

  // Slot must be occupied (first byte != 0).
  if (this.mem.getUint8(slotOffset) === 0) {
    return 0;
  }

  // Zero the slot (asm: `cld; mov eax,0; mov ecx,0xe; rep stosd`).
  for (let i = 0; i < 14; i++) {
    this.mem.setUint32(slotOffset + i * 4, 0);
  }

  // Player-gated validator. Null m_pPlayer bypasses the call.
  // TODO(asm-ambiguous): the validator at vtable+0xb4 on
  // CBasePlayer is not yet identified by name; the lower-level
  // indirection is preserved here so a future D.4 pass can plug
  // in the real method (likely something like `CanDropWeapon` /
  // `AllowWeaponDrop`).
  const player = this.m_pPlayer as any;
  if (player !== null && player !== undefined) {
    // *(player + 0x60) is the vtable; [vtable + 0xb4] is the
    // virtual to call, with `player` as its sole argument.
    const vtable = player[0x60 / 4] as any;
    const fn = vtable[0xb4 / 4] as (self: any) => number;
    const allowed: number = fn.call(vtable, player);
    if (allowed === 0) {
      return 0;
    }
  }

  // If we dropped the active weapon, switch.
  // TODO: m_iActiveWeapon (offset 0xc8) field name not yet
  // mapped to a CTSGun member.
  if (this.m_iActiveWeapon === slotIndex) {
    if (selectBetter) {
      this.GetBetterWeapon(slotIndex);
    } else {
      this.HolsterWeapon();
    }
  }

  return 1;
}
