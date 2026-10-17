```typescript
/**
 * CTSStunt::GoWheel — Attempt to start a "wheel" stunt. Validates preconditions
 * (velocity, timing, player state, environment), picks a dive direction (view-
 * aligned at low speed, velocity-aligned at high speed), then commits to either
 * a high-dive or low-dive depending on player capability and dive variant.
 *
 * @param this  The CTSStunt entity instance
 * @returns     1 if the wheel started, 0 if not eligible
 */
export function GoWheel(this: CTSStunt): number {
  const player = this.m_pPlayer;
  const pev = player.pev;

  // ---- 1. Precondition checks (set esi=0 / canWheel=false on any failure) ----

  // 2D velocity magnitude squared
  const speed2D = pev.velocity.length2D();

  let canWheel = true;

  // Check 1: some time/global value must not equal this.m_flNextDive
  // (assembly: `jae` after `fcomp+sahf` fires on inequality)
  // TODO(asm-ambiguous): the exact semantics — appears to gate on the
  //   current time differing from this field; original C++ uses `!=`.
  if (gpGlobals.time === this.m_flNextDive) {
    canWheel = false;
  }

  // Check 2: this.m_flLastWheel must not equal current gpGlobals.time
  if (this.m_flLastWheel === gpGlobals.time) {
    canWheel = false;
  }

  // Check 3: player state flags — must NOT have any of 0x130c30 set
  // (FL_FROZEN | FL_AT_CONTROLS | etc. — exact flag meaning is engine-internal)
  // TODO(asm-ambiguous): which exact FL_* bits this mask represents.
  if ((pev.flags & 0x130c30) !== 0) {
    canWheel = false;
  }

  // Check 4: same global vs this.m_flMinInterval
  if (gpGlobals.time === this.m_flMinInterval) {
    canWheel = false;
  }

  // Check 5: not on a ladder
  if (player.IsOnLadder()) {
    canWheel = false;
  }

  // Check 6: same global vs this.m_flAnotherInterval
  if (gpGlobals.time === this.m_flAnotherInterval) {
    canWheel = false;
  }

  // Check 7: water check — only evaluated when player is NOT in water (bit 0x2 cleared)
  // The bit at pev+0x1a5 is some player-state byte (water level or flags);
  // when bit 0x2 is clear we additionally require that the player hasn't
  // just left the water (recently submerged time >0.4s).
  // TODO(asm-ambiguous): the exact semantics of the 0.4s threshold.
  if (!(player.someStateByte & 0x2)) {
    // Compute time-since-some-event and compare against 0.4s
    const timeSinceEvent = gpGlobals.time - pev.airFinishedTime;
    if (timeSinceEvent < 0.4) {
      canWheel = false;
    }
  }

  if (!canWheel) {
    // Failure path: schedule next try and bail out
    this.m_flLastWheel = gpGlobals.time + ts.stuntRetryDelay;
    return 0;
  }

  // ---- 2. Pick dive direction based on current 2D speed ----

  // Threshold on speed²: below threshold we use a view-aligned dive (variant 3),
  // at-or-above threshold we derive the direction from velocity.
  // (The `jae` after fcomp+sahf jumps on inequality; in practice this means
  //  we fall through to the slow path only on exact equality, which is rare —
  //  i.e., the high-speed / velocity-aligned path is the common case.)
  // TODO(asm-ambiguous): confirm the threshold semantics.
  let diveVariant = 0;
  if (speed2D === ts.stuntSpeedThreshold) {
    // ---- 2a. Slow-speed path: use negated view direction, variant 3 ----
    UTIL_MakeVectors(pev.angles);
    const vForward = globals.vForward;
    // Negate each component (XOR sign bit)
    this.m_vecDiveDir.set(-vForward.x, -vForward.y, -vForward.z);
    diveVariant = 3;
  } else {
    // ---- 2b. High-speed path: derive direction from player velocity ----
    const velocity = pev.velocity;
    const speed3D = velocity.length3D();
    if (speed3D < ts.stuntMinSpeed) {
      // Velocity too small: use a vertical-fallback direction
      this.m_vecDiveDir.set(0, 0, ts.stuntFallbackZ);
    } else {
      // Normalize velocity (scaled by ts.stuntDirScale)
      const inv = ts.stuntDirScale / speed3D;
      this.m_vecDiveDir.set(
        velocity.x * inv,
        velocity.y * inv,
        velocity.z * inv,
      );
    }

    // Use player angles (pev.v_angle?) to derive a refined direction
    const angles = pev.angles;
    const refined = GetDirection(this.m_vecDiveDir, angles, 0.4, 0.6);
    // Result is a vec3 — stored into local storage used by the dive handler
    // TODO: how the refined direction flows into the dive (consumed later)
  }

  // ---- 3. Timing check: only fire animation messages if enough time has passed ----
  const randomAdd = engfuncs.pfnRandomFloat(0, 10);
  const playerTime = player.someTimeGetter();
  if (randomAdd * ts.stuntTimeMult + playerTime >= ts.stuntTimeThreshold) {
    // Send the setup animation sequence (4 messages)
    engfuncs.pfnMessageBegin(MSG_ONE, ts.stuntSetupResource, ...);
    engfuncs.pfnWriteByte(player.edict, ...);
    engfuncs.pfnWriteShort(2);
    engfuncs.pfnMessageEnd();
  }

  // ---- 4. Try high-dive first ----
  if (this.CanDiveHigh()) {
    // Variant==3 always dives high; otherwise require low pitch angle
    const canHigh =
      diveVariant === 3 ||
      pev.angles.x < ts.stuntHighDivePitchMax;
    // TODO(asm-ambiguous): the precise pitch threshold value

    if (canHigh) {
      // Set high-dive flags on player
      pev.flags |= 0x4;
      pev.flags |= 0x400;

      // Copy ts.stuntPosVector (3 floats) into pev+0x174 (some position field)
      pev.position174 = ts.stuntPosVector;

      // Trigger animation sequence      Animate(this.m_pAnimation, player, 0x31); // 0x31 = WHEEL_DIVE_HIGH

      // Set additional flag and animation length
      pev.flags |= 0x100;
      pev.someFloat11c = 0.75; // 0x3f400000

      // Advance dive counter, store next-dive time
      this.m_flNextDive = this.NextDive();

      // Send network message with dive delay (truncated to int)
      const intDelay = (this.m_flNextDive * ts.stuntDiveTimeMult) | 0;
      engfuncs.pfnMessageBegin(MSG_ONE, ts.stuntDiveResource, player.edict, 0);
      engfuncs.pfnWriteShort(intDelay);
      engfuncs.pfnMessageEnd();

      // Play wheel sound
      const pitch = 0x5f + engfuncs.pfnRandomLong(0, 31); // 95 + random
      EMIT_SOUND_DYN(
        player.edict,
        4,                       // CHAN_VOICE-ish channel
        ts.stuntWheelSound,
        1.0,                     // attenuation
        0.8,                     // volume
        pitch,
        0.5,                     // flags-ish
      );

      // Clear last-wheel time
      this.m_flLastWheel = 0;

      // If diveVariant was 3, update melee bar and apply KungFu multiplier
      if (diveVariant === 3) {
        player.UpdateMeleeBar(ts.stuntMelee1 * ts.stuntMelee2);
        const meleeBonus = ts.stuntMelee1;
        const kfMult = player.KungFu() ? 2.0 : 1.0;
        player.m_flMeleeDamage = 0.4;     // 0x3e99999a
        player.m_flMeleeBonus = meleeBonus * kfMult;
        player.m_bMeleeFlag = 0;
        player.m_iMeleeCounter = 0;
      }
      return 1;
    }
  }

  // ---- 5. Otherwise try low-dive ----
  if (this.CanDiveLow()) {
    // Low-dive is only valid when diveVariant != 3
    if (diveVariant !== 3) {
      // Set low-dive flags on player
      pev.flags |= 0x4;
      pev.flags |= 0x800;

      // Copy ts.stuntPosVector into pev+0x174
      pev.position174 = ts.stuntPosVector;

      // Trigger animation sequence
      Animate(this.m_pAnimation, player, 0x32); // 0x32 = WHEEL_DIVE_LOW

      // Set additional flag and animation length
      pev.flags |= 0x80;
      pev.someFloat11c = 0.75;

      // For variant 2, set a specific frame time
      if (diveVariant === 2) {
        pev.someFloat120 = 0.25; // 0x3e800000
      }

      // Advance dive counter, store next-dive time
      this.m_flNextDive = this.NextDive();

      // Send network message
      const intDelay = (this.m_flNextDive * ts.stuntDiveTimeMult) | 0;
      engfuncs.pfnMessageBegin(MSG_ONE, ts.stuntDiveResource, player.edict, 0);
      engfuncs.pfnWriteShort(intDelay);
      engfuncs.pfnMessageEnd();

      // Play wheel sound (same as high-dive)
      const pitch = 0x5f + engfuncs.pfnRandomLong(0, 31);
      EMIT_SOUND_DYN(
        player.edict,
        4,
        ts.stuntWheelSound,
        1.0,
        0.8,
        pitch,
        0.5,
      );

      this.m_flLastWheel = 0;
      return 1;
    }
  }

  // ---- 6. Total failure ----
  this.m_flLastWheel = gpGlobals.time + ts.stuntRetryDelay;
  return 0;
}
```
