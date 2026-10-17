/**
 * CTSObjective::CanInteract — gates interactions by team. If the objective's
 * team gate is the -1 sentinel, any interactor is permitted; otherwise the
 * interactor's team id must equal the gate.
 *
 * @param this  The CTSObjective entity instance
 * @param team  The interactor's team id (-1 means "any team" on the *caller*
 *              side; here it's just a value to compare against the gate)
 * @returns     true if the interactor may interact with this objective
 */
export function CanInteract(this: CTSObjective, team: number): boolean {
  // Field at offset 0x68 (assembly `[ecx+0x68]`, `cmp ...,0xffffffff`).
  // TODO(asm-ambiguous): confirm the final field name via the D.4
  // CTSObjective class decompilation. Plausible names: m_iTeamGate,
  // m_iOwnerTeam, m_iTeam.
  const teamGate: number = (this as any).m_iTeamGate as number;

  // Assembly: cmp [ecx+0x68], 0xffffffff / jne / mov al,1 / ret
  if (teamGate === -1) {
    return true;
  }

  // Assembly fall-through: mov edx,[esp+0x8] / cmp [ecx+0x68], edx /
  // sete al / ret. The `mov eax, 0x0` before `sete al` is a zero-extend
  // idiom; TS `boolean` is the right target type.
  return teamGate === team;
}
