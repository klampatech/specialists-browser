/**
 * CTSGameRules::SendObjectiveList — iterates this game-rule's
 * objective list and sends each objective as a per-target HUD
 * message (typical use: a connecting player). No-op if `pTarget`
 * is null. Assembly: `tools/decompile/chunks/SendObjectiveList__12CTSGameRulesP11CBaseEntity.chunk.md`.
 *
 * @param this      The CTSGameRules instance (this in the original C++)
 * @param pTarget   Entity that should receive the objective HUD messages.
 *                  If null, the function does nothing.
 * @returns         void
 *
 * TODO(D.4): field name `m_iObjectiveCount` for offset 0x2d0 is
 *   inferred; confirm against the CTSGameRules class layout in D.4.
 */
export function SendObjectiveList(
  this: any,         // CTSGameRules — full type wired up in D.4
  pTarget: any,      // CBaseEntity | null
): void {
  if (pTarget == null) return;

  const count: number = this.m_iObjectiveCount; // offset 0x2d0
  for (let i = 0; i < count; i++) {
    this.SendObjectiveToHud(i, pTarget);
  }
}
