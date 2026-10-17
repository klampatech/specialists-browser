/**
 * CTSGameRules::CheckDeads — periodic round-end evaluator.
 *
 * Modes:
 *   0 — deathmatch (single survivor wins +10 frags; supports "tied" reschedule)
 *   2 — team round-end (TeamWin when one team is wiped)
 *   3 — objective round-end (FireTargets on win-target entity)
 *
 * @param this CTSGameRules rules object.
 */
export function CheckDeads(this: any): void {
  // Reset per-tick counter at this+0x5880.
  this.m_someField_5880 = 0;

  // Rate-limit: bail unless the timing field matches the engine cvar.
  if (g_checkCvar_6f408 !== this.m_flLastCheckTime) return;

  const mode = this.m_iGameMode;
  if (mode === 1) return;

  if (mode === 0) {
    // ---- Deathmatch gate ----
    // If the deathmatch subsystem isn't initialized ([ebx+0x152c][0] == 0),
    // jump to the team-mode handler, which falls out for mode==0.
    if (g_dmInitPtr_152c.m_someInitFlag_0 === 0) {
      // Effectively a no-op for mode==0; team-mode tail falls through.
    } else {
      let aliveCount = 0;
      let connectedCount = 0;
      let lastPlayer: any = null;

      for (let i = 1; i <= gpGlobals.maxClients; i++) {
        const player = UTIL_PlayerByIndex(i);
        if (!player) continue;
        if (!player.isInGame()) continue;          // vtable+0xc8
        connectedCount++;
        if (!player.isAlive()) continue;           // vtable+0xb4
        lastPlayer = player;
        aliveCount++;
      }

      // Winner case (aliveCount == 1).
      if (aliveCount === 1 && connectedCount > 1 && lastPlayer !== null) {
        const winnerName = STRING(gpGlobals.pStringBase + lastPlayer.pev.netname);
        TSHudMessageAll(/* y */ 0, /* x? */ 0, /* color */ 0xff,
                        /* channel */ 1, /* dur */ 30,
                        UTIL_VarArgs("%s is the last man standing", winnerName));

        // Frags bump — offset 0x164 is *flat on the player*, not via pev.
        // Verify against cbase.h before merging.
        lastPlayer.frags_0x164 = (lastPlayer.frags_0x164 ?? 0) + 10;

        // TODO(D.5): port the client "round ended" notification.
        // Engine vtable calls at 0x69d60..0x69e18:
        //   pfnMessageBegin(type=2 SHORT)
        //   pfnGetGameDir()  (writes a server-side path string)
        //   pfnWriteString
        //   pfnWriteShort(truncate(lastPlayer.frags))
        //   pfnWriteShort([lastPlayer + 0xb30])
        //   pfnWriteShort(0)
        //   this->field_0xb48->vtable+0xd0(...)     // inc-and-return
        //   pfnWriteShort(<that result>)
        //   pfnMessageEnd
        // (TODO body omitted; see disassembly.)

        UTIL_LogPrintf(/* "...", */ winnerName);

        // *** Unconditional reschedule *** — this runs whether or not m_bRoundTied is set.
        this.m_flLastCheckTime = gpGlobals.time + ROUND_CHECK_DELAY;

        if (this.m_bRoundTied !== 0) {
          // TODO(D.5): port the tied countdown notification.
          // Engine vtable calls at 0x69e66..0x69ecc:
          //   pfnMessageBegin(type=2 SHORT)
          //   pfnWriteString(this->field_0x8 - gpGlobals.time, as truncated int)
          //   pfnWriteShort(2)
          //   pfnMessageEnd
        }
        return;
      }

      if (aliveCount === 1 && connectedCount <= 1) {
        TSHudMessageAll(0, 0, 0xff, /* channel */ 8, /* dur */ 30,
                        "Only one player is in the game");
        // Same unconditional reschedule applies here too (per 69e4d–69e59).
        this.m_flLastCheckTime = gpGlobals.time + ROUND_CHECK_DELAY;
        return;
      }

      // aliveCount != 1 path: timer check + tie branch.
      const timerExpired = this.m_flRoundEndTime < gpGlobals.time;
      const fellThroughFromDM = (aliveCount === 0) ||
                                (aliveCount > 1 && timerExpired) ||
                                (aliveCount > 1 && connectedCount <= 1);

      if (fellThroughFromDM) {
        if (this.m_bRoundTied !== 0) {
          TSHudMessageAll(0, 0, 0xff, /* channel */ 8, /* dur */ 30,
                          "Round tied");
          this.m_flLastCheckTime = gpGlobals.time + ROUND_TIE_DELAY;
        }
        // If m_bRoundTied == 0, the disassembly falls through to the
        // "X players remain" announcement at 0x69f3c — even if aliveCount==0.
        else {
          const msg = UTIL_VarArgs("%d players remain", aliveCount);
          TSHudMessageAll(0, 0, 0xff, /* channel */ 1, /* dur */ 30, msg);
        }
      } else if (aliveCount > 1 && connectedCount > 1) {
        // Round timer not yet expired and >1 connected — keep going.
        const msg = UTIL_VarArgs("%d players remain", aliveCount);
        TSHudMessageAll(0, 0, 0xff, /* channel */ 1, /* dur */ 30, msg);
      }
    }
    return;
  }

  if (mode === 2 || mode === 3) {
    // ---- Team / objective ----
    const teamCounts: number[] = [0, 0, 0, 0];
    let totalCount = 0;

    for (let i = 1; i <= gpGlobals.maxClients; i++) {
      const player = UTIL_PlayerByIndex(i);
      if (!player) continue;
      if (!player.isInGame()) continue;            // vtable+0xc8
      const alive = player.isAlive();              // vtable+0xb4
      // If dead, only count if deathTime >= cvar threshold (recently-dead
      // still belong to their team for win-tally purposes).
      if (!alive && g_checkCvar_6f408 > (player.deathTime_0x770 ?? 0)) continue;
      const teamIdx = GetTeamIndex(this, player.teamName() /* vtable+0xd0 */);
      if (teamIdx >= 0 && teamIdx < teamCounts.length) {
        teamCounts[teamIdx]++;
        totalCount++;
      }
    }

    if (mode === 3) {
      if (totalCount === 0) {
        TeamWin(this, /* winTeam */ 2, /* loseTeam */ 0, /* b1 */ true, /* reason */ 0);
        return;
      }
      if (teamCounts[1] === 0 && this.m_pWinTarget !== null) {
        // Team 1 wiped → team 0 wins → FireTargets on the team0-win string.
        const targetName = STRING(
          gpGlobals.pStringBase + this.m_pWinTarget.iszTeam0Wins /* +0x9c */);
        FireTargets(targetName, this.m_pWinTarget, this.m_pWinTarget,
                    /* USE_TYPE */ 3, /* fParam */ 0);
        return;
      }
      if (teamCounts[0] === 0 && this.m_pWinTarget !== null) {
        // Team 0 wiped → team 1 wins → FireTargets on the team1-win string.
        const targetName = STRING(
          gpGlobals.pStringBase + this.m_pWinTarget.iszTeam1Wins /* +0x98 */);
        FireTargets(targetName, this.m_pWinTarget, this.m_pWinTarget,
                    /* USE_TYPE */ 3, /* fParam */ 0);
        return;
      }
      return;
    }

    // mode === 2
    if (totalCount === 0) {
      TeamWin(this, /* winTeam */ 2, /* loseTeam */ 0, /* b1 */ true, /* reason */ 0);
      return;
    }
    if (teamCounts[1] === 0) {
      TeamWin(this, /* winTeam */ 0, /* loseTeam */ 0, /* b1 */ true, /* reason */ 0);
      return;
    }
    if (teamCounts[0] === 0) {
      TeamWin(this, /* winTeam */ 1, /* loseTeam */ 0, /* b1 */ true, /* reason */ 0);
      return;
    }
  }
}
