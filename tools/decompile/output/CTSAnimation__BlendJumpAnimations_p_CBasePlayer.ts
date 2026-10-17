/**
 * CTSAnimation::BlendJumpAnimations — pick a directional jump animation
 * (forward / back / left / right / in‑place) based on the player's 3D
 * velocity magnitude and view angles, build the model‑specific name by
 * appending `m_szAnimExtension`, and forward to `SetAnim`.
 *
 * Idempotent: skips when the chosen direction matches the cached value
 * stored at this+0x14.
 */
export function BlendJumpAnimations(this: any, pPlayer: any): void {
  // Early‑out: 1‑byte equality at `pPlayer + 0xb58` vs .rodata byte at
  // [ebx - 0x6f7b9]. Treated as the empty/NUL terminator here; verify
  // the actual byte value before relying on the literal `0`.
  if (pPlayer.m_szAnimExtension[0] === 0) {
    return;
  }

  // Compute speed = sqrt(vel.x² + vel.y² + vel.z²).
  // pev->velocity is at +0x20 in entvars_t; pev is the first field of
  // CBaseEntity, so `mov eax, [pPlayer]` loads pPlayer->pev.
  const vel: any = pPlayer.pev.velocity;
  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

  // Threshold + normalize. Below `JUMP_MIN_SPEED`, use a fixed upward
  // direction; above it, normalize the velocity. The same constant at
  // [ebx - 0x6f3fc] is used for both the stationary .z and the 1/speed
  // divisor — assumed 1.0 here (resolve against .rodata to confirm).
  let direction: any;
  if (speed < JUMP_MIN_SPEED) {
    direction = { x: 0, y: 0, z: 1 };
  } else {
    const inv = 1.0 / speed;
    direction = { x: vel.x * inv, y: vel.y * inv, z: vel.z * inv };
  }

  // Classify jump direction. viewAngles at pev+0x74.
  // Push order in asm = (direction, viewAngles, 0.6, 0.3) → left‑to‑right.
  const viewAngles: any = pPlayer.pev.angles;
  const idx = GetDirection(direction, viewAngles, 0.6, 0.3);

  // Skip if the chosen direction hasn't changed since the last call.
  if (idx === this.lastJumpAnim) {
    return;
  }

  // 5‑entry jump table (cases 0..4) selects the anim name literal.
  const animName: string = JUMP_ANIM_NAMES[idx];

  // Append m_szAnimExtension via strcat onto a local stack buffer.
  strcat(animName, pPlayer.m_szAnimExtension);

  // SetAnim(this, pPlayer, animName, 404, 0).
  // 404 = 0x194 (the int constant pushed just before the SetAnim call).
  SetAnim(this, pPlayer, animName, 404, 0);

  // Update the cache.
  this.lastJumpAnim = idx;
}
