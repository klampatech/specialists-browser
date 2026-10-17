/**
 * CTSAnimation::SetAnim — set a player's animation sequence by name.
 *
 * Looks up the sequence index via CBaseAnimating::LookupSequence, then
 * applies it to the player entity, optionally adjusting the loops bit,
 * the gait (secondary) sequence, and the framerate based on the iFlags
 * bitmask. Calls CBaseAnimating::ResetSequenceInfo() at the end so the
 * engine picks up the new sequence on the next frame.
 *
 * @param this        The CTSAnimation helper instance (the function
 *                    body does not read `this`; the parameter is kept
 *                    so the signature matches the demangled symbol).
 * @param pPlayer     The CBasePlayer whose animation is being set.
 * @param seqName     Sequence name to look up.
 * @param iFlags      Bit flags controlling how the sequence is applied:
 *                    0x01  = also write the gait sequence and return 1
 *                            immediately (skip the primary update),
 *                    0x04  = clear the gait sequence,
 *                    0x10  = clear the loops bit (do NOT loop),
 *                    0x20  = use flFrameRate as the new framerate,
 *                    0x80  = force the update even if the sequence is
 *                            already current,
 *                    0x100 = keep the existing framerate (do not reset).
 * @param flFrameRate New framerate (originally `int`; the disassembly
 *                    uses `fild` to convert it to float before storing
 *                    it). Ignored unless 0x20 is set.
 * @returns           0 if the sequence was already current and 0x80 was
 *                    not set, otherwise 1.
 */
export function SetAnim(
  this: CTSAnimation,
  pPlayer: CBasePlayer,
  seqName: string,
  iFlags: number,
  flFrameRate: number,
): number {
  // Look up the sequence index on the player. -1 (not found) is treated
  // as 0 so the rest of the function never sees an invalid index.
  let seq = pPlayer.LookupSequence(seqName);
  if (seq === -1) seq = 0;

  // The disassembly accesses pPlayer->field0 (the first pointer field
  // of CBasePlayer — typically pev) at offsets 0x118, 0x128, 0x12c,
  // and 0x130. We expose them through pev.* with conventional HL names.
  // TODO(asm-ambiguous): the exact mapping from raw offsets to pev
  //   fields is inferred; verify against the final CTS pev layout once
  //   the D.4 class reconstruction lands.
  const pev = pPlayer.pev;

  // If we're already on this sequence and the caller didn't request a
  // forced refresh (0x80), bail out without touching state.
  if (pev.sequence === seq && (iFlags & 0x80) === 0) {
    return 0;
  }

  // Toggle the loops bit (bit 5 at pev+0x118). The 0x10 flag means
  // "do not loop", so it clears the bit; otherwise we set it.
  if (iFlags & 0x10) {
    pev.m_fSequenceLoops &= ~0x20;
  } else {
    pev.m_fSequenceLoops |= 0x20;
  }

  // Handle the gait (secondary) sequence. 0x04 clears it; 0x01 sets it
  // and short-circuits the rest of the function with a 1 return.
  if (iFlags & 0x04) {
    pev.gaitsequence = 0;
  } else if (iFlags & 0x01) {
    pev.gaitsequence = seq;
    return 1;
  }

  // Apply the primary sequence.
  pev.sequence = seq;

  // Apply the framerate. 0x20 means "use the supplied flFrameRate".
  // Otherwise 0x100 keeps the existing framerate; if neither flag is
  // set we reset it to zero.
  if (iFlags & 0x20) {
    pev.framerate = flFrameRate;
  } else if ((iFlags & 0x100) === 0) {
    pev.framerate = 0;
  }

  // Tell the engine to rebuild its sequence info on the next update.
  pPlayer.ResetSequenceInfo();
  return 1;
}