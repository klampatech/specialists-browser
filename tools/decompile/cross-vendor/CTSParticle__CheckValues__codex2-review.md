```
VERDICT: FAIL

Checklist:
1. Signature — ✅ — `void CheckValues(this)` matches the demangled symbol
   `CheckValues__11CTSParticle` (273 B, thiscall, no explicit args).
   TS `export function CheckValues(this: any): void` is a faithful adaptation.
2. Version check — N/A — not an engine↔mod API function.
3. `*interfaceVersion` assignment-back — N/A — not an API function.
4. Success path / body semantics — ❌ — both comparison idioms are
   mis-translated. See issues below.
5. No fabricated paths — ✅ — control flow matches the disassembly exactly;
   no extra branches or operations, just two wrong operators in two places.
6. No TODO-only body — ✅ — body is fully expressed in code; TODOs only
   annotate the speculative global names.
7. Field names — ⚠️ — offsets as `field0xNN` are fine placeholders. The
   pair `particleUpper` / `particleCap` is speculative, and `particleCap`
   is actively misleading — the assembly enforces `field = max(field, cap)`
   (a FLOOR raising the field up), not `field = min(field, cap)`.
8. Compiles in isolation — ✅ — valid TS; `(this: any)` is allowed; no
   undefined external types.

Issues to fix:

- ❌ **Upper-threshold zero-out (6 sites) — wrong operator.**
  The pattern
  ```
  fld    [ebx-0x6f408]          ; ST(0) = upperThreshold
  fcomp  [edx+0xNN]
  fnstsw ax
  test   ah,0x41                ; ZF=1 iff C0=0 AND C3=0 iff ST(0)==operand
  jne    .skip
  mov    [edx+0xNN],0           ; fall-through is the EQUAL branch
  ```
  is GCC's well-known "test for equality" idiom. After `fcomp`, C0 and C3
  are the FPU's "greater" and "less" bits; testing either-or-set (mask
  `0x41`) tells you "not equal", so `jne` *skips* on inequality and the
  fall-through (`mov [field], 0`) runs *only when ST(0) == operand*.
  So the field is zeroed **when it equals the global sentinel**, not when
  it is below it. Every `if (upperThreshold > this.field0xNN)` must
  become `if (upperThreshold === this.field0xNN)`. This affects `field0x74`,
  `field0x78`, `field0x84`, `field0x88`, `field0x94`, `field0x98`.

  (If GCC had wanted "fall through when ST(0) > operand" it would have
  emitted `sahf; jbe` — the very form used in the next block. The use of
  `test ah, 0x41` is a strong signal for `==` semantics.)

- ❌ **Cap / floor clamp (2 sites) — wrong direction.**
  The pattern
  ```
  fld    [ebx-0x6f3fc]          ; ST(0) = capValue
  fcom   [edx+0xNN]             ; NO pop
  fnstsw ax
  sahf                          ; CF = C0, ZF = C3
  jae    .skip                  ; jae taken iff CF=0 iff ST(0) NOT > operand
  fstp   [edx+0xNN]             ; fall-through is "ST(0) > operand" → store
  jmp    .done
  .skip:
  fstp   st(0)                  ; discard without storing
  ```
  `jae` jumps on `CF=0`, i.e., when `ST(0) <= operand`, so the SKIP is
  the "field is already at or above the cap" path and the FALL-THROUGH
  (which writes the cap into the field) is the "ST(0) > field" branch.
  Net effect: `field = max(field, capValue)` — a **floor** that raises
  low fields up, NOT a cap that pushes high fields down.
  `if (capThreshold < field) field = capThreshold` produces
  `field = min(field, capThreshold)` and is exactly backwards. Replace
  with `if (capThreshold > field) field = capThreshold` at `field0x84`
  and `field0x88`.

- ⚠️ **Naming.** `particleCap` is wrong even after the fix — the disassembly
  does `max`, not `min`. Rename to `particleFloor` or `particleMin`. The
  upper-threshold global is better described as a "sentinel reset" than
  as an "upper threshold" (it's checked for equality, not ordering).
  Both names are still placeholders pending cross-reference to
  `tools/decompile/analysis/strings-n5.txt`.

- ⚠️ **Doc comments.** The "Upper-threshold zero-out" / "Cap clamp"
  section headings encode the wrong semantics and were the proximate
  cause of the bugs above. The rewritten comments should call these
  "sentinel reset (equal check)" and "floor clamp (max)" so the
  direction of the FPU idiom matches the prose.

Suggested rewrite:

```typescript
/**
 * CTSParticle::CheckValues — validate and clamp the particle's tunable
 * numeric fields against two GOT-resident globals and enforce a
 * non-negative floor on its signed-int fields.
 *
 * Faithful decompilation of `ts/dlls/ts_i386.so` symbol
 * `CheckValues__11CTSParticle` at 0x63f98 (273 B, ends 0x640a8).
 *
 * The first six bytes compute ebx = 0x63f9e + 0x101e72, the PIC/GOT base.
 * Two globals are accessed via [ebx - 0x6f408] and [ebx - 0x6f3fc].
 *
 *   [ebx-0x6f408] — sentinelReset (float):
 *       float fields are zeroed iff they equal this sentinel
 *       ("keyvalue was never customised; reset to 0").
 *
 *   [ebx-0x6f3fc] — floorValue (float):
 *       float fields are raised up to this value when below
 *       (i.e. field = max(field, floorValue); FLOOR, not CAP).
 *
 * @param this  The CTSParticle entity instance (`this` in the original C++).
 * @returns     void
 */
