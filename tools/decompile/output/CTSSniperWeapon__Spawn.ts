// Minimal type stubs so the decompiled function compiles in
// isolation. Full definitions belong to the D.4 class-
// reconstruction task; per checklist item 8 we use `any`-shaped
// interfaces here rather than importing the full class.
interface CTSSniperWeapon {
  // TODO(asm-ambiguous): field at offset 0xa4. Purpose (weapon
  // id, ammo type, classification, ...) is not derivable from
  // the disassembly alone; will be resolved in D.4 via cross-
  // reference with TS gameplay class layouts.
  field_0xa4: number;
}

interface CTSGroundWeapon {
  Spawn(self: CTSSniperWeapon): void;
}

/**
 * CTSSniperWeapon::Spawn — write 0x12 (18) into this->field_0xa4,
 * then delegate the rest of the spawn to CTSGroundWeapon::Spawn.
 *
 * @param this  The CTSSniperWeapon entity instance (the implicit
 *              `this` in the original C++ __thiscall)
 * @returns     void
 */
export function Spawn(this: CTSSniperWeapon): void {
  this.field_0xa4 = 0x12;
  CTSGroundWeapon.Spawn(this);
}
