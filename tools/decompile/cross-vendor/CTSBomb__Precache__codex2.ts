// Stub declarations so this file compiles in isolation.
// (D.5 wires the real `g_engfuncs` to the Babylon engine binding.)
declare const g_engfuncs: any;
type CTSBomb = unknown; // D.4 will replace with the full class type.
// TODO(D.4): resolve the string at data-section offset 0x9400C against
// tools/decompile/analysis/strings-n5.txt — it's the bomb's SFX path.
declare const STRING_LITERAL_AT_0x9400C: any;

/**
 * CTSBomb::Precache — precaches the bomb's sound asset.
 *
 * Disassembly (0x0007c570, 40 bytes):
 *   - ebx = .text + 0xe9897  (PIC/GOT base = 0x100e10)
 *   - edx = [ebx + 0x1aa8]   (= g_engfuncs)
 *   - eax = ebx - 0x6ce04    (= string literal at 0x9400C)
 *   - push eax; call [edx+0x4]
 *
 * In HLSDK's enginefuncs_t layout, offset +4 is pfnPrecacheSound
 * (pfnPrecacheModel is +0). The instance pointer (`this` in ECX) is
 * not referenced — this is a stateless precache of a single asset.
 */
export function Precache(this: CTSBomb): void {
  const soundPath: any /* const char* */ = STRING_LITERAL_AT_0x9400C;
  (g_engfuncs as any).pfnPrecacheSound(soundPath);
}
