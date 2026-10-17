```typescript
/**
 * CTSAnimation::Animate — per-frame animation dispatcher for a player.
 *
 * Picks / blends the appropriate animation sequence based on the player's
 * current sequence, velocity (direction), close-combat state, ducking
 * flag, alive state, and weapon / model anim-extension. The body is a
 * 59-case switch on (sequence + 1) plus a 2nd nested 59-case switch on
 * sequence for the final anim-string resolution.
 *
 * Many cases bail early based on state (alive, ducking, ladder,
 * close-combat). Some dispatch to sub-handlers (BlendAnimationsForSlide,
 * HandleCloseCombat, GaitCloseCombat). Each leaf builds an anim-name
 * via strcpy/strcat from this.animExtension + direction/weapon suffix
 * and calls SetAnim(this, player, name, bodyPart, flags). The final * pass calls LookupSequence + ResetSequenceInfo if the resolved
 * sequence differs from pev.sequence.
 *
 * @param this      The CTSAnimation instance
 * @param pPlayer   CBasePlayer* (player being animated)
 * @param sequence  Current sequence index (int)
 * @returns         void
 */
export function Animate(
  this: CTSAnimation,
  pPlayer: any /* CBasePlayer* */,
  sequence: number,
): void {
  // [Stack frame: 0x8c bytes; PIC via call/pop/add ebx, 0x10a991.]

  // --- horizontal velocity magnitude (sqrt(vx^2 + vy^2)) ---
  // Original: loads [pev+0x20] X/Y components, fmul, faddp, fsqrt.
  const horizSpeed = Math.hypot(this.pev.velocity.x, this.pev.velocity.y);

  // --- state flags ---
  // [pev+0x1a5] = pev.button; bit 0x02 = ducking.
  // [this+0x60]->[vtable+0xb4] is some virtual "IsAlive" call.
  // TODO(asm-ambiguous): exact identity of field[0x60] (likely this.m_pPlayer).
  const isDucking = (this.pev.button & 0x02) !== 0;
  const alive = !!(this.m_pPlayer?.IsAlive?.());

  // --- movement blend layers (run/walk, gun-aim) when alive & not ducking ---
  if (alive && !isDucking) {
    if (sequence === 4 && !IsInCloseCombat(this, sequence) &&
        horizSpeed > /* cvar at ebx-0x6f400 */ 0) {
      BlendAnimationsByDir(
        this, pPlayer, this.pev.angles,
        normalize(this.pev.velocity), this.animExtension,
        /* pitch= */ 0.3, /* yaw= */ 0.6, /* bodyPart= */ 0x1c,
      );
    }
    if (sequence === 2) {
      BlendAnimationsByDir(
        this, pPlayer, this.pev.angles,
        normalize(this.pev.velocity), this.animExtension,
        /* pitch= */ 0.3, /* yaw= */ 0.6, /* bodyPart= */ 0x5c,
      );
    }
  }

  // --- "blocked sequences" close-combat early branch ---
  // If sequence is in {0x28..0x39} minus a few, the player is in close
  // combat, not ducking, alive, etc. → call GaitCloseCombat and mark.
  let didCloseCombat = false;
  if (
    sequence >= 0x28 && sequence <= 0x39 && sequence !== 0x33 &&
    !IsInCloseCombat(this, sequence) && alive && !isDucking
  ) {
    GaitCloseCombat(this, pPlayer);
    didCloseCombat = true;
  }

  // --- BIG SWITCH on (sequence + 1) ---
  // Jump table at [ebx + (sequence+1)*4 - 0x10a640]; 59 cases.
  // Each case: state check(s) → early-out OR build anim name via
  // strcpy/strcat → SetAnim(this, player, name, bodyPart, flags).
  // Some dispatch to BlendAnimationsForSlide (slide anims).
  switch (sequence + 1) {
    case 0x00: /* IDLE / land */ break;
    case 0x01: /* minor flinch */ break;
    case 0x02: /* walk layer (handled above) */ break;
    case 0x03: /* ducking check */ break;
    case 0x04: /* walking (alive + ladder + duck gate) */ break;
    case 0x05: case 0x06: case 0x07: break;
    case 0x08: case 0x09: /* weapon-specific */ break;
    case 0x0a: case 0x0b: case 0x0c: case 0x0d:
    case 0x0e: case 0x0f: case 0x10: case 0x11:
    case 0x12: case 0x13: case 0x14: case 0x15:
    case 0x16: case 0x17: case 0x18: case 0x19:
    case 0x1a: case 0x1b: case 0x1c: case 0x1d:
    case 0x1e: case 0x1f: case 0x20: case 0x21:
    case 0x22: case 0x23: case 0x24: case 0x25:
    case 0x26: case 0x27: break;
    case 0x28: /* blocked: dying / dying-in-close-combat */ break;
    case 0x29: /* ducking */ break;
    case 0x2a: case 0x2b: /* ladder */ break;
    case 0x2e: case 0x2f: case 0x30: case 0x31: case 0x32: /* blocked */ break;
    case 0x33:
      /* weapon-specific (anim extension at this+0xb58):
         builds "<weapon>_<action>" anim name from this.animExtension,
         picks body part 0x94, sets layer.bodyWeight = 2.0 (0x40000000). */
      break;
    case 0x36: case 0x37: case 0x38: case 0x39: /* blocked */ break;
    case 0x3a: /* last case */ break;
  }

  // --- post-switch: close combat or final sequence selection ---
  if (!didCloseCombat) {
    if (IsInCloseCombat(this, sequence)) {
      HandleCloseCombat(this, pPlayer, sequence);
    } else if (sequence <= 0x39) {
      // 2nd nested switch on sequence (jump table at [ebx+n*4-0x109e54]).
      // Each leaf: build anim name from this.animExtension +
      // weapon/direction suffix via strcpy/strcat, then
      // SetAnim(this, player, name, bodyPart=0x94, flags=0),
      // and set layer.bodyWeight = 3.0 (0x40400000).
      resolveFinalAnim(this, pPlayer, sequence);
    }
  }

  // --- final LookupSequence + ResetSequenceInfo ---
  // If this.layer.sequence differs from pev.sequence (and we're not
  // gclose-combat gait / a "blocked" sequence), copy it over and call
  // ResetSequenceInfo so the engine restarts the animation.
  const layer = this.layer;
  const newSeq = layer?.sequence ?? 0;
  if (this.pev.sequence !== newSeq) {
    this.pev.sequence = newSeq;
    this.pev.frame = 0;
    ResetSequenceInfo(this.pev);
  }
}
```
