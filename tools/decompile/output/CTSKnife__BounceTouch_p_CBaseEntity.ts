/**
 * CTSKnife::BounceTouch — Handle a knife projectile colliding with
 * another entity.
 *
 * Demangled: CTSKnife::BounceTouch(CBaseEntity* pOther)
 * Address:   0x0006decc  (size: 2915 B)
 *
 * Behavior (derived from the disassembly):
 *   1. Always schedule a short next-think first.
 *   2. Bail if the touched entity is the knife's owner OR has the
 *      high effects bit (0x80) set.
 *   3. Compute current speed; clear the "touched something" flag
 *      below MIN_BOUNCE_SPEED.
 *   4. Compute anchor→origin delta (the sqrt is computed but
 *      discarded — compiler optimization).
 *   5. Pick bounce scalar by m_iMode: 8 → MODE_8, 6 → 1.0, else 0.0.
 *   6. If the cvar at [ebx+0x1dbc] is in (0, 1), and at least 0.5s
 *      has passed since the last slow-mo print, broadcast a HUD
 *      message showing the bounce scalar. NOTE: the cvar is NOT the
 *      generic `paused` cvar — its identity is TODO.
 *   7. Clear the "just bounced" flag.
 *   8. Branch on takedamage:
 *      8a. Damageable + alive → slash via TakeDamage, then reflect
 *          velocity as `-velocity * K_dmg` (K_dmg = [ebx-0x6df78]).
 *      8b. Not damageable → resolve the touched entity's classname.
 *          TS_CLASSNAME_1: re-orient + origin-shift (subtract, not *          add — see §4) + fly-through sound.
 *          TS_CLASSNAME_2: just exit.
 *          Otherwise: reflect velocity as `velocity / K_other` (K_other
 *          = [ebx-0x6df4c]) — NOTE: division, not multiplication;
 *          no negation. Then sparks (not in CONTENTS_SKY) and the
 *          hit sound.
 *   9. Stamp the final nextthink, scale, and timing fields.
 *
 * @param this  The CTSKnife projectile entity.
 * @param other The entity the knife just touched.
 * @returns     void
 */
