/* eslint-disable */
/**
 * CTSStunt::GoWallJump — fire a wall-jump stunt on the bound player.
 *
 * Faithful re-decompilation of `GoWallJump__8CTSStunt` at 0x0008a7d4
 * (584 bytes / 0x248). External symbols here (ENGINE_GET, FtoFT_Round
 * etc.) are typed-only stubs to keep this file compiling in isolation;
 * the runtime resolution belongs in the link layer.
 *
 * NOT YET VERIFIED in D.4 (carry as TODOs):
 *   - mapping of (player + 0x208) to a named CBasePlayer field
 *   - mapping of (player + 0x250) to a named flag word
 *   - mapping of (player + 0x174) / 0x11c to vecBaseVelocity / maxSpeed
 *   - what the vtable slot [*(m_pPlayer+0x60)+0x10] computes
 *   - whether ([ebx+0x168c]) and ([ebx+0x1d38]) are svc_speed
 *     and svc_velocity globals or something else in this build
 */

// --- external helpers (declared, not defined here) --------------------
declare function readGlobalVector(gotOffset: number): { x: number; y: number; z: number };
declare function readGlobalInt(gotOffset: number): number;

declare const JUMP_UP_RAMP: number;     // double @ GOT-0x6c310
declare const ZERO_DOUBLE: number;      // double @ GOT-0x6f010
declare const SPEED_MULT: number;       // float  @ GOT-0x6f06c
declare const BONUS_THRESHOLD: number;  // double @ GOT-0x6e818

declare function UTIL_MakeVectors(v: any): void;
declare function Animate(anim: any, player: any, seq: number): void;
declare function RandomLong(low: number, high: number): number;
declare function FtoFT_Round(x: number): number;  // FIST with CW=0xC (round-to-nearest)
declare const ENGINE_GET: {
  // These slot offsets (edi+0xbc / +0xb8 / +0xc0 / +0x11c / +0x168)
  // are observed in this binary's copy of enginefuncs_t; the slot
  // NAMES are inferred from typical HLSDK usage but unverified.
  MessageBegin(msg_dest: number, svc: number, origin: any, dest: any): void;
  WriteShort(v: number): void;
  WriteLong(v: number): void;
  MessageEnd(): void;
  GetSomeUserId(handle: any): number;   // engine func @ edi+0x11c, TODO name
};

declare function EMIT_SOUND_DYN(
  edict: any, channel: number, sample: string,
  volume: number, attenuation: number, fflags: number, pitch: number, globalGain: number,
): void;

// --- the surface that matches the disasm ------------------------------
interface CTSStunt {
  // [ebp+0x40] (this+0x40): a pointer that gets double-derefed in the
  // disassembly to reach the player struct. Single-level pointer, NOT
  // pointer-to-pointer. Field name follows convention; type is `any`.
  m_pPlayer: any;

  // this+0x20 — 12-byte Vector written by step 2 (-v_forward).
  m_vecWallJumpDir: { x: number; y: number; z: number };

  // this+0x38 — single-precision ramp accumulator (step 6).
  m_flJumpUpVel: number;

  // this+0x00 — single-precision broadcast value (clamped >= 0, step 6).
  m_flJumpSpeed: number;
}

/**
 * @returns void
 */
