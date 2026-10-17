/**
 * CTSStunt::GoDive — initiate a dive stunt on the bound player.  Selects
 * the dive tier (high / medium / low / none) from pev->v_angle[0] (the
 * TS mod repurposes the player's yaw as a tier signal), drives the dive
 * state machine (animation, network message, dive velocity, dive SFX),
 * and applies the resulting velocity.
 *
 * @param this  The CTSStunt instance (implicit this in C++).
 * @returns     void
 *
 * ASM ambiguity notes:
 *  - `[eax+0x74]` is `pev->v_angle` (Vector at offset 0x74 in entvars_t).
 *    The tier check reads only v_angle[0] (yaw). UTIL_MakeVectors
 *    receives the full Vector.
 *  - `[eax+0x11c]` / `[eax+0x120]` / `[eax+0x174]` are TS-specific
 *    fields (`diveCharge`, `diveBonus`, `diveVelocity`).  Cross-check
 *    against TS source when available.
 *  - `[eax+0x252]` (byte within pev+0x250 `flags`) holds a TS flag bit
 *    that selects between "use v_forward" and "re-normalize velocity".
 *  - `[eax+0x208]` is `pev->pContainingEnt` (the edict pointer).
 *  - The two `engfuncs[0x168]` calls take args (0, 10) and (0, 31);
 *    mapping to HLSDK's enginefuncs_t is a TODO (likely pfnPrecacheSound
 *    with a TS string-table offset for the second arg).
 *  - The engine func at GOT+0x11c may not be HLSDK's pfnWriteShort —
 *    asm reuses its return as the next WriteByte arg.
 */
