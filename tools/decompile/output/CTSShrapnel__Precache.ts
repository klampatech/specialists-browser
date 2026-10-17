/**
 * CTSShrapnel::Precache — precaches the shrapnel model and sound assets.
 *
 * Mirrors the standard HLSDK CBaseEntity::Precache pattern:
 *   PRECACHE_MODEL("models/x.mdl");
 *   PRECACHE_SOUND("weapons/x.wav");
 * which expands to g_engfuncs.pfnPrecacheModel / pfnPrecacheSound.
 *
 * Disassembly: ebx (PIC base) = 0x165E10. [ebx+0x1aa8] -> g_engfuncs;
 * [esi+0]   = pfnPrecacheModel, [esi+4] = pfnPrecacheSound.
 * Strings at [ebx-0x6e067] (model path) and [ebx-0x6e7b7] (sound path).
 *
 * @param this  The CTSShrapnel entity instance.
 */
export function Precache(this: CTSShrapnel): void {
  // `this` is implicit on the stack but not actually read.
  void this;

  // TODO(asm-ambiguous): resolve to actual asset strings in
  // tools/decompile/analysis/strings-n5.txt (rodata offsets
  // 0x6e067 and 0x6e7b7 relative to GOT base 0x165E10).
  const modelPath = "models/shrapnel.mdl";
  const soundPath = "weapons/shrapnel_hit.wav";

  // [ebx+0x1aa8] holds g_engfuncs; slots 0 / 4 are pfnPrecacheModel
  // and pfnPrecacheSound per HLSDK enginefuncs_t ordering.
  g_engfuncs.pfnPrecacheModel(modelPath);
  g_engfuncs.pfnPrecacheSound(soundPath);
}

// --- in-file stand-ins (replace with the real class / engine table in D.4) ---
declare class CTSShrapnel {}
declare const g_engfuncs: {
  pfnPrecacheModel: (path: string) => number;
  pfnPrecacheSound: (path: string) => number;
};
