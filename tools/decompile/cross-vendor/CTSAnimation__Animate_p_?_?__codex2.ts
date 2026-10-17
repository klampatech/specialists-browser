/**
 * CTSAnimation::Animate — per-frame animation dispatcher for a player.
 *
 * Demangled:   CTSAnimation::Animate(CBasePlayer*, int)
 * Disassembly: 0x0005b470, 7805 bytes
 *
 * Body shape (from the disassembly):
 *   1. Compute horizontal speed from [pPlayer+0x20].
 *   2. If player is alive, not ducking, and not in close combat,
 *      blend walk/aim layers based on sequence (4 → run, 2 → walk).
 *   3. Pre-switch close-combat gate: if sequence ∈ {0x28..0x39}
 *      and not already in close combat, call GaitCloseCombat.
 *   4. First switch on (sequence + 1), 59-case jump table at
 *      [picBase + (sequence+1)*4 - 0x10a640]. Each leaf gates on
 *      player state flags ([pPlayer+0x1a5], [pPlayer+0x250]) and
 *      either builds an anim-name via strcpy/strcat from
 *      [pPlayer+0xb58] (the anim-extension buffer) and calls
 *      SetAnim/BlendAnimationsByDir, or dispatches to
 *      BlendAnimationsForSlide / HandleCloseCombat.
 *   5. Post-switch: HandleCloseCombat if in CQC, else a second
 *      59-case switch on sequence (jump table at
 *      [picBase+n*4-0x109e54]) that resolves the final anim name.
 *   6. If the resolved layer.sequence ([pPlayer+0x12c]) differs
 *      from the player's current sequence ([pPlayer+0x128]),
 *      copy it over, zero [pPlayer+0x130], and call
 *      ResetSequenceInfo.
 *
 * Field offsets are pinned to the disassembly (ebp == pPlayer
 * after `mov ebp, [esp+0xa4]`). Names are deliberately NOT
 * fabricated — they're marked TODO until verified against
 * `tools/decompile/references/tsentity.md` once that exists.
 */

// External helpers (defined elsewhere in the project):
declare function IsInCloseCombat(this_: any, sequence: number): number;
declare function GaitCloseCombat(this_: any, pPlayer: any): number;
declare function BlendAnimationsByDir(
  this_: any, pPlayer: any, angles: any, dir: any,
  ext: any, pitch: number, yaw: number, bodyPart: number,
): void;
declare function BlendAnimationsForSlide(this_: any, pPlayer: any): void;
declare function SetAnim(
  this_: any, pPlayer: any, name: any, body: number, flags: number,
): void;
declare function HandleCloseCombat(
  this_: any, pPlayer: any, sequence: number,
): void;
declare function LookupSequence(this_: any, name: any): number;
declare function ResetSequenceInfo(this_: any): void;

// Offsets via the player arg (EBP in the asm). Adjust names once
// the TS player-struct header is reverse-engineered.
const OFF_VEL = 0x20;            // velocity (Vector; .x at +0, .y at +4)
const OFF_BUTTONS = 0x1a5;       // buttons byte (0x02 = duck)
const OFF_FLAGS = 0x250;         // FL_* bitfield
const OFF_ANIMEXT = 0xb58;       // anim-extension char[?]
const OFF_GAIT_SEQ = 0x128;      // pev.sequence
const OFF_LAYER_SEQ = 0x12c;     // this.layer.sequence
const OFF_LAYER_FRAME = 0x130;   // this.layer.frame
const OFF_ACTIVE_ITEM = 0x60;    // points at a vtable; vtable+0xB4 = ???

// Reading helpers. Cast to any so we don't need the struct def.
function readFloat(p: any, off: number): number {
  // TODO(derive): float-at-offset accessor. For now, treat p as
  // a Float32Array-like view into the player memory.
  return 0;
}

