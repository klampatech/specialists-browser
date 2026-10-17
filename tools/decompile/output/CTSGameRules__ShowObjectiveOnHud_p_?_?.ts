// Stubs (would live in the actual project; declared here so the function compiles):
declare const __GLOBAL_player: any;
declare const __GLOBAL_engine_funcs: any;

interface CTSObjective { /* TODO(D.4) — fields TBD */ }
interface CTSGameRules {
  FindIndexByObjective(pObjective: CTSObjective): number;
}

/**
 * CTSGameRules::ShowObjectiveOnHud — emit a 2-byte HUD message to inform
 * the local client of an objective's show/hide state.
 *
 * Disassembly flow:
 *   1. FindIndexByObjective(pObjective) → index.
 *      (The asm pushes both `show` and `pObjective` for this call; the
 *      symbol only consumes `pObjective`; `show` is stack-alignment padding.)
 *   2. Load engine globals via ebx+GOT:
 *        [ebx+0x1884] -> local player
 *        [ebx+0x1aa8] -> engine-funcs dispatch vtable
 *   3. pfnMessageBegin(msgtype=2, *player, 0, 0)  [4 args]
 *   4. pfnWriteByte(index)
 *   5. pfnWriteByte(show ? 1 : 0)                 (asm: `setne al` after cmp)
 *   6. pfnMessageEnd()
 *
 * @param this       CTSGameRules instance (thiscall: `this` in ECX)
 * @param pObjective The objective whose HUD state to update
 * @param show       true = show on HUD, false = hide
 */
export function ShowObjectiveOnHud(
  this: CTSGameRules,
  pObjective: CTSObjective,
  show: boolean,
): void {
  // 1. Look up the objective's slot index.
  //    asm: push show; push pObjective; call FindIndexByObjective; add esp,0x10
  //    (the `show` push is stack alignment; FindIndexByObjective ignores it.)
  const index: number = this.FindIndexByObjective(pObjective);

  // 2. Engine globals via GOT (ebx = 0x105e10 in the disassembled binary).
  //    TODO(D.4): resolve [ebx+0x1884] and [ebx+0x1aa8] against the mod's
  //    actual globals (likely `g_pLocalPlayer` / `g_engfuncs`).
  const pPlayer = __GLOBAL_player;
  const pEngine = __GLOBAL_engine_funcs;

  // 3. Begin a 2-payload-byte message targeting *pPlayer.
  //    asm: push 0; push 0; push [eax]; push 0x2; call [esi+0xb8]
  //    The literal `0x2` is the msg_type. Whether TS's enum uses
  //    MSG_ONE=1 / MSG_ALL=2 (HL1 standard) or its own mapping needs
  //    confirmation against the actual enginefuncs_t header.
  pEngine[0xb8](2, pPlayer, 0, 0);

  // 4. WRITE_BYTE(index). asm: mov [esp],edi; call [esi+0xc0]
  pEngine[0xc0](index);

  // 5. WRITE_BYTE(show ? 1 : 0).
  //    asm: mov eax,0; cmp BYTE PTR [esp+0x24],0; setne al; push eax;
  //         call [esi+0xc0]
  pEngine[0xc0](show ? 1 : 0);

  // 6. End the message. asm: call [esi+0xbc]; add esp,0x10
  pEngine[0xbc]();
}
