```typescript
/**
 * CTSGameRules::SetGlobalSlowMotion — start, refresh, or stop the global
 * (server-wide) slow-motion effect that scales every player's game time.
 *
 * Behavior summary:
 *   1. If the requested amount already matches the stored factor, the *      function is a no-op (early `fstp st(0); ret` at 0x696be).
 *   2. If the requested amount equals the "stop" sentinel read from
 *      [GOT-0x6f408] (file offset 0x8f408), the active flag is cleared
 *      and the function returns without broadcasting.
 *   3. Otherwise slow motion is activated:
 *        - Broadcast start via this.GlobalSlowMotion2(0.0, false).
 *        - Snapshot the current game time into startTime.
 *        - Store the new factor and flip the active flag to 1.0.
 *        - If duration equals the sentinel, endTime is cleared to 0.
 *          Otherwise, endTime is set to (duration + currentTime).
 *
 * @param this      The CTSGameRules instance (this in C++)
 * @param amount    Slow-motion factor / amount (float)
 * @param duration  Duration in seconds (float)
 * @returns void
 */
export function SetGlobalSlowMotion(
  this: any, // TODO: replace with `CTSGameRules` once defined
  amount: number,
  duration: number
): void {
  // [GOT-0x6f408] = file offset 0x8f408 — same GOT entry is used for both
  // inner compares.
  // TODO(asm-ambiguous): actual value unknown without the .data section
  // of ts_i386.so. Likely a 0.0f sentinel or a cvar default such as
  // ts_slowmo_amount / ts_slowmo_duration. Both `amount` and `duration`
  // branch on this same comparison.
  const kStopSentinel = 0.0; // TODO: confirm from strings-n5.txt / .data dump

  // --- Outer gate (no-op if amount already matches) ----------------
  // asm: fld arg1; fcom [esi+0x564]; test ah,0x40; jne 0x696be
  //   jne taken when C3=1 => amount == this.slowMotionFactor (or NaN).
  //   At 0x696be: fstp st(0); ret. So we early-out on equality.
  if (amount === this.slowMotionFactor) {
    return;
  }

  // --- Inner branch 1: deactivate (amount == sentinel) -------------
  // asm: fcomp [GOT-0x6f408]; test ah,0x40; je 0x6965c
  //   je taken when C3=0 => amount != sentinel => fall through to
  //   activate path. Fall-through (amount == sentinel OR NaN):
  //   [esi+0x560] = 0; ret.
  if (amount === kStopSentinel) {
    this.slowMotionActive = 0; // [esi+0x560] = 0x00000000
    return;
  }

  // --- Inner branch 2: activate ------------------------------------
  // sub esp,0x6 / pushw 0 / push 0 / push esi / call GlobalSlowMotion2
  // => GlobalSlowMotion2(this, 0.0f /*float*/, false /*bool*/)
  this.GlobalSlowMotion2(0.0, false);

  // Snapshot the start time. The asm does a double-deref:
  //   mov edx, [GOT+0x1600]      ; edx = *global_table[0x1600]
  //   mov eax, [edx]             ; eax = *edx
  //   mov eax, [eax]             ; eax = **edx  (treated as float)
  //   mov [esi+0x56c], eax       ; this.slowMotionStartTime = eax
  // TODO(asm-ambiguous): the exact identity of **GOT[0x1600] is unclear
  // without the .data layout. It behaves like a "current game time"
  // read (consistent with gpGlobals->time accessed through an
  // indirection table — typical HL engine pattern).
  const now: number = 0.0; // TODO: replace with gpGlobals->time via indirection

  this.slowMotionStartTime = now;  // [esi+0x56c]
  this.slowMotionFactor = amount;  // [esi+0x564]
  this.slowMotionActive = 1.0;     // [esi+0x560] = 0x3f800000

  // --- End-time computation ----------------------------------------
  // After `add esp,0x10`, stack is restored to prologue state. asm:
  //   fld [esp+0x18]            ; ST(0) = duration
  //   fcom [GOT-0x6f408]        ; compare (no pop)
  //   test ah,0x40; jne 0x696b0
  //     jne taken when C3=1 => duration == sentinel (or NaN)
  //     => at 0x696b0: fstp st(0); [esi+0x568] = 0; ret
  //   Fall-through (duration != sentinel):
  //     mov eax, [edx] ; reload *gpGlobals pointer chain
  //     fadd [eax]              ; ST(0) += gpGlobals->time
  //     fstp [esi+0x568]        ; endTime = duration + currentTime
  if (duration === kStopSentinel) {
    this.slowMotionEndTime = 0; // [esi+0x568] = 0x00000000
  } else {
    this.slowMotionEndTime = duration + now;
  }
}
```
