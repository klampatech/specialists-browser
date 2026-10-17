/**
 * CTSGameRules::InitTeamScore — empty stub.
 *
 * The original C++ method is a single `ret` instruction at 0x00069130
 * (1 byte), so it does nothing. It is exported from the TS server
 * mod's class but appears to be a placeholder / unused override of
 * the base GoldSrc rules.
 *
 * The parameter name `_score` is inferred from the demangler's type
 * signature; the original C++ source had a real parameter name that
 * cannot be recovered from a `ret`-only disassembly.
 *
 * @param this    The CTSGameRules entity instance (shape unknown in D.3 — use `any`)
 * @param _score  Int parameter from the demangled signature — unused
 *                (TypeScript `number`; TS has no `int` primitive)
 */
export function InitTeamScore(this: any, _score: number): void {
  // Intentionally empty — see disassembly: single `ret` at 0x00069130.
}
