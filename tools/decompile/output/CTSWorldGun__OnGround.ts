/**
 * CTSWorldGun::OnGround — Called by the engine once a thrown weapon
 * pickup settles on a surface. Re-snaps the entity to its current
 * origin (so UTIL_SetOrigin's wrapper re-traces it down to the
 * underlying floor), sizes the entity to the ground-rest bounding
 * box read from data-segment globals, and writes four class-instance
 * dwords that the pickup / respawn chain reads later.
 *
 * @param this  The CTSWorldGun entity instance (`this` in the
 *              original C++)
 * @returns     void
 */

// --- stubs so this snippet compiles in isolation -----------------
type Vector = [number, number, number];
declare function UTIL_SetOrigin(pev: any, origin: Vector): void;
declare function UTIL_SetSize(pev: any, mins: Vector, maxs: Vector): void;
declare const __GROUND_MINS_UNIFORM: number;   // [data - 0x6b68c]
declare const __GROUND_MAXS_XZ:     number;   // [data - 0x6b688]
declare const __GROUND_MAXS_Y:      number;   // [data - 0x6f408]
declare const __LAY_FLAT_VALUE:     number;   // [data + 0x133c]
// ----------------------------------------------------------------export function OnGround(this: any /* CTSWorldGun */): void {
  const pev: any = this.pev;

  // Two writes into the pev block at offsets 0x198 and 0x10c; field
  // names TBD in D.4.
  // TODO(asm-ambiguous): map these to named pev fields once the
  // entvars layout dump (D.1) lands.
  pev.__0x198 = 0;
  pev.__0x10c = 1;

  // Re-set origin to itself; the engine-side UTIL_SetOrigin wrapper
  // is responsible for the actual ground-trace side effect.
  UTIL_SetOrigin(pev, pev.origin);

  // Ground-rest mins is a uniform scalar applied to x/y/z; maxs
  // splits xz (horizontal) from y (vertical). HL coordinate space
  // uses Z-up, so "XZ" = horizontal plane.
  const minsScalar = __GROUND_MINS_UNIFORM;
  const maxsXZ     = __GROUND_MAXS_XZ;
  const maxsY      = __GROUND_MAXS_Y;
  const mins: Vector = [minsScalar, minsScalar, minsScalar];
  const maxs: Vector = [maxsXZ,     maxsXZ,     maxsY];
  UTIL_SetSize(pev, mins, maxs);

  // Four class-instance dword stores at offsets 0xc, 0x10, 0x14, 0x18.
  // Order is shuffled from the asm, but the writes are independent.
  // TODO(asm-ambiguous): these are CTSWorldGun-instance fields —
  // TBD once the class layout (D.4) is reconstructed.
  this.__0xc  = 0x00460000;
  this.__0x10 = 0x60;
  this.__0x14 = 0xffff0000;
  this.__0x18 = __LAY_FLAT_VALUE;
}
