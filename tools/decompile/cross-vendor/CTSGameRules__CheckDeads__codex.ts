```typescript
/**
 * CTSGameRules::CheckDeads — periodic round-end evaluator.
 *
 * Decides whether the current round should end based on player liveness:
 * mode 0 → deathmatch (single survivor wins +10 frags); mode 2 → surviving
 * team wins via TeamWin; mode 3 → FireTargets on the win-target entity.
 *
 * @param this  CTSGameRules rules object.
 * @returns     void
 */
export function CheckDeads(this: CTSGameRules): void {
  // Reset the per-tick counter at offset 0x5880 (read back by callers later).
  this.m_someField_5880 = 0;

  // Gate: bail unless the cvar at GOT -0x6f408 equals m_flLastCheckTime.
  // TODO(asm-ambiguous): whether this is a rate-limit, an absolute equality
  // check, or "is the cvar untouched" depends on engine internals not  // visible in this chunk.
  if (g_checkCvar_6f408 !== this.m_flLastCheckTime) return;

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
      if (player.isInGame()) { // vtable+0xc8
        connectedCount++;
        if (player.isAlive()) {              // vtable+0xb4
          lastPlayer = player;
          aliveCount++;
        }
      }
    }

    if (aliveCount === 1) {
      if (connectedCount <= 1) {
        // Only one player is even connected.
        TSHudMessageAll(/* x */ 0, /* y */ 0, /* color */ 0xff, /* channel */ 8, /* duration */ 30, "Only one player is in the game");
      } else if (lastPlayer !== null) {
        // Single survivor wins.
        const winnerName = STRING(gpGlobals.pStringBase + lastPlayer.pev.netname /* +0x1d0 */);
        const msg = UTIL_VarArgs(/* "%s is the last man standing" */, winnerName);
        TSHudMessageAll(/* x */ 0, /* y */ 0, /* color */ 0xff, /* channel */ 1, /* duration */ 30, msg);

        lastPlayer.pev.frags += 10;

        // TODO(asm-ambiguous): engine vtable plumbing at 0x69d74..0x69e18 —
        // MESSAGE_BEGIN/WRITE_SHORT/WRITE_BYTE/MESSAGE_END for the
        // "round ended" client notification. Not modeled here.

        UTIL_LogPrintf(/* "..." */, winnerName);
      }
    } else if (aliveCount > 1) {
      if (this.m_flRoundEndTime < gpGlobals.time) {
        if (this.m_bRoundTied !== 0) {
          // Round timer expired and the tie flag is set: announce tie, reschedule.
          TSHudMessageAll(/* x */ 0, /* y */ 0, /* color */ 0xff, /* channel */ 8, /* duration */ 30, "Round tied");
          this.m_flLastCheckTime = gpGlobals.time + ROUND_TIE_DELAY;
        } else {
          const msg = UTIL_VarArgs("%d players remain", aliveCount);
          TSHudMessageAll(/* x */ 0, /* y */ 0, /* color */ 0xff, /* channel */ 1, /* duration */ 30, msg);
        }
      }
    }
    return;
  }

  if (mode === 2 || mode === 3) {
    // ----- Team -----
    const teamCounts: number[] = [0, 0, 0, 0];
    let totalCount = 0;

    for (let i = 1; i <= gpGlobals.maxClients; i++) {
      const player = UTIL_PlayerByIndex(i);
      if (!player) continue;
      if (!player.isInGame()) continue;
      const alive = player.isAlive();
      // pev+0x770 is the player's death-time; count the player if they died
      // within the current round (deathTime >= cvar grace threshold) or are alive.
      const recentlyDead = !alive && g_checkCvar_6f408 <= player.pev.deathTime;
      if (!alive && !recentlyDead) continue;
      const teamIdx = GetTeamIndex(this, player.teamName() /* vtable+0xd0 */);
      if (teamIdx >= 0 && teamIdx < teamCounts.length) {
        teamCounts[teamIdx]++;
        totalCount++;
      }
    }

    if (mode === 3) {
      if (totalCount === 0) {
        TeamWin(this, /* winningTeam */ 2, /* losingTeam */ 0, /* flag */ true, /* reason */ 0);
        return;
      }
      if (teamCounts[1] === 0 && this.m_pWinTarget !== null) {
        // Team 1 wiped — team 0 wins — fire the team-0-wins target entity.
        const targetName = STRING(gpGlobals.pStringBase + this.m_pWinTarget.iszTeam0Wins /* +0x9c */);
        FireTargets(targetName, this.m_pWinTarget, this.m_pWinTarget, /* USE_TYPE */ 3, /* fParam */ 0);
        return;
      }
      if (teamCounts[0] === 0 && this.m_pWinTarget !== null) {
        // Team 0 wiped — team 1 wins — fire the team-1-wins target entity.
        const targetName = STRING(gpGlobals.pStringBase + this.m_pWinTarget.iszTeam1Wins /* +0x98 */);
        FireTargets(targetName, this.m_pWinTarget, this.m_pWinTarget, /* USE_TYPE */ 3, /* fParam */ 0);
        return;
      }
    } else {
      // mode === 2
      if (totalCount === 0) {
        TeamWin(this, 2, 0, true, 0);
        return;
      }
      if (teamCounts[1] === 0) {
        TeamWin(this, 0, 0, true, 0);
        return;
      }
      if (teamCounts[0] === 0) {
        TeamWin(this, 1, 0, true, 0);
        return;
      }
    }
  }
}
```