export function GoWallJump(this: CTSStunt): void {
  const pPlayer = this.m_pPlayer;

  // (1) Make world vectors from player's view angles.
  //     UTIL_MakeVectors(pPlayer->angles @ +0x74).
  UTIL_MakeVectors((pPlayer as any).angles_at_0x74);

  // (2) this.m_vecWallJumpDir = -v_forward (12-byte copy, rep movsd).
  const fwd = readGlobalVector(/* GOT+0x1600 = v_forward */ 0x1600);
  this.m_vecWallJumpDir = { x: -fwd.x, y: -fwd.y, z: -fwd.z };

  // (3) Toggle 5 wall-jump flag bits on *(m_pPlayer + 0x250):
  //     clear bit20, set bit2, set bit12, set bit16, clear bit17.
  //     Bit constants come straight from the disasm; the FLAG-NAME
  //     mapping is a D.4 TODO.
  let flags = (pPlayer as any).flagword_at_0x250 as number;
  flags = (flags & ~0x100000) | 0x4 | 0x1000 | 0x10000;
  flags = flags & ~0x20000;
  (pPlayer as any).flagword_at_0x250 = flags;

  // (4) Splat a 12-byte global Vector (GOT+0x1888) into
  //     *(m_pPlayer + 0x174) [player.basevelocity slot — D.4 TODO name].
  (pPlayer as any).someVec_at_0x174 = readGlobalVector(/* GOT */ 0x1888);

  // (5) Play wall-jump animation (seq 0x37 = 55).
  //     The CTSAnimation pointer the disasm passes is m_pPlayer + 0x28c,
  //     computed on the fly — NOT this.m_anim. This is the offset that
  //     uses the implicit "this" of the callee (Animate), not the
  //     explicit first arg.  We trust the disasm here; the field
  //     layout mapping is a D.4 TODO.
  const anim = (pPlayer as any).chunk_at_0x28c;
  Animate(anim, pPlayer, /* seq */ 0x37);

  // (6) Cap run-speed-like field at 0.75, then ramp vertical speed.
  //     *(m_pPlayer + 0x11c) = 0.75  (single 0x3f400000)
  (pPlayer as any).someField_at_0x11c = 0.75;

  //     this.m_flJumpUpVel += JUMP_UP_RAMP (double)
  this.m_flJumpUpVel += JUMP_UP_RAMP;

  //     this.m_flJumpSpeed = max(0, this.m_flJumpUpVel)
  //     (FPU compare against ZERO_DOUBLE @ GOT-0x6f010; jae path
  //     skips the load-back if already >= 0.)
  this.m_flJumpSpeed = Math.max(0, this.m_flJumpUpVel);

  // (7) svc_speed broadcast (svc number loaded from a global).
  const edict_handle = (pPlayer as any).handle_at_0x208;
  ENGINE_GET.MessageBegin(
    /* msg_dest */ 1,            // MSG_ONE
    /* svc       */ readGlobalInt(/* GOT+0x168c */ 0x168c),
    /* origin    */ 0,            // NULL
    /* dest      */ edict_handle,
  );
  // WriteShort((int)round(this.m_flJumpSpeed * SPEED_MULT))
  ENGINE_GET.WriteShort(FtoFT_Round(this.m_flJumpSpeed * SPEED_MULT));
  ENGINE_GET.MessageEnd();

  // (8) EMIT_SOUND_DYN.
  //     Body has 8 args per demangler (P7edict_siPCcffiif):
  //       edict, channel, sample, volume, attenuation, fflags, pitch, globalGain.
  //     Stack layout at the call site carries a leftover 0x3f000000 from
  //     before the RandomLong call — that's the 8th arg.
  const sampleStr =
    (function (ebx: number): string {
      // ebx-0x6c378 — FString; load lazily here so the helper file
      // doesn't need to know about it.
      return ((globalThis as any).__fstr__(ebx - 0x6c378) as string);
    })(0 /* ebx GOT base resolved at link time */);

  const dynamicPitch = RandomLong(0, 0x1f) + 0x5f;

  EMIT_SOUND_DYN(
    /* entity    */ edict_handle,
    /* channel   */ 4,                  // CHAN_VOICE (NOT 0x1f — that's RandomLong's max)
    /* sample    */ sampleStr,
    /* volume    */ 1.0,
    /* attenuation */ 0.8,
    /* fflags    */ 4,
    /* pitch     */ dynamicPitch,
    /* globalGain*/ 0.5,                 // the leftover 0x3f000000 on the stack
  );

  // (9) Optional bonus follow-up.
  //     The check is:
  //        r = RandomLong(0, 0xa)        // engine func @ edi+0x168, 2 args
  //        v = ((*m_pPlayer)+0x60).vtable[0x10/4](m_pPlayer) * SPEED_MULT
  //                                       // 0x10/4 = slot 4; vtable call
  //        if (v + r) > BONUS_THRESHOLD { do svc_velocity broadcast }
  //     The "above" branch is what FNSTSW+TEST 0x41+JNE skip implements.
  const engineTick = RandomLong(0, 0xa);
  const vtableReturn =
    ((pPlayer as any).vtable_at_0x60[4 /* 0x10/4 */] as (a: any) => number)(pPlayer);
  const vScaled = FtoFT_Round(vtableReturn) * SPEED_MULT;

  if (vScaled + engineTick > BONUS_THRESHOLD) {
    //   svc_velocity (MSG_PVS=4, svc from global at GOT+0x1d38).
    //   4 pushes:  0x4, [edx2], eax, 0x0
    //     [esp+0]  = 0x4   (msg_dest = MSG_PVS)
    //     [esp+4]  = [edx] (svc, from global at GOT+0x1d38)
    //     [esp+8]  = eax   (origin = *(m_pPlayer + 0x8))
    //     [esp+12] = 0x0   (edict = NULL; ignored for MSG_PVS)
    ENGINE_GET.MessageBegin(
      /* msg_dest */ 4,            // MSG_PVS — NOT MSG_ONE
      /* svc       */ readGlobalInt(/* GOT+0x1d38 */ 0x1d38),
      /* origin    */ (pPlayer as any).origin_at_0x8,
      /* dest      */ 0,            // NULL — MSG_PVS broadcasts
    );

    // Body of the bonus write-back per disasm:
    //   push *(m_pPlayer+0x208) → engine.func_0x11c → returns int
    //   mov [esp], eax               ; reuse stack slot
    //   call WriteShort(eax)
    //   mov [esp], 2
    //   call WriteShort(2)           ; bonus-tick value
    //   call MessageEnd
    ENGINE_GET.WriteShort(
      ENGINE_GET.GetSomeUserId((pPlayer as any).handle_at_0x208),
    );
    ENGINE_GET.WriteShort(2);
    ENGINE_GET.MessageEnd();
  }
}
