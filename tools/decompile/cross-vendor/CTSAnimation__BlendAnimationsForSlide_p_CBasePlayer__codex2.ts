// ---------------------------------------------------------------------------
// Stubs to make this compile in isolation (per AGENTS.md checklist #8).
// Real types live in later decompilation phases (D.4 / D.5).
// ---------------------------------------------------------------------------
type Any = any;
const strcpy   = (..._args: any[]): Any => undefined as Any;
const strcat   = (..._args: any[]): Any => undefined as Any;
const stackCString = (_n: number): Any => undefined as Any;
const GetDirection = (..._args: any[]): number => 0;
const SetAnim = (..._args: any[]): void => undefined;
const g_szExtCheck:   Any = undefined as Any;
const g_szExtDefault: Any = undefined as Any;

class Vector {
  constructor(public x: number, public y: number, public z: number) {}
}

interface CTSAnimation {
  // Offset 0x14: last applied slide direction (used to skip redundant updates).
  m_nCurrentSlideDir: number;
  // Offset 0x9c: per-direction slide-anim name table, 16-byte stride entries.
  m_pSlideAnimsTable: Any;
}

interface CBasePlayer {
  // Offset 0x51c: byte flag — TS-specific "is sliding" state.
  m_bIsSliding: number;
  // Offset 0x510..0x518: 3 floats — likely a TS-cached velocity.
  m_vecVelocityCache: Vector;
  // Offset 0xb58: char* — anim extension (e.g., "_pistol").
  m_szAnimExtension: Any;
  pev: { v_angle: Vector };
}

/**
 * CTSAnimation::BlendAnimationsForSlide — picks and applies the slide
 * animation sequence for the player's current movement direction and
 * anim extension. No-op if the player isn't sliding, if the direction
 * hasn't changed, or if the direction is the "no input" sentinel (2).
 *
 * Calling convention: cdecl — `this` and `player` are both on the stack
 * (`[esp+0x80]` and `[esp+0x84]` after the prologue). The function does
 * NOT use thiscall's ECX-for-this convention here.
 */
export function BlendAnimationsForSlide(
  this: CTSAnimation,
  player: CBasePlayer
): void {
  // Bail if the player isn't currently sliding. [player+0x51c] byte used  // as a boolean; likely TS's m_bIsSliding.
  if (player.m_bIsSliding === 0) {
    return;
  }

  // 3 floats at player+0x510..0x518 (TS-cached velocity, not pev->velocity).
  const velocity = new Vector(
    player.m_vecVelocityCache.x,
    player.m_vecVelocityCache.y,
    player.m_vecVelocityCache.z
  );
  // 3 floats at pev+0x74..0x7c (entvars_t::v_angle). pev is the first
  // pointer on CBaseEntity (offset 0).
  const viewAngles = new Vector(
    player.pev.v_angle.x,
    player.pev.v_angle.y,
    player.pev.v_angle.z
  );

  // Classify the player's current movement direction. Args are pushed
  // right-to-left (cdecl), so the call is GetDirection(velocity,
  // viewAngles, 0.6, 0.3). The 0.6/0.3 trailing floats are likely
  // hysteresis / deadzone thresholds.
  // TODO(asm-ambiguous): threshold semantics need engine context.
  const direction = GetDirection(velocity, viewAngles, 0.6, 0.3);

  // Skip if direction matches last-applied slide dir, or if it's the
  // "no input" sentinel (2).
  if (direction === this.m_nCurrentSlideDir) {
    return;
  }
  if (direction === 2) {
    return;
  }

  // Pick the base slide-anim name from a per-direction table on `this`.
  // Table at this+0x9c with 16-byte stride entries (direction << 4
  // indexing). The first member of each entry is treated as a char* by
  // strcpy, so we treat it as a char* here.
  // TODO(asm-ambiguous): entry layout inferred from byte-stride; not
  // directly observed in the chunk.
  const baseName = this.m_pSlideAnimsTable[direction];

  // Build the full anim name (base + suffix) in a stack buffer.
  // Buffer sits at [esp+0x2c] in the disassembly; locals frame is 0x6c
  // bytes, leaving ~72 bytes before the saved regs. 64 is a conservative
  // round-down.
  // TODO(asm-ambiguous): buffer size not explicit in the disassembly.
  const animNameBuf = stackCString(64);
  strcpy(animNameBuf, baseName);

  // Suffix selection: compare first byte of player's anim extension
  // ([player+0xb58]) with first byte of a global "extension check"
  // string ([ebx-0x6f7b9]). On match: use the global "extension default"
  // string ([ebx-0x6f699]). Otherwise: use the player's extension.
  // TODO(asm-ambiguous): the global strings' contents aren't in the
  // chunk — likely a weapon-class check (e.g., pistol vs rifle).
  const extFirstByte   = (player.m_szAnimExtension as string).charCodeAt(0);
  const checkFirstByte = (g_szExtCheck             as string).charCodeAt(0);
  const suffix =
    extFirstByte === checkFirstByte
      ? g_szExtDefault
      : player.m_szAnimExtension;

  strcat(animNameBuf, suffix);

  // Apply the animation.
  // SetAnim signature (per demangling): SetAnim(this, player, animName,
  // int, int) — 4 explicit params + implicit this = 5 args.0x194 likely
  // a body-part / sequence index; the trailing 0 likely a flags /
  // transition parameter.
  // TODO(asm-ambiguous): exact meaning of the two trailing ints needs
  // engine context.
  SetAnim(this, player, animNameBuf, 0x194, 0);

  // Remember the new direction.
  this.m_nCurrentSlideDir = direction;
}
