/**
 * CTSAnimation::GaitCloseCombat — decides whether the player should use the
 * close-combat movement gait for the given animation state.
 *
 * Decision tree (faithful to disassembly at 0x5dd14, 181 bytes):
 *   1. Special case for animation state 0x25:
 *        - If pev[0x1a5] bit 0x40 is set → return 0
 *        - Else if pev[0x180] bit 0x04 is set → return 0
 *        - Else → fall through to the normal flow
 *   2. Animation states 0x23, 0x24, 0x3a → return 0 (never close-combat)
 *   3. Close-combat animation states:
 *        { 0x16, 0x17, 0x19, 0x1d–0x20, 0x21, 0x22, 0x25, 0x26, 0x27 }
 *      → enter the inner block (5dd90)
 *   4. Any other animation state → return 0
 *
 * Inner block:
 *   - If pev[0x1a5] bit 0x40 is set → return 1
 *   - Else compute speed = sqrt(pev[0x20]^2 + pev[0x24]^2)
 *     - If speed > threshold (GOT-relative global) → return 1
 *     - Else → return 0
 *
 * @param this    CTSAnimation instance (class definition TBD)
 * @param intArg  animation state / event index being evaluated
 * @param player  CBasePlayer whose gait is being decided
 * @returns       1 = use close-combat gait, 0 = don't
 */
export function GaitCloseCombat(
  this: any,           // CTSAnimation — class TBD (D.4)
  intArg: number,      // animation state index
  player: any          // CBasePlayer — class TBD
): number {
  // Hoisted: in the disassembly eax=pev is loaded at 0x5dd32 and 0x5dd90
  // for structural reasons; in TS we only need it once.
  const pev = (player as any).pev;

  // ---- Special case for animation state 0x25 (asm: 0x5dd32–0x5dd4b) ----
  if (intArg === 0x25) {
    // TODO(asm-ambiguous): map pev[0x1a5] bit 0x40 and pev[0x180] bit 0x04
    // to TS custom entvars fields (likely iuser3/iuser4 or a TS-specific    // "in close combat" / "in action" flag pair).
    if ((pev[0x1a5] & 0x40) !== 0) return 0;
    if ((pev[0x180] & 0x04) !== 0) return 0;
  }

  // ---- Animation states that always return 0 (asm: 0x5dd55–0x5dd62) ----
  if (intArg === 0x23 || intArg === 0x24 || intArg === 0x3a) {
    return 0;
  }

  // ---- Close-combat animation set (asm: 0x5dd64–0x5dd8e) ----
  // Range/range/single/range/range tests in the assembly; order is irrelevant
  // because we OR them together.
  const isCloseCombatAnim =
    (intArg >= 0x16 && intArg <= 0x17) ||
    intArg === 0x19 ||
    (intArg >= 0x1d && intArg <= 0x20) ||
    (intArg >= 0x21 && intArg <= 0x22) ||
    (intArg >= 0x25 && intArg <= 0x27);

  if (!isCloseCombatAnim) return 0;

  // ---- Inner block: flag or velocity check (asm: 0x5dd90–0x5ddbc) ----
  // The "in close combat" flag short-circuits the velocity check.
  // TODO(asm-ambiguous): same pev[0x1a5] field as above.
  if ((pev[0x1a5] & 0x40) !== 0) return 1;

  // 2D horizontal speed: sqrt(vx^2 + vy^2).
  // TODO(asm-ambiguous): map pev[0x20] and pev[0x24] to velocity components.
  // Standard entvars_t has velocity at offset 0x28; these earlier offsets
  // are likely TS-repurposed fields or components under the TS layout.
  const vx: number = pev[0x20];
  const vy: number = pev[0x24];
  const speed = Math.sqrt(vx * vx + vy * vy);

  // Threshold from GOT-relative global at [ebx - 0x6f3e8] (address0x9ca28).
  // TODO(cvar-lookup): resolve the cvar/global name and value. The
  // `fcomp` + `test ah, 0x41` decodes to "speed > threshold ⇒ 1", but
  // the threshold is currently hardcoded to 0, which makes this block
  // return 1 for any moving player — semantically wrong until resolved.
  const threshold: number = 0; // placeholder; see TODO above

  return speed > threshold ? 1 : 0;
}
