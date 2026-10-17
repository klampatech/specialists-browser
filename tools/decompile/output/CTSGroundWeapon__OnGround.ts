// Minimal external-symbol stubs so this snippet compiles on its own.
// In the real codebase these come from the engine-binding layer
// (engine/eiface.h equivalents) and the entity-class layer.
declare const UTIL_SetOrigin: (pev: any, origin: any) => void;
declare const UTIL_SetSize: (pev: any, mins: any, maxs: any) => void;

/**
 * CTSGroundWeapon::OnGround — finalize the "weapon resting on the
 * ground" state after a fall. Lights it up, clears a render/takedamage
 * flag, re-asserts the origin, shrinks the bounding box, and resets
 * the wait/respawn state.
 *
 * Source: ts/dlls/ts_i386.so @ 0x0009226c (158 B)
 * Asm: 12 writes + 2 engine calls, no branches.
 */
export function OnGround(this: any): void {
  const pev = this.pev;

  // [pev + 0x10C] = 1
  // TODO(asm-ambiguous): 0x10C doesn't match a stock HLSDK entvars_s
  // field cleanly. Likely `effects |= EF_BRIGHTFIELD` (1) or a
  // TS-specific render flag. Resolve via the entvars_s dump.
  pev[0x10c] = 1;

  // [pev + 0x118] &= 0xFFFFFF7F
  // TODO(asm-ambiguous): clearing bit 7 of offset 0x118. Likely
  // `takedamage` (DMG_… mask) but verify via entvars_s.
  pev[0x118] &= 0xffffff7f;

  // Re-assert origin (pushes &pev->origin). Semantically origin = origin,
  // but the engine call retriggers relink / bounds recompute after the
  // fall — that side effect is the point.
  UTIL_SetOrigin(pev, pev.origin);

  // UTIL_SetSize with two GOT-scalar globals broadcast across all 3 axes.
  // TODO(provenance): globals [ebx-0x6b68c] and [ebx-0x6b688] — resolve
  // names via `nm ts/dlls/ts_i386.so` and `tools/decompile/strings-n5.txt`.
  const minsScalar: number = g_groundWeaponMinSize; // [ebx-0x6b68c]
  const maxsScalar: number = g_groundWeaponMaxSize; // [ebx-0x6b688]
  UTIL_SetSize(
    pev,
    { x: minsScalar, y: minsScalar, z: minsScalar },
    { x: maxsScalar, y: maxsScalar, z: maxsScalar },
  );

  // Reset wait/respawn state. 0xFFFF0000 is the HLSDK NaN-bit-pattern
  // sentinel — any comparison against gpGlobals->time will fail, so
  // this disables time-based auto-wait.
  //
  // TODO(provenance): the field names below are placeholders. The
  // Save/Restore methods (0x91950 / 0x919a0) own the authoritative
  // field-name table; cross-reference before merge.
  this[0x0c] = 0;                          // this->[0x0C] = 0    (m_iCount?)
  this[0x10] = 0;                          // this->[0x10] = 0    (m_iWait?)
  this[0x14] = 0xffff0000;                 // this->[0x14] = NaN  (m_flWait?)
  this[0x18] = g_weaponRespawnCvar;        // [ebx+0x1cbc]       (m_fRespawnTime?)
}

// External data symbols (GOT-scalar / cvar cache). Real names pending
// `nm` cross-reference.
declare const g_groundWeaponMinSize: number;  // [ebx-0x6b68c]
declare const g_groundWeaponMaxSize: number;  // [ebx-0x6b688]
declare const g_weaponRespawnCvar: number;    // [ebx+0x1cbc]
