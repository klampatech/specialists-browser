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
