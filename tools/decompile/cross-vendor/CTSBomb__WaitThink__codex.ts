```typescript
/**
 * CTSBomb::WaitThink — Periodic think for an armed bomb. Drives the
 * fuse countdown, plays the tick sound when due, and triggers the
 * explosion when the fuse runs out.
 *
 * Steps:
 *   1. Reschedule the next think with slow-amount scaling.
 *   2. If the bomb hasn't been triggered yet, bail.
 *   3. Decrement the fuse time.
 *   4. If the fuse is still above the explosion threshold, tick the
 *      bomb (bump the detonate-time accumulator and play the tick
 *      sound, unless we've already passed the planned tick time).
 *   5. Otherwise explode — notify the goal, fetch its location, and
 *      call TSExplosion at that location.
 *
 * @returns void
 */
export function WaitThink(this: CTSBomb): void {
  // (1) Schedule the next think. The slow amount depends on m_fActive.
  const slowDelta =
    (this.m_fActive !== 0) ? SLOW_AMT_ACTIVE : SLOW_AMT_INACTIVE;
  // TODO(asm-ambiguous): pev offsets 0x100 / 0x104 are not confirmed
  // against the HL1 entvars layout in this build. Semantic is
  // "schedule next think"; commonly written as
  // `pev.nextthink = pev.ltime + delta`.
  this.pev.nextthink = this.pev.ltime + slowDelta;

  // (2) Only proceed if the bomb has been triggered (fuse running).
  if (this.m_bTriggered === 0) return;

  // (3) Count down the fuse.
  this.m_flFuseTime -= slowDelta;

  // (4) Branch on fuse vs threshold. jne 0x7c8bc jumps to the tick
  // branch when FUSE_THRESHOLD < m_flFuseTime (still counting down).
  if (this.m_flFuseTime > FUSE_THRESHOLD) {
    // Still counting down — tick the bomb.
    // jae 0x7c924 skips sound playback when m_flDetonateTime >=
    // gameRulesTime (planned tick is in the future).
    if (this.m_flDetonateTime >= GAME_RULES_TIME) {
      return; // not yet time to tick (jump to epilogue)
    }
    // Schedule the next tick sound.
    this.m_flDetonateTime = GAME_RULES_TIME + slowDelta;
    // Emit the tick sound. The engine helpers compute the channel
    // and attenuation, then EMIT_SOUND_DYN takes the result plus
    // the sound name and final parameters.
    // TODO(asm-ambiguous): pev+0x208 used as the edict; offset/name
    // not confirmed (might be pev.pContainingEntity in this build).
    // TODO(asm-ambiguous): engine helpers at offsets 0x168 and 0x16c
    // and the 8-arg EMIT_SOUND_DYN signature are not fully confirmed.
    const channelBase = engineGetSoundChannel(
      this.pev.edictRef, /*flags*/ 0, /*?*/ 3, /*vol*/ 0.5,
    );
    const channel = channelBase + 0x62;
    const attn = engineComputeSoundAttenuation(
      this.pev.edictRef, channel, /*?*/ 0, /*?*/ 1.25, /*?*/ 1.0, /*?*/ 0.92,
    );
    emitSoundDyn(
      /* edict */   this.pev.edictRef,
      /* channel */ 6,
      /* sample */  BOMB_TICK_SOUND,
      /* attn */    attn,
      /* pitch */   1.25,
      /* ? */       0,
      /* flags */   channel,
      /* ? */       0.5,
    );
    return;
  }

  // (5) Explode.
  // 5a. Round out the round timer.
  // TODO(asm-ambiguous): [ebx+0x14f0] arg is unclear (likely a
  // game-rules singleton pointer).
  const timeLeft = CTSGameRules.RoundTimeLeft(/*gameRulesSingleton*/ undefined as any);

  // 5b. Tell the goal the bomb was used with USE_TYPE 1 (USE_ON).
  // TODO(asm-ambiguous): vfunc offset 0x114 — exact name unclear.
  this.m_pGoal.useTypeNotify(this, USE_TYPE_1);

  // 5c. Read the goal's origin into a Vector.
  // TODO(asm-ambiguous): vfunc offset 0xf8 — exact name unclear
  // (likely GetAbsOrigin / Center).
  const goalVec: Vector = this.m_pGoal.getOrigin(this);

  // 5d. Trigger the explosion at the goal's location.
  TSExplosion(
    /* origin */   goalVec,
    /* entvars */  this.pev,
    /* entvars2 */ this.pev,
    /* damage */   300.0,
    /* flags */    0x1040,
    /* radius1 */  2048.0,
    /* radius2 */  4096.0,
  );
}
```
