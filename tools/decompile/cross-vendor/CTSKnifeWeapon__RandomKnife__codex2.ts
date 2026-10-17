// GOT entry at offset 0x1aa8 holds a pointer to the engine's
// CUniformRandomStream singleton.
// GOT base (from PIC: 0xb9eb1 + 0xabf5f) = 0x165E10
//   GOT+0x1aa8                                = 0x1678B8
// TODO(asm-ambiguous): vtable slot +0x168 (= index 90) is inferred
// to be RandomInt(min, max). Verify against the engine vtable dump
// before hardening — could equally be RandomLong with identical
// observable behavior in [1, 2].
type TsRandomStream = {
  RandomInt(min: number, max: number): number;
};
declare const __tsGOT_0x1aa8: TsRandomStream;

// Forward declaration only — full class reconstruction is D.4.
declare class CTSKnifeWeapon {}

/**
 * CTSKnifeWeapon::RandomKnife — returns one of two knife sequence /
 * animation indices sampled uniformly from the engine's RNG.
 *
 * Disassembly mapping (eax on return):
 *   RandomInt(1, 2) == 1  →  0x19 (25)
 *   RandomInt(1, 2) == 2  →  0x23 (35)
 *   any other value      →  0x19 (defensive default — unreachable in
 *                              practice since RandomInt is closed-interval)
 *
 * The `this` pointer is never read; the random source is a global
 * singleton, so this method is effectively stateless.
 */
export function RandomKnife(this: CTSKnifeWeapon): number {
  const r: number = __tsGOT_0x1aa8.RandomInt(1, 2);
  return r === 2 ? 0x23 : 0x19;
}
