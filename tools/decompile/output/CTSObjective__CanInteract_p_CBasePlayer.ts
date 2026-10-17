/**
 * CTSObjective::CanInteract — resolves the player's team name to a numeric
 * team index and forwards to the int overload to decide whether the player
 * may interact with this objective.
 *
 * @param this   The CTSObjective entity instance (this in the original C++)
 * @param player The CBasePlayer attempting the interaction
 * @returns     true if the player may interact with this objective
 */
export function CanInteract(this: any, player: any): boolean {
  // Virtual dispatch: [player+0x60] is the CBasePlayer vtable pointer,
  // [vtable+0xd0] is the getTeamName() slot (returns const char*).
  // TODO(asm-ambiguous): vtable slot index 0xd0 unverified against the
  // actual CBasePlayer vtable layout — D.4 cross-reference.
  const teamName: string = player.getTeamName();

  // CTSGameRules::GetTeamIndex(teamName). The global rules singleton
  // is loaded via [ebx+0x14f0] (PIC GOT). In the disassembly it's
  // pushed explicitly as the first arg; TypeScript hides the
  // implicit `this` since the call site binds it implicitly.
  const teamIndex: number = (CTSGameRules as any).GetTeamIndex(teamName);

  // Delegate to the int-overload (CanInteract__12CTSObjectivei), which
  // holds the actual per-team gating logic.
  return (this as any).CanInteract(teamIndex);
}
