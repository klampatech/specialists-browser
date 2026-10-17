```typescript
/**
 * CTSGameRules::GetTeamsNum — returns the number of active team slots
 * (out of four fixed-size team entries) in the current game rules.
 *
 * Used by HUD / voting / mode-selection code to know how many teams are
 * populated for the current round (1v1, 2v2, 4-team CTB, etc.).
 *
 * @param this  The CTSGameRules instance.
 * @returns     Number of active team slots in the range [0, 4].
 */
export function GetTeamsNum(this: CTSGameRules): number {
  // The four evenly spaced byte reads at offsets 0x28, 0xb4, 0x140, 0x1cc
  // (each 0x8C = 140 bytes apart) look like a fixed array of four
  // CTSTeam structs, each carrying its active/valid flag at struct
  // offset 0x28. The first check uses `setne al` (rather than `inc`) but
  // is semantically identical because `eax` was zeroed just above.
  // TODO(asm-ambiguous): team struct layout is inferred from the even
  //   spacing — confirm against the decompiled CTSTeam header.
  // TODO: field names `m_Teams[]` and `m_bValid` are inferred; confirm
  //   against the decompiled CTSGameRules header.
  let count = 0;
  if (this.m_Teams[0].m_bValid) count++;
  if (this.m_Teams[1].m_bValid) count++;
  if (this.m_Teams[2].m_bValid) count++;
  if (this.m_Teams[3].m_bValid) count++;
  return count;
}
```
