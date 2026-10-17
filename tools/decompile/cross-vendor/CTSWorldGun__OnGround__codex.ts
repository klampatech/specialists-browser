```typescript
/**
 * CTSWorldGun::OnGround — Called by the engine once a thrown weapon pickup
 * settles on a surface. Re-snaps the entity to its current origin (TS's
 * UTIL_SetOrigin wrapper re-traces down to the floor), sizes the entity to
 * the ground-rest bounding box from a global size table, and writes the
 * per-rest orientation dwords that the pickup / respawn chain reads later.
 *
 * @param this  The CTSWorldGun entity instance (this in the original C++)
 * @returns     void
 */
export function OnGround(this: any /* CTSWorldGun */): void {
  // pev is the entity's entvars_t* and lives at offset 0 of the class.
  const pev: any = this.pev;

  // Clear one entvars field and set another. Offsets 0x198 and 0x10c are
  // late-flex pev fields; the typical OnGround idiom is dropping a
  // movement/collision flag and re-arming a damage/solid flag.
  // TODO(asm-ambiguous): map these to named pev fields once the entvars
  // layout dump (D.1) lands.
  pev.__0x198 = 0;
  pev.__0x10c = 1;

  // Re-set origin to itself. The asm passes `&pev->origin` (offset 0x8
  // within entvars_t) as the Vector argument, so UTIL_SetOrigin's wrapper
  // re-traces the entity down to the underlying floor — exactly the
  // "settle me on whatever I'm standing on" semantics we want here.
  UTIL_SetOrigin(pev, pev.origin);

  // Build the ground-rest mins and maxs from data-segment globals. The mins
  // is a single uniform scalar applied to (x, y, z); the maxs split xz vs y,
  // suggesting a thin-ish pickup resting on its side.
  const minsScalar = __GROUND_MINS_UNIFORM; // [ebx - 0x6b68c]
  const maxsXZ     = __GROUND_MAXS_XY;      // [ebx - 0x6b688]
  const maxsY      = __GROUND_MAXS_Z;       // [ebx - 0x6f408]
  const mins: Vector = [minsScalar, minsScalar, minsScalar];
  const maxs: Vector = [maxsXZ,     maxsXZ,     maxsY];
  UTIL_SetSize(pev, mins, maxs);

  // Lay-flat orientation / state fields on the entity itself. Four
  // consecutive dword stores at offsets 0xc, 0x10, 0x14, 0x18 — three
  // immediate constants plus one data-segment global. The constants don't
  // fit cleanly into {Vector angles, RGB color, packed shorts} without
  // picking a specific fixed-point convention, so they go in as raw dwords.
  // TODO(asm-ambiguous): these are CTSWorldGun instance fields — TBD
  // once the class layout (D.4) is reconstructed.
  this.__0xc  = 0x00460000;
  this.__0x10 = 0x60;
  this.__0x14 = 0xffff0000;
  this.__0x18 = __LAY_FLAT_VALUE; // [ebx + 0x133c]
}
```
