```typescript
/**
 * CTSRifleWeapon::Spawn — Initialize rifle-specific weapon state, then
 * chain to CTSGroundWeapon::Spawn() for shared ground-weapon setup.
 *
 * Reads the pointer at `this+0x60`, invokes a virtual method on it at
 * vtable offset 0x11c (passing `this`), caches the returned value at
 * `this+0xa4`, then defers to the base class Spawn.
 *
 * @param this  The CTSRifleWeapon entity instance
 * @returns     void
 */
export function Spawn(this: CTSRifleWeapon): void {
  // Invoke the vtable method at offset 0x11c on the sub-object pointer
  // stored at this+0x60, passing `this` as the argument.
  // TODO(asm-ambiguous): exact field name for this+0x60 + the semantic
  // of the virtual call at vtable offset 0x11c are unknown without the
  // engine class layout for the sub-object (likely an item/weapon-info
  // lookup, but the precise name is not recoverable from this chunk).
  const lookup = (this.weaponInfo as any).vtable011c(this);

  // Cache the lookup result back on the entity at this+0xa4.
  this.weaponInfoHandle = lookup;

  // Delegate to the parent class' Spawn implementation.
  CTSGroundWeapon.Spawn(this);
}
```
