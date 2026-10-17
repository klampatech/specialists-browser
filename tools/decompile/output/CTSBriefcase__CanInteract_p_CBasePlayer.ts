/**
 * CTSBriefcase::CanInteract — team-based permission check.
 *
 * Demangled: CanInteract__12CTSBriefcaseP11CBasePlayer
 * Address:   0x0007db48 (83 bytes)
 * Disasm:    push esi / push ebx / sub esp,0x4 / call+pop PIC setup
 *            → ebx = GOT (0x166210)
 *            → esi = this   ([esp+0x10])
 *            → edx = pPlayer ([esp+0x14])
 *            → al = 1; if (this.m_nTeam == -1) return al=1
 *            → eax = [pPlayer+0x60]; push pPlayer; call [eax+0xd0]
 *            → push eax; push [ebx+0x14f0]; call GetTeamIndex
 *            → return (this.m_nTeam == GetTeamIndex(...))
 *
 * NOTE: HLSDK reference (`hlsdk-goldsrc-interface.md`) does NOT cover
 * this function — it's a mod-side gameplay method, not an engine
 * interface export. Review checklist1–4 N/A; checklist 5–8 applied
 * to the disassembly + demangled symbol.
 */

interface CTSTeamBriefcaseLike {
  m_nTeam: number; // +0x68 — -1 means TEAM_UNASSIGNED (anyone)
}

interface CTSPlayerLike {
  // +0x60 holds a pointer to some helper object whose +0xd0 vtable
  // slot is a method taking (this player) and returning a team name.
  // TODO(asm-ambiguous): identify the +0x60 field and +0xd0 method.
  getTeamNameViaGameRules(this: CTSPlayerLike): string;
}

interface CTSGameRulesLike {
  // Demangled: GetTeamIndex__12CTSGameRulesPCc
  // The PLT call site pushes two args (a global string at [ebx+0x14f0]
  // and the result of the virtual call), so the actual signature is
  // wider than PCc. TODO(asm-ambiguous): identify the second arg.
  GetTeamIndex(arg1: any, teamName: string): number;
}

export function CanInteract(
  this: CTSTeamBriefcaseLike,
  pPlayer: CTSPlayerLike,
  CTSGameRules: CTSGameRulesLike,
): boolean {
  // Disasm: mov al,0x1; cmp [esi+0x68],0xffffffff; je 7db95
  // Unrestricted briefcase: anyone may interact.
  if (this.m_nTeam === -1) {
    return true;
  }

  // Disasm: mov eax,[edx+0x60]; push edx; call [eax+0xd0]
  // Indirect virtual call: load a pointer field on the player, then
  // invoke the +0xd0 method on its class with the player as the arg.
  // TODO(asm-ambiguous): exact identity of [pPlayer+0x60] and +0xd0.
  const playerTeamName: string = pPlayer.getTeamNameViaGameRules.call(pPlayer);

  // Disasm: push eax; push [ebx+0x14f0]; call GetTeamIndex
  // cdecl, right-to-left: arg1 (leftmost) = global at [ebx+0x14f0],
  // arg2 (rightmost) = team name from the virtual call above.
  // TODO(asm-ambiguous): purpose of the global string at [ebx+0x14f0].
  const teamGlobalAt14f0: string = ''; // placeholder; see TODO above
  const playerTeamIndex: number = CTSGameRules.GetTeamIndex(
    teamGlobalAt14f0,
    playerTeamName,
  );

  // Disasm: cmp [esi+0x68],eax; sete dl; mov al,dl
  return this.m_nTeam === playerTeamIndex;
}
