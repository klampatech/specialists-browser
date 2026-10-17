/**
 * CTSGroundWeapon::GetWeapon — handles a player attempting to pick up this ground weapon.
 *
 * Performs eligibility checks, optional team/cash validation (in cash-based game modes),
 * the actual pickup, ammo top-up, sound + HUD message emission, respawn scheduling,
 * and target firing.
 *
 * Generated from asm at 0x00092328 (932 B). Base class method —
 * CTSBigPistolWeapon::GetWeapon (0xb9cd0) calls into this.
 */
export function GetWeapon(this: any /* CTSGroundWeapon */, pEntity: any /* CBaseEntity */): void {
  // ── Basic eligibility checks ───────────────────────────────────────
  if (!pEntity.IsPlayer()) return;                        // virtual: [pEntity+0x60] vtable+0xc8
  if (!pEntity.IsAlive()) return;                         // virtual: [pEntity+0x60] vtable+0xb4

  // "Being-removed" status byte on the pev of both entities — abort if negative.
  // (asm order: pEntity first, then this)
  // TODO(asm-ambiguous): exact entvars field meaning unclear; 0x118 is past
  //   standard entvars_t — likely a TS-specific extension.
  if ((pEntity.pev[0x118] as int8) < 0) return;
  if ((this.pev[0x118] as int8) < 0) return;

  // Clamp ammo count to non-negative (branchless "max(x, 0)" pattern in asm:
  //   shr 31; dec; and → if (x<0) x=0 else x unchanged)
  if (this.m_iAmmoCount < 0) this.m_iAmmoCount = 0;

  // ── Cash-based mode: team + affordability checks ──────────────────
  let cost = 0;
  const gameMode = pEntity.pev[0x1a0] as number;           // pev iuser1-style field

  if (CashBased(gameMode) && this.m_bRequireTeam !== 0) {
    const teamId = g_TeamId;                              // [ebx+0x14f0]

    // asm: sub al,2; cmp al,1; ja → team check fires only when the low byte
    // of [g_TeamId] is in {2, 3} (the wrap-around cases al=0,al=1 also ja-jump,
    // which is the same as "al ∈ {2,3}"). m_iTeam == -1 means "no team restriction".
    if (((teamId & 0xff) === 2 || (teamId & 0xff) === 3) && this.m_iTeam !== -1) {
      const playerTeamName = pEntity.GetTeamNumber();    // virtual: [pEntity+0x60] vtable+0xd0
      // TS order (esi, eax) matches the asm push order
      // (esi = g_TeamRules = [ebx+0x14f0], eax = team name from GetTeamNumber).
      if (GetTeamIndex(teamId, playerTeamName) !== this.m_iTeam) {
        TSHudMessageOne(0, 0, 0, 0x10, 0x1e, g_szWrongTeamMsg, pEntity.pev);
        return;
      }
    }

    // Compute total cost: base + per-flag premiums + ammo cost.
    // asm flags are 0x1/0x2/0x4/0x8 of gameMode (gameMode saved at [esp+0x4]
    // before the CashBased() call to survive across it).
    const wpnInfo = get_weapon_info(this.m_iWeaponId);
    cost = wpnInfo.m_iCost;                               // wpnInfo+0xd8
    if (gameMode & 0x1) cost += 0x384;
    if (gameMode & 0x2) cost += 0x320;
    if (gameMode & 0x4) cost += 0x1f4;
    if (gameMode & 0x8) cost += 0x708;
    // asm calls get_weapon_info again to read ammoType; TS optimizes to reuse
    // the cached wpnInfo (pure lookup, no side effects).
    const ammoInfo = get_ammo_info(wpnInfo.m_iAmmoType);   // ammoType at wpnInfo+0x8
    cost += ammoInfo.m_iCost * this.m_iAmmoCount;         // ammoInfo+0x4 per-round cost

    if (pEntity.m_iCash < cost) {                          // [pEntity+0x540]
      TSHudMessageOne(0, 0, 0, 0x10, 0x1e, g_szNoCashMsg, pEntity.pev);
      return;
    }
  }

  // ── Pickup ────────────────────────────────────────────────────────
  // asm push order: ebp(=pEntity), m_iWeaponId, 0, gameMode, ax.
  // cdecl right-to-left: arg1=ax, arg2=gameMode, arg3=0, arg4=m_iWeaponId, arg5=ebp.
  // If __cdecl member, this=ebp=pEntity, and the 4 explicit args are below.
  // 0x1d is the kick weapon id — PickUpWeapon treats it differently (allow
  // pickup as primary even if it conflicts).
  // TODO(asm-ambiguous): demangler has 5 args + T4 (opaque); cross-vendor with
  //   the PickUpWeapon body to confirm whether the T4 is `this` (folded) or
  //   a real 5th arg.
  const picked = pEntity.PickUpWeapon(
    this.m_iWeaponId,
    null,
    gameMode,
    this.m_iWeaponId !== 0x1d
  );
  if (!picked) return;

  // ── Post-pickup effects ───────────────────────────────────────────
  pEntity.GiveCash(-cost);

  // TODO(asm-ambiguous): fields at 0x14/0x18 are written but unnamed.
  this.field_0x14 = 0;
  this.field_0x18 = 0;
  this.pev[0x118] |= 0x80;                                // FL_NOTARGET-ish

  // ── Schedule respawn ──────────────────────────────────────────────
  // asm: do respawn unless (m_iRespawnDelay <= 0 AND al ∈ {2, 3}).
  // The TS's `> 0 || < 2 || > 3` is the same condition.
  const teamModeByte = (g_TeamId & 0xff) as number;
  if (this.m_iRespawnDelay > 0 || teamModeByte < 2 || teamModeByte > 3) {
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
    const ammoType = wpnInfo.m_iAmmoType;
    // [pEntity+0xa10 + ammoType*4 + 0xd4] — base m_rgAmmo at 0xa10, offset 0xd4
    // is the standard CBasePlayer ammo array.
    if (pEntity.m_rgAmmo[ammoType] <= 0) {
      // TODO(asm-ambiguous): asm reuses homing space — 4 stack values are
      //   left on the stack at call-time (m_iAmmoCount, m_iWeaponId, ammoType,
      //   pEntity+0xa10). Demangler only sees 2 args. The actual signature
      //   needs cross-vendoring with CTSGun::AddAmmo.
      const added = pEntity.AddAmmo(this.m_iAmmoCount, ammoType);
      if (added > 0) {
        // TODO(asm-ambiguous): 8th arg [ebx-0x6ec2c] is unaccounted for in
        //   the demangled 7-arg signature. Possibly a sender-index / delegate
        //   variant flag. weapons.ts:774 already declares EMIT_SOUND_DYN with
        //   8 args; just need the value here.
        EMIT_SOUND_DYN(
          pEntity.edict(),                                // [pEntity->pev + 0x208]
          3,                                              // channel
          g_szPickupSound,                                // [ebx-0x6c8da]
          g_flPickupVolume,                               // [ebx-0x6f3fc]
          g_flPickupAttenuation,                          // [ebx-0x6e7e4]
          0,                                              // flags
          100,                                            // pitch (push 0x64)
          /* [ebx-0x6ec2c] */ g_szSoundDelegate            // 8th arg (sender / delegate)
        );
      }
    }
  }

  // ── HUD pickup message ────────────────────────────────────────────
  if (this.pev[0x1d4] !== 0) {
    // 6th arg is the STRING() expansion of this->pev->[0x1d4] — the standard
    // GoldSrc pStringBase+offset pattern. Matches slowmo.ts:273 convention.
    // asm:  eax = gpGlobals->pStringBase; eax += [this->pev + 0x1d4]
    TSHudMessageOne(0, 0, 0, 0x8, 0x1e, STRING(this.pev[0x1d4]), pEntity.pev);
  }

  // ── Fire target entities ──────────────────────────────────────────
  if (this.pev[0x1c8] !== 0) {
    // 1st arg is the STRING() expansion of this->pev->target. Matches the
    // slowmo.ts:279 convention. asm: eax = gpGlobals->pStringBase; eax += [this->pev + 0x1c8]
    FireTargets(STRING(this.pev[0x1c8]), this, this, USE_TOGGLE, 0);
  }
}

