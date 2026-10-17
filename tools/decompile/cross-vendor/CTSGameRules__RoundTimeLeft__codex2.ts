/**
 * CTSGameRules::RoundTimeLeft — round-end dispatch.
 *
 * Called per-tick (typically from CTSGameRules::Think). When the
 * dedup-tick guard passes and the round is active, either fires
 * end-of-round targets via FireTargets (when an end-objective with
 * a non-zero amount is set) or declares a team winner via TeamWin.
 *
 * @param this  CTSGameRules instance (the `this` pointer)
 */
export function RoundTimeLeft(this: any): void {
  // ── Guard 1 (0x69038–0x69046): float dedup-tick check ─────────────
  // fld  [ebx-0x6f408]   ; load global float
  // fcomp [edx+0x8]      ; compare with this->+0x8
  // fnstsw; test ah,0x40 ; ZF=1 means equal
  // jne end              ; early return when equal
  // TODO(asm-ambiguous): identify the [ebx-0x6f408] global. Most
  // likely candidates are gpGlobals->time or a TS-specific cvar
  // (slowamt, ts_slowmotion). The strict == check suggests a
  // once-per-time-quantum re-entry guard.
  const flGlobalTimer: number = 0 as any; // TODO: load [ebx-0x6f408]
  if (flGlobalTimer === this.m_flRoundTime /* +0x8, float */) {
    return;
  }

  // ── Guard 2 (0x69048–0x6904c): round-state flag ───────────────────
  if (this.m_bRoundActive /* +0x10, byte */ === 0) {
    return;
  }

  // ── Objective branch (0x6904e–0x69064) ────────────────────────────
  const pEndObjective = this.m_pEndObjective /* +0x554, ptr */;
  const hasEndObjective =
    pEndObjective != null && pEndObjective.m_flEndAmount /* +0x94, float */ !== 0;

  if (hasEndObjective) {
    // ═══ Path A — FireTargets (0x69066–0x6908a) ════════════════════
    // 5 cdecl pushes, right-to-left:
    //   push 0x0       → arg5
    //   push 0x3       → arg4 (USE_TYPE = 3)
    //   push eax       → arg3 (pEndObjective)
    //   push eax       → arg2 (pEndObjective)
    //   [mov/add eax]  → arg1 (the computed value, last push)
    //
    // The demangled PLT sig `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf`
    // shows 4 args; the asm shows 5 pushes. We model the asm
    // literally. The arg order here matches the asm push order
    // (NOT the standard HLSDK
    // `FireTargets(targetName, pActivator, pCaller, useType, value)`
    // order) — flag for review against the actual TS mod source.
    //
    // The `add eax, [edx+0x94]` is a dword integer add (no fadd in
    // the asm), so the original C almost certainly used a type-pun
    // trick to interpret the int sum as a float bit-pattern.
    const globalDword: number = 0 as any; // TODO: *(*GOT[+0x1600] + 0x98)
    const endAmountBits: number = (pEndObjective.m_flEndAmount as number) | 0;
    const intSum = (globalDword | 0) + endAmountBits; // dword add
    const flValue = new Float32Array(new Int32Array([intSum]).buffer)[0];

    FireTargets(
      /* arg1 value        */ flValue,
      /* arg2 pCaller?     */ pEndObjective,
      /* arg3 pActivator?  */ pEndObjective,
      /* arg4 USE_TYPE     */ 3,
      /* arg5 stringTarget */ 0,
    );
  } else {
    // ═══ Path B — TeamWin (0x69094–0x690a5) ═════════════════════════
    // 5 cdecl pushes, right-to-left:
    //   pushw 0x0   → arg5 (T3 slot, 16-bit; guessed bool = false)
    //   pushw 0x1   → arg4 (16-bit; 1 = true)
    //   push 0x0    → arg3
    //   push 0x2    → arg2
    //   push edx    → arg1 (edx still holds `this` here, never
    //                     overwritten in this path)
    //
    // `this.TeamWin(...)` passes `this` implicitly (thiscall),
    // matching the asm's explicit `push edx`. Both paths share
    // the same epilogue: `add esp, 0x20` cleans 32 B.
    this.TeamWin(
      /* arg2 winnerReason */ 2,
      /* arg3 score        */ 0,
      /* arg4 announce     */ true,
      /* arg5 T3           */ false, // TODO: confirm T3 type
    );
  }
}
