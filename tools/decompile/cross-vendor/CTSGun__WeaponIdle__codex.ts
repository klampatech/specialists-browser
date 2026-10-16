```typescript
/**
 * CTSGun::WeaponIdle — per-frame weapon idle behavior.
 *
 * Branches based on the gun's mode, the player's weapon state, ammo,
 * and the idle timer:
 *   - No weapon info configured? CCombatIdle() and bail.
 *   - Sync m_iClip and the ammo-source pointer from m_pWeaponInfo.
 *   - In firing state with shots remaining: play the fire anim and exit.
 *   - In burst mode (m_bFireMode == 2) with idle timer expired: fire
 *     one shot per idle tick, decrementing the burst counter.
 *   - If next-attack hasn't elapsed, return without idling.
 *   - In grenade state: delegate to GrenadeIdle(0) and exit.
 *   - Out of ammo and not infinite-clips: play reload anim and exit.
 *   - Otherwise: schedule next idle tick with a random jitter, then
 *     play the idle animation.
 *
 * @param this  The CTSGun entity (this in the original C++)
 * @returns     void
 */
export function WeaponIdle(this: CTSGun): void {
  // No weapon info — fall back to the generic combat idle loop.
  if (this.m_pWeaponInfo === null) {
    this.CCombatIdle();
    return;
  }

  // Mirror the weapon info's ammo count into the gun's clip.
  this.m_iClip = this.m_pWeaponInfo.m_iAmmo;

  // Repoint the weapon info's ammo source at one of two slots in the
  // player struct. The m_bUseAmmo2 flag selects which slot.
  // TODO(asm-ambiguous): the exact fields at player+0x252 vs player+0x28c
  // are not visible in the chunk.
  this.m_pWeaponInfo.m_pAmmoSource =
    this.m_pWeaponInfo.m_bUseAmmo2 === 0
      ? &this.m_pPlayer.m_rgAmmo[0x252]
      : &this.m_pPlayer.m_rgAmmo[0x28c];

  // Per-frame "firing animation tick": while the player is in the firing
  // state and we still have burst shots left, play the fire animation
  // and exit.
  if (
    this.m_pPlayer.m_iWeaponState === 1 &&
    this.m_pWeaponInfo.m_iShotsRemaining !== 0
  ) {
    // TODO(asm-ambiguous): virtual call via [esi+0x60]+0x188 — method unknown
    this.m_pOwnerInterface.playFireAnim(this);
    return;
  }

  // Burst autofire: while the gun is in burst mode and the idle timer
  // has expired, fire one shot per idle tick until the burst runs out.
  if (this.m_pWeaponInfo.m_bFireMode === 2) {
    if (this.m_flTimeWeaponIdle <= 0) {
      if (this.m_pWeaponInfo.m_iShotsRemaining > 0) {
        this.Fire();
        this.m_pWeaponInfo.m_iShotsRemaining--;
      } else {
        this.m_pWeaponInfo.m_iShotsRemaining = 0;
      }
    }
  }

  // Don't idle if next attack hasn't elapsed yet.
  const currentTime = UTIL_WeaponTimeBase();
  if (currentTime < this.m_flNextPrimaryAttack) {
    return;
  }

  // Grenade state — delegate and exit.
  if (this.m_pPlayer.m_iWeaponState === 2) {
    this.GrenadeIdle(0);
    return;
  }

  // Auto-reload: only if not in infinite-clip mode and the gun has no ammo.
  if (InfiniteClips(this.m_pPlayer) === 0 && this.m_pWeaponInfo.m_iAmmo <= 0) {
    // TODO(asm-ambiguous): virtual call via [esi+0x60]+0x188 — method unknown
    this.m_pOwnerInterface.playReloadAnim(this);
    return;
  }

  // No ammo (and not infinite-clips): bail.
  if (this.m_pWeaponInfo.m_iAmmo === 0) {
    return;
  }

  // Schedule the next idle tick with a random interval so guns don't sync.
  // TODO: identify the constant at [ebx-0x6e768] — likely a cvar like
  //       ts_idleplus or a similar random-jitter constant.
  this.m_flNextPrimaryAttack = currentTime + TS_IDLE_RANDOM_INTERVAL;

  // Pick the animation ID: from m_pWeaponInfo.m_pAnimSeq if non-null,
  // otherwise 0. Only the first short of the seq is read.
  // TODO(asm-ambiguous): field at m_pWeaponInfo+0x28 may be a name string
  // rather than an animation sequence struct.
  const animId =
    this.m_pWeaponInfo.m_pAnimSeq !== null
      ? this.m_pWeaponInfo.m_pAnimSeq.short
      : 0;

  // TODO(asm-ambiguous): virtual call via [esi+0x60]+0x174 with 4 args
  //   arg1 = this (CTSGun)
  //   arg2 = animId (short)
  //   arg3 = 0
  //   arg4 = some value loaded from [esi]+0x114 (a vtable slot or
  //          struct field of unknown purpose — likely an anim handler
  //          or index).
  this.m_pOwnerInterface.playIdleAnim(this, animId, 0, this.someField[0x114]);
}
```
