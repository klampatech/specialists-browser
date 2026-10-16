export function KnifeFire(this: CTSGun): void {
  const player  = this.m_pPlayer;
  const wepInfo = this.m_pWeaponInfo;
  const knife   = this.m_pKnife;
  if (knife === null) return;

  const pev = player.pev;

  // ---- 1. Slow-motion decision (used for damage / times only) ----------
  const fSlowMo   = (player + 0x250 /* FL_* */) (0x70c30) !== 0;
  const cSlowAmt  = cvarFloat(/* slowamt */);   // firetime scale
  const cSlowNext = cvarFloat(/* ts_slowmotion_delay */); // [+0x6e768]
  const cSlowDmg  = cvarFloat(/* ts_slowmotion_dmg */);   // [+0x6def0]
  const cIdle     = cvarFloat(/* ts_knife_idle */);       // [+0x6df78]

  // ---- 2. Schedule next attack / idle / anim times ----------------------
  let flDelay = wepInfo.m_flPrimaryAttack;  // [wepInfo+0x18]
  if (fSlowMo) flDelay *= cSlowAmt;

  const flBase = UTIL_WeaponTimeBase();
  this.m_flNextPrimaryAttack   = flBase + flDelay;        // [this+0xa0]
  this.m_flTimeWeaponIdle      = flBase + flDelay;        // [this+0x9c]
  this.m_flNextSecondaryAttack = flBase + cSlowNext;      // [this+0xa8]
  (player + 0x4f8)/* m_flWeaponAnimTime */ = flDelay;

  // Refresh forward / right / up from the player's view angle.
  UTIL_MakeVectors(pev + 0x74 /* v_angle.x */);

  let bFired = false;
  let engaged = false;

  // =====================================================================
  // THROW branch — knife.m_bThrow != 0
  // =====================================================================
  if (knife.m_bThrow !== 0) {
    // Predicted eyepoint: origin + velocity (lead the target).
    const aimStart: Vec3 = [pev.x,            pev.y,            pev.z           ];
    const aimEnd:   Vec3 = [(pev + 0x174).x,   (pev + 0x174).y,   (pev + 0x174).z ]; // velocity
    const tr = UTIL_TraceLine(aimStart, aimEnd, 0, player.edict);

    const iThrowMode = wepInfo.m_iMode;  // [wepInfo+0x20]

    // mode 6 picks one damage scale, others pick the default.
    const spawnEnd: Vec3 = (iThrowMode === 6) ? aimEnd : tr.vecEndPos;
    const dart = CTSKnife.CreateKnife(player, aimStart, spawnEnd, iThrowMode);

    if (dart !== null) {
      // Build the throw direction; the disassembly forms it from
      // v_forward +/- v_right/v_up (offsets +0x28 / +0x40 from gpGlobals),
      // then divides by its length and a KNIFE_SPEED scale.
      const dir: Vec3 = [vForward.x, vForward.y, vForward.z];
      const len = Math.hypot(dir.x, dir.y, dir.z);
      let ux: number, uy: number, uz: number;
      if (len <= 1e-6) {
        ux = 0; uy = 0; uz = -1;
      } else {
        const inv = KNIFE_SPEED / len;
        ux = dir.x * inv; uy = dir.y * inv; uz = dir.z * inv;
      }

      const angles: Vec3 = [0, 0, 0];
      UTIL_VecToAngles([ux, uy, uz], angles);

      dart.pev.angles = [angles[0], angles[1], angles[2]];
      dart.pev.angularVelocity = [50.0, 0.0, -50.0]; // 0x42b40000 / 0xc4a28000
    }

    bFired = true;

    // Animate if NOT in slowmo-style FL_* bits AND the player has its
    // anim-flag byte set. NB: this gate does NOT re-test fSlowMo.
    if ( ( (player + 0x250) (0x30c30) ) === 0
        && ((player + 0x1a5) /* BYTE */ & 0x2) !== 0) {
      this.m_pAnimation.Animate(player, 32);             // THROW seq
    }

    // Sound: filename = "weapons/knife_throw.wav" (resolved at [ebx-0x6dc7e]).
    EMIT_SOUND_DYN(
      player.edict,
      RANDOM_LONG(0, 0x1f) + 95 + 0x5f,
      SOUND_KNIFE_THROW,         // (ebx - 0x6dc7e)
      /* vol    */ 1.0,
      /* attn   */ 0.4,                                  // 0x3f4ccccd
      /* pitch  */ 0.7,                                  // 0x3f000000
      /* chan   */ 4,
    );

  // =====================================================================
  // MELEE branch — knife.m_bThrow == 0
  // =====================================================================
  } else {
    // Pick swing anim 29..31. NB: gate does NOT check +0x250 either; it
    // just re-tests fSlowMo at the top of this branch.
    if ( !fSlowMo && ((player + 0x1a5) /* BYTE */ & 0x2) !== 0) {
      this.m_pAnimation.Animate(player, RANDOM_LONG(0, 2) + 29);
    }

    // Damage: slowmo cvar * per-player melee multiplier.
    let flDamage = wepInfo.m_flDamage;                   // [wepInfo+0x1c]
    if (fSlowMo) flDamage *= cSlowDmg;
    flDamage *= player.GetMeleeMultiplier();

    // Hull-trace in the player's view direction (clip-monster hull = 3).
    const aimStart: Vec3 = [
      pev.x + (pev + 0x110).x, pev.y + (pev + 0x110).y, pev.z + (pev + 0x110).z,
    ];
    const aimEnd:   Vec3 = [
      aimStart[0] + vForward.x /* *reach */,
      aimStart[1] + vForward.y /* *reach */,
      aimStart[2] + vForward.z /* *reach */,
    ];
    const tr = player.CheckHull(aimStart, aimEnd, /* hull */ 3);

    if (tr.flFraction < 1.0 /* the [ebx-0x6f018] == 1.0qword */) {
      let victim: CBaseEntity | null = tr.pHit ?? null;
      if (victim === null) victim = player.FindUseTarget(null);

      if (victim !== null
          && victim.IsAlive()
          && !VictimKnifeHold(player, victim, flDamage)) {
        engaged = true;
        ClearMultiDamage();
        const aimLocal: Vec3 = [vForward.x, vForward.y, vForward.z];
        victim.TakeDamage(
          player.pev, player.pev, flDamage,
          0x1004 /* DMG_SLASH | DMG_NEVERGIB */,
          aimLocal,
        );
        ApplyMultiDamage(player.pev, player.pev);

        // vtable 0xc8 is CBaseEntity::ApplyTraceBleed-ish; its return
        // decides whether the cosmetic hit-sfx fires. NB: even when it
        // returns 0 we still leave `engaged = true` here — the fumble
        // decision is about whether we hit, not whether the sfx played.
        const bHitSfx = victim.ApplyTraceBleed(/* params */);
        if (bHitSfx) {
          knife.m_iHit = 1;          // [knife+0x8]
          this.m_iHits = 1;          // [this+0x114]
          EMIT_SOUND_DYN(
            player.edict,
            RANDOM_LONG(0, 0x1f) + 95 + 0x5f,
            SOUND_KNIFE_HIT,        // (ebx - 0x6df30)
            /* vol   */ 1.0,
            /* attn  */ 0.4,
            /* pitch */ 0.5,
            /* chan  */ 4,
          );
        }
      }
    }

    if (!engaged) {
      // Miss: drive fumble-pose times back onto the player.
      (player + 0x79c) /* m_flAnimTime2 */ = cIdle * wepInfo.m_flPrimaryAttack;
      (player + 0x7a0) /* m_flAnimTime  */ = flDamage;
      (player + 0x7a4) /* m_bAnimating  */ = 1;
    }

    bFired = true;

    // Broadcast the swing to everyone.
    ENGINE.MESSAGE_BEGIN(1, SVC_WEAPONANIM, null, player.edict);
    ENGINE.MESSAGE_WRITE_BYTE(knife.m_iHit);
    ENGINE.MESSAGE_WRITE_SHORT(player + 0x972 /* LOWORD */);
    ENGINE.MESSAGE_END();
  }

  // =====================================================================
  // Post-fire bookkeeping (THROW and MELEE both land here).
  // =====================================================================
  if (bFired) {
    if (!InfiniteClips(player)) {
      (player + 0x548) /* m_iAmmoKnife */ += ((wepInfo + 0xd0) & 0xff);
      SetPlayerSpeed(player, player.GetSpeedBySlots());
      knife.m_iClip--;                                  // [knife+0x4]
    }

    if (knife.m_iClip > 0) {
      // Recoil / follow-up anim — vtable 0x174 using m_hOwner (knife+0x28).
      const hOwner = (knife + 0x28) !== null
        ? (knife + 0x28)
        : 0;
      this.Recoil(hOwner, /* model idx */ player + 0x976);

      // Re-schedule next primary and broadcast the follow-up animation
      // (a second MESSAGE_BEGIN with the secondary model index).
      ENGINE.MESSAGE_BEGIN(1, SVC_WEAPONANIM, null, player.edict);
      ENGINE.MESSAGE_WRITE_BYTE(knife.m_iClip);
      ENGINE.MESSAGE_WRITE_SHORT(player + 0x976);
      ENGINE.MESSAGE_END();
      this.m_flNextPrimaryAttack =
        UTIL_WeaponTimeBase() + /* qword at [ebx-0x6de50] */ 0.0 /* TODO resolve */;
    } else {
      this.DropWeapon(this.m_iId /* [this+0xc8] */, 1);
    }
  }
}
