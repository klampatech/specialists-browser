```typescript
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
export function HolsterWeapon(this: CTSGun): void {
  const self: any = this;
  const player: any = self.m_pPlayer;

  // (1) Mark this as the player's currently-active item.
  player.m_pActiveItem = self;

  // (2) Reset two view-related fields on the player's pev
  // (in standard HL pev: ideal_yaw.x and ideal_yaw.y).
  player.pev.ideal_yaw.x = 0;
  player.pev.ideal_yaw.y = 0;

  // (3) Cancel any zoom.
  self.Unzoom();

  // (4) Copy a global slow-motion flag byte into two player fields.
  // TODO(asm-ambiguous): the source is a single byte at [GOT-0x6f7b9].
  // Likely ts_slowmotion or a related cvar/flag. Destinations:
  // player+0x478 and player+0xb58.
  const slowmoFlag: number = (globalThis as any).__byte_got_m0x6f7b9;
  player.slowmo_field_0x478 = slowmoFlag;
  player.slowmo_field_0xb58 = slowmoFlag;

  // (5) Schedule next-attack times.
  // TODO: cvar at [GOT-0x6f010] is the player next-attack delay.
  player.m_flNextAttack =
    UTIL_WeaponTimeBase() + (globalThis as any).__double_got_m0x6f010;
  // TODO: cvar at [GOT-0x6e768] is the weapon next-primary-attack delay.
  self.m_flNextPrimaryAttack =
    UTIL_WeaponTimeBase() + (globalThis as any).__double_got_m0x6e768;

  // (6) Cancel reload if it's in progress.
  // Condition: player[0x79c] == reloadCvar AND player[0x7a4] != 0.
  // The fcomp/jne combo skips the reset when the floats are not equal.
  // TODO(asm-ambiguous): the field trio at +0x79c (float), +0x7a0
  // (dword), +0x7a4 (byte) is the player's reload state.
  const reloadCvar: number = (globalThis as any).__float_got_m0x6f408;
  if (player.reload_state_0x79c === reloadCvar
      && player.reload_flag_0x7a4 !== 0) {
    player.reload_state_0x79c = 0;
    player.reload_state_0x7a0 = 0;
    player.reload_flag_0x7a4 = 0;
  }

  // Skip stages 7-11 if the player is dead.
  // TODO(asm-ambiguous): the disassembly actually calls a virtual
  // function on some subobject of the player (via [m_pPlayer+0x60]+0xb4),
  // not a direct IsAlive() on the player. Treating as a "player is
  // alive?" check at the high level.
  if (player != null && player.IsAlive() === 0) {
    return;
  }

  // (7) Grenade state cleanup.
  if (self.m_pGrenadeState != null && self.m_pGrenadeEntity != null) {
    if (self.m_pGrenadeEntity.some_state === 2) {
      // Grenade is in state 2 ("primed/thrown"); let GrenadeIdle handle it.
      self.GrenadeIdle(1);
    } else {
      // Otherwise just zero the grenade-state fields.
      self.m_pGrenadeState.state_field_0xc = 0;
      self.m_pGrenadeState.state_field_0x8 = 0;
    }
  }
  self.m_pPrimeGrenade = 0;     // offset 0xc8
  self.m_pGrenadeState = 0;     // offset 0xcc
  self.m_pGrenadeEntity = 0;    // offset 0xd0

  // (8) Compute and store a view-yaw value on the player's pev.
  // TODO(asm-ambiguous): the result is pointer-sized, suggesting this
  // is setting a pointer rather than a numeric yaw. Magic constant
  // 0x132 is unclear.
  const wi: any = get_weapon_info(0);  // TS_WEAPON_NONE
  const globalPtr: any = (globalThis as any).__ptr_got_p0x1600;
  player.pev.field_0xbc =
    (wi as number) - globalPtr[0].field_0x98 + 0x132;

  // (9) Set the weapon animation via a virtual call.
  // TODO(asm-ambiguous): [self+0x60] is used as a vtable; the call is
  // (*[self+0x60]+0x174)(self, anim). The receiver is likely m_pPlayer
  // or a subobject. The anim arg is a sign-extended 16-bit field from
  // get_weapon_info(0)->field_0x256.
  const animIdx: number =
    ((get_weapon_info(0) as any).field_0x256 << 16) >> 16;
  const receiver: any = self.field_0x60;
  receiver.vtable[0x174 / 4].call(self, animIdx);

  // (10) Play the holster event via the engine's playback event system.
  // TODO(asm-ambiguous): 13-arg call. The arg mapping below is
  // inferred from typical engine conventions; verify against the
  // engine's PLAYBACK_EVENT_FULL signature when full type info
  // is available.
  const eventVtableObj: any = (globalThis as any).__ptr_got_p0x1aa8;
  const eventIdx: number = self.m_usHolsterEvent & 0xffff;  // u16 at 0x976
  const someGlobal: number = (globalThis as any).__dword_got_p0x1888;
  const pInvoker: number = (player.pev as any).field_0x208;
  eventVtableObj.vtable[0x1ec / 4].call(
    1,                     // flags
    pInvoker,              // m_pPlayer->pev+0x208
    eventIdx,              // this->m_usHolsterEvent
    0,                     // delay
    0, 0,                  // origin (x, y)
    someGlobal,            // origin z / fparam1
    someGlobal,            // angles x / fparam2
    0,                     // angles y
    self.m_pPrimeGrenade,  // iparam1 (this+0xc8)
    0,                     // iparam2
    0, 0                   // bparam1, bparam2
  );

  // (11) Clear clip and ammo counters.
  self.m_iClip = 0;          // offset 0x9fc
  self.m_iAmmo = 0;          // offset 0xa00
  self.m_iReserveAmmo = 0;   // offset 0xa04
}
```
