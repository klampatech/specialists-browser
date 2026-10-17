```typescript
/**
 * CTSPistolWeapon::GetWeapon — pick up a pistol from the world for the given entity.
 *
 * Flow:
 *   1. If this weapon is already marked for removal, abort.
 *   2. Delegate to CTSGroundWeapon::GetWeapon for the actual ground pickup.
 *   3. If this weapon was marked for removal during the parent call, ask its
 *      owner (probably the player) to refresh the cached weapon id and store
 *      it on this weapon.
 *   4. Push the weapon's display name to the engine for the player's HUD.
 *
 * @param this    The CTSPistolWeapon entity (cdecl: passed on the stack at [esp+0x20])
 * @param pEntity The entity picking up the pistol (typically a player; passed at [esp+0x24])
 * @returns       void (the assembly's return value in eax is the engine-call
 *                return or `pev` for the early-dead path; not used here)
 */
export function GetWeapon(
  this: CTSPistolWeapon,
  pEntity: CBaseEntity,
): void {
  // (1) Bail if this weapon is already marked for removal.
  // pev+0x118 is `deadflag` on entvars_t (an int); the assembly tests the
  // sign of its low byte (`cmp BYTE ... ; js`).
  if (this.pev.deadflag < 0) {
    return;
  }

  // (2) Delegate to CTSGroundWeapon::GetWeapon for the actual pickup.
  // Two stack args are pushed: this (ebp) and pEntity (re-read from
  // [esp+0x2c] after `sub esp, 0x8` — the second caller-pushed slot).
  // TODO(asm-ambiguous): the demangler shows the parent as taking 1 arg;
  // the extra push is either a hidden `this` arg (cdecl) or alignment junk.
  CTSGroundWeapon_GetWeapon(this, pEntity);

  // (3) If this weapon became invalid during the parent call, ask its owner
  //     (m_pOwner at offset 0x60) to refresh the cached weapon id.
  //     The owner's vtable slot at byte-offset 0x11c (= entry 0x47) is some
  //     owner-side notification method
  //     (TODO(asm-ambiguous): name this owner method).
  //     The owner's return value lands in m_iWeapon at offset 0xa4 on this.
  if (this.pev.deadflag < 0) {
    const newWeaponId = this.m_pOwner.vtable[0x47](this);
    this.m_iWeapon = newWeaponId;
  }

  // (4) Update the engine HUD with the new weapon's display name.
  // pev+0x208 is some per-entity field used as the "player handle"
  // (TODO(asm-ambiguous): name this field — likely beyond standard HL1 entvars).
  const playerHandle = this.pev.field_0x208;
  // get_weapon_info returns the weapon_info struct; its display-name string
  // sits at byte-offset 0x1f2.
  const weaponName = get_weapon_info(this.m_iWeapon) + 0x1f2;
  // [ebx+0x1aa8] is a global vtable-like dispatch table; entry #2
  // (byte-offset 0x8) is some engine function
  // (TODO(asm-ambiguous): identify the engine entry point).
  engineDispatch.vtable[2](playerHandle, weaponName);
}
```
