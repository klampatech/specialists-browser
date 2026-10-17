// Ambient stubs so this file compiles in isolation.
// In the project, these come from the engine interface shim
// (tools/decompile/references/hlsdk-goldsrc-interface.md § D.5)
// and the cheats CTSAmmoPack struct dump.

interface entvars_t {
  nextthink: number;
  // ...other entvars fields elided for D.3
}

interface CTSAmmoPack {
  /** pev — first field of the CBaseEntity base (offset 0). */
  pev: entvars_t;
  /** m_flWait — class member at offset 0xa4; type confirmed
   *  by float load in WaitThink disassembly (TODO confirm name). */
  m_flWait: number;
}

declare const gpGlobals: { time: number };
declare function UTIL_Remove(ent: CTSAmmoPack): void;

/**
 * CTSAmmoPack::WaitThink — periodic ticker that re-arms this think
 * ~0.1s out and self-removes the entity once its wait deadline passes.
 *
 * @param this  The CTSAmmoPack entity instance (esi in the original C++)
 * @returns     void
 *
 * Disassembly reference: tools/decompile/chunks/WaitThink__11CTSAmmoPack.chunk.md
 *  (915c0..9160d, 78 B)
 */
export function WaitThink(this: CTSAmmoPack): void {
  const pev = this.pev;

  // Disassembly:
  //   fld    QWORD PTR [ebx-0x6ecd8]   ; load 8-byte double constant (~0.1d)
  //   fadd   DWORD PTR [eax]           ; add float at *gpGlobals == gpGlobals->time
  //   fstp   DWORD PTR [ecx+0x104]     ; store to pev->nextthink (offset 0x104)
  // Original C++ intent:  pev->nextthink = gpGlobals->time + 0.1;
  // TODO(asm-ambiguous): confirm that [pev + 0x104] is in fact `nextthink`
  //   (vs. an adjacent time/think float) against the entvars_t dump.
  // TODO(asm-ambiguous): confirm the double constant at
  //   [ebx-0x6ecd8] == 0.1 (vs. some other wait-reschedule interval).
  pev.nextthink = gpGlobals.time + 0.1;

  // Disassembly:
  //   mov    edx,DWORD PTR [edx]       ; reload *gpGlobals_ptr -> time
  //   fld    DWORD PTR [esi+0xa4]      ; push this->m_flWait
  //   fcomp  DWORD PTR [edx]           ; compare with gpGlobals->time
  //   fnstsw ax; sahf                  ; FPU flags -> EFLAGS
  //   jae    91608                     ; jump if m_flWait >= time (skip Remove)
  //   … push esi; call UTIL_Remove
  // Original C++ intent:
  //   if (m_flWait < gpGlobals->time) UTIL_Remove(this);
  // FPU caveat: `fcomp` sets C0=1 iff ST(0) < operand; after `sahf`,
  // `jae` (CF=0) means ST(0) >= operand, so fall-through to Remove iff
  // `m_flWait < time`.
  // TODO(asm-ambiguous): confirm [this + 0xa4] is `m_flWait`
  //   (vs. some other wait/respawn float on CTSAmmoPack).
  if (this.m_flWait < gpGlobals.time) {
    UTIL_Remove(this);
  }
}
