/**
 * CTSGameRules::CheckDeads — periodic round-end evaluator.
 *
 * @param this  CTSGameRules rules object.
 */
export function CheckDeads(this: CTSGameRules): void {
  // asm 0x69c17: reset the per-tick counter at +0x5880.
  this.m_someField_5880 = 0;

  // asm 0x69c21..0x69c2f: rate-limit gate.
  //   fcomp g_6f408 vs this.m_flLastCheckTime; je (return) iff g_6f408 <= m_flLastCheckTime.
  if (g_checkCvar_6f408 <= this.m_flLastCheckTime) return;

  const mode = this.m_iGameMode;
  if (mode === 1) return;

  if (mode === 0) {
    // ----- Deathmatch -----
    let aliveCount = 0;
    let connectedCount = 0;
    let lastPlayer: any = null;

    for (let i = 1; i <= gpGlobals.maxClients; i++) {
      const player = UTIL_PlayerByIndex(i);
      if (!player) continue;
      if (player.isInGame()) {                  // vtable+0xc8
        connectedCount++;
        if (player.isAlive()) {                 // vtable+0xb4
          lastPlayer = player;
          aliveCount++;
        }
      }
    }

    if (aliveCount === 1) {
      // Single-survivor branch (0x69cd5..0x69e42).
      if (connectedCount <= 1) {
        TSHudMessageAll(/*x*/0, /*y*/0, /*color*/0xff, /*channel*/8,
                        /*duration*/30, "Only one player is in the game" /* str @ ebx-0x6e66e */);
      } else if (lastPlayer !== null) {
        const winnerName = STRING(gpGlobals.pStringBase + lastPlayer.pev.netname /* +0x1d0 */);
        const msg = UTIL_VarArgs(/*str @ ebx-0x6e410*/ "%s is the last man standing", winnerName);
        TSHudMessageAll(/*x*/0, /*y*/0, /*color*/0xff, /*channel*/1,
                        /*duration*/30, msg);

        lastPlayer.pev.frags += 10;

        // TODO(asm-ambiguous): engine vtable plumbing at 0x69d74..0x69e18 —
        // MESSAGE_BEGIN/WRITE_SHORT/WRITE_BYTE/MESSAGE_END for the
        // "round ended" client notification.

        UTIL_LogPrintf(/*str @ ebx-0x6e3d0*/, winnerName);
      }
    } else if (aliveCount !== 1) {
      // Covers both aliveCount === 0 and aliveCount >= 2.
      // The DAG at 0x69ed4..0x69f62 routes the messenger block to either:
      //   • 0x69f3c ("X players remain") or
      //   • 0x69ef7 (m_bRoundTied check).
      const roundOver     = aliveCount === 0 || this.m_flRoundEndTime < gpGlobals.time;
      const multipleConnd = connectedCount > 1;

      if (!roundOver && multipleConnd) {
        // Path → 0x69f3c directly (skip the m_bRoundTied check).
        const msg = UTIL_VarArgs(/*str @ ebx-0x6e61a*/ "%d players remain", aliveCount);
        TSHudMessageAll(/*x*/0, /*y*/0, /*color*/0xff, /*channel*/1,
                        /*duration*/30, msg);
      } else {
        // Path → 0x69ef7: tie-aware dispatch.
        if (this.m_bRoundTied !== 0) {
          TSHudMessageAll(/*x*/0, /*y*/0, /*color*/0xff, /*channel*/8,
                          /*duration*/30, "Round tied" /* str @ ebx-0x6e625 */);
          this.m_flLastCheckTime = gpGlobals.time + ROUND_TIE_DELAY;
        } else {
          // Falls through to 0x69f3c from inside 0x69eff's `je`.
          const msg = UTIL_VarArgs(/*str @ ebx-0x6e61a*/ "%d players remain", aliveCount);
          TSHudMessageAll(/*x*/0, /*y*/0, /*color*/0xff, /*channel*/1,
                          /*duration*/30, msg);
        }
      }
    }

    // asm 0x69e45: time-update + (when m_bRoundTied) HUD/sleep plumbing.
    this.m_flLastCheckTime = gpGlobals.time + ROUND_CHECK_DELAY;

    if (this.m_bRoundTied !== 0) {
      // TODO(asm-ambiguous): engine vtable plumbing at 0x69e66..0x69ec3 —
      // MESSAGE_BEGIN/WRITE_SHORT + sleep-timer adjust + MESSAGE_END.
    }
    return;
  }

  // ----- Team modes (2 and 3) -----
  if (mode === 2 || mode === 3) {
    if (mode > 3) return;       // asm 0x69f71: `cmp al, 1; ja end`

    const teamCounts: number[] = [0, 0, 0, 0];   // asm 0x69f7e: cld + rep stosd(4)
    let totalCount = 0;

    for (let i = 1; i <= gpGlobals.maxClients; i++) {
      const player = UTIL_PlayerByIndex(i);
      if (!player) continue;
      if (!player.isInGame()) continue;

      const alive = player.isAlive();
      // asm 0x69fce..0x69fdf: fcomp + test ah,0x41 + je → skip iff exact-equality
      // (the death time equals the round-start sentinel).
      if (!alive && g_checkCvar_6f408 === player.pev.deathTime /* pev+0x770 */) continue;

      const teamIdx = GetTeamIndex(this, player.teamName() /* vtable+0xd0 */);
      if (teamIdx >= 0 && teamIdx < teamCounts.length) {
        teamCounts[teamIdx]++;
        totalCount++;
      }
    }

    if (mode === 3) {
      // asm 0x6a026..0x6a0f1: FireTargets-based round-end.
      if (totalCount === 0) {
        TeamWin(this, /*winningTeam*/2, /*losingTeam*/0, /*flag*/true, /*reason*/0);
      } else if (teamCounts[1] === 0 && this.m_pWinTarget !== null) {
        // Team 1 wiped → fire team-0-wins target (offset +0x9c).
        STRING(gpGlobals.pStringBase /* +0x98 */ + this.m_pWinTarget.iszTeam0Wins /* +0x9c */);
        FireTargets(/*name*/ /* TODO */, this.m_pWinTarget, this.m_pWinTarget, /*USE_TYPE*/3, /*fParam*/0);
      } else if (teamCounts[0] === 0 && this.m_pWinTarget !== null) {
        // Team 0 wiped → fire team-1-wins target (offset +0x98).
        STRING(gpGlobals.pStringBase /* +0x98 */ + this.m_pWinTarget.iszTeam1Wins /* +0x98 */);
        FireTargets(/*name*/ /* TODO */, this.m_pWinTarget, this.m_pWinTarget, /*USE_TYPE*/3, /*fParam*/0);
      }
    } else {
      // mode === 2
      if (totalCount === 0) {
        TeamWin(this, 2, 0, true, 0);
      } else if (teamCounts[1] === 0) {
        TeamWin(this, 0, 0, true, 0);
      } else if (teamCounts[0] === 0) {
        TeamWin(this, 1, 0, true, 0);
      }
    }
  }
}
