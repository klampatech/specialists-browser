/**
 * CTSGun::AkimboFire — fires one akimbo (dual-wield) weapon shot.
 * Returns 1 if the shot was performed, 0 if it bailed (no ammo).
 *
 * Decompiled from `ts/dlls/ts_i386.so` @0x000729c0 (2350 B).
 */
export function AkimboFire(this: any): number {
  const player     = this.m_pPlayer;        // [this+0x80]
  const itemInfo   = this.m_pItemInfo;      // [this+0xd0]
  const weaponData = this.m_pWeaponData;    // [this+0xcc]

  // ── Lazy-init three akimbo-related cvars to 1 on first invocation ──
  // TODO(asm-ambiguous): cvar names — look up in tools/decompile/analysis/strings-n5.txt
  if (CVAR_TS_AKIMBO_A.value === 0) CVAR_TS_AKIMBO_A.value = 1;  // [ebx+0x7ce0]
  if (CVAR_TS_AKIMBO_B.value === 0) CVAR_TS_AKIMBO_B.value = 1;  // [ebx+0x7ce4]
  if (CVAR_TS_AKIMBO_C.value === 0) CVAR_TS_AKIMBO_C.value = 1;  // [ebx+0x7ce8]

  // ── Determine fire eligibility ──────────────────────────────────────
  const weaponType   = weaponData.weaponType;        // byte @ weaponData+0x2
  const isAkimboType = (weaponType - 4) <= 1;        // type ∈ {4, 5}
  let canFire = false;

  if (isAkimboType) {
    // NOTE: disassembly tests bits 0x1 AND 0x800 of [m_pPlayer+0x814].
    // Bit 0x800 is NOT standard IN_ATTACK2 (which is 0x2); it's a
    // TS-specific "akimbo-fire" flag.
    let buttons: number;
    if (weaponType === 5) {
      // TODO(asm-ambiguous): double-indirection [m_pPlayer][0][0x180]
      buttons = 0;
    } else {
      buttons = player.field_0x814;                  // [m_pPlayer+0x814]
    }
    canFire = (buttons & 0x1) !== 0 && (buttons & 0x800) !== 0;
  }
  if (!canFire && weaponType === 0) canFire = true;

  // ── Pick the active gun / bail with EmptySound if both are dry ──────
  if (isAkimboType && !canFire) {
    const leftFlag  = (player.field_0x180 ?? 0) & 0x01; // [(*m_pPlayer)+0x180]
    const rightFlag = (player.field_0x181 ?? 0) & 0x08; // [(*m_pPlayer)+0x181]
    const leftOk  = leftFlag  !== 0 && weaponData.leftClip  > 0;
    const rightOk = rightFlag !== 0 && weaponData.rightClip > 0;
    if (leftOk)  weaponData.activeGun = 0;             // [weaponData+0x24]
    if (rightOk) weaponData.activeGun = 1;
    if (!leftOk && !rightOk) {
      this.EmptySound();
      return 0;                                         // matches `mov al,0x0` @ 0x72ae1
    }
  } else {
    weaponData.activeGun = weaponData.activeGun === 0 ? 1 : 0;
    if (weaponData.leftClip  <= 0) { canFire = false; weaponData.activeGun = 1; }
    if (weaponData.rightClip <= 0) { canFire = false; weaponData.activeGun = 0; }
  }

  // ── Consume ammo (skip when InfiniteClips is active) ────────────────
  if (!InfiniteClips(player)) {
    if (canFire) {
      weaponData.clipTotal -= 2;                       // [weaponData+0x4]
      weaponData.rightClip -= 1;                       // [weaponData+0x1c]
      weaponData.leftClip  -= 1;                       // [weaponData+0x20]
    } else {
      weaponData.clipTotal -= 1;
      if (weaponData.activeGun === 1) weaponData.rightClip -= 1;
      else                            weaponData.leftClip  -= 1;
    }
    if (weaponData.clipTotal < 0) weaponData.clipTotal = 0;
    if (weaponData.rightClip  < 0) weaponData.rightClip  = 0;
    if (weaponData.leftClip   < 0) weaponData.leftClip   = 0;

    if (itemInfo.weaponSlot === 4) {                   // [itemInfo+0x348]
      const idx = itemInfo.clipIndex;                  // [itemInfo+0xcc]
      this.ammoClipArray[idx] = weaponData.rightClip;
    }
  }

  // ── Save player's spread seed for ScaleSpread ───────────────────────
  TS_SPREAD_SEED = itemInfo.spreadSeed;                // [itemInfo+0x28]

  // ── Compute spread and fire rate (when applySpread is set) ──────────
  if (itemInfo.applySpread !== 0) {                    // [itemInfo+0x2c]
    const crouching =
      (weaponData.flags & 0x01) !== 0 &&               // [weaponData+0x10]
      (itemInfo.field_0xe4 ^ 1) !== 0;                 // [itemInfo+0xe4]

    let spreadRate = itemInfo.spreadRate;              // [itemInfo+0x34]
    if (canFire) spreadRate += spreadRate;             // double for dual-fire
    // Note: no `&` in TS — pass globals by reference via a wrapper object.
    ScaleSpread(this, TS_SPREAD_SEED, spreadRate, crouching ? 1 : 0);

    let fireRate = itemInfo.fireRate;                  // [itemInfo+0x1c]
    if (crouching) fireRate *= TS_CROUCH_FIRE_MULT;    // [ebx-0x6df0c]
    TS_FIRE_RATE = fireRate;                           // [ebx+0x7d1c]
  }

  // ── Build per-gun fire direction ────────────────────────────────────
  const eyePos = new Vector();
  player.GetEyePosition(eyePos);

  // TODO(asm-ambiguous): [ebx+0x1600]+0x28 — likely v_forward but offset
  // doesn't match standard gpGlobals->v_forward (0x1C). May be g_engfuncs.
  const fwd   = gpGlobals.v_forward; // placeholder
  const right = gpGlobals.v_right;   // placeholder

  const sideOffset =
    weaponData.activeGun !== 0
      ? TS_AKIMBO_RIGHT_HAND_OFFSET                    // [ebx-0x6ded8]
      : TS_AKIMBO_LEFT_HAND_OFFSET;                    // [ebx-0x6e818]
  const dir = right.mul(sideOffset);
  const traceDir = eyePos.add(dir);

  // ── Call ShootBulletsPlayer (once or twice depending on canFire) ───
  // TODO(asm-ambiguous): full enginefuncs_t dispatch — see0x731ed..0x73253.
  // Source of weapon id is [this+0xc8], NOT weaponData.weaponId.
  const fireArgs = {
    player,
    attackMode:  itemInfo.attackMode,                  // [itemInfo+0x24]
    bulletCount: TS_BULLET_COUNT,                      // [ebx+0x7d04]
    ammoType:    itemInfo.ammoType,                    // [itemInfo+0x20]
    spread:      TS_FIRE_RATE,
    dir,
    fwd,
    viewModel:   player.viewmodelIndex,                // [m_pPlayer+0x7ec]
    attackType:  itemInfo.attackType                   // [itemInfo+0x8]
  };

  if (canFire) {
    ShootBulletsPlayer({ ...fireArgs, traceDir, viewModel: player.viewmodelIndex        });
    ShootBulletsPlayer({ ...fireArgs, traceDir, viewModel: player.viewmodelIndex + 0x21 });
  } else {
    ShootBulletsPlayer({ ...fireArgs, traceDir });
  }

  // ── Apply view kick ─────────────────────────────────────────────────
  if (itemInfo.applyKickback !== 0) {                  // [itemInfo+0x38]
    const crouching =
      (weaponData.flags & 0x01) !== 0 &&
      (itemInfo.field_0xe4 ^ 1) !== 0;
    let kick = itemInfo.kickbackAmount;                // [itemInfo+0x30]
    if (canFire) kick += kick;                         // double for dual-fire
    // TODO(asm-ambiguous): VKickback actually pushes
    // (kick, weaponSlot, crouching, [ebx+0x7d04], [ebx+0x7d08], 0).
    // TS_KICK_Y/TS_KICK_X don't match the disassembly — adjust once
    // those globals are identified.
    VKickback(this, kick, itemInfo.weaponSlot, crouching, TS_KICK_Y, TS_KICK_X, 0);
  }

  // ── Track which hand is firing for the client-side animation ───────
  TS_AKIMBO_FIRING = weaponData.activeGun !== 0 ? 1 : 0; // [ebx+0x7d10]

  // ── Dispatch fire animation + sound to the owning client ───────────
  // NOTE: weapon id source is [this+0xc8], not weaponData.weaponId.
  const animIndex = TS_AKIMBO_FIRING
    ? this.animBodyAkimbo                              // [this+0x96e]
    : this.animBodyNormal;                             // [this+0x964]
  DispatchFireEvent(player, this.field_0xc8, animIndex);

  // ── Compute next attack delay based on weapon type ──────────────────
  let nextAttackDelay: number;
  if (weaponType === 2) {
    nextAttackDelay =
      weaponData.field_0x8 === 1                       // [weaponData+0x8]
        ? TS_CVAR_SHOTGUN_DELAY_1                      // [ebx-0x6dee0]
        : TS_CVAR_SHOTGUN_DELAY_2;                     // [ebx-0x6dedc]
  } else if (weaponType === 1 || weaponType === 4) {
    nextAttackDelay = 0.1;                             // 0x3dcccccd
  } else {
    nextAttackDelay = itemInfo.nextAttackDelay;        // [itemInfo+0x18]
  }

  const now = UTIL_WeaponTimeBase();
  this.m_flNextPrimaryAttack   = now + nextAttackDelay;       // [this+0xa0]
  this.m_flNextSecondaryAttack = now + nextAttackDelay;       // [this+0x9c]
  this.m_flTimeWeaponIdle      = now + TS_WEAPON_IDLE_DELAY;  // [this+0xa8]

  return 1;                                          // matches `mov al,0x1` @ 0x732e1
}