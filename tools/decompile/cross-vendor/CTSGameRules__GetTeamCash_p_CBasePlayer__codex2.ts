/**
 * CTSGameRules::GetTeamCash — return the cash balance of a player's
 * team. Returns 0 for non-team modes (not 2 or 3) or when the
 * player's team cannot be resolved.
 *
 * Demangled: CTSGameRules::GetTeamCash(CBasePlayer*)
 * Address:   0x00069aac, 87 B
 */
export function GetTeamCash(
  this: any,    // CTSGameRules<CBasePlayer*>
  p: any,       // CBasePlayer*
): number {
  // Game-mode byte at this+0 must be 2 or 3 (UNSIGNED 8-bit compare
  // in the asm: mov al,[esi]; sub eax,2; cmp al,1; ja <fail>).
  // JS `>` is signed, so for byte-faithful behavior we mask to 8 bits.
  // TODO(asm-ambiguous): confirm this+0 is m_iGameMode and not a
  // vtable low byte or other 1-byte field.
  const gameModeByte: number = (this.m_iGameMode as number) & 0xff;
  if (gameModeByte - 2 > 1) {
    return 0;
  }

  // Resolve the player's team from the team-name string at p+0xb48.
  // The asm takes &p[0xb48] directly (push p+0xb48 as the const char*
  // arg), suggesting an inline char[] rather than a char*.
  // TODO(asm-ambiguous): exact field name for the team-name buffer.
  const teamIndex: number = GetTeamIndex(this, p.m_szTeamName);
  if (teamIndex === -1) {
    return 0;
  }

  // m_TeamData array at this+0x1c, each element 140 bytes (35 DWORDs).
  // The asm loads the FIRST DWORD of the indexed element and returns
  // it; the field is assumed to be cash based on the function's name.
  // TODO(asm-ambiguous): the first field is named `.cash` here on
  // assumption; the asm only confirms it's a DWORD at element offset 0.
  return this.m_TeamData[teamIndex].cash;
}
