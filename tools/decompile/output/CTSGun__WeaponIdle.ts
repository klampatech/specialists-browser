/**
 * CTSGun::WeaponIdle — per-frame weapon idle behavior.
 *
 * Flow (from the disassembly):
 *   1. If m_pWeaponInfo is null, delegate to CCombatIdle() and
 *      return.
 *   2. Mirror m_pWeaponInfo.m_iAmmo into this->m_iClip, then
 *      point m_pWeaponInfo.m_pAmmoSource at one of two slots
 *      in the player struct based on m_pWeaponInfo.m_bUseAmmo2.
 *   3. Burst-mode auto-fire: if m_pWeaponInfo.m_bFireMode == 2
 *      AND m_flTimeWeaponIdle <= [ebx-0x6de68] (a static double,
 *      TODO), and m_pWeaponInfo.m_iShotsRemaining > 0, call
 *      Fire() and decrement. Otherwise clamp the counter to 0.
 *   4. If UTIL_WeaponTimeBase() < this->[esi+0xa8] (likely
 *      m_flNextPrimaryAttack), return without idling.
 *   5. If m_pPlayer.[0x348] (likely m_iWeaponState) == 2,
 *      call GrenadeIdle(0) and return.
 *   6. If InfiniteClips(m_pPlayer) == 0 AND m_iAmmo <= 0,
 *      invoke the [this+0x60]+0x188 virtual (with this as the
 *      single arg) and return.
 *   7. If m_iAmmo == 0, return.
 *   8. Schedule the next idle tick: m_flNextPrimaryAttack =
 *      UTIL_WeaponTimeBase() + [ebx-0x6e768].
 *   9. Pick an anim ID: (short)(*m_pAmmoSource) if non-null,
 *      else 0. (m_pAmmoSource was set in step 2; this reuses
 *      it as a pointer to a short.)
 *  10. Invoke the [this+0x60]+0x174 virtual with4 args:
 *      (this, animId, 0, (*this.__vtable_base)[0x114]).
 *
 * Ambiguities are marked TODO(asm-ambiguous) below.
 */
export function WeaponIdle(this: CTSGun): void {
  // 1. No weapon info → generic combat idle.
  if (this.m_pWeaponInfo === null) {
    this.CCombatIdle();
    return;
  }

  // 2. Mirror ammo count; point ammo source at the right player slot.
  this.m_iClip = this.m_pWeaponInfo.m_iAmmo;
  // TODO(asm-ambiguous): identify the player fields at offsets0x252
  // and 0x28c. They are likely two distinct int counters (e.g. primary
  // vs secondary ammo counters, or m_rgAmmo[ammoType] for two different
  // ammo types). Don't pretend they're elements of one ammo array.
  const ammoSlot = this.m_pWeaponInfo.m_bUseAmmo2 === 0 ? 0x252 : 0x28c;
  this.m_pWeaponInfo.m_pAmmoSource =
    this.m_pPlayer.ammoPtrAt(ammoSlot /* byte offset */);

  // 3. Burst auto-fire tick.
  if (this.m_pWeaponInfo.m_bFireMode === 2) {
    // TODO(asm-ambiguous): the threshold is a static double at
    // [ebx-0x6de68], not 0. Cross-reference strings-n5.txt for cvar
    // candidates (likely sv_burstthreshold or similar).
    const BURST_THRESHOLD =0.0; // placeholder; see TODO above
    if (this.m_flTimeWeaponIdle <= BURST_THRESHOLD) {
      if (this.m_pWeaponInfo.m_iShotsRemaining > 0) {
        this.Fire();
        this.m_pWeaponInfo.m_iShotsRemaining--;
      } else {
        this.m_pWeaponInfo.m_iShotsRemaining = 0;
      }
    }
  }

  // 4. Don't idle if next primary attack hasn't elapsed.
  const currentTime = UTIL_WeaponTimeBase();
  if (currentTime < this.m_flNextPrimaryAttack /* [esi+0xa8] */) {
    return;
  }

  // 5. Grenade state → delegate and exit.
  // TODO(asm-ambiguous): [m_pPlayer+0x348] ==2 — likely m_iWeaponState.
  if (this.m_pPlayer.m_iWeaponState === 2) {
    this.GrenadeIdle(0);
    return;
  }

  // 6. Out of ammo + not infinite-clips → virtual call.
  // Note: this is the SAME vtable slot as step 9 below, just with
  // different args. The TS must not rename them differently.
  if (
    InfiniteClips(this.m_pPlayer) === 0 &&
    this.m_pWeaponInfo.m_iAmmo <= 0
  ) {
    // TODO(asm-ambiguous): [this+0x60]+0x188 with one arg = this.
    // The target function is not yet identified — D.4 work.
    this.callVtable(/* offset */ 0x188, /* args */ [this]);
    return;
  }

  // 7. No ammo → bail.
  if (this.m_pWeaponInfo.m_iAmmo === 0) {
    return;
  }

  // 8. Schedule next idle tick.
  // TODO(asm-ambiguous): [ebx-0x6e768] is a static double, likely
  // sv_idleinterval or ts_idleplus. Not yet resolved.
  this.m_flNextPrimaryAttack = currentTime + TS_IDLE_RANDOM_INTERVAL;

  // 9. Pick an anim ID. m_pAmmoSource was set in step 2; we read
  // its first short here.
  const animId =
    this.m_pWeaponInfo.m_pAmmoSource !== null
      ? this.m_pWeaponInfo.m_pAmmoSource.readShort(0)
      : 0;

  // 10. Final virtual call.
  // TODO(asm-ambiguous): [this+0x60]+0x174, 4 args. The fourth arg
  // is loaded from *(*this + 0x114) — a vtable-relative read of the
  // base-class vtable, NOT a field of this.
  this.callVtable(/* offset */ 0x174, /* args */ [
    this,
    animId,
    0,
    this.__vtable_base.readDword(0x114) /* vtable slot */,
  ]);
}
