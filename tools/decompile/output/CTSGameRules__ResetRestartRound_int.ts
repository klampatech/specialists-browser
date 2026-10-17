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
