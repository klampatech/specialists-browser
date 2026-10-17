/**
 * CTSStunt::GoRoll — attempts to initiate a forward roll/dodge for a player.
 *
 * @returns 1 if the roll was committed, 0 if a precondition blocked it.
 *
 * Asm-ambiguity notes:
 * - The time-check path at 0x8d018 splits on a FL_NOTARGET-style bit
 *    (pev+0x1a5 bit 0x2). NOTARGET-NOT-SET early-returns (no cooldown *    bump); NOTARGET-SET falls through to the other preconditions and
 *    ends up at the blocked path (0x8d3cc, which DOES bump). The TS
 *    currently doesn't model this; the rewrite falls through always
 *    (matches NOTARGET-SET, may differ from NOTARGET-NOT-SET).
 *  - The speed3D comparison uses C3 (fcom + test ah, 0x40), which means
 *    "scale when speed3D != threshold, default when equal/NaN". The
 *    rewrite matches this directly; the natural "< threshold" reading
 *    is incorrect.
 */
export function GoRoll(this_: any): number {
  // ---- Globals (PIC base in ebx; accessed via [ebx ± offset]) ----
  //   canRoll     @ [ebx+0x1b050]  (byte flag)
  //   gpGlobals   @ [ebx+0x1600]   (-> first dword is gpGlobals.time)
  //   minSpeed    @ [ebx-0x6f3f8]  (cvar — min 2D planar speed)
  //   rollSpeed   @ [ebx-0x6f3fc]  (cvar — speed scalar for roll velocity)
  //   threshold   @ [ebx-0x6f408]  (cvar — shared by cooldown + speed checks)
  //   cooldownSet @ [ebx-0x6df6c]  (cvar — stored to this_.field_0x04)
  //   rollVecSrc  @ [ebx+0x1888]   (vec3 — copied to pev+0x174)
  //   rollDir     @ [ebx+0x1b054]  (dword — GetDirection result)
  //   downOff     @ [ebx-0x6c318]  (cvar — z-offset for downward trace)
  //   soundName   @ [ebx-0x6c364]  (cvar — air-roll sound sample)
  //   randomMul   @ [ebx-0x6f06c]  (cvar — multiplier for the tick value)
  //   tickThresh  @ [ebx-0x6c314]  (cvar — threshold for client effect)
  //   timeDelta   @ [ebx-0x6de58]  (qword — added to gpGlobals.time at0x8d3cc)
  //   engineFns   @ [ebx+0x1aa8]   (engine functions table)
  //   msgTarget   @ [ebx+0x1d38]   (message-type table for client effect)

  let canRoll = 1;

  // Precondition 1: next-allowed time vs. current gpGlobals.time.
  // TODO(asm-ambiguous): NOTARGET-NOT-SET early-returns here WITHOUT a
  // cooldown bump; NOTARGET-SET falls through to the other preconditions
  // and bumps at the blocked path. Rewrite falls through (matches
  // NOTARGET-SET only). Restore explicit FL_NOTARGET check later.
  if (this_.field_0x0c < globals.gpGlobalsTime) {
    canRoll = 0;
  }

  // Resolve the player's entvars.
  const pev = this_.field_0x40.pev;

  // Precondition 2: 2D planar speed (sqrt(vx² + vy²)) must be >= minSpeed.
  const speed2D = Math.sqrt(
    pev.velocity.x * pev.velocity.x + pev.velocity.y * pev.velocity.y,
  );
  if (speed2D < globals.minSpeed) {
    canRoll = 0;
  }

  // Precondition 3: forbid certain FL_* flags.
  // TODO(asm-ambiguous): 0x130c30 mask; TS-specific entvars_t bit  // assignment isn't derivable from this chunk alone.
  if ((pev.flags & 0x130c30) !== 0) {
    canRoll = 0;
  }

  // Precondition 4: threshold cvar vs. this_.field_0x04.
  if (globals.threshold < this_.field_0x04) {
    canRoll = 0;
  }

  // Precondition 5: player must not be on a ladder.
  if (IsOnLadder(this_.field_0x40)) {
    canRoll = 0;
  }

  // Precondition 6: threshold cvar vs. this_.field_0x08.
  if (globals.threshold < this_.field_0x08) {
    canRoll = 0;
  }

  // Blocked path: bump the cooldown timer, return 0. (asm 0x8d3cc → 0x8d3df)
  // Reached when (a) time check failed (NOTARGET-SET case) or (b) any other
  // precondition failed. NOTARGET-NOT-SET + time-fail does NOT reach here
  // in the asm; see the TODO at the top.
  if (canRoll === 0) {
    this_.field_0x0c = globals.gpGlobalsTime + globals.timeDelta;
    return 0;
  }

  // === Roll execution ===

  // 3D speed and unit-velocity * rollSpeed.
  const speed3D = Math.sqrt(
    pev.velocity.x * pev.velocity.x +
    pev.velocity.y * pev.velocity.y +
    pev.velocity.z * pev.velocity.z,
  );

  // Asm: fcom st(1) + test ah, 0x40 + je 0x8d148 → scale when speed3D !=
  // threshold, default when speed3D == threshold OR NaN. The natural  // reading "speed3D < threshold → default" is WRONG here.
  // TODO(asm-ambiguous): the C3-based check is unusual; the original C
  // code likely was `if (speed3D != threshold)` (with `threshold` acting
  // as a sentinel like 0.0). Verify by game-testing with stationary vs.
  // moving players.
  let rollVel: { x: number; y: number; z: number };
  if (speed3D === globals.threshold || Number.isNaN(speed3D)) {
    // Default: pure upward roll.
    rollVel = { x: 0, y: 0, z: globals.rollSpeed };
  } else {
    // Scale the player's velocity unit vector by rollSpeed.
    const scale = globals.rollSpeed / speed3D;
    rollVel = {
      x: scale * pev.velocity.x,
      y: scale * pev.velocity.y,
      z: scale * pev.velocity.z,
    };
  }

  this_.field_0x20 = rollVel;

  // GetDirection(&rollVel, &pev.startpos, 0.6, 0.3) — returns a
  // direction index used to pick the roll animation variant. Asm
  // pushes `lea`-computed pointers; if TS's GetDirection takes
  // Vector*, dirVel won't be written back here (we only use the int
  // return, so this is OK).
  const dirVel = { x: rollVel.x, y: rollVel.y, z: rollVel.z };
  const startPos = {
    x: pev.startpos.x,
    y: pev.startpos.y,
    z: pev.startpos.z,
  };
  const dirIndex = GetDirection(dirVel, startPos, 0.6, 0.3);
  globals.rollDir = dirIndex;

  // Mutate the player's pev state for the roll.
  pev.fuser4 = 0.3;
  pev.flags = (pev.flags & 0xffefffff) | 0x40005;
  // TODO(asm-ambiguous): 0x174 offset; TS-specific entvars_t extension.
  pev.field_0x174 = globals.rollVecSrc;
  this_.field_0x04 = globals.cooldownSet;

  // Animate the player with sequence 47 (0x2f).
  this_.field_0x28c.Animate(this_.field_0x40, 47);

  // === Sound: ground vs. air branch ===
  if ((pev.field_0x252 & 0x8) !== 0) {
    // On ground: trace downward and play a surface-based footstep sound.
    // TODO(asm-ambiguous): 0x252 byte — TS-specific ground/stunt state.
    const traceEnd = {
      x: pev.origin.x,
      y: pev.origin.y,
      z: pev.origin.z - globals.downOff,
    };
    const trace: any = {};
    UTIL_TraceLine(
      pev.origin,        // start
      traceEnd,          // end (downward by downOff)
      1,                 // IGNORE_MONSTERS
      1,                 // IGNORE_GLASS
      pev.field_0x208,   // ignore entity
      trace,
    );
    TEXTURETYPE_PlaySound(trace, pev.origin, traceEnd, 0);
  } else {
    // In air: emit a dynamic sound with a randomized pitch.
    const pitch = engine.RandomLong(0, 31) + 0x5f;
    EMIT_SOUND_DYN(
      pev.field_0x208,    // edict
      4,                  // channel
      globals.soundName,  // sample
      1.0,                // volume
      0.8,                // attenuation
      0,                  // flags
      pitch,              // pitch (int in [0x5f, 0x7e])
    );
  }

  this_.field_0x0c = 0;

  // === Optional client-side effect ===
  // tickValue = vtResult * randomMul + random_int. If strictly greater
  // than tickThresh, broadcast a client message via the engine functions  // table. The asm uses test ah, 0x41 (C0 OR C3) + jne 0x8d3c4, which
  // means "fall through (broadcast) only when C3=0 AND C0=0", i.e.
  // ST(0) > tickThresh (strict). Equality and "<" both skip the broadcast.
  const randomInt = engine.RandomLong(0, 10);
  // TODO(asm-ambiguous): vtable+0x10 call loaded from this_.field_0x40 + 0x60.
  const vtResult: number = this_.field_0x40.vtable[0x10](this_.field_0x40);
  const tickValue: number = vtResult * globals.randomMul + randomInt;

  if (tickValue > globals.tickThresh) {
    const target = globals.msgTarget[0];
    engine.MessageBegin(4, target, pev.origin, 0);
    engine.WriteShort(pev.field_0x208);
    // WriteShort's return value is fed back as a byte (asm pattern); the
    // value 0 here is a placeholder — pfnWriteShort returns void in HL1
    // and TS's behavior here is unknown.
    engine.WriteByte(0);
    engine.WriteByte(2);
    engine.MessageEnd();
  }

  return 1;
}
