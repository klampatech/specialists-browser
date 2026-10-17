```typescript
/**
 * CTSGameRules::SelectRandomTheOne — once the configured interval has
 * elapsed, pick one eligible player at random and promote them to
 * "The One" via SetPlayerTheOne, then broadcast a HUD notification.
 *
 * @param this  The CTSGameRules instance (this in the original C++)
 * @returns     void
 */
export function SelectRandomTheOne(this: CTSGameRules): void {
  // If the next-selection deadline hasn't elapsed yet, do nothing.
  const flCurrentTime = globals.time;
  if (this.m_flNextSelectTheOne > flCurrentTime) {
    return;
  }

  // Advance the deadline: next = currentTime + interval.
  this.m_flNextSelectTheOne = flCurrentTime + globals.flTheOneInterval;

  // Walk every player slot and collect eligible candidates (up to 32).
  const candidates: CBasePlayer[] = [];
  const MAX_CANDIDATES = 32;

  for (let iPlayerIdx = 1; iPlayerIdx <= globals.maxClients; iPlayerIdx++) {
    const pPlayer = UTIL_PlayerByIndex(iPlayerIdx);
    if (!pPlayer) continue;

    // Must be alive (player vtable+0xc8 → IsAlive()).
    if (!pPlayer.IsAlive()) continue;

    // If any alive player already wears TheOne, abort the whole selection.
    // [player+0x7b9] is a byte flag — the "is current TheOne" flag.
    if (pPlayer.m_bIsTheOne) {
      return;
    }

    // Must be connected (player vtable+0xb4 → IsConnected or similar).
    if (!pPlayer.IsConnected()) continue;

    // pev field at offset 0x244 — disqualifier; skip if non-zero.
    // TODO(asm-ambiguous): exact pev field unclear; probably deadflag or
    // a TS-specific disqualifier.
    if (pPlayer.pev.someFlag !== 0) continue;

    if (candidates.length >= MAX_CANDIDATES) continue;

    candidates.push(pPlayer);
  }

  if (candidates.length === 0) {
    return;
  }

  // Pick a random candidate and promote them.
  const pTheOne = candidates[RANDOM_LONG(0, candidates.length - 1)];
  this.SetPlayerTheOne(pTheOne);

  // Notify clients about the new TheOne.
  // TODO(asm-ambiguous): engine dispatch sends a HUD message to the
  // selected client. The original code dispatches two engine func-table
  // calls (around one player vtable call) with a payload of one byte
  // fetched from the player.
}
```
