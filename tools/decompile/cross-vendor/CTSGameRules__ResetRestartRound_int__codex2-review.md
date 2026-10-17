<meta>
Note: The function under review is `CTSGameRules::ResetRestartRound`, a TS-specific gameplay method — **not** one of the 4 HLSDK entry points covered by the reference doc. Items 2 (version check), 3 (`*interfaceVersion` assignment), and 4 (success-path struct copy) are N/A for this method; the other items apply to its faithfulness to the disassembly and to TS-specific field semantics.
</meta>

```
VERDICT: FAIL

This is a `CTSGameRules` instance method with no HLSDK counterpart, so the
"interface version" / "interfaceVersion assignment" / "memcpy table" checks
do not apply. The remaining items apply to the function's faithfulness to
the disassembly.

Checklist:
1. Signature — ❌ — Demangler reports `int`, but the disassembly clearly
   uses 3 explicit stack args: `[esp+0x40]` (pointer to the round-restart
   info record), `[esp+0x44]` (int, loop bound), and `[esp+0x4c]`
   (pointer, deref'd at +0xc). The TS code only accepts the one `info`
   arg plus an implicit `this`. The demangler is almost certainly wrong
   (the C++ symbol `ResetRestartRound__12CTSGameRulesi` is the mangler's
   name; the real C++ type is `void ResetRestartRound(Info*, int, Ctx*)`).
2. Version check — N/A. Not an engine↔mod interface entry point.
3. *interfaceVersion assignment-back — N/A.
4. Success-path struct copy — N/A. (No `memcpy` to an engine table.)
5. No fabricated code paths — ❌ — The TS unconditionally runs the
   per-team records loop with hardcoded `for (let i = 0; i < 2; i++)`.
   The disassembly has `cmp DWORD [esp+0x44],0x1; jle 689e3` before the
   loop, meaning when `arg2 ≤ 1` the function skips the per-team loop
   *but still calls* `TSHudMessageAll` at the end. This entire early-
   exit branch is missing.
6. No comment-only TODO body — ✅ — Real logic is expressed in code;
   `// TODO` lines are confined to genuinely ambiguous items.
