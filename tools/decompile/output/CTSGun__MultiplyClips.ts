/**
 * CTSGun::MultiplyClips — tops up the active weapon's clip to
 * 2x its base size. Two strategies depending on whether the
 * weapon uses a reload pool (def.m_bUseReloadPool at def+0xdc):
 *
 *   - With pool: drain `mult * (2*max - current)` units from
 *     the player's pool (clamped to pool size), recompute
 *     player speed via GetSpeedBySlots, add `cost / mult` to
 *     the clip.
 *   - Without pool: instantly set the clip to `2 * base` and
 *     update per-weapon stat arrays at indices idx1/idx2 if
 *     defined.
 *
 * Returns false if the weapon isn't in a valid state (missing
 * ammo-state / weapon-def pointers, or in reload state 24).
 */
export function MultiplyClips(this: CTSGun): boolean {
  // Guards: both required pointer fields must be non-null.
  if (this.m_pAmmoState == null || this.m_pWeaponDef == null) {
    return false;
  }
  // Guard: don't operate while in state 24 (reload).
  if (this.m_iState === 24) {
    return false;
  }

  this.StopReload();

  const def = this.m_pWeaponDef;
  const ammo = this.m_pAmmoState;

  if (def.m_bUseReloadPool !== 0) {
    // Pool path: def+0x24 is the max clip size used here.
    const maxClip = def.m_iMaxClip;        // def + 0x24
    const mult = def.m_bClipMultiplier;     // def + 0xd0 (byte)
    const needed = (maxClip * 2 - ammo.m_iAmmo) * mult;
    const player = this.m_pPlayer; // this + 0x80
    const pool = player.m_iReloadPool;      // player + 0x548
    const cost = needed < pool ? needed : pool;
    const gained = Math.trunc(cost / mult);

    player.m_iReloadPool -= cost;
    player.SetPlayerSpeed(GetSpeedBySlots(player));

    ammo.m_iAmmo += gained;
    return true;
  }

  // Free path: def+0x4 is the *base* clip size — DIFFERENT
  // field from the pool path's m_iMaxClip (def+0x24).
  ammo.m_iAmmo = def.m_iBaseClip * 2;       // def + 0x4

  // Update per-weapon stat arrays at idx1 if defined.
  if (def.m_iIndex1 !== -1) {              // def + 0xc8
    const idx = def.m_iIndex1;
    // TODO(asm-ambiguous): identify via strings-n5.txt — the
    // float constant loaded from [ebx-0x6ec2c].
    const cvar = AMMO_MULT_CVAR;
    this.m_rgStatA[idx] += Math.trunc(cvar * ammo.m_iAmmo); // this + idx*56 + 0x118
    this.m_rgStatB[idx] = ammo.m_iAmmo;                     // this + idx*56 + 0x130
    return true;
  }

  // Special case: no idx1, but weapon mode byte (def+0x348)
  // is 4 or 5 (likely shotgun / revolver classes — D.4 will
  // confirm via the weapon-def enum).
  if (def.m_bMode === 4 || def.m_bMode === 5) {
    const cvar = AMMO_MULT_CVAR;
    const v = Math.trunc(cvar * ammo.m_iAmmo);
    ammo.m_iField1C = v;   // ammo + 0x1c
    ammo.m_iField20 = v;   // ammo + 0x20
    if (def.m_iIndex2 !== -1) {  // def + 0xcc
      this.m_rgStatA[def.m_iIndex2] = v; // this + idx2*56 + 0x118
    }
  }

  return true;
}