export function CheckValues(this: any /* TODO(asm-ambiguous): proper CTSParticle type pending D.4 */): void {
  // GOT-resident globals. Names are speculative — recover via
  // tools/decompile/analysis/strings-n5.txt.
  // TODO(asm-ambiguous): real cvar names unknown.
  const sentinelReset: number = (globalThis as any).__ts_globals.particleSentinel; // [ebx-0x6f408]
  const floorValue:    number = (globalThis as any).__ts_globals.particleFloor;    // [ebx-0x6f3fc]

  // Idiom A: `fcomp [field]; fnstsw ax; test ah, 0x41; jne .skip;
  //          fall-through: mov [field], 0`
  //   test ah, 0x41 sets ZF=1 iff (C0=0 AND C3=0) iff ST(0)==operand.
  //   jne jumps (skips the mov) on NOT-equal; fall-through is EQUAL.
  //   → zero the field when it equals the sentinel.
  if (sentinelReset === this.field0x74) this.field0x74 = 0;
  if (sentinelReset === this.field0x78) this.field0x78 = 0;
  if (sentinelReset === this.field0x84) this.field0x84 = 0;
  if (sentinelReset === this.field0x88) this.field0x88 = 0;

  // Idiom B: `fld floorValue; fcom [field]; fnstsw; sahf;
  //          jae .skip; fstp [field]; jmp .done; .skip: fstp st(0); .done:`
  //   After sahf: CF = C0 = (ST(0) > operand). jae jumps on CF=0,
  //   i.e. when ST(0) NOT > operand — that's the "skip the write" branch.
  //   Fall-through (CF=1, ST(0) > operand) stores floorValue into field.
  //   → field = max(field, floorValue). FLOOR semantics: raise low fields.
  if (floorValue > this.field0x84) this.field0x84 = floorValue;
  if (floorValue > this.field0x88) this.field0x88 = floorValue;

  // More sentinel resets (same Idiom A as above).
  if (sentinelReset === this.field0x94) this.field0x94 = 0;
  if (sentinelReset === this.field0x98) this.field0x98 = 0;

  // Signed-int non-negative floor: `cmp dword [field], 0; jns .skip`
  //   jns jumps (skips the mov) when field >= 0; fall-through zeroes
  //   when field < 0. → if (field < 0) field = 0.
  if (this.field0xa4 < 0) this.field0xa4 = 0;
  if (this.field0xa8 < 0) this.field0xa8 = 0;
}
```

Note for the integrator in D.4: the `test ah, 0x41 + jne` and `sahf + jae`
FPU idioms are worth recognising as a reusable decompilation template — they
appear frequently in 32-bit x87 code emitted by GCC and have been the source
of at least one previous inversion bug in `ts_i386.so`. A short regression
test under `tools/decompile/fixtures/` (built around `CheckValues` precisely
because it uses both idioms in one function) would catch this class of error
going forward.
