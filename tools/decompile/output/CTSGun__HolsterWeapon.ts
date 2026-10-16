/**
 * CTSGun::HolsterWeapon — Hides this weapon (called when the player
 * switches weapons, stows, or otherwise un-holsters).
 *
 * Performs the full teardown: marks the player as having this as
 * active item, cancels zoom, resets player view fields, schedules
 * next-attack delays, cancels any in-progress reload, disposes of
 * in-flight grenades, plays a holster event, and zeros the
 * weapon's clip/ammo. Skips the grenade/event/clip-clear stages
 * if the player is dead.
 *
 * @param this  The CTSGun entity instance
 * @returns     void
 */
export function HolsterWeapon(this: any): void {
  const self: any = this;
  const player: any = self.m_pPlayer;

  // (1) Mark this as the player's currently-active item.
  player.m_pActiveItem = self;

  // (2) Reset two view-related fields on the player's pev.
  player.pev.ideal_yaw.x = 0;
  player.pev.ideal_yaw.y = 0;

  // (3) Cancel any zoom.
  self.Unzoom();

  // (4) Copy a global flag byte into two player fields.
  // TODO(asm-ambiguous): source byte at [GOT-0x6f7b9] — likely a
  // ts_slowmotion flag. Destinations are player+0xb58 (first)
  // then player+0x478.
  const slowmoFlag: number = (globalThis as any).__byte_got_m0x6f7b9;
  player.slowmo_field_0xb58 = slowmoFlag;
  player.slowmo_field_0x478 = slowmoFlag;

  // (5) Schedule next-attack times.
  // TODO(asm-ambiguous): globals at [GOT-0x6f010] and [GOT-0x6e768]
  // are the player next-attack and weapon next-primary-attack delay
  // cvars respectively.
  player.m_flNextAttack =
    UTIL_WeaponTimeBase() + (globalThis as any).__double_got_m0x6f010;
  self.m_flNextPrimaryAttack =
    UTIL_WeaponTimeBase() + (globalThis as any).__double_got_m0x6e768;

  // (6) Cancel reload if it's in progress.
  // The fcomp; fnstsw ax; test ah,0x40; jne idiom at 75740-7574b
  // SKIPS the reset when the floats are EQUAL (C3 = FPU "equal"
  // flag). So we reset when they are NOT equal AND player[0x7a4] != 0.
  // TODO(asm-ambiguous): field trio at +0x79c (float), +0x7a0 (dword),
  // +0x7a4 (byte) is the player's reload state.
  const reloadCvar: number = (globalThis as any).__float_got_m0x6f408;
  if (player.reload_state_0x79c !== reloadCvar
      && player.reload_flag_0x7a4 !== 0) {
    player.reload_state_0x79c = 0;
    player.reload_state_0x7a0 = 0;
    player.reload_flag_0x7a4 = 0;
  }

  // (7) If the player is dead, skip the rest (return early).
  // The disassembly jumps to the function epilogue (758c0) when
  // m_pPlayer != 0 && IsAlive() returns 0. If m_pPlayer is null
  // the IsAlive call is skipped and we fall through to the grenade
  // cleanup (in practice unreachable — steps 1-6 deref m_pPlayer).
  // TODO(asm-ambiguous): the virtual is on m_pPlayer->field_0x60
  // (some subobject with its own vtable), slot 0xb4/4 = 45,
  // not a direct IsAlive() on the player.
  if (player != null && player.IsAlive() === 0) {
    return;
  }

  // (8) Grenade state cleanup.
  // TODO(asm-ambiguous): field offsets 0xc8 (m_pPrimeGrenade),
  // 0xcc (m_pGrenadeState), 0xd0 (m_pGrenadeEntity) are TS-specific
  // and need D.4 research for real names.
  if (self.m_pGrenadeState != null && self.m_pGrenadeEntity != null) {
    if (self.m_pGrenadeEntity.some_state === 2) {
      // Grenade is in state 2 ("primed/thrown"); let GrenadeIdle handle it.
      self.GrenadeIdle(1);
    } else {
      // Otherwise just zero the grenade-state fields.
      // TODO(asm-ambiguous): sub-fields at +0xc and +0x8 of the
      // grenade state object.
      self.m_pGrenadeState.state_field_0xc = 0;
      self.m_pGrenadeState.state_field_0x8 = 0;
    }
  }
  self.m_pPrimeGrenade = 0;
  self.m_pGrenadeState = 0;
  self.m_pGrenadeEntity = 0;

  // (9) Pointer arithmetic → store at player->pev+0xbc.
  // The disassembly overwrites the slot that was just zeroed at
  // step (2) with a pointer-sized value computed from the weapon
  // info table. Semantics unclear — may be a TS pev extension that
  // happens to share offset 0xbc with ideal_yaw.x.
  // TODO(asm-ambiguous): magic constant 0x132; semantics unclear.
  const wi: any = get_weapon_info(0);
  const globalPtr: any = (globalThis as any).__ptr_got_p0x1600;
  player.pev.field_0xbc =
    (wi as number) - globalPtr[0].field_0x98 + 0x132;

  // (10) Send weapon animation via virtual call.
  // TODO(asm-ambiguous): [self+0x60] is used as a vtable base;
  // slot 0x174/4 = 93 is a TS-extended virtual. The anim arg is
  // a sign-extended 16-bit field from get_weapon_info(0)->field_0x256.
  const animIdx: number =
    ((get_weapon_info(0) as any).field_0x256 << 16) >> 16;
  const receiver: any = self.field_0x60;
  receiver.vtable[0x174 / 4].call(self, animIdx);

  // (11) Play the holster event via the engine's pfnPlaybackEvent.
  // Signature (HLSDK enginefuncs_t):
  //   pfnPlaybackEvent(int flags, edict_t* pInvoker, uint16 eventindex,
  //                    float delay, const float* origin, const float* angles,
  //                    float fparam1, float fparam2,
  //                    int iparam1, int iparam2, int bparam1, int bparam2);
  // Disassembly pushes 12 dwords (cleanup: add esp, 0x30).
  // TODO(asm-ambiguous): this->0x976 (eventindex), pev+0x208 (invoker),
  // global dword at [GOT+0x1888] (fparam1/fparam2) need D.4 research.
  const eventVtableObj: any = (globalThis as any).__ptr_got_p0x1aa8;
  const eventIdx: number = self.m_usHolsterEvent & 0xffff;  // u16 at 0x976
  const someGlobal: number = (globalThis as any).__dword_got_p0x1888;
  const pInvoker: number = (player.pev as any).field_0x208;
  eventVtableObj.vtable[0x1ec / 4].call(
    1,             // flags
    pInvoker,      // m_pPlayer->pev+0x208
    eventIdx,      // this->0x976 (eventindex, unsigned 16-bit)
    0,             // delay
    null,          // origin (float*, NULL)
    null,          // angles (float*, NULL)
    someGlobal,    // fparam1
    someGlobal,    // fparam2
    0,             // iparam1
    0,             // iparam2
    0,             // bparam1 (this->0xc8 was zeroed at step 8)
    0              // bparam2
  );

  // (12) Clear clip and ammo counters.
  // TODO(asm-ambiguous): field offsets 0x9fc, 0xa00, 0xa04 are
  // TS-specific and need D.4 research for real names.
  self.m_iClip = 0;          // offset 0x9fc
  self.m_iAmmo = 0;          // offset 0xa00
  self.m_iReserveAmmo = 0;   // offset 0xa04
}
