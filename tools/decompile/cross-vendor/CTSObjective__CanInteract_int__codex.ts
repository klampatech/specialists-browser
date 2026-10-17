```typescript
/**
 * CTSObjective::CanInteract — returns whether an interactor (identified by
 * team id) is allowed to interact with this objective. If the objective's
 * team gate is the -1 sentinel, any interactor is permitted; otherwise the
 * interactor's team id must match the objective's team gate.
 *
 * @param this   The CTSObjective entity instance
 * @param team   The interactor's team id (sentinel -1 means "any team")
 * @returns      true if the interactor may interact with this objective
 */
export function CanInteract(this: CTSObjective, team: number): boolean {
  // Field at offset 0x68: the objective's team gate. -1 means unrestricted.
  // TODO(asm-ambiguous): confirm field name and offset meaning via the
  // CTSObjective class definition produced by the D.4 decompilation task.
  const ownerTeam: number = (this as any).m_iTeam as number;
  if (ownerTeam === -1) {
    return true;
  }
  return ownerTeam === team;
}
```
