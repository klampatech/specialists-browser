/**
 * CTSScoreGiver::Use — Increment a per-entity use counter; when it
 * reaches the entity's threshold, award a team score via the game
 * rules (with the float arg truncated to int) and broadcast a HUD
 * message naming the entity's class, then reset the counter.
 *
 * @param this        The CTSScoreGiver entity instance
 * @param pActivator  Entity that triggered the use (unused in body)
 * @param pCaller     Entity that called the use (HLSDK convention; the
 *                    demangler only shows 3 explicit args — verify in D.4)
 * @param useType     USE_TYPE classification of the trigger (unused)
 * @param fValue      Float payload, truncated to int for the score
 */
export function Use(
  this: any,        // CTSScoreGiver
  pActivator: any,  // CBaseEntity
  pCaller: any,     // CBaseEntity (HLSDK 4-arg convention)
  useType: any,     // USE_TYPE
  fValue: number
): void {
  // Increment the per-entity use counter; bail if below threshold.
  // TODO(asm-ambiguous): field names inferred from the disassembly:
  //   this.scoreCount     = [esi+0x64]  (int)
  //   this.scoreThreshold = [esi+0x78]  (int)
  // Counter is incremented BEFORE the comparison; early-out does NOT
  // reset (matches `jl 7c209` jumping over the reset at 0x7c202).
  this.scoreCount += 1;
  if (this.scoreCount < this.scoreThreshold) {
    return;
  }

  // Threshold reached — award the team score.
  //   this.team    = [esi+0x74]        (int)
  //   score        : fValue truncated via FPU
  //                  (fnstcw → set truncate bits → fldcw → fistp → restore)
  //   perClassFlag : vtable[0x1a0 / 4 = 0x68] & 0x1
  //   1            : opaque "T3" (3-char typedef) trailing arg
  const score = Math.trunc(fValue);
  // TODO(asm-ambiguous): AND of a vtable entry with 0x1 is unusual — vtable
  //   slots are normally 4-byte-aligned function pointers whose LSB is 0.
  //   Likely a TS-specific per-class flag packed in the vtable, or a slot
  //   that's been repurposed. The disassembly pushes `ax` (16-bit) for
  //   this arg.
  const perClassFlag = (this.vtable[0x68] & 0x1) !== 0;
  // TODO(asm-ambiguous): trailing arg is a 3-char typedef ("T3"); the
  //   disassembly pushes the immediate `0x1` (sign-extended). Cast as any.
  (globalThis as any).gameRules.TeamWin(this.team, score, perClassFlag, 1 as any);

  // If the class has a non-zero vtable[0x75] (offset 0x1d4 / 4) entry,
  // broadcast a HUD message naming the class. The deref chain
  //   [ebx+0x1600]->[0]->[0x98]
  // resolves a global string-table base; the vtable entry is added as an
  // offset (GoldSrc STRING() pattern) before passing the resulting
  // char* to TSHudMessageAll.
  if (this.vtable[0x75] !== 0) {
    const text = (globalThis as any).stringTable.resolve(this.vtable[0x75]);
    // (channel, color1, color2, x, y, text)
    (globalThis as any).TSHudMessageAll(0, 0xff, 0, 8, 30, text);
  }

  // Reset the counter so the next batch of N uses scores again.
  this.scoreCount = 0;
}
