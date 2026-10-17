```typescript
/**
 * CTSGameRules::SendObjectiveList — iterates this game-rule's objective list
 * and sends each objective as a per-target HUD message (typical use: a
 * connecting player). No-op if `pTarget` is null.
 *
 * @param this      The CTSGameRules instance (this in the original C++)
 * @param pTarget   Entity that should receive the objective HUD messages.
 *                  If null, the function does nothing.
 * @returns         void
 */
export function SendObjectiveList(
  this: CTSGameRules,
  pTarget: CBaseEntity | null,
): void {
  if (pTarget == null) return;

  const count: number = this.m_iObjectiveCount; // TODO: offset 0x2d0 — purpose inferred from loop bound
  for (let i = 0; i < count; i++) {
    this.SendObjectiveToHud(i, pTarget);
  }
}
```
