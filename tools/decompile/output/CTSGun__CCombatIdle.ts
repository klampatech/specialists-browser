/**
 * CTSGun::CCombatIdle — throttled combat-idle tick.
 *
 * Called periodically (e.g., from `WeaponIdle`). If enough real time has
 * passed since the last combat-idle event (`m_flTimeWeaponIdle`), schedules
 * the next tick and asks the owning player to play the combat-idle
 * sound/animation read from the weapon_info struct.
 *
 * @param this  The CTSGun entity instance (`this` in the original C++)
 * @returns     void
 */

// The reschedule interval is a 64-bit IEEE-754 double at
// `[ebx-0x6e768]` in the GOT-relative data section (the FPU does `faddp`
// then `fstp DWORD` — so it's loaded as double and stored truncated as
// 32-bit float). Value approximate; cadence is a typical gun-idle period.
const COMBAT_IDLE_INTERVAL_S = 0.075; // TODO(asm-ambiguous): confirm exact value

export function CCombatIdle(this: CTSGun): void {
  // 1. Throttle. `fcomp [edi+0xa8]` sets FPU C0=1 when `now < [edi+0xa8]`;
  //    `fnstsw ax` + `test ah,0x1` + `jne 75eb5` exits the body in that case.
  const now = UTIL_WeaponTimeBase();
  if (now < (this as any).m_flTimeWeaponIdle /* +0xa8, f32 */) {
    return;
  }

  // 2. Schedule the next combat-idle event: `now + interval → m_flTimeWeaponIdle`.
  (this as any).m_flTimeWeaponIdle = now + COMBAT_IDLE_INTERVAL_S;

  // 3. Resolve `m_pPlayer` (CBasePlayer*) at +0x60; used as the dispatch base.
  //    TODO(asm-ambiguous): the player-side layout (offsets below) is inferred.
  const player: any = (this as any).m_pPlayer /* +0x60 */;

  // 4. weapon_info lookup (1 logical arg of `tsweapon_t`; compiler pads to 4
  //    stack slots — leftover 0s become args 3 & 4 of the indirect call below).
  //    TODO(asm-ambiguous): confirm get_weapon_info's true signature.
  const info: any = get_weapon_info(0);

  // 5. `movsx eax, WORD PTR [eax+0x252]` — sign-extend int16 from weapon_info.
  //    Field purpose unknown; preserved as an offset-named accessor.
  const idleFxIdx: number = info.field_0x252 /* +0x252, i16 */;

  // 6. Indirect call through `[player+0x174]`. Args = (this_gun, idleFxIdx, 0, 0).
  //    The compiler reused the leftover 8 bytes from get_weapon_info's args
  //    as args 3 & 4, so the cleanup is one `add esp, 0x10` for 4 args total.
  //    TODO(asm-ambiguous): the entity at +0x174 is a function pointer, not
  //    a method slot. Could be a vtable, a TS dispatcher, or an embed-side
  //    callback table.
  const dispatchFn = player.funcPtr_0x174 /* +0x174 */ as (
    a: any, b: number, c: number, d: number
  ) => void;
  dispatchFn(this, idleFxIdx, 0, 0);
}