```typescript
/**
 * CTSGameRules::ResetRestartRound — resets the round-restart info
 * structure: stamps it with the current game time, clears per-team
 * flags, broadcasts HUD messages for any active team records, and
 * finally pushes a global HUD notification.
 *
 * Note: the demangler reports the parameter as `int`, but the body
 * dereferences it heavily — treat it as a pointer to a struct.
 *
 * @param this  The CTSGameRules entity instance (this in the original C++)
 * @param info  Pointer to the round-restart info record
 * @returns     void
 */
export function ResetRestartRound(this: CTSGameRules, info: any): void {
  // Gate: if info.state is 2 or 3 we proceed regardless; otherwise we
  // only proceed when the dedicated cvar (TODO: identify by name) is non-zero.
  if (info.state < 2 || info.state > 3) {
    // TODO(asm-ambiguous): cvar at [ebx+0x152c][0]
    if (cv_resetround.value === 0) return;
  }

  info.field_8 = 0;
  // fld QWORD + fadd DWORD: a double-precision value from  // [ebx-0x6f018] plus a float from [[ebx+0x1600]], stored as a float.
  info.curtime = realtime + g_timeOffset;

  // First if-block: broadcast an int countdown (clamped to a minimum)
  // followed by a zero byte. MessageBegin is called with 4 args
  // (3 + trailing 0); signature may vary by HL/TS build.
  if (info.flag_10 !== 0) {
    const elapsed = Math.max(info.curtime - g_timeOffset, g_minElapsed);
    const elapsedInt = Math.trunc(elapsed);

    g_engfuncs.pfnMessageBegin(MSG_ALL, g_msgRestartRound_1, null, 0);
    g_engfuncs.pfnWriteByte(elapsedInt);
    g_engfuncs.pfnWriteByte(0);
    g_engfuncs.pfnMessageEnd();
  }

  // Loop over 2 team-data slots (stride 0x118). The counter
  // increments by 2 and runs while <= 3, yielding exactly 2 iterations.
  for (let i = 0; i < 2; i++) {
    const rec = info.records[i];
    const now = Math.trunc(gpGlobals.time);

    rec.time_int = now;
    rec.field_10 = 0;
    rec.field_14 = 0;

    // If this team's first name slot is non-empty, broadcast it.
    if (rec.first_string.charCodeAt(0) !== 0) {
      g_engfuncs.pfnMessageBegin(MSG_ALL, g_msgRestartRound_2, null, 0);
      g_engfuncs.pfnWriteString(rec.first_string);
      g_engfuncs.pfnWriteShort(rec.field_14);
      g_engfuncs.pfnWriteShort(0);
      g_engfuncs.pfnMessageEnd();
    }

    rec.field_9c = 0;
    rec.field_a0 = 0;
    rec.time_int_2 = now;

    // Same pattern for the second name slot.
    if (rec.second_string.charCodeAt(0) !== 0) {
      g_engfuncs.pfnMessageBegin(MSG_ALL, g_msgRestartRound_2, null, 0);
      g_engfuncs.pfnWriteString(rec.second_string);
      g_engfuncs.pfnWriteShort(rec.field_a0);
      g_engfuncs.pfnWriteShort(0);
      g_engfuncs.pfnMessageEnd();
    }
  }

  // Final global HUD broadcast (cdecl, 6 args + 2 padding dwords).
  // TODO(asm-ambiguous): string literal at [ebx-0x6e67f]
  TSHudMessageAll(0, 0, 0, 8, 0x1e, kRestartHudMessage);
}
```
