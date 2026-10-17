/**
 * CTSWorldGun::WaitThink — periodic think tick for a world gun in its
 * wait state. Schedules the next tick and removes the gun once the
 * wait deadline has elapsed.
 *
 * @param this  The CTSWorldGun entity instance (this in the original C++)
 */

// External references (isolated module: declared, not imported).
declare const gpGlobals: any;
declare function RemoveEntityFromSlowedArray(e: any): void;
declare function UTIL_Remove(e: any): void;

export function WaitThink(this: any): void {
  // ASM: fld QWORD [GOT-0x6ecd8]        ; load think interval constant
  // fadd DWORD [eax]              ; add gpGlobals->time
  //      fstp DWORD [ecx+0x104]        ; store at pev+0x104
  // The QWORD constant at GOT-0x6ecd8 is the think interval — HL convention
  // is 0.1s but the exact value isn't visible in the chunk.
  // TODO(asm-ambiguous): pev field at offset 0x104 — semantically nextthink,
  // but stock HL entvars_t has nextthink at 0x100 and `impulse` at 0x104.
  // TS may use a custom layout, or this could be ltime/etc.
  this.pev.nextthink = gpGlobals.curtime + 0.1;

  // ASM: fld m_flWaitTime; fcomp gpGlobals->time; fnstsw+sahf; jae
  // After fcomp+sahf, `jae` jumps when ST(0) >= operand, i.e. when
  // m_flWaitTime >= gpGlobals->time. The fall-through (cleanup) runs
  // when the wait deadline has passed.
  if (this.m_flWaitTime < gpGlobals.curtime) {
    RemoveEntityFromSlowedArray(this);
    UTIL_Remove(this);
  }
}
