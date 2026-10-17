// Stub interfaces so this file compiles in isolation. D.5 will fill these in.
interface CTSAnimation {}
interface CBasePlayer {}

/**
 * CTSAnimation::DisableBulletDance — clear the three bullet-dance state
 * fields on the given player so the bullet-dance animation stops.
 *
 * Demangled: `CTSAnimation::DisableBulletDance(p CBasePlayer)`
 * Address:   0x0005d2f0  Size: 35 bytes
 *
 * @param this     The CTSAnimation instance (unused — this method does
 *                 not touch its own state, only the player's)
 * @param pPlayer  The player whose bullet-dance state should be cleared
 * @returns        void
 */
export function DisableBulletDance(
  this: CTSAnimation,
  pPlayer: CBasePlayer,
): void {
  // Three DWORDs in the player's TS extension together describe an active
  // bullet-dance (e.g. timer / weapon ref / shot counter). All three are
  // zeroed so the dance stops cleanly.
  //
  // TODO(asm-ambiguous): exact field names and types of 0x1dc, 0x1e0, 0x1e4
  // are not visible from this chunk alone — EnableBulletDance (0x5d314) and
  // BulletDance (0x5d338) (sibling methods) almost certainly reveal them;
  // until those are decompiled we treat them as opaque DWORDs.
  //
  // Disassembly (preserve write order for traceability):
  //   mov DWORD PTR [eax+0x1e4], 0x0
  //   mov DWORD PTR [eax+0x1dc], 0x0
  //   mov DWORD PTR [eax+0x1e0], 0x0
  const fields = pPlayer as unknown as Record<number, number>;
  fields[0x1e4] = 0;
  fields[0x1dc] = 0;
  fields[0x1e0] = 0;
}
