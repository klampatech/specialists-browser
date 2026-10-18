/**
 * CTSGun::ReloadWeapon — attempt to schedule an ammo reload.
 *
 * Demangled C symbol: CTSGun::ReloadWeapon(int, int, float)
 * Address: 0x00074a14, 149 bytes (0x95)
 *
 * Algorithm (verified against disassembly at 0x74a14):
 *   1. Default return 0 (set by `mov eax, 0` at 0x74a29).
 *   2. If [this+0xcc] (owning player) is null → return 0.
 *   3. ammoType = byte at ([this+0xd0] + 8).
 *   4. stock = dword at [this+0xd4 + ammoType*4].
 *   5. If stock <= 0 → return 0.
 *   6. neededRaw = arg1 (targetCount) - dword at ([this+0xcc] + 4).
 *   7. needed    = min(stock, neededRaw).
 *   8. If needed <= 0 → return 0.
 *   9. dword at ([this+0xcc] + 12) = 1  (mark player reloading).
 *  10. dword at ([this+0x80] + 0x12c) = UTIL_WeaponTimeBase() + arg3 (delay).
 *  11. Return 1.
 *
 * @param this        The CTSGun instance (gun entity).
 * @param targetCount Desired ammo count to reach (int).
 * @param delay       Seconds to add to the next-use/next-attack time (float).
 * @returns           1 if a reload was scheduled, 0 otherwise.
 */
export function ReloadWeapon(
  this: any,
  targetCount: number,
  delay: number,
): number {
  const self = this;

  // [this+0xcc]: owning player pointer.
  // TODO(asm-ambiguous): likely m_pPlayer on the gun; verify in D.4.
  const player = self.m_pPlayer;
  if (!player) return 0;

  // [this+0xd0]: ptr to ammo-info struct; byte at +8 = ammo-type index.
  // [this+0xd4 + ammoType*4]: ammo stock for that type.
  // TODO(asm-ambiguous): m_pAmmoInfo / m_rgAmmo inferred from access pattern;
  //   could also be m_pWeaponInfo / m_iAmmo on a TS-specific struct.
  const ammoType: number = self.m_pAmmoInfo.m_iAmmoType;
  const stockAmmo: number = self.m_rgAmmo[ammoType];
  if (stockAmmo <= 0) return 0;

  // neededRaw = targetCount - dword at [player+0x4].
  // NOTE: disassembly reads a SINGLE int at player+4, NOT an indexed
  // array access. The previous decompilation incorrectly used
  // player.m_rgAmmo[ammoType] here.
  // TODO(asm-ambiguous): player+0x4 could be m_iAmmo, m_iCurrentClip,
  //   or a TS-specific field. Do NOT commit to m_rgAmmo[ammoType].
  const playerField4: number = player.field_4 ?? 0;
  const neededRaw: number = targetCount - playerField4;
  const needed: number = Math.min(neededRaw, stockAmmo);
  if (needed <= 0) return 0;

  // Mark player as reloading (dword at [player+0xc] = 1).
  // TODO(asm-ambiguous): likely m_fReloading; verify in D.4.
  player.m_fReloading = 1;

  // Schedule next-use time (dword at [this+0x80 + 0x12c]).
  // TODO(asm-ambiguous): [this+0x80] could be m_pActiveItem OR
  //   another pointer to the player (gun already has a player ptr at
  //   [this+0xcc]); [(ptr)+0x12c] is m_flNextPrimaryAttack or similar.
  const weapon = self.m_pActiveItem ?? self.m_pPlayer;
  weapon.m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + delay;

  return 1;
}

// ---------------------------------------------------------------------------
// External dependencies from ts/dlls/ts_i386.so (not yet ported in D.5).
// Stubs here so this file compiles in isolation.
// ---------------------------------------------------------------------------

/** Engine utility: returns the server's weapon-time base (FPU-return float).
 *  D.5 will wire this to the actual engine call. */
export function UTIL_WeaponTimeBase(): number {
  // TODO(d5): replace with real implementation; return value is float.
  return 0;
}
