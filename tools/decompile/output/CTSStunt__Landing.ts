/**
 * CTSStunt::Landing — handle the player's landing from a stunt maneuver.
 *
 * Bails out unless the player is ducking (byte at pev+0x1a5, bit 0x2)
 * AND has a relevant button held (int at pev+0x250, bit 0x10). Then
 * branches on a flag word at pev+0x180 (mask 0x4006).
 *
 * Path A (high-impact): clear the in-dive bit, set landing-state bits
 * (0x40000 and 0x1), stamp 0.5 into pev+0x120, copy the canned landing
 * Vector (GOT+0x1888) into pev+0x174 (12 bytes), set this->recoveryTimer
 * (this+0x4) to 0.53125, and call Animate with first arg =
 * (char*)this->player + 0x28c.
 *
 * Path B (regular): clear the in-dive bit, set the rolling bit (0x20),
 * copy the landing Vector, call GetDirection(this->vec1, pev->field_0x74,
 * 0.6, 0.3). If the result != 2, set this->facingMismatch (this+0x2c);
 * store the result into player+0x2a0.
 *
 * Common epilogue: stamp 1.0 into pev+0x11c, call the engine helper
 * at GOT+0x1aa8 vtable+0x168 with (0, 0x1f, 0.5), add 0x5f to its
 * return value to get the pitch, then EMIT_SOUND_DYN with the entity
 * at pev+0x208.
 */
export function Landing(this: CTSStunt): void {
  const player: CBasePlayer = this.player;        // this+0x40
  const pev: EntVars = player.pev;                // entvars_t*

  // Guard 1: byte at pev+0x1a5, bit 0x2 (ducking)
  if ((pev.byte_at_0x1a5 & 0x02) === 0) return;

  // Guard 2: int at pev+0x250, bit 0x10 (button)
  if ((pev.int_at_0x250 & 0x10) === 0) return;

  if ((pev.int_at_0x180 & 0x4006) !== 0) {
    // === Path A: high-impact landing ===
    pev.int_at_0x250 = (pev.int_at_0x250 & ~0x10) | 0x40000 | 0x1;
    pev.float_at_0x120 = 0.5;
    // rep movsd 12 bytes from GOT+0x1888 to pev+0x174
    pev.vec3_at_0x174.copyFrom(LandingVec);
    this.recoveryTimer = 0.53125; // this+0x4
    // Animate signature: CTSAnimation::Animate(this, player, sequence)
    // First arg in disassembly = (char*)this->player + 0x28c
    Animate(player.m_pAnimation_at_0x28c, player, 46);
  } else {
    // === Path B: regular landing ===
    pev.int_at_0x250 = (pev.int_at_0x250 & ~0x10) | 0x20;
    pev.vec3_at_0x174.copyFrom(LandingVec);
    // Disassembly pushes 0.6 as arg 3, 0.3 as arg 4
    const dir = GetDirection(this.vec1, pev.vec3_at_0x74, 0.6, 0.3);
    this.facingMismatch_byte_at_0x2c = (dir !== 2) ? 1 : 0;
    player.int_at_0x2a0 = dir;                    // landingDir
  }

  // === Common epilogue (skipped on bail) ===
  pev.float_at_0x11c = 1.0;

  // engine helper: (0, 0x1f, 0.5) → returns a base pitch; add 0x5f  const pitch = engineHelper.func_at_0x168(0, 0x1f, 0.5) + 0x5f;

  // EMIT_SOUND_DYN(edict_t*, int, const char*, float, float, int, int)
  EMIT_SOUND_DYN(
    pev.ent_at_0x208,         // ent*
    0x4,                      // flags
    LandingSound,             // sample (GOT-0x6c364)
    1.0,                      // vol
    0.8,                      // attn
    0,                        // entindex
    pitch                     // pitch
  );
}

// --- Forward declarations (real definitions in D.4 / engine module) ---
type Vector = { x: number; y: number; z: number };
declare class CTSStunt { /* D.4 */ }
declare class CBasePlayer { /* external */ }
declare class EntVars { /* external */ }
declare const LandingVec: Vector;
declare const LandingSound: string;
declare const engineHelper: {
  // vtable+0x168: takes (int, int, float) per disassembly
  func_at_0x168(a1: number, a2: number, a3: number): number;
};
declare function GetDirection(
  v1: Vector,
  v2: Vector,
  f1: number,    // 0.6 (arg 3)
  f2: number     // 0.3 (arg 4)
): number;
declare function Animate(
  thisAnim: unknown,   // (char*)player + 0x28c, treated as CTSAnimation*
  player: CBasePlayer,
  sequence: number
): void;
declare function EMIT_SOUND_DYN(
  ent: unknown,
  flags: number,
  sample: string,
  vol: number,
  attn: number,
  entindex: number,
  pitch: number
): void;
