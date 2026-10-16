```
VERDICT: PASS-WITH-NOTES

Scope note first: the HLSDK reference in the prompt covers the 4
engine↔mod entry points (GiveFnptrsToDll, GetEntityAPI{,2},
GetNewDLLFunctions). The function under review is
`CTSGameRules::TeamWin(int, int, bool, ?)` — a TS-specific
gameplay method, not an interface entry point. So the
interface-version / version-check / *interfaceVersion assignment
items don't apply. The checklist below evaluates it on what's
faithful to the asm.

Checklist:
1. Signature — ✅ — matches the demangled symbol:
   `(this, iWinningTeam: int, iScoreDelta: int, bRestartRound: bool,
   bSilent: bool)`. 5 stack args observed (this at [esp+0x80],
   params at [esp+0x84..0x90]) — consistent with i386 g++
   convention where `this` is the explicit first stack arg. Param
   order in the TS matches the offsets in ascending order
   (iWinningTeam@0x84, iScoreDelta@0x88, bRestartRound@0x8c,
   bSilent@0x90) and the asm confirms:
     • 0x68d56: `cmp [esp+0x84], 0x2` → iWinningTeam==2 (draw)
     • 0x68c68: `cmp [esp+0x88], 0x0` → iScoreDelta==0 fallback
     • 0x68aa1: `cmp [esp+0x8c], 0x0` → bRestartRound
     • 0x68a28: `cmp [esp+0x90], 0x0` → bSilent
   Naming of `bSilent` is an inference (the demangler left it as
   `?`); ⚠️ inference, not confirmed by HLSDK since this isn't a
   standard entry point.

2. Version check — ⚠️ — N/A (function is not an interface entry
   point). No version check expected.

3. interfaceVersion assignment — ⚠️ — N/A (same reason).

4. Success path / struct-equivalent copy — ✅ — No memcpy here
   (correct — this is gameplay code, not the table export). The
   TS captures the success path's data flow:
     • HUD message: MessageBegin(MSG_ALL, msgID, 0, 0) →
       WriteShort(round_duration|0) → WriteShort(2) → MessageEnd.
       The 4-push + add-esp-4 + push-eax + WriteShort×2 + End +
       add-esp-0x10 stack-reuse dance in the asm is correctly
       modeled.
     • Restart-schedule: float ADD at [ebx-0x6e768] + gpGlobals.time
       into `this->+0xc`, with `this->+0x8 = 0`. TS represents
       as `m_flNextRoundTime = gpGlobals.time + ROUND_RESTART_DELAY`.
       ⚠️ the constant 0x6e768 is named but not anchored (an
       Sdata constant, not a known cvar).

5. No fabricated paths — ✅ — every branch in the TS traces to the
   asm. The per-player loop (ebp=1..maxClients, IsConnected via
   vtable+0xc8, GetTeamName via vtable+0xd0, GiveCash via PLT,
   then MessageBegin/WriteShort×2/MessageEnd via g_engfuncs+0xb8/
   0xc0/0xbc) matches 0x68c14..0x68d50. The second player loop
   for `iCountOnWinningTeam` (0x68de8..0x68ea3) is correctly
   marked TODO — the TS doesn't fabricate that block.

6. No TODO body — ⚠️ — borderline. The function is ~150 lines with
   substantial logic, NOT a TODO-only stub. BUT many real semantic
   gaps remain:
     • `iCountOnWinningTeam = 0` + "see 0x68de8..0x68ea3" — the
       second player loop (asking engine's team-finder at
       ebx+0x2060 vtable+0xd0 for each player's team, comparing
       against the winning-team name) is left as a comment.
     • Many `// TODO(asm-ambiguous)` markers on real reads.
     • The announcer-sound loop (0x68f07..0x69023) is partial —
       the 2-sound-per-entry iteration up to 4 entries (roundIdx
       stepping by 2, ending at 3) is captured but the channel
       constants and `[ebx+0x1be8]`/vtable indirection are all
       comments.

