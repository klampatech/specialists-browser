```typescript
/**
 * CTSGun::MultiplyClips — tops up the active weapon's clip to 2x its
 * maximum size, optionally drawing ammo from the player's reload pool
 * (with a per-clip multiplier). Also updates per-weapon stat arrays
 * when applicable. Returns true on success, false when the weapon is
 * in an invalid state for the operation.
 *
 * @param this  The CTSGun entity instance (this in the original C++)
 * @returns     true if the clip was multiplied, false otherwise
 */
export function MultiplyClips(this: CTSGun): boolean {
  // Guard: both required pointer fields must be non-null.
  if (this.m_pAmmoState == null || this.m_pWeaponDef == null) {
    return false;
  }
  // Guard: don't operate while in weapon state 24 (a reload state).
  if (this.m_iState === 24) {
    return false;
  }

  // Cancel any in-progress reload before doing the multiply.
  this.StopReload();

  const def = this.m_pWeaponDef;
  const ammo = this.m_pAmmoState;

  if (def.m_bUseReloadPool !== 0) {
    // Pool-based path: drain ammo from the owner's reload pool
    // (cost scales with m_bClipMultiplier), top up the clip, and
    // re-derive the owner's movement speed from carried weight.
    const clipSize = def.m_iClipSize;
    const mult = def.m_bClipMultiplier;
    const needed = (clipSize * 2 - ammo.m_iAmmo) * mult;
    const pool = this.m_pPlayer.m_iReloadPool; // CBasePlayer +0x548
    const cost = needed < pool ? needed : pool;
    const gained = Math.trunc(cost / mult);

    this.m_pPlayer.m_iReloadPool -= cost;
    const speed = GetSpeedBySlots(this.m_pPlayer);
    this.m_pPlayer.SetPlayerSpeed(speed);

    ammo.m_iAmmo += gained;
    return true;
  }

  // Free path: instantly fill the clip to 2x its max at no pool cost.
  ammo.m_iAmmo = def.m_iClipSize * 2;

  if (def.m_iIndex1 !== -1) {
    // Update the per-weapon stat arrays at index m_iIndex1.
    const idx = def.m_iIndex1;
    const cvar = AMMO_MULT_CVAR; // TODO: identify via strings-n5.txt ([ebx-0x6ec2c])
    this.m_rgStatA[idx] += Math.trunc(cvar * ammo.m_iAmmo); // this + idx*56 + 0x118
    this.m_rgStatB[idx] = ammo.m_iAmmo;                    // this + idx*56 + 0x130
    return true;
  }

  // Special case: m_iIndex1 == -1 but the weapon's mode byte is 4 or 5.
  if (def.m_bMode === 4 || def.m_bMode === 5) {
    const cvar = AMMO_MULT_CVAR; // TODO: identify via strings-n5.txt
    const v = Math.trunc(cvar * ammo.m_iAmmo);
    ammo.m_iField1C = v;
    ammo.m_iField20 = v;

    if (def.m_iIndex2 !== -1) {
      this.m_rgStatA[def.m_iIndex2] = v; // this + idx*56 + 0x118
    }
  }

  return true;
}
```
