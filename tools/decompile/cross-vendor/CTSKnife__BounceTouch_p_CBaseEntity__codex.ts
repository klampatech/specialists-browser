I have all I need from the disassembly chunk. Let me produce the TypeScript output.

```typescript
/**
 * CTSKnife::BounceTouch — Handle a knife projectile colliding with another entity.
 *
 * Behavior summary (derived from the 0x0006decc disassembly):
 *   1. Schedule a short next-think (the line is duplicated at end of fn).
 *   2. Skip if the touched entity is the knife's owner, or if the touched
 *      entity has the high effects bit set.
 *   3. Compute current velocity magnitude; clear the "has-touched" flag when
 *      the knife is barely moving.
 *   4. Compute anchor → origin delta and its squared length (the sqrt of *      distSq is computed but discarded — a compiler optimization).
 *   5. Pick a bounce scalar from the knife's current mode:
 *        mode == 8  → specific value (mode-8 bounce)
 *        mode == 6  → 1.0
 *        otherwise  → 0.0
 *   6. If the server is in slow-motion / paused, broadcast a HUD print *      (rate-limited by a 0.5s threshold) showing the bounce scalar.
 *   7. Clear the "just bounced" flag.
 *   8. Branch on whether the touched entity can take damage:
 *        damageable + alive  → slash damage + reflect velocity
 *        non-damageable      → bounce off surface, with sparks + sound
 *   9. Stamp the final next-think time, scale, and timing fields.
 *
 * @param this  The CTSKnife projectile entity.
 * @param other The entity the knife just touched.
 * @returns     void
 */
export function BounceTouch(this: CTSKnife, other: CBaseEntity): void {
  // ---- PIC / GOT base is in `ebx` after `call $+5; pop ebx; add ebx, 0xf7f35` ----
  // ---- All GOT-relative constants in this function live in .rodata/data. ---------

  // ============================================================
  // Step 1: schedule the next think (runs even on early-return paths)
  // ============================================================
  // pev->nextthink = gpGlobals->time + INTERVAL
  // [ebx-0x6ecd8] is a small interval constant (~0.1s); same value used at end of fn.
  this.pev.nextthink = gpGlobals.time + NEXT_THINK_INTERVAL;

  // ============================================================
  // Step 2: skip self-owners and flag-blocked entities
  // ============================================================
  if (other.pev.owner === this.m_hOwner) return;          // [esi+0x8c]
  if ((other.pev.effects & 0x80) !== 0) return;           // [pev+0x118] high bit

  // ============================================================
  // Step 3: compute current velocity magnitude
  // ============================================================
  const v = this.pev.velocity;
  const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

  // Below the speed threshold we don't count this as a real touch.
  // [ebx-0x6df54] — speed threshold (≈0.5).
  if (speed < MIN_BOUNCE_SPEED) {
    this.m_bTouchedSomething = false;                      // [esi+0x90]
  }

  // ============================================================
  // Step 4: anchor → origin delta and squared distance
  // ============================================================
  const anchor = this.m_vecPos1;                            // [esi+0x94]
  const origin = this.pev.origin;
  const dx = anchor.x - origin.x;
  const dy = anchor.y - origin.y;
  const dz = anchor.z - origin.z;
  // The sqrt is computed in the assembly but the result is discarded.
  const distSq = dx * dx + dy * dy + dz * dz;
  void Math.sqrt(distSq);

  // ============================================================
  // Step 5: pick bounce scalar by knife mode
  // ============================================================
  // [esi+0xa0] = m_iMode
  let bounceScalar: number;
  if (this.m_iMode === 8) {
    bounceScalar = MODE_8_BOUNCE;                          // [ebx-0x6df50]
  } else if (this.m_iMode === 6) {
    bounceScalar = 1.0;                                    // [ebx-0x6e7f4]
  } else {
    bounceScalar = 0.0;                                    // [ebx-0x6df64]
  }

  // ============================================================
  // Step 6: slow-motion / paused-server HUD print (rate-limited)
  // ============================================================
  // [ebx+0x1dbc] is the "paused" cvar (or similar).
  // [ebx-0x6f408] = 0.0; [ebx-0x6f3fc] = 1.0; [ebx-0x6dfc8] = format string.
  // The combined condition is: not paused AND time since last print ≥ 0.5s.
  if (!isServerPaused() && gpGlobals.time - lastSlowMoPrintTime >= 0.5) {
    const msg = UTIL_VarArgs("%s%.1f\n", SLOW_MO_LABEL, bounceScalar);
    UTIL_ClientPrintAll(/* HUD_PRINTCENTER */ 3, msg);
    lastSlowMoPrintTime = gpGlobals.time;
  }

  // ============================================================
  // Step 7: clear "just bounced" flag
  // ============================================================
  this.m_fJustBounced = false;                             // [esi+0x91]

  // ============================================================
  // Step 8: branch on takedamage
  // ============================================================
  if (other.pev.takedamage > 0) {
    // ---------------------------------------------
    // 8a: damageable target — slash + reflect
    // ---------------------------------------------
    // Virtual call on `other` to check liveness.
    // [other+0x60] is a vtable pointer; the function at offset 0xc8 returns
    // a boolean (non-zero = alive).
    // TODO(asm-ambiguous): confirm whether this is IsAlive() or IsPlayer()
    //   or some other liveness predicate.
    if (!other.IsAlive?.()) {
      bounceOffNonDamageable(this, other);
      return;
    }

    // Pick the attacker entity.
    // If m_hOwner is set, the caller passes `m_hOwner` itself; if null,
    // it falls back to the knife's own entvars.
    // TODO(asm-ambiguous): the `+0x80` offset on m_hOwner in the assembly
    //   appears to be a pointer-mask trick (sete + dec + and) rather than a
    //   real field offset. Modeled below as "use m_hOwner if set, else this".
    const attacker = this.m_hOwner ?? this;

    const trace = UTIL_GetGlobalTrace();
    ClearMultiDamage();

    // Re-normalize velocity for the damage direction.
    // If speed == 0, fall back to (0, 0, 1) — "up".
    const dir = speed > 0
      ? { x: v.x / speed, y: v.y / speed, z: v.z / speed }
      : { x: 0, y: 0, z: 1 };

    // Slash damage via virtual TakeDamage on the target.
    // 0x8001000 = DMG_SLASH (0x10) | DMG_NEVERGIB (0x1000) | DMG_? (0x8000000).
    other.TakeDamage({
      inflictor: this.pev,
      attacker: attacker.pev,
      damage: bounceScalar,
      damageType: 0x8001000,
      direction: dir,
      traceEnd: trace.vecEndPos,                            // [esp+0x7c]
    });
    ApplyMultiDamage(other.pev, this.pev);

    // Reflect velocity: negate and apply bounce factor.
    // [ebx-0x6df78] = bounce factor (~0.5).
    const bv = this.pev.velocity;
    bv.x = -bv.x * BOUNCE_FACTOR;
    bv.y = -bv.y * BOUNCE_FACTOR;
    bv.z = -bv.z * BOUNCE_FACTOR;
    // (The assembly uses rep movs to copy the negated vector back into
    // pev->velocity; same effect as the assignment above.)

    // Play hit sound at the owner.
    EMIT_SOUND_DYN(
      this.pev.owner,                                       // [pev+0x208]
      /* CHAN_BODY */ 4,
      HIT_SOUND,                                            // [ebx-0x6df30]
      1.0,
      ATTN_NORM,
      0,
      /* pitch */ 100,
    );

    // Set up event/impact data (sent to clients on next packet).
    this.m_vecDamage = { x: 0xffff0000 };                   // [esi+0x14]
    this.m_iImpact = IMPACT_VALUE;                          // [esi+0x18] = [ebx+0x1fd0]
    this.m_iPrimaryDamage = 0x460000;                       // [esi+0xc]
    this.m_iSecondaryDamage = 96;                           // [esi+0x10] = 0x60
  } else {
    // ---------------------------------------------
    // 8b: non-damageable surface — bounce off
    // ---------------------------------------------
    // Resolve other->pev->classname as a char* and test against two
    // specific classnames:
    //   [ebx-0x6e053] — classname #1 (full bounce with origin shift + fly sound)
    //   [ebx-0x6e62b] — classname #2 (no action, just exit)
    // TODO(asm-ambiguous): the assembly uses an unusual gpGlobals+0x98 + other
    //   pattern for the classname resolve. The standard
    //   STRING(other->pev->classname) macro is the most likely intent.
    const otherClassname = STRING(other.pev.classname);

    if (FStrEq(otherClassname, TS_CLASSNAME_1 /* [ebx-0x6e053] */)) {
      // -------- Special bounce: re-orient with origin shift --------
      const trace = UTIL_GetGlobalTrace();

      // Compute unit direction from current velocity (or "up" if zero).
      const sd = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      const dir = sd > 0
        ? { x: v.x / sd, y: v.y / sd, z: v.z / sd }
        : { x: 0, y: 0, z: 1 };

      // Shift origin by direction * mode-scaled offset.
      // [ebx-0x6df74] = mode-scale factor (~0.5).
      const offset = BOUNCE_OFFSET;
      const newOrigin = {
        x: this.pev.origin.x + dir.x * offset,
        y: this.pev.origin.y + dir.y * offset,
        z: this.pev.origin.z + dir.z * offset,
      };
      UTIL_SetOrigin(this.pev, newOrigin);

      // Convert direction to angles and copy into pev->angles + v_angle.
      // The assembly does two rep movs of 3 floats — first to a scratch
      // buffer, then back to edx+0x50 (pev->v_angle).
      const angles = UTIL_VecToAngles(newOrigin);
      this.pev.angles = { x: angles.x, y: angles.y, z: angles.z };
      this.pev.v_angle = { x: angles.x, y: angles.y, z: angles.z };

      // Stamp velocity-related fields.
      // [pev+0x58] = pev->angles.z = 90.0  (0x42b40000)
      // [pev+0x10c] = pev->animtime = 0
      // [pev+0x108] = pev->frame = 5
      this.pev.angles.z = 90.0;
      this.pev.animtime = 0;
      this.pev.frame = 5;

      // Re-write velocity from the offset direction (1.0-scaled).
      // [ebx-0x6f408] = 1.0; the rep movs here effectively copies a
      // (1.0, 1.0, 1.0) "neutral" velocity vector into pev->velocity.
      this.pev.velocity = { x: 1, y: 1, z: 1 };

      // Also copy gpGlobals->v_forward/v_right/v_up from offset into pev.
      // [ebx+0x1888] is a pointer to that vector block; copied to pev+0x5c.
      // Skipped in this TS — TS engine-side data, not gameplay-relevant.

      // Emit the "fly through" sound at the owner.
      EMIT_SOUND_DYN(
        this.pev.owner,
        /* CHAN_BODY */ 4,
        FLY_SOUND,                                          // [ebx-0x6e7b7]
        1.0,
        ATTN_NORM,
        0,
        /* pitch */ computeRandomPitch(),
      );
    } else if (FStrEq(otherClassname, TS_CLASSNAME_2 /* [ebx-0x6e62b] */)) {
      // -------- Classname #2: just exit, do nothing --------
      return;
    } else {
      // -------- Generic bounce: reflect velocity --------
      const bv = this.pev.velocity;
      bv.x = -bv.x * BOUNCE_FACTOR; // [ebx-0x6df78]
      bv.y = -bv.y * BOUNCE_FACTOR;
      bv.z = -bv.z * BOUNCE_FACTOR;

      // Spawn sparks at pev->origin unless it's in CONTENTS_SKY (-3).
      if (UTIL_PointContents(this.pev.origin) !== CONTENTS_SKY) {
        UTIL_Sparks(this.pev.origin);
      }

      // Play hit sound at the owner.
      EMIT_SOUND_DYN(
        this.pev.owner,
        /* CHAN_BODY */ 4,
        HIT_SOUND,                                          // [ebx-0x6e7b7]
        1.0,
        ATTN_NORM,
        0,
        /* pitch */ 100,
      );

      // Set up event/impact data (same shape as the damage path).
      this.m_vecDamage = { x: 0xffff0000 };
      this.m_iImpact = IMPACT_VALUE;                        // [ebx+0x1fd0]
      this.m_iPrimaryDamage = 0x460000;
      this.m_iSecondaryDamage = 96;
    }
  }

  // ============================================================
  // Step 9: final state stamping
  // ============================================================
  this.pev.nextthink = gpGlobals.time + NEXT_THINK_INTERVAL; // [ebx-0x6ecd8]
  this.m_flTime = gpGlobals.time + 0.1;                     // [ebx-0x6ecd0] → [esi+0x88]
  this.pev.scale = 0.75;                                     // 0x3f400000 → [pev+0x11c]
  this.m_bTouchedSomething = false;                          // [esi+0x90]
}
```
