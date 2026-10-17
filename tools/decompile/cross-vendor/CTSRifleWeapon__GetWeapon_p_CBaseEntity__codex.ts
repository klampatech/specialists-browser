```typescript
/**
 * CTSRifleWeapon::GetWeapon — equips the rifle to a player entity. Bails
 * on a sign-set status byte; otherwise delegates to CTSGroundWeapon::
 * GetWeapon, then refreshes a cached weapon value and sets the player's
 * model from the resolved weapon_info struct.
 *
 * @param this     The CTSRifleWeapon instance.
 * @param pEntity  The entity interacting with the weapon (the player).
 * @returns        void
 */
export function GetWeapon(this: CTSRifleWeapon, pEntity: CBaseEntity): void {
  // Bail if the status byte is sign-flag set.
  // TODO(asm-ambiguous): identify this.field_0 and the byte's purpose.
  if (this.field_0[0x118] < 0) return;

  // Delegate to the ground-weapon base class.
  CTSGroundWeapon.prototype.GetWeapon.call(this, pEntity);

  // Re-check after parent: if sign-set, refresh the cached weapon value.
  // TODO(asm-ambiguous): vtable index 0x47 (offset 0x11c) on this.field_0x60.
  if (this.field_0[0x118] < 0) {
    this.field_0xa4 = (this.field_0x60 as any).vtable[0x47](this);
  }

  // Look up weapon_info, then push its model-name field into a setter
  // on the player entity.
  // TODO(asm-ambiguous): GOT+0x1aa8 (function table?), 0x1f2 (model name?).
  const target = this.field_0[0x208];
  const setter = (GOT_0x1aa8 as any);
  const info = get_weapon_info(this.field_0xa4);
  (setter as any).vtable[2](target, (info as number) + 0x1f2);
}
```
