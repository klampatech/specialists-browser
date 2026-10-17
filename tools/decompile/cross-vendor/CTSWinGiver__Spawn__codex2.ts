/**
 * CTSWinGiver::Spawn — initialise the WinGiver entity on level load.
 *
 * Sets pev->classname (computed against the engine string pool base),
 * resets the four standard entity-state fields (effects / solid /
 * flags / movetype), zeroes four WinGiver-side dwords, schedules
 * the first `nextthink = duration + gpGlobals->time`, and finally
 * dispatches a virtual call into a sub-object at this+0x60 with
 * `this` as the (caller-style) first arg and 12 bytes of
 * uninitialised stack following it.
 *
 * @param this  the CTSWinGiver entity instance
 */
export function Spawn(this: any): void {
  // ---- PIC / GOT base -------------------------------------------------
  // asm: call $+5; pop ebx; add ebx, N → ebx = GOT base.
  // [ebx+0x1600] = &gpGlobals — verified: the deref chain lands on
  // globalvars_t.pStringBase (@ 0x98 in globalvars_t), which only
  // makes sense if edi was the address-of-the-gpGlobals-variable,
  // not gpGlobals itself.
  //
  // The numeric constants below are PIC-runtime values; for a real
  // PIC ABI they'd come from a helper, but for a D.4 standalone
  // decompilation we annotate them inline. Placeholders kept as 0.
  const GOT_BASE      = 0;        // [ebx], PIC base (asm: 0x7bf1b + 0xe9ef5)
  const gpGlobalsAddr = 0;        // [ebx + 0x1600]; = &gpGlobals
  const timeDelta     = (GOT_BASE - 0x6ecd0); // 8-byte double constant loaded via fld QWORD

  // ---- pev visual/collision defaults ---------------------------------
  // All offsets verified against HLSDK engine/progdefs.h entvars_t:
  //   0x118 = effects   (int)
  //   0x10c = solid     (int)
  //   0x1a4 = flags     (int)
  //   0x108 = movetype  (int)
  // 0x118 = 0x80 sets effects to a visual-effect bit (likely
  // EF_LIGHT = 0x80 in HL1 effect bits; verify against mod SDK).
  // pev.classname at offset 0x00 holds a string_t (4-byte index
  // into engine string pool) — the (pic_addr - pStringBase)
  // subtraction reduces a rodata string address to that index.
  const pev = this.pev;
  pev.classname = (GOT_BASE - 0x6ce49) - intAt(gpGlobalsAddr + 0x98);
  pev.effects   = 0x80;           // 0x118
  pev.solid     = 0;              // 0x10c
  pev.flags     = 0;              // 0x1a4
  pev.movetype  = 0;              // 0x108

  // ---- WinGiver-side state (4 dwords zeroed) -------------------------
  // asm writes this[+0x14], [+0x18], [+0xc], [+0x10] in that order.
  // We re-order for readability; the stores are independent.
  // TODO(asm-ambiguous): identify the four WinGiver fields.
  this.field_0x0c = 0;
  this.field_0x10 = 0;
  this.field_0x14 = 0;
  this.field_0x18 = 0;

  // ---- Schedule first think ------------------------------------------
  // asm: fld QWORD [ebx-0x6ecd0]; fadd DWORD [eax]; fstp DWORD [ecx+0x104]
  //   eax = *gpGlobals = struct.time (the first float in globalvars_t)
  //   ecx = this->pev (reloaded)
  //   [ecx+0x104] = pev->nextthink (verified against entvars_t)
  // The asm is FPU arithmetic; TS uses numeric +, which is
  // value-equivalent for non-NaN floats.
  // TODO(asm-ambiguous): identify the time-delta constant — is it
  // the slowmo-friendly "schedule for next frame" 0.1, or a TS-
  // specific WinGiver polling interval?
  pev.nextthink = (timeDelta) + intAt(gpGlobalsAddr); // = (GOT_BASE-0x6ecd0) + gpGlobals->time

  // ---- Virtual method dispatch ---------------------------------------
  // asm: sub esp, 0xc   ; 12 bytes of UNINITIALISED stack for 3 args
  //      mov eax, [edx+0x60]   ; eax = this->member_0x60
  //      push edx              ; cdecl: this is the first arg
  //      call DWORD PTR [eax+0x3c]  ; callee = vtable slot 15
  // The 3 stack-arg slots are NOT zeroed in the asm; passing
  // explicit 0,0,0 would fabricate their contents. We drop them
  // and rely on the callee reading `undefined` in JS — closer to
  // the asm's uninitialised-stack semantics than explicit zeros.
  // TODO(asm-ambiguous): identity of the sub-object at this+0x60
  // and the function at vtable slot 15; confirm whether the
  // callee actually reads the 3 uninitialised stack slots.
  const subobj: any = this.member_0x60;
  const callee: Function = subobj.vtable[15];
  callee.call(this /* , 3 uninitialised stack slots per asm */);
}
