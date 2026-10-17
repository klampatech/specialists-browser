```typescript
/**
 * CTSGun::VKickback — applies per-shot view kickback to the owning player.
 *
 * Picks a mode-specific scale cvar (selected by `mode`), pre-multiplies it
 * by `timeScale`, keeps the unscaled intermediate alongside, then
 * conditionally applies a secondary-fire boost and a DoubleFireRate perk
 * dampener to both magnitudes. When the owner has a specific gameplay flag
 * set, the two magnitudes are folded into the player's punch-angle vector.
 *
 * @param this          The CTSGun instance (this in the original C++)
 * @param timeScale     Base factor multiplied into the intermediate and,
 *                      for known modes, into the mode-scaled final kick
 * @param mode          Per-mode index selecting the scale cvar:
 *                      1 / 4-5 / 6-7 / 8 / 9 each pick a distinct cvar;
 *                      anything else falls back to CV_KB_FALLBACK verbatim
 * @param isSecondary   When true, applies the secondary-fire boost to
 *                      both magnitudes
 * @param arg5          Reserved — not read by this chunk
 * @param arg6          Demangled as `?` (unresolved type) — not read here
 * @returns             void
 */

// TODO: declare proper CTSGun and CBasePlayer types — using `any` for now.
declare function DoubleFireRate(player: any): any;

export function VKickback(
  this: any,
  timeScale: number,
  mode: number,
  isSecondary: boolean,
  arg5: number,
  arg6: any,
): void {
  // ---- cvars / globals accessed via the PIC/GOT base ----
  // TODO(asm-ambiguous): real cvar names — cross-reference
  // tools/decompile/analysis/strings-n5.txt to map these GOT offsets.
  const CV_KB_BASE      = 1.0; // [ebx - 0x6df08]
  const CV_KB_MODE_1    = 1.0; // [ebx - 0x6defc]
  const CV_KB_MODE_4_5  = 1.0; // [ebx - 0x6df00]
  const CV_KB_MODE_6_7  = 1.0; // [ebx - 0x6def8]
  const CV_KB_MODE_8    = 1.0; // [ebx - 0x6df04]
  const CV_KB_MODE_9    = 1.0; // [ebx - 0x6def4]
  const CV_KB_FALLBACK  = 1.0; // [ebx - 0x6f408] — unknown mode
  const CV_KB_BOOST     = 1.0; // [ebx - 0x6df0c] — secondary fire
  const CV_KB_DFIRE     = 1.0; // [ebx - 0x6def0] — DoubleFireRate perk

  // Two magnitudes are produced: the unscaled intermediate and a mode-
  // scaled final. The vertical/horizontal labels below are speculative —
  // the asm only shows that one is the scaled variant of the other.

  const intermediate = CV_KB_BASE * timeScale;

  // Mode-specific scale. The default branch discards `intermediate` from
  // the FPU stack and loads CV_KB_FALLBACK directly (no timeScale factor).
  let finalKick: number;
  switch (mode) {
    case 1:    finalKick = intermediate * CV_KB_MODE_1;   break;
    case 4:
    case 5:    finalKick = intermediate * CV_KB_MODE_4_5; break;
    case 6:
    case 7:    finalKick = intermediate * CV_KB_MODE_6_7; break;
    case 8:    finalKick = intermediate * CV_KB_MODE_8;   break;
    case 9:    finalKick = intermediate * CV_KB_MODE_9;   break;
    default:   finalKick = CV_KB_FALLBACK;                break;
  }

  let vertKick  = intermediate;
  let horizKick = finalKick;

  // Secondary-fire boost — applies to BOTH magnitudes.
  if (isSecondary) {
    vertKick  *= CV_KB_BOOST;
    horizKick *= CV_KB_BOOST;
  }

  // DoubleFireRate(player) — engine helper; non-null return means the
  // perk is active and both magnitudes get an additional scale.
  const doubledFireRate = DoubleFireRate(this.m_pPlayer);
  if (doubledFireRate != null) {
    vertKick  *= CV_KB_DFIRE;
    horizKick *= CV_KB_DFIRE;
  }

  // If a TS gameplay flag (bit 0x20 at CBasePlayer offset 0x1a5) is set
  // on the owner, fold the magnitudes into two consecutive floats on
  // the player.
  // TODO(asm-ambiguous): identity of the flag at offset 0x1a5; the
  // consecutive float offsets 0x68 / 0x6c are inferred to be a Vector3
  // — most likely m_vecPunchAngle (vertical / horizontal punch).
  const player: any = this.m_pPlayer;
  if ((player.byte_0x1A5 & 0x20) !== 0) {
    player.float_0x68 -= vertKick;   // likely m_vecPunchAngle.y
    player.float_0x6c += horizKick;  // likely m_vecPunchAngle.z
  }
}
```
