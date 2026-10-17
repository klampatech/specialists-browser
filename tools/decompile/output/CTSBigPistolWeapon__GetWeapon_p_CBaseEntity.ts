/**
 * CTSBigPistolWeapon::GetWeapon — handles pickup/getter logic for the
 * "Big Pistol" weapon variant.
 *
 * Decompiled from the 32-bit thiscall body in `ts/dlls/ts_i386.so`.
 *
 * NOTE on field bases: the disassembly accesses every field via
 * `ebp = pEntity`, never via ECX (i.e. never via `this`). The
 * C++-level `this` (the CTSBigPistolWeapon instance) is only handed
 * off to `CTSGroundWeapon::GetWeapon` in step (2); every read and
 * write below binds to `pEntity` (the CBaseEntity* arg).
 *
 * @param this    CTSBigPistolWeapon instance (thiscall ECX)
 * @param pEntity CBaseEntity* — entity receiving the weapon
 */
export function GetWeapon(this: any, pEntity: any): void {
  // (1) Early return if the high bit of pEntity->field_0_0.field_0x118
  //     is set (signed-byte test via `cmp BYTE PTR [...], 0; js`).
  // TODO(asm-ambiguous): exact meaning of field_0x118 unclear — likely
  // a pev-relative flag, but we don't yet know which one.
  if ((pEntity.field_0_0.field_0x118 & 0x80) !== 0) return;

  // (2) Delegate to CTSGroundWeapon::GetWeapon.
  // The disassembly does `push [esp+0x2c]; push ebp; call PLT` — two
  // stack args, but the demangled callee is `(p CBaseEntity)`. We keep
  // the (this, pEntity) shape and flag the second arg as ambiguous.
  // TODO(asm-ambiguous): what is `[esp+0x2c]` reading? Either a hidden
  // second parameter the demangler dropped, or a caller-stack value.
  CTSGroundWeapon_GetWeapon(this, pEntity);

  // (3) Re-test the flag. The second check uses `jns` (jump if not
  //     sign) which falls through when the byte is negative (high bit
  //     set). On fall-through, dispatch a virtual call on
  //     pEntity->field_0_60 (vtable slot 0x47 = offset 0x11c) and
  //     write the return value to pEntity->field_0xa4.
  // TODO(asm-ambiguous): vtable slot 0x47 exact semantics unclear.
  if ((pEntity.field_0_0.field_0x118 & 0x80) !== 0) {
    pEntity.weaponId = pEntity.field_0_60.vtable[0x47](pEntity);
  }

  // (4) Resolve the weapon-info struct, then dispatch through the
  //     global hook table at GOT+0x1aa8 (loaded into `esi`), invoking
  //     slot 0x8/4 = 2 with
  //     (pEntity->field_0_0.field_0x208, weaponInfo + 0x1f2).
  //     `edi` (= pEntity->field_0_0.field_0x208) is loaded before
  //     get_weapon_info and survives that call (cdecl preserves edi).
  // TODO(asm-ambiguous): the 0x1f2 offset inside weapon_info.
  const weaponInfo = get_weapon_info(pEntity.weaponId);
  globalWeaponHookTable.slot2(pEntity.field_0_0.field_0x208, weaponInfo + 0x1f2);
}
