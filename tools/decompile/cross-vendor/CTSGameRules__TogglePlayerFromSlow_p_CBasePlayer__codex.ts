```typescript
/**
 * CTSGameRules::TogglePlayerFromSlow — removes a player from the
 * slow-motion slot array by nulling the matching entry.
 *
 * Walks the per-entity slot array (1..maxClients, GoldSrc's 1-based
 * entity indexing) and clears the first slot that points at `p`. No
 * other side effects; if `p` is not currently flagged as slowed, the
 * function is a no-op.
 *
 * @param this  The CTSGameRules instance (this in the original C++)
 * @param p     The CBasePlayer to take out of slow motion
 * @returns     void
 */
export function TogglePlayerFromSlow(this: CTSGameRules, p: CBasePlayer): void {
  // [ebx+0x1600] -> [edx] -> [eax+0x90] is the engine's maxClients path
  // (PIC/GOT base -> engine globals pointer -> maxClients field).
  // TODO(asm-ambiguous): confirm the global pointer chain behind this lookup.
  const maxClients = engineMaxClients;

  // Slot array lives at this+0x57c as an array of CBasePlayer* pointers
  // (stride 4). Slot 0 is reserved/unused; slots 1..maxClients
  // correspond to entity indices.
  for (let i = 1; i <= maxClients; i++) {
    if (this.m_pSlowPlayers[i] === p) {
      this.m_pSlowPlayers[i] = null;
      return;
    }
  }
}
```
