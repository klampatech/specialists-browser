/**
 * CTSStunt::CheckForWallClimb — checks if the player can initiate
 * a wall climb. Returns 1 if a wall climb may begin, 0 otherwise.
 *
 * @param this  The CTSStunt entity instance
 */
export function CheckForWallClimb(this: CTSStunt): number {
  const player: any = this.m_pPlayer;          // [this+0x40] -> CBasePlayer*
  const pev: any = player.pev;                 // CBasePlayer::pev (first member)

  // === Cooldown / state checks ===
  // If pev+0x252 has FL_DUCKING (mask 0x2) set, skip the cooldown
  // entirely (jump straight to wall detection).
  // Otherwise, require player+0x814 bit 0x2 to be set; bail if not.
  if ((pev.flags_0x252 & 0x2) === 0) {
    if ((player.flags_0x814 & 0x2) === 0) return 0;

    // Cooldown: re-arm m_flWallClimbTimer to the next allowed time
    // (timer = CONST + globals.time). If the timer is already in the
    // future, fall through to wall detection.
    const globals: any = gpGlobals;            // [ebx+0x1600] holds gpGlobals*
    if (this.m_flWallClimbTimer < globals.time) {
      this.m_flWallClimbTimer = WALL_CLIMB_COOLDOWN_CONST + globals.time;
      return 0;
    }
  }

  // === Wall detection ===
  // 1. Rebuild forward/right/up vectors from the player's view angle.
  UTIL_MakeVectors(pev.v_angle);                // pev+0x74

  // 2. Compute trace endpoint: origin + distance * v_forward.
  //    v_forward is at gpGlobals+0x28 (set by UTIL_MakeVectors).
  const distance = WALL_CLIMB_TRACE_DISTANCE;  // [ebx-0x6c328]
  const traceEnd: any = {
    x: pev.origin.x + distance * gpGlobals.v_forward.x,
    y: pev.origin.y + distance * gpGlobals.v_forward.y,
    z: pev.origin.z + distance * gpGlobals.v_forward.z,
  };

  // 3. Trace from the player's origin toward traceEnd.
  //    ignoreMonsters = 0; skip the player's own edict (pev+0x208,
  //    an edict_t* stored in pev at that offset in this build).
  const result: any = UTIL_TraceLine(
    pev.origin,
    traceEnd,
    /* ignoreMonsters */ 0,
    /* skipEdict     */ player.edict,
    /* traceResult   */ undefined,
  );

  // 4. flFraction >= 1.0 → trace missed entirely, no wall to climb.
  if (result.flFraction >= 1.0) return 0;

  // 5. flFraction == 0.0 → trace started inside a solid.
  //    Ask the engine for an entity at the origin and check whether
  //    it's "blocking" (vtable+0xc8 returns truthy). If so, bail.
  if (result.flFraction === 0.0) {
    // Asm: eax = [ebx+0x1aa8] (a global pointer);
    //      call [eax+0x114](0). Purpose of vtable slot unclear.
    const somePtr: any = g_someGlobal_1AA8;     // [ebx+0x1aa8]
    const X: any = somePtr?.vtable_0x114?.call(somePtr, 0);
    const hitEnt: any = X ? X.field_0x7c : null;

    if (hitEnt) {
      // Asm: eax = [hitEnt+0x60]; call [eax+0xc8](hitEnt).
      const innerPtr: any = hitEnt.field_0x60;  // [hitEnt+0x60]
      const isBlocking: any = innerPtr?.vtable_0xc8?.call(innerPtr, hitEnt);
      if (isBlocking) return 0;
    }
  }

  // 6. cond1: flFraction must be in (MIN, 1.0) — close enough that
  //    there's a wall, far enough that we're not touching it yet.
  //    Asm pattern: `fcomp` + `test ah, 0x41` + `jne` — cl=1 iff
  //    a > b (strictly greater).
  let cond1 = false;
  if (
    result.flFraction < 1.0 &&
    result.flFraction > WALL_CLIMB_HIT_FRACTION_MIN   // strictly >
  ) {
    cond1 = true;
  }

  // 7. cond2: also require vertical velocity to be above threshold  //    (same FPU pattern; dl=1 iff velocity.z > threshold).
  let cond2 = false;
  if (cond1 && pev.velocity.z > WALL_CLIMB_VERT_VELOCITY_THRESHOLD) {
    cond2 = true;
  }

  return cond2 ? 1 : 0;
}
