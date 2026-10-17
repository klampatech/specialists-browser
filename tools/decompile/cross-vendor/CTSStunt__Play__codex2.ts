/**
 * CTSStunt::Play — per-tick stunt-system update for the attached player.
 *
 * Decompiled from `Play__8CTSStunt` (1130 bytes @0x8a014, ts_i386.so).
 * Field offsets are placeholders pending D.4 entity-field discovery.
 */
export function Play(this: any): void {
  const player: any = this.m_pPlayer;

  // ── 1. Per-tick delta ───────────────────────────────────────────
  // Vtable slot 4 on the player (via [player+0x60] → [vtable+0x10]) returns
  // a float; multiply by gpGlobals->frametime.
  // TODO(asm-ambiguous): exact engine value being scaled.
  const frameDelta: number =
    player.m_pFuncTable_0x60.callSlot(0x10, player) *
    (GLOBAL_PTR_1600 as any)[0][0x4];

  // ── 2. Decrement four float timers, clamped to per-field floors ──
  const MIN_A: number = TIMER_MIN_6F3F4 as number; // clamp floor for m_flTimer1
  const MIN_B: number = TIMER_MIN_6F408 as number; // gate floor for m_flTimer1
  // // and clamp floor for the other three

  // m_flTimer1: subtract only when not at MIN_B (per `jne 8a071` on equal).
  if (this.m_flTimer1 !== MIN_B) {
    this.m_flTimer1 -= frameDelta;
    if (this.m_flTimer1 < MIN_A) this.m_flTimer1 = MIN_A;
  }

  this.m_flTimer0 -= frameDelta;
  if (this.m_flTimer0 < MIN_B) this.m_flTimer0 = MIN_B;

  this.m_flTimer2 -= frameDelta;
  if (this.m_flTimer2 < MIN_B) this.m_flTimer2 = MIN_B;

  this.m_flTimer3 -= frameDelta;
  if (this.m_flTimer3 < MIN_B) this.m_flTimer3 = MIN_B;

  // ── 3. Alive + deadflag gate ────────────────────────────────────
  if (player.IsAlive() === 0) return;
  // TODO(asm-ambiguous): asm uses [edx+0x244] where edx is the stale
  // vtable register from line 8a0c8 — likely a transcription error;
  // assume pev->deadflag.
  if (player.pev.deadflag !== 0) return;

  let flags: number = player.flagsAt0x250;

  // ── 4. Bullet-time entry transition ─────────────────────────────
  if (flags & 0x200000 /* FL_BULLETTIME_PENDING */) {
    flags = (flags | 0x100000) & ~0x200000;
    Animate(/* & */ player.animSlot0x28c, player, 0x39);

    player.gravityAt0x120  = 1.0;
    player.frictionAt0x11c = 1.0;

    // TODO(asm-ambiguous): engine-func slot 0x168 is unidentified;
    // `+ 0x5f` semantics unclear; asm pushes (0, 0x1f, 0.5f), TS passes 2.
    const soundIndex: number =
      (ENGINE_FUNCS_1AA8 as any).callSlot(0x168, 0, 0x1f) + 0x5f;
    EMIT_SOUND_DYN(
      /* TODO: asm source is pev+0x208, not player.edict */ player.edict,
      4,                            // channel
      SOUND_FILENAME_6C378,         // sample string
      1.0,                          // volume
      0.8,                          // attenuation
      0,                            // flags
      soundIndex,                   // pitch
    );
  }

  // ── 5. "Bullyrush" path: zero three stunt sub-fields ────────────
  if (flags & 0x2) {
    this.m_pSub_38 = 0;
    this.m_pSub_14 = 0;
    this.m_pSub_3c = 0;
  }

  // ── 6. On ladder or in-air → full stunt reset + bail ────────────
  if (player.IsOnLadder() !== 0 || player.m_iPlayerState === 3) {
    flags &= ~0x100000;
    if ((flags & 0x70c31) === 0) return;

    flags &= ~0x40000;
    flags &= ~0x4;
    flags &= ~0x1;
    flags &= ~0x10;
    flags &= ~0x20;
    flags &= ~0x400;
    flags &= ~0x800;
    flags &= ~0x10000;
    flags &= ~0x20000;

    player.vecAt0x174 = [MIN_B, MIN_B, GRAVITY_Z_6DE6C as number];

    player.gravityAt0x120  = 1.0;
    player.frictionAt0x11c = 1.0;
    this.m_flTimer1 = 0;
    player.someFieldAt0x4dc = 0;

 player.animSlot0x28c = -1;
    // Pass &player.animSlot0x28c (pointer to slot), not its value.
    Animate(/* & */ player.animSlot0x28c, player, 1);

    player.flagsAt0x250 = flags;
    return;
  }

  // ── 7. On-ground → conditional partial reset ────────────────────
  // asm: skip on equal; do on `< TIMER_MIN_6F3F0`; do on
  // `player.field_at_0x78 != 0`; otherwise skip.
  let doReset = false;
  if (this.m_flTimer1 === MIN_B) {
    doReset = false;
  } else if (this.m_flTimer1 < (TIMER_MIN_6F3F0 as number)) {
    doReset = true;
  } else if (player.field_at_0x78 !== 0) {
    doReset = true;
  }

  if (doReset) {
    flags &= ~0x40000;
    flags &= ~0x80000;
    flags &= ~0x4;
    flags &= ~0x1;
    flags &= ~0x2;
    this.m_flTimer1 = 0;
    player.someFieldAt0x4dc = 0;
    player.gravityAt0x120  = 1.0; // asm: [eax+0x120]=1.0; label per HLSDK

    // Choose z-component based on a pev byte bit at +0x1a5
    const z: number = (player.pev.button & 0x40) !== 0
      ? (GRAVITY_Z_6DEC8 as number)
      : (GRAVITY_Z_6DE6C as number);
    player.vecAt0x174 = [MIN_B, MIN_B, z];
  }

  // ── 8. Dispatch to stunt sub-handlers ───────────────────────────
  if (flags & 0x10)   HandleDive(this);
  if (flags & 0x20)   HandleSlide(this);
  if (flags & 0xc00)  HandleWheel(this);
  if (flags & 0x100)  HandleWallJump(this);
  if (flags & 0x200)  HandleWallClimb(this);
  if (player.flagsAt0x180 & 0x4002) HandleStunt(this);

  player.flagsAt0x250 = flags;
}
