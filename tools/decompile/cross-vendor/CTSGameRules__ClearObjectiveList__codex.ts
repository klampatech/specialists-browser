```typescript
/**
 * CTSGameRules::ClearObjectiveList — resets the round objective list.
 *
 * Zeroes the objective count and the 40-slot (160 byte) objective
 * pointer array. Called when a new round starts or when the
 * objective set needs to be wiped (e.g. before re-initializing).
 *
 * @param this  The CTSGameRules instance (this in the original C++)
 * @returns     void
 */
export function ClearObjectiveList(this: CTSGameRules): void {
  // Reset count field at offset 0x2d0
  this.m_NumObjectives = 0;
  // Zero-fill the 40-slot objective pointer array (160 bytes starting at 0x2d4).
  // TODO: confirm slot count — 160 bytes / 4 = 40 dwords; assumed to be a
  // fixed-size array of CTSObjective pointers based on AddObjectiveInList
  // taking a (p CTSObjective, p int) pair.
  for (let i = 0; i < 40; i++) {
    this.m_Objectives[i] = null as any;
  }
}
```
