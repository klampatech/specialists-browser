```typescript
/**
 * CTSAnimation::BlendAnimationsForSlide — pick and queue a slide animation
 * for the player based on movement direction relative to body angle; cache
 * the chosen direction so the next tick can short-circuit when unchanged.
 *
 * @param this      The CTSAnimation instance (the C++ `this`).
 * @param pPlayer   The CBasePlayer being animated.
 * @returns         void
 */
export function BlendAnimationsForSlide(this: CTSAnimation, pPlayer: CBasePlayer): void {
  // 1. Gate: skip if the slide-eligible state flag is clear (single byte
  // at pPlayer + 0x51c). Most likely "not on ground" / "not sliding".
  // TODO(asm-ambiguous): which exact TS state flag this represents.
  if (pPlayer.onGroundFlag === 0) return;

  // 2. Snapshot the player's velocity (Vector of 3 floats at pPlayer + 0x510).
  const velocity = pPlayer.velocity;

  // 3. Snapshot the reference vector for direction picking (Vector at
  // pev + 0x74, dereferenced through pPlayer's pev pointer at +0).
  // Most likely pev->angles (player's body facing).
  // TODO(asm-ambiguous): which exact entvars_t field at pev + 0x74 this is.
  const angles = pPlayer.angles;

  // 4. Compute the discrete direction. The two floats 0.6 and 0.3 are
  // the upFrac / backFrac blend weights passed to GetDirection.
  const direction = GetDirection(velocity, angles, 0.6, 0.3);

  // 5. Skip if the direction matches the cached last choice, or is the
  // "no-slide" sentinel value (== 2).
  if (direction === this.lastSlideDirection) return;
  if (direction === 2) return;

  // 6. Build the slide-sequence name: a 16-byte C-string slot at
  // this + 0x9c (indexed by direction), then concatenated with the
  // player's per-model animation-extension suffix from pPlayer + 0xb58.
  // - If the first byte of the player's ext matches the sentinel at
  //   (GOT - 0x6f7b9), use the default extension at (GOT - 0x6f699).
  // - Otherwise use the player's own extension string as the suffix.
  // TODO(asm-ambiguous): the sentinel byte and both .rodata strings need
  // strings-n5.txt to identify them by name.
  const baseName = this.slideAnimNames[direction];
  const playerExt = pPlayer.animExtension;
  const ext =
    playerExt.charCodeAt(0) === /* TODO sentinel byte @ GOT - 0x6f7b9 */ 0
      ? /* TODO default extension @ GOT - 0x6f699 */ ""
      : playerExt;
  const animName = baseName + ext;

  // 7. Queue the animation. 0x194 (= 404) is a sequence/frame id and
  // the trailing 0 is a body/layer arg inside SetAnim.
  // TODO(asm-ambiguous): exact role of 0x194 and 0 in SetAnim's signature.
  SetAnim(this, pPlayer, animName, 0x194, 0);

  // 8. Cache the chosen direction so the next call can short-circuit.
  this.lastSlideDirection = direction;
}
```
