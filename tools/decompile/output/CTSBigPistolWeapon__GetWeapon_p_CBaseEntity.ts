/**
 * CTSBigPistolWeapon::GetWeapon — handles pickup/getter logic for the
 * "Big Pistol" weapon variant. It (1) short-circuits when a one-byte flag
 * in a sub-object is set, (2) delegates to CTSGroundWeapon::GetWeapon,
 * (3) optionally refreshes the cached weapon id via a sub-manager's
 * virtual method, then (4) dispatches a notification through a global
 * function-table hook.
 *
 * Decompiled from the 32-bit MSVC-style cdecl body in `ts/dlls/ts_i386.so`.
 * Stack convention: implicit `this` followed by explicit `pEntity`.
 *
 * @param this    The CTSBigPistolWeapon instance (implicit `this` in the original C++) — TODO: type defined in D.4
 * @param pEntity The entity receiving the weapon (CBaseEntity*) — TODO: type defined elsewhere
 * @returns void
 */
export function GetWeapon(this: any, pEntity: any): void {
  // If a flag byte at this.field_0x0 + 0x118 has its high bit set
  // (signed-byte test via `cmp BYTE PTR [...], 0; js`), do nothing and
  // return. The same check is repeated below to gate the sub-manager call.
  // TODO(asm-ambiguous): exact meaning of this.field_0x0.field_0x118 unclear.
  if ((this.field_0x0.field_0x118 & 0x80) !== 0) return;

  // Hand off to CTSGroundWeapon::GetWeapon with the same (this, pEntity).
  // TODO: declared in companion decompilation file.
  CTSGroundWeapon_GetWeapon(this, pEntity);

  // If the flag has become set (presumably populated by the parent), invoke
  // the virtual method at vtable slot 0x11c/4 = 0x47 on the sub-manager at
  // this.field_0x60 (ECX = this.field_0x60, stack arg = `this`) and cache
  // the returned weapon id in this.field_0xa4.
  // TODO(asm-ambiguous): semantics of the re-check and the vtable slot unclear.
  if ((this.field_0x0.field_0x118 & 0x80) !== 0) {
    this.weaponId = this.field_0x60.vtable[0x47](this);
  }

  // Resolve the weapon-info struct by id, then dispatch to the global
  // hook table (loaded from the GOT at +0x1aa8) by calling its slot-2
  // entry with (this.field_0x0.field_0x208, weaponInfo + 0x1f2).
  // TODO(asm-ambiguous): the 0x1f2 offset within the weapon-info struct.
  const weaponInfo = get_weapon_info(this.weaponId);
  globalWeaponHookTable.slot2(this.field_0x0.field_0x208, weaponInfo + 0x1f2);
}