```typescript
/**
 * CTSGameRules::TeamWin — award a round win to a team.
 *
 * End-of-round sequence: broadcast a timestamped "round over" HUD
 * message (unless silenced), optionally schedule the next round, then
 * dispatch to one of three branches based on player count and the
 * winning-team sentinel:
 *   • ≤ 1 connected → reset the four round-end state slots and
 *     broadcast a generic "round reset" banner.
 *   • winningTeam == 2 (draw) → broadcast a draw banner and write a
 *     draw log line.
 *   • real winner → bump the team's win counter, distribute cash to
 *     each player based on team match, broadcast the winner banner,
 *     and write a log line.
 * Finally, if this->m_iRoundType ∈ {2, 3}, play up to two announcer
 * sounds per round-type entry (slot 1 at +0x18, slot 2 at +0xa4;
 * the flag is the first byte of the sound path string).
 *
 * @param this          The CTSGameRules instance
 * @param iWinningTeam  Index of the team that won (2 == draw / no winner)
 * @param iScoreDelta   Cash/score delta for each player; when 0 the
 *                      per-team cvars are used instead
 * @param bRestartRound If truthy, schedule the next round and clear
 *                      the round-start timestamp
 * @param bSilent       If truthy, skip the early "round over" HUD
 *                      message and use the shorter winner banner
 * @returns             void
 */
export function TeamWin(
  this: CTSGameRules,
  iWinningTeam: number,
  iScoreDelta: number,
  bRestartRound: boolean,
  bSilent: boolean,
): void {
  // ─── 1. Early "round over" HUD message (timestamped) ────────────────
  // Skipped if the round wasn't actually in progress, or if silenced.
  // TODO: this+0x10 — purpose inferred from a byte-check; likely m_bRoundActive.
  if (this.m_bRoundActive !== 0 && !bSilent) {
    const flRoundDuration = gpGlobals.time - this.m_flRoundStartTime;
    engine.MessageBegin(/* MSG_ALL */, /* round-over econ */, null, null, null);
    engine.WriteShort(flRoundDuration | 0);   // float → int via FISTP (truncate)
    engine.WriteShort(2);
    engine.MessageEnd();
  }

  // ─── 2. Schedule next-round restart (if requested) ─────────────────
  if (bRestartRound) {
    // QWORD constant at [ebx-0x6e768] is the round-restart delay (double).
    this.m_flNextRoundTime = gpGlobals.time + ROUND_RESTART_DELAY;
    this.m_flRoundStartTime = 0;
  }

  // ─── 3. Branch on player count + winning-team sentinel ─────────────
  // TODO(asm-ambiguous): the asm pushes `this` before calling
  // CountPlayers and adds esp,0x10 after — looks like a stack-alignment
  // artifact; treat as no-arg.
  const iPlayerCount = this.CountPlayers();

  if (iPlayerCount <= 1) {
    // Not enough players — reset the four round-end time/score slots
    // (each 0x8c bytes apart) and broadcast a generic banner.
    const now = gpGlobals.time | 0;
    this.m_iTimeSlotA = now; this.m_iScoreA0 = 0; this.m_iScoreA1 = 0;  // +0x1c,+0x20,+0x24
    this.m_iTimeSlotB = now; this.m_iScoreB0 = 0; this.m_iScoreB1 = 0;  // +0xa8,+0xac,+0xb0
    this.m_iTimeSlotC = now; this.m_iScoreC0 = 0; this.m_iScoreC1 = 0;  // +0x134,+0x138,+0x13c
    this.m_iTimeSlotD = now; this.m_iScoreD0 = 0; this.m_iScoreD1 = 0;  // +0x1c0,+0x1c4,+0x1c8
    TSHudMessageAll(/* "round reset" str at [ebx-0x6e66e] */, 30, 8, 0, 0, 0);
  } else if (iWinningTeam === 2 /* draw sentinel */) {
    // Draw / no clear winner — generic banner + log line.
    TSHudMessageAll(/* "draw" str at [ebx-0x6e641] */, 30, 8, 0, 0, 0);
    UTIL_LogPrintf(/* draw log fmt at [ebx-0x6e637] */);
  } else {
    // ── Real winner path ──

    // Bump the winning team's win counter.
    // team stride = 0x8c, wins at +0x24 from each team slot's base.
    this.m_pTeams[iWinningTeam].m_iWins++;

    // Per-player cash distribution loop.
    for (let i = 1; i <= gpGlobals.maxClients; i++) {
      const player = UTIL_PlayerByIndex(i);
      if (!player) continue;
      if (!player.IsConnected()) continue;          // virtual at vtable+0xc8

      // Cash reward: prefer iScoreDelta; fall back to per-team cvars.
      const cashForWinner = iScoreDelta !== 0
        ? iScoreDelta
        : parseInt(getCvar(/* winner-team cvar at ebx+0x163c */));
      const cashForLoser  = parseInt(getCvar(/* loser-team  cvar at ebx+0x1af0 */));

      const playerTeam    = GetTeamIndex(this, player.GetTeamName());
      const onWinningTeam = playerTeam === iWinningTeam;

      if (onWinningTeam) player.GiveCash(cashForWinner);
      else              player.GiveCash(cashForLoser);

      engine.MessageBegin(/* MSG_ALL */, /* per-player econ at ebx+0x1b34 */, null, null, null);
      engine.WriteShort(onWinningTeam ? 0 : 1);
      engine.WriteShort(player.m_iWeaponId /* at +0x208 */); // TODO(asm-ambiguous)
      engine.MessageEnd();
    }

    // Count players currently on the winning team (for log line).
    // TODO(asm-ambiguous): the asm at 0x68de8..0x68ea3 does a second
    // player loop that asks the engine's team-finder (ebx+0x2060,
    // vtable+0xd0) for each player's team and compares against the
    // winning team's name. Exact predicate not visible in this chunk.
    let iCountOnWinningTeam = 0;
    /* … see 0x68de8..0x68ea3 in the original asm … */

    // Format and broadcast the winner banner.
    const banner = sprintf(
      bSilent
        ? /* fmt 1 at [ebx-0x6e653] */ "%s wins"
        : /* fmt 2 at [ebx-0x6e649] */ "%s wins the round",
      this.m_pTeams[iWinningTeam].m_szName,    // offset +0x28
    );
    TSHudMessageAll(banner, 30, 8, 0, 0, 0);

    // Server log line.
    // Format at [ebx-0x6e4b0] takes (team_name, score_table_val, win_count).
    UTIL_LogPrintf(
      this.m_pTeams[iWinningTeam].m_szName,
      /* score-table value at [ebx+0x165c + idx*4] */,
      iCountOnWinningTeam,
    );
  }

  // ─── 4. Announcer sounds (only for round types 2 / 3) ───────────────
  // TODO: this+0x00 — purpose inferred from "(x-2) ≤ 1 unsigned" check;
  // probably m_iRoundType / m_iPhase / m_bSpecialRound.
  if (this.m_iRoundType >= 2 && this.m_iRoundType <= 3) {
    let ebp      = this.m_pRoundTypes;          // base at this+0x10
    let edi      = this.m_pRoundTypes + 0x18;   // first sound's path string
    let roundIdx = 0;

    // Each iteration handles two sound slots within one round-type
    // entry, then advances to the next entry.
    while (roundIdx <= 3) {
      // Sound slot 1 — flag == first byte of the path string.
      if (edi[0] !== 0) {
        engine.MessageBegin(/* MSG_ALL */, /* sound econ at ebx+0x1be8 */, null, null, null);
        engine.WriteString(edi);
        engine.WriteShort(/* channel from [... + 0x14] */); // TODO(asm-ambiguous)
        engine.WriteShort(0);
        engine.MessageEnd();
      }

      // Advance to sound slot 2 within the same round-type entry.
      edi += 0x8c;

      if (edi[0] !== 0) {
        engine.MessageBegin(/* MSG_ALL */, /* sound econ at ebx+0x1be8 */, null, null, null);
        engine.WriteString(edi);
        engine.WriteShort(/* channel from [... + 0x14] */); // TODO(asm-ambiguous)
        engine.WriteShort(0);
        engine.MessageEnd();
      }

      // Advance to next round-type entry.
      edi += 0x8c;
      ebp += 0x118;
      roundIdx += 2;
    }
  }
}

// TODO: define these types properly (D.4 task — full class reconstruction)
type CTSGameRules = any;
type CBasePlayer = any;
```
