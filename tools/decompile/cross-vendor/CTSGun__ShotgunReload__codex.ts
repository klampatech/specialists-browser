```typescript
/**
 * CTSGun::ShotgunReload — multi-shell shotgun reload state machine.
 *
 * Three states are stored in `m_pWeaponStatus.state` (offset +0x8):
 *   0 = idle — kick off a reload if ammo > 0 AND clip < maxClip
 *   1 = active — insert a shell on each per-shell timer tick
 *   2 = cock — pump action, return to state 0, reset timings
 *
 * Each state emits a distinct sound (volumes 8.0, 9.0, 10.0 respectively)
 * via a TS-extended 12-arg EMIT_SOUND call against the player entity.
 *
 * @param this  The CTSGun entity (this in original C++)
 * @returns     void
 */
export function ShotgunReload(this: CTSGun): void {
  const status: any = this.m_pWeaponStatus; // +0xcc
  const info: any = this.m_pWeaponInfo;               // +0xd0
  const state: number = status.state;                 // +0x8

  // ===== State 0: begin a new reload =====
  if (state === 0) {
    const weaponIdx: number = info.weaponIndex;       // +0x8 (byte)
    const ammo: number = this.m_iAmmo[weaponIdx];     // +eax*4+0xd4
    const maxClip: number = info.maxClip;             // +0x4

    // Bail if no ammo or clip already full.
    if (ammo <= 0) return;
    if (status.clip >= maxClip) return;

    this.unzoom();

    // Lazy-init the per-player reload offset on the player pev.
    // eax = (weaponInfo - [g_pPlayerInfo.inner.+0x98]) + 0x132
    // TODO(asm-ambiguous): 0x132 is a magic constant — likely a server-tick offset.
    const pev: any = this.m_pPlayer.pev;
    if (pev.m_iReloadOffset === 0) {                  // +0xbc
      const playerInfo: any = g_pPlayerInfo.inner;    // [ebx+0x1600] deref
      const offset: number = info.someOffset - playerInfo.something + 0x132;
      pev.m_iReloadOffset = offset;
    }

    status.state = 1;

    // "Reload start" sound (volume 8.0 = 0x41000000).
    emitSound(
      1,                             // arg1 flags
      pev.message,                   // arg2 sample (pev+0x208)
      this.m_iSoundEntindex,         // arg3 entindex (this+0x970, word)
      0,                             // arg4
      g_iShotgunPitch,               // arg5 pitch ([ebx+0x1888])
      g_iShotgunPitch,               // arg6 pitch (pushed twice — range/modulation?)
      8.0,                           // arg7 volume
      0,                             // arg8
      this.m_iUnknown,               // arg9 (this+0xc8)
      status.reloadTime,             // arg10 (weaponStatus+0x10)
      0,                             // arg11
      0                              // arg12
    );

    // Schedule reload start; block primary/secondary/idle.
    const now: number = UTIL_WeaponTimeBase();
    const reloadDelay: number = g_flShotgunReloadDelay;       // [ebx-0x6de58]

    pev.m_flTimeWeaponIdle = now + reloadDelay;               // pev+0x12c
    this.m_flNextReload = now + reloadDelay;                  // this+0xa8
    this.m_flNextPrimaryAttack = now + reloadDelay;            // this+0xa0
    this.m_flNextSecondaryAttack = now + reloadDelay;          // this+0x9c
    return;
  }

  // ===== State 1: insert a shell =====
  if (state === 1) {
    const now: number = UTIL_WeaponTimeBase();

    // fcomp+jne checks C0 (ST(0) < operand): bail until the tick expires.
    if (now < this.m_flNextReload) return;

    const weaponIdx: number = info.weaponIndex;
    const ammo: number = this.m_iAmmo[weaponIdx];
    const maxClip: number = info.maxClip;

    // Out of ammo or full clip → transition to cock.
    if (ammo <= 0 || status.clip >= maxClip) {
      status.state = 2;
      return;
    }

    // Consume one shell from reserve; add one to the clip.
    this.m_iAmmo[weaponIdx]--;
    status.clip++;

    const pev: any = this.m_pPlayer.pev;
    // "Shell in" sound (volume 9.0 = 0x41100000).
    emitSound(
      1,
      pev.message,
      this.m_iSoundEntindex,
      0,
      g_iShotgunPitch,
      g_iShotgunPitch,
      9.0,
      0,
      this.m_iUnknown,
      status.reloadTime,
      0,
      0
    );

    // Schedule next shell-in tick.
    this.m_flNextReload = now + info.perShellTime;             // weaponInfo+0x14
    return;
  }

  // ===== State 2: cock / finalize =====
  if (state === 2) {
    status.state = 0;
    status.byteFlag24 = 0;                                     // weaponStatus+0x24

    const pev: any = this.m_pPlayer.pev;
    // "Cock" sound (volume 10.0 = 0x41200000).
    emitSound(
      1,
      pev.message,
      this.m_iSoundEntindex,
      0,
      g_iShotgunPitch,
      g_iShotgunPitch,
      10.0,
      0,
      this.m_iUnknown,
      status.reloadTime,
      0,
      0
    );

    // Reset idle timer and post-cock reload lockout.
    const now: number = UTIL_WeaponTimeBase();
    pev.m_flTimeWeaponIdle = now + g_flShotgunReloadDelay;     // [ebx-0x6de58]
    this.m_flNextReload = now + g_flShotgunCockDelay;          // [ebx-0x6e768]
    return;
  }
}
```
