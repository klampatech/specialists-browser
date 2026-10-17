```typescript
// TODO: replace with proper engine singleton accessor once the TS SDK is
// reverse-engineered; declared as `any` so this file compiles standalone.
declare const engineGlobal: any;

/**
 * CTSGun::Unzoom — exits the scoped/zoomed view on this weapon.
 *
 * 1. Resets the owning player's FOV override to 0 (the engine treats 0 as
 *    "use default field of view", which snaps the camera out of the scope).
 * 2. If the player already has a queued next-zoom time, leave it alone.
 * 3. Otherwise, if this weapon carries a recorded zoom-out timestamp,
 *    compute a new next-zoom cooldown as
 *        weaponZoomOutTime - engineTime + 0x132
 *    and store it on the player.
 *
 * @param this  The CTSGun weapon entity (this in the original C++)
 * @returns     void
 */
export function Unzoom(this: CTSGun): void {
  // TODO: CTSGun / CBasePlayer types not yet defined; cast to `any`.
  const gun = this as any;
  const player = gun.m_pPlayer as any;

  // (1) Clear the player's FOV override.
  // Offset 0x214 on CBasePlayer maps to m_iFOV in the HL1 SDK; setting it to
  // 0 makes the client snap to the default (non-zoomed) field of view.
  // TODO(asm-ambiguous): confirm 0x214 == CBasePlayer::m_iFOV via TS SDK header.
  player.m_iFOV = 0;

  // (2) If a next-zoom cooldown is already armed on the player, keep it.
  // TODO(asm-ambiguous): offset 0xbc on CBasePlayer — purpose inferred from
  // the "skip if non-zero" guard; most likely a cooldown timer.
  if (player.m_flNextZoomTime !== 0) {
    return;
  }

  // (3) If this weapon has no recorded zoom-out timestamp, do nothing.
  // TODO(asm-ambiguous): offset 0xd0 on CTSGun — purpose inferred from the
  // "skip if zero" guard; most likely the timestamp captured when the weapon
  // entered the zoomed state (e.g. set by CTSGun::Zoom).
  if (gun.m_flZoomOutTime === 0) {
    return;
  }

  // (4) Compute the new next-zoom cooldown:
  //     player.m_flNextZoomTime = gun.m_flZoomOutTime - engineTime + 0x132
  //
  // The global at [ebx+0x1600] (PIC-relative) is a pointer to an engine
  // singleton (likely the engine's globals struct); the field at offset 0x98
  // inside it is read here as the engine's current time.
  // TODO(asm-ambiguous): identify the global at [ebx+0x1600]; offset 0x98 on
  // the inner struct is most likely gpGlobals->time but should be cross-checked
  // against the TS SDK.
  const engineTime = (engineGlobal as any).field_0x98;
  player.m_flNextZoomTime = gun.m_flZoomOutTime - engineTime + 0x132;
}
```
