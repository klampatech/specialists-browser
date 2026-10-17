/**
 * CTSFlag::OnGround — Called when a thrown flag has landed and come
 * to rest on a surface. Clears the in-flight bit on pev, sets the
 * grounded bit, re-anchors the entity's origin to its current value
 * (forcing an engine resync), sets the resting bounding box from
 * globals, and resets CTSFlag-specific flight-state fields to their
 * resting values.
 *
 * @param this  The CTSFlag entity instance
 * @returns    void
 */
export function OnGround(this: any): void {
  // pev offsets 0x198 and 0x10c have no analogue in stock HL1
  // entvars.h — likely TS-specific per-entity flight / ground-state
  // flags. TODO(asm-ambiguous): resolve in D.4.
  const pev: any = this.pev;
  pev[0x198] = 0;            // clear in-flight
  pev[0x10c] = 1;            // mark grounded

  // Re-apply current origin (engine resync). `pev + 0x8` is `&pev->origin`.
  UTIL_SetOrigin(pev, pev.origin);

  // Resting bounding box: X reused for Y in both mins and maxs
  // (asm pattern at 0x8e261-0x8e28e loads one DWORD and writes it to
  // both x and y slots). Values come from unnamed GOT-relative globals
  // at `[ebx-0x6dec8]`, `[ebx-0x6f068]`, `[ebx-0x6cb5c]`, `[ebx-0x6f408]`.
  // TODO(asm-ambiguous): derive from strings-n5.txt / D.4.
  const minX = G_FLAG_REST_MIN_X;        // also serves as min.y
  const minZ = G_FLAG_REST_MIN_Z;
  const maxX = G_FLAG_REST_MAX_X;        // also serves as max.y
  const maxZ = G_FLAG_REST_MAX_Z;
  UTIL_SetSize(
    pev,
    new Vector(minX, minX, minZ),        // mins  (HLSDK: 2nd arg)
    new Vector(maxX, maxX, maxZ),        // maxs  (HLSDK: 3rd arg)
  );

  // CTSFlag-specific flight-state fields (offsets relative to `this`,
  // not pev). 0xffff0000 is -∞ as IEEE 754 single — almost certainly
  // NOT a float; likely packed flags / state. TODO(asm-ambiguous):
  // meanings of fields at 0xc, 0x10, 0x14, 0x18 are unknown. 0x18
  // is loaded from `[ebx+0x1f90]`.
  this[0xc]  = 0x00460000;              // asm produces 0x00460000 (NOT 0x00004600)
  this[0x10] = 0x60;                    // asm: mov cx,0x60; mov edx,ecx — assume edx high=0
  this[0x14] = 0xffff0000;
  this[0x18] = G_FLAG_REST_GROUND_VALUE;
}