export function BounceTouch(this: CTSKnife, other: CBaseEntity): void {
  // PIC base: ebx = GOT-relative anchor after `call $+5; pop ebx; add 0xf7f35`.

  // ============================================================
  // Step 1 — schedule next think (runs even on early-return paths)
  // ============================================================
  this.pev.nextthink = gpGlobals.time + NEXT_THINK_INTERVAL; // [pev+0x104]

  // ============================================================
  // Step 2 — skip self-owner and flag-blocked entities
  // ============================================================
  if (other.pev.owner === this.m_hOwner) return;   // [pev+0x208] cmp [esi+0x8c]
  if ((other.pev.effects & 0x80) !== 0) return;    // [pev+0x118] high bit

  // ============================================================
  // Step 3 — current velocity magnitude  // ============================================================
  const v = this.pev.velocity;
  const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (speed < MIN_BOUNCE_SPEED) {                  // [ebx-0x6df54] ≈ 0.5
    this.m_bTouchedSomething = false;              // [esi+0x90]
  }

  // ============================================================
  // Step 4 — anchor → origin delta
  // ============================================================
  const anchor = this.m_vecPos1;                    // [esi+0x94]
  const origin = this.pev.origin;
  const dx = anchor.x - origin.x;
  const dy = anchor.y - origin.y;
  const dz = anchor.z - origin.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  void Math.sqrt(distSq); // sqrt computed but discarded

  // ============================================================
  // Step 5 — bounce scalar by m_iMode
  // ============================================================
  let bounceScalar: number;                         // [esi+0xa0]
  if (this.m_iMode === 8) {
    bounceScalar = MODE_8_BOUNCE;                   // [ebx-0x6df50]
  } else if (this.m_iMode === 6) {
    bounceScalar = 1.0;                             // [ebx-0x6e7f4]
  } else {
    bounceScalar = 0.0;                             // [ebx-0x6df64]
  }

  // ============================================================
  // Step 6 — slow-motion HUD print (rate-limited)
  // [ebx+0x1dbc] is in (0, 1) for slow-mo, 0 for normal, 1+ for paused.
  // ============================================================
  const slowmoCvar = g_engfuncs.GetCvarFloat(/* TODO: cvar name */);
  if (slowmoCvar > 0.0 && slowmoCvar < 1.0
      && gpGlobals.time - lastSlowMoPrintTime >= 0.5) {
    const msg = UTIL_VarArgs(SLOW_MO_LABEL_FMT /* [ebx-0x6dfc8] */,
 bounceScalar);
    UTIL_ClientPrintAll(3 /* HUD_PRINTCENTER */, msg);
    lastSlowMoPrintTime = gpGlobals.time;
  }

  // ============================================================
  // Step 7 — clear "just bounced" flag
  // ============================================================
  this.m_fJustBounced = false;                      // [esi+0x91]

  // ============================================================
  // Step 8 — branch on takedamage
  // ============================================================
  if (other.pev.takedamage > 0) {
    // -----------------------------------------------------
    // 8a — damageable: slash + reflect
    // -----------------------------------------------------
    // TODO(asm-ambiguous): vtable slot 0xc8 — IsAlive? IsPlayer?
    if (!other.IsAlive?.()) {
      // Assembly jumps to 6e25c which goes through the
      // non-damageable branch (classname checks). Hand off.
      handleNonDamageableBounce(this, other);
      return;
    }

    // Resolve attacker: (m_hOwner ? (m_hOwner->pev) : this->pev).
    // The +0x80 trick is the offset of `pev` inside CBaseEntity.
    const attackerEnt = this.m_hOwner
      ? (this.m_hOwner as unknown as CBaseEntity).pev
      : this.pev;
    const attacker = attackerEnt;

    const trace = UTIL_GetGlobalTrace();
    ClearMultiDamage();

    // Re-normalize velocity (or "up" if zero).
    const dir = speed > 0
      ? { x: v.x / speed, y: v.y / speed, z: v.z / speed }
      : { x: 0, y: 0, z: 1 };

    other.TakeDamage({
      inflictor: this.pev,
      attacker: attacker,
      damage: bounceScalar,
      damageType: 0x8001000,
      direction: dir,
      traceEnd: trace.vecEndPos, // [esp+0x7c]
    });
    ApplyMultiDamage(other.pev, this.pev);

    // Reflect: -velocity * K_dmg.
    // [ebx-0x6df78] = K_dmg (≈0.5).
    const bv = this.pev.velocity;
    bv.x = -bv.x * BOUNCE_FACTOR;                   // matches -velocity * K
    bv.y = -bv.y * BOUNCE_FACTOR;
    bv.z = -bv.z * BOUNCE_FACTOR;

    // Hit sound at the knife.
    // TODO(asm-ambiguous): [pev+0x208] — likely not generic
    // `pev.owner`; see §2.
    EMIT_SOUND_DYN(
      this.pev[TODO_PEVOFFSET as keyof entvars_t] as edict_t,
      4 /* CHAN_BODY */,
      HIT_SOUND,                                    // [ebx-0x6df30]
      1.0,
      ATTN_NORM,
      0,
      100,                                          // pitch = 100 (literal)
    );

    // Event/impact data — only .x and .y are written; .z untouched.
    this.m_vecDamage = { x: 0xffff0000 } as Vector; // [esi+0x14]
    this.m_iImpact = IMPACT_VALUE;                  // [esi+0x18] = [ebx+0x1fd0]
    this.m_iPrimaryDamage = 0x460000;               // [esi+0xc]
    this.m_iSecondaryDamage = 96;                   // [esi+0x10] = 0x60
  } else {
    // -----------------------------------------------------
    // 8b — non-damageable: bounce off
    // -----------------------------------------------------
    handleNonDamageableBounce(this, other);
  }

  // ============================================================
  // Step 9 — final state stamping
  // ============================================================
  this.pev.nextthink = gpGlobals.time + NEXT_THINK_INTERVAL; // [pev+0x104]
  this.m_flTime = gpGlobals.time + 0.1;             // [esi+0x88]
  this.pev.scale = 0.75;                            // [pev+0x11c]
  this.m_bTouchedSomething = false;                 // [esi+0x90]
}

/**
 * Helper for the non-damageable branch. The assembly actually
 * falls through from the 8a "not alive" path into the same
 * classname check sequence.
 */
