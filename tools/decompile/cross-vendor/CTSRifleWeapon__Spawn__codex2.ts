/**
 * CTSRifleWeapon::Spawn — Initialize rifle-specific weapon state, then
 * chain to CTSGroundWeapon::Spawn() for shared ground-weapon setup.
 *
 * Disassembly flow:
 *   esi = this                       (cdecl this-slot at [esp+0x10])
 *   eax = this->field_0x60           (pointer to an info/interface struct)
 *   eax = (*(fn*)(eax + 0x11c))(this)
 *   this->field_0xa4 = eax           (cache the returned pointer)
 *   CTSGroundWeapon::Spawn(this)
 *
 * @param this  The CTSRifleWeapon entity instance
 * @returns     void
 */
export function Spawn(this: any /* CTSRifleWeapon */): void {
  const self: any = this;

  // TODO(asm-ambiguous): field at this+0x60 — speculative name `weaponInfo`.
  // Pointer to a struct whose function pointer at offset 0x11c is invoked
  // with `this` as the argument.
  // TODO(asm-ambiguous): offset 0x11c is ~71 vtable entries; implausibly
  // large for a vtable slot — most likely a function pointer inside an
  // info/interface struct, not a true C++ vtable dispatch. Real name
  // and semantics not recoverable from this chunk alone.
  const lookup: any = (self.weaponInfo as any).fnPtr_0x11c(self);

  // TODO(asm-ambiguous): field at this+0xa4 — speculative name
  // `weaponInfoHandle`; caches the pointer returned by the call above.
  self.weaponInfoHandle = lookup;

  // Delegate to the parent class' Spawn implementation.
  // (CTSGroundWeapon is referenced but not declared here; declared in D.4.)
  (CTSGroundWeapon as any).Spawn(self);
}
