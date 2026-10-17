```typescript
/**
 * CTSSniperWeapon::Spawn — write 0x12 (18) into this->field_0xa4, then
 * delegate the rest of the spawn to CTSGroundWeapon::Spawn.
 *
 * @param this  The CTSSniperWeapon entity instance
 * @returns     void
 */
export function Spawn(this: CTSSniperWeapon): void {
  // TODO(asm-ambiguous): the field at offset 0xa4 is written with 0x12 (18)
  // before the base-class spawn runs. Without the original TS source or the
  // rest of the class layout, the field's purpose (weapon id, ammo type,
  // classification, etc.) is not derivable from the disassembly alone.
  this.field_0xa4 = 0x12;

  // Delegate to CTSGroundWeapon::Spawn.
  // (PIC/GOT base is computed in the prologue but never read — no global
  //  cvar or singleton is touched here, so it does not affect behavior.)
  CTSGroundWeapon.Spawn(this);
}
```
