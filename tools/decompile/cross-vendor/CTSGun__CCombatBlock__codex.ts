```typescript
/**
 * CTSGun::CCombatBlock — execute a combat-block (defensive) action.
 *
 * Validates that no cooldowns are active, the player is in a valid
 * state, and any required stamina threshold is met; then plays the
 * block animation, dispatches the corresponding client event,
 * refreshes the on-screen melee bar, and reschedules the weapon's
 * next attack/idle windows.
 *
 * @param this  The CTSGun entity instance (this in the original C++)
 * @returns     void
 */
export function CCombatBlock(this: CTSGun): void {
  const player: any = this.m_pPlayer;

  // ---- Guard 1: every relevant timestamp must already be in the past ----
  if (UTIL_WeaponTimeBase() < player.m_flNextAttack) return;
  if (UTIL_WeaponTimeBase() < this.m_flNextPrimaryAttack) return;
  if (UTIL_WeaponTimeBase() < this.m_flNextSecondaryAttack) return;
  if (UTIL_WeaponTimeBase() < this.m_flTimeWeaponIdle) return;

  // ---- Guard 2: reject if any of a set of player status bits is set ----
  // TODO(asm-ambiguous): the deref `[[player]+0x250]` reads past the
  // player vtable pointer — most likely `m_pPlayer->pev->flags` (or a
  // similar inner-struct flag word) reached through one extra hop.
  // Mask 0x70c30 is a TS-specific multi-bit status check (frozen /
  // in-water / on-ladder / etc.). Port as `player.statusBits250` until
  // the real source is recovered.
  if ((player.statusBits250 & 0x70c30) !== 0) return;

  // ---- Guard 3: player must meet a stamina / threshold cvar ----
  // TODO(asm-ambiguous): field at player+0x774 is a float (likely
  // stamina or block meter); cvar at GOT offset -0x6f3f0 — verify
  // name via strings-n5.txt (likely ts_block_stamina or similar).
  if (player.blockStamina < cvar_blockStaminaThreshold) return;

  // ---- Load the block-duration cvar once for re-use below ----
  const blockDuration: number = cvar_blockDuration; // GOT offset -0x6ec2c

  // ---- Pick the event index and which player field to update, based
  //      on the current combat/animation state ----
  let eventIdx: number;
  if (this.field_0xcc === 0) {
    // Branch A: gun is in a clean state.
    eventIdx = 1;
    player.field_0x7a8 = blockDuration;
  } else if (this.field_0xd0 !== 0) {
    // Branch B/C: gun has a state struct pointer; inspect its byte.
    const stateByte = (this.field_0xd0 as { byte_0x348: number }).byte_0x348 & 0xff;
    if (stateByte === 0x0a) {
      player.field_0x7b0 = blockDuration;
      eventIdx = 0x12;
    } else if (stateByte === 0x03) {
      player.field_0x7ac = blockDuration;
      eventIdx = 0x12;
    } else {
      eventIdx = 0;
    }
  } else {
    eventIdx = 0;
  }

  // ---- Dispatch the client-side playback event for the block ----
  // TODO(asm-ambiguous): vfunc at offset 0x1ec on a singleton pointed
  // to by GOT+0x1aa8 (likely gEngfuncs / HUD engine table). Arg
  // layout mirrors PLAYBACK_EVENT / PLAYBACK_EVENT_FULL but the exact
  // packing is engine-specific. Listed below in push order
  // (last-pushed = arg1):
  engineSingleton.vfunc_0x1ec(
    /* arg1  (flags)      */ 1,
    /* arg2  (who)        */ player.field_0x208,
    /* arg3  (eventIndex) */ this.field_0x96c & 0xffff,
    /* arg4               */ 0,
    /* arg5               */ global_eventIndex, // GOT+0x1888 (pushed twice)
    /* arg6               */ global_eventIndex,
    /* arg7               */ this.field_0xc8,
    /* arg8               */ 0,
    /* arg9               */ 0,
    /* arg10 (iparam?)    */ eventIdx,
    /* arg11              */ 0,
    /* arg12              */ 0,
  );

  // ---- Play the block animation (sequence index 0x26 = 38) ----
  // The CTSAnimation instance is embedded at player+0x28c.
  Animate(player.field_0x28c, player, 0x26);

  // ---- Refresh the on-screen melee bar to 33.0f (0x42040000) ----
  UpdateMeleeBar(player, 33.0);

  // ---- Schedule the next attack and idle windows ----
  const t = UTIL_WeaponTimeBase();
  const nextAttack = t + blockDuration;
  this.m_flNextPrimaryAttack = nextAttack;
  this.m_flNextSecondaryAttack = nextAttack;
  this.m_flNextReload = t + cvar_blockIdleDelay; // field at 0xa8; cvar at GOT-0x6de98
}
```
