/**
 * CTSFlag::CanInteract — can the given player interact with this flag?
 *
 * Returns true when no one is carrying the flag (m_iFlagStatus == -1),
 * or when the player's team matches the flag's recorded carrier/status.
 *
 * Decompiled from `ts/dlls/ts_i386.so` @ 0x0008e2d4 (89 B).
 * See `tools/decompile/chunks/CanInteract__7CTSFlagP11CBasePlayer.chunk.md`.
 */
type CTSFlag = any;
type CBasePlayer = any;
type CTSGameRules = any;

// Global rules pointer; loaded from [ebx + 0x14f0] in the disassembly.
// TODO(D.4): replace with the real `gpGameRules` once we wire up CTSGameRules.
const gCTSGameRules: CTSGameRules = null as any;

export function CanInteract(this: CTSFlag, pPlayer: CBasePlayer): boolean {
  // No carrier: anyone may pick up the flag.
  // Disasm: cmp DWORD PTR [esi+0x9c], 0xffffffff; je 0x8e327 (return1).
  if (this.m_iFlagStatus === -1) {
    return true;
  }

  // Disasm:
  //   mov eax, [edx+0x60]          ; load *(pPlayer+0x60)  (likely m_pTeamInfo)
  //   push edx                     ; push pPlayer as explicit arg
  //   call DWORD PTR [eax+0xd0]    ; virtual call on the sub-object
  // The callee returns a value (eax) used as the team-name argument below.
  // TODO(asm-ambiguous): vtable slot 0xd0 (index 52) — method name inferred
  // from the call site (its return value feeds GetTeamIndex's string arg).
  const playerTeamName: string = pPlayer.GetTeamName();

  // Disasm:
  //   push eax                                ; playerTeamName
  //   push DWORD PTR [ebx+0x14f0]             ; global rules pointer (this)
  //   call GetTeamIndex__12CTSGameRulesPCc@plt
  // `GetTeamIndex` is a NON-static method on CTSGameRules (the `P` in the
  // mangled name is `CTSGameRules* this`). The TS call below mirrors that
  // by treating `gCTSGameRules` as the receiver.
  const playerTeamIndex: number = gCTSGameRules.GetTeamIndex(playerTeamName);

  // Disasm: cmp [esi+0x9c], eax; sete dl; mov al, dl.
  return this.m_iFlagStatus === playerTeamIndex;
}
