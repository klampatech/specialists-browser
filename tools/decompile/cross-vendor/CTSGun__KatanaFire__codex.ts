```typescript
/**
 * CTSGun::KatanaFire — Perform a katana melee attack.
 *
 * Picks the swing flavor (animation / body / damage / delay /
 * optional view-velocity kick) from the player's current state (in
 * water, long-range dot-product, button bits), plays the swing
 * animation on the player model, traces a hull from the player's
 * eye forward, applies damage to the hit victim (with a special
 * "katana hold" animation if the victim catches the blade), plays
 * a decap sound on kill, and schedules the next primary / secondary
 * / idle attack times.
 *
 * Globals / helpers referenced (defined elsewhere in the decompiled
 * codebase): UTIL_MakeVectors, vecLength, vec3, gpGlobals, clamp,
 * RANDOM_LONG, INDEXENT, ClearMultiDamage, ApplyMultiDamage,
 * EMIT_SOUND_DYN, PLAYBACK_EVENT_FULL, UTIL_WeaponTimeBase,
 * GetMeleeMultiplier, CheckHull, VictimKatanaHold, cvars,
 * CTSAnimation, DMG_*.
 *
 * @param this  The CTSGun entity instance (this in the original C++)
 * @returns     void
 */
export function KatanaFire(this: CTSGun): void {
  // ── Bail out if the katana secondary-entity isn't attached ────
  if (!this.m_pKatana) return;

  const player: any = this.m_pPlayer;

  // ── Refresh engine view vectors from the player's view angles ─
  UTIL_MakeVectors(player.pev.angles);

  // ── Player state flags ───────────────────────────────────────
  // TODO(asm-ambiguous): the FL_* / button bitmasks below are
  // reconstructed from the conditional branches in the disassembly
  // (0x7343e, 0x73573, 0x7360c, 0x7361b, 0x73627). Their exact
  // mapping to FL_INWATER / FL_FROZEN / FL_ONTRAIN / FL_ATCONTROLS
  // / IN_DUCK / IN_ATTACK2 is not directly stated in the chunk.
  const inWater = (player.pev.flags & 0x70c30) !== 0;

  // ── Choose (animation, body, damage, delay) ───────────────────
  let anim: number, body: number, damage: number, delay: number;
  let applyKick = false;

  if (inWater) {
    // Underwater stab
    anim   = 0x11;
    body   = -1;
    damage = cvars.katana_water_damage;     // GOT[-0x6dee8]
    delay  = 0.5;                           // GOT[-0x6f3fc]
    this.m_flTimeWeaponIdle = 0.23;
  } else {
    // Long-range / alt-button path detection
    const fwd    = gpGlobals.v_forward;
    const fwdLen = vecLength(fwd);
    const reach  = vecLength(player.pev.origin);
    const altButton = (player.pev.button & 0x10) !== 0;
    const longRange = fwdLen > cvars.katana_range_min && reach > 0;
    const overheadPath = longRange || altButton;

    if (overheadPath) {
      // Overhead 3rd-strike swing
      anim      = 0x0f;
      body      = 0x23;
      damage    = cvars.katana_overhead_damage; // GOT[-0x6ded4]
      delay     = 0.5;
      applyKick = true;
    } else if (
      (player.pev.button & 0x04) !== 0 ||
      ((this as any).someField /* +0x0 */ &&
       ((this as any).someField /* +0x1a5 */ & 0x40) !== 0)
    ) {
      // Crouch / duck block-stab
      // TODO: the `[ebp+0x0]` / `[eax+0x1a5]` access pattern is
      // unclear without engine source; treated here as a second
      // crouch-state bit on the player.
      anim      = 0x11;
      body      = 0x25;
      damage    = cvars.katana_duck_damage;       // GOT[-0x6ded0]
      delay     = cvars.katana_duck_delay;        // GOT[-0x6decc]
      applyKick = true;
      // Freeze the player's pose during the swing
      player.pev.flags |= 0x04;
      player.pev.flags |= 0x01;
      // Override v_angle with the swing direction vector
      player.pev.v_angle = fwd;
      this.m_flNextSecondaryAttack = 2.0;         // 0x40000000
    } else if (((player.pev as any).someField2 /* +0x1a5 */ & 0x02) !== 0) {
      // Standing alternate attack (combo-cycling)
      anim   = 0x11;
      damage = cvars.katana_attack2_damage;       // GOT[-0x6dec4]
      delay  = cvars.katana_attack2_delay;        // GOT[-0x6dec0]
      // Cycle combo counter: 0 → random(1..2); 1 → 2; 2 → 1
      if (this.m_iCombo - 1 > 1) this.m_iCombo = RANDOM_LONG(1, 2);
      if (this.m_iCombo === 1) {
        this.m_iCombo = 2; body = 0x21;
      } else if (this.m_iCombo === 2) {
        this.m_iCombo = 1; body = 0x22; anim = 0x10;
      }
    } else {
      // Default single-strike swing
      anim   = 0x11;
      body   = 0x24;
      damage = clamp(
        cvars.katana_damage * cvars.katana_damage_scale, // GOT[-0x6debc]
        cvars.katana_damage_min,                          // GOT[-0x6deb8]
        cvars.katana_damage_max                           // GOT[-0x6dee8]
      );
      delay  = cvars.katana_delay;                         // GOT[-0x6deb4]
    }
  }

  // ── Play the swing animation on the player model ─────────────
  CTSAnimation.Animate(player, anim, body);

  // ── Apply the player's per-class melee multiplier ────────────
  damage *= GetMeleeMultiplier(player);

  // ── Trace from the player's eye forward ──────────────────────
  const eye      = player.GetEyePosition();          // virtual 0x168
  const reachVec = gpGlobals.v_forward.mul(body);    // scaled by body
  const aim      = vec3.add(eye, reachVec);
  const trace    = CheckHull(player, eye, aim, /*hull*/ 0, /*mask*/ 3);

  // ── Apply damage to whatever we hit ──────────────────────────
  let hitEnt: any = null;
  if (trace.fraction < 1.0) {
    hitEnt = trace.ent ?? INDEXENT(0);
    if (hitEnt) {
      const klass = hitEnt.Classify();               // virtual 0xb4
      if (klass && hitEnt.pev.takedamage >= 0) {
        // Special-case: the victim "catches" the blade (held anim)
        if (!VictimKatanaHold(player, hitEnt, damage)) {
          ClearMultiDamage();
          const dir = gpGlobals.v_forward.mul(Math.abs(damage));
          hitEnt.TakeDamage(
            player.pev, player.pev, damage,
            DMG_CLUB | DMG_NEVERGIB,                  // 0x1080
            dir, trace
          );
          ApplyMultiDamage(player.pev, player.pev);

          // Decap on kill — flag the katana, play the kill sound
          if (!hitEnt.IsAlive()) {                    // virtual 0xc8
            this.m_pKatana.decap = 1;                 // [eax+0x8]
            player.decapVictim   = 1;                 // [eax+0x114]
            const snd  = "weapons/katana_decap";      // GOT[-0x6dcb2]
            const chan = RANDOM_LONG(0, 31) + 95;     // virtual 0x168 + 0x5f
            EMIT_SOUND_DYN(
              hitEnt.edict, /*channel*/ 4, snd,
              /*vol*/ 1.0, /*attn*/ 0.8, /*pitch*/ 0,
              /*flags*/ 1, chan
            );
          }
        }
      }
    }
  }

  // ── Miss path: cache the swing for late-hit detection ────────
  if (!hitEnt) {
    this.m_flMissDamageTime = 0.25;        // 0x3e800000
    this.m_flMissDamage     = damage;
    this.m_iSwingMode       = 2;           // 0x7a4
  }

  // ── Optional view-velocity kick (special stabs only) ─────────
  if (applyKick && (player.pev.flags & 0x01) === 0) {
    (player as any).someField /* +0x4dc */ =
      gpGlobals.v_forward.mul(delay * cvars.katana_kick); // GOT[-0x6decc]
    player.pev.flags |= 0x01;
  }

  // ── Emit the swing playback event for clients ────────────────
  PLAYBACK_EVENT_FULL(
    /*flags*/   0,
    /*invoker*/ player.edict,
    /*event*/   cvars.event_katana,         // GOT[+0x1888]
    /*delay*/   0,
    /*origin*/  vec3.zero,
    /*angles*/  vec3.zero,
    /*param1*/  body,
    /*param2*/  delay,
    /*item*/    this.m_iId,
    /*anim*/    anim,
    /*invBits*/ 1
  );

  // ── Schedule next attack / idle times ────────────────────────
  const now = UTIL_WeaponTimeBase();
  this.m_flNextPrimaryAttack   = now + delay;
  this.m_flNextSecondaryAttack = now + delay;
  this.m_flTimeWeaponIdle      = now + cvars.katana_idle_delay; // GOT[-0x6e768]
  player.m_flNextAttack        = delay;                          // [eax+0x4f8]
}
```
