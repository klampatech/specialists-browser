```typescript
/**
 * CTSEmitter::KeyValue — dispatch an engine key/value pair to the shared emitter
 * system and report via pKeyValue->fHandled whether the key was recognized.
 *
 * @param this        The CTSEmitter instance (this in the original C++)
 * @param pKeyValue   Engine KeyValueData struct (szKeyName @ +0x4, szValue @ +0x8,
 *                    fHandled @ +0xc)
 * @returns           void
 */
export function KeyValue(this: CTSEmitter, pKeyValue: KeyValueData): void {
  // g_sharedEmitter is the global CTSSharedEmitter singleton, loaded from GOT
  // entry [ebx + 0x13a0] after the PIC base computation in the asm prologue.
  // TODO(asm-ambiguous): confirm exact global name via tools/decompile/analysis/strings-n5.txt.
  const sharedEmitter: CTSSharedEmitter = g_sharedEmitter;

  // CTSEmitter embeds a sharedemitter_s sub-struct at offset 0x68; pass a
  // pointer into it as the first explicit arg to EmitterKeyValue.
  // TODO: confirm field offset against the full CTSEmitter class layout (D.4).
  const pShared = ((this as unknown) as number + 0x68) as unknown as sharedemitter_s;

  // Dispatch (cdecl in the original asm, 4 explicit stack args + this on stack):
  //   sharedEmitter->EmitterKeyValue(pShared, szKeyName, szValue)
  const handled: boolean = sharedEmitter.EmitterKeyValue(
    pShared,
    pKeyValue.szKeyName,
    pKeyValue.szValue,
  );

  // Mark whether we consumed the key so the engine stops cascading KeyValue
  // dispatch up the entity inheritance chain.
  pKeyValue.fHandled = handled ? 1 : 0;
}
```