export function Animate(
  this: any,            // CTSAnimation* — kept as `any` until the
                        // CTSAnimation struct is reverse-engineered
  pPlayer: any,         // CBasePlayer* — this is the EBP-anchored struct
                        // in the disassembly
  sequence: number,
): void {
  // ---- 1. Horizontal speed from velocity X/Y ----
  const vx = readFloat(pPlayer, OFF_VEL);
  const vy = readFloat(pPlayer, OFF_VEL + 4);
  const horizSpeed = Math.hypot(vx, vy);

  // ---- 2. State flags ----
  const ducking = (pPlayer as any)[OFF_BUTTONS] & 0x02;
  // [pPlayer+0x60] is a vtable-bearing sub-object. The vtable
  // slot 0xB4 is whatever its "IsAlive()" is — keep symbolic.
  // TODO(derive): identify the sub-object at +0x60 (likely the
  // active item / a pev-cached base) and rename.
  const alive = !!(pPlayer as any)[OFF_ACTIVE_ITEM]; // placeholder

  // ---- 3. Movement-layer blends (sequence 4 = run, 2 = walk) ----
  if (alive && !ducking) {
    if (sequence === 4 && !IsInCloseCombat(this, sequence) &&
        horizSpeed > /* cvar at ebx-0x6f400 */ 0) {
      // TODO(derive): the two `3e99999a` / `3f19999a` constants
      // are pitch/yaw thresholds (0.3 / 0.6). Mirror them as
      // named locals.
      BlendAnimationsByDir(
        this, pPlayer,
        /* angles */ null,                        // [pPlayer+0x74]
        /* dir    */ null,                        // normalized vel
        /* ext    */ (pPlayer as any)[OFF_ANIMEXT],
        /* pitch  */ 0.3, /* yaw */ 0.6,
        /* body   */ 0x1c,
      );
    }
    if (sequence === 2) {
      BlendAnimationsByDir(
        this, pPlayer, null, null,
        (pPlayer as any)[OFF_ANIMEXT],
        0.3, 0.6, /* body */ 0x5c,
      );
    }
  }

  // ---- 4. Pre-switch close-combat gate ----
  let didCloseCombat = false;
  // Sequence must be one of {0x28..0x39} minus specific exclusions.
  // The asm enumerates them one cmp at a time; we keep that shape.
  const blockedSeqs = new Set([0x28, 0x2f, 0x30, 0x36, 0x32, 0x31,
                              0x37, 0x38, 0x39]);
  if (sequence >= 0x28 && sequence <= 0x39 && !blockedSeqs.has(sequence)
      && !IsInCloseCombat(this, sequence) && alive && !ducking) {
    GaitCloseCombat(this, pPlayer);
    didCloseCombat = true;
  }

  // ---- 5. First 59-case switch on (sequence + 1) ----
  // Jump table at [picBase + (sequence+1)*4 - 0x10a640].
  // Each case has its own state-gated body in the asm; the body is
  // intentionally NOT reproduced here. v1.0 needs a per-case
  // implementation derived from the disassembly chunk.
  switch (sequence + 1) {
    case 0x00: /* TODO: implement from 0x5b7d0..0x5b8e2 */ break;
    case 0x01: /* TODO */ break;
    case 0x02: /* handled by walk layer above */ break;
    case 0x03: /* TODO */ break;
    case 0x04: /* TODO (walking alive+ladder+duck gate) */ break;
    case 0x05: case 0x06: case 0x07: /* TODO */ break;
    case 0x08: case 0x09: /* TODO */ break;
    case 0x0a: /* TODO: ladder anim resolution (see 0x5b8e2..) */
      /* ...0x0a..0x27 ... */
      break;
    case 0x28: /* blocked dying/dying-in-CQC */ break;
    case 0x29: /* ducking anims (see 0x5b914..) */ break;
    case 0x2a: case 0x2b: /* ladder */ break;
    case 0x2e: case 0x2f: case 0x30: case 0x31: case 0x32: break;
    case 0x33: /* weapon-specific (anim-extension + body 0x94,
                  layer.bodyWeight 2.0); see 0x5c0a4..0x5c1b5 */ break;
    case 0x36: case 0x37: case 0x38: case 0x39: break;
    case 0x3a: /* last case */ break;
    default: break;
  }

  // ---- 6. Post-switch: close combat or final anim ----
  const skipCloseCombat = (pPlayer as any)[/* gate */ 0];
  if (!didCloseCombat) {
    if (IsInCloseCombat(this, sequence)) {
      HandleCloseCombat(this, pPlayer, sequence);
    } else if (sequence <= 0x39) {
      // 2nd nested 59-case switch on `sequence`
      // (jump table at [picBase+n*4-0x109e54]). Each leaf builds
      // an anim name and calls SetAnim(pPlayer, 0x94, 0). v1.0
      // needs a per-leaf implementation here.
      resolveFinalAnim(this, pPlayer, sequence); // TODO: implement
    }
  }

  // ---- 7. Seq-diff reset ----
  const playerSeq = (pPlayer as any)[OFF_GAIT_SEQ];   // [pPlayer+0x128]
  const layerSeq  = (pPlayer as any)[OFF_LAYER_SEQ];   // [pPlayer+0x12c]
  if (playerSeq !== layerSeq) {
    (pPlayer as any)[OFF_GAIT_SEQ]   = layerSeq;
    (pPlayer as any)[OFF_LAYER_FRAME] = 0;
    ResetSequenceInfo((pPlayer as any)[/* pev ptr at */ 0]);
  }
}

// Stub — to be filled with the 2nd-nested-switch implementation
// once the per-case disassembly is reviewed.
declare function resolveFinalAnim(
  this_: any, pPlayer: any, sequence: number,
): void;
