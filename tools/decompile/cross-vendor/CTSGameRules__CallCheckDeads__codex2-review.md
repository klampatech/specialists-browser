```
VERDICT: FAIL

Checklist:
1. Signature — ⚠️ N/A (not an interface function) — Adapted: the disassembly
   has no args (other than `this`) and no return value, and the TS captures
   that with `CallCheckDeads(this: CTSGameRules): void`. ✓ on the adapted check.

2. Version check — N/A — `CallCheckDeads` is a class method, not one of the
   4 engine↔mod entry points; no version check applies.

3. interfaceVersion assignment — N/A — same reason as #2.

4. Success path (struct copy) — N/A — function does not copy a struct.

5. No fabricated paths — ❌ — The conditional direction is inverted. The
   assembly `je 69bfa` after `fcomp` jumps to the return when the two
   operands are equal, so the body runs when they are NOT equal. The TS
   does the opposite — it early-returns when they are not equal and runs
   the body when they are equal. The author's own in-source comment
   ("fall through on equality") contradicts the code right below it.

6. No TODO body — ✅ — The body has real arithmetic (`fld`/`fadd`/`fstp`
   becomes `double + float → field`), with TODOs only annotating the
   still-unresolved GOT offsets. Acceptable for D.3.

7. Field names — ⚠️ — `field_0xc` and `field_0x5880` are placeholders,
   with TODOs noting that the class layout is a D.4 task and that
   `0x5880` is suspiciously large (likely an array slot or sub-struct).
   Acceptable for D.3, but worth flagging in `HANDOFF.md` so the D.4 pass
   resolves them.

8. Compiles in isolation — ✅ — `interface CTSGameRules` is declared
   locally, `globals` is `any`, no external type refs. It compiles. The
   inverted conditional is a logic bug, not a type-system bug.

Issues to fix:
- **Critical: invert the early-return condition.** `je 69bfa` jumps to
  the return on equality, so the early-return in TS must be on `===`,
  not `!==`. As written, the body executes in exactly the case the
  assembly skips, and is skipped in exactly the case the assembly
  runs the body. This is a semantic flip, not a stylistic quibble.
- **Minor: align the comment with the code.** The header comment
  ("fall through on equality") is the right behavior description, but
  it sits above code that does the opposite. Fix one or the other.
- **Minor (acceptable):** NaN handling differs between `fcomp` (which
  treats NaN as unordered → C3=0 → body runs) and JS `!==` (NaN is
  not equal to itself → body skipped). The TS comment acknowledges
  this and calls it an "acceptable approximation"; agreed for D.3,
  but the comment must match the corrected condition.

Suggested rewrite (full TS function):

```typescript
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
```

Note on the prompt template: items 1–4 are written for the four
engine↔mod entry points (`GiveFnptrsToDll` / `GetEntityAPI` /
`GetEntityAPI2` / `GetNewDLLFunctions`); `CallCheckDeads` is none of
those, so those items are N/A. The rest of the checklist still
applies and that's where the FAIL comes from — #5, with the conditional
inversion. Recommend filing this in the D.3 decompile log so the
class-layout pass in D.4 also re-verifies `field_0xc` / `field_0x5880`
in the same review.
