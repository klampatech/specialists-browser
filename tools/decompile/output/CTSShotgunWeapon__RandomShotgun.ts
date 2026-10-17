// External bindings — these would normally live in a shared
// engine-binding module. Inlined here so this snippet is
// self-contained.
declare class CTSShotgunWeapon {}

/**
 * GoldSrc engine function table (enginefuncs_t). For D.3 we only
 * need one slot — pfnRANDOM_LONG — at offset 0x168 from the
 * engine-interface singleton pointer.
 */
declare const g_engfuncs: {
  pfnRANDOM_LONG(min: number, max: number): number;
};

/**
 * CTSShotgunWeapon::RandomShotgun — roll a random shotgun
 * fire-pattern index.
 *
 * The original 32-bit MSVC routine (0x000b9638, 122 B) calls
 * the engine's bounded integer-RNG pfnRANDOM_LONG(1, 5) via a
 * vtable lookup, then performs a jump-table switch over
 * (roll − 1) ∈ [0, 4]. The case-0 body and the out-of-range
 * default share the same epilogue: `jmp b96ad` with `eax`
 * unmodified, so both return (roll − 1).
 *
 * Mapping (roll → returned pattern index):
 *   1 → 0    (case-0 body; eax unchanged through epilogue)
 *   2 → 26
 *   3 → 33
 *   4 → 20
 *   5 → 11
 *   <other> → 0  (default arm, inferred; see TODO below)
 *
 * `this` is unused — no `[this+...]` accesses in the body.
 *
 * @returns A TS internal shotgun-pattern index.
 */
export function RandomShotgun(this: CTSShotgunWeapon): number {
  // Engine RNG is vtable-dispatched in the original:
  //   eax = *(GOT + 0x1aa8)            // engine-interface singleton
  //   call [eax + 0x168](1, 5)         // = pfnRANDOM_LONG(min, max), cdecl
  // TODO(engine-binding): swap in the real engine binding once D.5
  // wires enginefuncs_t into Babylon.js. Args were pushed
  // right-to-left (5 then 1) and the caller cleaned up with
  // `add esp, 0x10`.
  const roll = g_engfuncs.pfnRANDOM_LONG(/* min */ 1, /* max */ 5);

  // Switch dispatch — flattened from the original jump table.
  // TODO(asm-ambiguous): the default arm (ja b9688) lands in the
  // disassembler's misaligned table-decoded region, so the exact
  // default body is not directly readable. We infer it shares the
  // case-0 body (a 5-byte `jmp` to the b968d case-0 label, which
  // then `jmp`s b96ad with eax unchanged). That makes
  // `default: return roll - 1` the most likely faithful
  // translation.
  switch (roll - 1) {
    case 0:  return roll - 1; // 0  — case 0: eax unchanged through epilogue
    case 1:  return 26;
    case 2:  return 33;
    case 3:  return 20;
    case 4:  return 11;
    default: return roll - 1; // inferred ≡ case 0
  }
}
