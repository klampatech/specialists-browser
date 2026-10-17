```typescript
/**
 * CTSGameRules::GetTeamIndex — look up a team index by team name (case-insensitive).
 * Walks the four team-name slots on the rules entity and returns the index of
 * the first slot whose name matches `name`. Returns -1 when no slot matches.
 *
 * @param this  The CTSGameRules entity instance
 * @param name  Team name to compare against each slot (case-insensitive)
 * @returns     0..3 on match, or -1 when no team name matches
 */
export function GetTeamIndex(this: CTSGameRules, name: string): number {
  // Team names live at fixed offsets 0x28, 0xb4, 0x140, 0x1cc on `this` —
  // each slot is 0x8c bytes after the previous (likely a `team_t` struct
  // array populated by CTSGameRules::SetTeamList). A slot whose first byte
  // is NUL is treated as empty and skipped, so a configured-but-zero-length
  // team name doesn't spuriously match the input.
  const teamNameOffsets = [0x28, 0xb4, 0x140, 0x1cc] as const;

  for (let i = 0; i < teamNameOffsets.length; i++) {
    // TODO(asm-ambiguous): each entry is a NUL-terminated char array; replace
    // with a typed field access once the CTSGameRules layout is modelled.
    const teamName = (this as any).readCStringAt(teamNameOffsets[i]);
    if (teamName.length === 0) continue;
    // TODO(asm-ambiguous): C `strcasecmp` — case-insensitive ASCII compare;
    // wire to a libc shim or a `String.prototype.localeCompare` adapter
    // when this module is integrated.
    if (strcasecmp(teamName, name) === 0) return i;
  }
  return -1;
}
```
