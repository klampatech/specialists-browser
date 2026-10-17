```typescript
/**
 * CTSSharedEmitter::NextParticle — finds the next free (null) slot in
 * the shared-emitter/particle pointer table and returns its index, or
 * `-1` if all 512 slots are in use.
 *
 * In the original C++ the table is a 512-entry pointer array at
 * `this + 0x800` (the symbol is exposed as `s_Emitter`). MSVC unrolls
 * the linear scan eight slots per iteration, returning the index of
 * the first null entry it encounters.
 *
 * @param this  The CTSSharedEmitter entity instance
 * @returns     Index of the first free slot in [0..511], or -1 if full.
 */
export function NextParticle(this: CTSSharedEmitter): number {
  // TODO: wire to class layout — `s_Emitter` lives at this+0x800 and
  // is a 512-entry pointer table (4 bytes per slot).
  const table: ArrayLike<number> = (this as unknown as {
    readonly s_Emitter: ArrayLike<number>;
  }).s_Emitter;

  // Unrolled linear scan: 8 null-checks per loop, advance by 8.
  for (let base = 0; base < 512; base += 8) {
    if (table[base + 0] === 0) return base + 0;
    if (table[base + 1] === 0) return base + 1;
    if (table[base + 2] === 0) return base + 2;
    if (table[base + 3] === 0) return base + 3;
    if (table[base + 4] === 0) return base + 4;
    if (table[base + 5] === 0) return base + 5;
    if (table[base + 6] === 0) return base + 6;
    if (table[base + 7] === 0) return base + 7;
  }
  return -1;
}
```
