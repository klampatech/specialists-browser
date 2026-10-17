```typescript
/**
 * CTSStunt::CloseAttack — execute a close-quarters (melee) attack for the stunt system.
 *
 * Validates timing/state preconditions, computes a velocity-scaled damage value
 * (doubled in-FPU if the player has the Kung-Fu perk), dispatches the attack via
 * CBasePlayer::CloseCombatAttack, then plays an animation, emits a hit sound, and
 * updates the melee UI bar.
 *
 * @param this  The CTSStunt entity instance
 * @returns     1 if the attack was dispatched, 0 if rejected (cooldown, blocked
 *              player state, empty ammo on a knife-type weapon, or CloseCombatAttack
 *              returning 0)
 */
export function CloseAttack(this: CTSStunt): number {
  // [this+0x40] is a pointer-to-pointer to CBasePlayer; deref to get the player.
  const player = this.m_pPlayer[0];

  // ── Cooldown gate: m_flNextAttack ────────────────────────────────────────
  // currentTime is a process-wide time float (likely g_flTimeCheck / a static
  // mirroring gpGlobals->time). If the next-attack cooldown has not elapsed, bail.
  if (currentTime < this.m_flNextAttack) return 0;          // [this+0x4]

  // ── Player state preconditions ───────────────────────────────────────────
  // [player+0x250] is a 32-bit flag bitmask; 0x30c30 is the mask of
  // "cannot attack" states (frozen, spectator, ontrain, waterjump, partial ground).
  // [player+0x1a5] is a single byte; bit 0x40 is another blocked-state flag.
  // TODO(asm-ambiguous): exact field names — these are typical blocked-state flags.
  if ((player.m_fFlags & 0x30c30) !== 0) return 0;
  if ((player.m_afSomeFlag & 0x40) !== 0) return 0;

  // ── Cooldown gate: m_flNextStunt ─────────────────────────────────────────
  if (currentTime < this.m_flNextStunt) return 0;           // [this+0x8]

  // ── Active-weapon ammo gate ──────────────────────────────────────────────
  // [player+0xa10] is m_pActiveItem. If it's a knife-type weapon (iId == 0x10)
  // with no ammo, bail.
  const activeItem = player.m_pActiveItem;
  if (activeItem !== null
      && activeItem.m_iId === 0x10
      && activeItem.m_iAmmo1 === 0) {
    return 0;
  }

  // ── Set up forward/right/up vectors from the player's view angles ───────
  // [player+0x74] is the angles vector passed to UTIL_MakeVectors, which
  // populates gpGlobals->v_forward / v_right / v_up.
  UTIL_MakeVectors(player.m_vecViewAngles);

  // ── Get the eye position via vtable ─────────────────────────────────────
  // Calls [player+0x60].vtable[0x168/4 = 0x5a], i.e. GetEyePosition(Vector&).
  const eyePos = new Vector();
  player.GetEyePosition(eyePos);

  // ── Compute damage from player velocity ─────────────────────────────────
  // [player+0x20] is pev->velocity.
  const velocity = player.pev.velocity;
  const speed = Math.sqrt(
    velocity.x * velocity.x +
    velocity.y * velocity.y +
    velocity.z * velocity.z,
  );

  // The damage formula in MSVC codegen re-derives |velocity| three times
  // (a codegen artifact of comparing floats against different cvars).
  // Semantically:
  //   • If speed * scale == edge_case (NaN/0/inf), use the base damage
  //   • Else if speed * scale < max_damage_cap, use the alt damage
  //   • Else, use speed * scale (no upper clamp)
  // TODO(asm-ambiguous): cvar names are placeholders — see tools/decompile/analysis/strings-n5.txt
  //   for the real names (likely ts_ca_dmg* / ts_ca_speed*).
  let damage: number;
  const scaledSpeed = speed * ts_ca_dmgScale;             // [ebx-0x6c300]
  if (scaledSpeed === ts_ca_dmgEdge) {                    // [ebx-0x6e778]
    damage = ts_ca_dmgBase;                                // [ebx-0x6e7e8]
  } else if (scaledSpeed < ts_ca_dmgMaxCap) {             // [ebx-0x6ecd0]
    damage = ts_ca_dmgAlt;                                 // [ebx-0x6f06c]
  } else {
    damage = scaledSpeed;
  }

  // ── Kung-Fu perk: double the damage in the FPU (transient) ──────────────
  // Note: the doubling is done in FPU st(0) only; the memory copy of
  // `damage` (used later for UpdateMeleeBar) is *not* updated.
  if (KungFu(player) !== 0) {
    damage += damage;  // fadd st, st(0)
  }

  // ── Reset a player-side cooldown field ──────────────────────────────────
  player.m_flCloseAttackCooldown = 0;                     // [player+0x7a8]

  // ── Build the attack trace vectors ──────────────────────────────────────
  // vecSrc = eye position (the attack origin).
  const vecSrc: Vector = { x: eyePos.x, y: eyePos.y, z: eyePos.z };

  // v_forward (unit vector) is set by UTIL_MakeVectors into gpGlobals.
  const forward = gpGlobals.v_forward;

  // distance is the multiplier for the trace reach.
  const distance = ts_ca_traceDist;                       // [ebx-0x6f068]

  // vecEnd = eye position + v_forward * distance (the attack end point).
  const vecEnd: Vector = {
    x: eyePos.x + forward.x * distance,
    y: eyePos.y + forward.y * distance,
    z: eyePos.z + forward.z * distance,
  };

  // ── Dispatch the attack ──────────────────────────────────────────────────
  // The 10 dwords of args (1 player + 9 in cdecl) decode as:
  //   player.CloseCombatAttack(vecSrc, vecEnd, vecForward,
  //                            count=3, damage, soundFlags=-1,
  //                            throwSound=true, silent=false, throw=true)
  // TODO(asm-ambiguous): exact parameter names — TS source will clarify.
  const dispatched = player.CloseCombatAttack(
    vecSrc,
    vecEnd,
    forward,
    3,
    damage,
    -1,
    true,
    false,
    true,
  );
  if (dispatched === 0) return 0;

  // ── Pick an animation id by current weapon type ─────────────────────────
  // Calls [ebx+0x1aa8].vtable[0x168/4] with args (2, 0); returns weapon-type int.
  // Switch: 0 → 10, 1 → 14, 2 → 13, other → 10.
  const weaponType = GetCurrentWeaponType(2, 0);
  let animId: number;
  if (weaponType === 1) {
    animId = 14;   // 0x0e
  } else if (weaponType === 2) {
    animId = 13;   // 0x0d
  } else {
    animId = 10;   // 0x0a
  }

  // ── Set next-stunt cooldown to 0.7s ─────────────────────────────────────
  this.m_flNextStunt = 0.7;                                // 0x3f333333

  // ── Play the animation ──────────────────────────────────────────────────
  // [player+0x28c] is the CTSAnimation sub-object embedded in CBasePlayer.
  CTSAnimation_Animate(
    player.m_Animation,
    player,
    animId,
  );

  // ── Update the weapon-time-based cooldown if it has just expired ────────
  // [player+0x12c] is the player's m_flNextAttack.
  // If it currently matches UTIL_WeaponTimeBase() (i.e. it was unset/just
  // expired), advance it by ts_ca_atkDelay.
  const weaponTime = UTIL_WeaponTimeBase();
  if (weaponTime === player.m_flNextAttack) {
    player.m_flNextAttack = weaponTime + ts_ca_atkDelay;   // [ebx-0x6df04]
  }

  // ── Play the hit sound ──────────────────────────────────────────────────
  // pev+0x208 is pContainingEntity (edict*).
  const edict = player.pev.pContainingEntity;
  // Engine channel index: [ebx+0x1aa8].vtable[0x168/4] called with (0, 0x1f).
  const channelBase = GetCurrentSoundChannel(0, 0x1f);
  const channel = channelBase + 0x5f;
  // The demangled signature is EMIT_SOUND_DYN(edict*, int, const char*, float,
  // float, int, int, float). The 7 dwords we push (after stdcall-style
  // callee cleanup of 8 bytes) carry the args in reverse-cdecl order:
  //   edict, 0x4, soundName, 1.0, 0.8, 0, channel.
  // TODO(asm-ambiguous): which float is volume vs attenuation — see HL SDK EMIT_SOUND_DYN.
  EMIT_SOUND_DYN(
    edict,
    channel,
    ts_ca_soundName,                                       // [ebx-0x6c344]
    1.0,
    0.8,
    0,
    0x4,
  );

  // ── Update the melee UI bar ──────────────────────────────────────────────
  // The fld at 8c98d reads from [P+0x18], which holds the *un-doubled* damage
  // (the doubling lived only in the FPU register and was consumed by
  // CloseCombatAttack). Multiplied by ts_ca_barFactor.
  UpdateMeleeBar(
    player,
    damage * ts_ca_barFactor,                              // [ebx-0x6deec]
  );

  return 1;
}
```
