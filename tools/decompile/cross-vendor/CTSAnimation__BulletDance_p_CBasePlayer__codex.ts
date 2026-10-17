```typescript
/**
 * CTSAnimation::BulletDance — Trigger the bullet-dance animation when
 * enabled, off cooldown, and the player is in a valid state.
 *
 * Three animation variants are picked via a global animation helper and
 * dispatched to SetAnim. The cooldown timer at offset 0x1dc is reset to
 * (currentTime + 0.15s) on success.
 *
 * @param this    The CTSAnimation instance (implicit in the original C++)
 * @param player  The CBasePlayer to animate
 * @returns void
 */
export function BulletDance(this: CTSAnimation, player: CBasePlayer): void {
  // Bail out if bullet dance isn't currently enabled (flag at offset 0x1e4,
  // toggled by EnableBulletDance / DisableBulletDance).
  if (this.m_bBulletDance === 0) return;

  // Bail out if the per-tick timer at offset 0x1e0 hasn't cleared the
  // threshold at [ebx-0x6f3f0].
  // TODO(asm-ambiguous): cvar / global identity at [ebx-0x6f3f0] is unknown
  // without the strings-n5 lookup. Shape: continue iff field >= threshold.
  if (this.m_flBulletDanceTimerA < bulletDanceTickThreshold) return;

  // Bail out if the cooldown at offset 0x1dc is still in the future
  // relative to the current time at [ebx-0x6f408].
  if (currentTime < this.m_flNextBulletDanceTime) return;

  // Bail out if the player is in a state that blocks bullet dance
  // (CBasePlayer field at offset 0x78).
  // TODO(asm-ambiguous): field purpose unclear without SDK struct layout.
  if (player.m_iNoBulletDanceState !== 0) return;

  // Schedule the next cooldown: current time + 0.15s (float 0x3e19999a).
  this.m_flNextBulletDanceTime = currentTime + 0.15;

  // Query the global animation helper (singleton ptr at [ebx+0x1aa8],
  // vtable entry at offset 0x168) for the bullet-dance variant.
  // Args: (type=2, idx=0). Returns 0, 1, or 2 based on the player's state.
  // TODO(asm-ambiguous): the vtable target is unknown; 8 bytes of stack
  // are reserved before the 2 arg pushes, possibly a hidden return-struct
  // pointer or extra implicit args.
  const variant = bulletDanceHelper.GetBulletDanceVariant(
    /* type */ 2,
    /* idx */ 0
  );

  // Play the matching animation. The three strings live consecutively in
  // .rodata at offsets [ebx-0x6f603], [ebx-0x6f60f], [ebx-0x6f61b]
  // (12 bytes apart — likely 11-char null-terminated identifiers).
  // SetAnim signature: (this, CBasePlayer*, const char*, int fps, int flags).
  switch (variant) {
    case 0:
      SetAnim(this, player, ANIM_BULLET_DANCE_A, /* fps */ 20, /* flags */ 0);
      break;
    case 1:
      SetAnim(this, player, ANIM_BULLET_DANCE_B, 20, 0);
      break;
    case 2:
      SetAnim(this, player, ANIM_BULLET_DANCE_C, 20, 0);
      break;
  }
}
```
