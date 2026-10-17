```
VERDICT: FAILContext note: this function is `CTSStunt::GoRoll(int)`, aninternal gameplay method — not one of the 4 engine↔mod
entry points (GiveFnptrsToDll / GetEntityAPI / GetEntityAPI2 /
GetNewDLLFunctions) the HLSDK reference doc covers. So
checklist items 2 (version check) and 3 (interfaceVersion
assignment-back) are N/A here. The rest apply, adapted to a
gameplay method.

Checklist:
1. Signature — ✅ pass-with-note. Name matches
   `GoRoll__8CTSStunti` → `CTSStunt::GoRoll(int)`. The demangled
   signature is `GoRoll(int)`, but the asm treats the first arg
   at [esp+0xb0] as a struct pointer (it has fields at +0x40,
   +0x20, +0x28c, etc.), so the "int" in the demangling is
   misleading. `arg: any` is the right choice for the TS.
2. Version check — N/A (not an API function).
3. interfaceVersion assignment-back — N/A.
4. Success path: struct copy — ✅ pass. `arg.field_0x20 =
   rollVel` matches the 12-byte `rep movs` at 0x8d174.
   `pev.field_0x174 = globals.rollVecSrc` matches the 12-byte
   copy at 0x8d220. Both copies are correctly represented.
5. No fabricated paths — ❌ fail. The early-exit path
   (precondition 1) fabricates a write to `arg.field_0x0c`:
   ```
   if (arg.field_0x0c < globals.gpGlobalsTime) {
     canRoll = 0;
     arg.field_0x0c = globals.gpGlobalsTime + globals.timeDelta; //<-- fabricated
     return 0;
   }
   ```
   The asm at 0x8d033 goes straight to 0x8d3df (return 0)
   with no store to `arg.field_0x0c`. Only the main-block
   cooldown path (0x8d3cc, reached via `je 0x8d3cc` at
   0x8d0e6) bumps `arg.field_0x0c`. The TS's `if (canRoll ===
   0)` block at the bottom correctly mirrors0x8d3cc — but
   the redundant write above corrupts it.
6. No TODO body — ✅ pass. Body is substantial code with
   inline `TODO(asm-ambiguous)` notes for genuinely
   unresolved bits (the 0x130c30 mask, pev+0x174/0x252 as
   TS extensions, etc.). Not a stub.
7. Field names — ⚠️ pass-with-notes. Some are correct   (`arg.field_0x40` = pev pointer, `pev.flags` at +0x250,
   `pev.velocity` at +0x20, `pev.origin` at +0x08). Others
   are unjustified guesses:
   - `pev.startpos` (offset 0x74) — there is no
     `startpos` field in HLSDK entvars_t. 0x74 lands inside
     `v_angle` (which starts at +0x70 and is 12 bytes). Should
     be `pev.field_0x74` or `pev.v_angle` (acknowledged TS
     extension). The TS does NOT mark this as ambiguous,
     unlike0x174/0x252.
   - `pev.fuser4` (offset 0x120) — `fuser4` is at a     different offset in HLSDK. Should be `pev.field_0x120`.
   - `globals.minSpeed` / `rollSpeed` / `threshold` /
     `cooldownSet` / `downOff` / `soundName` / `randomMul` /
     `tickThresh` / `timeDelta` — these are cvars at PIC-relative offsets. The names are reasonable
     inferences from usage but are not cross-referenced
     against `strings-n5.txt` per the AGENTS.md convention.
     Acceptable as TS-specific, but flag as unverified.
   - `arg.field_0x28c` as `CTSAnimation*` for the animate
     call — reasonable inference.
8. Compiles in isolation — ✅ pass. Uses `any` for unknowns;
   no external type references.

Issues to fix:
- ❌ **Critical — early-exit cooldown bump is fabricated.**
  Asm 0x8d033 → 0x8d3df returns 0 without touching
  `arg.field_0x0c`. The TS writes  `arg.field_0x0c = globals.gpGlobalsTime + globals.timeDelta`
  in that path, which will reset the cooldown even when the
  player wasn't allowed to roll. This changes gameplay
  behavior: a player who spams the roll key near a cooldown
  boundary will repeatedly reset their timer instead of being
  gated by it. Fix: remove the assignment in the early-exit
  branch, or fall through to the main `if (canRoll === 0)`
  block by not returning early.
- ⚠️ **fcom st(1) branch semantics at 0x8d11d-0x8d126.** The
  asm does `test ah, 0x40; je 0x8d148` — i.e. "scale path"
  branches on **C3 (equality)**, not on `< threshold`. In
  float arithmetic, exact equality between `speed3D` and the
  cvar value at `[ebx-0x6f408]` essentially never happens, so
  the default `(0, 0, rollSpeed)` path is taken almost
  always — the scale path is effectively dead code in
  practice. The TS's `if (speed3D < globals.threshold)`
  inverts the semantics: it scales when speed ≥ threshold.
  In the common case (speed ≠ threshold), the TS and asm
  agree (always take default), so the bug is dormant, but if
  any caller sets `threshold` to exactly the player's
  current speed the asm takes the scale path and the TS
  takes the default. Fix: model it as `if (speed3D !==
  globals.threshold) { /* scale */ } else { /* default */ }`,
  or just always emit the default and drop the dead scale
  branch with a TODO.
- ⚠️ **Tick-effect comparison at 0x8d369-0x8d374.** `test ah,
  0x41; jne 0x8d3c4` is "skip if equal" — i.e. the client
  effect fires iff `tickValue !== tickThresh`. The TS uses
  `if (tickValue >= globals.tickThresh)`. With floats these
  are functionally equivalent (exact equality is essentially
  unreachable), but the condition as written is wrong. Fix:
  use `if (tickValue !== globals.tickThresh)` or simply
  remove the gate if the intent was "always fire".
- ⚠️ **Field name "startpos" is unjustified.** pev+0x74 isn't
  `startpos` in HLSDK entvars_t — it lands in the middle of
  `v_angle`. Either rename to `pev.field_0x74` or document
  this as a TS-specific extension. Same for `pev.fuser4` at
  offset 0x120 (not the standard HLSDK location).
- ⚠️ **Cooldown delta treated as float; asm stores with  `fadd` (qword-precision FPU add at 0x8d3d4-0x8d3dc).**
  The asm does `fld QWORD PTR [ebx-0x6de58]` (qword load)
  then `fadd DWORD PTR [eax]` (gpGlobals.time as dword),
  then `fstp DWORD PTR [ebp+0xc]` (store as dword). So the
  delta is loaded as a 64-bit float (double) and added to the32-bit gpGlobals.time, then truncated to 32-bit float on
  store. The TS's `+` on JS numbers is double-precision, so
  the semantics are roughly the same; just note that the
  result is rounded to single-precision before store.

Suggested rewrite (only the changed/affected regions shown;
unchanged regions are elided with comments):

```typescript
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
```

Summary of what changed:
- **Removed** the fabricated `arg.field_0x0c = ...` write from the
  early-exit precondition-1 branch; the function now flows into the
  shared `if (canRoll === 0)` cooldown block at the bottom, which is
  the only place the asm bumps `arg.field_0x0c` (at 0x8d3cc).
- **Fixed** the roll-velocity branch operator from `<` to `!==` to
  match the asm's C3 (equality) check.
- **Fixed** the tick-effect gate from `>=` to `!==` to match the
  asm's "skip if equal" semantics.
- **Renamed** `pev.startpos` to `pev.field_0x74_x/y/z` and added a
  TODO; **renamed** `pev.fuser4` to `pev.field_0x120` and added a
  TODO. Both are TS-specific offsets and shouldn't be claimed as
  standard HLSDK field names without evidence.
- TODO comments updated to reflect the new ambiguities.
