// Stub declarations so this compiles in isolation. In the real port,
// these come from the engine bindings and CTSPowerUp class.
declare const NEXT_THINK_INTERVAL: number;  // double @ GOT-0x6f018
declare const FADE_RATE: number;            // double @ GOT-0x6c6b8
declare const getGpGlobals: () => { time: number };
declare const StudioFrameAdvance: (e: any, dt: number) => number;
declare const UTIL_Remove: (e: any) => void;

interface IPev {
  nextthink: number;
  renderamt: number;
}
interface ICTSPowerUp {
  pev: IPev;
  // TODO(asm-ambiguous): exact purpose unclear — could be m_bPickedUp,
  // m_bRespawnLocked, or m_fFadeOut. Byte at offset 0x80.
  m_bPickedUp: number;
  // Deadline compared against gpGlobals.time. Float at offset 0x88.
  m_flWaitTime: number;
}

/**
 * CTSPowerUp::WaitThink — drives the idle "wait" loop for a powerup
 * entity: advance the studio animation, schedule the next think tick,
 * and either remove the entity or compute its fade-out alpha based on
 * how much of the configured wait window remains.
 */
export function WaitThink(this: ICTSPowerUp): void {
  // 1. StudioFrameAdvance(this, 0.0); discard float return.
  StudioFrameAdvance(this, 0.0);

  // 2. pev->nextthink = gpGlobals->time + NEXT_THINK_INTERVAL.
  //    Disasm: fld [GOT-0x6f018]; fadd [gpGlobals->time];
  //            fstp [pev+0x104]  (entvars_t::nextthink).
  const gpGlobals = getGpGlobals();
  this.pev.nextthink = gpGlobals.time + NEXT_THINK_INTERVAL;

  // 3. Skip fade / removal if the byte guard at offset 0x80 is set.
  //    Disasm: cmp BYTE [esi+0x80], 0; jne epilogue.
  if (this.m_bPickedUp !== 0) {
    return;
  }

  // 4. Deadline elapsed → UTIL_Remove(this).
  //    Disasm: fld [esi+0x88] (m_flWaitTime); fcomp [gpGlobals->time];
  //            jae skip; call UTIL_Remove; jmp epilogue.
  if (this.m_flWaitTime < gpGlobals.time) {
    UTIL_Remove(this);
    return;
  }

  // 5. Still inside the wait window → fade-out alpha.
  //    pev->renderamt = min(255, 255 * FADE_RATE * remaining).
  //    Disasm FPU block: FLD remaining; FLD FADE_RATE; FMULP; FLD 255;
  //                      FMUL ST(1),ST(0); FXCH; FCOM ST(1);
  //                      conditional FSTP ST(1) vs FSTP ST(0) implements
  //                      the min() clamp at 255;
  //                      fstp [pev+0x14c]  (entvars_t::renderamt).
  const remaining = this.m_flWaitTime - gpGlobals.time;
  this.pev.renderamt = Math.min(255, 255 * FADE_RATE * remaining);
}
