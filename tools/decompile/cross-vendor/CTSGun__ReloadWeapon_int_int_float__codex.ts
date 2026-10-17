```typescript
/**
 * CTSGun::ReloadWeapon — attempt to reload ammo into the weapon.
 *
 * If the gun has an owner and at least one round of the correct ammo
 * type, computes how many rounds the reload would consume, marks the
 * player as reloading, and schedules the active weapon's next-use time.
 *
 * @param this        The CTSGun instance (gun entity)
 * @param targetCount Desired ammo count (int)
 * @param unused      Unused / reserved (int) — kept for ABI match
 * @param delay       Seconds to add to the weapon's next-use time (float)
 * @returns           1 if the reload was scheduled, 0 otherwise
 */
export function ReloadWeapon(
  this: CTSGun,
  targetCount: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unused: number,
  delay: number,
): number {
  // [this+0xcc]: owning player pointer; null → nothing to reload.
  // TODO(asm-ambiguous): exact field identity inferred from access pattern.
  const self = this as any;
  const player = self.m_pPlayer;
  if (!player) return 0;

  // [this+0xd0]: pointer to an info struct; the byte at offset 8 inside
  // it is the ammo-type index used to look up this.m_rgAmmo[].
  // TODO(asm-ambiguous): [this+0xd0] struct type inferred — could be
  // m_pWeaponInfo, m_pAmmoInfo, etc.
  const ammoType: number = self.m_pAmmoInfo.m_iAmmoType;
  const stockAmmo: number = self.m_rgAmmo[ammoType]; // [this+0xd4 + ammoType*4]

  if (stockAmmo <= 0) return 0;

  // Ammo needed = max(0, targetCount - player's currently-loaded amount),
  // clamped to whatever we actually have on hand.
  // TODO(asm-ambiguous): [player+0x4] field identity unverified — could
  // be m_rgAmmo[ammoType], m_iCurrentClip, m_iAmmo, etc.
  const neededRaw: number = targetCount - player.m_rgAmmo[ammoType];
  const needed: number = Math.min(neededRaw, stockAmmo);

  if (needed <= 0) return 0;

  // Flag the player as reloading ([player+0xc] = 1).
  player.m_fReloading = 1;

  // Schedule the active weapon's next-use time.
  // TODO(asm-ambiguous): [this+0x80] / [weapon+0x12c] field identity
  // unverified — assumed to be m_pActiveItem / m_flNextPrimaryAttack.
  const weapon = self.m_pActiveItem;
  // TODO: UTIL_WeaponTimeBase() not yet ported from the binary.
  weapon.m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + delay;

  return 1;
}
```
