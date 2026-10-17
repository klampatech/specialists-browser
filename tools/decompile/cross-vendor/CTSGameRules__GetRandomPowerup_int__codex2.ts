// Placeholders for D.3 decompilation. D.4 will replace these with real
// globals / engine wiring.
declare const engine: any;
/**
 * TODO(asm-ambiguous): [GOT+0x14f0] is some singleton (cvar or game
 * mode state); the byte at offset 0x5885 on it gates whether the rare
 * bit-8 powerup is in the pool. Field purpose unknown until D.4.
 */
declare const ts_powerup_rare_locked_byte: number;

/**
 * CTSGameRules::GetRandomPowerup — pick a random powerup from an
 * allow-mask. Walks bits 0..8 of the mask, excludes bit 7 always and
 * bit 8 when a global mode flag is set, collects the remaining set
 * bits into a local list, then picks one uniformly at random.
 *
 * Original disassembly: 9-dword candidate array zeroed via `rep stos`,
 * unrolled 3-bits-per-iteration loop, conditional exclude of bit 8
 * under the rare-lock byte, unconditional exclude of bit 7 via
 * sign-of-dl. Final select via engine.RandomLong(0, n-1).
 *
 * @param allowedMask   Bitmask of allowed powerup IDs (bit N = powerup N)
 * @returns             A single bit (1 << N) for the chosen powerup, or
 *                      0 if the pool is empty.
 */
export function GetRandomPowerup(
  this: any,
  allowedMask: number,
): number {
  const rarePowerupLocked: boolean = ts_powerup_rare_locked_byte !== 0;

  // Original unrolled the bit-walk as three triplets (bits i, i+1, i+2);
  // here as a plain for-loop since the per-bit logic is identical.
  const candidates: number[] = [];
  for (let bit = 0; bit <= 8; bit++) {
    const m = 1 << bit;
    if ((allowedMask & m) === 0) continue;
    if ((m & 0x80) !== 0) continue;                  // bit 7: always skip (sign of dl)
    if (rarePowerupLocked && m === 0x100) continue;  // bit 8: skip under mode flag
    candidates.push(m);
  }

  if (candidates.length === 0) return 0;

  // Engine vtable: [GOT+0x1aa8] + 0x168 in the original; two cdecl args,
  // int return used as array index → pfnRandomLong.
  const idx = engine.RandomLong(0, candidates.length - 1);
  return candidates[idx];
}
