```typescript
/**
 * CTSGameRules::GetRandomPowerup — pick a random powerup from an
 * allow-mask. Walks bits 0..8 of the mask, excludes bit 7 always and
 * bit 8 when a global mode flag is set, collects the remaining set
 * bits into a local list, then picks one uniformly at random.
 *
 * @param this          The CTSGameRules entity instance (this in C++)
 * @param allowedMask   Bitmask of allowed powerup IDs (bit N = powerup N)
 * @returns              A single bit (1 << N) identifying the chosen
 *                       powerup, or 0 if no powerup is available
 */
export function GetRandomPowerup(
  this: CTSGameRules,
  allowedMask: number,
): number {
  // TODO(asm-ambiguous): [GOT+0x14f0] is a pointer to some global state
  // (game rules? engine globals?); the byte at offset 0x5885 on it
  // gates whether the rare bit-8 powerup is in the pool. Field purpose
  // not determinable from this chunk alone.
  const rarePowerupLocked: boolean = (globalStateByteAt0x5885 as any) !== 0;

  // Collect qualifying bits. The compiler unrolled the bit-walk as
  // three triplets (0..2, 3..5, 6..8); the per-bit logic is:
  //   - bit must be set in allowedMask
  //   - bit 7 (0x80, sign byte of dl) is unconditionally excluded
  //   - bit 8 (0x100) is excluded iff rarePowerupLocked
  const candidates: number[] = [];
  for (let bit = 0; bit <= 8; bit++) {
    const m = 1 << bit;
    if ((allowedMask & m) === 0) continue;
    if ((m & 0x80) !== 0) continue;                  // bit 7: always skip
    if (rarePowerupLocked && m === 0x100) continue;  // bit 8: conditional skip
    candidates.push(m);
  }

  if (candidates.length === 0) return 0;

  // engine->RandomLong(0, candidates.length - 1) — invoked via the
  // engine interface vtable ([GOT+0x1aa8] + 0x168 in the original).
  const idx = (engine as any).RandomLong(0, candidates.length - 1);
  return candidates[idx];
}
```
