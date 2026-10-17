/**
 * CTSTimer::Spawn — initializes the timer entity on spawn.
 *
 * Source: ts/dlls/ts_i386.so @ 0x00062db0 (146 B).
 *
 * Disassembly walkthrough:
 *   1. PIC base setup (ebx = 0x165E10)
 *   2. STRING_OFFSET conversion → pev->classname
 *   3. pev->flags |= 0x80 (FL_OBJECT)
 *   4. pev->dword_0x10c = 0
 *   5. pev->dword_0x108 = 5
 *   6. this->byte_0x68 = 0
 *   7. this->dword_0x14 = 0
 *   8. this->dword_0x18 = 0
 *   9. test BYTE PTR [pev+0x1a0], 0x1   ; spawnflags & 1
 *      je  →  call this->ToggleTimer() ; bit CLEAR path
 *      fall-through → this->dword_0xc  = 0, this->dword_0x10 = 0
 *
 * Notes:
 *  - The `je` jumps on ZF=1, i.e. when bit 0 is CLEAR. So:
 *      spawnflags & 1 == 0  →  arm the timer (ToggleTimer)
 *      spawnflags & 1 != 0  →  leave dormant, zero start/end fields
 *  - CTSTimer field names below are placeholders. The disassembly
 *    only fixes offsets; resolve names in D.4 by cross-referencing
 *    the TS source.
 *  - pev offsets 0x108 / 0x10c are also TODO (D.4 entvars_t audit).
 *
 * @param this  The CTSTimer entity instance.
 */
export function Spawn(this: any): void {
  // STRING_OFFSET("ts_timer") — engine resolves via its string-pool base.
  // Disassembly: lea eax,[ebx-0x6edad] ; sub eax,[edx+0x98]
  //              ; mov [ecx],eax       ; ecx = this->pev
  this.pev.classname = MAKE_STRING("ts_timer");

  // FL_OBJECT = 0x80 — server-only, not transmitted to clients.
  this.pev.flags |= 0x80;

  // Two pev fields; sizes are DWORDs. Names TBD in D.4.
  // TODO(pev-semantics): offsets 0x10c / 0x108 don't cleanly match
  // known entvars_t names in this build's layout. Candidates near
  // these offsets include nextthink / ltime — not confirmed.
  this.pev.dword_0x10c = 0;
  this.pev.dword_0x108 = 5;

  // CTSTimer-specific state. Sizes inferred from BYTE vs DWORD
  // operand prefixes in the disassembly.
  // TODO(D.4): field names unconfirmed — bytes/dwords only.
  this.byte_0x68 = 0;
  this.dword_0x14 = 0;
  this.dword_0x18 = 0;

  // Branch on spawnflags bit 0.
  //   disassembly: `test BYTE PTR [pev+0x1a0],0x1 ; je <ToggleTimer>`
  //   je is "jump if zero flag set", which happens when bit 0 is CLEAR.
  //   spawnflags & 1 == 0 → arm the timer
  //   spawnflags & 1 != 0 → leave dormant, zero the start/end pair
  if ((this.pev.spawnflags & 1) === 0) {
    this.ToggleTimer();
  } else {
    this.dword_0xc = 0;
    this.dword_0x10 = 0;
  }
}
