```typescript
/**
 * CTSObjective::Freeze — toggles the objective's active state and refreshes HUD.
 *
 * Inverts the incoming freeze flag, stores the result in the objective's
 * byte flag at offset 0x64, then forwards the same inverted value to
 * `CTSGameRules::ShowObjectiveOnHud` so the on-screen state always
 * matches what was just written.
 *
 * @param this     The CTSObjective entity instance
 * @param bFreeze  true to freeze (deactivate), false to unfreeze (activate)
 * @returns        void
 */
export function Freeze(this: CTSObjective, bFreeze: boolean): void {
  // Byte at offset 0x64 holds the *inverted* flag — semantically "active"
  // rather than "frozen" (i.e. `!bFreeze`). The xor with 1 in the asm makes
  // this an explicit inversion, not a typo.
  // TODO: confirm exact field name during class layout reconstruction (D.4).
  this.m_fActive = !bFreeze;

  // Refresh the HUD with the same value we just stored. The first pushed
  // arg is `mpGameRules` (singleton at GOT offset 0x14f0) which serves as
  // the `this` for the CTSGameRules::ShowObjectiveOnHud member call.
  // The 6-byte stack slide before the pushes is just cdecl alignment.
  mpGameRules.ShowObjectiveOnHud(this, !bFreeze);
}
```
