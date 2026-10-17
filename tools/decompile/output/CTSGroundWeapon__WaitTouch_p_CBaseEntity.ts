// Minimal type stubs so the snippet compiles in isolation.
// Real definitions live in D.4 (TS gameplay) and D.5 (engine types).
type CBaseEntity = any;
type CTSGroundWeapon = any;

/**
 * CTSGroundWeapon::WaitTouch — handle a touch event on a ground weapon.
 *
 * If the weapon's field at offset 0xa4 equals 0x1d (likely a pickup-
 * readiness state, weapon type ID, or classification), invoke a
 * virtual method on the weapon's dispatch table — vtable index 0x46,
 * accessed via the dispatch-table pointer at offset 0x60 — passing
 * `this` and the toucher (`pOther`) as arguments. Otherwise no-op.
 *
 * Demangled: `CTSGroundWeapon::WaitTouch(CBaseEntity*)`
 * Address:   0x000926cc (40 bytes, `ts/dlls/ts_i386.so`)
 *
 * @param this     The CTSGroundWeapon entity (the weapon on the ground)
 * @param pOther   The entity that touched the weapon
 *
 * TODO(asm-ambiguous): offset 0xa4 — semantic unclear; likely a
 *   pickup-readiness state, weapon type ID, or classification field.
 * TODO(asm-ambiguous): [edx+0x60] is a vtable pointer for some
 *   base-class subobject; vtable index 0x46 (offset 0x118) is the
 *   dispatched virtual method. Without the full TS mappable, the
 *   semantic of this call is unclear.
 */
export function WaitTouch(this: CTSGroundWeapon, pOther: CBaseEntity): void {
  if ((this as any).field_a4 === 0x1d) {
    const vtable = (this as any).field_60 as Record<
      number,
      (self: CTSGroundWeapon, other: CBaseEntity) => void
    >;
    vtable[0x46](this, pOther);
  }
}
