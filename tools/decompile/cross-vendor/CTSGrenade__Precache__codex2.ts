/**
 * CTSGrenade::Precache — precache the 4 sound resources this
 * grenade uses (typically bounce / hit / explode variants)
 * via the engine's pfnPrecacheSound (offset 4 in enginefuncs_t).
 *
 * Decompiled from `ts/dlls/ts_i386.so` @ 0x0006bdd8 (78 bytes).
 * Original C++: `void CTSGrenade::Precache()`.
 *
 * Disassembly summary:
 *   - PIC setup: call/pop/add to compute GOT base in ebx
 *   - Load g_engfuncs pointer from GOT into esi
 *   - 4x `call [esi+0x4]` (= g_engfuncs.pfnPrecacheSound)
 *     with 4 different string args at 24-byte stride
 *
 * Note: the function does NOT access any `this`-relative
 * fields — the `this` parameter is type-only.
 */

// ---- Isolated-compilation stubs ----
// CTSGrenade is defined in D.4 (entity class discovery).
// g_engfuncs is populated globally by GiveFnptrsToDll;
// its full type is enginefuncs_t (~150 fn ptrs in HLSDK).
type CTSGrenade = any;
declare const g_engfuncs: any;

// alias the local reference for readability
const engineFuncs = g_engfuncs;
// -----------------------------------

export function Precache(this: CTSGrenade): void {
  // The 4 sound paths live in a string table in the .so's
  // read-only data section at GOT-relative offsets
  //   -0x6e0d0, -0x6e0b8, -0x6e0a0, -0x6e088
  // (24-byte stride — consistent with a fixed-size char[4][24]
  // buffer table or pointer table with alignment padding).
  //
  // TODO(asm-ambiguous): replace these empty placeholders with
  // the actual sound paths pulled from strings-n5.txt / the
  // .rodata dump. Tracked in HANDOFF.md for D.4.
  const soundPaths: ReadonlyArray<string> = [
    "", // slot 0 — GOT-0x6e0d0
    "", // slot 1 — GOT-0x6e0b8
    "", // slot 2 — GOT-0x6e0a0
    "", // slot 3 — GOT-0x6e088
  ];

  // The original calls pfnPrecacheSound 4 times, once per
  // string. A loop is a clean idiomatic equivalent — call
  // count and control-flow fidelity preserved.
  for (const path of soundPaths) {
    engineFuncs.pfnPrecacheSound(path);
  }
}
