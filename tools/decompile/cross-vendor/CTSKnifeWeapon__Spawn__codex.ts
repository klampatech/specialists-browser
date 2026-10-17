```typescript
/**
 * CTSKnifeWeapon::Spawn — initializes the knife weapon entity by resolving
 * the matching owner-side knife via a vtable dispatch on the owning player,
 * caching it on this entity, then delegating the rest of the spawn
 * sequence to CTSGroundWeapon::Spawn.
 *
 * @param this  The CTSKnifeWeapon entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSKnifeWeapon): void {
  // PIC / GOT base computation (call $+5; pop ebx; add ebx, 0xac022)
  // is emitted by the prologue but never dereferenced in this body,
  // so it is elided here.

  // 1. Load the owning player. m_pPlayer lives at this+0x60.
  const owner = this.m_pPlayer;
  // 2. Virtual call through the player's vtable at slot 0x11c (entry 71)
  //    with `this` as the sole argument; the return is the player's
  //    matching knife weapon entity.
  const matchingKnife = owner.GetWeapon(this);
  // 3. Cache the resolved knife on this entity at offset 0xa4.
  this.m_pKnife = matchingKnife;

  // 4. Delegate standard weapon-on-ground setup to the parent class.
  // TODO(asm-ambiguous): the exact parent class in the chain is
  // CTSGroundWeapon per the symbol; deeper ancestry (CTSWeapon,
  // CBasePlayerItem, CBaseEntity) is not visible here.
  CTSGroundWeapon.Spawn(this);
}
```
