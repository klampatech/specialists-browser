```typescript
/**
 * CTSGameRules::CallCheckDeads — gated field-update helper.
 *
 * Compares a GOT-relative global float against `this.field_0xc`. If they
 * are equal, resolves a two-step pointer chain through another GOT-relative
 * pointer, sums a GOT-relative double with the float at the end of the
 * chain, and writes the result (truncated to float) into
 * `this.field_0x5880`. Otherwise the call is a no-op.
 *
 * @param this  The CTSGameRules entity instance
 * @returns     void
 */

// TODO: replace these stubs once the CTSGameRules class layout (D.4)
//       and the GOT-relative globals are mapped.
interface CTSGameRules {
  field_0xc: number;    // TODO(asm-ambiguous): purpose unverified.
  field_0x5880: number; // TODO(asm-ambiguous): 0x5880 is unusually large
                        //   for a CTSGameRules field; could be an array
                        //   slot or a sub-struct.
}

const globals: any = (globalThis as any).__TS_GLOBALS__;

export function CallCheckDeads(this: CTSGameRules): void {
  // PIC/GOT base is in ebx; all globals below are [ebx ± k].
  // TODO(asm-ambiguous): resolve these offsets against strings-n5.txt
  //                      (cvar candidates include `slowamt`, `ts_slowmotion`).
  const threshold: number = globals.float_ebx_minus_0x6f408;

  // fcomp + test ah,0x40; je — fall through on equality (or unordered/NaN).
  // TODO(asm-ambiguous): `!==` treats NaN as not equal; original `fcomp`
  //                      falls through on NaN. Acceptable approximation.
  if (threshold !== this.field_0xc) {
    return;
  }

  // Two-step pointer chain through GOT globals.
  const ptrA: any = globals.ptr_ebx_plus_0x1600;
  const ptrB: any = ptrA.value; // *ptrA — a float* (type/purpose unknown).

  // globals.double (QWORD load, ebx-0x6f018) + *ptrB → this.field_0x5880.
  this.field_0x5880 = globals.double_ebx_minus_0x6f018 + ptrB.value;
}
```
