/**
 * CTSGameRules::CheckVotes — periodic vote tallying + resolution.
 *
 * Field offsets inferred from the disassembly:
 *   +0xf84  nextCheckTime             float   (gate timer)
 *   +0xf88  voteWinnerNames[32]       char[32][64]
 *   +0x1788 votesArray[32]            int[32]
 *   +0x1808 voteCountCat1Yes          int
 *   +0x180c voteCountCat1No           int
 *   +0x1810 voteCountCat3Yes          int
 *   +0x1814 voteCountCat3No           int
 *   +0x1818 voteCountCat2Yes          int
 *   +0x181c voteCountCat2No           int
 *   +0x1820 votantsCount              int
 *   +0x1824 winningVoteName           char[]   (dest for strcpy)
 *   +0x1828 winningVoteExtra          char[]   (dest for strcpy)
 *
 *   Per-player block at +0x684 + i*72:
 *     +0x00 name[64]
 *     +0x40 voteCat1  byte
 *     +0x41 voteCat3  byte
 *     +0x42 voteCat2  byte
 *
 *   Names are guesses; offsets are arithmetic-verified against the
 *   `rep stos … 0x227` zero-fill at 0x6a611.
 */
export function CheckVotes(this: CTSGameRules): void {
  const gpGlobalsTime: number = (globalAt(0x1600) as any)[0];
  if (this.nextCheckTime > gpGlobalsTime) return;

  const VOTE_CHECK_INTERVAL: number = readROFloat(0x6ecd0);
  this.nextCheckTime = VOTE_CHECK_INTERVAL + gpGlobalsTime;

  // Zero 0x89C bytes: voteWinnerNames + votesArray + the six voteCount
  // ints + votantsCount + winningVoteName/Extra. (The disassembly doesn't
  // re-zero these individually before tallying.)
  memset(this.voteWinnerNames, 0, 0x89c);

  let votants = 0;
  let bestVoteCount = 0;
  let bestVoteIndex = -1;

  let prev: any = null;
  let ent: any = null;
  while (true) {
    ent = UTIL_FindEntityByClassname(prev, readROString("player"));
    if (ent == null) break;
    prev = ent;

    // Filter 1: skip if *(ent+0)+0x208 is 0, OR if engine funcs[0x118]
    // applied to it returns 0. The semantics of *(ent+0) here (vptr vs
    // pev) and funcs[0x118] are unclear; both are TODO(asm-ambiguous).
    const slot208 = ((ent as any)[0] as any)[0x208]; // *(ent+0) then +0x208
    let alive = slot208 !== 0;
    if (alive) {
      const cmdOk = (engine as any).func0x118(slot208);
      if (cmdOk === 0) alive = false;
    }
    if (!alive) continue;

    if ((ent as any)[0] === 0) continue; // null-pev guard

    // Filter 2: virtual call on `ent` at vtable-offset 0xcc (loaded
    // through *(ent+0x60)). NOT a method on `this`.
    if (!((ent as any).vtable0x60_0xcc())) continue;

    // playerIdx = funcs[0x11c]((*(ent+0)) + 0x208).
    // TODO(asm-ambiguous): the actual arg is the same *(ent+0)+0x208
    // value used in Filter 1, NOT `ent` itself.
    const playerIdx: number = (engine as any).func0x11c(slot208);
    if (playerIdx > 0x1f) continue;

    votants++;

    const p = this.players[playerIdx];

    if (p.voteCat1 === 1) this.voteCountCat1Yes++;
    else if (p.voteCat1 === 2) this.voteCountCat1No++;

    if (p.voteCat2 === 1) this.voteCountCat2Yes++;
    else if (p.voteCat2 === 2) this.voteCountCat2No++;

    if (p.voteCat3 === 1) this.voteCountCat3Yes++;
    else if (p.voteCat3 === 2) this.voteCountCat3No++;

    if (p.name[0] === 0) continue;

    // Phase 1: name already in voteWinnerNames[]? If yes, bump its count.
    let matched = false;
    for (let i = 0; i < 32 && !matched; i++) {
      if (strcmp(this.voteWinnerNames[i], p.name) === 0) {
        this.votesArray[i]++;
        matched = true;
        if (this.votesArray[i] > bestVoteCount) {
          bestVoteIndex = i;
          bestVoteCount = this.votesArray[i];
        }
      }
    }

    // Phase 2: name not matched → use first empty slot. The disassembly
    // increments votesArray[i] rather than overwriting; same effect here    // since this slot was just zeroed by the memset above.
    if (!matched) {
      for (let i = 0; i < 32 && !matched; i++) {
        if (this.voteWinnerNames[i][0] === 0) {
          strcpy(this.voteWinnerNames[i], p.name);
          this.votesArray[i] = 1;
          matched = true;
          if (this.votesArray[i] > bestVoteCount) {
            bestVoteIndex = i;
            bestVoteCount = this.votesArray[i];
          }
        }
      }
    }
  }

  this.votantsCount = votants;
  const minVotants = CalcMiniminVotants(votants);

  // Helper for the resolution branches: the original zeroes the relevant
  // vote byte across all 32 players with a buggy loop that never reloads
  // `esi`. We faithfully reproduce that as 32 writes to the same byte.
  // If the intent was actually "clear all 32 players", swap `playerIdx`
  // for an `i` loop variable in the dest address.
  const zeroVoteByte32x = (byteOffsetInBlock: number) => {
    const baseAddr = this.players[playerIdx] /* via +esi*72+0x6c0 */ as any;
    const target = (baseAddr.address +0x6c0 + byteOffsetInBlock) as any;
    for (let i = 0; i < 32; i++) (target as any)[0] = 0;
  };

  if (this.voteCountCat1Yes >= minVotants) {
    (engine as any).func0xec(readROString(0x6e57a), 1.0);
    UTIL_ClientPrintAll(PRINT_CHAT, readROString(0x6e56d));
    zeroVoteByte32x(4); // voteCat1 at block+0x40 = +0x6c0+4
    return;
  }

  if (this.voteCountCat1No >= minVotants) {
    (engine as any).func0xec(readROString(0x6e57a), 0.0);
    UTIL_ClientPrintAll(PRINT_CHAT, readROString(0x6e55a));
    zeroVoteByte32x(4);
    return;
  }

  if (this.voteCountCat2Yes >= minVotants) {
    (engine as any).func0xec(readROString(0x6e546), 1.0);
    UTIL_ClientPrintAll(PRINT_CHAT, readROString(0x6e536));
    zeroVoteByte32x(6); // voteCat2 at block+0x42 = +0x6c0+6
    return;
  }

  if (this.voteCountCat2No >= minVotants) {
    (engine as any).func0xec(readROString(0x6e546), 0.0);
    UTIL_ClientPrintAll(PRINT_CHAT, readROString(0x6e51f));
    zeroVoteByte32x(6);
    return;
  }

  if (this.voteCountCat3Yes >= minVotants) {
    // 2-iteration delay loop (0x1f -= 0x10 twice).
    let _delay = 0x1f;
    while ((_delay -= 0x10) >= 0) { /* no-op */ }
    zeroVoteByte32x(5); // voteCat3 at block+0x41 = +0x6c0+5

    // Cat 3 YES uses fxch + fcomp st(1): after fcomp pops the cvar
    // value, st(0) is the CONSTANT, which is then passed to func0xec
    // via `fstp [esp]`. So if the cvar isn't already at the target
    // value, we SET IT TO the target value (the constant).
    const cvarTarget = readROFloat(0x6f3fc);
    const currentVal = (engine as any).func0xe4(readROString(0x6e507));
    if (currentVal !== cvarTarget) {
      (engine as any).func0xec(readROString(0x6e507), cvarTarget);
    }

    UTIL_ClientPrintAll(PRINT_CHAT, readROString(0x6e390));
    this.winningVoteName = readROInt(0x6e4fb) as unknown as string;
    this.winningVoteExtra = readROInt(0x6e4f7) as unknown as string;
    return;
  }

  if (this.voteCountCat3No >= minVotants) {
    let _delay = 0x1f;
    while ((_delay -= 0x10) >= 0) { /* no-op */ }
    zeroVoteByte32x(5);

    // Cat 3 NO uses fcomp [mem] (no fxch): st(0) (= cvar value) is
    // popped by fcomp, so we explicitly push0.0 as the set value.
    const cvarTarget = readROFloat(0x6f408);
    const currentVal = (engine as any).func0xe4(readROString(0x6e507));
    if (currentVal !== cvarTarget) {
      (engine as any).func0xec(readROString(0x6e507), 0.0);
    }

    UTIL_ClientPrintAll(PRINT_CHAT, readROString(0x6e350));
    this.winningVoteName = readROInt(0x6e4fb) as unknown as string;
    this.winningVoteExtra = readROInt(0x6e4f7) as unknown as string;
    return;
  }

  // Fallback: copy the highest-tally winner name when that entry alone
  // meets minVotants. Only when bestVoteIndex != -1.
  if (bestVoteIndex !== -1 && this.votesArray[bestVoteIndex] >= minVotants) {
    strcpy(this.winningVoteName, this.voteWinnerNames[bestVoteIndex]);
  }
}
