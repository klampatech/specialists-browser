```typescript
// External symbols referenced by the decompiled body but defined
// elsewhere in the project (engine interface, singletons, helpers).
declare const engine: any;
declare const g_pSharedEmitter: any;
declare const GLOBAL: any;
declare const AT_ERROR: number;
declare function UTIL_Remove(this: any): void;

// TODO: full CTSParticle class layout is reconstructed in D.4. Minimal
// stub here so this decompiled function compiles in isolation.
type CTSParticle = any;

/**
 * CTSParticle::Spawn — initialize a CTSParticle entity on level load.
 *
 * Operations, in order:
 *   1. Snap pev->origin.x via an engine grid-snap helper.
 *   2. Validate keyvalues via this->CheckValues().
 *   3. Register this particle with the shared CTSSharedEmitter pool;
 *      the returned slot index (or -1 on failure) is stored in
 *      m_iSharedHandle.
 *   4. On registration failure (no slot): AlertMessage + UTIL_Remove self.
 *   5. If m_szSoundName is non-empty, precache it via pfnPrecacheSound.
 *
 * @param this  The CTSParticle entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSParticle): void {
  // CTSParticle's full layout is not yet reconstructed; use `any`
  // for field access (separate D.4 task).
  const self = this as any;

  // (1) Origin snap.
  // The disassembly computes a static base address
  // (lea ebx-0x6ec79 → 0x0f7197) and subtracts a field at offset 0x98
  // (obtained via double-deref of GOT[0x1600]), then writes the
  // result to pev->origin.x.
  // TODO(asm-ambiguous): engine-internal origin-snap helper; the
  // double-deref + static-base pattern is unusual and its full
  // semantics require engine source.
  self.pev.origin.x = 0x0f7197 - GLOBAL.field0x98;

  // (2) Validate configured keyvalues.
  self.CheckValues();

  // (3) Register with the shared particle emitter pool.
  // m_sharedParticle (sharedparticle_s, at +0x68) is the data passed
  // to AddParticle; the returned slot handle (or -1 on failure) is
  // stored at +0x64 as m_iSharedHandle.
  self.m_iSharedHandle = g_pSharedEmitter.AddParticle(self.m_sharedParticle);

  // (4) Registration failed: emit error and remove self.
  if (self.m_iSharedHandle === -1) {
    // 0x4 = AT_ERROR. 0x200 is a trailing arg (likely the alert
    // message buffer size or stack padding for the variadic
    // pfnAlertMessage).
    // TODO(asm-ambiguous): the 0x200 third arg to pfnAlertMessage is
    // ambiguous — could be buffer size or unused padding.
    engine.pfnAlertMessage(AT_ERROR, "Out of particle slots", 0x200);
    UTIL_Remove(this);
  }

  // (5) Optional sound precache.
  // m_szSoundName (char[] at +0x1c0) is checked via its first byte;
  // if non-zero (string non-empty), precache the sound so the client
  // has it available.
  if (self.m_szSoundName[0] !== 0) {
    engine.pfnPrecacheSound(self.m_szSoundName);
  }
}
```
