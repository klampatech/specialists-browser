// Compile-isolation stubs (would be in a shared header in a
// real build). Mark these as TODOs and remove when the engine
// bindings and CTSGun class land.
type CTSGun = any;
declare function emitSound(
  channel: number,
  sample: any,
  entindex: number,
  arg4: any,
  pitch1: number,
  pitch2: number,
  volume: number,
  arg8: any,
  arg9: any,
  arg10: any,
  arg11: any,
  arg12: any
): void;
declare function UTIL_WeaponTimeBase(): number;
declare const g_pPlayerInfo: any;
declare const g_iShotgunPitch: number;
declare const g_flShotgunReloadDelay: number;
declare const g_flShotgunCockDelay: number;

/**
 * CTSGun::ShotgunReload — multi-shell shotgun reload state machine.
 *
 * Three states in m_pWeaponStatus.state (offset +0x8):
 *   0 = idle  — kick off a reload if reserve ammo > 0 AND clip < maxClip
 *   1 = active — insert a shell on each per-shell timer tick
 *   2 = cock   — pump action, return to state 0, reset timings
 *
 * Each state emits a distinct sound (volumes 8.0, 9.0, 10.0)
 * via the engine's pfnEmitSound (g_engfuncs offset 0x1ec).
 */
export function ShotgunReload(this: CTSGun): void {
  const status: any = this.m_pWeaponStatus; // +0xcc
  const info: any   = this.m_pWeaponInfo;    // +0xd0
  const state: number = status.state;       // +0x8

  // ===== State 0: begin a new reload =====
  if (state === 0) {
    const weaponIdx: number = info.weaponIndex;     // +0x8 (byte)
    const ammo: number      = this.m_iAmmo[weaponIdx]; // +eax*4+0xd4
    const maxClip: number   = info.maxClip;          // +0x4

    // Bail if no ammo or clip already full.
    if (ammo <= 0) return;
    if (status.clip >= maxClip) return;

    this.unzoom();

    // Lazy-init the per-player reload offset on the player's pev.
    // m_iReloadOffset is at pev+0xbc (verified: 74b04-74b0e does
    // the second deref before testing).
    const pev: any = this.m_pPlayer.pev;
    if (pev.m_iReloadOffset === 0) {                 // +0xbc
      const playerInfo: any = g_pPlayerInfo.inner;   // [ebx+0x1600] deref
      // TODO(asm-ambiguous): 0x98 and 0x132 are magic — likely
      // a server-tick offset or a base-index into a table.
      const offset: number =
        info.weaponIndex /* +0xd0 base */ -
        playerInfo.something /* +0x98 */ +
        0x132;
      pev.m_iReloadOffset = offset;
    }

    status.state = 1;

    // "Reload start" sound (volume 8.0 = 0x41000000).
    // 12-arg pfnEmitSound call: matches 74b46-74b80 push order.
    emitSound(
      1,                              // arg1 channel
      pev.message,                    // arg2 sample (pev+0x208)
      this.m_iSoundEntindex,          // arg3 entindex (this+0x970, word)
      0,                              // arg4
      g_iShotgunPitch,                // arg5 pitch ([ebx+0x1888])
      g_iShotgunPitch,                // arg6 pitch (pushed twice)
      8.0,                            // arg7 volume
      0,                              // arg8
      this.m_iUnknown,                // arg9 (this+0xc8)
      status.reloadTime,              // arg10 (weaponStatus+0x10)
      0,                              // arg11
      0                               // arg12
    );

    // Four timer writes. NOTE: the first one (m_flTimeWeaponIdle)
    // is at m_pPlayer+0x12c, a CBasePlayer field — NOT pev+0x12c.
    // The disassembly (74b8e-74b9c) does `mov eax,[esi+0x80];
    // fstp [eax+0x12c]` with NO second deref. The other three
    // are direct `this+offset` writes.
    const now: number = UTIL_WeaponTimeBase();
    const delay: number = g_flShotgunReloadDelay; // [ebx-0x6de58]

    this.m_pPlayer.m_flTimeWeaponIdle = now + delay; // m_pPlayer+0x12c
    this.m_flNextReload               = now + delay; // this+0xa8
    this.m_flNextPrimaryAttack        = now + delay; // this+0x9c
    this.m_flNextSecondaryAttack      = now + delay; // this+0xa0
    return;
  }

  // ===== State 1: insert a shell =====
  if (state === 1) {
    const now: number = UTIL_WeaponTimeBase();

    // fcomp + fnstsw + test ah,0x1 + jne at 74bf0-74c00 checks
    // C0 (ST(0) < operand). Bail until the per-shell tick expires.
    if (now < this.m_flNextReload) return;

    const weaponIdx: number = info.weaponIndex;
    const ammo: number      = this.m_iAmmo[weaponIdx];
    const maxClip: number   = info.maxClip;

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
    // 74ca1-74caf: fadd [eax+0x14]; fstp [esi+0xa8]
    this.m_flNextReload = now + info.perShellTime; // weaponInfo+0x14
    return;
  }

  // ===== State 2: cock / finalize =====
  if (state === 2) {
    status.state = 0;
    status.byteFlag24 = 0;                       // weaponStatus+0x24

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
    // Same m_pPlayer+0x12c caveat as state 0 — see 74d2d-74d3b.
    const now: number = UTIL_WeaponTimeBase();
    this.m_pPlayer.m_flTimeWeaponIdle = now + g_flShotgunReloadDelay; // m_pPlayer+0x12c
    this.m_flNextReload               = now + g_flShotgunCockDelay;   // this+0xa8
    return;
  }
}
