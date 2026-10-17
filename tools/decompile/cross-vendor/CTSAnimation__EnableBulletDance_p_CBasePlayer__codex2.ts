/**
 * CTSAnimation::EnableBulletDance — flips the player into bullet-dance
 * mode by setting the active flag and seeding the blend alpha and
 * per-frame blend speed that BulletDance() reads each tick.
 *
 * Disassembly (35 B at 0x0005d314):
 *   5d314: mov eax, [esp+0x4]                ; load pPlayer
 *   5d318: mov DWORD PTR [eax+0x1e4], 0x1
 *   5d322: mov DWORD PTR [eax+0x1dc], 0x3e19999a  ; float32 ≈ 0.15
 *   5d32c: mov DWORD PTR [eax+0x1e0], 0x40400000  ; float32 = 3.0
 *   5d336: ret
 *
 * @param pPlayer The player to put into bullet dance
 */
// `this` is unused in the disassembly — ECX is never referenced.
export function EnableBulletDance(this: any, pPlayer: any): void {
  // pPlayer+0x1e4 — DWORD write, value 1. TODO(asm-ambiguous):
  // could be bool/int/flag. Field name unverified; carry as TODO.
  pPlayer.m_fBulletDance = 1; // TODO(asm-inferred-name)
  // pPlayer+0x1dc — float32 bit pattern 0x3e19999a ≈ 0.15000000596...
  // TODO(asm-inferred-name): verify against C++ field name.
  pPlayer.m_flBulletDanceAlpha = 0.15;
  // pPlayer+0x1e0 — float32 bit pattern 0x40400000 = 3.0 (exact).
  // TODO(asm-inferred-name): verify against C++ field name.
  pPlayer.m_flBulletDanceSpeed = 3.0;
}
