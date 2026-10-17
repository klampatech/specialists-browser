declare function UTIL_WeaponTimeBase(): number;

/**
 * CTSGun::StopReload — terminate the current reload: detach the
 * primary ammo from its owner, optionally zero out the ammo state
 * when the player is in a no-sound mode, then stamp the current
 * weapon-time base into the gun's reload-end float and into the
 * matching float on a related sub-object.
 *
 * @param this  The CTSGun (weapon) entity instance
 * @returns     void
 */
export function StopReload(this: any): void {
  const primaryAmmo = this.m_pPrimaryAmmo;   // [esi+0xcc]
  const player      = this.m_pPlayer;         // [esi+0xd0]

  // Nothing to clean up if the gun has no ammo backing or no owner.
  if (primaryAmmo === null || player === null) {
    return;
  }

  // [ammo+0xc] = primaryAmmo->m_pOwner. If the ammo isn't currently
  // attached to anyone, there's nothing to detach.
  if (primaryAmmo.m_pOwner === null) {
    return;
  }
  primaryAmmo.m_pOwner = null;

  // If the player has the no-player-sound flag set, fully reset the
  // primary ammo (count + state byte). Looks like the cleanup path
  // for silent / scripted reloads that bypass sound triggers.
  //
  // TODO(asm-ambiguous): m_fNoPlayerSound at [player+0x348] is
  //   inferred from the GoldSrc CBasePlayer layout — the *semantic*
  //   reason it gates this cleanup isn't visible in the chunk.
  //   The state byte at [ammo+0x24] is otherwise unreferenced here.
  if (player.m_fNoPlayerSound === 1) {
    primaryAmmo.m_iAmount = 0;   // [ammo+0x8]
    primaryAmmo.m_fState  = 0;   // [ammo+0x24]
  }

  // Stamp UTIL_WeaponTimeBase() into:
  //   [esi+0xa8]  = this->m_flReloadEndTime
  //   [esi+0x80]->[0x12c]  = reload-end float on a related sub-object
  //
  // Both writes take the same value (fst copies, fstp pops).
  //
  // TODO(asm-ambiguous): the purpose of the pointer field at
  //   [this+0x80] is not visible in this chunk — kept here as a
  //   generic per-weapon sub-object that also tracks reload timing.
  const now = UTIL_WeaponTimeBase();
  const sub = this.m_pReloadSubObject;   // [esi+0x80]
  this.m_flReloadEndTime = now;          // [esi+0xa8]
  sub.m_flReloadEndTime    = now;        // [sub+0x12c]
}
