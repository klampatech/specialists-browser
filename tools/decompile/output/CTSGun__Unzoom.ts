// TODO: replace with proper engine singleton accessor once the TS SDK is
// reverse-engineered; declared as `any` so this file compiles standalone.
declare const engineGlobal: any;

/**
 * CTSGun::Unzoom — exits the scoped/zoomed view on this weapon.
 *
 * Sequence (from the disassembly):
 *   1. Player's FOV override → 0 (snaps camera out of scope).
 *   2. If a next-zoom cooldown is already armed, leave it alone.
 *   3. If the weapon has no recorded zoom-out timestamp, do nothing.
 *   4. Otherwise, store `m_flZoomOutTime - engineTime + 0x132` as
 *      the new next-zoom cooldown.
 *
 * Notes:
 *   - The disassembly uses INTEGER ops (`sub`/`add`) on the
 *     timestamp fields. The HL SDK `m_fl*` naming is a misnomer in
 *     this code path — these are likely ints.
 *   - The FOV reset hits offset 0x214 on `pev`, not on CBasePlayer
 *     directly. `m_iFOV` is the SDK alias for `pev->fov`, so the
 *     double deref is hidden in the alias.
 *   - The engine-time chain is `[ebx+0x1600] → *ptr → +0x98`,
 *     flattened here behind the `engineGlobal` placeholder.
 */
export function Unzoom(this: any): void {
  const gun = this as any;

  // (1) Reset the player's FOV override. Disassembly chain:
  //     m_pPlayer → pev → +0x214. `m_iFOV` is the SDK alias for
  //     `pev->fov`, so this collapses to a single assignment.
  // TODO(asm-ambiguous): confirm 0x214 == pev->fov in the TS SDK.
  gun.m_pPlayer.m_iFOV = 0;

  // (2) If a next-zoom cooldown is already armed on the player,
  //     leave it alone.
  // TODO(asm-ambiguous): offset 0xbc on pev — purpose inferred from
  //     the "skip if non-zero" guard; most likely a cooldown timer.
  if (gun.m_pPlayer.m_flNextZoomTime !== 0) {
    return;
  }

  // (3) If this weapon has no recorded zoom-out timestamp, do
  //     nothing.
  // TODO(asm-ambiguous): offset 0xd0 on CTSGun — purpose inferred
  //     from the "skip if zero" guard; most likely the timestamp
  //     captured when the weapon entered the zoomed state (set by
  //     CTSGun::Zoom).
  if (gun.m_flZoomOutTime === 0) {
    return;
  }

  // (4) Compute and store the new next-zoom cooldown. The literal
  //     `0x132` (= 306) is added as an integer in the disassembly,
  //     not as 306.0f. In TS the literal is just a number, but the
  //     surrounding fields are likely ints.
  // TODO(asm-ambiguous): identify the global at `[ebx+0x1600]`; the
  //     `engineGlobal` placeholder hides the indirection chain.
  const engineTime = (engineGlobal as any).field_0x98;
  gun.m_pPlayer.m_flNextZoomTime =
    gun.m_flZoomOutTime - engineTime + 0x132;
}
