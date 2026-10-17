/**
 * CTSWinGiver::EnableObjective — resets objective state fields to zero.
 *
 * The demangled name promises `CTSWinGiver::EnableObjective(bool)`, but
 * the disassembly only references [esp+0x4] (the implicit `this`) and
 * never reads [esp+0x8] (the bool parameter). Either the call sites all
 * pass a constant and the compiler folded the branch, or the bool is
 * genuinely dead. D.4 should cross-check callers.
 *
 * Assembly (16 B):
 *   mov  eax, [esp+0x4]      ; load `this`
 *   mov  DWORD [eax+0x64], 0 ; clear objective int
 *   mov  BYTE  [eax+0x68], 0 ; clear objective flag
 *   ret
 */
export function EnableObjective(this: any, _enable: boolean): void {
  // [this+0x64] DWORD cleared
  this.m_iObjective = 0;
  // [this+0x68] BYTE cleared
  this.m_bObjective = 0;
}
