/**
 * CTSAnimation::BulletDance — Decompiled from ts_i386.so @ 0x0005d338
 * (200 bytes). Triggers a bullet-dance animation on `player` if all four
 * guards pass; otherwise returns silently.
 *
 * Field naming and helper signatures are speculative; revisit when
 * UpdateTimers (0x0005b37c) and the vtable helper at [ebx+0x1aa8] are
 * decompiled.
 */

// ─── Constants extracted from the disassembly ──────────────────────────
const BULLET_DANCE_COOLDOWN_VALUE = 0.15; // 0x3e19999a (5d38c)
const BULLET_DANCE_ANIM_FPS = 20;         // 0x14 (5d3c9 / 5d3d9 / 5d3e9)
const BULLET_DANCE_ANIM_FLAGS = 0;

// ─── Stubs for unknown types ───────────────────────────────────────────
// TODO: replace with real type definitions when the class is decompiled.
type CBasePlayer = any;
type CTSAnimation = any;

// ─── Stubs for unknown globals ─────────────────────────────────────────
// TODO(asm-ambiguous): [ebx-0x6f3f0] and [ebx-0x6f408] identity unknown.
// [ebx-0x6f3f0] is likely a cvar (compare with strings-n5.txt for
// slowamt, ts_slowmotion). [ebx-0x6f408] may be gpGlobals->time or a
// constant; resolves once UpdateTimers is decompiled.
const bulletDanceTimerAThreshold: number = 0; // [ebx-0x6f3f0]
const bulletDanceTimerBGlobal: number = 0;    // [ebx-0x6f408]

// ─── Stubs for the three animation name strings ────────────────────────
// TODO(asm-ambiguous): strings at [ebx-0x6f61b], [ebx-0x6f60f],
// [ebx-0x6f603] are 12 bytes apart (11-char null-terminated); identity
// unknown without the strings dump. Fill from rodata.
const ANIM_STRING_A: string = ""; // [ebx-0x6f61b]
const ANIM_STRING_B: string = ""; // [ebx-0x6f60f]
const ANIM_STRING_C: string = ""; // [ebx-0x6f603]

// ─── Stubs for sibling / external functions ────────────────────────────
declare function SetAnim(
  this_: CTSAnimation,
  player: CBasePlayer,
  animName: string,
  fps: number,
  flags: number,
): void;

// Vtable helper at [ebx+0x1aa8]+0x168. cdecl push order: push 0x2 first,
// push 0x0 second → first arg = 0x0, second arg = 0x2.
declare const bulletDanceHelperSingleton: {
  vtable168: (a: number, b: number) => number;
};

/**
 * BulletDance — TS disassembly of 0x0005d338.
 *
 * 4 early-exit guards, then a vtable helper selects one of three
 * SetAnim animations based on the player's state. Default case falls
 * through to the epilogue.
 */
export function BulletDance(this_: CTSAnimation, player: CBasePlayer): void {
  // Guard 1: [esi+0x1e4] must be non-zero (enable flag, DWORD).
  // Toggled by EnableBulletDance / DisableBulletDance (siblings).
  if (this_.m_dwBulletDanceEnabled === 0) return;

  // Guard 2: [esi+0x1e0] >= [ebx-0x6f3f0] (timer A vs threshold).
  if (this_.m_flBulletDanceTimerA < bulletDanceTimerAThreshold) return;

  // Guard 3: [ebx-0x6f408] >= [esi+0x1dc] (current global >= cooldown).
  // NOTE: the previous TS labeled this "nextBulletDanceTime" and added
  // currentTime on reset. The disassembly stores a CONSTANT (0.15) on
  // reset, which is inconsistent with a "next timestamp" semantic.
  // Either the field is a "cooldown remaining" countdown (and is
  // decremented by UpdateTimers), or the TS is misreading. Defer
  // naming until UpdateTimers is decompiled.
  if (bulletDanceTimerBGlobal < this_.m_flBulletDanceCooldown) return;

  // Guard 4: [edi+0x78] must be zero (player block flag).
  if (player.m_dwBulletDanceBlockFlag !== 0) return;

  // Reset [esi+0x1dc] to 0.15. CONSTANT write per 5d38c — NOT
  // currentTime + 0.15.
  this_.m_flBulletDanceCooldown = BULLET_DANCE_COOLDOWN_VALUE;

  // Vtable call: [ebx+0x1aa8]+0x168 with args (0x0, 0x2) — push order
  // is right-to-left (push 0x2, push 0x0).
  // TODO(asm-ambiguous): 8 bytes of stack are reserved (`sub esp, 0x8`)
  // before the two arg pushes. Possibly MSVC 16-byte alignment, or a
  // hidden return-struct slot for a >8-byte struct.
  const variant = bulletDanceHelperSingleton.vtable168(0, 2);

  // Switch over {0, 1, 2}; default falls through to epilogue (5d3fc).
  switch (variant) {
    case 0:
      SetAnim(this_, player, ANIM_STRING_A, BULLET_DANCE_ANIM_FPS, BULLET_DANCE_ANIM_FLAGS);
      break;
    case 1:
      SetAnim(this_, player, ANIM_STRING_B, BULLET_DANCE_ANIM_FPS, BULLET_DANCE_ANIM_FLAGS);
      break;
    case 2:
      SetAnim(this_, player, ANIM_STRING_C, BULLET_DANCE_ANIM_FPS, BULLET_DANCE_ANIM_FLAGS);
      break;
    default:
      // Disassembly: `jmp 5d3fc` (epilogue). Nothing to do.
      break;
  }
}
