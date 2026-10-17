// === Stubs so this file compiles in isolation ===
// Replaced by real class layout in D.4 and real singletons in D.5.
type CTSObjective = { m_fActive?: boolean; m_bActive?: boolean; [k: string]: any };
type CTSGameRules = { ShowObjectiveOnHud(obj: CTSObjective, flag: boolean): void };
declare const mpGameRules: CTSGameRules;
// === End stubs ===

/**
 * CTSObjective::Freeze — toggles the objective's active state and
 * refreshes the HUD.
 *
 * Disassembly path:
 *   push ebx
 *   sub  esp, 0x8              ; local frame (holds nothing; PIC only)
 *   call next                  ; PIC: get PC
 *   pop  ebx                   ;   ebx = 0x7c319
 *   add  ebx, 0xe9af7          ;   ebx = 0x166010 (GOT base)
 *   mov  edx, [esp+0x10]       ;   edx = this (arg1)
 *   mov  al,  [esp+0x14]       ;   al  = bFreeze (arg2 byte)
 *   xor  eax, 1                ;   al  = !bFreeze
 *   mov  [edx+0x64], al        ;   this->field_0x64 = !bFreeze
 *   sub  esp, 0x6              ; align stack to 16
 *   push ax                    ; arg2: !bFreeze  (16-bit, but callee reads al)
 *   push edx                   ; arg1: this      (CTSObjectiveb*)
 *   push [ebx+0x14f0]          ; arg0 / this: mpGameRules
 *   call ShowObjectiveOnHud__12CTSGameRulesP12CTSObjectiveb@plt
 *   add  esp, 0x18             ; restore 3*4 push + earlier subs
 *   pop  ebx
 *   ret
 */
export function Freeze(this: CTSObjective, bFreeze: boolean): void {
  // Field at offset 0x64 holds the *inverted* freeze flag — semantically
  // "active" (1 = active, 0 = frozen). The xor-with-1 is an explicit
  // inversion, not a typo.
  // TODO(D.4): confirm the canonical name (m_bActive vs m_fActive).
  this.m_fActive = !bFreeze;

  // Refresh HUD with the same value we just stored. cdecl order in the
  // asm is (this=mpGameRules, arg1=this_obj, arg2=!bFreeze).
  mpGameRules.ShowObjectiveOnHud(this, !bFreeze);
}