export function GoDive(this: CTSStunt): void {
  const pev = (this as any).m_pPlayer.pev;
  const pPlayer = (this as any).m_pPlayer;

  // ── pick the dive tier ─────────────────────────────────────────────
  // HIGH → MEDIUM → LOW.  FL_DIVE_LOW is set unconditionally before
  // CanDiveLow.  Every committed tier lands on the common success block
  // (sets diveCharge = 0.75).  "No tier" sets bonus=0.9, charge=1.0,
  // and skips the common block.
  let diveCommitted = false;

  if (pev.v_angle[0] < g_diveHighMax /* GOT-0x6c320 */) {
    if (this.CanDiveHigh()) {
      pev.flags |= 0x40;             // FL_DIVE_HIGH
      diveCommitted = true;
    }
  }

  if (!diveCommitted && pev.v_angle[0] < g_diveMediumMax /* GOT-0x6f06c */) {
    if (this.CanDiveMedium()) {
      pev.flags |= 0x100;            // FL_DIVE_MEDIUM
      diveCommitted = true;
    }
  }

  pev.flags |= 0x80;                 // FL_DIVE_LOW (always before CanDiveLow)
  if (!diveCommitted) {
    if (this.CanDiveLow()) {
      pev.diveBonus = 0.25;
      diveCommitted = true;
    } else {
      pev.diveBonus = 0.9;
      pev.diveCharge = 1.0;
    }
  }

  if (diveCommitted) {
    pev.diveCharge = 0.75;
  }

  // ── flag cleanup (unconditional) ───────────────────────────────────
  pev.flags &= ~0x100000;
  pev.flags &= ~0x8000;
  pev.flags &= ~0x20000;
  pev.flags &= ~0x10000;
  pev.flags |= 0x4;
  pev.flags |= 0x10;

  // ── apply the canned dive velocity (memcpy 3 dwords from
  //    g_vecDiveVelocity into pev+0x174) ───────────────────────────────
  pev.diveVelocity = g_vecDiveVelocity;

  // ── animation + next-dive bookkeeping ──────────────────────────────
  this.m_anim.Animate(pPlayer, 40);
  this.m_flDiveTime = this.NextDive();

  // ── network: dive started (per-player) ─────────────────────────────
  const eng = g_engfuncs;
  eng.MessageBegin(MSG_ONE, gmsgDiveStart, null, pev.pContainingEnt);
  // asm truncates via FPU control word (chop mode) → full int pushed.
  // JS `| 0` is the equivalent truncation.
  eng.WriteByte(((this.m_flDiveTime * g_diveTimeScale) | 0));
  eng.MessageEnd();

  // ── FX threshold math ──────────────────────────────────────────────
  // First engine call (GOT+0x168) — args (0, 10) per asm.
  const fxPrecache = eng.somePrecacheLookup(0, 10);
  const playerSpeed = pPlayer.getEffectiveSpeed();
  const fxTrig =
    playerSpeed * g_diveSpeedScale /* GOT-0x6f06c */ +
    (fxPrecache as unknown as number);
  if (fxTrig >= g_diveFxThreshold /* GOT-0x6e814 */) {
    eng.MessageBegin(MSG_ALL, gmsgDiveFx, pev.origin, 0);
    eng.WriteShort(pev.pContainingEnt);
    // asm reuses eax (return of WriteShort) here. Either TS WriteShort
    // returns int (and we should pass it through), or the engine func
    // at GOT+0x11c is not HLSDK's.  For now: thread it through.
    eng.WriteByte(/*writeShortReturn*/ 0); // TODO: replace with return of WriteShort
    eng.WriteByte(2);
    eng.MessageEnd();
  }

  // ── finalize dive velocity ─────────────────────────────────────────
  // pev+0x252 bit 0x80 selects the velocity source.
  if (pev.fuser2 & 0x80) {
    UTIL_MakeVectors(pev.v_angle);
    this.velocity = gpGlobals.v_forward;
  } else {
    // Re-normalize existing velocity to magnitude = g_diveSpeed.  If
    // the existing velocity is already at or above the threshold, just
    // dive straight down at full speed (asm clamps high velocity).
    const vx = pev.velocity.x, vy = pev.velocity.y, vz = pev.velocity.z;
    const len = Math.hypot(vx, vy, vz);
    const diveSpeed = g_diveSpeed;
    if (len >= g_diveSpeedThreshold /* GOT-0x6f408, max-vel clamp */) {
      this.velocity = { x: 0, y: 0, z: diveSpeed };
    } else {
      const inv = diveSpeed / len;
      this.velocity = { x: vx * inv, y: vy * inv, z: vz * inv };
    }
  }

  // ── play the dive SFX ──────────────────────────────────────────────
  // Second engine call (GOT+0x168) — args (0, 31) per asm.  Return +
  // 0x5f is the pitch.
  const soundPrecache = eng.somePrecacheLookup(0, 31);
  EMIT_SOUND_DYN(
    pev.pContainingEnt,
    4 /* CHAN_BODY */,
    g_szDiveSound /* GOT-0x6c354 */,
    1.0 /* vol */,
    0.8 /* attn */,
    0  /* flags */,
    (soundPrecache as unknown as number) + 0x5f /* pitch */,
  );
}

// ===== ambient declarations (compile-in-isolation) =================
declare const CTSStunt: any;
declare const g_diveHighMax: any;       // GOT-0x6c320
declare const g_diveMediumMax: any;     // GOT-0x6f06c
declare const g_diveTimeScale: any;     // GOT-0x6f06c (shared with mediumMax)
declare const g_diveSpeedScale: any;    // GOT-0x6f06c (shared)
declare const g_diveFxThreshold: any;   // GOT-0x6e814
declare const g_diveSpeed: any;         // GOT-0x6f3fc
declare const g_diveSpeedThreshold: any;// GOT-0x6f408 (max-velocity clamp, NOT epsilon)
declare const g_vecDiveVelocity: any;   // GOT+0x1888
declare const gmsgDiveStart: any;       // GOT+0x168c deref
declare const gmsgDiveFx: any;          // GOT+0x1d38 deref
declare const g_szDiveSound: any;       // GOT-0x6c354
declare const g_engfuncs: any;          // GOT+0x1aa8
declare const gpGlobals: any;           // GOT+0x1600
declare function UTIL_MakeVectors(v: any): void;
declare function EMIT_SOUND_DYN(
  entity: any, channel: number, sample: string,
  vol: number, attn: number, flags: number, pitch: number,
): void;
declare const MSG_ONE: number;
declare const MSG_ALL: number;
