```typescript
/**
 * CTSStunt::HandleStunt — pick and trigger the next stunt action.
 *
 * Per-tick entry point for the stunt state machine. Gates on cooldown
 * timers, player state, and player input, then tries in order:
 *   - wall climb   (gated on pev+0x180 bit 0x2)
 *   - wall jump    (gated on player+0x815 bit 0x40)
 *   - wall dive    (only after wall-jump check fails, before dive check)
 *   - bullet time  (slow 2D horizontal speed)
 *   - dive         (fast 2D horizontal speed)
 *
 * The first stunt whose preconditions hold and whose check function
 * returns true is triggered and the function returns. Otherwise the
 * function returns with no side effect.
 *
 * @param this  The CTSStunt instance.
 * @returns     void
 */

// TODO: full class shapes are reconstructed in a later pass (D.4). The
// types below are the minimum needed for HandleStunt to compile.
type CTSStunt = any;
type CBasePlayer = any;
type Entvars = any;

// Globals accessed via PIC / GOT (ebx ± k). Names below are guesses;
// the cvar-analysis pass will pin them down.
declare const globals: {
  /** [ebx-0x6f408] — gpGlobals->time (or a cvar threshold). */
  readonly time: number;
  /** [ebx-0x6c324] — minimum vertical velocity for stunts. */
  readonly minZVelocity: number;
  /** [ebx-0x6de48] — constant (likely 2.0) divided by playerTimeout
   *  in the time-since-stunt gate. */
  readonly stuntTimeoutDivisor: number;
  /** [ebx-0x6f3f8] — minimum 2D horizontal speed for dive. */
  readonly minDiveSpeed: number;
};

export function HandleStunt(this: CTSStunt): void {
  // === Cooldown gate ===
  // The first two float fields of CTSStunt (offsets 0, 4) hold
  // "next allowed time" markers. Exit if the current time hasn't
  // reached them.
  if (globals.time < this.m_flNextStunt)  return; // offset 0x00
  if (globals.time < this.m_flNextAction) return; // offset 0x04

  const player = this.m_pPlayer; // CBasePlayer*  @ offset 0x40
  const pev    = player.pev;     // entvars_t*   (first field of CBasePlayer)

  // === Player-state gate ===
  // 0xc30 ≈ FL_INWATER | FL_MONSTER | FL_NOTARGET | FL_AIMTARGET.
  // Stunts are disallowed while any of these are set.
  if ((pev.flags & 0xc30) !== 0) return; // pev+0x250

  // === Reset player's last-stunt bookkeeping ===
  player.m_flLastStuntTime1 = 0.0; // player+0x79c
  player.m_flLastStuntTime2 = 0.0; // player+0x7a0
  player.m_bStuntMode       = 0;   // player+0x7a4

  // === Wall-climb branch (gated on pev+0x180 bit 0x2) ===
  // On failure, fall through directly to bullet-time/dive, skipping
  // wall-jump and wall-dive entirely.
  if ((pev.buttonOrState & 0x2) !== 0) {
    if (this.CheckForWallClimb()) {
      this.GoWallClimb();
      return;
    }
    // fall through
  } else {
    // === Wall-jump / wall-dive branch (gated on player+0x815 bit 0x40) ===
    if ((player.m_afButton & 0x40) === 0) return;
    if (this.CheckForWallJump()) {
      this.GoWallJump();
      return;
    }
    if (this.CheckForWallDive()) {
      pev.flags |= 0x800000; // mark a wall-dive flag
      this.GoDive();
      return;
    }
    // fall through
  }

  // === Bullet-time / dive fallback ===
  // Recheck the m_afButton bit — the wall-climb failure branch arrives
  // here without having gone through the wall-jump check.
  if ((player.m_afButton & 0x40) === 0) return;

  // FL_FROZEN | some TS-specific flag (likely "bullet-time already
  // active" or a freeze flag — disallows stunts while it is set).
  if ((pev.flags & 0x130000) !== 0) return; // pev+0x250

  // Vertical-velocity gate. Skipped if pev+0x1a5 bit 0x2 is set
  // (probably "in-air; skip the z-velocity requirement").
  if ((pev.otherState & 0x2) === 0) {
    if (pev.velocity.z < globals.minZVelocity) return; // [ebx-0x6c324]
  }

  // === Time-since-last-stunt gate ===
  const lastStuntTime  = player.m_flLastStunt;     // player+0xb88
  const timeSinceStunt = globals.time - lastStuntTime;
  const playerTimeout  = player.GetStuntTimeout(); // vtable call [edx+0x60]+0x10
  // TODO(asm-ambiguous): the fdivrp with the constant at [ebx-0x6de48]
  // (likely 2.0) computes ST(0) = 2.0 / playerTimeout, then fcompp
  // compares timeSinceStunt against it. The function continues only if
  // timeSinceStunt <= 2.0/R, which is an unusual gate (not a plain
  // "cooldown elapsed" check). The original C++ likely reads:
  //   if (timeSinceStunt > 2.0f / playerTimeout) return;
  // — capture the shape, flag the semantic for follow-up.
  if (timeSinceStunt > globals.stuntTimeoutDivisor / playerTimeout) return;

  // === Choose dive vs. bullet-time by 2D horizontal speed ===
  // pev+0x20 = velocity.x, pev+0x24 = velocity.y in HL1 entvars_t.
  const horizSpeed = Math.sqrt(
    pev.velocity.x * pev.velocity.x +
    pev.velocity.y * pev.velocity.y,
  );
  if (horizSpeed >= globals.minDiveSpeed) { // [ebx-0x6f3f8]
    this.GoDive();
  } else {
    this.GoBulletTime();
  }
}
```
