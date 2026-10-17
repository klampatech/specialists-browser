/**
 * CTSGameRules::CallCheckDeads — gated field-update helper.
 *
 * Compares a GOT-relative global float against `this.field_0xc`. If
 * they are equal, the function returns immediately (the `je` after
 * `test ah, 0x40` jumps over the body to the epilogue at 0x69bfa).
 * Otherwise it resolves a two-step pointer chain through another
 * GOT-relative pointer, sums a GOT-relative double with the float at
 * the end of the chain, and writes the truncated result into
 * `this.field_0x5880`.
 *
 * @param this  The CTSGameRules entity instance
 * @returns     void
 */

interface CTSGameRules {
  field_0xc: number;    // TODO(D.4): map — likely slow-motion state.
  field_0x5880: number; // TODO(D.4): 0x5880 is unusually large; likely an
                        //   array slot or sub-struct, not a single field.
}

const globals: any = (globalThis as any).__TS_GLOBALS__;

export function CallCheckDeads(this: CTSGameRules): void {
  // PIC/GOT base is in ebx; all globals below are [ebx ± k].
  // TODO(D.4): resolve offsets against strings-n5.txt
  //   (cvar candidates include `slowamt`, `ts_slowmotion`).
  const threshold: number = globals.float_ebx_minus_0x6f408;

  // `fcomp` + `test ah, 0x40` + `je 69bfa`: on equality (C3=1), jump to
  // the epilogue — i.e., skip the body. The body runs when the operands
  // are NOT equal.
  //
  // NaN note: `fcomp` classifies NaN as unordered → C3=0 → `je` not
  // taken → body runs. In TS, `NaN === NaN` is false, so the corrected
  // `===` check below also lets the body run on NaN — matches fcomp.
  if (threshold === this.field_0xc) {
    return;
  }

  // Two-step pointer chain through GOT globals.
  //   ptrA  = globals.ptr_ebx_plus_0x1600   (pointer to pointer)
  //   ptrB  = *ptrA                          (pointer to float)
  //   value = *ptrB                          (float)
  const ptrA: any = globals.ptr_ebx_plus_0x1600;
  const ptrB: any = ptrA.value;
  const value: number = ptrB.value;

  // fld  QWORD [ebx-0x6f018]  →80-bit FPU
  // fadd DWORD [eax]          →  + value
  // fstp DWORD [edx+0x5880]   →  truncate to single-precision float
  // TS side stores as a JS number (double); the engine side re-truncates
  // when reading the float field.
  this.field_0x5880 = globals.double_ebx_minus_0x6f018 + value;
}
