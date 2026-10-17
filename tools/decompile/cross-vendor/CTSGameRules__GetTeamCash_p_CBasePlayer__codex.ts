```typescript
/**
 * CTSGameRules::GetTeamCash — return the cash balance of a player's team.
 * Returns 0 for non-team modes or when the player's team cannot be resolved.
 *
 * @param this  The CTSGameRules game rules instance (this in the original C++)
 * @param p     The CBasePlayer whose team's cash is being queried
 * @returns     The team's current cash, or 0 if not applicable
 */
export function GetTeamCash(
  this: CTSGameRulesP11CBasePlayer,
  p: CBasePlayer,
): number {
  // Only modes 2 (Team Deathmatch) and 3 (The One / Assassination) carry
  // team cash. The unsigned test `(m_iGameMode - 2) > 1` succeeds for every
  // mode other than 2 and 3, short-circuiting to a 0 return.
  // TODO(asm-ambiguous): confirm exact game-mode constants from TS source
  if (this.m_iGameMode - 2 > 1) {
    return 0;
  }

  // Resolve the player's team from its team-name string (a per-player buffer
  // living at CBasePlayer + 0xb48).
  // TODO(asm-ambiguous): exact field name for the team-name buffer is unknown
  const teamIndex = GetTeamIndex(this, p.m_szTeamName);
  if (teamIndex === -1) {
    return 0;
  }

  // m_TeamData is an array of 140-byte team structs starting at this + 0x1c;
  // the team's cash balance is the first DWORD of each entry.
  // TODO(asm-ambiguous): full m_TeamData struct layout (35 DWORDs per team) is unknown
  return this.m_TeamData[teamIndex].cash;
}
```
