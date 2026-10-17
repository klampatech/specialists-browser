```typescript
/**
 * CTSGroundWeapon::GetWeapon — handles a player attempting to pick up this ground weapon.
 *
 * Performs eligibility checks, optional team/cash validation (in cash-based game modes),
 * the actual pickup, ammo top-up, sound + HUD message emission, respawn scheduling,
 * and target firing.
 *
 * @param this       The ground weapon entity (CTSGroundWeapon*)
 * @param pEntity     The entity attempting pickup (CBaseEntity*, typically a player)
 * @returns void
 */
export function GetWeapon(this: any /* CTSGroundWeapon */, pEntity: any /* CBaseEntity */): void {
  // ── Basic eligibility checks ───────────────────────────────────────
  if (!pEntity.IsPlayer()) return;                        // virtual: [pEntity+0x60] vtable+0xc8
  if (!pEntity.IsAlive()) return;                         // virtual: [pEntity+0x60] vtable+0xb4

  // "Being-removed" status byte on the pev of both entities — abort if negative
  // TODO(asm-ambiguous): exact entvars field meaning unclear
  if ((this.pev[0x118] as int8) < 0) return;
  if ((pEntity.pev[0x118] as int8) < 0) return;

  // Clamp ammo count to non-negative (treat any negative value as 0)
  if (this.m_iAmmoCount < 0) {
    this.m_iAmmoCount = 0;
  }

  // ── Cash-based mode: team + affordability checks ──────────────────
  let cost = 0;
  const gameMode = this.pev[0x1a0] as number;             // likely iuser1 — game-mode flag

  if (CashBased(gameMode) && this.m_bRequireTeam !== 0) {
    const teamId = g_TeamId;                              // [ebx+0x14f0]

    // Only enforce team restriction when teamplay is on (low byte ∈ {2, 3})
    // and this weapon has a specific team assignment
    if (((teamId & 0xff) === 2 || (teamId & 0xff) === 3) && this.m_iTeam !== -1) {
      const playerTeamNum = pEntity.GetTeamNumber();     // virtual: [pEntity+0x60] vtable+0xd0
      if (GetTeamIndex(teamId, playerTeamNum) !== this.m_iTeam) {
        TSHudMessageOne(0, 0, 0, 0x10, 0x1e, g_szWrongTeamMsg, pEntity.pev);
        return;
      }
    }

    // Compute total cost: base cost + per-flag premiums + ammo cost
    const wpnInfo = get_weapon_info(this.m_iWeaponId);
    cost = wpnInfo.m_iCost;                               // wpnInfo+0xd8
    if (gameMode & 0x1) cost += 0x384;
    if (gameMode & 0x2) cost += 0x320;
    if (gameMode & 0x4) cost += 0x1f4;
    if (gameMode & 0x8) cost += 0x708;
    const ammoInfo = get_ammo_info(wpnInfo.m_iAmmoType);   // ammoType is at wpnInfo+0x8
    cost += ammoInfo.m_iCost * this.m_iAmmoCount;         // ammoInfo+0x4 is per-round cost

    if (pEntity.m_iCash < cost) {                          // [pEntity+0x540]
      TSHudMessageOne(0, 0, 0, 0x10, 0x1e, g_szNoCashMsg, pEntity.pev);
      return;
    }
  }

  // ── Pickup ────────────────────────────────────────────────────────
  // TODO(asm-ambiguous): the void*/int arg meanings aren't fully mapped from asm —
  //   the void* is 0 (NULL context), the int is the cached gameMode. The trailing
  //   bool distinguishes the kick weapon (0x1d) from real weapons
  //   (allow pickup as primary weapon).
  const picked = pEntity.PickUpWeapon(
    this.m_iWeaponId,
    null,
    gameMode,
    this.m_iWeaponId !== 0x1d
  );
  if (!picked) return;

  // ── Post-pickup effects ───────────────────────────────────────────
  pEntity.GiveCash(-cost);

  // TODO: offset meanings unclear
  this.field_0x14 = 0;
  this.field_0x18 = 0;
  this.pev[0x118] |= 0x80;                                // set some flag (FL_NOTARGET-ish)

  // ── Schedule respawn ──────────────────────────────────────────────
  if (this.m_iRespawnDelay > 0 || (g_TeamId & 0xff) < 2 || (g_TeamId & 0xff) > 3) {
    this.field_0xc = 0xFFFF0000;                          // -65536 (packed flag/countdown)
    this.field_0x10 = g_iRespawnInterval;                 // [ebx+0x1a20]

    const baseTime = g_pGameRules.GetTime();
    let delaySeconds: number;
    if (this.m_iRespawnDelay > 1) {
      delaySeconds = Math.min(this.m_iRespawnDelay, 180); // cap at 180s
    } else if (this.m_iRespawnDelay === 1) {
      delaySeconds = FLOAT_RESPAWN_CONSTANT_A;            // [ebx-0x6f018] double
    } else {
      delaySeconds = FLOAT_RESPAWN_CONSTANT_B;            // [ebx-0x6e760] double
    }
    this.pev[0x104] = baseTime + delaySeconds;            // next-think
  } else {
    this.field_0xc = 0;
    this.field_0x10 = 0;
  }

  // ── Ammo top-up + pickup sound ────────────────────────────────────
  if (this.m_iAmmoCount > 0) {
    const ammoType = get_weapon_info(this.m_iWeaponId).m_iAmmoType;
    if (pEntity.m_rgAmmo[ammoType] <= 0) {                // [pEntity[0xa10] + ammoType*4 + 0xd4]
      const added = pEntity.AddAmmo(this.m_iAmmoCount, ammoType);
      if (added > 0) {
        // TODO(asm-ambiguous): asm pushes 8 dwords; demangled sig has 7. The 8th push
        //   ([ebx-0x6ec2c]) is unaccounted for in the demangled signature.
        EMIT_SOUND_DYN(
          pEntity.edict(),                                // [pEntity[0] + 0x208]
          3,                                              // channel
          g_szPickupSound,                                // [ebx-0x6c8da]
          g_flPickupVolume,                               // [ebx-0x6f3fc]
          g_flPickupAttenuation,                          // [ebx-0x6e7e4]
          0,                                              // flags
          100                                             // pitch (push 0x64)
        );
      }
    }
  }

  // ── HUD pickup message ────────────────────────────────────────────
  if (this.pev[0x1d4] !== 0) {
    const displayTime = g_pGameRules.GetTime() + this.pev[0x1d4];
    // TODO(asm-ambiguous): asm pushes 7 dwords; demangled sig has 6. 6th arg here is the
    //   computed displayTime (an int), not a char* as the demangled sig implies — the
    //   signature is likely missing one arg.
    TSHudMessageOne(0, 0, 0, 0x8, 0x1e, displayTime, pEntity.pev);
  }

  // ── Fire target entities ──────────────────────────────────────────
  if (this.pev[0x1c8] !== 0) {
    // TODO(asm-ambiguous): demangled sig has 4 args; asm has 5 pushes. The 2 CBaseEntity*
    //   args are (pActivator, pCaller) — both = this.
    FireTargets(this.pev[0x1c8], this, this, USE_TOGGLE, 0);
  }
}
```
