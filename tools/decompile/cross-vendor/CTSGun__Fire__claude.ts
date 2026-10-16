// Module-static shared by all CTSGun::Fire* variants.
// Resets to -1 (= "skip Animate") at the top of Fire, then each
// dispatched variant may overwrite it.
declare let g_animationChoice: number;

export function Fire(this: CTSGun): void {
  // Bail silently if there's no ammo entity attached (e.g. melee
  // weapons). Asm: cmp [esi+0xcc], 0; je 71dca.
  if (!this.m_pAmmo) {
    return;
  }

  // Player-state guard: a pev int equal to 3 means "cannot fire".
  // TODO(asm-ambiguous): exact meaning of [pev + 0x1c0] == 3 —
  // likely a TS-specific deadflag / observer / stance value.
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

  // Reset the animation selector. The Fire variant we dispatch into
  // will overwrite it (or leave it at -1 to skip the animation).
  g_animationChoice = -1;

  // Refresh engine view vectors from the player's view angles.
  // Asm: mov eax, [esi+0x80]; mov eax, [eax]; add eax, 0x74 —
  // i.e. *(m_pPlayer) is pev, then pev + 0x74 is &v_angle.
  UTIL_MakeVectors((this.m_pPlayer as any).pev.v_angle);

  // Dispatch based on the owner's fire-mode byte (m_pOwner + 0x348).
  // Asm: sub al, 4; cmp al, 1; ja → AkimboFire only for fireMode in {4, 5}.
  const ownerFireMode = owner.fireMode;
  if (ownerFireMode === 4 || ownerFireMode === 5) {
    if (this.AkimboFire()) {
      g_animationChoice = ammo.flag !== 0 ? 9 : 8;
    }
    // else: g_animationChoice stays at -1 → no Animate call.
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
    // TODO(asm-ambiguous): offset 0x28c within CBasePlayer is either
    // an embedded CTSAnimation or a pointer to one.
    const anim: any = (this.m_pPlayer as any).anim_at_0x28c;
    anim.Animate(this.m_pPlayer, g_animationChoice);
  }
}
