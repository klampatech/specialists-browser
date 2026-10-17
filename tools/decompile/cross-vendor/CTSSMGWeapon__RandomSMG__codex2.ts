// External bindings — these would normally live in a shared
// engine-binding module. Inlined here so this snippet is
// self-contained.
declare class CTSSMGWeapon {}

/**
 * GoldSrc engine function table (enginefuncs_t). For D.3 we only
 * need one slot — pfnRANDOM_LONG — at offset 0x168 from the
 * engine-interface singleton pointer.
 */
declare const g_engfuncs: {
  pfnRANDOM_LONG(min: number, max: number): number;
};

/**
 * CTSSMGWeapon::RandomSMG — roll a random SMG weapon class ID.
 *
 * The original 32-bit MSVC routine (0x000b99a4, 134 B) calls
 * the engine's bounded integer-RNG pfnRANDOM_LONG(1, 6) via a
 * vtable lookup, then performs a jump-table switch over
 * (roll − 1) ∈ [0, 5]. The compiler fused the default arm with
 * the index-0 case body — both share `mov eax, 0x17` at b99f8.
 *
 * Mapping (roll → returned weapon class ID):
 *   1 → 23   (default body; shared with out-of-range)
 *   2 → 7
 *   3 → 6
 *   4 → 19
 *   5 → 17
 *   6 → 3
 *   <other> → 23
 *
 * `this` is unused — no `[this+...]` accesses in the body.
 *
 * @returns A TS internal weapon class ID for the rolled SMG.
 */
export function RandomSMG(this: CTSSMGWeapon): number {
  // Engine RNG is vtable-dispatched in the original:
  //   eax = *(GOT + 0x1aa8)            // engine-interface singleton
  //   call [eax + 0x168](1, 6)         // = pfnRANDOM_LONG(min, max), cdecl
  // TODO(engine-binding): swap in the real engine binding once D.5
  // wires enginefuncs_t into Babylon.js. Args were pushed
  // right-to-left (6 then 1) and the caller cleaned up with
  // `add esp, 0x10`.
  const roll = g_engfuncs.pfnRANDOM_LONG(/* min */ 1, /* max */ 6);

  // Switch dispatch — flattened from the original jump table.
  // The compiler mapped index 0 onto the same body as the
  // out-of-range default (both load 23 = 0x17).
  switch (roll - 1) {
    case 0: return 23;
    case 1: return 7;
    case 2: return 6;
    case 3: return 19;
    case 4: return 17;
    case 5: return 3;
    default: return 23;
  }
}
