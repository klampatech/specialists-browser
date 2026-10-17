```typescript
/**
 * CTSDeadCorpse::WaitThink — periodic think for dead corpse entities.
 *
 * Re-arms the think timer; if the corpse is past its die_time it is
 * removed. Otherwise it updates pev->renderamt to fade the corpse
 * across a configurable window before removal.
 *
 * @param this  The CTSDeadCorpse entity instance
 * @returns     void
 */
export function WaitThink(this: CTSDeadCorpse): void {
  // Compile-time double constants pulled from the GOT base (ebx).
  // TODO(asm-ambiguous): exact numeric values are not visible in this chunk.
  const THINK_DELAY      = 0.0; // [ebx - 0x6f010]
  const FADE_TIME_SCALE  = 0.0; // [ebx - 0x6efb8]
  const MAX_FADE_SECONDS = 0.0; // [ebx - 0x6f018]
  const ALPHA_SCALE      = 0.0; // [ebx - 0x6efb0]

  // 1. Schedule the next think: pev->nextthink = gpGlobals->time + THINK_DELAY.
  //    TODO(asm-ambiguous): pev+0x104 is treated as `nextthink` based on
  //    the assignment pattern (gpGlobals->time + delay). Verify against
  //    the TS entvars_s struct layout.
  this.pev.nextthink = gpGlobals.time + THINK_DELAY;

  // 2. If the corpse is past its die_time, remove it and return.
  //    The disassembly uses fcomp + jae; after sahf, jae means st(0) >= op,
  //    i.e. this.die_time >= gpGlobals->time keeps us alive. The fall-through
  //    path (die_time < time) calls UTIL_Remove.
  if (this.die_time < gpGlobals.time) {
    UTIL_Remove(this);
    return;
  }

  // 3. Compute and apply the fade alpha for this tick.
  //      remaining = die_time - gpGlobals->time
  //      max_fade  = min(MAX_FADE_SECONDS, FADE_TIME_SCALE * fade_duration)
  //      ratio     = remaining / max_fade
  //      alpha     = min(ratio * ALPHA_SCALE, ALPHA_SCALE)
  //    The min(...) bounds the effective fade window: very short per-entity
  //    fade_durations stay short, very long ones are capped at MAX_FADE_SECONDS.
  //    The final min(..., ALPHA_SCALE) clamps the alpha at the ceiling so
  //    the corpse never appears above its configured maximum.
  //    TODO(asm-ambiguous): pev+0x14c is treated as `renderamt` based on
  //    it receiving a clamped fade alpha in [0, ALPHA_SCALE].
  const remaining = this.die_time - gpGlobals.time;
  const maxFade   = Math.min(MAX_FADE_SECONDS, FADE_TIME_SCALE * this.fade_duration);
  const ratio     = remaining / maxFade;
  const alpha     = Math.min(ratio * ALPHA_SCALE, ALPHA_SCALE);

  this.pev.renderamt = alpha;
}
```
