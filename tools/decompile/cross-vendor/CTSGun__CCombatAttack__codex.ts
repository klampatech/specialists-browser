```typescript
/**
 * CTSGun::CCombatAttack — perform a close-combat (melee) attack from the
 * currently held weapon.
 *
 * Decides which kick / punch animation to play and how much damage to deal
 * based on the player's velocity, on-ground / ducking / "frozen" / in-water
 * flags, recent attack history (so the player doesn't repeat the same kick
 * twice in a row), the KungFu powerup, and a melee-multiplier cvar. Then
 * dispatches the hit through CBasePlayer::CloseCombatAttack, optionally
 * triggers a player block, fires the weapon's bullet pattern, and updates
 * the weapon timers.
 *
 * @param this  The CTSGun entity instance.
 */
export function CCombatAttack(this: CTSGun): void {
  // ====== context ======
  const player = this.m_pPlayer;          // [ebp+0x80]
  const pev = player.pev;                 // *m_pPlayer
  const velocity = pev.velocity;          // pev->velocity (offset 0x20)
  const velocityMag = Math.sqrt(
    velocity.x * velocity.x +
    velocity.y * velocity.y +
    velocity.z * velocity.z,
  );                                       // stored into [esp+0x10]

  // close-combat tuning cvars (loaded via [ebx±k] after the PIC setup)
  // TODO(asm-ambiguous): exact cvar names from tools/decompile/analysis/strings-n5.txt
  const closeCombatMain   = cvar_closeCombat_main.value;       // [ebx-0x6f408] ≈ 1.0
  const closeCombatOther  = cvar_closeCombat_other.value;      // [ebx-0x6f3fc] ≈ 1.0
  const closeCombatMax    = cvar_closeCombat_max.value;        // [ebx-0x6f3f8]
  const closeCombatMin    = cvar_closeCombat_min.value;        // [ebx-0x6de8c]
  const closeCombatBigKick = cvar_closeCombat_bigKick.value;   // [ebx-0x6dee8]
  const closeCombatRngLow = cvar_closeCombat_rngLow.value;     // [ebx-0x6de74]
  const closeCombatRngMid = cvar_closeCombat_rngMid.value;     // [ebx-0x6de70]
  const closeCombatDamMul = cvar_closeCombat_damageMul.value;  // [ebx-0x6debc]
  const closeCombatDamMax = cvar_closeCombat_damageMax.value;  // [ebx-0x6dec4]
  const closeCombatLowMul = cvar_closeCombat_lowMul.value;     // QWORD [ebx-0x6ecd8]
  const closeCombatLowMin = cvar_closeCombat_lowMin.value;     // QWORD [ebx-0x6ecc8]
  const closeCombatLowMax = cvar_closeCombat_lowMax.value;     // QWORD [ebx-0x6de20]
  const closeCombatBack = cvar_closeCombat_backKick.value;    // [ebx-0x6dec8]
  const closeCombatBack2  = cvar_closeCombat_backKick2.value;   // [ebx-0x6de6c]
  const closeCombatHigh   = cvar_closeCombat_highKick.value;   // [ebx-0x6df78]
  const closeCombatHigh2  = cvar_closeCombat_highKick2.value;  // [ebx-0x6dee0]
  const closeCombatDur    = cvar_closeCombat_duration.value;   // [ebx-0x6de94]
  const closeCombatDelay  = cvar_closeCombat_delay.value;      // [ebx-0x6df00]
  const closeCombatKickDur= cvar_closeCombat_kickDuration.value;// [ebx-0x6de78]
  const closeCombatKDly    = cvar_closeCombat_kickDelay.value;  // [ebx-0x6de90]
  const closeCombatFarDly  = cvar_closeCombat_farDelay.value;   // [ebx-0x6df04]
  const closeCombatKFDly   = cvar_closeCombat_kfDelay.value;    // [ebx-0x6de80]
  const closeCombatKFDmg   = cvar_closeCombat_kfDamage.value;   // [ebx-0x6de7c]
  const closeCombatSwp     = cvar_closeCombat_sweep.value;      // [ebx-0x6ec2c]
  const closeCombatLowDly  = cvar_closeCombat_lowDelay.value;   // [ebx-0x6de88]
  const closeCombatJmpDly  = cvar_closeCombat_jumpDelay.value;  // [ebx-0x6de84]
  const closeCombatJmpDur  = cvar_closeCombat_jumpDuration.value;//[ebx-0x6e810]
  const closeCombatKFDly2  = cvar_closeCombat_kfDelay2.value;   // [ebx-0x6df04]
  const closeCombatJmpHi   = cvar_closeCombat_jumpHigh.value;   // [ebx-0x6f078]
  const closeCombatJmpLow  = cvar_closeCombat_jumpLow.value;    // [ebx-0x6f06c]
  const closeCombatKFTim   = cvar_closeCombat_kfTime.value;     // [ebx-0x6e7e8]
  const closeCombatKFTim2  = cvar_closeCombat_kfTime2.value;    // [ebx-0x6e7e8]
  const closeCombatLowDt   = cvar_closeCombat_lowDelta.value;   // [ebx-0x6df6c]
  const closeCombatExp = cvar_closeCombat_expDelay.value;   // [ebx-0x6deb0]
  const closeCombatFrzDly  = cvar_closeCombat_frozenDelay.value;// [ebx-0x6f3f4]
  const closeCombatBigKDur = cvar_closeCombat_bigKickDur.value; // [ebx-0x6de8c]
  const closeCombatKickMul = cvar_closeCombat_kickMul.value;    // [ebx-0x6f3fc]
  const closeCombatRngHi   = cvar_closeCombat_rngHi.value;      // [ebx-0x6f010]
  const closeCombatMulti   = cvar_closeCombat_multiplier.value; // QWORD [ebx-0x6de40]

  // ====== early-out: weapon timers ======
  const now = UTIL_WeaponTimeBase();
  if (now < player.m_flNextAttack       /* [esi+0x12c] */) return;
  if (now < this.m_flNextPrimaryAttack  /* [ebp+0x9c]  */) return;
  if (now < this.m_flTimeWeaponIdle     /* [ebp+0xa0]  */) return;

  // ====== local-state defaults ======
  // The original puts these on the stack — re-using local lets here.
  let attackType   = 0;   // [esp+0x14]  2 = forward, 3 = backward
  let damage       = 0;   // [esp+0x2c]
  let damageMult   = 0;   // [esp+0x28]  0..3
  let sequence     = 0;   // [esp+0x8]   weapon-anim sequence id
  let animIdx      = 0;   // [esp+0x18]  body-anim index
  let duration     = closeCombatDur;   // [esp+0x24]
  let kickDuration = closeCombatDelay; // [esp+0x20]
  let kickDelay    = closeCombatDelay; // [esp+0x1c]
  let applyBlock   = false;            // [esp+0x7]
  let doFireBullets = true;            // [esp+0xf]
  let isCloseCombat = false;           // implicit, derived from magnitude check

  // Pre-computed "is player doing some custom action" flag (player->pev.flags & 0x50c30)
  // [esp+0x6] — TODO(asm-ambiguous): exact flag meaning
  const isDoingAction = (pev.flags & 0x50c30) !== 0;

  // Cache some flags we read many times
  const FL_ONGROUND = 0x10;
  const FL_INWATER = 0x01;
  const FL_DUCKING = 0x04;
  const FL_FROZEN  = 0x800;
  const CUSTOM_A   = 0x02;   // [eax+0x1a5]&0x2
  const CUSTOM_B   = 0x40;   // [eax+0x1a5]&0x40
  const CUSTOM_C   = 0x04;   // [eax+0x180]&0x4  const CUSTOM_D   = 0x01;   // [eax+0x180]&0x1
  const CUSTOM_E   = 0x10;   // [eax+0x180]&0x10

  const isOnGround   = (pev.flags & FL_ONGROUND) !== 0;
  const isInWater    = (pev.flags & FL_INWATER)  !== 0;
  const isDucking    = (pev.flags & FL_DUCKING)  !== 0;
  const isFrozen     = (pev.flags & FL_FROZEN)   !== 0;
  const hasCustomA   = (pev.flags & CUSTOM_A)    !== 0; // pev+0x1a5 actually
  const hasCustomB   = (pev.flags & CUSTOM_B)    !== 0;
  const hasCustomC   = (pev.flags & CUSTOM_C)    !== 0;
  const hasCustomD   = (pev.flags & CUSTOM_D)    !== 0;
  const hasCustomE   = (pev.flags & CUSTOM_E)    !== 0;

  // ====== close-combat range check ======
  const CLOSE_COMBAT_RANGE = cvar_closeCombat_range.value; // [ebx-0x6e7f4]
  if (velocityMag < CLOSE_COMBAT_RANGE) {
    isCloseCombat = true;
    // ----- close-combat branch -----
    // Compute unit velocity vector and forward vector for the hit direction
    const forward = pev.origin;             // [eax+0x74] (then x is zeroed)
    forward.x = 0;
    const vp = pev.velocity;                // [eax+0x20]
    const vmag = Math.sqrt(vp.x*vp.x + vp.y*vp.y + vp.z*vp.z);
    let unit: Vector;
    if (vmag > closeCombatOther /* ~1.0 */) {
      // velocity too small for proper direction; fall back to a default forward+up vector
      unit = { x: 0, y: 0, z: closeCombatOther };
    } else {
      unit = {
        x: vp.x / closeCombatOther,
        y: vp.y / closeCombatOther,
        z: vp.z / closeCombatOther,
      };
    }
    // Dot product of unit and (vp×something) selects the "front/back" attack
    const dotProduct = unit.x*vp.x + unit.y*vp.y + unit.z*vp.z;
    attackType = (dotProduct > closeCombatMulti /* ~0 */) ? 3 : 2;

    if (!isDoingAction) {
      // Player is in mid-action (custom flag set) — bail out to the      // simpler "frozen / in-water" path below
      // (the asm jumps out to the FL_FROZEN branch)
      // -- fall-through handled below --
    }
  }

  // ====== branch: custom-action vs frozen ======
  if (!isDoingAction) {
    // ---- "frozen" / in-water path (0x76458) ----
    if (isFrozen) {
      // two sub-cases based on [eax+0x1a5]&0x2
      if (hasCustomA || !hasCustomB /* & 0x40 on [ebp+0] */) {
        // big-kick variant
        duration    = closeCombatBigKick;
        kickDuration = closeCombatDelay;
        damageMult  = 2;
        applyBlock  = true;
        damage      = 0x14;       // 20
        sequence    = 0x6;
        animIdx     = 0x2d;       // 45
        duration    = closeCombatOther; // overwritten below
        kickDuration = closeCombatFarDly;

        // Flag the player for "in close-combat" / "no-damage-boost"
        pev.flags |= 0x4;
        pev.flags |= 0x1;
        // Copy (closeCombatMain, closeCombatMain, closeCombatBack) into
        // player->m_vecCloseCombatDir (offset 0x174)
        this.m_vecCloseCombatDir = {
          x: closeCombatMain, y: closeCombatMain, z: closeCombatBack,
        };
        this.m_flCloseCombatWindow = 2.0;     // [eax+0x4f4] = 0x40000000
        attackType = 2;
        // jump to applyAttack()
        goto applyAttack;
      }
      // otherwise fall through to the generic close-combat damage chain
    }

    // ---- generic close-combat damage selection ----
    damageMult = 2;

    if (!hasCustomA /* (pev.flags & 0x2) at +0x1a5 */ &&
        velocityMag >= closeCombatRngLow /* &0xde74 */) {
      // far path: forward attack
      goto forwardChain;
    }
    if (hasCustomC /* [edx+0x180]&0x4 */) {
      if (velocityMag < closeCombatRngHi /* QWORD &0x6f010 */) {
        // [esp+0x14] == 3 branch — falls into forwardChain below
        goto forwardChain;
      }
 // low attack variant
      damageMult = 0;
      kickDelay = 0.0;
      this.m_iLowAttackCount /* [ebp+0xa00] */ = 0;

      let computed = velocityMag * closeCombatDamMul;
      if (computed > closeCombatDamMax) computed = closeCombatDamMax;
      if (computed < closeCombatMin) computed = closeCombatMin;
      damage = computed;
      animIdx = 0x2d;
      duration = closeCombatOther;
      kickDuration = closeCombatHigh;
      damage = 0x10;
      sequence = 0x8;
      doFireBullets = false;
      pev.flags |= 0x4;
      this.m_vecCloseCombatDir = {
        x: closeCombatMain, y: closeCombatMain, z: closeCombatBack,
      };
      this.m_flCloseCombatWindow = 2.0;
      goto applyAttack;
    }
    forwardChain:
    // generic forward-attack damage selection (0xa, 0xb, 0xc, 0xd, 0xe, 0xf)
    this.m_iLowAttackCount = 0;
    let lowVal = closeCombatLowMul * velocityMag;
    if (lowVal > closeCombatLowMin) lowVal = closeCombatLowMin;
    if (lowVal < closeCombatLowMax /* QWORD */) lowVal = closeCombatLowMax;
    kickDelay = lowVal;
    animIdx = 0x2d;
    duration = closeCombatLowDt;
    kickDuration = closeCombatHigh;

    // Pick damage value from recent attack sequence ([ebp+0xa04])
    const lastSeq = this.m_iLastAttackSeq;   // [ebp+0xa04]
    if (lastSeq === 0xf) {
      damage = 0x13;
    } else if (lastSeq === 0x13) {
      damage = 0x12;
    } else if (lastSeq === 0x12) {
      damage = 0xf;
    } else {
      // Random pick via RANDOM_LONG(0, 2)
      const r = RANDOM_LONG(0, 2); // vtable call at [ebx+0x1aa8]+0x168
      if (r === 0)       damage = 0x13;
      else if (r === 1)  damage = 0x12;
      else if (r === 2)  damage = 0xf;
    }
    sequence = 0xa;
    goto applyAttack;
  }

  // ====== in-water / on-ground / ducking path (0x76314) ======
  if (!isInWater) {
    // ---- "frozen" or "no flag" path ----
    // [eax+0x180]&0x1 → je 0x76458
    // continues into isFrozen path below
    if (!isFrozen) goto notFrozen;
    // ... continue with isFrozen logic ...
  }

  if (!isInWater && hasCustomD /* FL_INWATER=0x1? Actually custom offset */) {
    attackType = 2;
    damageMult = 1;
    if (hasCustomA /* [eax+0x1a5]&0x2 */) {
      // jumping high-kick path
      damage = 0x18;        // 24
      sequence = 0x5;
      duration = closeCombatSwp;
      kickDuration = closeCombatDelay;
      kickDelay = closeCombatLowDly;
    } else if (this.m_iHighAttackCount > 2 || (hasCustomC && !hasCustomB)) {
      // jumping low-kick path
      damage = 0x19;        // 25
      sequence = 0xb;
      duration = closeCombatJmpDly;
      kickDuration = closeCombatDelay;
      kickDelay = closeCombatJmpDur;
    } else {
      // alternate between high and low based on a player flag
      if (!pev.button /* [eax+0x814] byte */ && this.m_iHighAttackCount <= 2) {
        this.m_iHighAttackCount++;
        damage = 0x16;        // 22
        sequence = 0x3;
        duration = closeCombatHigh2;
        kickDuration = closeCombatJmpHi;
        kickDelay = closeCombatJmpLow;
      } else {
        this.m_iHighAttackCount = 0;
        damage = 0x17;        // 23
        sequence = 0x4;
        duration = closeCombatKFDly2;
        kickDuration = closeCombatDelay;
        kickDelay = closeCombatKFTim;
      }
    }
    this.m_iLastAttackSeq = damage;
    goto applyAttack;
  }

  notFrozen:
  // ---- distance-based forward/back selection (0x76558) ----
  if (attackType === 3) {
    // low / forward attack chain (the asm uses attackType==3 to pick the    // sweep / low variant)
    damageMult = 3;
    damage = 0x11;            // 17
    sequence = 0x7;
    let v = velocityMag * closeCombatKFDly /* &0x6de80 */;
    if (v > closeCombatMax) v = closeCombatMax;
    if (v < closeCombatMin) v = closeCombatMin;
    kickDelay = v;
    animIdx = 0x37;           // 55
    if (!hasCustomA /* [eax+0x1a5]&0x2 */) {
      duration = closeCombatKFDmg;
    } else {
      applyBlock = true;
      duration = closeCombatOther;
    }
    kickDuration = closeCombatKickDur;
    goto applyAttack;
  }

  // ---- generic forward-attack chain (0x765fc) ----
  damageMult = 2;
  if (!hasCustomA &&
      velocityMag >= closeCombatRngLow /* &0x6de74 */ &&
      hasCustomC /* &0x4 */) {
    // back-attack sub-case: kickDelay = velocityMag * damageMul, clamped
    applyBlock = false;
    this.m_iLowAttackCount = 0;
    let v = velocityMag * closeCombatDamMul;
    if (v > closeCombatDamMax) v = closeCombatDamMax;
    if (v < closeCombatMin) v = closeCombatMin;
    kickDelay = v;
    animIdx = 0x2d;
    duration = closeCombatOther;
    kickDuration = closeCombatHigh;
    damage = 0x10;
    sequence = 0x8;
    doFireBullets = false;
    pev.flags |= 0x4;
    this.m_vecCloseCombatDir = {
      x: closeCombatMain, y: closeCombatMain, z: closeCombatBack,
    };
    this.m_flCloseCombatWindow = 2.0;
    goto applyAttack;
  }

  if (!hasCustomA) goto fwdChainAfter;
  // hasCustomA path
  if (!pev.button /* [eax+0x815]&0x8 */ || this.m_iLowAttackCount > 2) {
    applyBlock = true;
    animIdx = 0x2d;
    duration = closeCombatSwp;
    kickDuration = closeCombatKickDur;
    this.m_iLowAttackCount = 0;
    const lastSeq2 = this.m_iLastAttackSeq;
    if (lastSeq2 === 0xf) damage = 0xa;
    else if (lastSeq2 === 0xa) damage = 0xe;
    else if (lastSeq2 === 0xe) damage = 0xd;
    else if (lastSeq2 === 0xd) damage = 0xc;
    else {
      const r = RANDOM_LONG(0, 3);
      // jump table at [ebx+eax*4-0xef520] — values: 0xc, 0xd, 0xe, 0xa
      damage = ([0xc, 0xd, 0xe, 0xa] as const)[r];
    }
    sequence = 0xa;
    goto applyAttack;
  }
  // low-attack count increment path
  applyBlock = true;
  animIdx = 0x2d;
  this.m_iLowAttackCount++;
  duration = closeCombatKickDur;
  kickDuration = closeCombatHigh2;
  kickDelay = closeCombatMin;
  const lastSeq3 = this.m_iLastAttackSeq;
  if (lastSeq3 === 0xb) {
    damage = 0xc;
  } else if (lastSeq3 === 0xc) {
    damage = 0xb;
  } else {
    const r = RANDOM_LONG(0, 1);
    damage = r === 0 ? 0xc : 0xb;
  }
  sequence = 0x9;
  goto applyAttack;

  fwdChainAfter:
  // generic forward chain (no special state)
  damageMult = 3;
  damage = 0x11;
  sequence = 0x7;
  let vv = velocityMag * closeCombatKFDly;
  if (vv > closeCombatMax) vv = closeCombatMax;
  if (vv < closeCombatMin) vv = closeCombatMin;
  kickDelay = vv;
  animIdx = 0x37;
  if (!hasCustomA) duration = closeCombatKFDmg;
  else { applyBlock = true; duration = closeCombatOther; }
  kickDuration = closeCombatKickDur;
  goto applyAttack;

applyAttack:
  // ====== cleanup hooks: clear "in close combat" player flags ======
  if (damageMult !== 0 && doFireBullets) {
    if ((pev.flags & 0x20000) !== 0) {
      pev.flags = (pev.flags & ~0x20000) & ~0x4;
      // Clear some other related bits
      pev.flags = (pev.flags & ~0xfffb); // [eax+0x250]&0xfffffffb
      if (hasCustomB /* &0x40 */) {
        this.m_vecCloseCombatDir = {
          x: closeCombatMain, y: closeCombatMain, z: closeCombatBack,
        };
      } else {
        this.m_vecCloseCombatDir = {
          x: closeCombatMain, y: closeCombatMain, z: closeCombatBack2,
        };
      }
      pev.fuser1 /* +0x120 */ = 1.0; // 0x3f800000
      pev.fuser2 /* +0x11c */ = 1.0;
    }
  }

  // ====== record the chosen attack sequence on the weapon ======
  this.m_iLastAttackSeq = damage;          // [ebp+0xa04]

  // ====== powerup / class multipliers ======
  damage *= GetMeleeMultiplier(player);    // multiplies [esp+0x2c]
  // KungFu doubles the kick delay
  if (KungFu(player)) kickDelay *= 2;

  // ====== compute hit direction ======
  let hitDir: Vector;
  if (attackType === 3) {
    hitDir = { x: player.pev.origin.x, y: player.pev.origin.y, z: 0 };
  } else {
    hitDir = { x: player.pev.origin.x, y: player.pev.origin.y, z: player.pev.origin.z };
  }
  const hitMag = Math.sqrt(hitDir.x*hitDir.x + hitDir.y*hitDir.y + hitDir.z*hitDir.z);
  if (hitMag > closeCombatMain /* ~1 */) {
    hitDir = { x: 0, y: 0, z: closeCombatOther };
  } else {
    const inv = closeCombatOther / hitMag;
    hitDir = { x: hitDir.x * inv, y: hitDir.y * inv, z: hitDir.z * inv };
  }
  UTIL_MakeVectors(hitDir);

  // ====== virtual call: get auto-aim vector from player ======
  // [eax+0x60]+0x168 is the GetAutoaimVector vtable slot
  const autoAim = player.GetAutoaimVector(closeCombatOther);
  // Save into m_vecAutoAim (offset 0x174 area)
  this.m_vecAutoAim = { x: autoAim.x, y: autoAim.y, z: autoAim.z };
  hitDir = { x: autoAim.x, y: autoAim.y, z: autoAim.z };

  // ====== build damage-vector =====
  // vp = global view-parms (engine global at [ebx+0x1600]->vp)
  const vp = engineGlobals.vp;            // global view-params vector at offset0x28
  let dmgVec: Vector = {
    x: vp.x * animIdx,                    // animIdx is used as a scalar here?
    y: vp.y * animIdx,
    z: vp.z * animIdx,
  };
  // TODO(asm-ambiguous): the asm reads animIdx as an int and multiplies the
  // vp vector components by it — looks like an unrolled "vp * animIdx" pattern
  // that's probably really "vp * something else" in the original source.

  // ====== scale by attack range factor ======
  let scale = attackType === 3 ? closeCombatExp : closeCombatOther;
  dmgVec = {
    x: dmgVec.x * scale,
    y: dmgVec.y * scale,
    z: dmgVec.z * scale,
  };

  // ====== hit origin = vp + dmgVec ======
  const hitOrigin: Vector = {
    x: vp.x + dmgVec.x,
    y: vp.y + dmgVec.y,
    z: vp.z + dmgVec.z,
  };

  // ====== call CBasePlayer::CloseCombatAttack ======
  const tr = CloseCombatAttack(
    player,
    hitOrigin,            // [esp+0x60] origin
    vp,                   // [esp+0x30] forward?
    attackType === 3 ? 2 : 1, // trace mask
    damage,
    kickDelay,
    /*b*/ 0,
    /*unknown*/ 0,
    hitDir,
    closeCombatOther,
  );
  // Note: the asm call signature is CBasePlayer::CloseCombatAttack(
  //   Vector &origin, Vector &forward, int traceMask, float kickDelay,
  //   int damage, bool, int, Vector&, float) — actual param list is
  //   TODO(asm-ambiguous).

  if (!tr && kickDuration > closeCombatFrzDly /* ~0 */) {
    this.m_flCloseCombatDelay /* [ebp+0x79c] */ = kickDuration;
    if (attackType === 3) {
      // negate (xor sign bit) for back-attack
      this.m_flCloseCombatDelay2 /* [ebp+0x7a0] */ = kickDelay ^ 0x80000000;
    } else {
      this.m_flCloseCombatDelay2 = kickDelay;
    }
    this.m_bCloseCombatDone /* [ebp+0x7a4] */ = false;
  }

  // ====== optional block ======
  if (applyBlock && !(pev.flags & 0x01) /* some flag */) {
    BlockPlayer(player, kickDelay * closeCombatLowDt);
  }

  // ====== fire the weapon's bullet pattern ======
  // Virtual call into engine global at [ebx+0x1aa8]+0x1ec — most likely
  // CEngine::W_FireBullets / FireBullets.
  W_FireBullets(
    /*ent*/ 0,
    /*pos*/ { x: 0, y: 0, z: 0 },
    /*dir*/ hitDir,
    /*spread*/ 0,
    /*bullets*/ 0,
    /*ammoType*/ 0,
    /*unknown*/ 0,
    /*tracerFreq*/ 0,
    /*weaponId*/ this.m_iWeaponId /* [ebp+0x96c] */,
    /*player*/ player.m_iUser /* [edx+0x208] */,
    /*bool*/ 1,
  );

  // ====== update weapon timers ======
  this.m_flNextPrimaryAttack = now + duration;
  this.m_flTimeWeaponIdle    = now + duration;
  this.m_flNextSecondaryAttack = now + closeCombatKFTim2 /* [&0x6df4c] */;
  this.m_bCloseCombatHit     /* [eax+0x7a8] */ = 0;
  this.m_flCloseCombatTimer /* [eax+0x4f8] */ = duration;
}
```
