// D.4 will reconstruct the full CTSGameRules class.
// For D.3 isolation, declare just enough to type-check.
interface CTSGameRuleSlot { name: string }
interface CTSGameRules   { teams: CTSGameRuleSlot[] } // inferred from SetTeamList + symbol demangling (TODO D.4 verify field names)

/**
 * Local polyfill — `strcasecmp` is linked from libc in ts_i386.so.
 * For the browser we'll need a real case-insensitive compare.
 * The C ABI is `int strcasecmp(const char *s1, const char *s2)`,
 * returning 0 on equality (signed comparison otherwise).
 */
declare function strcasecmp(a: string, b: string): number;

/**
 * CTSGameRules::GetTeamIndex — Look up a team index by name (case-insensitive).
 *
 * Iterates the 4 configured team-name slots at offsets 0x28, 0xb4,
 * 0x140, 0x1cc (0x8c / 140-byte stride — name-to-name distance)
 * and returns the index of the first whose name case-insensitively
 * matches `name`. Returns -1 if no slot matches.
 *
 * Mirrors the assembly at0x00069b04: the first byte of each slot is
 * tested for 0 (empty-slot guard); non-empty slots are passed to
 * strcasecmp. Order of strcasecmp args is not semantically meaningful
 * (we only test equality), so the TS swaps them relative to the
 * disassembly for readability.
 *
 * @param this  The CTSGameRules entity instance.
 * @param name  Team name to look up.
 * @returns    Matching team index (0..3), or -1 if not found.
 */
export function GetTeamIndex(this: CTSGameRules, name: string): number {
  // TODO(asm-ambiguous): per-slot struct layout (other fields in each
  // 140-byte team slot) is not yet reconstructed — D.4 work. We
  // assume the C-string name sits at offset 0 of each slot, which
  // matches `BYTE PTR [esi+0x28]` being the empty-slot sentinel.
  for (let i = 0; i < 4; i++) {
    const slotName = this.teams[i]?.name;
    if (slotName && slotName.length > 0 && strcasecmp(name, slotName) === 0) {
      return i;
    }
  }
  return -1;
}
