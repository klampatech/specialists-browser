```typescript
/**
 * CTSGun::Fire — central weapon-fire dispatcher.
 *
 * Runs the pre-fire validity checks (ammo entity present, player-state
 * guard, infinite clips / ammo count / special ammo-and-owner fallback),
 * refreshes engine view vectors, routes to AkimboFire / ShotgunFire /
 * StandardFire based on the owner's fire-mode byte, and finally plays the
 * chosen weapon animation.
 */
export function Fire(this: CTSGun): void {
  // Bail silently if there's no ammo entity attached (e.g. melee weapons).
  if (this.m_pAmmo === null) {
    return;
  }

  // Player-state guard: a pev byte equal to 3 means "cannot fire".
  // TODO(asm-ambiguous): exact meaning of [pev + 0x1c0] == 3 — likely a
  // deadflag / observer / stance value, but TS-specific.
  if ((this.m_pPlayer as any).pev[0x1c0] === 3) {
    this.EmptySound();
    return;
  }

  // Decide whether we're allowed to consume a shot.
  const ammo: any = this.m_pAmmo;
  const owner: any = this.m_pOwner;
  const hasInfiniteClips = InfiniteClips(this.m_pPlayer);
  const ammoCount = ammo.count;
  const specialAmmo =
    ammo.flag !== 0 &&
    ammo.ammoType === 3 &&
    owner.fireMode === 1;

  if (!hasInfiniteClips && ammoCount <= 0 && !specialAmmo) {
    this.EmptySound();
    return;
  }

  // Reset the animation selector to the "no animation" sentinel. The
  // Fire variant we dispatch into will overwrite it (or leave it at -1 to
  // skip the animation entirely).
  // TODO: the GOT+0x7c34 global is a module-static shared with Fire variants.
  g_animationChoice = -1;

  // Refresh engine view vectors from the player's view angles.
  // TODO(asm-ambiguous): the Vector at m_pPlayer + 0x74 is most likely
  // entvars_t::v_angle; TS may mirror it within CBasePlayer.
  UTIL_MakeVectors((this.m_pPlayer as any).v_angle);

  // Dispatch based on the owner's fire-mode byte (m_pOwner + 0x348).
  const ownerFireMode = owner.fireMode;
  if (ownerFireMode === 4 || ownerFireMode === 5) {
    // Akimbo path — only the exact bytes 4 or 5 trigger it.
    if (this.AkimboFire()) {
      // Animation 9 if ammo.flag is set, else 8.
      g_animationChoice = ammo.flag !== 0 ? 9 : 8;
    }
    // else: g_animationChoice stays at -1 → no animation call.
  } else if (ownerFireMode === 1) {
    this.ShotgunFire();
    g_animationChoice = 0;
  } else {
    this.StandardFire();
    g_animationChoice = 0;
  }

  // Play the chosen animation unless the sentinel says "none".
  if (g_animationChoice >= 0) {
    // The CTSAnimation object lives at m_pPlayer + 0x28c.
    // TODO(asm-ambiguous): offset 0x28c within CBasePlayer is either an
    // embedded CTSAnimation or a pointer to one.
    const anim: any = (this.m_pPlayer as any).anim_at_0x28c;
    anim.Animate(this.m_pPlayer, g_animationChoice);
  }
}
```