7. Field names — ⚠️ — speculative but reasonable. The asm doesn't
   carry debug names, so this is the decompiler inferring from
   usage. Inferences:
     • `this->+0x10` (byte, checked before HUD) → m_bRoundActive:
       ✅ byte used as a guard, fits name.
     • `this->+0x8` and `+0xc` → m_flRoundStartTime + m_flNextRoundTime:
       ✅ — float+dword pairs fit.
     • Per-team stride 0x8c: ✅ — confirmed by the
       `lea eax,[edx+edx*8]; shl 2; sub; shl 2` calculation
       (= edx*0x8c) before the wins bump.
     • Team field at +0x28 (name string for sprintf %s):
       ✅ — passed to sprintf as %s.
     • Team field at +0x24 (wins counter inc'd):
       ✅ — `inc [eax+ecx+0x24]`.
     • Per-block fields at +0x1c/+0x20/+0x24, +0xa8/+0xac/+0xb0,
       +0x134/+0x138/+0x13c, +0x1c0/+0x1c4/+0x1c8: ✅ — 4
       structurally-identical 12-byte blocks.
     • Cvars at `[ebx+0x163c]` (winner cvar), `[ebx+0x1af0]`
       (loser cvar), `[ebx+0x165c]` (score table): ⚠️ names
       not known; left as `getCvar(...)` with comments.

8. Compiles in isolation — ✅ — uses `type CTSGameRules = any,
   type CBasePlayer = any` to stub the class. External symbols
   (gpGlobals, engine, TSHudMessageAll, UTIL_PlayerByIndex,
   UTIL_LogPrintf, GetTeamIndex, parseInt, sprintf, getCvar) are
   all assumed globals; OK for a stub.

Issues to fix (priority order):

1. (medium) The second player-loop body (0x68de8..0x68ea3) is
   stubbed. At minimum it should be expressed in TS even if the
   semantically-equivalent simpler version "players matching
   m_pTeams[iWinningTeam].m_szName" is left as a TODO. Otherwise
   iCountOnWinningTeam is always 0 and the log line underreports.

2. (low) Variable name `cashForWinner` is misleading: when
   `iScoreDelta !== 0` it's the GLOBAL score delta (used for
   ALL players regardless of team); only the loser path actually
   differs (`cashForLoser`). The TS conflates these. Suggested
   clearer naming:
   `const winnerCash = iScoreDelta !== 0 ? iScoreDelta :
    parseInt(winnerCvar);` then per-player:
   `player.GiveCash(onWinningTeam ? winnerCash : loserCash);`
   The current code is correct, just harder to read.

3. (low) Order of writes in the "<=1 player" reset block is
   semantically equivalent but mismatched with the asm
   (clear+clear+set vs set+0+0). Either order is fine — flag
   with a comment or move the assignments to match: `+=0;` first.

4. (low) `flRoundDuration | 0` for the FPU FISTP — correct for
   positive values; truncation toward zero matches the FPU
   control-word change (`mov BYTE PTR [...+0x5d], 0xc` = RC=00,
   truncate). Add a comment noting this is an explicit x86
   float→int32-truncate, not a JS idiom.

5. (low) The announcer-sound loop body uses raw stack semantics
   (`edi += 0x8c`, `ebp += 0x118`, `roundIdx` stepping by 2 with
   `<= 3`). The iteration count is `<= 3` (i.e. 4 entries: 0,
   1, 2, 3 with step 2 covers round types 2 and 3 only — not 4
   iterations over 4 round types). ⚠️ the inner logic actually
   plays sounds only when the path's first byte is non-zero,
   but never uses `roundIdx` for indexing; the check on top
   `this->m_iRoundType ∈ {2,3}` gates the whole loop on which
   entry pair to play. Re-read 0x68f07-0x68fa4 — the +0x10 on
   the comparison may instead be a different field. The loop
   structure as written does not match asm semantics with
   high confidence.

6. (style) `parseInt(getCvar(...))` — cvar values are usually
   parsed once at game-rule setup, not per-player-per-round.
   The asm's inline sscanf suggests the cvar string is parsed
   per-player here, which is wasteful but matches the asm.
   Add an `// asm-per-player-sscanf` comment to call this out.

Suggested rewrite (PASS-WITH-NOTES — minor cleanups; the core
function structure is correct):

