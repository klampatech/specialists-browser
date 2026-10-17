```typescript
/**
 * CTSFlag::CanInteract — can the given player interact with this flag entity?
 *
 * Returns true when the flag has no carrier (m_iFlagStatus == -1) so anyone
 * may pick it up, or when the player's team matches the value stored in
 * m_iFlagStatus (e.g. the player is on the carrier's team and may return a
 * dropped flag).
 *
 * @param this     The CTSFlag entity
 * @param pPlayer  The CBasePlayer attempting to interact with the flag
 * @returns        true if interaction is allowed
 */
export function CanInteract(this: CTSFlag, pPlayer: CBasePlayer): boolean {
  // Flag is at base / no carrier: anyone can interact.
  if (this.m_iFlagStatus === -1) {
    return true;
  }

  // Resolve the player's team name via the virtual getter hanging off
  // pPlayer.m_pTeamInfo (offset 0x60 -> vtable entry at +0xd0), then look
  // the team index up through CTSGameRules.
  const playerTeamName = pPlayer.GetTeamName();
  const playerTeamIndex = CTSGameRules.GetTeamIndex(playerTeamName);

  // Allow interaction only when the player is on the same team as the
  // flag's recorded status.
  return this.m_iFlagStatus === playerTeamIndex;
}
```
