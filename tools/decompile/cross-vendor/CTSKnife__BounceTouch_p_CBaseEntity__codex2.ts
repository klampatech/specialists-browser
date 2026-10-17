// TypeScript skeleton for CTSKnife::BounceTouch, derived from
// tools/decompile/chunks/BounceTouch__8CTSKnifeP11CBaseEntity.chunk.md
// (offset 0x0006decc, size 0xb63).
//
// All class/struct types and unresolved constants are typed as `any` —
// see HANDOFF.md / SPEC.md for the field-resolution pass.
//
// Bugs fixed in this rewrite (relative to the original decompile):
//   - newOrigin sign: was `+`, now `-` (the asm does fsubrp).
//   - velocity assignment: was `(1, 1, 1)`, now the offset vector.
//   - ApplyMultiDamage: was (other, this), now (this, attacker).
//   - Rate-limit in step 6: removed (no lastSlowMoPrintTime in asm).
//   - Random pitch in non-damageable paths: now expressed honestly.
//   - Sound sample names: HIT_SOUND vs FLY_SOUND distinguished.

export function BounceTouch(this: any, other: any): void {
  // ---- Step 1: schedule next think (runs even on early-return paths) ----
  this.pev.nextthink = (gpGlobals as any).time + 0.1;

  // ---- Step 2: skip self-owners and high-effects-bit entities ----
  if (other.pev.owner === this.m_hOwner) return;
  if ((other.pev.effects & 0x80) !== 0) return;

  // ---- Step 3: compute current velocity magnitude ----
  const v = this.pev.velocity;
  const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

  if (speed < 0.5 /* MIN_BOUNCE_SPEED, [ebx-0x6df54] */) {
    this.m_bTouchedSomething = false; // [esi+0x90]
  }

  // ---- Step 4: anchor → origin delta (sqrt is computed but discarded) ----
  const anchor = this.m_vecPos1;                            // [esi+0x94]
  const origin = this.pev.origin;
  const dx = anchor.x - origin.x;
  const dy = anchor.y - origin.y;
  const dz = anchor.z - origin.z;
  void Math.sqrt(dx * dx + dy * dy + dz * dz);

  // ---- Step 5: pick bounce scalar by knife mode ----
  let bounceScalar: number;
  if (this.m_iMode === 8) {
    bounceScalar = 0 /* MODE_8_BOUNCE, [ebx-0x6df50] — TODO: unknown */;
  } else if (this.m_iMode === 6) {
    bounceScalar = 1.0;                                     // [ebx-0x6e7f4]
  } else {
    bounceScalar = 0.0;                                     // [ebx-0x6df64]
  }

  // ---- Step 6: paused-server HUD print (no rate-limit in asm) ----
  if (isServerPaused /* cvar at [ebx+0x1dbc] */()) {
    const msg = UTIL_VarArgs("%s%.1f\n", "Slow motion: ", bounceScalar);
    UTIL_ClientPrintAll(3 /* HUD_PRINTCENTER */, msg);
  }

  // ---- Step 7: clear "just bounced" flag ----
  this.m_fJustBounced = false;                              // [esi+0x91]

  // ---- Step 8: branch on takedamage ----
  // Asm: [other->pev + 0x16c] != 0.0 AND virtual call (vtable+0xc8) != 0.
  // The first guard corresponds to takedamage > 0; the virtual call is
  // likely IsAlive.
  if (other.pev.takedamage > 0) {
    if (!other.IsAlive?.()) {
      bounceOffNonDamageable(this, other);
      return;
    }

    // Attacker: m_hOwner + 0x80 (edict→entvars adjustment) if non-null,
    // else this->pev. The +0x80 is engine-specific; treat as TODO.
    const attacker = this.m_hOwner ?? this;

    const trace = UTIL_GetGlobalTrace();
    ClearMultiDamage();

    const dir = speed > 0
      ? { x: v.x / speed, y: v.y / speed, z: v.z / speed }
      : { x: 0, y: 0, z: 1 };

    other.TakeDamage({
      inflictor: this.pev,
      attacker: attacker.pev,
      damage: bounceScalar,
      damageType: 0x8001000,                                // DMG_SLASH | DMG_NEVERGIB | ?
      direction: dir,
      traceEnd: trace.vecEndPos,
    });
    ApplyMultiDamage(this.pev, attacker.pev);                // (inflictor, attacker)

    // Reflect velocity: negate × bounce factor.
    const bv = this.pev.velocity;
    bv.x = -bv.x * 0.45 /* BOUNCE_FACTOR, [ebx-0x6df78] */;
    bv.y = -bv.y * 0.45;
    bv.z = -bv.z * 0.45;

    EMIT_SOUND_DYN(
      this.pev.owner,                                      // [pev+0x208]
4 /* CHAN_BODY */,
      "HIT_SOUND" /* [ebx-0x6df30] */,
      1.0,
      0.8 /* ATTN_NORM */,
      0,
      100 /* pitch, fixed */,
    );

    this.m_vecDamage = { x: 0xffff0000 };                   // [esi+0x14]
    this.m_iImpact = 0 /* IMPACT_VALUE, [ebx+0x1fd0] — TODO: unknown */;
    this.m_iPrimaryDamage = 0x460000;                       // [esi+0xc]
    this.m_iSecondaryDamage = 96;                           // [esi+0x10]
  } else {
    // Non-damageable target.
    const otherClassname = STRING(other.pev.classname);

    if (FStrEq(otherClassname, "TS_CLASSNAME_1" /* [ebx-0x6e053] */)) {
      const trace = UTIL_GetGlobalTrace();

      const sd = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      const dir = sd > 0
        ? { x: v.x / sd, y: v.y / sd, z: v.z / sd }
        : { x: 0, y: 0, z: 1 };

      // BUG FIX (was `+`): asm produces `origin - offset`.
      const offset = 0.5 /* BOUNCE_OFFSET, [ebx-0x6df74] */;
      const newOrigin = {
        x: this.pev.origin.x - dir.x * offset,
        y: this.pev.origin.y - dir.y * offset,
        z: this.pev.origin.z - dir.z * offset,
      };
      UTIL_SetOrigin(this.pev, newOrigin);

      // angles = UTIL_VecToAngles(offset vec); copied to pev->angles + v_angle.
      const angles = UTIL_VecToAngles({
        x: dir.x * offset,
        y: dir.y * offset,
        z: dir.z * offset,
      });
      this.pev.angles = { x: angles.x, y: angles.y, z: angles.z };
      this.pev.v_angle = { x: angles.x, y: angles.y, z: angles.z };

      this.pev.angles.z = 90.0;                             // [pev+0x58]
      this.pev.animtime = 0;                                // [pev+0x10c]
      this.pev.frame = 5;                                   // [pev+0x108]

      // BUG FIX (was `(1, 1, 1)`): rep movs copies the offset vec here.
      this.pev.velocity = { x: dir.x * offset, y: dir.y * offset, z: dir.z * offset };

      // gpGlobals->v_forward/v_right/v_up → pev+0x5c (skipped; engine-side).
      // TODO: copy [ebx+0x1888] (3 floats) into this.pev + 0x5c.

      // pitch = (int)(RANDOM_FLOAT(-10, 0) + 1) ∈ [-9, 1]
      const pitchA = Math.floor(RANDOM_FLOAT(-10, 0) + 1);
      EMIT_SOUND_DYN(
        this.pev.owner,
        4 /* CHAN_BODY */,
        "FLY_SOUND" /* [ebx-0x6e7b7] */,
        1.0,
        0.8 /* ATTN_NORM */,
        0,
        pitchA,
      );
    } else if (FStrEq(otherClassname, "TS_CLASSNAME_2" /* [ebx-0x6e62b] */)) {
      return;
    } else {
      // Generic bounce: reflect velocity, sparks (if not in sky), sound.
      const bv = this.pev.velocity;
      bv.x = -bv.x * 0.45;
      bv.y = -bv.y * 0.45;
      bv.z = -bv.z * 0.45;

      if (UTIL_PointContents(this.pev.origin) !== -3 /* CONTENTS_SKY */) {
        UTIL_Sparks(this.pev.origin);
      }

      // pitch = (int)(RANDOM_FLOAT(0, 10) + 1) ∈ [1, 11]
      const pitchB = Math.floor(RANDOM_FLOAT(0, 10) + 1);
      EMIT_SOUND_DYN(
        this.pev.owner,
        4 /* CHAN_BODY */,
        "FLY_SOUND" /* [ebx-0x6e7b7] */,
        1.0,
        0.8 /* ATTN_NORM */,
        0,
        pitchB,
      );

      this.m_vecDamage = { x: 0xffff0000 };
      this.m_iImpact = 0;
      this.m_iPrimaryDamage = 0x460000;
      this.m_iSecondaryDamage = 96;
    }
  }

  // ---- Step 9: final state stamping ----
  this.pev.nextthink = (gpGlobals as any).time + 0.1;
  this.m_flTime = (gpGlobals as any).time + 0.1;            // [esi+0x88]
  this.pev.scale = 0.75;                                    // [pev+0x11c]
  this.m_bTouchedSomething = false;                         // [esi+0x90]
}
