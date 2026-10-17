/**
 * CTSStunt::HandleDive — finalize an active dive.
 *
 * In the binary this function:
 *   1. Calls CTSStunt::Landing(this) — shared landing state transition.
 *   2. Calls CTSAnimation::Animate(this->m_pPlayer + 0x28c,
 *                                  this->m_pPlayer,
 *                                  2) — kicks off the dive-end
 *                                  animation sequence on the player.
 *
 * Notes:
 *   - The PIC register (ebx) is set up at function entry but is never
 *     read by either PLT call; that prologue sequence is a compiler
 *     artifact and has no TS equivalent.
 *   - `Animate` is demangled as a member function on the player's
 *     animation-state sub-struct at offset 0x28c (a TS extension to
 *     stock GoldSrc CBasePlayer). 32-bit GCC pushes the implicit
 *     `this` as the first explicit arg, hence the 3 pushes at the
 *     call site. We expose it as a 3-arg free function in TS, which
 *     is faithful to the disassembly.
 *
 * @param this  The CTSStunt entity instance.
 */
export function HandleDive(this: CTSStunt): void {
  // 1. Shared landing routine (impact handling / post-dive state).
  this.Landing();

  // 2. Trigger the dive-end animation (sequence id 2) on the player.
  const animState = (this.m_pPlayer as any) + 0x28c;
  Animate(animState, this.m_pPlayer, 2);
}
