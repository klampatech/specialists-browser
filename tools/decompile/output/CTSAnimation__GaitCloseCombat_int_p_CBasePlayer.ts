// Stub declarations so this file type-checks in isolation.
// D.4 will replace these with real class types and field
// semantics from the TS gameplay source.
declare class CTSAnimation {}
declare class CBasePlayer { pev: any; }

/**
 * CTSAnimation::GaitCloseCombat(int, CBasePlayer*)
 *
 * Demangled symbol: GaitCloseCombat__12CTSAnimationiP11CBasePlayer
 * Address:  0x0005dd14, size: 181 B
 *
 * Decides whether the player's close-combat movement gait should
 * be active for the given animation state. The behavior is purely
 * a function of (intArg, player) — no side effects, no engine
 * calls.
 *
 * Decision tree (faithful to the disassembly):
 *   1. intArg == 0x25:
 *      - If pev[0x1a5] bit 0x40 set → return 0
 *      - Else if pev[0x180] bit 0x04 set → return 0
 *      - Else fall through to the common path.
 *   2. intArg ∈ {0x23, 0x24, 0x3a} → return 0 (no gait here).
 *   3. Close-combat anim states
 *      {0x16, 0x17, 0x19, 0x1d–0x20, 0x21, 0x22, 0x25, 0x26, 0x27}:
 *      a. If pev[0x1a5] bit 0x40 set → return 1 (gait forced on).
 *      b. Else if 2D speed
 *         sqrt(pev[0x20]^2 + pev[0x24]^2) > cvar_threshold,
 *         return 1; otherwise return 0.
 *   4. Any other intArg → return 0.
 *
 * Field offsets are TS-specific extended entvars. Standard HLSDK
 * entvars_t::velocity lives at ~0x28, so 0x20/0x24 are
 * repurposed or extended. D.4 must map these to real field names.
 *
 * The speed threshold is loaded from a GOT entry at
 * [ebx - 0x6F3E8] (set up by a position-independent
 * call/pop/add sequence at 5dd19–5dd1f). The cvar name and
 * default value must be resolved in D.4 from
 * tools/decompile/analysis/strings-n5.txt.
 */
export function GaitCloseCombat(
  this: CTSAnimation,
  intArg: number,
  player: CBasePlayer
): number {
  const pev = player.pev as any;

  // ── 1. intArg == 0x25 pre-check ───────────────────────────────────
  if (intArg === 0x25) {
    // TODO(asm-ambiguous): 0x1a5 / 0x180 — TS extended entvars.
    // Map to real field names in D.4.
    if ((pev[0x1a5] & 0x40) !== 0) return 0;
    if ((pev[0x180] & 0x04) !== 0) return 0;
  }

  // ── 2. Animation states that opt out of close-combat ──────────────
  if (intArg === 0x23 || intArg === 0x24 || intArg === 0x3a) return 0;

  // ── 3. Close-combat animation-state membership ───────────────────
  // Original assembly tests:
  //   0x16..0x17  (range, jbe after lea [edx-0x16])
  //   0x19        (cmp + je)
  //   0x1d..0x20  (range, ja-fall-through after lea [edx-0x1d])
  //   0x21..0x25  (range, jbe after lea [edx-0x21])  — but 0x23,0x24
  //               short-circuit in step 2; 0x25 falls through to inner
  //   0x26        (cmp + je)
  //   0x27        (cmp + je)
  // Net set reaching the inner check: 0x16, 0x17, 0x19, 0x1d-0x20,
  // 0x21, 0x22, 0x25, 0x26, 0x27.
  const isCloseCombat =
    (intArg >= 0x16 && intArg <= 0x17) ||
    (intArg >= 0x21 && intArg <= 0x22) ||
    (intArg >= 0x25 && intArg <= 0x27) ||
    intArg === 0x19 ||
    (intArg >= 0x1d && intArg <= 0x20);
  if (!isCloseCombat) return 0;

  // ── 4. Inner block: forced-on flag || speed > threshold ──────────
  // For intArg != 0x25 this is the only flag test. For intArg == 0x25
  // the pre-check guarantees this bit is 0, so the test is redundant
  // but kept for fidelity to the disassembly.
  if ((pev[0x1a5] & 0x40) !== 0) return 1;

  // 2D horizontal magnitude, sqrt(x^2 + y^2).
  // TODO(asm-ambiguous): pev[0x20] / pev[0x24] are floats in the TS
  // extended entvars (vx/vy?). Confirm in D.4.
  const vx = pev[0x20];
  const vy = pev[0x24];
  const speed = Math.sqrt(vx * vx + vy * vy);

  // Threshold comes from [ebx - 0x6F3E8], a GOT entry set up at
  // 5dd19–5dd1f for position-independent access. After PIC setup,
  // the absolute VA is 0x164E10 - 0x6F3E8 = 0x0F5A28. Look up the
  // symbol name in tools/decompile/analysis/strings-n5.txt (D.4).
  // TODO(cvar-resolution): replace placeholder with the real cvar
  // lookup or a parameter on the function signature.
  const threshold = 0;

  // disassembly: fcomp → fnstsw ax → test ah,0x41 → jne (skip ecx=1).
  // jne is NOT taken only when st(0) > operand, so this ternary
  // matches: speed > threshold → return 1.
  return speed > threshold ? 1 : 0;
}
