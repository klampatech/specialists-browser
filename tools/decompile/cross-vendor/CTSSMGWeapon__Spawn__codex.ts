```typescript
/**
 * CTSSMGWeapon::Spawn — initializes the SMG weapon entity. Calls a virtual
 * method (at vtable slot 0x11c from the pointer at this+0x60) with `this`
 * as its sole argument and stores the result at this+0xa4, then delegates
 * the rest of the spawn logic to CTSGroundWeapon::Spawn.
 *
 * @param this  The CTSSMGWeapon entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSSMGWeapon): void {
  // TODO(asm-ambiguous): vtable pointer at this+0x60, vtable slot 0x11c,
  //   and the field stored at this+0xa4 have unknown semantics without
  //   engine/GoldSrc class context — likely a model-index or info-pointer
  //   lookup cached on the entity.
  (this as any)[0xa4] = ((this as any)[0x60] as any)[0x11c](this);

  // Delegate the remainder of spawn to the base class.
  CTSGroundWeapon.prototype.Spawn.call(this);
}
```
