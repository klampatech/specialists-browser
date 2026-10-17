```
VERDICT: PASS-WITH-NOTES

This is NOT one of the 4 HLSDK API entry points the review template
was written for — it's a TS-specific class method
(`CTSGameRules::SetGlobalSlowMotion`). Items 2/3/4 of the checklist
do not apply. Scoring focuses on items 1, 5-8.

Checklist:
1. Signature — ✅ — matches the demangled symbol
   `SetGlobalSlowMotion__12CTSGameRulesff` =
   `CTSGameRules::SetGlobalSlowMotion(float, float) -> void`. The TS
   captures this as `(amount: number, duration: number): void` plus an
   explicit `this: any`. Parameter names "amount" and "duration" are
   inferred (consistent with the `ts_slowmo_amount` / `ts_slowmo_duration`
   cvars hinted at in `strings-n5.txt`) — flagged as inferred, which
   is appropriate.

2. Version check pattern — ⚠️ N/A — not a `GetEntityAPI*` /
   `GetNewDLLFunctions` entry point. The two `test ah,0x40` /
   `fcom` patterns here are FPU C3 (equal-flag) checks, not version
   checks.

3. `*interfaceVersion` assignment-back — ⚠️ N/A — no interface-version
   pointer in this function.

4. Success path (struct copy or equivalent) — ⚠️ N/A — this function
   is a state-machine updater; it does not return a struct.

5. No fabricated code paths — ✅ — every branch in the TS maps to an
   asm control-flow site:
     • `if (amount === slowMotionFactor) return` → `jne 0x696be` at
       0x69640 (jne fires when C3=1, i.e., ST(0)==[esi+0x564],
       i.e., equal).
     • `if (amount === kStopSentinel) { active=0; return }` →
       fall-through at 0x69642-0x6964f (`fcomp` against
       `[ebx-0x6f408]`, `je 0x6965c` fires when C3=0 / not-equal).
     • Activate path: `GlobalSlowMotion2(0.0, false)` →
       `call 5a080` after the `sub esp,0x6 / pushw 0 / push 0 /
       push esi` arg setup at 0x6965c.
     • `slowMotionStartTime = now` / `slowMotionFactor = amount` /
       `slowMotionActive = 1.0` → 0x69674 / 0x6967e /
       0x69684 in that order.
     • `if (duration === kStopSentinel) endTime=0` →
       `jne 0x696b0` at 0x696a0 (jne = C3=1 = equal).
     • `else endTime = duration + now` → `fadd [eax]` /
       `fstp [esi+0x568]` at 0x696a4-0x696a6.

6. No comment-only / TODO body — ✅ — the body is real logic (four
   `this.` writes, one external call). TODO markers are inline
   comments calling out unknown values (`kStopSentinel`,
   `now`), not stubs for unimplemented code.

7. Field names — ⚠️ needs review — the four field names
   (`slowMotionActive @ 0x560`, `slowMotionFactor @ 0x564`,
   `slowMotionEndTime @ 0x568`, `slowMotionStartTime @ 0x56c`) are
   *inferred* and not source-verified. They are coherent with the
   function's behavior and the cvar names, but should be tagged as
   inferred in the source rather than asserted.

8. Compiles in isolation — ✅ — uses `this: any`, no external type
   references; uses primitive `number`, primitive `boolean`. Standalone
   parse-clean.

Issues to fix:
- 🟡 `now: number = 0.0` is a placeholder. The asm reads through a
  real pointer chain (`mov edx, [ebx+0x1600]` → `[edx]` → `[eax]`,
  loaded into `[esi+0x56c]` at 0x69674). The TS should not just leave
  this as a literal `0.0` — at minimum, replace with a clearly named
  helper (`getServerTime()` or `gpGlobals.time` once `gpGlobals` is
  wired up) and add a TODO cross-ref to whichever D-ticket owns
  `gpGlobals` typing.
- 🟡 `kStopSentinel = 0.0` is a guess. The asm compares against
  `[ebx-0x6f408]`, a hard data-section address (GOT-relative, so a
  global float in `.rodata` or `.data`). Confirm the actual value
  from the `.data` dump before treating this as authoritative; if it
  is `0.0f`, drop the TODO.
- 🟢 `this: any` is fine for now; replace once `class CTSGameRules` is
  declared (that's a D.4 task per the chunk notes).
- 🟢 The `pushw 0` in the `GlobalSlowMotion2` arg setup
  (`sub esp,0x6 / pushw 0 / push 0 / push esi` = 16 bytes of stack
  growth for a `(this, float, bool)` call that should be 12 in cdecl)
  is unusual. The TS interpretation `(0.0, false)` is the natural
  reading of the demangled `GlobalSlowMotion2(float, bool)` and the
  two zero pushes, but the extra stack is unexplained (alignment?
  compiler quirk?). Worth a `// TODO(asm-ambiguous)` rather than
  silently dropping.
- 🟢 Field names at offsets 0x560/0x564/0x568/0x56c are inferred, not
  verified. Add a top-of-function `// FIELDS INFERRED — verify
  against TS source before merge` note so future readers don't
  treat them as ground truth.
- 🟢 NaN handling: the asm's C3=1 is also set for unordered compares
  (NaN). The TS uses `===` which only matches exact equality, so a
  NaN `amount` would NOT trigger the no-op branch — it would fall
  through to the rest of the function. This is a minor behavioral
  mismatch vs the original; flag with `// TODO(asm-ambiguous):
  original treats NaN==value as equal (C3=1); TS === does not`.

Suggested rewrite (PASS-WITH-NOTES, full TS function):
```typescript
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
```

Overall: the decompiled TS is a faithful port of the asm's data flow
and control flow, with placeholder values for the two unknowns (`now`
and `kStopSentinel`) clearly marked. The main deltas vs the original
are (a) the `now` literal that needs a real time-source, (b) NaN
handling on `===`, and (c) inferred field names. None of these block
the rewrite from being useful as a D.3/D.4 stepping-stone.
```

Want me to file any of this in `HANDOFF.md` as a D-ticket? Specifically:
- D.5: type `gpGlobals` + provide `getServerTime()` so `now` becomes real.
- D.7 or later: confirm `kStopSentinel` value from `ts_i386.so`'s `.data` dump.
- D.4: cross-reference fields `slowMotion{Active,Factor,StartTime,EndTime}` against actual `CTSGameRules` source if it lives anywhere.
