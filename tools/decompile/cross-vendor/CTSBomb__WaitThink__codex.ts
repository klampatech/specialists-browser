```typescript
/**
 * CTSBomb::WaitThink — periodic think for the bomb entity.
 *
 * Each call:
 *   1. Reschedules the next think (different interval when armed vs. unarmed).
 *   2. Bails out if the bomb isn't active.
 *   3. Decrements the detonation countdown.
 *   4. If the countdown has reached the threshold, fires the explosion
 *      via TSExplosion.
 *   5. Otherwise, if the next-beep time has been reached, reschedules
 *      the next beep and emits a randomized beep via EMIT_SOUND_DYN.
 *
 * @param this  The CTSBomb entity instance (this in the original C++)
 * @returns     void
 */
export function WaitThink(this: any /* TODO: CTSBomb */): void {
  const pev = this.pev; // this+0x00 = entvars_s*

  // ── 1. Reschedule next think ─────────────────────────────────
  // pev.field0x104 = pev.field0x100 + dt, where dt depends on m_bArmed
  // (offset 0x7f, byte). Cvars at [ebx-0x6cc98] (armed) and [ebx-0x6f018]
  // (unarmed), both QWORD doubles.
  // TODO(asm-ambiguous): exact names for pev fields at 0x100/0x104 unknown.
  const armedTickDt = armedTickIntervalCvar;     // [ebx-0x6cc98]
  const defaultTickDt = defaultTickIntervalCvar; // [ebx-0x6f018]
  const tickDt = (this.m_bArmed !== 0) ? armedTickDt : defaultTickDt;
  pev.field0x104 = pev.field0x100 + tickDt;

  // ── 2. Bail if not active (offset 0x64, byte) ─────────────────
  if (this.m_bActive === 0) return;

  // ── 3. Tick detonation countdown (offset 0x6c, float) ────────
  // (asm uses fsubr; equivalent to m_flDetonateTime -= defaultTickDt)
  this.m_flDetonateTime -= defaultTickDt;

  // ── 4. Detonate if countdown reached threshold ────────────────
  // x87 fcomp: ST(0)=threshold (cvar at [ebx-0x6f408]),
  // operand=m_flDetonateTime. jne jumps to non-explosion when
  // threshold < m_flDetonateTime; fall-through (explosion) when
  // threshold >= m_flDetonateTime.
  // TODO(asm-ambiguous): threshold cvar's purpose is unclear
  // (likely a small grace value near zero).
  if (this.m_flDetonateTime <= detThresholdCvar /* [ebx-0x6f408] */) {
    // ── Explosion ───────────────────────────────────────────────
    // RoundTimeLeft result is consumed but appears unused here.
    // TODO(asm-ambiguous): post-call cleanup is add esp,0x6, which
    // doesn't fully match the sub 0xc + push pattern. Likely the
    // compiler reuses the leftover RoundTimeLeft arg space for the
    // next call's args (subsequent pushw + push writes into the
    // freed area).
    RoundTimeLeft(g_pGameRules /* [ebx+0x14f0] */);
    // Virtual call through [this+0x60] vtable entry 0x114/4 with (this, ushort 1).
    // TODO(asm-ambiguous): exact vmethod semantics unknown; likely a
    // setter (perhaps to clear pev->owner before exploding).
    this.vmethod114(1);
    // Virtual call at entry 0xf8/4 returning a Vector (written via &vec).
    // Most likely GetAbsOrigin/Center, used as the explosion center.
    const origin = this.getAbsOrigin();
    // TSExplosion(origin, pevAttacker=pev, pevInflictor=pev,
    //             damage=300, bits=0x1040, dmgA=2048, dmgB=4096)
    TSExplosion(origin, pev, pev, 300.0, 0x1040, 2048.0, 4096.0);
    return;
  }

  // ── 5. Beep logic ─────────────────────────────────────────────
  // x87 fcomp: ST(0)=m_flNextBeep (offset 0x70, float),
  // operand=gpGlobals->time (gpGlobals at [ebx+0x1600], first field).
  // sahf+jae jumps to return when ST(0) >= operand; fall-through
  // (beep) when m_flNextBeep < gpGlobals.time.
  if (this.m_flNextBeep < gpGlobals.time) {
    // Reschedule next beep: m_flNextBeep = gpGlobals.time + dt.
    const beepDt = (this.m_bArmed !== 0) ? armedTickDt : defaultTickDt;
    this.m_flNextBeep = gpGlobals.time + beepDt;

    // Emit randomized beep via EMIT_SOUND_DYN.
    //   edict* = pev->owner (pev+0x208)
    //   channel = 6 (likely CHAN_VOICE)
    //   sample  = string at [ebx-0x6ce04]
    //   volume  = 1.0
    //   attenuation = 1.25
    //   flags   = 0
    //   pitch   = 98 + RANDOM_LONG(0, 3)
    // [ebx+0x1aa8] is a pointer to a function table; RANDOM_LONG is
    // at +0x168 and RANDOM_FLOAT at +0x16c.
    // TODO(asm-ambiguous): the float args (0.92, 1.0, 1.25, 0.5)
    // intermix via stack alignment (sub esp,0x4 / sub esp,0x8 between
    // calls); a RANDOM_FLOAT(0.92, 1.0) is computed but its target
    // parameter (volume vs attenuation variation) is undeterminable
    // from this chunk.
    const pitch = 98 + RANDOM_LONG(0, 3);
    EMIT_SOUND_DYN(
      pev.owner,    // pev+0x208
      6,            // CHAN_VOICE
      beepSound,    // string at [ebx-0x6ce04]
      1.0,          // volume
      1.25,         // attenuation
      0,            // flags
      pitch         // 98 + RANDOM_LONG(0, 3)
    );
  }
}
```