7. Field names — ⚠️ — Many fields are placeholder (`field_8`, `flag_10`,
   `field_14`, `field_9c`, `field_a0`, `time_int`, …) which is fine for
   D.3 work, but several are also semantically *wrong* (see Issues #3
   and #4 below). The slot stride `0x118` and the two-sub-record layout
   are also hidden behind `info.records[i]` indexing.
8. Compiles in isolation — ⚠️ — Uses undefined globals (`cv_resetround`,
   `gpGlobals`, `g_timeOffset`, `realtime`, `g_msgRestartRound_*`,
   `kRestartHudMessage`, `TSHudMessageAll`, etc.) and `info.curtime` /
   `info.flag_10` accessors that aren't declared. Plausible but would
   need `any` stubs or `declare`s.

Issues to fix:

1. **Argument count.** The demangler is wrong; the binary uses 3 explicit
   args (`info`, an `int` loop-bound, and a third pointer that has a
   `float` member at +0xc). Add those. (Use `any` / a named TODO type for
   the third arg; it's plausibly the spilled `this` or a separate round
   context passed in by the caller.)

2. **Missing the `jle 689e3` loop guard.** Before the per-team records
   loop, add `if (arg2 <= 1) skip-records-body-but-still-call-TSHudMessageAll`.
   Today the TS would run the loop and emit per-team HUD messages even
   when the binary doesn't.

3. **`time_int` / `time_int_2` are wrong.** Both `slot[0xc]` and
   `slot[0x98]` are written by `fld DWORD [ebx+0x1ba8]+0xc` → `fistp →
   mov [slot+offset], eax`, and immediately afterward the resulting int
   is **derefed as a pointer** (see `push [eax+0x14]` at 688de,
   `push [eax+0xa0]` at 68985). So the stored int is a small-object
   pointer (a `void*` reinterpret-cast through the FPU), not a time.
   The TS code's `now = Math.trunc(gpGlobals.time)` and the `rec.time_int`
   semantics are wrong. Model it as `const ctxPtr = g_pRoundCtx.field_0xc`
   (a `*Ctx` pointer) and store the pointer to both slots — they hold
   the same pointer across the two sub-records.

4. **WriteShort arguments are wrong.** Disassembly:
   `push [eax+0x14]; call WriteShort` and `push [eax+0xa0]; call WriteShort`.
   The TS code passes `rec.field_14` and `rec.field_a0` (which were just
   *set to 0* two assignments earlier). What should be written is
   `[ctxPtr+0x14]` and `[ctxPtr+0xa0]` — i.e., small ints inside the
   context sub-struct, NOT the slot's own zeroed fields. This is the
   single most consequential semantic error in the decompile (it would
   cause the function to broadcast zeros for team-record metadata
   instead of the real ones).

5. **Stride / sub-record semantics are hidden.** The disassembly's loop
   explicitly adds `0x118` to four pointer slots per iteration (slot
   stride = 280 bytes per record × 2 sub-records — or whatever the
   struct actually is) plus `0x8c` to `edi` for the string pointer.
   The two strings per slot live at `slot+0x18` and `slot+0xa4`
   (likely a 12-byte slot header + two ~140-byte sub-records of
   `{ctx_ptr; int; int; char[~128]}`). The TS's `info.records[i]`
   array-indexing erases that fidelity. Keep the abstraction but at
   least note the `0x118` stride in a TODO comment.

6. **Things that ARE correct (worth keeping):**
   - State + cvar gate at the top (`if (state ∈ {2,3}) skip cvar`).
   - First-name broadcast guarded by `info[0x10] != 0`.
   - `Math.max(... , kMinElapsedConst)` then truncate → WriteByte.
   - Final `TSHudMessageAll(0, 0, 0, 8, 0x1e, kRestartHudMessage)` with
     the 2-dword `sub esp,0x8` padding. (✓ exactly matches.)

Suggested rewrite (full TS function):

```typescript
// Stub globals — fill in during D.5 wiring. Kept as `any` so the function
// compiles in isolation.
declare const gpGlobals: { time: number };
declare const g_engfuncs: {
  pfnMessageBegin: (dest: number, msgType: number, origin: any, ed: any) => void;
  pfnWriteByte:    (b: number) => void;
  pfnWriteShort:   (s: number) => void;
  pfnWriteString:  (s: any) => void;
  pfnMessageEnd:   () => void;
};
declare const cv_resetround: { value: number };
declare function TSHudMessageAll(
  channel: number, x: number, y: number,
  r: number, g: number, b: number,
  fadeIn: number, fadeOut: number, holdTime: number, fx: number,
  msg: string
): void;

// TS-specific engine function table slot offsets (defined elsewhere).
const MSG_ALL = 2;
const g_msgRestartRound_1 = 0;     // TODO: identify (low-byte at [ebx+0x1be8])
const g_msgRestartRound_2 = 0;     // ditto, for the per-team broadcast
const kRestartHudMessage   = "";  // TODO: string literal at [ebx-0x6e67f]
const kMinElapsedConst     = 0;    // TODO: float at [ebx-0x6f408]
const kRoundRestartOffset  = 0;    // TODO: double at [ebx-0x6f018]
declare const g_pRoundCtx: { field_0xc: any }; // a `*Ctx` reinterpret-cast

/**
 * CTSGameRules::ResetRestartRound — resets a round-restart info record,
 * clears per-team record flags, broadcasts HUD messages for any active
 * team records, and emits a final global HUD notification.
 *
 * Demangled signature `ResetRestartRound(int)` is misleading: the binary
 * has THREE explicit args. The `int` is the second arg; the third arg is
 * a separate struct pointer.
 */
export function ResetRestartRound(
  this: CTSGameRules,
  info: any,                 // arg1: round-restart info record (ptr)
  arg2: number,              // arg2: loop-bound / mode (compared with 1)
  arg3: any                  // arg3: has a `float` field at +0xc
): void {
  // Gate (asm 68763..68779):
  //   if state ∈ {2,3} → skip cvar check; else if cvar == 0 → return.
  const stateByte = (info.state ?? 0) & 0xff;
  if (stateByte < 2 || stateByte > 3) {
    if (cv_resetround.value === 0) return;
  }

  // info.field_c = double constant + (float)[ebx+0x1600]_field_0
  // (asm 68787..68793; outer's value is *separate* from the loop's ctxPtr.)
  info.field_8 = 0;
  info.field_c = kRoundRestartOffset + gpGlobals.time;

  // First-name broadcast (gated by info[0x10]; asm 6879d..68825).
  if (info.flag_10 !== 0) {
    // elapsed = floor( max(arg3.field_c - gpGlobals.time, kMinElapsedConst) )
    const elapsed = Math.max(
      (arg3?.field_0xc ?? 0) - gpGlobals.time,
      kMinElapsedConst
    );
    const elapsedInt = elapsed | 0;

    g_engfuncs.pfnMessageBegin(MSG_ALL, g_msgRestartRound_1, null, 0);
    g_engfuncs.pfnWriteByte(elapsedInt);
    g_engfuncs.pfnWriteByte(0);
    g_engfuncs.pfnMessageEnd();
  }

  // Loop guard (asm 68828..6882d): if arg2 ≤ 1, skip the per-team records
  // loop but STILL call the final TSHudMessageAll below. This branch was
  // missing from the prior decompile.
  if (arg2 > 1) {
    // 2 iterations; explicit stride 0x118 (slot = 280 bytes, holding two
    // sub-records of size ≈140 bytes each at slot+0xc and slot+0x98).
    for (let i = 0; i < 2; i++) {
      const slotBase = info + 0x10 + i * 0x118;

      // Clear first sub-record fields.
      slotBase[0x10] = 0;
      slotBase[0x14] = 0;

      // slot[0xc] = (int)*global.field_0xc — but this int is REINTERPRETED
      // as a POINTER later (see WriteShort calls below). Model as a
      // `*SubCtx` pointer; both sub-records carry the SAME pointer.
      const ctxPtr: any = g_pRoundCtx.field_0xc;
      slotBase[0xc] = ctxPtr;

      // First-name broadcast (gated by slotBase[0x18] == non-zero byte).
      if (slotBase[0x18] !== 0) {
        g_engfuncs.pfnMessageBegin(MSG_ALL, g_msgRestartRound_2, null, 0);
        g_engfuncs.pfnWriteString(slotBase + 0x18);     // first string
        g_engfuncs.pfnWriteShort(ctxPtr[0x14]);         // [ctx+0x14], NOT slot[0x14]
        g_engfuncs.pfnWriteShort(0);
        g_engfuncs.pfnMessageEnd();
      }

      // Second sub-record.
      slotBase[0x9c] = 0;
      slotBase[0xa0] = 0;
      slotBase[0x98] = ctxPtr;                          // same pointer
      if (slotBase[0xa4] !== 0) {
        g_engfuncs.pfnMessageBegin(MSG_ALL, g_msgRestartRound_2, null, 0);
        g_engfuncs.pfnWriteString(slotBase + 0xa4);     // second string
        g_engfuncs.pfnWriteShort(ctxPtr[0xa0]);         // [ctx+0xa0], NOT slot[0xa0]
        g_engfuncs.pfnWriteShort(0);
        g_engfuncs.pfnMessageEnd();
      }
    }
  }

  // Final HUD broadcast (always called, even when we skipped the loop).
  // asm 689e3..689ff: 6 args + 2 pad dwords → call TSHudMessageAll.
  TSHudMessageAll(0, 0, 0, 8, 0x1e, kRestartHudMessage);
}
```

**Why each fix matters:**
- Adding args closes the gap with the disassembly's `[esp+0x40] / 0x44 /
  0x4c` accesses; without them, the third-arg float comparison and the
  loop-bound check simply can't be expressed.
- Restoring `if (arg2 > 1)` around the loop matches `jle 689e3`; without
  it, the binary would skip the broadcast but the TS would emit it.
- Modeling `slot[0xc]` / `slot[0x98]` as a `*Ctx` pointer and writing
  `[ctx+0x14]` / `[ctx+0xa0]` to WriteShort is the only way to faithfully
  reproduce `push [eax+0x14]` (since the previous version reads a
  freshly-stored int and derefences it as memory).
- The stride comment (`0x118`) and the two-sub-record layout keep the
  abstraction honest enough that D.4 + D.5 work can plug in a real struct.
```

**Summary of what changed vs the original TS decompile:**
- Argument list grew from `(this, info)` to `(this, info, arg2, arg3)`.
- Added `if (arg2 > 1) { … }` around the per-team loop.
- `rec.time_int` / `rec.time_int_2` now hold the *same* `(int) g_pRoundCtx.field_0xc` pointer in both slots (no more `gpGlobals.time`).
- `WriteShort(rec.field_14)` → `WriteShort(ctxPtr[0x14])`; same for `field_a0`.
- Added inline comments flagging the stride `0x118`, the two sub-records
  per slot at `+0x18` and `+0xa4`, and the kMinElapsedConst / kRestartHudMessage
  string-literal TODOs that still need D.5 cross-references.
