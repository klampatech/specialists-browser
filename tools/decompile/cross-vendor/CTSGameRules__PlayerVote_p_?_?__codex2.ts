// TODO: declare CTSGameRules and edict_s when class layout / engine types are
//       reconstructed. Both reduce to `any` here so the file compiles standalone.
type CTSGameRules = any;
type edict_s = any;

// Forward decls for external helpers used in this file. Real project wires these
// up from the engine/mod glue module; stubbed as `any` for standalone compile.
declare function ENTINDEX(e: any): number;
declare function ClientPrint(ent: any, printType: number, msg: string): void;
declare function UTIL_VarArgs(fmt: string, ...args: any[]): string;
declare function CalcMiniminVotants(playerCount: number): number;
declare function UTIL_ClientPrintAll(printType: number, msg: string): void;
declare function findPlayerIndexByName(name: string): number;

/**
 * CTSGameRules::PlayerVote — handle a player's `vote` console command,
 * dispatching the "yes" / "no" / "kick <name>" sub-commands.
 *
 * Returns 1 if a sub-command matched (including the paths that simply
 * HUD-message the voter). Returns 0 if the voter index is out of range or
 * the command did not match any known sub-command.
 *
 * @param this     The CTSGameRules entity (`this` in the original C++).
 * @param voter    The edict_s of the player issuing the vote.
 * @param voteCmd  The full `vote ...` console string.
 * @returns        1 on a matched sub-command; 0 otherwise.
 */
export function PlayerVote(
  this: CTSGameRules,
  voter: edict_s,
  voteCmd: string,
): number {
  // ── 1. Voter slot index lookup; bail on out-of-range index. ──────────────
  // asm resolves the edict via a vtable call at [eax+0x11c] — likely
  // pfnIndexOfEdict. Result is the voter's slot index in [0..31].
  // TODO(asm-ambiguous): confirm engine helper name from eiface.h.
  const voterIndex: number = ENTINDEX(voter);
  if (voterIndex > 0x1f) return 0;

  const tellVoter = (msg: string): number => {
    ClientPrint(voter, 3, msg);
    return 1;
  };

  // ── 2. "vote yes" — wipe and restamp this voter's ballot entry. ─────────
  // asm: strstr(voteCmd, "yes"). On match:
  //   * Zero 72 bytes (18 dwords) at this+0x684 + voterIndex*72 — rep stosd
  //     w/ ecx=0x12, eax=0.
  //   * Stamp voterIndex+1 (1-based id) into this+0x6c8 + voterIndex*72 —
  //     i.e. at +0x44 within each 72-byte ballot entry.
  //   * HUD-print a confirmation to the voter, return 1.
  // TODO(asm-ambiguous): confirm substring via strings-n5.txt cross-ref.
  const YES_KEYWORD = "yes";
  if (voteCmd.indexOf(YES_KEYWORD) !== -1) {
    const ballotBase = 0x684 + voterIndex * 72;
    for (let off = 0; off < 72; off += 4) (this as any)[ballotBase + off] = 0;
    (this as any)[0x6c8 + voterIndex * 72] = voterIndex + 1; // 1-based id
    return tellVoter(/* TODO fmt: confirmation */);
  }

  // ── 3. "vote no" — walk the 32-player grid and HUD-print tallies. ──────
  // asm: strstr(voteCmd, "no"). Calls CalcMiniminVotants(this+0x1820)
  // discarding the result, then iterates 16 outer × 2 inner = 32 player
  // slots. Per pair: check flag byte at ebp+0xf88 and ebp+0xfc8; if set,
  // deref the slot pointer (block A reads struct[+0], block B reads
  // struct[+4]) and emit a UTIL_VarArgs+ClientPrint.
  // The "al" register tracks whether any inner print fired: al=1 →
  // no prints yet; al=0 → at least one. After loop, if al still 1, print
  // a single "tally complete" message and return 1.
  // TODO(asm-ambiguous): exact substring and the precise struct fields at +0/+4.
  const NO_KEYWORD = "no";
  if (voteCmd.indexOf(NO_KEYWORD) !== -1) {
    CalcMiniminVotants((this as any)[0x1820] | 0);

    let reachedAnyone = false; // asm "al" sentinel
    for (let i = 0; i < 0x20; i += 2) {
      const slotA = 0xf88 + i * 0x40;
      const slotB = slotA + 0x40;

      if (((this as any)[slotA] & 0xff) !== 0) {
        // Block A: format args come from struct[+0].
        ClientPrint(
          voter,
          3,
          UTIL_VarArgs(/* TODO fmt */, (this as any)[slotA]),
        );
        reachedAnyone = true;
      }
      if (((this as any)[slotB] & 0xff) !== 0) {
        // Block B: format args come from struct[+4].
        ClientPrint(
          voter,
          3,
          UTIL_VarArgs(/* TODO fmt */, (this as any)[slotB + 4]),
        );
        reachedAnyone = true;
      }
    }
    if (!reachedAnyone) {
      ClientPrint(voter, 3, /* TODO fmt: "tally complete" */);
    }
    return 1;
  }

  // ── 4. "vote kick <name>" — parse, validate, and store the kick vote. ──
  // asm: strstr(voteCmd, "kick"). After matching:
  //   * The asm adds +3 (not +4) past strstr's result and strcpy's the rest
  //     into a local buffer. The +3 is suspicious — likely a single-character
  //     shortcut for "kick " (5 chars would still be +5, so the literal may
  //     genuinely be 3 chars OR the original C has an off-by-one). The TS
  //     uses `KICK_KEYWORD.length` and lets the trailing .trim() clean up.
  //   * Two ctype-based whitespace trims (BLANK bit 0x4000) — equivalent
  //     to .trim().
  //   * Reject if target == voter name via engine helper at g_engfuncs+0x98
  //     combined with +0xc — abstracted as getPlayerName(voter).
  //   * Look up target by name via engine helper at [eax+0x1b8]; 0 = none.
  //   * strcpy target name into this+0x684 + targetIndex*72 (same slot
  //     array "yes" zeros).
  //   * Broadcast "vote to kick X recorded" via UTIL_ClientPrintAll,
  //     formatted with the target's stored netname at edict+0x1d0.
  //   * Return 1.
  // TODO(asm-ambiguous): exact substring (3 vs 4 chars) and engine helper names.
  const KICK_KEYWORD = "kick";
  const kickAt = voteCmd.indexOf(KICK_KEYWORD);
  if (kickAt !== -1) {
    const targetName = voteCmd.slice(kickAt + KICK_KEYWORD.length).trim();

    const voterName: string = (this as any).getPlayerName(voter);
    if (voterName === targetName) {
      return tellVoter(/* TODO fmt: "you can't kick yourself" */);
    }

    const targetIndex: number = findPlayerIndexByName(targetName);
    if (targetIndex === 0) {
      return tellVoter(/* TODO fmt: "no such player" */);
    }

    // Store target name into its ballot slot.
    (this as any)[0x684 + targetIndex * 72] = targetName;

    // Broadcast to all clients, formatted with the parsed name + the HL1
    // netname (typical offset 0x1d0) of the target edict.
    UTIL_ClientPrintAll(
      3,
      UTIL_VarArgs(
        /* TODO fmt */,
        targetName,
        (this as any).edicts[targetIndex].name,
      ),
    );
    return 1;
  }

  // ── 5. Unrecognized sub-command. ────────────────────────────────────────
  return 0;
}
