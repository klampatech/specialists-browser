/**
 * CTSTeamEscape::EnableObjective — toggle this TeamEscape team's
 * objective flag on or off.
 *
 * Demangled symbol: `CTSTeamEscape::EnableObjective(bool)`
 *
 * Behaviour (from `tools/decompile/chunks/EnableObjective__13CTSTeamEscapeb.chunk.md`):
 *   1. Persist the enable flag as a byte at offset 0x64.
 *   2. Zero a 33-dword (132-byte) block at offsets 0x6c..0xec.
 *   3. Clear the trailing dword at offset 0xf0.
 *   4. Write 1 (if enable) or 0 (if !enable) to `*(vptr + 0x10c)`,
 *      where `vptr = this[0]` (first dword of the object).
 *
 * @param this    The CTSTeamEscape entity instance. TODO(D.4): type
 *                as `CTSTeamEscape` once the class is reconstructed.
 * @param enable  Whether to enable the team's objective.
 */

// Side-effecting helper for "store dword to engine memory". Declared
// here so the function compiles in isolation; D.5 wires it up to the
// real engine memory view (DataView / WASM heap).
export interface MemWriter {
  writeDword(addr: number, value: number): void;
}
declare const mem: MemWriter; // supplied by the loader in D.5

export function EnableObjective(this: any, enable: boolean): void {
  // 1. Persist enable flag at offset 0x64 (byte).
  this[0x64] = enable ? 1 : 0;

  // 2. Zero 33 dwords (132 bytes) at offsets 0x6c..0xec. The bound
  //    is 0xf0 (= 0x6c + 33*4) because the trailing dword at 0xf0 is
  //    cleared separately in step 3.
  // TODO(D.4): field meaning unclear — likely per-objective target
  //       state or per-tick progress entries for the team.
  for (let off = 0x6c; off < 0xf0; off += 4) {
    this[off] = 0;
  }

  // 3. Clear the trailing dword at offset 0xf0.
  this[0xf0] = 0;

  // 4. The first dword of `this` is the vptr. The asm writes a dword
  //    at vptr+0x10c — likely an MSVC class-static slot accessed
  //    through the vtable descriptor (D.4 to confirm semantics).
  // TODO(asm-ambiguous): the `mov eax,[esi]; mov [eax+0x10c], N`
  //       pattern isn't a normal vtable-slot write; treat as a
  //       memory store until D.4 resolves the symbol.
  const vptr = this[0]; // disassembly: `mov eax, DWORD PTR [esi]`
  mem.writeDword(vptr + 0x10c, enable ? 1 : 0);
}
