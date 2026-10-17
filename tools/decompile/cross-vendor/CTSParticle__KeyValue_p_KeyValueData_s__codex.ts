```typescript
/**
 * CTSParticle::KeyValue — Handles a key/value pair from the level
 * designer for the CTSParticle entity. Forwards (key, value) to the
 * shared emitter's ParticleKeyValue helper, which fills a field on the
 * per-instance particle structure. Sets KeyValueData_s::fHandled based
 * on whether the helper recognized the key.
 *
 * @param this  The CTSParticle entity instance (this in the original C++)
 * @param pkvd  The KeyValueData carrying szKeyName, szValue, and fHandled
 * @returns     void
 */
export function KeyValue(this: any, pkvd: any): void {
  // [ebx+0x13a0] is a global pointer (PIC/GOT access) — likely a
  // sharedparticle_s* singleton used as the default-values template.
  // TODO(asm-ambiguous): exact type and ownership model unclear from
  // the chunk alone; verify against CTSSharedEmitter's class layout.
  const sharedParticleTemplate: any = /* [GOT+0x13a0] */;

  // this + 0x68 — the per-instance particle struct that the helper
  // fills in (passed as sharedparticle_s*).
  // TODO: offset meaning unclear without the CTSParticle field layout.
  const particle: any = /* this + 0x68 */;

  // Forward (key, value) to the helper. Returns true if the key was
  // recognized and the particle was updated; false otherwise.
  const handled: boolean = ParticleKeyValue(
    sharedParticleTemplate,
    particle,
    pkvd.szKeyName,
    pkvd.szValue,
  );

  // Mirror the helper's bool into the engine's int fHandled flag.
  pkvd.fHandled = handled ? 1 : 0;
}
```
