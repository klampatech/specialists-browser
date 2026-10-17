/**
 * CTSStunt::HandleWallClimb — Drive the wall-climb sequence each tick.
 *
 * Disassembly-faithful structural decompile. All field identifiers are
 * placeholder names (`ts_field_*`); HLSDK names are NOT used unless the
 * offset matches. D.4 (TS class reconstruction) will resolve them.
 *
 * @param this  The CTSStunt entity instance
 * @returns     void
 */
export function HandleWallClimb(this: CTSStunt): void {
  const player = this.m_pPlayer;
  const pev = player.pev;

  // ─── Phase 1 — actively climbing this tick ──────────────────────────
  // pev.ts_field_0x1a5 is a TS custom byte; bit 0x2 = "in climb anim/state".
  if ((pev.ts_field_0x1a5 & 0x02) !== 0) {
    // pev.ts_field_0x250 is a TS custom flag word; bit 0x20000 = "final climb tick".
    if (pev.ts_field_0x250 & 0x20000) {
      pev.ts_field_0x250 &= ~0x20000;

      // 0.5 into pev+0x120 (purpose TBD).
      pev.ts_field_0x120 = 0.5;

      // 3-float copy from a global symbol [ebx+0x1888] into pev+0x174.
      // NOTE: pev+0x174 is NOT entvars_t::velocity (which is at 0x020);
      // this is a TS custom 3-float field.
      const climbVel = engine.globalVec3At('g_dword_0x1888'); // TODO: real name
      pev.ts_field_0x174_x = climbVel[0];
      pev.ts_field_0x174_y = climbVel[1];
      pev.ts_field_0x174_z = climbVel[2];

      // Post-climb timer (0.3 s) at this+0x4, and elapsed-time gate against
      // a cvar at [ebx-0x6f3f0].
      this.ts_field_0x4 = 0.3;
      if (this.ts_field_0x0 < engine.cvarFloat('TODO_wallclimb_time_UNVERIFIED')) {
        this.ts_field_0x0 = 0; // reset BEFORE the FPU math

        // Network fade via engine dispatch:
        //   MessageBegin(edict=pev+0x208, ?, ?, ?) → WriteShort(int) → MessageEnd()
        // The three dispatch slots [esi+0xb8, +0xc0, +0xbc] map to
        // pfnMessageBegin / pfnWriteShort / pfnMessageEnd.
        // WriteShort arg = (int)(cvar2 * this->field_0x0) — note that
        // field_0x0 was just zeroed, so the result is 0. Faithful to asm.
        const fadeArg =
          (engine.cvarFloat('TODO_wallclimb_fade_UNVERIFIED') * this.ts_field_0x0) | 0;
        engine.netMsgFadeOne(player, pev.ts_field_0x208, fadeArg);
      }
    }

    // ─── Tail (always executed in the active-climb phase) ────────────
    pev.ts_field_0x11c = 1.0;
    const edictHandle = pev.ts_field_0x208; // TS custom; NOT pContainingEdict

    // Layer 1: short pfnEmitSound blip. Disassembly has only 4 stack
    // dwords for a 7-arg function (plus a stale-value sub esp, 0x4),
    // so trailing args are intentionally uninitialized. Stub them.
    engine.pfnEmitSound_TS(
      /* entity  */ edictHandle,
      /* channel */ 0x1f,
      /* sample  */ 'TODO: short-form, real sample string unknown',
      /* vol     */ /* TODO(asm-ambiguous): uninitialized in disassembly */,
      /* attn    */ /* TODO(asm-ambiguous): uninitialized in disassembly */,
      /* fFlags  */ /* TODO(asm-ambiguous): uninitialized in disassembly */,
      /* pitch   */ /* TODO(asm-ambiguous): uninitialized in disassembly */);

    // Layer 2: full EMIT_SOUND_DYN with sample string at [ebx-0x6c364].
    // NOTE: 7th arg is `g_engfuncs + 0x5f`, implausibly a "pitch" —
    // likely a cvar pointer or macro-expansion quirk. TODO.
    EMIT_SOUND_DYN(
      /* entity  */ edictHandle,
      /* channel */ 4,
      /* sample  */ engine.stringAt('g_string_-0x6c364'), // TODO: confirm .wav
      /* volume  */ 1.0,
      /* attn    */ 0.8,
      /* fFlags  */ 0,
      /* pitch   */ /* TODO: g_engfuncs+0x5f — verify against D.4 */);

    return;
  }

  // ─── Phase 2 — climb request pending, but not actively climbing ────
  // player.ts_field_0x815 is a TS custom byte; bit 0x40 = climb-request.
  if ((player.ts_field_0x815 & 0x40) !== 0) {
    if (this.CheckForWallJump()) {
      this.GoWallJump();
      return;
    }
    if (this.CheckForWallDive()) {
      pev.ts_field_0x250 |= 0x800000; // mark wall-dive transition
      this.GoDive();
    }
  }
}
