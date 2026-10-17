```typescript
/**
 * CTSFlag::OnGround — Called when a thrown flag has landed and come to rest * on a surface. Clears the in-flight bit on pev, sets the grounded bit,
 * re-anchors the entity's origin to its current value (forcing an engine
 * resync), sets the resting bounding box from globals, and resets * CTSFlag-specific flight-state fields to their resting values.
 *
 * @param this  The CTSFlag entity instance (this in the original C++)
 * @returns    void
 */
export function OnGround(this: CTSFlag): void {
  // Clear "in flight" state on the engine variables
  // TODO(asm-ambiguous): pev offset 0x198 has no analogue in stock HL1
  // entvars.h — likely a TS-specific per-entity flight flag
  this.pev[0x198] = 0;

  // Mark the flag as grounded / at rest
  // TODO(asm-ambiguous): pev offset 0x10c has no analogue in stock HL1
  // entvars.h — likely a TS-specific per-entity ground-state flag
  this.pev[0x10c] = 1;

  // Re-apply current origin (triggers engine resync / bookkeeping — the
  // second arg is `pev + 0x8`, i.e. `&pev->origin`, so the call writes
  // origin back to itself)
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // Set the resting bounding box from TS globals (loaded via [ebx ± k]
  // after the PIC/GOT base computation: minSize first, then maxSize)
  const minSize = new Vector(
    G_FLAG_REST_MIN_X,
    G_FLAG_REST_MIN_X,
    G_FLAG_REST_MIN_Z,
  );
  const maxSize = new Vector(
    G_FLAG_REST_MAX_X,
    G_FLAG_REST_MAX_X,
    G_FLAG_REST_MAX_Z,
  );
  UTIL_SetSize(this.pev, minSize, maxSize);

  // Reset CTSFlag flight-state fields to their resting values
  // TODO(asm-ambiguous): offsets 0xc, 0x10, 0x14, 0x18 are CTSFlag-
  // specific fields whose meaning is unclear from the assembly alone.
  // The bit patterns (0xffff0000, 0x00004600, 0x60) do NOT correspond
  // to sensible IEEE 754 float values (0xffff0000 is NaN, the others
  // are tiny subnormals) so these are likely packed fixed-point shorts,
  // animation state, or sequence indices rather than raw velocity.
  this[0xc]  = 0x00004600;
  this[0x10] = 0x60;
  this[0x14] = 0xffff0000;
  this[0x18] = G_FLAG_REST_GROUND_VALUE;
}
```
