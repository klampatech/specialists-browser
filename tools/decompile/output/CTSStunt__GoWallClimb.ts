/**
 * CTSStunt::GoWallClimb — initiate the wall-climb state on the player:
 * recompute the engine view vectors, push the player away from the wall
 * along the negated forward direction, twiddle pev-flag bits, snap the
 * player back to the cached wall-contact origin, fire the wall-climb
 * animation, accumulate and clamp a tier-dependent climb power, drive
 * the engine playback-rate vtable, emit the climb sound, and bump the
 * stunt counter.
 *
 * @param this  The CTSStunt instance (the MSVC x86 hidden `this` arg).
 * @returns     void
 */
export function GoWallClimb(this: any): void {
  // ebp = [esp+0x40] = this (set from the saved return area in the prologue)
  // ebx = GOT base (set by the call/pop/add PIC dance in the prologue)

  const player: any = this.player;            // [ebp+0x40]   = this->m_pPlayer
  const pev:    any = player.pev;             // *player       = pev

  // ── (1) Rebuild engine forward / right / up from player view angles ─
  UTIL_MakeVectors(pev.v_angle);               // [pev+0x74]    = pev->v_angle

  // ── (2) Negate the engine vec at +0x28 and store on `this` ─────────
  // The disassembly loads from a GOT-indirected engine vec struct, then
  // XOR-flips each float's sign bit (3 dwords = 12 bytes) and copies
  // the result into this+0x20. This is the "push away from wall" dir.
  //
  // TODO(asm-ambiguous): which engine vec slot sits at +0x28 (forward
  // vs. right vs. up) depends on TS' UTIL_MakeVectors ABI.
  const v_forward = readEngineVec(/* [GOT+0x1600] */, /* +0x28 */);
  this.climbDir = neg3(v_forward);             // [this+0x20]

  // ── (3) Twiddle pev flag bits at +0x250 ────────────────────────────
  //   clear 0x100000; set 0x4 | 0x8000 | 0x20000; clear 0x10000
  let flags = pev.flags;
  flags  = (flags & ~0x100000) | 0x4 | 0x8000 | 0x20000;
  flags &= ~0x10000;
  pev.flags = flags;

  // ── (4) Reset pev origin to the cached wall-touched origin ─────────
  // [GOT+0x1888] points at a static Vector (cached in CheckForWallClimb).
  pev.origin = readEngineVec(/* [GOT+0x1888] */, /* +0 */);

  // ── (5) Fire the wall-climb animation (frame 0x38) ────────────────
  // The disassembly pushes `player + 0x28c` as the `this` for Animate
  // — i.e. the CTSAnimation instance lives INSIDE CBasePlayer at +0x28c,
  // not inside CTSStunt. The other stack args are the player pointer
  // and the frame number.
  //
  // Source equivalent: player->anim.Animate(player, 0x38);
  player.anim.Animate(player, 0x38);           // CTSAnimation at player+0x28c

  // ── (6) Reset pev+0x11c to 1.0 ─────────────────────────────────────
  pev.flTimeStep = 1.0;

  // ── (7) Pick a tier-dependent climb-power cvar ─────────────────────
  // cvars are stored as 8-byte doubles inside the engine (fld QWORD).
  const climbPower: number =
      this.CanDiveHigh()    ? readCvar(/* [GOT-0x6de58] */)  // high
    : this.CanDiveMedium()  ? readCvar(/* [GOT-0x6f010] */)  // medium
    :                          readCvar(/* [GOT-0x6c308] */); // (default: low)

  // ── (8) Accumulate into pitch, then clamp into climbHeight ─────────
  // [GOT-0x6f010] (the medium cvar above) is ALSO used here as the
  // floor for the max() — same address, read twice.
  this.pitch         += climbPower;                            // [this+0x38]
  const floorCvar    = readCvar(/* [GOT-0x6f010] */);
  this.climbHeight    = Math.max(this.pitch, floorCvar);       // [this+0x0]

  // ── (9) Drive the engine playback-rate vtable ─────────────────────
  // The disassembly hits 4 indirect calls in sequence through [GOT+0x1aa8]:
  //
  //   [esi+0xb8](0x1, [GOT+0x168c], 0, [pev+0x208])    // 4-arg
  //   <truncate>(this.climbHeight * cvarAt([GOT-0x6f06c])) -> int  // FPU cw fiddling
  //   [esi+0xc0](<int>)
  //   [esi+0xbc]()
  //
  // TODO(asm-ambiguous): vtable indices and arg semantics are TS-internal.
  driveEnginePlaybackRate(pev, this.climbHeight);

  // ── (10) Emit the wall-climb sound ─────────────────────────────────
  // Helper call: [esi+0x168](0, 31, 0.5) returns a pointer; +0x5f gives
  // the actual sample string. The 7-argument cdecl push order matches
  // EMIT_SOUND_DYN(edict*, int channel, char* sample, float vol,
  //                float attn, int pitch, int flags).
  const sample = buildEngineSample(/* [esi+0x168] */, /* +0x5f */);
  EMIT_SOUND_DYN(
    /* edict   */ pev.edictPtr,                                // [pev+0x208] (not the standard HL pContainingEdict slot)
    /* channel */ 4,                                           // CHAN_BODY
    /* sample  */ readEngineString(/* [GOT-0x6c378] */),       // string literal
    /* volume  */ 1.0,
    /* attn    */ 0.8,
    /* pitch   */ 0,
    /* flags   */ sample,
  );

  // ── (11) Bump the stunt counter ───────────────────────────────────
  this.stuntCounter++;                                         // [this+0x3c]
}
