// Ambient declarations so this file compiles in isolation.
declare class CTSStunt {
  m_pPlayer: any;
  m_flWallJumpCounter?: number;
  m_flWallJumpTimer?: number;
  [k: number]: any;
}

declare global {
  // The engine's function table. Members we touch in this file are
  // declared; everything else is `any` (filled in by HLSDK parity).
  var g_engfuncs: {
    pfnMessageBegin(msg_dest: number, msg_type: number,
                    origin: Float32Array | null,
                    ed: any): void;
    pfnWriteByte(b: number): void;
    pfnMessageEnd(): void;
    [k: number]: any;
  };

  // Cvar / string globals lifted from the binary's GOT.
  // Names are tentative; offsets are exact.
  var g_vecWallJumpImpulse: { x: number; y: number; z: number };
  var g_msgWallJump: { valueOf(): number };
  var cvWallJumpThreshold: number;
  var cvWallJumpScale: number;
  var szWallJumpSoundPath: string;

  // HLSDK macro expanded at the call site.
  function EMIT_SOUND_DYN(
    ed: any, channel: number, sample: string,
    volume: number, attenuation: number, flags: number, pitch: number,
  ): void;

  // Enginefunc at TS enginefuncs_t offset 0x168 — returns a
  // char* to the resolved sound path; the caller adds 0x5f to
  // skip a 95-byte prefix baked into the table.
  function g_pfnResolveSoundPath(a: number, b: number): number; // *char
}

const CHAN_VOICE = 4;

/**
 * CTSStunt::HandleWallJump — per-frame handler for the wall-jump
 * "frozen" state. If the player just pressed duck while frozen,
 * consumes the press, copies a fixed jump vector into the player,
 * optionally sends a temp-entity message to the client (when the
 * per-frame counter is below a threshold cvar), and plays the
 * wall-jump sound effect.
 *
 * @param this  The CTSStunt entity instance (`this` in original C++)
 * @returns     void
 *
 * @remarks Tentative field names — `m_flWallJumpCounter` and
 *   `m_flWallJumpTimer` are guesses from context, not confirmed
 *   against the TS source.
 */
export function HandleWallJump(this: CTSStunt): void {
  // this->m_pPlayer at offset 0x40.
  const player: any = this.m_pPlayer;
  if (!player) return;

  // Player's first member is pev (entvars_t*).
  // The asm:  mov eax, [ebp+0x40] ; mov edx, [eax] ; test [edx+0x1a5]
  const pev: any = (player as any).pev;
  if (!pev) return;

  // ---- Bail if the player isn't "frozen" (pev+0x1a5, bit 0x2). ----
  // TODO(asm-ambiguous): confirm bit 0x2 is FL_FROZEN-equivalent in TS.
  if (((pev[0x1a5] as number) & 0x2) === 0) return;

  // ---- If the player just pressed duck (pev+0x250, bit 0x10000) ----
  // TODO(asm-ambiguous): confirm offset 0x250 / bit 0x10000 corresponds
  //   to IN_DUCK in the TS build. (Standard HLSDK has m_afButtons at
  //   a different offset; TS may differ.)
  const buttons: number = pev[0x250] as number;
  if (buttons & 0x10000) {
    // Consume the duck press.
    pev[0x250] = buttons & ~0x10000;

    // ---- Set pev+0x120 = 0.5f ----
    // TODO(asm-ambiguous): purpose unclear — likely an anim timer.
    pev[0x120] = 0.5;

    // ---- Copy 3-float impulse from g_vecWallJumpImpulse into
    //      pev+0x174 (m_vecVelocity). ----
    // TODO(asm-ambiguous): 0x174 matches standard HLSDK m_vecVelocity.
    const v = g_vecWallJumpImpulse;
    pev[0x174] = v.x;
    pev[0x178] = v.y;
    pev[0x17c] = v.z;

    // ---- Set this->field_0x4 = 0.35f (wall-jump debounce timer). ----
    // Original TS source likely writes `0.35f` here, not `0.3f`.
    this.m_flWallJumpTimer = 0.35;

    // ---- If per-frame counter is below cvar threshold ... ----
    // fcomp sets AH; `jae` jumps on CF=0|ZF=1 → fall-through is the
    // `<` case.
    // TODO(asm-ambiguous): the cv threshold's exact cvar identity
    //   (slowamt? ts_slowmotion?) needs to be confirmed against
    //   strings-n5.txt.
    if (this.m_flWallJumpCounter < cvWallJumpThreshold) {
      // ---- Zero the counter BEFORE the fmul — so the byte written
      //      below is always 0 in this path. ----
      // NOTE: this is suspicious; the original TS source likely
      //   reads the counter *before* zeroing it. Possibly a compiler
      //   reorder artifact, or a real bug in the mod.
      this.m_flWallJumpCounter = 0;

      // pfnMessageBegin(MSG_ONE, *g_msgWallJump, NULL, pContainingEntity)
      // TODO(asm-ambiguous): in HL SDK, edict = pev->pContainingEntity;
      //   here the asm reads from pev+0x208, which is past the standard
      //   entvars_t. TS may have extended the struct or be storing the
      //   edict pointer at this offset.
      const edictPtr = pev[0x208];
      g_engfuncs.pfnMessageBegin(1, g_msgWallJump.valueOf(), null, edictPtr);

      // WriteByte(floor(cvScale * counter))  — but counter is 0, so
      //   this is always 0. See NOTE above.
      g_engfuncs.pfnWriteByte(
        Math.floor(cvWallJumpScale * this.m_flWallJumpCounter),
      );
      g_engfuncs.pfnMessageEnd();
    }
  }

  // ---- Always: set pev+0x11c = 1.0f (merge point reached from both
  //      the "duck pressed" and "duck not pressed" paths). ----
  // TODO(asm-ambiguous): purpose unclear — likely a flag clear
  //   ("is_wall_jumping" = 0) or an anim reset.
  pev[0x11c] = 1.0;

  // ---- Resolve the wall-jump sound path. ----
  // The enginefunc at +0x168 returns a char*; we add 0x5f to skip a
  // 95-byte table prefix baked into the binary.
  // TODO(asm-ambiguous): confirm the identity of the enginefunc at
  //   enginefuncs_t+0x168 in TS.
  const rawPtr: number = g_pfnResolveSoundPath(0, 0x1f);
  // In asm: `add eax, 0x5f` — skip 0x5f bytes of prefix.
  const resolvedPath = /* pointer arithmetic */ rawPtr === 0
    ? szWallJumpSoundPath
    : String(/* readCString(rawPtr + 0x5f) */);

  // ---- Pre-cache / validate the path ----
  // Enginefunc at +0x168 itself was called above; here we just play
  // through EMIT_SOUND_DYN.
  const edForEmit = pev[0x208];

  EMIT_SOUND_DYN(
    edForEmit,                    // edict
    CHAN_VOICE,                   // channel
    resolvedPath,                 // sample (after +0x5f skip)
    1.0,                          // volume   (0x3f800000)
    0.8,                          // attn     (0x3f4ccccd)
    0,                            // flags
    0.5,                          // pitch    (0x3f000000)
  );
}
