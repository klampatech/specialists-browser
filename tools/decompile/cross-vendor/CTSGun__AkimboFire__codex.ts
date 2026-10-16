```typescript
/**
 * CTSGun::AkimboFire — fires one akimbo (dual-wield) weapon shot.
 *
 * Decides whether to fire both pistols or just one based on weapon type,
 * button state, and clip levels. Consumes ammo, computes spread, traces
 * bullets via CBasePlayer::ShootBulletsPlayer (one or two calls depending
 * on dual vs single fire), applies view kick, dispatches the fire
 * animation + sound to the owning client, and schedules the next primary
 * attack + weapon idle. Plays EmptySound and bails early if no gun has
 * ammo.
 *
 * @param this  The CTSGun entity instance (this in the original C++).
 * @returns     void
 */
export function AkimboFire(this: CTSGun): void {
  const player     = this.m_pPlayer;     // [this+0x80]  CBasePlayer*
  const itemInfo   = this.m_pItemInfo;   // [this+0xd0]  CTSItemInfo (per-weapon config)
  const weaponData = this.m_pWeaponData; // [this+0xcc]  CTSWeaponState (per-gun ammo state)

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
    // Akimbo requires BOTH IN_ATTACK and IN_ATTACK2 held.
    // Type 5 reads button state through a vtable indirection; type 4
    // reads pev->button directly.
    const buttons =
      weaponType === 5
        ? /* TODO: indirection [m_pPlayer][0][0x180] — exact meaning unclear */ 0
        : player.pev.button;                          // [m_pPlayer+0x814]
    canFire =
      (buttons & IN_ATTACK)  !== 0 &&
      (buttons & IN_ATTACK2) !== 0;
  }
  // Weapon type 0 always fires.
  if (!canFire && weaponType === 0) canFire = true;

  // ── Pick the active gun / bail with EmptySound if both are dry ──────
  if (isAkimboType && !canFire) {
    // Akimbo with only one button held — use player flag hints to pick.
    const leftOk  = ((player.pev.someFlag_0x180 & 0x01) !== 0) && (weaponData.leftClip  > 0);
    const rightOk = ((player.pev.someFlag_0x181 & 0x08) !== 0) && (weaponData.rightClip > 0);
    if (leftOk)  weaponData.activeGun = 0;             // [weaponData+0x24]
    if (rightOk) weaponData.activeGun = 1;
    if (!leftOk && !rightOk) {
      this.EmptySound();
      return;
    }
  } else {
    // Alternate which gun fires; force whichever still has ammo.
    weaponData.activeGun = weaponData.activeGun === 0 ? 1 : 0;
    if (weaponData.leftClip  <= 0) { canFire = false; weaponData.activeGun = 1; }
    if (weaponData.rightClip <= 0) { canFire = false; weaponData.activeGun = 0; }
  }

  // ── Consume ammo (skip when InfiniteClips is active) ────────────────
  if (!InfiniteClips(player)) {
    if (canFire) {
      // Dual-fire: both clips lose one round and total loses two.
      weaponData.clipTotal -= 2;                       // [weaponData+0x4]
      weaponData.rightClip -= 1;                       // [weaponData+0x1c]
      weaponData.leftClip  -= 1;                       // [weaponData+0x20]
    } else {
      weaponData.clipTotal -= 1;
      if (weaponData.activeGun === 1) weaponData.rightClip -= 1;
      else                            weaponData.leftClip  -= 1;
    }
    // Clamp to zero.
    if (weaponData.clipTotal < 0) weaponData.clipTotal = 0;
    if (weaponData.rightClip  < 0) weaponData.rightClip  = 0;
    if (weaponData.leftClip   < 0) weaponData.leftClip   = 0;

    // Slot-4 weapons persist the right-clip count into a per-clip array.
    if (itemInfo.weaponSlot === 4) {                   // [itemInfo+0x348]
      const idx = itemInfo.clipIndex;                  // [itemInfo+0xcc]
      this.ammoClipArray[idx] = weaponData.rightClip;  // [this+0x118 + 56*idx]
    }
  }

  // ── Save player's spread seed for ScaleSpread ───────────────────────
  TS_SPREAD_SEED = itemInfo.spreadSeed;                // [itemInfo+0x28] → [ebx+0x7d14]

  // ── Compute spread and fire rate (when applySpread is set) ──────────
  if (itemInfo.applySpread !== 0) {                    // [itemInfo+0x2c]
    const crouching =
      (weaponData.flags & 0x01) !== 0 &&               // [weaponData+0x10]
      (itemInfo.field_0xe4 ^ 1) !== 0;                 // [itemInfo+0xe4]  TODO: meaning unclear

    let spreadRate = itemInfo.spreadRate;              // [itemInfo+0x34]
    if (canFire) spreadRate += spreadRate;             // double for dual-fire
    ScaleSpread(this, &TS_SPREAD_SEED, spreadRate, crouching ? 1 : 0);

    let fireRate = itemInfo.fireRate;                  // [itemInfo+0x1c]
    if (crouching) fireRate *= TS_CROUCH_FIRE_MULT;    // [ebx-0x6df0c]
    TS_FIRE_RATE = fireRate;                           // [ebx+0x7d1c]
  }

  // ── Build per-gun fire direction ────────────────────────────────────
  const eyePos = new Vector();                         // local 0x90..0x98
  player.GetEyePosition(eyePos);                       // virtual fn via [m_pPlayer+0x60]+0x168

  const fwd   = gpGlobals.v_forward.copy();            // [gpGlobals + 0x28]
  const right = gpGlobals.v_right.copy();              // [gpGlobals + 0x40]

  // activeGun picks which side offset (left vs right hand) to add to fwd.
  const sideOffset =
    weaponData.activeGun !== 0
      ? TS_AKIMBO_RIGHT_HAND_OFFSET                    // [ebx-0x6ded8]
      : TS_AKIMBO_LEFT_HAND_OFFSET;                    // [ebx-0x6e818]
  const baseDir  = fwd.mulAdd(right, sideOffset);
  const traceDir = eyePos.copy().add(baseDir);
  const traceDir2 = traceDir.copy();                   // used for the second gun

  // ── Call ShootBulletsPlayer (once or twice depending on canFire) ───
  const fireArgs = {
    player,
    attackMode:  itemInfo.attackMode,                  // [itemInfo+0x24]
    bulletCount: TS_BULLET_COUNT,                      // [ebx+0x7d04]
    ammoType:    itemInfo.ammoType,                    // [itemInfo+0x20]
    spread:      TS_FIRE_RATE,
    dir:         baseDir,
    fwd,
    viewModel:   player.viewmodelIndex,                // [m_pPlayer+0x7ec]
    attackType:  itemInfo.attackType                   // [itemInfo+0x8]
  };

  if (canFire) {
    ShootBulletsPlayer({ ...fireArgs, traceDir,            viewModel: player.viewmodelIndex        });
    ShootBulletsPlayer({ ...fireArgs, traceDir: traceDir2, viewModel: player.viewmodelIndex + 0x21 });
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
    VKickback(this, kick, itemInfo.weaponSlot, crouching, TS_KICK_Y, TS_KICK_X, 0);
  }

  // ── Track which hand is firing for the client-side animation ───────
  TS_AKIMBO_FIRING = weaponData.activeGun !== 0 ? 1 : 0; // [ebx+0x7d10]

  // ── Dispatch fire animation + sound to the owning client ───────────
  // TODO(asm-ambiguous): full enginefuncs_t.pfnMessageBegin call
  // sequence. Reads animation body from [this+0x964] (normal) or
  // [this+0x96e] (akimbo) based on TS_AKIMBO_FIRING, and dispatches
  // a fire-event message with the weapon id, spread, and sound indices.
  const animIndex = TS_AKIMBO_FIRING
    ? this.animBodyAkimbo                              // [this+0x96e]
    : this.animBodyNormal;                             // [this+0x964]
  DispatchFireEvent(player, weaponData.weaponId, animIndex);

  // ── Compute next attack delay based on weapon type ──────────────────
  let nextAttackDelay: number;
  if (weaponType === 2) {
    // Shotgun-like: pick delay from cvars based on ammo sub-type.
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
  this.m_flTimeWeaponIdle      = now + TS_WEAPON_IDLE_DELAY;  // [ebx-0x6de50] + [this+0xa8]
}
```
