```typescript
/**
 * CTSAnimationP11CBasePlayer::BlendJumpAnimations — pick a directional
 * jump animation (forward / back / left / right / in-place) based on the
 * player's 3D velocity magnitude and view angles, build the model-specific
 * animation name by appending `m_szAnimExtension`, and forward to `SetAnim`.
 *
 * Idempotent across calls: skips when the chosen direction matches the
 * previously cached value stored in `this.lastJumpAnim` (offset 0x14).
 *
 * @param this    The CTSAnimation instance.
 * @param pPlayer The CBasePlayer whose jump is being animated.
 * @returns       void.
 */
export function BlendJumpAnimations(
  this: CTSAnimationP11CBasePlayer,
  pPlayer: CBasePlayer,
): void {
  // Early-out: player has no animation extension set (default model —
  // nothing to blend). The asm compares 1 byte at `pPlayer + 0xb58`
  // against a '\0'-like constant in .rodata via `repz cmps` with ecx=1
  // and skips the function entirely on equality.
  // TODO(asm-ambiguous): exact constant byte at `[ebx - 0x6f7b9]` is
  // unresolved — treated as the empty/zero terminator here.
  if (pPlayer.m_szAnimExtension[0] === 0) {
    return;
  }

  // Compute the player's 3D velocity magnitude.
  // pev->velocity lives at offset 0x20 in Half-Life's entvars_t.
  const vel = pPlayer.pev.velocity;
  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

  // Compare against a min-speed threshold global at [ebx - 0x6f408]
  // (likely `ts_jumpminspeed` or similar). Below the threshold we treat
  // the jump as stationary and supply an explicit up-direction; above
  // it we normalize the full 3D velocity into a unit vector. The
  // divisor "1.0" is the float constant at [ebx - 0x6f3fc].
  let direction: Vector;
  if (speed < JUMP_MIN_SPEED) {
    direction = new Vector(0, 0, 1); // stationary jump: straight up
  } else {
    const inv = 1.0 / speed;
    direction = new Vector(vel.x * inv, vel.y * inv, vel.z * inv);
  }

  // Classify the jump direction (returns 0..4) using the player's view
  // angles (pev->angles at offset 0x74) plus the normalized velocity
  // direction and two cosine thresholds (0.6, 0.3). Returns a discrete
  // forward / back / left / right / in-place index.
  // TODO(asm-ambiguous): argument order for the demangled
  //   GetDirection(Vector, Vector, float, float)
  // is inferred from the stack layout — arg1 = direction (overlayed on
  // its own buffer at [esp+0x20..0x28]), arg2 = view angles, arg3 = 0.6,
  // arg4 = 0.3. The arg named "0.3" (0x3e99999a) and "0.6" (0x3f19999a)
  // look like backwards / forwards threshold cosines — which is which is
  // not derivable from the asm alone.
  const viewAngles = pPlayer.pev.angles;
  const idx = GetDirection(direction, viewAngles, 0.6, 0.3);

  // Skip the rest when the chosen direction hasn't changed since last
  // frame. The cache lives at `this.lastJumpAnim` (offset 0x14).
  if (idx === this.lastJumpAnim) {
    return;
  }

  // Look up the animation name for the chosen direction index. The asm
  // uses a 5-entry relative jump table (cases 0..4) where each arm copies
  // a small animation-string literal ("jump_fwd", "jump_back", …) from
  // .rodata into a stack-local buffer at [esp+0x30].
  // TODO(asm-ambiguous): the .rodata string addresses [ebx - 0x6f77b],
  // [ebx - 0x6f76f], and the three more cases (5d740 / 5d745 / 5d74d /
  // 5d74f / 5d755 / 5d757 / 5d759 / 5d76b — disassembly is mangled in
  // the dump) need to be resolved against `tools/decompile/analysis/`
  // for actual names. We represent them abstractly here.
  const animName: string = JUMP_ANIM_NAMES[idx];

  // Build the model-specific name by `strcat`-ing the player's animation
  // extension (m_szAnimExtension at `pPlayer + 0xb58`) onto the local
  // anim-name buffer. The asm reuses the buffer as the strcat dest.
  // TODO(asm-ambiguous): stack-buffer aliasing for strcat — modeled as
  // in-place concat onto the lookup result.
  strcat(animName, pPlayer.m_szAnimExtension);

  // Push the animation. `SetAnim(this, pPlayer, animName, 0x194, 0)`
  // i.e. body/FPS-ish value 404 and a 0 flag (loop / blend init). The
  // exact meaning of the two trailing ints needs verification against
  // the SetAnim signature.
  // TODO(asm-ambiguous): SetAnim's `(p CBasePlayer, p ?, ?, ?)` is
  // `SetAnim(p CBasePlayer, p ?, i, i)` from the table — meaning of
  // 404 / 0 in those slots is engine-semantic.
  SetAnim(this, pPlayer, animName, 404, 0);

  // Cache the chosen direction so subsequent calls short-circuit.
  this.lastJumpAnim = idx;
}
```
