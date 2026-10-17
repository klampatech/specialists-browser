/**
 * CTSStunt::NextDive — returns a global float.
 *
 * Disassembly (ts_i386.so @ 0x0008a59c, 21 bytes):
 *   push ebx
 *   call   $+5                    ; PIC trick: push EIP onto stack
 *   pop    ebx                    ; ebx = 0x8a5a2
 *   add    ebx, 0xdb86e           ; ebx = GOT base (0x161810)
 *   fld    DWORD PTR [ebx-0x6f408]; load 32-bit float from GOT-relative addr
 *   pop    ebx
 *   ret                          ; float return via st(0) per x87 cdecl
 *
 * No `this` (ECX) field is accessed — the function behaves identically * regardless of the CTSStunt instance that invokes it. Modeled as a free
 * function (no `this:` receiver) to reflect that.
 *
 * Class context (for D.4 wiring): sibling methods in `CTSStunt` include
 * `Init`, `Play`, `CanDiveHigh/Medium/Low`, `GoDive`, `HandleDive`, etc.
 * This function sits next to `CanDiveLow` (0x8a544) and `GoBulletTime`
 * (0x8a5b4) in the class vtable, so it almost certainly participates in
 * the dive decision pipeline.
 *
 * @returns The configured next-dive value (a float).
 */

// TODO(asm-ambiguous): the exact name of the GOT-relative global at offset
// 0x6f408 is not visible in this chunk. Consult// tools/decompile/analysis/strings-n5.txt to match the offset against the
// cvar/strings registry. Likely candidates: `ts_nextdive`, `ts_dive_next`,
// or a related dive-config cvar. The disassembly shows no `CVAR_GET_FLOAT`
// call, so this is more accurately "a cached/global float" than "a live
// cvar lookup" — treat the label "cvar" as provisional until confirmed.
export function NextDive(): number {
  // PIC base setup in the original asm collapses to a single global read in TS.
  return nextDiveGlobal;
}

// Placeholder for the unknown GOT-relative float at offset 0x6f408.
// Typed as `any` per the D.3 review checklist ("use any for unknowns"); the
// runtime value is a 32-bit float, but its semantic name is unconfirmed.
declare const nextDiveGlobal: any;
