```typescript
/**
 * CTSPhysicObject::RestorePhysycs — restore the saved origin/angles/scalar
 * back to the live pev, refresh the saved snapshot from a globally-tracked
 * 3-float vector, and clear the in-flight flag. Bails early when the saved
 * origin has moved strictly past the global in every axis (engine already
 * considers the entity past the snapshot).
 *
 * @param this  The CTSPhysicObject entity instance (this in the original C++)
 * @returns     void
 */
export function RestorePhysycs(this: CTSPhysicObject): void {
  // Global 3-float vec3_t accessed via the GOT (offset 0x1888). Both
  // m_vecSavedOrigin and m_vecSavedAngles get refreshed from this same
  // vector at the end of the function.
  // TODO: cross-reference tools/decompile/analysis/strings-n5.txt to
  // identify the underlying global — likely a gameplay-wide "current
  // physics frame origin" updated by the physics tick.
  // TODO(asm-ambiguous): exact identity of this global pointer.
  const globalVec: any = currentPhysVec;

  const savedOrigin: any = this.m_vecSavedOrigin;

  // Bail when the saved origin is strictly ahead of the global in all 3
  // axes. For each axis, fcomp + fnstsw tests C3 (A > B); we fall through
  // to the next axis only when A > B, and ecx only becomes 1 when every
  // axis passed, at which point we early-return.
  if (
    savedOrigin.x > globalVec.x &&
    savedOrigin.y > globalVec.y &&
    savedOrigin.z > globalVec.z
  ) {
    return;
  }

  // Apply the saved physics snapshot back onto the live pev:
  //   pev+0x20  (origin, 12 bytes)                  <- m_vecSavedOrigin
  //   pev+0x5c  (likely avelocity or angles, 12 B)  <- m_vecSavedAngles
  //   pev+0x11c (single dword, meaning unclear)     <- m_flSavedScalar
  // TODO(asm-ambiguous): pev+0x5c field meaning depends on the TS build's
  // entvars_t layout — not a stock-HL SDK offset.
  // TODO(asm-ambiguous): pev+0x11c field meaning unclear from this chunk.
  const pev: any = this.pev;
  pev[0x20] = savedOrigin.x;
  pev[0x24] = savedOrigin.y;
  pev[0x28] = savedOrigin.z;
  pev[0x5c] = this.m_vecSavedAngles.x;
  pev[0x60] = this.m_vecSavedAngles.y;
  pev[0x64] = this.m_vecSavedAngles.z;
  pev[0x11c] = this.m_flSavedScalar;

  // Refresh the saved snapshot from the global current vec3_t (the same
  // 12 bytes are copied into both saved-origin and saved-angles) and clear
  // the in-flight scalar and flag so the next SavePhysics starts clean.
  this.m_vecSavedOrigin = globalVec;
  this.m_vecSavedAngles = globalVec;
  this.m_flSavedScalar = 0;
  this.m_iPhysFlag = 0;
}
```
