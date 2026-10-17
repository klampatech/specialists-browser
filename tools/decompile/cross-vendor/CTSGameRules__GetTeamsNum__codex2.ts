/**
 * CTSGameRules::GetTeamsNum — counts how many of the four
 * fixed team slots are populated for the current round.
 *
 * Disassembly: `eax = 0`; test-and-`inc` four bytes at
 * `this + {0x28, 0xb4, 0x140, 0x1cc}` (each 0x8C bytes
 * apart, consistent with a `CTSTeam[4]` whose `m_bValid`
 * flag sits at the start of each element); return `eax`.
 *
 * The first asm slot uses `setne al` (because eax was just
 * zeroed); TS doesn't need to mirror that micro-opt.
 *
 * Returns the count of active slots in [0, 4].
 *
 * TODO(asm-ambiguous): `m_Teams[]` / `m_bValid` are
 *   inferred from the 0x8C stride; confirm against the
 *   decompiled CTSGameRules + CTSTeam headers in D.4.
 */
export function GetTeamsNum(this: any): number {
  let count = 0;
  if (this.m_Teams[0].m_bValid) count++;
  if (this.m_Teams[1].m_bValid) count++;
  if (this.m_Teams[2].m_bValid) count++;
  if (this.m_Teams[3].m_bValid) count++;
  return count;
}
