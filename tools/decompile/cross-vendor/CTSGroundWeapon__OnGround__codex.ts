```typescript
/**
 * CTSGroundWeapon::OnGround — finalize the "weapon resting on the ground"
 * state after a fall. Lights it up, clears a render flag, re-asserts the
 * origin, shrinks the bounding box, and resets the wait/respawn state.
 *
 * @param this  The CTSGroundWeapon entity instance (this in the original C++)
 * @returns     void
 */
export function OnGround(this: CTSGroundWeapon): void {
  const pev = this.pev;

  // Light up the pickup so players notice it on the ground.
  // TODO(asm-ambiguous): offset 0x10C is being set to 1 — likely `effects`
  // (EF_BRIGHTFIELD) or `renderfx` depending on the exact entvars_s layout
  // for this build.
  pev.effects = 1;

  // Clear bit 7 of the takedamage field (offset 0x118).
  // TODO(asm-ambiguous): the exact pev field is not clear without checking
  // the build's entvars_s layout.
  pev.takedamage &= 0xffffff7f;

  // Re-assert origin — value is unchanged, but the engine needs the call
  // to recompute collision state after the fall.
  UTIL_SetOrigin(pev, pev.origin);

  // Shrink the bounding box to a small cube. The min and max scalars are
  // pulled from .rodata globals (most likely the canonical HL1 pickup
  // -2..+2, applied component-wise to all three axes).
  UTIL_SetSize(
    pev,
    { x: g_groundWeaponMinSize, y: g_groundWeaponMinSize, z: g_groundWeaponMinSize },
    { x: g_groundWeaponMaxSize, y: g_groundWeaponMaxSize, z: g_groundWeaponMaxSize },
  );

  // Reset the internal "wait for pickup" state.
  this.m_iCount = 0;                          // offset 0x0C — ammo count
  this.m_iWait = 0;                           // offset 0x10 — wait ammo index
  // 0xffff0000 as a float is NaN — sentinel: any `> gpGlobals->time`
  // comparison fails, so this write disables the time-based auto-wait.
  this.m_flWait = 0xffff0000;                 // offset 0x14
  this.m_fRespawnTime = g_weaponRespawnCvar;  // offset 0x18 — cached cvar float
}
```
