// External symbols referenced by the decompiled body but defined
// elsewhere in the project (engine interface, singletons, helpers).
declare const engine: any;
declare const g_pSharedEmitter: any;
declare const AT_ERROR: number;
declare function UTIL_Remove(this: any): void;

// TODO: full CTSParticle class layout is reconstructed in D.4. Minimal
// stub here so this decompiled function compiles in isolation.
type CTSParticle = any;

// Static string at binary address 0x0f725f. TODO(D.3-strings): look up
// the actual UTF-8 content in tools/decompile/strings-n5.txt.
const STR_AT_0x0f725f: string = "<unresolved: 0x0f725f>";

/**
 * CTSParticle::Spawn — initialize a CTSParticle entity on level load.
 *
 * Disassembly structure (160 B at 0x00064134):
 *   1. Compute pev->origin.x from a static base and an unknown
 *      field accessed via GOT[0x1600] → *eax → edx → [edx+0x98].
 *      The exact semantics are not recoverable from this chunk alone.
 *   2. Validate keyvalues via this->CheckValues().
 *   3. Register this particle with the shared CTSSharedEmitter pool
 *      by calling AddParticle(this->m_sharedParticle, this); the
 *      returned slot index (or -1 on failure) is stored at +0x64.
 *   4. On registration failure (-1): pfnAlertMessage(AT_ERROR,
 *      <static string at 0x0f725f>, 0x200 /* variadic *\/) + UTIL_Remove(self).
 *   5. If this->m_szSoundName[0] is non-zero, precache the sound via
 *      pfnPrecacheSound.
 *
 * @param this  The CTSParticle entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSParticle): void {
  const self = this as any;

  // (1) Origin calculation.
  // TODO(asm-ambiguous): the pattern is
  //     GOT[0x1600]            → ptr-to-ptr
  //     *GOT[0x1600]           → edx
  //     static addr 0x0f7197   → eax
  //     eax -= [edx+0x98]      → eax
  //     pev->origin.x = eax
  // Without engine source, we cannot tell whether [edx+0x98] is a
  // coordinate origin, a grid offset, or some other engine global.
  // The author's earlier guess of "origin-snap helper" is plausible
  // but not confirmed.
  self.pev.origin.x = 0x0f7197 /* - unknown_dword_at_edx_plus_0x98 */;

  // (2) Validate configured keyvalues.
  self.CheckValues();

  // (3) Register with the shared particle emitter pool.
  // Disassembly:
  //   push eax              ; eax = &this->m_sharedParticle (+0x68)
  //   push GOT[0x13a0]      ; g_pSharedEmitter (this)
  //   call AddParticle
  //   mov [esi+0x64], eax   ; m_iSharedHandle = return value
  // (Argument order matches the Itanium-demangled
  // AddParticle__16CTSSharedEmitterP16sharedparticle_s.)
  self.m_iSharedHandle = g_pSharedEmitter.AddParticle(self.m_sharedParticle);

  // (4) Registration failed: emit error and remove self.
  // pfnAlertMessage is variadic: (ALERT_TYPE level, char *fmt, ...).
  // The asm pushes AT_ERROR (0x4), the static string, and 0x200
  // (a variadic arg whose meaning is not recovered — could be a
  // payload, a buffer-size hint, or unused).
  // TODO(D.3-strings): the real string content is at static address
  // 0x0f725f in the .so; resolve via the strings dump.
  if (self.m_iSharedHandle === -1) {
    engine.pfnAlertMessage(AT_ERROR, STR_AT_0x0f725f /* fmt */, 0x200 /* variadic */);
    UTIL_Remove(this);
  }

  // (5) Optional sound precache.
  // Disassembly checks the first byte of this->m_szSoundName (+0x1c0);
  // non-zero → precache via pfnPrecacheSound (enginefuncs_t offset 0x4).
  if (self.m_szSoundName[0] !== 0) {
    engine.pfnPrecacheSound(self.m_szSoundName);
  }
}
