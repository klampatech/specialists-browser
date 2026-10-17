```typescript
/**
 * CTSScoreGiver::KeyValue — virtual-method override that forwards the
 * engine-dispatched key/value pair straight to the CTSWinGiver base
 * class. This body is the MSVC-generated passthrough thunk: standard
 * PIC/GOT setup in the prologue (preserved for the callee, never used
 * for direct global access here) followed by a tail-call to
 * `CTSWinGiver::KeyValue(this, kv)`. No CTSScoreGiver-specific key
 * handling occurs.
 *
 * @param this  The CTSScoreGiver entity instance (this in the original C++)
 * @param kv    The engine-dispatched KeyValueData_s* pointer
 * @returns     void
 */
export function KeyValue(
  this: CTSScoreGiver,
  kv: KeyValueData_s,
): void {
  // PIC prologue artifact: `call $+5; pop ebx; add ebx, GOT` builds
  // the GOT base into EBX. EBX is preserved across the call below so
  // the callee can use it as its own PIC base; no `[ebx±k]` access
  // happens in this body.

  // Forward (this, kv) to CTSWinGiver::KeyValue@plt. In a class-method
  // context this is just `super.KeyValue(kv)`.
  // TODO(types): CTSWinGiver not yet defined (separate decompile chunk).
  (CTSWinGiver.prototype as any).KeyValue.call(this, kv);
}
```
