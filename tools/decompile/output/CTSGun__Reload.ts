/**
 * CTSGun::Reload — Dispatch a player-initiated reload to weapon-specific
 * logic, or perform a standard ammo-then-clip refill for non-special modes.
 *
 * @param this  The CTSGun entity instance (owner weapon).
 * @returns     void
 */

// Minimal field stubs — populated by the full CTSGun definition (D.4).
// Comments show offsets inferred from the disassembly.
interface CTSGun {
  m_pPlayer: any;                        // [+0x80] CBasePlayer*
  m_iId: number;                         // [+0xc8] weapon id (tsweapon_t)
  m_pCombat: null | {                    // [+0xcc]
    count: number;                       // [+0x04]
    flag: number;                        // [+0x08] likely "reload-in-progress"
    eventParam: any;                     // [+0x10] fed into pfnPlaybackEvent
    weaponData: null | {                 // [+0x28]
      clip2: number;                     // [+0x02] default-path clipSize (signed word)
      clip16: number;                    // [+0x10] grenade-path clipSize (signed word)
    };
  };
  m_pItemInfo: null | {                  // [+0xd0]
    ammoCount: number;                   // [+0x04]
    modeIndex: number;                   // [+0x08]
    timeMul: number;                     // [+0x14]
    mode: number;                        // [+0x348]
  };
  m_rgAmmo: Int32Array;                  // [+0xd4] ammo counts indexed by modeIndex
  m_flTimeWeaponIdle: number;            // [+0xa8]
  m_usEvent: number;                     // [+0x970] weapon-event id

  CCombatBlock(): void;
  ShotgunReload(): void;
  ReloadWeapon(ammoType: number, clipSize: number, reloadTime: number): number;
  Unzoom(): void;
}

// Engine-side stubs so this file compiles in isolation.
// TODO(cvar/engine): wire these up to the engine cvar lookup and g_engfuncs.
declare function UTIL_WeaponTimeBase(): number;
declare const cvarReloadTime: { value: number };
declare const cvarReloadIdleDelay: { value: number };
declare const g_engfuncs: {
  pfnPlaybackEvent(flags: number, ...args: any[]): void;
};

export function Reload(this: CTSGun): void {
  // 1) No combat-info → record a combat-block frame and exit.
  if (this.m_pCombat == null) {
    this.CCombatBlock();
    return;
  }

  // 2) Mode dispatch via m_pItemInfo.mode (byte at [+0xd0]+0x348).
  //    0x02 → no-op; 0x03/0x0a → CCombatBlock; 0x01 → ShotgunReload.
  const mode = this.m_pItemInfo!.mode;
  if (mode === 0x02) return;
  if (mode === 0x03) { this.CCombatBlock(); return; }
  if (mode === 0x0a) { this.CCombatBlock(); return; }
  if (mode === 0x01) { this.ShotgunReload(); return; }

  // 3) Bail if the ammo slot for this mode is empty.
  //    m_pItemInfo.modeIndex (+0x08) indexes m_rgAmmo (+0xd4).
  const ammoSlot = this.m_rgAmmo[this.m_pItemInfo!.modeIndex];
  if (ammoSlot <= 0) return;

  // 4) Bail if m_pCombat's reload-state flag is non-zero.
  // TODO(asm-ambiguous): confirm [+0xcc]+0x08 is the "reload-in-progress" flag.
  if (this.m_pCombat.flag !== 0) return;

  // 5) Read the 16-bit clipSize. Which offset of m_pCombat.weaponData we
  //    read depends on the held weapon: 0x21 with a positive count reads
  //    [+ptr+0x10]; otherwise read [+ptr+0x02]. The value is movsx-extended.
  const wpData = this.m_pCombat.weaponData;
  let clipSize: number;
  if (this.m_iId === 0x21 && this.m_pCombat.count > 0) {
    clipSize = wpData !== null ? wpData.clip16 : 0;
  } else {
    clipSize = wpData !== null ? wpData.clip2 : 0;
  }

  // 6) reloadTime = reload_cvar * m_pItemInfo.timeMul (+0x14).
  const reloadTime = cvarReloadTime.value * this.m_pItemInfo!.timeMul;
  const ok = this.ReloadWeapon(
    this.m_pItemInfo!.ammoCount,         // [+0xd0]+0x04
    clipSize,
    reloadTime,
  );
  if (ok === 0) return;

  // 7) Schedule the next idle frame.
  this.m_flTimeWeaponIdle = UTIL_WeaponTimeBase() + cvarReloadIdleDelay.value;

  // 8) Cancel any zoom state before the reload plays.
  this.Unzoom();

  // 9) Fire the engine reload playback event (pfnPlaybackEvent).
  //    The original pushes 12 stack slots: flags, invoker edict, eventindex,
  //    origin/angles pair, two fparams, two iparams, two bparams.
  //    Source operands were: 0x1, [edx+0x208] (player-side), m_usEvent, m_iId,
  //    m_pCombat.eventParam, and a duplicated global at [ebx+0x1888].
  // TODO(asm-ambiguous): pin down pfnPlaybackEvent's exact argument layout.
  g_engfuncs.pfnPlaybackEvent(/* flags */ 0x1 /* + 11 game-supplied args */);

  // 10) Drive sequence 0x33 on the player's embedded anim object
  //     ([m_pPlayer + 0x28c]).
  const player = this.m_pPlayer;
  (player as any).anim.Animate(player, 0x33);
}