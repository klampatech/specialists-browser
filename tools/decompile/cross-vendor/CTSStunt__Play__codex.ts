```typescript
/**
 * CTSStunt::Play — per-tick stunt-system update for the attached player.
 *
 * Each call:
 *   1. Computes a frame-time-scaled delta (vtable call on the player
 *      × gpGlobals->frametime).
 *   2. Decrements four float timer fields on the stunt, each clamped to a
 *      per-field minimum (two distinct globals act as the floors).
 *   3. Bails out if the player isn't alive or has a non-zero deadflag.
 *   4. If flag 0x200000 is set (bullet-time pending), enters bullet-time:
 *      sets 0x100000, clears 0x200000, runs animation 0x39, resets
 *      friction/gravity scalars to 1.0, and emits a dynamic sound.
 *   5. If flag 0x2 is set ("bullyrush"), zeros three stunt sub-fields.
 *   6. On a ladder or in-air (state == 3): full stunt reset + bail.
 *   7. Otherwise: a timer-driven partial reset (one of three branches).
 *   8. Dispatches to one of six sub-handlers based on the player's flag bits.
 *
 * @param this  The CTSStunt entity instance (the `this` from the C++ original)
 * @returns     void
 */
export function Play(this: any): void {
  const player: any = this.m_pPlayer;

  // ── 1. Compute per-tick delta ─────────────────────────────────────────
  // A virtual call on the player (via [player+0x60] → slot 0x10) returns a
  // float, scaled by gpGlobals->frametime. The result is the per-tick delta
  // subtracted from each timer field below.
  // TODO(asm-ambiguous): the exact entity / vtable slot being called here
  // is unclear without cross-referencing the CBasePlayer vtable layout.
  const someFloat: number = player.m_pFuncTable_0x60.callSlot(0x10, player);
  const frameDelta: number = someFloat * (GLOBAL_PTR_1600 as any)[0x4];

  // ── 2. Decrement timers, clamped to per-field minima ─────────────────
  // The (MIN_B !== m_flTimer1) gate prevents a redundant subtract when the
  // field has already hit its floor.
  const MIN_A: number = TIMER_MIN_6F3F4 as number;     // floor for m_flTimer1
  const MIN_B: number = TIMER_MIN_6F408 as number;     // floor for the other three

  if (MIN_B !== this.m_flTimer1) {
    this.m_flTimer1 -= frameDelta;
    if (this.m_flTimer1 < MIN_A) this.m_flTimer1 = MIN_A;
  }

  this.m_flTimer0 -= frameDelta;
  if (this.m_flTimer0 < MIN_B) this.m_flTimer0 = MIN_B;

  this.m_flTimer2 -= frameDelta;
  if (this.m_flTimer2 < MIN_B) this.m_flTimer2 = MIN_B;

  this.m_flTimer3 -= frameDelta;
  if (this.m_flTimer3 < MIN_B) this.m_flTimer3 = MIN_B;

  // ── 3. Alive + deadflag gate ─────────────────────────────────────────
  if (player.IsAlive() === 0) return;
  if (player.pev.deadflag !== 0) return;

  // Flag bitfield lives at m_pPlayer->m_pFirst + 0x250 (4 bytes, with a
  // 2-byte extension at +0x252 for the walljump/wallclimb bits). A second
  // flag dword at +0x180 is used for the HandleStunt dispatch.
  let flags: number = player.flagsAt0x250;

  // ── 4. Bullet-time entry transition ──────────────────────────────────
  if (flags & 0x200000 /* FL_BULLETTIME_PENDING */) {
    flags = (flags | 0x100000) & ~0x200000;
    Animate(player.animSlot0x28c, player, 0x39);

    // Reset friction / gravity scalars to 1.0
    player.frictionAt0x11c = 1.0;
    player.gravityAt0x120  = 1.0;

    // Look up the sound index via an engine-func table and play it.
    // The engine call is via [engineFuncs+0x168] (slot 0x5a). The +0x5f
    // offset and the (0, 0x1f, 0.5) argument triple are TS-specific and
    // their exact semantics are unclear.
    // TODO(asm-ambiguous): the meaning of `+ 0x5f` and the arg triple.
    const soundIndex: number =
      (ENGINE_FUNCS_1AA8 as any).callSlot(0x168, 0, 0x1f) + 0x5f;
    EMIT_SOUND_DYN(
      player.edict,
      4,                            // channel
      SOUND_FILENAME_6C378,         // sample string
      1.0,                          // volume
      0.8,                          // attenuation
      0,                            // flags
      soundIndex,                   // pitch
    );
  }

  // ── 5. "Bullyrush" path: zero three stunt sub-fields ────────────────
  if (flags & 0x2) {
    this.m_pSub_38 = 0;
    this.m_pSub_14 = 0;
    this.m_pSub_3c = 0;
  }

  // ── 6. On ladder or in-air → full stunt reset ────────────────────────
  if (player.IsOnLadder() !== 0 || player.m_iPlayerState === 3) {
    flags &= ~0x100000;
    if ((flags & 0x70c31) === 0) return;

    // Clear all stunt-active flag bits in one pass
    flags &= ~0x40000;
    flags &= ~0x4;
    flags &= ~0x1;
    flags &= ~0x10;
    flags &= ~0x20;
    flags &= ~0x400;
    flags &= ~0x800;
    flags &= ~0x10000;
    flags &= ~0x20000;

    // Copy (MIN_B, MIN_B, GRAVITY_Z_6DE6C) into m_pPlayer->m_pFirst + 0x174
    player.vecAt0x174 = [MIN_B, MIN_B, GRAVITY_Z_6DE6C as number];

    player.frictionAt0x11c = 1.0;
    player.gravityAt0x120  = 1.0;
    this.m_flTimer1 = 0;
    player.someFieldAt0x4dc = 0;
    player.animSlot0x28c = -1;
    Animate(player.animSlot0x28c, player, 1);

    player.flagsAt0x250 = flags;
    return;
  }

  // ── 7. On-ground → conditional partial reset ─────────────────────────
  // Three branches decide whether to do the reset block:
  //   - m_flTimer1 at MIN_B AND m_pSub_78 != 0            → reset
  //   - m_flTimer1 < TIMER_MIN_6F3F0                      → reset
  //   - m_flTimer1 NOT at MIN_B AND m_pSub_78 != 0        → reset
  // (Skipping all three means straight through to dispatch.)
  // TODO(asm-ambiguous): the exact thresholds and intent of the three
  //   6F408 / 6F3F4 / 6F3F0 globals are not known.
  let doReset = false;
  if (MIN_B === this.m_flTimer1) {
    if (this.m_pSub_78 !== 0) doReset = true;
  } else if (this.m_flTimer1 < (TIMER_MIN_6F3F0 as number)) {
    doReset = true;
  } else if (this.m_pSub_78 !== 0) {
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
    player.frictionAt0x11c  = 1.0;

    // Choose z-component based on a pev->button bit
    const z: number = (player.pev.button & 0x40) !== 0
      ? (GRAVITY_Z_6DEC8 as number)
      : (GRAVITY_Z_6DE6C as number);
    player.vecAt0x174 = [MIN_B, MIN_B, z];
  }

  // ── 8. Dispatch to stunt sub-handlers ───────────────────────────────
  if (flags & 0x10)   HandleDive(this);
  if (flags & 0x20)   HandleSlide(this);
  if (flags & 0xc00)  HandleWheel(this);
  if (flags & 0x100)  HandleWallJump(this);
  if (flags & 0x200)  HandleWallClimb(this);
  if (player.flagsAt0x180 & 0x4002) HandleStunt(this);

  // (MSVC writes the flag bitfield back via the pointer deref [edx+0x250]
  // since it was loaded by address; the writes above mutate it in place.)
}
```
