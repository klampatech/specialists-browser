```typescript
/**
 * CTSGun::KnifeFire — primary attack for the knife weapon.
 *
 * Branches on the knife entity's `m_bThrow` flag (knife+0x24):
 *   • THROW — predicts an aim point from the player's origin + velocity,
 *             traces a line, and spawns a CTSKnife projectile with computed
 *             angles and angular velocity.
 *   • MELEE — hull-traces through the player's view direction and applies
 *             DMG_SLASH multi-damage on hit. On miss, sets fumble-feedback
 *             times on the player.
 *
 * Both branches schedule next-attack / idle times with slow-motion cvar
 * scaling, play a player animation, and emit a swing/throw sound. After
 * a successful attack the throw path decrements the knife clip and either
 * queues a follow-up shot or calls `DropWeapon` when the clip empties.
 *
 * Returns immediately when no knife entity is associated with the gun.
 *
 * Field-offset remarks (all derived from a 32-bit MSVC build, `this`=esi):
 *   this+0x80   m_pPlayer    (CBasePlayer*)
 *   this+0xcc   m_pKnife     (CTSKnife*) — doubles as the "armed" flag
 *   this+0xd0   m_pWeaponInfo (CTSSWeaponInfo*)
 *   this+0x9c   m_flTimeWeaponIdle
 *   this+0xa0   m_flNextPrimaryAttack
 *   this+0xa8   m_flNextSecondaryAttack
 *   this+0xc8   m_iId        (weapon slot id)
 *   this+0x114  m_iHits      (knife-hit counter)
 *   this+0x972  primary model index (LOWORD)
 *   this+0x976  secondary model index (LOWORD)
 *
 *   knife+0x04  m_iClip
 *   knife+0x08  m_iHit
 *   knife+0x24  m_bThrow
 *   knife+0x28  m_hOwner
 */
export function KnifeFire(this: CTSGun): void {
  const player  = this.m_pPlayer;
  const wepInfo = this.m_pWeaponInfo;
  const knife   = this.m_pKnife;
  if (knife === null) return;                        // bail if no knife is bound

  const pev = player.pev;

  // ---- 1. Slow-motion decision ----------------------------------------------
  // Player FBitSet mask 0x70c30. The throw path also gates animation on the
  // related mask 0x30c30. TODO(asm-ambiguous): identify which FL_* bits these
  // masks actually compose (probably FL_FROZEN | FL_STOPPED | ...).
  const fSlowMo = (pev.flags & 0x70c30) !== 0;

  const cvarSlowAmt  = CVAR_FLOAT(/* slow-mo firetime scale   */ /* ebx-0x6deec */);
  const cvarSlowNext = CVAR_FLOAT(/* slow-mo next-attack delay */ /* ebx-0x6e768 */);
  const cvarSlowDmg  = CVAR_FLOAT(/* slow-mo damage scale      */ /* ebx-0x6def0 */);
  const cvarIdle     = CVAR_FLOAT(/* miss-fumble window       */ /* ebx-0x6df78 */);

  // ---- 2. Schedule next primary / idle / secondary attack times -------------
  let flDelay = wepInfo.m_flPrimaryAttack;                  // wepInfo+0x18
  if (fSlowMo) flDelay *= cvarSlowAmt;

  const flBase = UTIL_WeaponTimeBase();
  this.m_flNextPrimaryAttack   = flBase + flDelay;          // [this+0xa0]
  this.m_flTimeWeaponIdle      = flBase + flDelay;          // [this+0x9c]
  this.m_flNextSecondaryAttack = flBase + cvarSlowNext;     // [this+0xa8]
  player.m_flWeaponAnimTime    = flDelay;                   // *[player]+0x4f8

  // Refresh forward / right / up vectors from the player's aim.
  // TODO(asm-ambiguous): which angle field of pev does +0x74 correspond to?
  UTIL_MakeVectors(pev + 0x74);

  // gpGlobals is fetched as [ebx+0x1600] (then dereferenced) — uses its
  // v_forward / v_right / v_up vectors (offsets +0x28 / +0x40 from the
  // indirect pointer). These constants show up throughout both branches.
  const vForward = gpGlobals.v_forward;
  const vRight   = gpGlobals.v_right;
  const vUp      = gpGlobals.v_up;

  let bFired = false;

  // =====================================================================
  // THROW branch  — knife+0x24 is set
  // =====================================================================
  if (knife.m_bThrow !== 0) {
    // Predicted eyepoint: origin + velocity (lead the target).
    const aimStart = VectorAdd(pev.origin, pev.velocity);
    // Aim end: forward in view direction, scaled by a reach constant.
    const aimEnd   = VectorAdd(aimStart, VectorScale(vForward, /* reach */));

    // Trace to resolve an absolute end position (ignore monsters, edict=player).
    const tr = UTIL_TraceLine(aimStart, aimEnd, /* ignore_monsters */ 0, player.edict);

    // wepInfo+0x20 is the throw-mode tier. Mode 6 picks one damage scale,
    // other modes pick the default.
    const iThrowMode = wepInfo.m_iMode;

    // Spawn the CTSKnife projectile with start/end/the mode.
    const dart = CTSKnife.CreateKnife(
      player,
      aimStart,
      iThrowMode === 6 ? /* override end vec */ aimEnd : tr.vecEndPos,
      iThrowMode
    );

    if (dart !== null) {
      // Build a throw-direction vector. The disassembly forms it from
      // v_forward ± v_right/v_up and then normalizes against KNIFE_SPEED
      // (constant at [ebx-0x6f3fc]). If length is zero, default to (0,0,-1).
      const dir = /* assembled throw-dir */;
      const len = VectorLength(dir);
      let nx: number, ny: number, nz: number;
      if (len === 0) {
        nx = 0; ny = 0; nz = -1;
      } else {
        const inv = KNIFE_SPEED / len;
        nx = dir.x * inv; ny = dir.y * inv; nz = dir.z * inv;
      }
      UTIL_VecToAngles(/* nx, ny, nz */);
      dart.pev.angles         = /* VecToAngles result */;
      dart.pev.angularVelocity = (50.0, 0.0, -50.0); // 0x42b40000, 0.0, 0xc4a28000
    }

    bFired = true;

    // Animate only when not slow-mo and the FBitSet gate is clear and the
    // player has the animation-flag byte set at +0x1a5 bit 1.
    if (!fSlowMo && (pev.flags & 0x30c30) === 0 && (pev.flags & 0x200)) {
      this.m_pAnimation.Animate(player, /* THROW seq */ 32);
    }
    // Emit throw sound — filename pointer at [ebx-0x6dc7e] (e.g.
    // "weapons/knife_throw.wav"); pick via RANDOM_LONG over a small table.
    EMIT_SOUND_DYN(
      player.edict,
      RANDOM_LONG(0, 31) + 95,                 // engine vtable [ebx+0x1aa8].0x168
      /* filename */ /* ebx-0x6dc7e */,
      /* vol */ 1.0, /* attn 0.4 */ 0.4, /* pitch */ 0.7, /* CHAN_WEAPON */ 4);

  // =====================================================================
  // MELEE branch — knife+0x24 is clear (default)
  // =====================================================================
  } else {
    // Pick a swing animation 29..31 (RANDOM_LONG(0,2) + 0x1d).
    if (!fSlowMo && (pev.flags & 0x200)) {
      this.m_pAnimation.Animate(player, RANDOM_LONG(0, 2) + 29);
    }

    // Damage: slow-mo cvar × per-player melee multiplier.
    let flDamage = wepInfo.m_flDamage;          // wepInfo+0x1c
    if (fSlowMo) flDamage *= cvarSlowDmg;
    flDamage *= player.GetMeleeMultiplier();

    // Hull-trace in the player's view direction (clip-monster hull = 3).
    const aimStart = /* eyepoint (pev origin + view_ofs) */;
    const aimEnd   = VectorAdd(aimStart, VectorScale(vForward, /* reach */));
    const tr = player.CheckHull(aimStart, aimEnd, /* tr out */, /* hull */ 3);

    let bDidHit = false;
    if (tr.flFraction < 1.0 /* qword at [ebx-0x6f018] */) {
      // Resolve a victim: tr.pHit first, else FindUseTarget fallback.
      let victim: CBaseEntity | null = tr.pHit ?? null;
      if (victim === null) victim = player.FindUseTarget(/* 0 */);
      if (victim !== null) {
        // vtable 0xb4 + vtable 0x118 byte ≥ 0 verifies the victim is alive.
        // VictimKnifeHold returns true if the victim is parrying — skip them.
        if (victim.IsAlive() &&
            !VictimKnifeHold(player, victim, /* time/dmg */ flDamage)) {
          ClearMultiDamage();
          // Copy the aim direction (forward × something) into a local Vector.
          VectorCopy(/* aim direction */, aimLocal);
          victim.TakeDamage(
            player.pev, player.pev,
            flDamage, /* dmg bits */ 0x1004 /* DMG_SLASH | DMG_NEVERGIB */,
            aimLocal);
          ApplyMultiDamage(player.pev, player.pev);

          // vtable 0xc8 (likely Blood / TraceBleed) — nonzero confirms the
          // visual hit landed and a sound/particle should play.
          if (victim.ApplyTraceBleed(/* ... */)) {
            knife.m_iHit = 1;     // knife+0x8
            this.m_iHits = 1;     // [this+0x114]
            // Hit sound: pointer at [ebx-0x6df30] (e.g. "weapons/knife_hit.wav").
            EMIT_SOUND_DYN(
              player.edict, RANDOM_LONG(0, 31) + 95,
              /* filename */ /* ebx-0x6df30 */,
              /* vol 1.0 */ 1.0, /* attn 0.4 */ 0.4, /* pitch 0.5 */ 0.5, 4);
            bDidHit = true;
          }
        }
      }
    }

    if (!knife.m_iHit) {
      // Miss: drive a fumble pose by writing idle times back onto the player.
      player.m_flAnimTime2 = cvarIdle * wepInfo.m_flPrimaryAttack; // +0x79c
      player.m_flAnimTime  = flDamage;                              // +0x7a0
      player.m_bAnimating  = 1;                                     // +0x7a4
    }

    bFired = true;

    // ---- SendWeaponAnim (engine message via MESSAGE_BEGIN vtable 0x1ec) ----
    // Broadcasts the current knife swing to all clients. Argument layout
    // includes anim index, model index (this+0x972), and a handful of
    // words pulled from the stack, mirroring the standard HL broadcast.
    ENGINE.MESSAGE_BEGIN(/* MSG_ONE */, /* SVC_WEAPONANIM */,
                         /* origin */, /* dest = player.edict */);
    ENGINE.MESSAGE_WRITE_BYTE(/* anim seq — e.g. this.m_iClip / current seq */);
    ENGINE.MESSAGE_WRITE_SHORT(this.m_iClip /* or model index — this+0x972 */);
    ENGINE.MESSAGE_END();
  }

  // =====================================================================
  // Post-fire bookkeeping (throw path is the primary consumer; melee path
  // hits this block too via the same local `bFired` flag).
  // =====================================================================
  if (bFired) {
    if (!InfiniteClips(player)) {
      // TODO: what field of wepInfo at +0xd0 is being read as a low byte?
      //      (Looks like an ammo bonus / clip-fill amount.)
      player.m_iAmmoKnife += /* low byte of wepInfo+0xd0 */ 0; // *[player]+0x548
      SetPlayerSpeed(player, player.GetSpeedBySlots());
      knife.m_iClip--;                                          // knife+0x4
    }

    if (knife.m_iClip > 0) {
      // Recoil / follow-up anim — vtable call at [this+0x60] offset 0x174,
      // using m_hOwner (knife+0x28) and the secondary anim/model (this+0x976).
      this.Recoil(/* m_iHSecondary=0, m_hSecondaryAnim /* , etc */);
      // Re-schedule next attack and broadcast the follow-up animation event
      // (separate MESSAGE_BEGIN with SVC_WEAPONANIM + this+0x976 model index).
      this.m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + /* qword at [ebx-0x6de50] */;
    } else {
      // Clip emptied — drop the weapon.
      this.DropWeapon(this.m_iId /* [this+0xc8] */, /* iKeepFlags */ 1);
    }
  }
}
```
