// External symbols — declared as any for cross-vendor isolation-compile.
declare const CTSGun: any;
declare function UTIL_WeaponTimeBase(): number;
declare const cvar_blockDuration: number;
declare const cvar_blockStaminaThreshold: number;
declare const cvar_blockIdleDelay: number;
declare const global_eventIndex: number;
declare const engineSingleton: { vfunc_0x1ec: (...args: any[]) => void };
declare function Animate(thisPtr: any, player: any, sequence: number): void;
declare function UpdateMeleeBar(player: any, value: number): void;

/**
 * CTSGun::CCombatBlock — execute a combat-block (defensive) action.
 *
 * Validates that no cooldowns are active, the player is in a valid
 * state, and any required stamina threshold is met; then plays the
 * block animation, dispatches the corresponding client event,
 * refreshes the on-screen melee bar, and reschedules the weapon's
 * next attack/idle windows.
 *
 * @param this  The CTSGun entity instance.
 */
export function CCombatBlock(this: any): void {
  const player: any = this.field_0x80; // pointer; likely m_pPlayer.

  // ---- Guard 1: stored timestamps must all be ≤ now. ----
  if (UTIL_WeaponTimeBase() < player.field_0x12c) return;
  if (UTIL_WeaponTimeBase() < this.field_0x9c)   return;
  if (UTIL_WeaponTimeBase() < this.field_0xa0)   return;
  if (UTIL_WeaponTimeBase() < this.field_0xa4)   return;

  // ---- Guard 2: reject if any of a set of player sub-struct status bits is set. ----
  // TODO(asm-ambiguous): deref chain is [[m_pPlayer]+0]+0x250. The 0x70c30 mask is faithful.
  const innerPlayer: any = (player as any)[0]; // first field of player; plausibly pev.
  if (((innerPlayer as any).field_0x250 & 0x70c30) !== 0) return;

  // ---- Guard 3: player stamina/charge must meet the threshold cvar. ----
  // TODO(asm-ambiguous): cvar identity; verify via strings-n5.txt
  // (likely ts_block_stamina_threshold or similar).
  if (player.field_0x774 < cvar_blockStaminaThreshold) return;

  // ---- Load the block-duration cvar once for re-use below. ----
  const blockDuration: number = cvar_blockDuration; // GOT-relative cvar at -0x6ec2c.

  // ---- Pick the event index and which player field to update. ----
  let eventIdx: number = 0;
  if (this.field_0xcc === 0) {
    // Branch A: gun is in a clean state.
    eventIdx = 1;
    player.field_0x7a8 = blockDuration;
  } else if (this.field_0xd0 !== 0) {
    // Branch B/C: gun has a state struct pointer.
    // esi (=eventIdx) is set to 0x12 UNCONDITIONALLY when this branch is entered
    // (see 0x75fb9 jumping directly to 0x75fc7 for the "neither" sub-case),
    // so lift the assignment outside the inner if-else.
    const stateByte: number =
      (this.field_0xd0 as { byte_0x348: number }).byte_0x348 & 0xff;
    if (stateByte === 0x0a) {
      player.field_0x7b0 = blockDuration;
    } else if (stateByte === 0x03) {
      player.field_0x7ac = blockDuration;
    }
    // (No "else" — the "neither" sub-case still reaches esi = 0x12.)
    eventIdx = 0x12;
  }
  // (Else: eventIdx stays 0; the field_0xd0 == 0 sub-case reaches esi unchanged
  //  via the 0x75f8b je → 0x75fcc jmp.)

  // ---- Dispatch the client-side playback event for the block. ----
  // TODO(asm-ambiguous): vfunc identity at engine interface offset 0x1ec (index
  // ~123) doesn't match standard pfnPlaybackEvent; this is a TS-specific engine
  // entry. arg5/arg6 receive the same `global_eventIndex` value (pushed twice in
  // succession — see 0x75ff6/0x75ff7). arg2 is read with one extra deref beyond
  // `player`: *(*m_pPlayer + 0x208) — see Bug 2.
  const playerInnerPtr: any = (player as any)[0]; // re-deref *m_pPlayer.
  engineSingleton.vfunc_0x1ec(
    /* arg1  (flags) */ 1,
    /* arg2  (who) */ playerInnerPtr.field_0x208,
    /* arg3 (eventindex, 16-bit) */ this.field_0x96c & 0xffff,
    /* arg4 */ 0,
    /* arg5 */ global_eventIndex,
    /* arg6 */ global_eventIndex,
    /* arg7 (float) */ this.field_0xc8,
    /* arg8 */ 0,
    /* arg9 */ 0,
    /* arg10 (iparam) */ eventIdx,
    /* arg11 */ 0,
    /* arg12 */ 0,
  );

  // ---- Play the block animation (sequence 0x26 = 38). ----
  Animate(player.field_0x28c, player, 0x26);

  // ---- Refresh the on-screen melee bar to 33.0f (0x42040000). ----
  UpdateMeleeBar(player, 33.0);

  // ---- Schedule the next attack and idle windows. ----
  const t: number = UTIL_WeaponTimeBase();
  const nextAttack: number = t + blockDuration;
  this.field_0xa0 = nextAttack;
  this.field_0x9c = nextAttack;
  this.field_0xa8 = t + cvar_blockIdleDelay; // cvar at GOT -0x6de98.
}
