export function GoRoll(arg: any): number {
  // === Globals (PIC base in ebx; accessed via [ebx ± offset]) ===
  //   canRoll     @ [ebx+0x1b050]  (byte flag)
  //   gpGlobals   @ [ebx+0x1600]   (-> first dword is gpGlobals.time)
  //   minSpeed    @ [ebx-0x6f3f8]  (cvar — min 2D planar speed)
  //   rollSpeed   @ [ebx-0x6f3fc]  (cvar — speed scalar for roll velocity)
  //   threshold   @ [ebx-0x6f408]  (cvar — used for both cooldowns)
  //   cooldownSet @ [ebx-0x6df6c]  (cvar — stored to arg.field_0x04)
  //   rollVecSrc  @ [ebx+0x1888]   (vec3 — copied to pev+0x174)
  //   rollDir     @ [ebx+0x1b054]  (dword — GetDirection result)
  //   downOff     @ [ebx-0x6c318]  (cvar — z-offset for downward trace)
  //   soundName   @ [ebx-0x6c364]  (cvar — air-roll sound sample)
  //   randomMul   @ [ebx-0x6f06c]  (cvar — multiplier for the tick value)
  //   tickThresh  @ [ebx-0x6c314]  (cvar — referenced by the client-effect fcomp)
  //   timeDelta   @ [ebx-0x6de58]  (qword — added to gpGlobals.time on the
  //                                blocked path at 0x8d3cc)
  //   engineFns   @ [ebx+0x1aa8]   (engine functions table)
  //   msgTarget   @ [ebx+0x1d38]   (message-type table for the client effect)

  let canRoll = 1;

  // Precondition 1: next-allowed time vs. current gpGlobals.time. The asm
  // has a redundant branch on a FL_NOTARGET-style bit at 0x8d011; both
  // branches (0x8d01a and 0x8d038) execute this same comparison. The
  // early-exit at 0x8d033 jumps to 0x8d3df (return0) WITHOUT bumping
  // arg.field_0x0c — only the main-block path does that at 0x8d3cc.
  if (arg.field_0x0c < globals.gpGlobalsTime) {
    canRoll = 0;
    // No write to arg.field_0x0c here — match asm.
  }

  // Resolve the player's entvars.
  const pev = arg.field_0x40.pev;

  // Precondition 2: 2D planar speed must be >= minSpeed.
  const speed2D = Math.sqrt(
    pev.velocity.x * pev.velocity.x + pev.velocity.y * pev.velocity.y,
  );
  if (speed2D < globals.minSpeed) {
    canRoll = 0;
  }

  // Precondition 3: forbid in-water / monster / ducking / etc.
  // TODO(asm-ambiguous): 0x130c30 mask; the exact FL_* bit assignment
  // for TS entvars_t is not derivable from this chunk alone.
  if ((pev.flags & 0x130c30) !== 0) {
    canRoll = 0;
  }

  // Precondition 4: threshold cvar vs. arg.field_0x04.
  if (globals.threshold < arg.field_0x04) {
    canRoll = 0;
  }

  // Precondition 5: player must not be on a ladder.
  if (IsOnLadder(arg.field_0x40)) {
    canRoll = 0;
  }

  // Precondition 6: threshold cvar vs. arg.field_0x08.
  if (globals.threshold < arg.field_0x08) {
    canRoll = 0;
  }

  // Blocked path: bump the cooldown timer (0x8d3cc) and return 0.
  // This is the ONLY place arg.field_0x0c is bumped in this function.
  if (canRoll === 0) {
    arg.field_0x0c = globals.gpGlobalsTime + globals.timeDelta;
    return 0;
  }

  // === Roll execution ===

  // 3D speed and unit-velocity * rollSpeed. The asm at 0x8d0ec-0x8d168
  // uses `fcom st(1)` + `test ah, 0x40; je scale_path` — i.e. the scale
  // path is taken only when speed3D EQUALS threshold (effectively dead
  // code in float). Model as equality check, not `<`.
  const speed3D = Math.sqrt(
    pev.velocity.x * pev.velocity.x +
    pev.velocity.y * pev.velocity.y +
    pev.velocity.z * pev.velocity.z,
  );

  let rollVel;
  if (speed3D !== globals.threshold) {
    // Default: pure upward roll.
    rollVel = { x: 0, y: 0, z: globals.rollSpeed };
  } else {
    // Scale path (effectively dead in float; here for fidelity).
    const scale = globals.rollSpeed / speed3D;
    rollVel = {
      x: scale * pev.velocity.x,
      y: scale * pev.velocity.y,
      z: scale * pev.velocity.z,
    };
  }

  arg.field_0x20 = rollVel;

  // GetDirection(&rollVel, &pev+0x74, 0.6, 0.3) — returns a direction
  // index used to pick the roll animation variant. pev+0x74 is NOT a
  // known HLSDK field; treat as a TS extension.
  const dirVel = { x: rollVel.x, y: rollVel.y, z: rollVel.z };
  // TODO(asm-ambiguous): pev+0x74 — possibly v_angle.y/z, possibly a
  // TS-specific vec3. Not "startpos".
  const pev74 = {
    x: pev.field_0x74_x,
    y: pev.field_0x74_y,
    z: pev.field_0x74_z,
  };
  const dirIndex = GetDirection(dirVel, pev74, 0.6, 0.3);
  globals.rollDir = dirIndex;

  // Mutate the player's pev state for the roll.
  // TODO(asm-ambiguous): pev+0x120 — TS-specific fuser-like field,
  // not standard HLSDK fuser4 (which lives elsewhere).
  pev.field_0x120 = 0.3;
  pev.flags = (pev.flags & 0xffefffff) | 0x40005;
  // TODO(asm-ambiguous): 0x174 offset; TS-specific entvars_t extension.
  pev.field_0x174 = globals.rollVecSrc;
  arg.field_0x04 = globals.cooldownSet;

  // Animate the player with sequence 47 (0x2f).
  arg.field_0x28c.Animate(arg.field_0x40, 47);

  // === Sound: ground vs. air branch ===
  // 0x8d243 tests byte [pev+0x252] & 0x8; je 0x8d2ec (air). With the
  // bit meaning "on ground", non-zero → ground → TraceLine branch.
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
      pitch,              // pitch
    );
  }

  arg.field_0x0c = 0;

  // === Optional client-side effect ===
  // tickValue = vtResult * randomMul + randomInt. The asm at 0x8d369-0x8d374
  // uses `fcomp tickThresh; test ah, 0x41; jne skip` — i.e. SKIP if equal.
  // Fall-through (do the effect) happens when tickValue !== tickThresh.
  // For floats this is essentially "always", so the gate is informational
  // only — keep it for fidelity, fix the operator.
  const randomInt = engine.RandomLong(0, 10);
  // TODO(asm-ambiguous): vtable+0x10 with this=arg.field_0x40; the
  // [edx+0x10] vtable call is loaded from arg.field_0x40 + 0x60.
  const vtResult: number = arg.field_0x40.vtable[0x10](arg.field_0x40);
  const tickValue: number = vtResult * globals.randomMul + randomInt;

  if (tickValue !== globals.tickThresh) {
    const target = globals.msgTarget[0];
    engine.MessageBegin(4, target, pev.origin, 0);
    engine.WriteShort(pev.field_0x208);
    // WriteShort's return value (eax) is fed back as a byte argument
    // (0x8d3a5-0x8d3a8); in HL1 pfnWriteShort returns void, so this is a // TS-specific engine convention. 0 is a safe placeholder.
    engine.WriteByte(0);
    engine.WriteByte(2);
    engine.MessageEnd();
  }

  return 1;
}
