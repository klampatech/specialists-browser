/**
 * CTSBigPistolWeapon::RandomBigPistol — picks a random big pistol weapon variant.
 *
 * Rolls an integer in [1, 3] via the engine's pfnRandomLong and maps the result:
 *   roll == 2 → 0x1f
 *   roll == 3 → 0x24
 *   otherwise (roll == 1) → 0xc
 *
 * Disassembly notes:
 *   - `[ebx + 0x1aa8]` is the GOT slot for `g_engfuncs` (engine function table).
 *   - `[eax + 0x168]` is `g_engfuncs.pfnRandomLong` (HLSDK enginefuncs_t slot).
 *   - The chained `cmp eax,0x2 / jle / cmp eax,0x3` resolves to the same
 *     mapping; the fallthrough to 0xc is a defensive default the compiler
 *     kept even though RandomLong(1,3) never returns anything outside {1,2,3}.
 *
 * @returns A small integer identifying the chosen weapon variant.
 */

// Forward-declared so this snippet compiles in isolation.
declare const g_engfuncs: any;

export function RandomBigPistol(this: any): number {
  const roll: number = g_engfuncs.pfnRandomLong(1, 3);

  switch (roll) {
    case 2:
      return 0x1f;
    case 3:
      return 0x24;
    default:
      return 0xc; // roll === 1
  }
}
