/**
 * CTSShotgunWeapon::Spawn — Spawn the shotgun weapon entity.
 *
 *   1. Dispatch a virtual initializer through the sub-object at
 *      `this+0x60`, with `this` as the explicit argument. Stash
 *      the returned pointer at `this+0xa4`.
 *   2. Delegate to CTSGroundWeapon::Spawn(this) for the parent
 *      class's spawn behavior.
 *
 *   Note: `this+0x60` is a vtable-bearing sub-object (offset 0x11c
 *   is a virtual slot), NOT `pev` — `entvars_t` has no vtable.
 *   Field identity will be resolved in D.4 against the class
 *   layout.
 *
 * @param this  The CTSShotgunWeapon entity instance
 * @returns     void
 */
export function Spawn(this: any): void {
  // PIC/GOT base is set up by the compiler at function entry
  // (call $+5; pop ebx; add ebx, 0xac892) but no [ebx ± k] global
  // access follows in this body, so the GOT base is unused here.

  // 1. Virtual call through this+0x60's vtable slot 0x11c, with
  //    `this` as the explicit receiver. Store the result at this+0xa4.
  this[0xa4] = this[0x60][0x11c](this);

  // 2. Delegate to CTSGroundWeapon::Spawn(this). PLT-resolved
  //    parent call — this is the calling convention for a
  //    non-virtual base-class method invocation in this build.
  (CTSGroundWeapon as any).Spawn(this);
}