export function handleNonDamageableBounce(this: CTSKnife, other: CBaseEntity): void {
  const v = this.pev.velocity;
  const otherClassname = STRING(other.pev.classname);

  if (FStrEq(otherClassname, TS_CLASSNAME_1 /* [ebx-0x6e053] */)) {
    // -------- Special bounce: re-orient + origin-shift + fly-through sound --------
    const trace = UTIL_GetGlobalTrace();
    const sd = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    const dir = sd > 0
      ? { x: v.x / sd, y: v.y / sd, z: v.z / sd }
      : { x: 0, y: 0, z: 1 };

    // Origin-shift: assembly computes (dir*B - origin.x, origin.y - dir*B,
    // origin.z - dir*B). The x-sign-flip is likely an x87 codegen quirk
    // around fsubrp vs fsub; the source intent is `origin - dir*B`.
    // See review §6.
    const newOrigin = {
      x: dir.x * BOUNCE_OFFSET - this.pev.origin.x,
      y: this.pev.origin.y - dir.y * BOUNCE_OFFSET,
      z: this.pev.origin.z - dir.z * BOUNCE_OFFSET,
    };
    UTIL_SetOrigin(this.pev, newOrigin);

    const angles = UTIL_VecToAngles(newOrigin);
    // [pev+0x50] is v_angle, NOT angles.
    this.pev.v_angle = { x: angles.x, y: angles.y, z: angles.z };
    // (Second rep movs copies the same content back to the same field —
    //  in the assembly, it's redundant but harmless. In TS: dropped.)
    this.pev.v_angle.z = 90.0;                       // [pev+0x58] = 0x42b40000

    this.pev.animtime = 0;                           // [pev+0x10c]
    this.pev.frame = 5;                              // [pev+0x108]

    // Re-write velocity from a (1,1,1)-shaped "neutral" vector
    // — assembly does rep movs of 3 floats from local stack.
    this.pev.velocity = { x: 1, y: 1, z: 1 };

    // Copy 3 floats from engine globals ([ebx+0x1888]) into
    // pev.punchangle (pev+0x5c). The TS code should NOT describe this
    // as "v_forward/v_right/v_up from gpGlobals" — the destination
    // is `punchangle`.
    this.pev.punchangle = gpGlobals.v_forward; // [pev+0x5c..0x68]

    // Pitch: floor( (RANDOM_FLOAT(0.5, -10.0)) + 1.0 ).
    // TODO(asm-ambiguous): the seed/value is engine-specific.
    const pitchInt = Math.floor(
      RANDOM_FLOAT(0.5, -10.0) + 1.0
    );
    EMIT_SOUND_DYN(
      this.pev[TODO_PEVOFFSET as keyof entvars_t] as edict_t,
      4 /* CHAN_BODY */,
      FLY_SOUND,                                    // [ebx-0x6e7b7]
      1.0,
      ATTN_NORM,
      0,
 pitchInt,
    );
  } else if (FStrEq(otherClassname, TS_CLASSNAME_2 /* [ebx-0x6e62b] */)) {
    // -------- Classname #2: just exit --------
    return;
  } else {
    // -------- Generic bounce: velocity / K_other, then sparks + hit sound --------
    // NOTE: assembly uses DIVISION here, not multiplication. K_other
    // is at [ebx-0x6df4c]; if it's 1/BOUNCE_FACTOR, the magnitude
    // matches the 8a branch but the sign and rounding behavior differ.
    // See review §5.
    const K = K_OTHER; // constant at [ebx-0x6df4c]
    const vel = this.pev.velocity;
    vel.x = vel.x / K;
    vel.y = vel.y / K;
    vel.z = vel.z / K;

    if (UTIL_PointContents(this.pev.origin) !== CONTENTS_SKY /* -3 */) {
      UTIL_Sparks(this.pev.origin);
    }

    const pitchInt = Math.floor(
      RANDOM_FLOAT(0.5, 10.0) + 1.0
    );
    EMIT_SOUND_DYN(
      this.pev[TODO_PEVOFFSET as keyof entvars_t] as edict_t,
      4 /* CHAN_BODY */,
      HIT_SOUND,                                    // [ebx-0x6e7b7]
      1.0,
      ATTN_NORM,
      0,
      pitchInt,
    );

    this.m_vecDamage = { x: 0xffff0000 } as Vector;
    this.m_iImpact = IMPACT_VALUE; // [ebx+0x1fd0]
    this.m_iPrimaryDamage = 0x460000;
    this.m_iSecondaryDamage = 96;
  }
}
