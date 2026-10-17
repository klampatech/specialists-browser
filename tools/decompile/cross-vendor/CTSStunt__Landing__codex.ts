```typescript
/**
 * CTSStunt::Landing — handle the player's landing from a stunt maneuver.
 *
 * Bails out unless the player is ducking (byte at pev+0x1a5, bit 0x2)
 * and has a relevant button held (int at pev+0x250, bit 0x10). Then
 * branches on whether a high-impact landing flag set is present
 * (int at pev+0x180, mask 0x4006 — likely FL_ONGROUND | FL_DUCKING
 * | some TS-specific flag such as FL_ROLLING).
 *
 * Path A (high-impact landing): clear the in-dive bit (0x10), set
 * the landing state bits (0x40000 and 0x1), stamp 0.5 into pev+0x120,
 * copy the canned landing Vector (global at GOT+0x1888) into pev+0x174
 * (velocity), set the recovery timer (this+0x4 = 0.53125), and animate
 * the player with sequence 46.
 *
 * Path B (regular landing): clear the in-dive bit, set the rolling
 * bit (0x20), copy the landing Vector, call GetDirection(this->vec1,
 * pev->origin, 0.3, 0.6). If the result isn't the special "2" case,
 * flip this+0x2c (facingMismatch). Store the direction into player+0x2a0.
 *
 * Both paths then stamp 1.0 into pev+0x11c, pull a pitch from the
 * engine helper at GOT+0x1aa8 (vtable offset 0x168) offset by 0x5f,
 * and emit a landing sound via EMIT_SOUND_DYN on the entity at
 * pev+0x208.
 *
 * @param this  The CTSStunt entity instance
 */
export function Landing(this: CTSStunt): void {
  const player: CBasePlayer = this.player;    // this+0x40
  const pev: EntVars = player.pev;            // entvars_t*

  // Guard 1: must be ducking. Byte at pev+0x1a5 is the second
  // byte of some int field; bit 0x2 is being tested.
  // TODO(asm-ambiguous): exact packed-flag field depends on TS's
  // entvars layout — not the standard HL1 pev->flags offset.
  if ((pev.packedFlags & 0x200) === 0) return;

  // Guard 2: relevant button held (pev+0x250 bit 0x10).
  if ((pev.button & 0x10) === 0) return;

  if ((pev.flags & 0x4006) !== 0) {
    // === Path A: high-impact landing ===
    pev.button &= ~0x10;
    pev.button |= 0x40000;                  // landing-state bit
    pev.button |= 0x1;                      // active-stunt bit
    pev.fuser1 = 0.5;                       // pev+0x120 = 0x3f000000
    pev.velocity.copyFrom(LandingVec);      // pev+0x174 <- GOT+0x1888
    this.recoveryTimer = 0.53125;           // this+0x4 = 0x3f100000
    this.animation.Animate(this.player, 46);
  } else {
    // === Path B: regular landing ===
    pev.button &= ~0x10;
    pev.button |= 0x20;                     // rolling bit
    pev.velocity.copyFrom(LandingVec);

    // Facing direction between this->vec1 and player origin.
    const dir = GetDirection(this.vec1, pev.origin, 0.3, 0.6);
    this.facingMismatch = (dir !== 2) ? 1 : 0;   // this+0x2c
    player.landingDir = dir;                     // player+0x2a0
  }

  // === Common epilogue ===
  pev.fuser2 = 1.0;                         // pev+0x11c = 0x3f800000

  // Pull pitch from engine helper (vtable offset 0x168), offset by
  // 0x5f, and emit the landing sound.
  const pitch = engineHelper.getPitch(0, 0x1f) + 0x5f;
  EMIT_SOUND_DYN(
    pev.someEntity,                         // pev+0x208
    0x4,                                    // flags
    LandingSound,                           // GOT-0x6c364
    1.0,                                    // vol  (0x3f800000)
    0.8,                                    // attn (0x3f4ccccd)
    pitch,
    0x1f,                                   // channel (CHAN_BODY)
    0                                       // entindex
  );
}

// --- Forward declarations (TODO: real definitions in D.4 / engine module) ---
type Vector = { x: number; y: number; z: number };
declare class CTSStunt { /* D.4 */ }
declare class CBasePlayer { /* external */ }
declare class EntVars { /* external */ }
declare const LandingVec: Vector;
declare const LandingSound: string;
declare const engineHelper: { getPitch(arg1: number, arg2: number): number };
declare function GetDirection(
  v1: Vector,
  v2: Vector,
  fwdDot: number,
  sideDot: number
): number;
declare function EMIT_SOUND_DYN(
  ent: any,
  flags: number,
  sample: string,
  vol: number,
  attn: number,
  pitch: number,
  channel: number,
  entindex: number
): void;
```
