// Stubs — replace with proper imports in the real file.
declare const gpGlobals: any;
declare const UTIL_MakeVectors: (v: any) => void;
declare const UTIL_WeaponTimeBase: () => number;
declare const KungFu: (p: any) => number;
declare const CloseCombatAttack: (...args: any[]) => number;
declare const Animate_Player: (anim: any, player: any, id: number) => void;
declare const EMIT_SOUND_DYN: (...args: any[]) => void;
declare const UpdateMeleeBar: (player: any, dmg: number) => void;
declare const ts_ca_dmgScale: number;
declare const ts_ca_dmgBase: number;
declare const ts_ca_dmgAlt: number;
declare const ts_ca_dmgEdge: number;
declare const ts_ca_dmgCap: number;
declare const ts_ca_traceDist: number;
declare const ts_ca_atkDelay: number;
declare const ts_ca_soundName: string;
declare const ts_ca_barFactor: number;
declare const currentTime: number;

interface Vector { x: number; y: number; z: number; }

/**
 * CTSStunt::CloseAttack — execute a close-quarters (melee) attack.
 * Demangled: CTSStunt::CloseAttack()
 * Returns 1 on dispatch, 0 on any gate failure.
 */
export function CloseAttack(this: any): number {
  // [this+0x40] is m_pPlayer (pointer to CBasePlayer).
  const player = this.m_pPlayer;

  // Gate 1: m_flNextAttack cooldown ([this+0x4])
  if (currentTime < this.m_flNextAttack) return 0;

  // Gate 2: player flag bits at +0x250 (mask0x30c30)
  if ((player.m_fFlags & 0x30c30) !== 0) return 0;

  // Gate 3: byte flag at +0x1a5 (bit 0x40)
  if ((player.m_afSomeFlag & 0x40) !== 0) return 0;

  // Gate 4: m_flNextStunt cooldown ([this+0x8])
  if (currentTime < this.m_flNextStunt) return 0;

  // Gate 5: active weapon is knife-type (iId 0x10) with no ammo
  const activeItem = player.m_pActiveItem;
  if (activeItem !== null
      && activeItem.m_iId === 0x10
      && activeItem.m_iAmmo1 === 0) {
    return 0;
  }

  // UTIL_MakeVectors from m_vecViewAngles (+0x74)
  UTIL_MakeVectors(player.m_vecViewAngles);

  // vtable[0x5a] (GetEyePosition) via vtable at +0x60
  const eyePos: Vector = { x: 0, y: 0, z: 0 };
  player.GetEyePosition(eyePos);

  // Compute |velocity| from pev->velocity (player+0x20).
  // The assembly recomputes |v| several times — preserve that pattern
  // rather than collapsing to one sqrt, because the cvar compares happen
  // against freshly-computed values.
  const v = player.pev.velocity;
  const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

  // Damage formula — assembly branches:
  //   if (speed*scale > edge):
  //     recompute scaledSpeed
  //     if (scaledSpeed > edge): damage = base
  //     else:                   damage = scaledSpeed
  //   else:
  //     if (speed*scale < cap):  damage = alt
  //     else:                    damage = scaledSpeed (via the same recompute+recompare path)
  //
  // Implementation note: the assembly's `fcomp`/`test ah,0x41`/`je` is
  // strict greater-than (FP), not ===.
  const scaledSpeed = speed * ts_ca_dmgScale;
  let damage: number;
  if (scaledSpeed > ts_ca_dmgEdge) {
    // Recompute (matches8c711-8c740's second |v| computation).
    const speed2 = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    const scaledSpeed2 = speed2 * ts_ca_dmgScale;
    damage = (scaledSpeed2 > ts_ca_dmgEdge) ? ts_ca_dmgBase : scaledSpeed2;
  } else if (scaledSpeed < ts_ca_dmgCap) {
    damage = ts_ca_dmgAlt;
  } else {
    damage = scaledSpeed;
  }

  // Kung-Fu: double damage — but ONLY in the FPU register, not in memory.
  // The un-doubled memory copy at [esp+0x1c] is reused later for the  // UpdateMeleeBar call.
  const baseDamageForBar = damage; // capture pre-double for UpdateMeleeBar
  if (KungFu(player) !== 0) {
    damage = damage + damage;
  }

  player.m_flCloseAttackCooldown = 0; // [player+0x7a8]

  // Build trace vectors.
  const vecSrc: Vector = { x: eyePos.x, y: eyePos.y, z: eyePos.z };
  const forward = gpGlobals.v_forward;
  const distance = ts_ca_traceDist;
  const vecEnd: Vector = {
    x: eyePos.x + forward.x * distance,
    y: eyePos.y + forward.y * distance,
    z: eyePos.z + forward.z * distance,
  };

  // Dispatch. Arg mapping reconstructed from cdecl pushes at 0x8c890–0x8c8b6;
  // resolve exact names against HLSDK CBasePlayer::CloseCombatAttack.
  const dispatched = player.CloseCombatAttack(
    vecSrc, vecEnd, forward,
    3,           // count
    damage,      // FPU-doubled damage
    -1,          // 0xffffffff
    false,       // 0x1 pushed before pushw 0
    true,        // 0x1
    true,        // 0x1
  );
  if (dispatched === 0) return 0;

  // Pick animation id by current weapon type — switch at 0x8c8df–0x8c8f8.
  // vtable call via [ebx+0x1aa8].vtable[0x168/4] with args (2, 0).
  const weaponType = player.GetCurrentWeaponType(2, 0);
  let animId: number;
  if (weaponType === 1) animId = 14;
  else if (weaponType === 2) animId = 13;
  else animId = 10;

  this.m_flNextStunt = 0.7; // 0x3f333333

  Animate_Player(player.m_Animation, player, animId);

  // Update m_flNextAttack only if it currently equals UTIL_WeaponTimeBase().
  // Assembly calls UTIL_WeaponTimeBase() twice — keep both for fidelity.
  const weaponTime1 = UTIL_WeaponTimeBase();
  if (weaponTime1 === player.m_flNextAttack) {
    const weaponTime2 = UTIL_WeaponTimeBase();
    player.m_flNextAttack = weaponTime2 + ts_ca_atkDelay;
  }

  // Play hit sound. Channel index from vtable[0x5a] call with (0, 0x1f),
  // then +0x5f added. The 7 push slots + 8-byte cleanup map to:
  //   (edict, channel, sound, volume, attenuation, flags, pitch?)
  // TODO: confirm exact arg order against HLSDK EMIT_SOUND_DYN.
  const edict = player.pev.pContainingEntity;
  const channelBase = player.GetCurrentSoundChannel(0, 0x1f);
  EMIT_SOUND_DYN(
    edict,
    channelBase + 0x5f,
    ts_ca_soundName,
    1.0,
    0.8,
    0,
    0x4,
  );

  // UpdateMeleeBar uses the UN-DOUBLED damage (load from [esp+0x1c] which
  // was not updated by fadd st,st(0)).
  UpdateMeleeBar(player, baseDamageForBar * ts_ca_barFactor);

  return 1;
}