// ======================================================================
// STUBS — replaced by the engine-bindings module (g_engfuncs, gpGlobals)
// and the reconstructed CTSGroundWeapon class. Mirrors the declare-block
// pattern in src/mod/weapons.ts and src/mod/slowmo.ts.
// ======================================================================

declare function CashBased(mode: number): boolean;
declare const g_TeamId: number;                     // [ebx+0x14f0]
declare const g_iRespawnInterval: number;           // [ebx+0x1a20]
declare const g_pGameRules: any;                    // g_pGameRules singleton
declare const FLOAT_RESPAWN_CONSTANT_A: number;     // [ebx-0x6f018] double (e.g., 5.0)
declare const FLOAT_RESPAWN_CONSTANT_B: number;     // [ebx-0x6e760] double (e.g., 30.0)
declare const gpGlobals: any;                       // [ebx+0x1600] deref
declare function STRING(offset: number): any;       // gpGlobals.pStringBase + offset
declare function get_weapon_info(weaponType: number): any;
declare function get_ammo_info(ammoType: number): any;
declare function GetTeamIndex(teamRules: any, teamName: any): number;
declare function TSHudMessageOne(
  a: number, b: number, c: number, d: number, e: number,
  msg: any, pev: any
): void;
declare const g_szWrongTeamMsg: any;                // [ebx-0x6b770]
declare const g_szNoCashMsg: any;                   // [ebx-0x6b730]
declare const g_szPickupSound: any;                 // [ebx-0x6c8da]
declare const g_flPickupVolume: number;             // [ebx-0x6f3fc]
declare const g_flPickupAttenuation: number;        // [ebx-0x6e7e4]
declare const g_szSoundDelegate: any;               // [ebx-0x6ec2c]  (TODO: 8th EMIT_SOUND_DYN arg)
declare const USE_TOGGLE: number;                   // USE_TYPE.TOGGLE = 3
declare function FireTargets(
  target: any, pActivator: any, pCaller: any,
  useType: number, delay: number
): void;
