```typescript
/* eslint-disable */
// Stub declarations so this file compiles in isolation.
// The full CTSStunt layout is reconstructed separately in D.4.

// Helpers for vector/string globals accessed through the PIC/GOT table.
declare function readGlobalVector(gotOffset: number): { x: number; y: number; z: number };
declare function readFString(gotOffset: number): string;

// Tunable constants pulled from the disassembled GOT-relative data.
declare const JUMP_UP_RAMP: number;      // double at GOT-0x6c310
declare const SPEED_MULT: number;        // float  at GOT-0x6f06c
declare const BONUS_THRESHOLD: number;   // double at GOT-0x6e818

// GoldSrc engine shims used by this function.
declare function UTIL_MakeVectors(v: any): void;
declare function Animate(anim: any, player: any, seq: number): void;
declare function EMIT_SOUND_DYN(
  edict: any, channel: number, sample: string,
  vol: number, attn: number, pitch: number, flags: number,
): void;
declare const engine: {
  MessageBegin(msgType: number, svc: number, dest: any): void;
  WriteShort(v: number): void;
  WriteLong(v: number): void;
  MessageEnd(): void;
  someMethod(arg0: number, arg1: number): number;
};

// Minimal CTSStunt surface used by GoWallJump. Field purposes match the
// offsets the disassembly reads/writes; the full class lives in D.4.
interface CTSStunt {
  m_pPlayer: any;         // this+0x40  (pointer-to-pointer to player)
  m_vecWallJumpDir: any;  // this+0x20  (Vector: -v_forward)
  m_flJumpUpVel: number;  // this+0x38  (vertical ramp float)
  m_flJumpSpeed: number;  // this+0x00  (broadcast speed float)
  m_anim: any;            // this+0x28c (embedded CTSAnimation)
}

/**
 * CTSStunt::GoWallJump — fires a wall-jump stunt on the bound player.
 *
 * Snapshots a "backwards off the wall" push direction, toggles the TS
 * wall-jump flag bits on the player's m_fFlags, splats a global side-
 * vector into m_vecBaseVelocity, plays the wall-jump animation
 * (sequence 55), ramps a vertical-velocity float (floored at 0),
 * broadcasts the result via an engine svc_speed message, plays the
 * wall-jump SFX, and (when the fall-velocity bonus check clears
 * "above threshold") pushes an extra svc_velocity + bonus-tick
 * message so the client can blend the landing cleanly.
 *
 * @param this  CTSStunt entity. Reads m_pPlayer (this+0x40) and writes
 *              internal fields at offsets 0x00 (jump speed), 0x20
 *              (push direction), 0x38 (vertical ramp), and uses the
 *              embedded CTSAnimation at 0x28c.
 * @returns     void
 */
export function GoWallJump(this: CTSStunt): void {
  // Disassembly saves the first arg (this) into ebp (a callee-saved
  // register) and then reads everything off [ebp + offset]. The pointer
  // at [this+0x40] is deref'd twice before flag / velocity ops land:
  //   [ebp+0x40] -> [eax] -> entity
  // playerEnt is treated as the final deref.
  // TODO(asm-ambiguous): confirm whether [this+0x40] is CBaseEntity**
  //   or whose first dword aliases the entity pointer.
  const playerEnt = this.m_pPlayer.entity;

  // 1) Refresh world forward/right/up from the player's view angles.
  //    entvars_t::angles lives at +0x74.
  UTIL_MakeVectors(playerEnt.viewAngles);

  // 2) Cache -v_forward as the wall-jump push direction (this+0x20).
  //    The three component sign bits are flipped with XOR 0x80000000
  //    (operating on the global v_forward Vector at GOT+0x1600), and
  //    the resulting 12-byte Vector is rep-movsd'd into place.
  const fwd = readGlobalVector(/* got+0x1600 = v_forward */ 0x1600);
  this.m_vecWallJumpDir = { x: -fwd.x, y: -fwd.y, z: -fwd.z };

  // 3) Toggle the wall-jump flag bits on the player's m_fFlags
  //    (CBaseEntity+0x250). Five ops in the disasm:
  //      clear bit 20, set bit 2, set bit 12, set bit 16, clear bit 17.
  //    These bits are TS additions on top of HL1's stock FL_ flags.
  // TODO(asm-ambiguous): the TS flag names below are placeholders;
  //   0x100000 / 0x4 / 0x1000 / 0x10000 / 0x20000 must be cross-checked
  //   against the TS gameplay flag enum.
  let f = playerEnt.m_fFlags;
  f &= ~0x100000;            // clear bit 20
  f |=  0x4 | 0x1000 | 0x10000;  // set bits 2 / 12 / 16
  f &= ~0x20000;             // clear bit 17
  playerEnt.m_fFlags = f;

  // 4) Splat a 12-byte global Vector (read from GOT+0x1888) into the
  //    player's m_vecBaseVelocity (entity+0x174). Source is most likely
  //    gpGlobals->v_right — gives the jump a strafe push along the wall.
  playerEnt.m_vecBaseVelocity = readGlobalVector(/* got */ 0x1888);

  // 5) Fire the wall-jump animation (sequence 0x37 = 55). The embedded
  //    CTSAnimation lives at this+0x28c.
  Animate(/* &anim */ this.m_anim, this.m_pPlayer, /* seq */ 0x37);

  // 6) Cap run-speed at 0.75 (IEEE-754 single = 0x3f400000) and ramp
  //    the vertical-velocity float. [this+0x38] += JUMP_UP_RAMP
  //    (GOT-0x6c310), then the result is floored at 0 and stored at
  //    [this+0x00] — the value used in the broadcast below.
  playerEnt.m_flMaxSpeed = 0.75;
  this.m_flJumpUpVel += JUMP_UP_RAMP;
  this.m_flJumpSpeed  = Math.max(0, this.m_flJumpUpVel);

  // 7) Broadcast m_flJumpSpeed (truncated) as a svc_speed message to
  //    the player's owner handle (entity+0x208).
  engine.MessageBegin(/* MSG_ONE */ 1, /* svc_speed */ 1, playerEnt.owner);
  engine.WriteShort(Math.trunc(this.m_flJumpSpeed * SPEED_MULT));
  engine.MessageEnd();

  // 8) Emit the wall-jump SFX on channel 0x1f. Sample path is an
  //    FString at GOT-0x6c378. Pitch is read from the engine
  //    interface, then offset by 0x5f (shown here as the literal 0x6f).
  EMIT_SOUND_DYN(playerEnt.edict, /* channel */ 0x1f,
                 readFString(/* got */ -0x6c378),
                 /* vol */ 1.0, /* attn */ 0.8, /* pitch */ 0x6f,
                 /* flags */ 0);

  // 9) Optional stunt-bonus follow-up. Probe the player's recent fall
  //    velocity via vtable+0x10 ([m_pPlayer+0x60] is a function-
  //    pointer table; method offset 0x10/4 = 4), scale by SPEED_MULT,
  //    add the int returned by the engine interface call at edi+0x168
  //    (push 0xa, push 0x0), and fcomp the result against
  //    BONUS_THRESHOLD (GOT-0x6e818). With `test ah, 0x41; jne skip`
  //    on the FPU status, the bonus block fires when the comparison
  //    reads "above" threshold — i.e. strictly greater.
  //
  // TODO(asm-ambiguous): confirm what engine.someMethod(0, 0xa)
  //   returns, and which vtable slot [m_pPlayer+0x60]:+0x10 maps to
  //   on CBasePlayer.
  const engineTick = engine.someMethod(/* arg0 */ 0, /* arg1 */ 0xa);
  const fallVel = playerEnt.getFallVelocity();
  if (fallVel * SPEED_MULT + engineTick > BONUS_THRESHOLD) {
    engine.MessageBegin(/* MSG_ONE */ 1, /* svc_velocity */ 4,
                        playerEnt.velocity);
    engine.WriteLong(playerEnt.owner);
    engine.WriteShort(/* bonus tick */ 2);
    engine.MessageEnd();
  }
}
```
