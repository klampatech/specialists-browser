/**
 * CTSRifleWeapon::GetWeapon — equips the rifle to a player entity.
 *
 * Behavior (from disassembly @ 0x000b974c, 138 B):
 *   1. If pev->byte_0x118 has the sign bit set, bail out.
 *   2. Delegate to CTSGroundWeapon::GetWeapon for base pickup work.
 *   3. Re-check pev->byte_0x118; if it's now sign-set, refresh the
 *      cached weapon id by calling m_pOwner's vtable[0x47] (offset
 *      0x11c — i.e. "GetActiveWeapon" or equivalent).
 *   4. Look up weapon_info for the cached id, then push its *     model-name field (offset 0x1f2 in the struct) into a setter on
 *     the player entity via the entity-utils global.
 *
 * @param this The CTSRifleWeapon instance (ebp in the disasm).
 * @param pEntity  The entity picking up the rifle.
 */
export function GetWeapon(
  this: CTSRifleWeapon,
  pEntity: CBaseEntity
): void {
  // (1) Early-out if the entity's status byte has the sign bit set.
  // TODO(decompile): pev->deadflag or similar status flag at +0x118.
  if (this.pev.byte_0x118 < 0) return;

  // (2) Delegate to the ground-weapon base class.
  CTSGroundWeapon.prototype.GetWeapon.call(this, pEntity);

  // (3) If the parent call flipped the status byte to sign-set,
  // refresh the cached weapon id from the owning entity.
  // TODO(decompile): m_pOwner->GetActiveWeapon() (vtable slot 0x47).
  if (this.pev.byte_0x118 < 0) {
    this.m_iId = this.m_pOwner.vtable[0x47]();
  }

  // (4) Resolve weapon_info, then set the entity's model from the
  // weapon_info's model-name field (offset 0x1f2).
  // TODO(decompile): gEntityUtils is the GOT[+0x1aa8] singleton;
  // vtable slot 2 = "set model on entity".
  const target: CBaseEntity = this.pev.field_0x208;
  const info: WeaponInfo = get_weapon_info(this.m_iId);
  gEntityUtils.vtable[2](target, info.modelname);
}
