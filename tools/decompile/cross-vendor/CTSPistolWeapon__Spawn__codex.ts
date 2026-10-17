```typescript
/**
 * CTSPistolWeapon::Spawn — resolve the owning player's pistol variant, store
 * it on the weapon, then delegate placement to CTSGroundWeapon::Spawn.
 *
 * @param this  The CTSPistolWeapon entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSPistolWeapon): void {
  // Resolve the pistol variant by dispatching a method on the owning player.
  // `this->m_pOwner` (offset 0x60) is dereferenced, then a call is made
  // through offset 0x11c with `this` as the explicit argument.
  // TODO(asm-ambiguous): the dispatch through owner+0x11c is a TS extension
  // (vtable slot or function-pointer member). Exact semantics (random pick,
  // player class, loadout) are not recoverable from this chunk alone.
  // TODO: offset 0x60 purpose inferred as m_pOwner; offset 0xa4 inferred as
  // the pistol variant id (m_iPistolType).
  const owner = this.m_pOwner;                          // [esi+0x60]
  const variant = owner.getPistolVariant(this);         // call [eax+0x11c]
  this.m_iPistolType = variant;                         // store at [esi+0xa4]

  // Non-virtual call to CTSGroundWeapon::Spawn for ground-weapon placement.
  // Forward-declared helper — the original is a PLT-resolved external call.
  // TODO: import or define Spawn_CTSGroundWeapon.
  Spawn_CTSGroundWeapon(this);
}
```
