```typescript
/**
 * CTSBriefcase::CanInteract — determines whether the given player is
 * permitted to interact with this briefcase.
 *
 * Returns true unconditionally when the briefcase has no team
 * restriction (m_nTeam == -1, i.e. TEAM_UNASSIGNED). Otherwise,
 * resolves the player's current team via the game rules and returns
 * true only if the resolved team index matches the briefcase's
 * configured team index.
 *
 * @param this     The CTSBriefcase entity (this in the original C++)
 * @param pPlayer  The player attempting to interact
 * @returns        true if the player may interact with the briefcase
 */
export function CanInteract(this: CTSBriefcase, pPlayer: CBasePlayer): boolean {
  // Unrestricted: anyone can interact with this briefcase.
  if (this.m_nTeam === -1) {
    return true;
  }

  // Fetch the player's team name via an indirect virtual call of the
  // form `[[pPlayer+0x60] + 0xd0](pPlayer)`. The owner of the +0xd0
  // vtable slot (likely a CGameRules / CBasePlayer team-name helper)
  // is unclear from the disassembly alone.
  // TODO(asm-ambiguous): exact identity of the +0xd0 method.
  const playerTeamName: string = (pPlayer as any).getTeamNameViaGameRules();

  // Resolve the player's team name to a numeric team index. The first
  // argument is a global string at [ebx + 0x14f0] (purpose unclear —
  // possibly a team-name table identifier or a canonical default
  // name); the second is the player team name just fetched.
  // TODO(asm-ambiguous): purpose of the global string at [ebx+0x14f0].
  const playerTeamIndex: number = (CTSGameRules as any).GetTeamIndex(
    /* globalString @ [ebx+0x14f0] */ '' as any,
    playerTeamName,
  );

  // Player may interact only if their team matches the briefcase's team.
  return this.m_nTeam === playerTeamIndex;
}
```