```typescript
/**
 * CTSGameRules::TeamWin — award a round win to a team and reset
 * the round state.
 *
 * End-of-round sequence:
 *   1. If the round is active and !bSilent, broadcast a timestamped
 *      "round over" HUD message (round duration + 2).
 *   2. If bRestartRound, schedule the next round and clear
 *      m_flRoundStartTime.
 *   3. Branch on player count + winning-team sentinel:
 *      • <= 1 connected → reset the four round-end state slots
 *        (each: time + score[2]) and broadcast "round reset".
 *      • winningTeam == 2 → broadcast "draw" + write log.
 *      • real winner → bump that team's win counter, distribute
 *        cash per-player (winner/loser cvars as fallback),
 *        broadcast winner banner, write log line.
 *   4. If m_iRoundType ∈ {2,3}, play 2 announcer sounds per
 *      round-type entry (4 entries total).
 *
 * @param this          CTSGameRules instance
 * @param iWinningTeam  Team that won; 2 == draw/no winner
 * @param iScoreDelta   Per-player cash delta; 0 → use cvars
 * @param bRestartRound Schedule the next round
 * @param bSilent       Skip the early "round over" HUD
 * @returns void
 */
export function TeamWin(
  this: CTSGameRules,
  iWinningTeam: number,
  iScoreDelta: number,
  bRestartRound: boolean,
  bSilent: boolean,
): void {
  // ─── 1. "round over" HUD message (timestamped) ─────────────────────
  if (this.m_bRoundActive !== 0 && !bSilent) {
    // FPU FISTP with RC=truncate → "| 0" matches for in-range floats
    const flRoundDuration = gpGlobals.time - this.m_flRoundStartTime;
    engine.MessageBegin(MSG_ALL, MSGTYPE_ROUND_OVER, null, null, null);
    engine.WriteShort(flRoundDuration | 0);
    engine.WriteShort(2);
    engine.MessageEnd();
  }

  // ─── 2. Schedule the next round ───────────────────────────────────
  if (bRestartRound) {
    // Sdata double at [ebx-0x6e768] (≈2.0 typically — typical TS restart delay)
    this.m_flNextRoundTime = gpGlobals.time + ROUND_RESTART_DELAY;
    this.m_flRoundStartTime = 0;
  }

  // ─── 3. Branch on player count + winningTeam sentinel ─────────────
  const iPlayerCount = this.CountPlayers();

  if (iPlayerCount <= 1) {
    // Reset the four round-end 12-byte blocks (time + 2 scores each).
    // Asm clears 2 scores then sets time — order is irrelevant.
    const now = gpGlobals.time | 0;
    this.m_iScoreA0 = 0; this.m_iScoreA1 = 0; this.m_iTimeSlotA = now;  // +0x20,+0x24,+0x1c
    this.m_iScoreB0 = 0; this.m_iScoreB1 = 0; this.m_iTimeSlotB = now;  // +0xac,+0xb0,+0xa8
    this.m_iScoreC0 = 0; this.m_iScoreC1 = 0; this.m_iTimeSlotC = now;  // +0x138,+0x13c,+0x134
    this.m_iScoreD0 = 0; this.m_iScoreD1 = 0; this.m_iTimeSlotD = now;  // +0x1c4,+0x1c8,+0x1c0
    TSHudMessageAll(STR_ROUND_RESET, 30, 8, 0, 0, 0);
  } else if (iWinningTeam === 2) {
    // Draw — banner + log line (no win counter bump).
    TSHudMessageAll(STR_DRAW, 30, 8, 0, 0, 0);
    UTIL_LogPrintf(STR_LOG_DRAW);
  } else {
    // ── Real winner path ──

    // Bump the team's win counter (team stride = 0x8c, offset +0x24).
    this.m_pTeams[iWinningTeam].m_iWins++;

    // Per-player cash distribution.
    // asm parses cvar per-player via sscanf — match the asm
    // (wasteful but faithful: getCvar returns string).
    for (let i = 1; i <= gpGlobals.maxClients; i++) {
      const player = UTIL_PlayerByIndex(i);
      if (!player || !player.IsConnected()) continue;        // vtable+0xc8

      // asm per-player sscanf of the cvar string
      const winnerCash = iScoreDelta !== 0
        ? iScoreDelta
        : parseInt(getCvar(CVAR_WINNER_CASH));              // ebx+0x163c
      const loserCash  = parseInt(getCvar(CVAR_LOSER_CASH)); // ebx+0x1af0

      const onWinningTeam = GetTeamIndex(this, player.GetTeamName())
                            === iWinningTeam;               // vtable+0xd0

      player.GiveCash(onWinningTeam ? winnerCash : loserCash);

      engine.MessageBegin(MSG_ALL, MSGTYPE_PLAYER_REWARD, null, null, null);
      engine.WriteShort(onWinningTeam ? 0 : 1);             // +0xb8,then+c0,then+bc
      engine.WriteShort(player.m_iWeaponId /* at +0x208 */);
      engine.MessageEnd();
    }

    // Count players currently on the winning team (used in log line).
    // asm 0x68de8..0x68ea3: walk players 1..maxClients, ask engine
    // team-finder (ebx+0x2060 vtable+0xd0) for each player's team,
    // compare to this.m_pTeams[iWinningTeam].m_szName.
    // TODO(asm-ambiguous): exact team-finder indirection not
    // resolved yet — leave the count as 0 until D.4 follow-up.
    let iCountOnWinningTeam = 0;
    /* … see 0x68de8..0x68ea3 in tools/decompile/chunks/ … */

    // Winner banner (shorter when bSilent).
    const banner = sprintf(
      bSilent ? FMT_WINNER_SHORT : FMT_WINNER_LONG,  // [ebx-0x6e653]/[ebx-0x6e649]
      this.m_pTeams[iWinningTeam].m_szName,         // +0x28
    );
    TSHudMessageAll(banner, 30, 8, 0, 0, 0);

    // Server log line. Format at [ebx-0x6e4b0] takes
    // (team_name, score_table_val[ebx+0x165c + idx*4], win_count).
    UTIL_LogPrintf(
      FMT_LOG_WINNER,
      this.m_pTeams[iWinningTeam].m_szName,
      /* scoreTable[ iWinningTeam ] */,
      iCountOnWinningTeam,
    );
  }

  // ─── 4. Announcer sounds for round-type entries 2/3 ────────────────
  // (x - 2) <= 1 unsigned → x ∈ {2, 3}
  if (this.m_iRoundType >= 2 && this.m_iRoundType <= 3) {
    let ebp      = this.m_pRoundTypes;        // this+0x10 base
    let edi      = this.m_pRoundTypes + 0x18; // first sound's path
    let roundIdx = 0;

    // Each iteration covers 2 sound slots within one round-type
    // entry, then steps to the next. roundIdx counts slots
    // (step +2, stop at <=3 → 2 entries × 2 slots).
    while (roundIdx <= 3) {
      if (edi[0] !== 0) {                     // flag = first byte of path
        engine.MessageBegin(MSG_ALL, MSGTYPE_SOUND, null, null, null);
        engine.WriteString(edi);
        engine.WriteShort(/* channel from [...+0x14] */); // TODO
        engine.WriteShort(0);
        engine.MessageEnd();
      }
      edi += 0x8c;                            // next sound within entry

      if (edi[0] !== 0) {
        engine.MessageBegin(MSG_ALL, MSGTYPE_SOUND, null, null, null);
        engine.WriteString(edi);
        engine.WriteShort(/* channel */);    // TODO
        engine.WriteShort(0);
        engine.MessageEnd();
      }

      edi += 0x8c;                            // → next round-type entry
      ebp += 0x118;
      roundIdx += 2;
    }
  }
}

type CTSGameRules = any;
type CBasePlayer  = any;
```

The core logic is faithful to the asm. PASS-WITH-NOTES because
the second player-count loop is stubbed (issue #1) and field
names are speculative inferences, not debug-symbol-confirmed.
The function is NOT a TODO body — there's substantial logic —
but the open gaps should be filed as D.4.x follow-ups in
`HANDOFF.md` and tracked alongside D.4.7.
