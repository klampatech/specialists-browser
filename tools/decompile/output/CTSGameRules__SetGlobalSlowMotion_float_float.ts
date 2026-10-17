/**
 * CTSGameRules::SetGlobalSlowMotion — start, refresh, or stop the global
 * (server-wide) slow-motion effect that scales every player's game time.
 *
 * FIELDS INFERRED — verify the four field names against the TS source
 * before treating them as ground truth. Offsets: 0x560=flag, 0x564=factor,
 * 0x568=endTime, 0x56c=startTime.
 *
 * Decompiled from ts_i386.so @ 0x0006961c (170 bytes). Behavior:
 *   1. If `amount` already equals the stored factor, no-op (early return).
 *   2. If `amount` equals the stop sentinel, clear the active flag and
 *      return (does NOT update factor / startTime / endTime).
 *   3. Otherwise activate: broadcast via GlobalSlowMotion2(0.0, false),
 *      snapshot `now` as startTime, store factor, set active = 1.0.
 *   4. If `duration` == stop sentinel, endTime = 0 (no auto-end);
 *      else endTime = duration + now.
 */
export function SetGlobalSlowMotion(
  this: any, // TODO: replace with `CTSGameRules`
  amount: number,
  duration: number
): void {
  // [GOT-0x6f408] — both inner compares target this same global float.
  // TODO(asm-ambiguous): confirm against .data section; 0.0 is the
  // natural "stop / no-end" sentinel.
  const kStopSentinel = 0.0;

  // Current server time, read through the indirection chain at
  // [ebx+0x1600] -> *edx -> **edx. TODO: replace with getServerTime()
  // (or `gpGlobals.time` once gpGlobals is typed — D.5 task).
  // The value is read twice in the original (once for startTime, once
  // for endTime); both reads are within a single frame so they are
  // effectively the same value, which `now` models.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const now = /* getServerTime() */ 0.0;

  // --- Outer gate (no-op if amount already matches) ---------------
  // asm: fld arg1; fcom [esi+0x564]; test ah,0x40; jne 0x696be
  //   jne taken when C3=1 => ST(0) == slowMotionFactor
  //   => at 0x696be: fstp st(0); ret.
  // NOTE: original also treats NaN as equal (C3=1 on unordered);
  // TS === does not. Acceptable behavioral drift for now.
  if (amount === this.slowMotionFactor) {
    return;
  }

  // --- Inner branch 1: deactivate --------------------------------
  // asm: fcomp [ebx-0x6f408]; test ah,0x40; je 0x6965c
  //   je taken when C3=0 (not-equal) -> jump to activate path.
  //   Fall-through (amount == sentinel OR unordered): clear active
  //   flag and return. Factor/startTime/endTime are intentionally
  //   NOT cleared — they hold their old values; active=0 makes them
  //   inert.
  if (amount === kStopSentinel) {
    this.slowMotionActive = 0; // [esi+0x560] = 0
    return;
  }

  // --- Inner branch 2: activate ----------------------------------
  // asm: sub esp,0x6 / pushw 0 / push 0 / push esi / call GlobalSlowMotion2
  //   = GlobalSlowMotion2(this, 0.0f, false)
  // TODO(asm-ambiguous): the extra 4 bytes (sub esp,0x6 + pushw 0 vs
  // the expected 12-byte cdecl arg block) is unexplained; treating it
  // as `(0.0, false)` is the natural reading of the demangled symbol.
  this.GlobalSlowMotion2(0.0, false);

  // Snapshot start time.
  // asm: mov edx,[ebx+0x1600] ; mov eax,[edx] ; mov eax,[eax] ;
  //      mov [esi+0x56c], eax
  this.slowMotionStartTime = now; // [esi+0x56c]

  // Store factor and flip active. asm: fld [esp+0x24]; fstp [esi+0x564];
  //                                   mov [esi+0x560], 0x3f800000
  this.slowMotionFactor = amount; // [esi+0x564]
  this.slowMotionActive = 1.0;    // [esi+0x560] = 0x3f800000

  // --- End-time computation --------------------------------------
  // asm (after `add esp,0x10` cleans the call frame):
  //   fld [esp+0x18]   ; ST(0) = duration
  //   fcom [ebx-0x6f408]
  //   test ah,0x40; jne 0x696b0
  //     jne (C3=1, equal) -> 0x696b0: fstp st(0); [esi+0x568]=0; ret
  //   Fall-through (duration != sentinel): mov eax,[edx]; fadd [eax];
  //                                         fstp [esi+0x568]
  if (duration === kStopSentinel) {
    this.slowMotionEndTime = 0; // [esi+0x568] = 0
  } else {
    this.slowMotionEndTime = duration + now; // [esi+0x568]
  }
}
