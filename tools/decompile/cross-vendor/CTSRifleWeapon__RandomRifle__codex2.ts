// CTSRifleWeapon class — declared as `any` so this file compiles in
// isolation; the full class will be reconstructed in D.4.
type CTSRifleWeapon = any;

// RANDOM_LONG — HL1 macro for enginefuncs_t.pfnRandomLong(min, max).
// Declared here as a free function; the engine-binding layer (D.5)
// will wire it up to the actual gEngfuncs.pfnRandomLong slot// (disassembly shows the call at GOT+0x1aa8, virtual offset +0x168).
declare function RANDOM_LONG(min: number, max: number): number;

/**
 * CTSRifleWeapon::RandomRifle — randomly selects a rifle weapon ID.
 *
 * Disassembly of `RandomRifle__14CTSRifleWeapon` (0x000b97d8, 110 B):
 *   - Calls RANDOM_LONG(1, 4) via the PIC-resolved engine function
 *     table (GOT+0x1aa8, slot +0x168 = pfnRandomLong).
 *   - Subtracts 1 from the roll (b97fe) and dispatches via a 4-entry
 *     jump table at GOT-0xac5fc (b9806-b9811).
 *   - Case 0 (roll == 1): jumps to epilogue at b9841; eax is already
 *     0 from the `sub eax, 0x1`, so returns 0 (no rifle).
 *   - Case 1 (roll == 2): mov eax, 0x5  (b982c) → returns 5.
 *   - Case 2 (roll == 3): mov eax, 0x1b (b9834) → returns 0x1b.
 *   - Case 3 (roll == 4): mov eax, 0xf  (b983c) → returns 0xf.
 *   - Out-of-range (roll < 1 || roll > 4): `ja b9824` jumps into
 *     jump-table data — unreachable since RANDOM_LONG(1,4) always
 *     returns 1..4. We conservatively return 0.
 *
 * The original C++ is a class member but the body never dereferences
 * `this` (no [esi+...] accesses). The `this` parameter is a stub for
 * the future D.4 class-method reconstruction.
 *
 * @param _this  CTSRifleWeapon instance (unused; see note above).
 * @returns      A weapon ID: 0 (no rifle), 5, 0x1b, or 0xf.
 */
export function RandomRifle(_this: CTSRifleWeapon): number {
  const roll = RANDOM_LONG(1, 4);

  switch (roll) {
    case 2: return 5;
    case 3: return 0x1b;
    case 4: return 0xf;
    default: return 0;
  }
}
