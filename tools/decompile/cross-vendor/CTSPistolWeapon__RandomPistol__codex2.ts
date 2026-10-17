/**
 * CTSPistolWeapon::RandomPistol — pick a random pistol type for
 * this weapon.
 *
 * Rolls `g_engfuncs.pfnRANDOM_LONG(1, 7)` and dispatches via a
 * jump-table switch on `(rolled - 1)` to return one of the pistol
 * type IDs below.
 *
 * Disassembly (146 B at 0xb9ba4):
 *   - PIC base0x166410 via `call +0x9; pop ebx; add ebx, 0xac263`
 *   - Load `[ebx+0x1aa8]` → g_engfuncs (engine function table)
 *   - Call `[eax+0x168]` → g_engfuncs.pfnRANDOM_LONG(1, 7)
 *   - `sub eax, 0x1` → switch on (rolled - 1)
 *   - `cmp eax, 0x6; ja default` → values 0..6 dispatched,
 *     >6 → default
 *   - Jump table at `[ebx - 0xac230]` = 0xBA1E0 (outside chunk).
 *   - Case targets visible in-chunk return 0x8, 0x9, 0xe, 0x15,
 *     0x16, 0x1c; default returns 1. Case 6 likely duplicates *     default per the jump table.
 *
 * `this` is unused — this is a static-like RNG dispatch helper
 * (no `this` dereferences in the disassembly).
 *
 * @returns Pistol type ID consumed by the engine's spawn code.
 */

// Stubs so this file compiles in isolation. In D.5 these will be
// wired to the real engine bindings from `src/mod/interface.ts`.
declare const g_engfuncs: any;            // enginefuncs_t, see D.3
declare class CTSPistolWeapon {}          // gameplay entity, see D.4

export function RandomPistol(this: CTSPistolWeapon): number {
  const rolled = g_engfuncs.pfnRANDOM_LONG(1, 7);
  switch (rolled - 1) {
    case 0: return 0x8;
    case 1: return 0x9;
    case 2: return 0xe;
    case 3: return 0x15;
    case 4: return 0x16;
    case 5: return 0x1c;
    default: return 1;  // case 6 + out-of-range, see jump table
  }
}
