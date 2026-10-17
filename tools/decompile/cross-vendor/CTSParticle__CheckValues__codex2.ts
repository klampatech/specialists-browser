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
