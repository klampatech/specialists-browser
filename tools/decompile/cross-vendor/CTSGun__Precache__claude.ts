/**
 * CTSGun::Precache — Pre-cache 11 model/sound indices and store
 * each returned (16-bit) index into a CTSGun field.
 *
 * Disassembly reference: 0x00070660, 307 B, straight-line. The
 * engine function table is loaded from `[ebx+0x1aa8]` into `esi`,
 * the entity is loaded from `[esp+0x10]` into `edi` (regular arg,
 * NOT `this` — there is no `__thiscall` setup in the prologue),
 * and 11 identical calls to engine_funcs[0x1e8 / 4] =
 * engine_funcs[122] are issued. Each returns a 32-bit index
 * which is truncated to AX (16 bits) and stored as a WORD at
 * successive entity offsets.
 *
 * The 11 store offsets are:
 *   0x964, 0x966, 0x96e, 0x968, 0x96a, 0x96c, 0x970,
 *   0x972, 0x974, 0x976, 0x978
 * (preserved verbatim from the disassembly — three logically
 * grouped regions: 0x964–0x966, 0x968–0x96e, 0x970–0x978).
 * The order is *not* monotone; it mirrors source-level
 * group/init sequencing, not struct layout.
 *
 * GOT-relative string addresses (from rodata):
 *   -0x6dd99, -0x6dd8a, -0x6dd77, -0x6dd62, -0x6dd52,
 *   -0x6dd43, -0x6dd2d, -0x6dd1c, -0x6dd0c, -0x6dcfb,
 *   -0x6dcec.
 * Each is paired 1-to-1 with the call that uses it.
 *
 * @param pItem  CTSGun entity (loaded into edi from [esp+0x10])
 * @returns      void
 */
export function Precache(pItem: any): void {
  // TODO(asm-ambiguous): vtable slot 0x1e8 / 4 = engine_funcs[122].
  // Candidate names to verify against the TS enginefuncs_t layout
  // (see D.5 work): pfnPrecacheModel, pfnPrecacheSound,
  // pfnPrecacheGeneric, or a TS-extended pfnPrecache* that takes
  // a (flag, path) pair. The literal `1` pushed first is some
  // precache-flavor discriminator.
  // TODO(asm-ambiguous): EngineGlobals shape not yet defined; the
  // `as any` keeps this compilable in isolation, but the eventual
  // accessor should resolve to engine_funcs[122] in D.5.
  const precache: any = (EngineGlobals as any).engineFuncs.precache;

  // TODO(asm-ambiguous): resolve each "string@GOT-0x..." placeholder
  // to the actual rodata string during D.4 (see
  // tools/decompile/analysis/strings-n5.txt for the GOT-relative
  // map). Order is fixed by the disassembly; do NOT re-sort by
  // field offset.
  pItem.m_iPrecache_0x964_unresolved = precache(/* flag */ 1, /* path: TODO */ "string@GOT-0x6dd99");
  pItem.m_iPrecache_0x966_unresolved = precache(1, "string@GOT-0x6dd8a");
  pItem.m_iPrecache_0x96e_unresolved = precache(1, "string@GOT-0x6dd77");
  pItem.m_iPrecache_0x968_unresolved = precache(1, "string@GOT-0x6dd62");
  pItem.m_iPrecache_0x96a_unresolved = precache(1, "string@GOT-0x6dd52");
  pItem.m_iPrecache_0x96c_unresolved = precache(1, "string@GOT-0x6dd43");
  pItem.m_iPrecache_0x970_unresolved = precache(1, "string@GOT-0x6dd2d");
  pItem.m_iPrecache_0x972_unresolved = precache(1, "string@GOT-0x6dd1c");
  pItem.m_iPrecache_0x974_unresolved = precache(1, "string@GOT-0x6dd0c");
  pItem.m_iPrecache_0x976_unresolved = precache(1, "string@GOT-0x6dcfb");
  pItem.m_iPrecache_0x978_unresolved = precache(1, "string@GOT-0x6dcec");
}
