```typescript
/**
 * CTSShotgunWeapon::GetWeapon — pickup handler invoked when an entity picks
 * up a shotgun weapon from the ground.
 *
 * Behaviour:
 *   1. If `pEntity->pev->flags & 0x80` (a kill-queue / notarget-style *      marker) is set, skip the pickup entirely.
 *   2. Delegate to CTSGroundWeapon::GetWeapon for shared ground-weapon
 *      pickup logic. The disassembly shows the parent invoked with two
 *      args; the second arg's purpose is not reflected in the demangled
 *      signature and is read from the caller's stack slot just past
 *      `pEntity`.
 *   3. Re-check the same flag. If now set, dispatch a virtual method on
 *      `pEntity` (via a function-pointer table at field offset 0x60,
 *      entry at 0x11c) and cache the returned weapon-type id at field
 *      offset 0xa4.
 *   4. Always: resolve the TS weapon-info struct for the (cached)
 *      weapon-type id via `get_weapon_info`, then dispatch through a
 *      global function table (`GOT+0x1aa8`, function index 2) passing
 *      `(receiver, weaponInfo + 0x1f2)`, where `receiver = pEntity->pev
 *      + 0x208` (a TS-specific field) and `0x1f2` is an offset into the
 *      TSWeaponInfo struct (likely a sound or string field).
 *
 * @param this    The CTSShotgunWeapon instance being picked up
 * @param pEntity The CBaseEntity (typically a player) picking up the weapon
 * @returns       void
 */
export function GetWeapon(this: CTSShotgunWeapon, pEntity: CBaseEntity): void {
  // 1. Early-out: skip the pickup if the entity is flagged for removal.
  if ((pEntity.pev.flags & 0x80) !== 0) {
    return;
  }

  // 2. Delegate to the parent class.
  // TODO(asm-ambiguous): the parent is called with two args. The
  // demangled signature only shows `p CBaseEntity`; the second arg is
  // read from the caller's stack slot just past pEntity — its type and
  // purpose are unclear from this chunk alone.
  groundWeaponGetWeapon(pEntity, /* TODO: second arg */ undefined as any);

  // 3. If the entity is now flagged for removal, query its weapon-type
  // id via a virtual dispatch and cache it at field offset 0xa4.
  if ((pEntity.pev.flags & 0x80) !== 0) {
    // TODO(asm-ambiguous): `pEntity+0x60` is treated as a function-pointer
    // table (likely a TS-specific vtable). The entry at offset 0x11c is
    // called with `this = pEntity`, and the returned value is stored.
    const vtable = (pEntity as any)[0x60] as {
      [offset: number]: (self: any) => number;
    };
    (pEntity as any)[0xa4] = vtable[0x11c](pEntity);
  }

  // 4. Look up the TS weapon-info struct for the cached weapon-type id,
  // then dispatch through a global function table to apply the pickup
  // effect.
  // TODO(asm-ambiguous): `pev+0x208` is a TS-specific field whose meaning
  // is unclear from this chunk (likely the player receiving the weapon).
  const receiver = (pEntity.pev as any)[0x208];
  // TODO(asm-ambiguous): the global at GOT+0x1aa8 is treated as a
  // function-pointer table; the entry at index 2 (offset 0x8) is called.
  const funcTable = (globalThis as any)[0x1aa8] as Array<
    (receiver: any, info: number) => void
  >;
  const info = getWeaponInfo((pEntity as any)[0xa4]);
  funcTable[2](receiver, info + 0x1f2); // 0x1f2 = offset into TSWeaponInfo
}
```
