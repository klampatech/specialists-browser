/**
 * CTSShotgunWeapon::GetWeapon — pickup handler invoked when an entity
 * picks up a shotgun weapon from the ground.
 *
 * Behaviour (from the asm):
 *   1. If `this->pev->byte_at_0x118 & 0x80` is set, skip the pickup.
 *   2. Delegate to CTSGroundWeapon::GetWeapon (called as a method on
 *      `this`, with `pEntity` as the explicit CBaseEntity*).
 *   3. Re-check the same flag; if set, dispatch through a function-
 *      pointer table at `this+0x60` (entry at offset 0x11c) and cache
 *      the returned weapon-type id at `this+0xa4`.
 *   4. Resolve the weapon-info struct via `get_weapon_info(cached_id)`
 *      and dispatch a global at `[GOT+0x1aa8]+0x8` with
 *      `(this->pev->field_at_0x208, weaponInfo + 0x1f2)`.
 */
export function GetWeapon(this: CTSShotgunWeapon, pEntity: CBaseEntity): void {
  // 1. Early-out: skip the pickup if `this` is flagged at pev+0x118.
  if (((this.pev as any)[0x118] & 0x80) !== 0) {
    return;
  }

  // 2. Delegate to the parent class. The asm pushes (pEntity, this)
  // right-to-left, which at the callee yields (this, pEntity) — i.e.,
  // a method call with `this` bound.
  groundWeaponGetWeapon.call(this, pEntity);

  // 3. If `this` is now flagged, fetch its weapon-type id via a
  // virtual dispatch and cache it at field offset 0xa4.
  if (((this.pev as any)[0x118] & 0x80) !== 0) {
    // TODO(asm-ambiguous): `this+0x60` is treated as a function-pointer
    // table (likely a TS-specific vtable). The entry at offset 0x11c is
    // called with `this` as the receiver; the returned value is cached.
    const vtable = (this as any)[0x60] as {
      [offset: number]: (self: any) => number;
    };
    (this as any)[0xa4] = vtable[0x11c](this);
  }

  // 4. Look up the TS weapon-info struct for the cached weapon-type id,
  // then dispatch through a global function table to apply the pickup
  // effect.
  // TODO(asm-ambiguous): `this->pev+0x208` is a TS-specific field whose
  // meaning is unclear from this chunk alone.
  const receiver = (this.pev as any)[0x208];
  // TODO(asm-ambiguous): the global at GOT+0x1aa8 (represented here as
  // a stand-in slot on `globalThis`) holds a function-pointer table;
  // the entry at byte offset 0x8 is called with (receiver, info+0x1f2).
  const funcTable = (globalThis as any)[0x1aa8] as Array<
    (receiver: any, info: number) => void
  >;
  const info = getWeaponInfo((this as any)[0xa4]);
  funcTable[2](receiver, info + 0x1f2);
}
