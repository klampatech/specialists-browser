/**
 * CTSDeadCorpse::WaitThink — periodic think for dead corpses.
 *
 * Disassembly: 0x00060460, 154 B, ts/dlls/ts_i386.so.
 * Demangled:  `WaitThink__13CTSDeadCorpse`
 *
 * Behavior (mirrors the disassembly):
 *   1. Re-arm the think timer at gpGlobals->time + THINK_DELAY.
 *   2. If die_time < gpGlobals->time → UTIL_Remove(this) and return.
 *   3. Otherwise compute fade alpha and write to pev->renderamt:
 *        remaining = die_time - gpGlobals->time
 *        maxFade   = min(MAX_FADE_SECONDS, FADE_TIME_SCALE * fade_duration)
 *        ratio     = remaining / maxFade
 *        alpha     = min(ratio * ALPHA_SCALE, ALPHA_SCALE)
 *        pev->renderamt = alpha
 *
 * Field offsets (see tools/decompile/chunks/<demangled>.chunk.md):
 *   [esi+0x64] -> this->die_time        (float, TODO: confirm C name)
 *   [esi+0x68] -> this->fade_duration   (float, TODO: confirm C name)
 *   pev+0x104  -> this->pev.nextthink   (float, TODO: confirm entvars_s layout)
 *   pev+0x14c  -> this->pev.renderamt   (byte,  TODO: confirm entvars_s layout)
 */

// Ambient stubs so this file compiles in isolation.
declare const gpGlobals: { time: number };
declare function UTIL_Remove(e: any): void;

interface CTSDeadCorpse {
  // TODO(D.4): pull the full class shape from the cross-reference pass.
  pev: { nextthink: number; renderamt: number };
  die_time: number;       // TODO(D.4): confirm C name (offset 0x64).
  fade_duration: number;  // TODO(D.4): confirm C name (offset 0x68).
}

// Compile-time doubles pulled from the GOT base (ebx).
// TODO(D.<num>): exact numeric values not visible in this chunk.
//   [ebx - 0x6f010]  -> THINK_DELAY
//   [ebx - 0x6efb8]  -> FADE_TIME_SCALE
//   [ebx - 0x6f018]  -> MAX_FADE_SECONDS
//   [ebx - 0x6efb0]  -> ALPHA_SCALE
const THINK_DELAY      = 0.0;
const FADE_TIME_SCALE  = 0.0;
const MAX_FADE_SECONDS = 0.0;
const ALPHA_SCALE      = 0.0;

export function WaitThink(this: CTSDeadCorpse): void {
  // 1. Re-arm the think timer.
  this.pev.nextthink = gpGlobals.time + THINK_DELAY;

  // 2. Past die_time → remove and bail.
  //    Disassembly: fcomp + jae (taken when die_time >= gpGlobals->time).
  if (this.die_time < gpGlobals.time) {
    UTIL_Remove(this);
    return;
  }

  // 3. Compute fade alpha and apply.
  //    Matches the fmul/fcom/fdivp/fstp sequence in the disassembly.
  const remaining = this.die_time - gpGlobals.time;
  const maxFade   = Math.min(MAX_FADE_SECONDS, FADE_TIME_SCALE * this.fade_duration);
  const ratio     = remaining / maxFade;
  const alpha     = Math.min(ratio * ALPHA_SCALE, ALPHA_SCALE);

  this.pev.renderamt = alpha;
}
