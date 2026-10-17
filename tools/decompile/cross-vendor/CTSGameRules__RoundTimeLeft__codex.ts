```typescript
/**
 * CTSGameRules::RoundTimeLeft — round-end dispatch.
 *
 * Per-tick (typically driven from CTSGameRules::Think): when this runs
 * it either fires end-of-round targets via `FireTargets` or declares
 * a team winner via `TeamWin`. Two field checks guard re-entry, then
 * an objective pointer chooses the branch.
 *
 * @param this  CTSGameRules instance
 */
export function RoundTimeLeft(this: CTSGameRules): void {
  // ── Guard 1 (0x69038–0x69046): float compare ─────────────────────
  // fld [ebx-0x6f408]; fcomp [edx+0x8]; fnstsw; test ah,0x40; jne end.
  // Skips when global float equals this->m_flRoundTime (or unordered).
  // TODO(asm-ambiguous): the source-level semantics of the strict ==
  // check are unclear without consulting strings-n5.txt — likely a
  // dedup-tick guard against re-firing within the same game-time.
  const flGlobalTimer /* GOT-relative 0x6f408, plausibly gpGlobals->time */ = 0;
  if (flGlobalTimer === this.m_flRoundTime /* +0x8 */) {
    return;
  }

  // ── Guard 2 (0x69048–0x6904c): round-state flag byte at +0x10 ─────
  if (this.m_bRoundActive === 0) {
    return;
  }

  // ── Objective branch (0x6904e–0x69064) ───────────────────────────
  const pEndObjective = this.m_pEndObjective; // +0x554

  if (pEndObjective != null && pEndObjective.m_flEndAmount /* +0x94 */ !== 0) {
    // ═══ Path A — FireTargets (0x69066–0x6908a) ════════════════════
    // cdecl push order (right-to-left; first arg is the last push):
    //   arg5: push 0x0                       → string_target = null
    //   arg4: push 0x3                       → USE_TYPE = 3
    //   arg3: push eax (= pEndObjective)     → caller (duplicate)
    //   arg2: push eax (= pEndObjective)     → activator (duplicate)
    //   arg1: push eax (computed value)
    //
    // The PLT sig `FireTargets__FPCcP11CBaseEntityT18USE_TYPEf`
    // lists only 4 args; the asm pushes 5, so we model the 5 pushes
    // literally and flag the discrepancy.
    const flValue =
      pEndObjective.m_flEndAmount +
      /* *(*[ebx+0x1600] + 0x98) — dword load + add; float semantics */ 0;

    FireTargets(
      /* stringTarget */ 0,
      /* pCaller      */ pEndObjective,
      /* pActivator   */ pEndObjective,
      /* USE_TYPE     */ 3,
      /* value        */ flValue,
    );
  } else {
    // ═══ Path B — TeamWin (0x69094–0x690a5) ═════════════════════════
    // cdecl push order with 16-bit word pushes for the trailing bools:
    //   arg5: pushw 0x0   → false           (← "T3" trailing arg slot)
    //   arg4: pushw 0x1   → true
    //   arg3: push 0x0    → 0
    //   arg2: push 0x2    → 2
    //   arg1: push edx    → this  (edx still holds `this` here)
    //
    // Both paths share the same epilogue: `add esp, 0x20` cleans 32 B.
    this.TeamWin(
      /* winnerReason */ 2,
      /* score        */ 0,
      /* announce     */ true,
      /* flag         */ false,
    );
  }
}
```
