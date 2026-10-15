```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — `WaitThink(this: CTSSlowMotion): void` matches the demangled
   symbol `WaitThink__13CTSSlowMotion` (no suffix after the class name ⇒ no
   extra args; void return; `this` arrives on stack at `[esp+0x10]` per the
   prologue). Matches the C++ method shape implied by the disassembly.
2. Version check — n/a — this is a D.4 entity method, not a GoldSrc
   interface function. (The D.3 prompt template is being reused for a D.4
   review; flagging here so it's not silently mis-scored.)
3. *interfaceVersion assignment-back — n/a.
4. Success-path struct copy — n/a.
5. No fabricated paths — ❌ — The first fcomp at `0x6130c-0x6131a` is
   `fld [g_flSlowTimeThreshold]; fcomp [m_flDuration]; fnstsw ax;
   test ah,0x40; jne <epilogue>`. The mask `0x40` in AH is bit 6, which
   after `fnstsw ax` maps to FPU status bit 14 = **C3** (the "equal /
   unordered" condition code). `jne` therefore jumps to the function
   epilogue when `C3` is set — i.e. when `g_flSlowTimeThreshold ==
   m_flDuration`. The codex interpreted this as `>=`, which is the wrong
   relation, and as a consequence nested the deactivate/continue logic
   inside the wrong outer `if`. Of the six (threshold, duration-vs-time)
   regions, four behave differently between the two interpretations   (notably `threshold < duration` with `duration > time`, where the
   disassembly continues the slow-motion application but the codex does
   nothing).
6. No TODO body — ✅ — body is real control flow; TODO comments are
   explanatory annotations on ambiguous FPU bits, not placeholders.
7. Field names — ⚠️ — `m_bActive` (byte @ +0x64), `m_bUseGlobal`
   (dword @ +0x100), `m_bRestore` (byte @ +0x104), `m_flSlowAmount`
   (dword @ +0xfc), `m_flDuration` (dword @ +0x68), `m_pEnt1/m_pEnt2`
   (dword @ +0x14/+0x18) are inferred from the offsets + sibling
   decompilations (CheckPlayersDistance, DeactivateSlow) and not from a
   recovered C struct layout, so they're speculative but reasonable. Worth
   flagging that `[esi+0x100]` is `cmp DWORD PTR ... 0x0` in the
   disassembly — a dword field, not a byte; the codex TS only reads it as
   truthy which works but the size hint is lost.
8. Compiles in isolation — ✅ — declares `gpGlobals` / `gpGameRules` /
   `g_flSlowTimeThreshold` as ambient, uses `as any` for `this`, no
   unresolvable external type references.

Issues to fix:
- The disassembly's first comparison is an equality check on  `g_flSlowTimeThreshold` vs `m_flDuration`, used as an early-return guard
  (jumps straight to the `add esp,0x4; pop ebx; pop esi; ret` at
  `0x6137c`). The codex inverted it to `>=` and wrapped the rest of the
  function inside that wrong outer condition. Re-flow the body so:
  1. equality early-return is top-level,
  2. the `m_flDuration >= gpGlobals->time` vs deactivate conditional sits
     *below* it (the second fcomp at `0x61324` uses `fnstsw ax; sahf;
     jae` which correctly maps to `>=` — that's the comparison the codex
     already had right, just nested in the wrong place).
- The two `TODO(asm-ambiguous)` blocks can be collapsed: the FPU
  disambiguation is now resolved (C3 vs C0), so the inline comments can
  state it directly rather than as "most likely".
- `m_bUseGlobal` should ideally be hinted as `number` (DWORD) rather than
  left implicit via `as any`, so future readers don't assume `bool`.

Suggested rewrite (full TS function):

```typescript
// TODO: Bind to actual engine globals when the engine layer is ready.
declare const gpGlobals: any;
declare const gpGameRules: any;
declare const g_flSlowTimeThreshold: number;

/**
 * CTSSlowMotion::WaitThink — periodic think handler for the slow-motion
 * "wait" state. Reschedules itself, conditionally applies global or
 * per-player slow motion, and deactivates once the duration has elapsed.
 *
 * @param this  The CTSSlowMotion entity instance
 * @returns     void
 */
export function WaitThink(this: CTSSlowMotion): void {
  const self = this as any;

  // Reschedule: pev->nextthink = gpGlobals->time + 0.1
  // [esi+0] is the pev pointer (offset 0 of CTSSlowMotion); nextthink
  // lives at +0x104 in the linked entvars_t. The QWORD at [ebx-0x6f010]
  // is the float 0.1.
  self.pev.nextthink = gpGlobals.time + 0.1;

  // While the active flag is set, either apply global slow motion or
  // fall back to per-player distance checks.
  if (self.m_bActive) {
    if (self.m_bUseGlobal) {
      gpGameRules.GlobalSlowMotion2(self.m_flSlowAmount, self.m_bRestore);
    } else {
      self.CheckPlayersDistance();
    }
  }

  // Early-return when the slow-time threshold exactly matches the
  // duration. Disassembly: fld g_flSlowTimeThreshold; fcomp m_flDuration;
  // fnstsw ax; test ah,0x40; jne <epilogue>. The mask 0x40 in AH is bit 6
  // = FPU status bit 14 = C3 ("equal / unordered"); jne fires when C3 is
  // set, so this is a == check, not a >= check.
  if (g_flSlowTimeThreshold === self.m_flDuration) {
    return;
  }

  // Disassembly: fld m_flDuration; fcomp gpGlobals->time; fnstsw ax;
  // sahf; jae <continue>. After sahf, CF = C0 and ZF = C3; jae jumps
  // when CF=0, i.e. when m_flDuration >= gpGlobals->time. Fall-through
  // is the deactivate path.
  if (self.m_flDuration < gpGlobals.time) {
    // Duration has elapsed — drop the tracked entity refs and deactivate.
    self.m_pEnt1 = 0;
    self.m_pEnt2 = 0;
    self.DeactivateSlow();
  } else {
    // Duration still ahead — keep the slow motion going.
    if (self.m_bUseGlobal) {
      gpGameRules.GlobalSlowMotion2(self.m_flSlowAmount, self.m_bRestore);
    } else {
      self.CheckPlayersDistance();
    }
  }
}
```

Files written so far for this function: only `tools/decompile/cross-vendor/CTSSlowMotion__WaitThink__codex.ts` (no claude counterpart, no review). Suggest committing the corrected version above to `tools/decompile/output/CTSSlowMotion__WaitThink.ts` once the rewrite is applied, then wiring a smoke that exercises both the `m_flDuration < gpGlobals.time` (deactivate) and `m_flDuration >= gpGlobals.time` (continue) branches with `g_flSlowTimeThreshold` set to values != `m_flDuration` to lock the early-return off the equality path.
