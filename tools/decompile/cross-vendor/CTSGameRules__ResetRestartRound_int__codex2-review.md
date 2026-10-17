VERDICT: FAIL

```
Reviewed `CTSGameRules::ResetRestartRound(int)` against the disassembly.
The high-level shape (gate → set-time → 2-iter per-record loop → final
broadcast) is right, but the parameter mapping is wrong in a way that
breaks the function's semantics, and the loop bound check on the
explicit `count` parameter is missing entirely.

Checklist:
1. Signature — ❌ — Disassembly has TWO stack args: `[esp+0x40]`
   (implicit `this`, dereferenced as a struct pointer) and `[esp+0x44]`
   (explicit int, compared with `0x1` to gate the loop). The TS
   treats `[esp+0x40]` as `info: any` (the "explicit" int-as-pointer)
   and drops `[esp+0x44]` entirely. The implicit `this` should be
   the first param and the explicit int (`count`) should be the
   second. The demangled symbol's `int` corresponds to `[esp+0x44]`,
   not `[esp+0x40]`.
2. Gate / early-return logic — ✅ — `state ∈ {2,3}` proceeds
   unconditionally; otherwise the cvar at `*[ebx+0x152c]` is checked   and a zero returns. The TS's inverted `if (state<2 || state>3)`
   with the inner `cv_resetround.value === 0` returns correctly.
3. Version check — N/A (not an engine interface function).
4. interfaceVersion assignment — N/A.
5. Success path / no fabricated branches — ⚠️ — The `for (let i=0; i<2;
   i++)` hardcodes 2 iterations and ignores the `count <= 1` skip at
   `0x68828`. This is a fabricated control-flow path: the original
   only enters the loop body when `[esp+0x44] > 1`. When called with
   `count <= 1`, the TS will broadcast per-record HUD messages that
   the binary skips.
6. No TODO body — ⚠️ — The body is mostly code (not "mostly TODO"),
   so this is not a hard fail. But `cv_resetround.value` and
   `kRestartHudMessage` are speculative globals; the cvar name must
   be verified against `tools/decompile/strings-n5.txt` (the prompt
   calls this out) and the string literal at `[ebx-0x6e67f]` likewise.
7. Field names — ⚠️ — `curtime`, `records`, `first_string`,
   `second_string`, `flag_10`, `time_int`, `time_int_2`, `field_*` are
   all inferred from offsets (no D.4 cross-reference yet). The offsets
   within records DO check out against the disassembly (rec base =
   `this+0x10`, stride 0x118, first-name string at rec+0x18,
   second-name string at rec+0xa4, first-writeback at rec+0xc,
   second-writeback at rec+0x98). But the names should be flagged
   inferred, not asserted. `field_*` placeholders are fine; the
   "this is a `records[]` array of `first_string/second_string`"
   framing is speculation.
8. Compiles in isolation — ❌ — References `CTSGameRules`,
   `g_engfuncs`, `gpGlobals`, `cv_resetround`, `MSG_ALL`,
   `g_msgRestartRound_1`, `g_msgRestartRound_2`, `TSHudMessageAll`,
   `realtime`, `g_timeOffset`, `g_minElapsed`, `kRestartHudMessage` —
   none are defined in the snippet.

Issues to fix:
- **Param mapping (critical).** `[esp+0x40]` is the implicit `this`
  for a g++-compiled member function, NOT an "info" pointer. The
  explicit `int` parameter the demangler reports is `[esp+0x44]`.
  Fix: signature becomes `(this: CTSGameRules, count: number): void`,
  and every `info.field_x` becomes `this.field_x` (or a relative
  offset if you prefer to keep names uninferred).
- **Loop bound (critical).** `cmp [esp+0x44], 0x1; jle 0x689e3` at
  `0x68828` must become `if (count > 1)` wrapping the loop, not a
  hardcoded 2-iteration `for`.
- **MsgBegin msg_dest constant (minor).** Disassembly pushes `0x2` as
  the first arg to `pfnMessageBegin`, not `MSG_ALL` (which is `6`).
  Likely `MSG_PVS` or a TS-specific dest — at minimum, mark it
  `0x2` (or `MSG_PVS`) with a TODO if you can't confirm.
- **Two strings per record, interleaved (minor).** `edi` walks `this+0x28, this+0xb4, this+0x140, this+0x1cc` — the stride  between *consecutive* HUD broadcasts is 0x8c, but the stride
  between *records* is 0x118. The TS's `rec.first_string` /
  `rec.second_string` access via `info.records[i]` works *only*
  because `i ∈ {0,1}` and the per-record stride happens to be
  0x118 (so `first_string = info + 0x28 + i*0x118`,
  `second_string = info + 0xb4 + i*0x118`). Worth a comment so a
  future reader doesn't think the 0x8c increment is a typo.
- **Cvar + string-literal names need verification** against
  `strings-n5.txt` before this leaves D.3.
- **External refs** must be either imported from a shared D.5 types
  module or stubbed at the top of the file.

Suggested rewrite:
```typescript
/**
 * CTSGameRules::ResetRestartRound — clears round-restart bookkeeping
 * on the CTSGameRules instance: stamps it with the current game
 * time, zeros per-record fields, broadcasts HUD messages for any
 * active records (gated on a non-zero leading byte of each name),
 * and finally pushes a global HUD notification.
 *
 * Original demangled symbol: `CTSGameRules::ResetRestartRound(int)`
 * g++ ABI: `void CTSGameRules::ResetRestartRound(int count)` — `this`
 * is the implicit first stack arg.
 *
 * @param this    The CTSGameRules instance (implicit in C++).
 * @param count   Loop gate: if `<= 1`, the per-record loop is skipped.
 */
