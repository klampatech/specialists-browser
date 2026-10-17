```typescript
/**
 * CTSParticle::CheckValues — validate and clamp the particle's tunable
 * numeric fields against two GOT-resident globals (cvars) and a
 * non-negative floor on its signed-int fields.
 *
 * @param this  The CTSParticle entity instance (this in the original C++)
 * @returns     void
 */
export function CheckValues(this: any /* TODO(asm-ambiguous): proper CTSParticle type pending D.4 */): void {
  // Two GOT-resident globals accessed via PIC base in ebx.  Identity  // unconfirmed without cross-referencing tools/decompile/analysis/strings-n5.txt.
  // TODO(asm-ambiguous): names unclear — likely sv_maxvelocity and a particle cap.
  const upperThreshold: number = (globalThis as any).__ts_globals.particleUpper; // [ebx-0x6f408]
  const capThreshold:    number = (globalThis as any).__ts_globals.particleCap;    // [ebx-0x6f3fc]

  // Upper-threshold zero-out: if the threshold exceeds a field, the field
  // is treated as uninitialized/invalid and cleared to zero.  Pattern:
  //   fcomp  [field]
  //   test   ah, 0x41      ; ZF=1 iff ST(0) > operand
  //   jne    .skip
  //   mov    [field], 0
  if (upperThreshold > this.field0x74) this.field0x74 = 0;
  if (upperThreshold > this.field0x78) this.field0x78 = 0;
  if (upperThreshold > this.field0x84) this.field0x84 = 0;
  if (upperThreshold > this.field0x88) this.field0x88 = 0;

  // Cap clamp: field = min(field, capThreshold).  Pattern:
  //   fcom   [field]       ; no pop
  //   sahf                 ; CF = C0
  //   jae    .skip         ; skip when ST(0) >= operand
  //   fstp   [field]       ; store cap into field
  //   jmp    .done
  // .skip:
  //   fstp   st(0)
  if (capThreshold < this.field0x84) this.field0x84 = capThreshold;
  if (capThreshold < this.field0x88) this.field0x88 = capThreshold;

  // More upper-threshold zero-outs.
  if (upperThreshold > this.field0x94) this.field0x94 = 0;
  if (upperThreshold > this.field0x98) this.field0x98 = 0;

  // Signed-int fields must be non-negative (cmp dword + jns).
  if (this.field0xa4 < 0) this.field0xa4 = 0;
  if (this.field0xa8 < 0) this.field0xa8 = 0;
}
```
