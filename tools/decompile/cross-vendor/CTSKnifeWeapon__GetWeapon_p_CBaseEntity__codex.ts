```typescript
/**
 * CTSKnifeWeapon::GetWeapon — knife-specific GetWeapon logic.
 *
 * Guards on the high bit of pev->button, delegates to the parent class's
 * GetWeapon (CTSGroundWeapon::GetWeapon), then conditionally performs a
 * sub-object vtable call and a weapon-info sync hook.
 *
 * @param this    The CTSKnifeWeapon instance
 * @param pEntity The target CBaseEntity
 * @returns void
 */
export function GetWeapon(this: CTSKnifeWeapon, pEntity: CBaseEntity): void {
  // First dword of pEntity is pev (entvars_t*).
  const pev = pEntity.pev;

  // Guard: if the sign bit (0x80) of pev->button (offset 0x118) is set,
  // return early.
  // TODO(asm-ambiguous): which flag sets bit 0x80 of pev->button?
  if ((pev.button & 0x80) !== 0) {
    return;
  }

  // Delegate to CTSGroundWeapon::GetWeapon(pEntity).
  superGetWeapon(this, pEntity);

  // Re-read pev (the compiler reloads it after the parent call).
  const pevReload = pEntity.pev;

  // Re-check the same flag. If now set, invoke a vtable method on the
  // sub-object reachable from pEntity at offset 0x60 (function pointer
  // at offset 0x11c) and store its result back into pEntity at offset
  // 0xa4.
  if ((pevReload.button & 0x80) !== 0) {
    // TODO: what is pEntity->field_0x60? (likely a player or related
    //       sub-object; its vtable entry at 0x11c is invoked as
    //       `subObject->fn(pEntity)` with `this = subObject`.)
    const subObject = pEntity.field_0x60;
    const result = subObject["0x11c"](pEntity);
    pEntity.field_0xa4 = result;
  }

  // Always (after the parent call):
  //   1. Load a reference from pev at offset 0x208 (likely a model or
  //      weapon-related entity pointer — sits past entvars_t in TS, so
  //      this may be a TS-extended field on pEntity's first pointer).
  //   2. Load a singleton from the GOT at offset 0x1aa8 (likely the
  //      engine's weapon-info table or interface).
  const modelRef = pevReload["0x208"];
  const weaponInfoSingleton = globalGOT["0x1aa8"];

  // Look up weapon info by the stored id (pEntity->field_0xa4).
  const weaponInfo = get_weapon_info(pEntity.field_0xa4);

  // Call the singleton's vtable[1] (function pointer at offset 0x8)
  // with (modelRef, &weaponInfo->field_0x1f2). Probably a "send weapon
  // info to the client" hook for the knife's weapon data.
  weaponInfoSingleton["0x8"](modelRef, weaponInfo + 0x1f2);
}
```
