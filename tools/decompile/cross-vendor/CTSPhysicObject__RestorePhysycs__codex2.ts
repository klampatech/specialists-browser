// Stub class so this file compiles in isolation; replaced by the real
// declaration in D.4.
declare class CTSPhysicObject {
  pev: any;
  m_vecSavedOrigin: any;
  m_vecSavedAngles: any;
  m_flSavedScalar: any;
  m_iPhysFlag: any;
}

/**
 * CTSPhysicObject::RestorePhysycs — copy the saved origin/angles/scalar
 * back onto live pev, refresh both saved-vec3s from a globally-tracked
 * 12-byte vec3, then clear the in-flight scalar and flag. Bails early
 * when the saved origin is strictly ahead of the global in all three
 * axes (the engine already considers the entity past the snapshot).
 *
 * Source: tools/decompile/chunks/RestorePhysycs__15CTSPhysicObject.chunk.md
 * (196 B, GOT-relative access at [ebx+0x1888], three rep movsd copies,
 *  one dword copy, two single-dword clears).
 */
export function RestorePhysycs(this: CTSPhysicObject): void {
  // Global vec3 pointer at [static_base + 0x1888]. Typed `any` because
  // we don't yet know the underlying symbol.
  // TODO(asm-ambiguous): identity of this global — cross-reference
  // tools/decompile/analysis/strings-n5.txt for ts_slowmotion / slowamt
  // and similar physics cvars.
  const globalVec: any = currentPhysVec;

  const savedOrigin: any = this.m_vecSavedOrigin;
  if (
    savedOrigin.x > globalVec.x &&
    savedOrigin.y > globalVec.y &&
    savedOrigin.z > globalVec.z
  ) {
    // Bail: saved origin is strictly ahead of the global on every axis,
    // so the engine has already accepted the move — no restore needed,
    // and we deliberately leave the saved snapshot and flags alone.
    return;
  }

  // Apply the saved snapshot back onto live pev:
  //   pev+0x20  (origin, 12 B)              <- m_vecSavedOrigin
  //   pev+0x5c  (TS-specific field, 12 B)   <- m_vecSavedAngles
  //   pev+0x11c (TS-specific field, 1 dw)   <- m_flSavedScalar
  // TODO(asm-inferred): pev+0x5c / +0x11c meanings depend on TS's custom
  // entvars_t layout — not stock HLSDK offsets.
  // TODO(asm-inferred): the field names m_vecSavedOrigin / m_vecSavedAngles
  // / m_flSavedScalar are inferred from copy target semantics; verify
  // against the symbol table in D.4 before treating as canonical.
  const pev: any = this.pev;
  pev[0x20] = savedOrigin.x;
  pev[0x24] = savedOrigin.y;
  pev[0x28] = savedOrigin.z;
  pev[0x5c] = this.m_vecSavedAngles.x;
  pev[0x60] = this.m_vecSavedAngles.y;
  pev[0x64] = this.m_vecSavedAngles.z;
  pev[0x11c] = this.m_flSavedScalar;

  // Refresh both saved vec3s from the global current-physics-frame vec3.
  // In the disassembly, both rep movsd's load the same source (the dword
  // at [ebx+0x1888] is stashed at [esp+0x4] and reused for the second
  // copy). Two 12-byte copies, not a shared reference.
  // TODO(value-semantics): if m_vecSaved{Origin,Angles} end up typed as
  // Float32Array(3), replace `=` with `.set(globalVec)` to preserve
  // the 12-byte memcpy semantics.
  this.m_vecSavedOrigin = globalVec;
  this.m_vecSavedAngles = globalVec;

  // Clear the in-flight scalar and flag so the next SavePhysics starts
  // from a clean slate.
  this.m_flSavedScalar = 0;
  this.m_iPhysFlag = 0;
}
