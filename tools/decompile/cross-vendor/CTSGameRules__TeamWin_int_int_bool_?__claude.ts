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