export function ResetRestartRound(this: CTSGameRules, count: number): void {
  // Gate: byte at this+0 ∈ {2,3} proceeds unconditionally.
  // Otherwise the global at *[ebx+0x152c] is checked; if zero, return.
  // TODO(asm-ambiguous): resolve cvar name from strings-n5.txt.
  if (this[0] < 2 || this[0] > 3) {
    if (cv_resetround.value === 0) return;
  }

  this.field_8 = 0;
  // fld QWORD [ebx-0x6f018] + fadd DWORD [eax]:
  //   global double (realtime?) plus deref'd float (g_timeOffset?).
  this.curtime = realtime + g_timeOffset;

  // First HUD broadcast: gated on the byte at this+0x10.
  if (this[0x10] !== 0) {
    // max(this[0xc] - *(*(ebx+0x1600)), *(ebx-0x6f408))
    // simplifies to max(realtime, g_minElapsed) once curtime is
    // substituted — keep the literal form for fidelity.
    const elapsed = Math.max(this.curtime - g_timeOffset, g_minElapsed);
    const elapsedInt = Math.trunc(elapsed);

    // Disassembly pushes msg_dest = 0x2 (NOT MSG_ALL=6); TODO verify.
    g_engfuncs.pfnMessageBegin(/*MSG_PVS?*/ 0x2, g_msgRestartRound_1, null, 0);
    g_engfuncs.pfnWriteByte(elapsedInt);
    g_engfuncs.pfnWriteByte(0);
    g_engfuncs.pfnMessageEnd();
  }

  // Per-record loop. Two iterations, gated on count > 1.
  // Record layout (offsets relative to `this`):
  //   record[i] base   = this + 0x10 + i*0x118
  //   .time_int        = base + 0x0c  (dword, int-truncated time)
  //   .field_10        = base + 0x10  (dword, zeroed)
  //   .field_14        = base + 0x14  (dword, zeroed; later WriteShort'd)
  //   .first_string    = base + 0x18  (null-terminated, leading byte
  //                                    acts as the "active" flag)
  //   .time_int_2      = base + 0x98  (dword, int-truncated time)
  //   .field_9c        = base + 0x9c  (dword, zeroed)
  //   .field_a0        = base + 0xa0  (dword, zeroed; later WriteShort'd)
  //   .second_string   = base + 0xa4  (null-terminated, leading byte
  //                                    acts as the "active" flag)
  if (count > 1) {
    for (let i = 0; i < 2; i++) {
      // First-name slot: zero + stamp int(time).
      this[0x20 + i * 0x118] = 0;
      this[0x24 + i * 0x118] = 0;
      this[0x1c + i * 0x118] = Math.trunc(gpGlobals.time);

      // If first name's leading byte is non-zero, broadcast.
      if (this[0x28 + i * 0x118] !== 0) {
        g_engfuncs.pfnMessageBegin(0x2, g_msgRestartRound_2, null, 0);
        g_engfuncs.pfnWriteString(readCString(this + 0x28 + i * 0x118));
        g_engfuncs.pfnWriteShort(this[0x24 + i * 0x118]); // just zeroed
        g_engfuncs.pfnWriteShort(0);
        g_engfuncs.pfnMessageEnd();
      }

      // Second-name slot: zero + stamp int(time).
      this[0xac + i * 0x118] = 0;
      this[0xb0 + i * 0x118] = 0;
      this[0xa8 + i * 0x118] = Math.trunc(gpGlobals.time);

      // If second name's leading byte is non-zero, broadcast.
      if (this[0xb4 + i * 0x118] !== 0) {
        g_engfuncs.pfnMessageBegin(0x2, g_msgRestartRound_2, null, 0);
        g_engfuncs.pfnWriteString(readCString(this + 0xb4 + i * 0x118));
        g_engfuncs.pfnWriteShort(this[0xb0 + i * 0x118]); // just zeroed
        g_engfuncs.pfnWriteShort(0);
        g_engfuncs.pfnMessageEnd();
      }
    }
  }

  // Final global HUD broadcast (6 cdecl args: 3 bytes + 2 ints + string).
  // TODO(asm-ambiguous): resolve string literal at [ebx-0x6e67f].
  TSHudMessageAll(0, 0, 0, 8, 0x1e, kRestartHudMessage);
}
```
