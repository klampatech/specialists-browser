// Ambient declarations so this snippet compiles in isolation.
// D.4 will wire these up properly against the actual class and
// engine wrapper.
declare class CTSPistolWeapon {}
declare function RANDOM_LONG(min: number, max: number): number;

/**
 * CTSPistolWeapon::RandomPistol — pick a random pistol type ID.
 *
 * Calls the engine's `RANDOM_LONG(1, 7)` and dispatches via a 7-entry
 * jump table on `(rolled - 1)`. The disassembly shows six distinct
 * case-target blocks (returning 8, 9, 14, 21, 22, 28) plus a default
 * (returning 1) — 7 code targets for 7 table entries.
 *
 * The actual jump table sits at 0xb9de0, outside this 146-byte chunk,
 * so case index 6 (rolled == 7) cannot be verified from the
 * disassembly alone. We route it to the default (1), which is the
 * most common MSVC pattern when a case has no distinguishing code;
 * if a D.4 cross-reference shows a 7th case target, the mapping
 * should be updated.
 *
 * @returns Pistol type ID: 1 (default), 8, 9, 14, 21, 22, or 28.
 */
export function RandomPistol(this: CTSPistolWeapon): number {
  // PIC: ebx = 0x166010 (image base).
  //   [ebx + 0x1aa8]      → g_engfuncs (enginefuncs_t *)
  //   [g_engfuncs + 0x168] → pfnRANDOM_LONG(min, max)
  // Stack: 16 bytes of alignment padding (2× sub esp,0x8) + 2× push
  // arg. Cleaned with add esp,0x10 + add esp,0x8 before ret.
  const rolled = RANDOM_LONG(1, 7);

  // `sub eax, 1; cmp eax, 6; ja default` → case index = rolled - 1.
  switch (rolled - 1) {
    case 0: return 0x08;
    case 1: return 0x09;
    case 2: return 0x0e;
    case 3: return 0x15;
    case 4: return 0x16;
    case 5: return 0x1c;
    // TODO(asm-ambiguous): case 6 (rolled == 7) — see file note.
    default: return 0x01;
  }
}
