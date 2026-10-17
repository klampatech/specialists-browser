```typescript
// === Ambient declarations for in-isolation compile. ===
// TODO(D.4): full class definitions belong in the class decompile pass; only the
// offsets touched by RoundTimeLeft are stubbed here.
declare class CTSGameRules {
  public m_flField_0x8: number;
  public m_bRoundActive_0x10: number;
  public m_pWinnerEntity_0x554: CBaseEntity | null;
}
declare class CBaseEntity {
  public m_iszTargetname_0x94: number; // string_t offset
}
// Engine-side memory / callback helpers. Real bindings live in the engine bridge.
declare function readF32(addr: number): number;
declare function readU32(addr: number): number;
declare function readString(addr: number): string;
declare function FireTargets(
  targetname: string,
  pActivator: CBaseEntity,
  pCaller: CBaseEntity,
  useType: number,
  value: number
): void;
// Demangled `TeamWin(int, int, bool, ?)`. `T3` is a template-type placeholder.
declare function TeamWin(
  this: CTSGameRules,
  int1: number,
  int2: number,
  boolArg: boolean,
  t3Arg: number
): void;

/**
 * CTSGameRules::RoundTimeLeft — round-end trigger handler.
 *
 * Decompiled from `ts/dlls/ts_i386.so` at 0x00069024 (142 bytes).
 *
 * Behavior (mirrors the assembly):
 *
 *   1. Compare the global f32 at `[GOT − 0x6f408]` with `this->offset_0x8`.
 *      If equal, return (de-dup: already handled this tick).
 *   2. Read `this->offset_0x10` (byte). If 0, return (round not active).
 *   3. If `this->offset_0x554` is non-null and the winner entity's
 *      `offset_0x94` (targetname string_t) is non-zero:
 *        a. Resolve the targetname via HL1's global string table.
 *        b. Call FireTargets(string, winner, winner, USE_TYPE=3, 0.0).
 *   4. Fallback (no winner / no targetname): TeamWin(this, 2, 0, true, 0).
 *
 * @param this  The CTSGameRules entity.
 * @returns     void
 */
export function RoundTimeLeft(this: CTSGameRules): void {
  // PIC / GOT base: ebx = 0x0006902d + 0xfcde3 ≈ 0x1063F10.
  const GOT_BASE = 0x1063f10;

  // (1) fcomp + fnstsw + test ah,0x40 + jne ⇒ "skip body if values are equal".
  // TODO(asm-ambiguous): the semantics of `this->offset_0x8` (round-end
  // timestamp vs. last-processed tick vs. round trigger version) depend on
  // engine convention; verify against the SDK header in D.4.
  const triggerTime: number = readF32(GOT_BASE - 0x6f408);
  if (triggerTime === this.m_flField_0x8) {
    return;
  }

  // (2) Round-in-progress flag.
  if (this.m_bRoundActive_0x10 === 0) {
    return;
  }

  // (3) Winner-entity targetname fire path.
  const winner: CBaseEntity | null = this.m_pWinnerEntity_0x554;
  if (winner !== null && winner.m_iszTargetname_0x94 !== 0) {
    // HL1 STRING(t) ≈ gpGlobals->pStringTable->buffer + t.
    // The disassembly's triple-dereference:
    //   gpGlobals  = [GOT + 0x1600]   // engine-side global
    //   level1     = *gpGlobals        // first deref
    //   bufferBase = *(level1 + 0x98)  // struct member offset
    // TODO(asm-ambiguous): gpGlobals->pStringTable offset (0x98) and any
    // chained struct layout are inferred from HL1 SDK layout; verify.
    const gpGlobals:  number = readU32(GOT_BASE + 0x1600);
    const level1:     number = readU32(gpGlobals);
    const bufferBase: number = readU32(level1 + 0x98);
    const targetName: string = readString(bufferBase + winner.m_iszTargetname_0x94);

    // FireTargets(string, pActivator, pCaller, USE_TYPE, value).
    FireTargets(
      /* string     */ targetName,
      /* pActivator */ winner,
      /* pCaller    */ winner,
      /* USE_TYPE   */ 3,
      /* value      */ 0.0
    );
    return;
  }

  // (4) Fallback: TeamWin(int, int, bool, ?).
  // Push sequence (right-to-left; cdecl-style via PLT; this pushed last):
  //   pushw 0x0            ⇒ T3 = 0   (with sub esp,0xe padding above)
  //   pushw 0x1 + sub esp,0x2 ⇒ bool = 1
  //   push 0x0             ⇒ int = 0
  //   push 0x2             ⇒ int = 2
  //   push edx             ⇒ this (= CTSGameRules*)
  // Caller cleans stack with `add esp, 0x20` (32 bytes).
  // TODO(asm-ambiguous): T3's concrete type/meaning depends on TeamWin's
  // full demangled signature (handled in D.4).
  TeamWin(this, /* int1 */ 2, /* int2 */ 0, /* boolArg */ true, /* t3Arg */ 0);
}
```
