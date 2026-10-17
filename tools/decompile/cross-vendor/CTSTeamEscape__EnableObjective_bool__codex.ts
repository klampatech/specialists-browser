```typescript
/**
 * CTSTeamEscape::EnableObjective — toggle this TeamEscape team's objective
 * flag on or off. Persists the flag at offset 0x64, zeroes the 132-byte
 * objective state block at offset 0x6c, clears the trailing dword at 0xf0,
 * and updates a class-shared "objectives active" indicator (1 if enabled,
 * 0 if not).
 *
 * @param this    The CTSTeamEscape entity instance. TODO(D.4): type as
 *                `CTSTeamEscapeb` once the class is reconstructed.
 * @param enable  Whether to enable the team's objective.
 */
export function EnableObjective(this: any, enable: boolean): void {
  // Persist the enable flag at offset 0x64 (byte field).
  this[0x64] = enable ? 1 : 0;

  // Zero the 33-dword (132-byte) objective state block at offset 0x6c.
  // TODO: field meaning unclear — likely an array of objective targets or
  //       per-tick progress entries for the team.
  for (let i = 0x6c; i < 0xf0; i += 4) {
    this[i] = 0;
  }
  this[0xf0] = 0;

  // Update the class-shared "objectives active" indicator resolved via [vptr + 0x10c].
  // TODO(asm-ambiguous): the `mov eax,[esi]; mov [eax+0x10c],N` pattern isn't a
  //       normal vtable-slot write; it looks like an MSVC static-member write
  //       resolved through the vptr (an MSVC-ABI quirk for class-static globals).
  //       TODO(D.4): replace with a typed static such as
  //       `CTSTeamEscape.s_objectivesActive = enable ? 1 : 0` once reconstructed.
  const sharedIndicator = (this.vptr as any) + 0x10c;
  (sharedIndicator as any).__dword = enable ? 1 : 0;
}
```
