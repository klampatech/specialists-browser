// Set the resting bounding box. Per the disassembly:
//   * mins (2nd arg) = Vector A at [esp]     = (g2, g2, g3) — 2 globals, distinct z
//   * maxs (3rd arg) = Vector B at [esp+0x10] = (g1, g1, g1) — 1 global, all-same
// For a typical TS ammo box these would resolve to (0, 0, 0) for mins
// and (some_width, some_length, some_height) for maxs — confirm against
// the TS rodata and `tools/decompile/analysis/strings-n5.txt`.
// TODO(asm-ambiguous): the three constants come from separate GOT
// entries ([ebx-0x6dec8], [ebx-0x6cb5c], [ebx-0x6f408]).
UTIL_SetSize(pev, VEC_AMMO_MIN, VEC_AMMO_MAX);
