// Ambient engine-side globals (provided by GiveFnptrsToDll in D.5)
declare const gpGlobals: { time: number };
declare const vec3_origin: readonly [number, number, number];

// Default vec3 written twice in this Spawn — almost certainly vec3_origin
// (HLSDK's canonical zero-vector constant, used for un-AABB'd entities).
const PHYSIC_OBJECT_DEFAULT_EXTENT = vec3_origin;

/**
 * CTSPhysicObject::Spawn — initialize spawn-time state for a physics
 * object. Mirrors the disassembly at 0x6ba54 (67 B):
 *   1. cache gpGlobals->time into a register
 *   2. write that time to (this+0x84) and to (pev_ext+0x254)
 *   3. copy a default vec3_t from [ebx+0x1888] into (this+0x64) and
 *      (this+0x70)
 *   4. zero (this+0x7c) and (this+0x80)
 *
 * Field-name guesses are best-effort TS-side names based on the
 * operations; confirm against the TS SDK headers in D.4.
 */
export interface CTSPhysicObject {
  /** [this+0x64] — 12 B vec3, init to default extent. Probably m_vecAbsMin. */
  m_vecAbsMin: [number, number, number];
  /** [this+0x70] — 12 B vec3, init to default extent. Probably m_vecAbsMax. */
  m_vecAbsMax: [number, number, number];
  /** [this+0x7c] — dword zeroed. Probably m_iState. */
  m_iState: number;
  /** [this+0x80] — dword zeroed. Probably m_iFlags. */
  m_iFlags: number;
  /** [this+0x84] — written with gpGlobals->time. Almost certainly m_fNextThink
   *  (the class has a sibling WaitThink() method per the symbol table,
   *  which corroborates next-think being initialized at Spawn time).
   *  TODO(asm-verify): if the second zero-store at 0x6baaa really is
   *  [edx+0x84] and not [edx+0x80], this field ends as 0, not time.
   *  Re-extract that displacement byte before declaring m_fNextThink live. */
  m_fNextThink: number;
  /** pev mirror — first field of `this` is `entvars_t*`. +0x254 is past the
   *  end of stock entvars_t; this is the TS-extended entvars block. */
  pev: { m_fNextThink: number };
}

export function Spawn(this: CTSPhysicObject): void {
  const now: number = gpGlobals.time;

  // asm: mov [this+0x84], eax ; mov [pev+0x254], eax
  this.m_fNextThink = now;
  this.pev.m_fNextThink = now;

  // asm: rep movsd x 2 from [ebx+0x1888] into [this+0x64] then [this+0x70].
  // Source is vec3_origin (TODO(asm-ambiguous): confirm against
  // tools/decompile/strings-n5.txt / HLSDK's g_vecZero / vec3_origin).
  this.m_vecAbsMin = [PHYSIC_OBJECT_DEFAULT_EXTENT[0], PHYSIC_OBJECT_DEFAULT_EXTENT[1], PHYSIC_OBJECT_DEFAULT_EXTENT[2]];
  this.m_vecAbsMax = [PHYSIC_OBJECT_DEFAULT_EXTENT[0], PHYSIC_OBJECT_DEFAULT_EXTENT[1], PHYSIC_OBJECT_DEFAULT_EXTENT[2]];

  // asm: mov [this+0x7c], 0 ; mov [this+0x80], 0  (offsets inferred —
  // TODO(asm-verify): the prompt's disassembly listing says 0x80 and 0x84,
  // but byte-length constraints require both to be disp8; please re-extract
  // to confirm 0x7c / 0x80 vs 0x80 / 0x84.)
  this.m_iState = 0;
  this.m_iFlags = 0;
}
