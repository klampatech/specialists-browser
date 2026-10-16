```typescript
/**
 * CTSGun::StandardFire — fires a single bullet using standard accuracy logic.
 *
 * Pipeline:
 *   1. Lazy-init cached vectors (m_vecRecoil, m_vecSpreadBase) and damage scalar.
 *   2. Sample player's current spread cone via virtual call.
 *   3. Branch on weapon type to compute the spread multiplier:
 *        type 0x12 — velocity-gated penalty on m_pPlayer (then fall through).
 *        type 0x20 — cvar-multiplied spread, only if player is slow enough.
 *        else      — raw weapon_info spread, only if weapon_info.flag_0x2c is set.
 *   4. Call ScaleSpread to fold the multiplier into the cached spread vec.
 *   5. Apply crouching/running multiplier to weapon_info.baseSpread.
 *   6. Call ShootBulletsPlayer with damage + spread + several vec refs.
 *   7. Save the recoil vector returned by ShootBulletsPlayer.
 *   8. Optionally call VKickback for view kick (shotgun-like types or hasKickback).
 *   9. Decrement reserve ammo, then clip ammo (unless InfiniteClips); clamp clip >=0.
 *  10. Set m_bIsEmpty flag based on current reserve ammo.
 *  11. Engine dispatch — fire sound/anim event for the shot.
 *  12. Set m_flNextPrimaryAttack = UTIL_WeaponTimeBase() + delay (delay depends on
 *      ammo mode and weapon_info flag_0xc).
 *  13. Set m_flTimeWeaponIdle = UTIL_WeaponTimeBase() + idle_delay (alt cvar if
 *      type 0x24 with empty reserve and no InfiniteClips).
 *
 * @param this  The CTSGun entity instance (this in the original C++)
 * @returns     void
 */

// Module-level statics live in the GOT area; they are shared across all CTSGun
// instances. The TS port maps them to a const namespace so the file compiles in
// isolation. Real definitions come from the full class reconstruction (D.4).
declare const CVars: any;          // TODO: GOT statics from [ebx+0x7ca4..0x7cdc]
declare const EngineGlobals: any;  // TODO: engine singletons ([ebx+0x1600], 0x1888, 0x1aa8)
declare const EngineUtil: any;     // TODO: UTIL_WeaponTimeBase, InfiniteClips

export function StandardFire(this: any /* TODO: replace with CTSGun */): void {
  // === 1. Lazy-init cached state (first-call guards in the GOT) ===
  if (CVars.standardFire_initA === 0) CVars.standardFire_initA = 1;
  if (CVars.standardFire_initB === 0) CVars.standardFire_initB = 1;
  if (CVars.standardFire_initC === 0) {
    // Copy 3 floats from engine global [ebx+0x1888] into m_vecRecoil.
    // TODO(asm-ambiguous): exact engine global meaning unclear
    const initSrc = EngineGlobals.vec_0x1888 as [number, number, number];
    const recoil = CVars.m_vecRecoil as [number, number, number];
    recoil[0] = initSrc[0]; recoil[1] = initSrc[1]; recoil[2] = initSrc[2];
    CVars.standardFire_initC = 1;
  }

  // === 2. Sample player's spread cone via vfunc ===
  // m_pPlayer.field_0x60 is a sub-object vtable; vfunc_0x168 returns Vector3.
  // TODO(asm-ambiguous): exact field/vfunc semantics — likely GetAutoaimVector / cone
  const cone = this.m_pPlayer.someField_0x60.vfunc_0x168() as [number, number, number];
  const spreadCurrent = CVars.m_vecSpreadCurrent as [number, number, number];
  spreadCurrent[0] = cone[0]; spreadCurrent[1] = cone[1]; spreadCurrent[2] = cone[2];

  // === 3. Copy engine base spread vector ===
  // Source: [ebx+0x1600][0]+0x28 (12-byte Vector3 from a global singleton)
  // TODO(asm-ambiguous): engine global offset meaning unclear
  const baseVec = EngineGlobals.vec_0x1600_at_0x28 as [number, number, number];
  const spreadBase = CVars.m_vecSpreadBase as [number, number, number];
  spreadBase[0] = baseVec[0]; spreadBase[1] = baseVec[1]; spreadBase[2] = baseVec[2];

  // === 4. Cache bullet damage from weapon_info ===
  CVars.m_flBulletDamage = this.m_pWeaponInfo.bulletDamage as number;

  // === 5. Weapon-type-specific spread branching ===
  // Type 0x12 always runs the velocity penalty, then falls through to the  // default path. Type 0x20 has its own velocity-gated, cvar-multiplied path.
  const weaponType = this.m_iWeaponType as number;

  if (weaponType === 0x12) {
    const v = this.m_pPlayer.velocity as [number, number, number];
    const speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (speed <= CVars.sv_movespeed_threshold_0x12 /* TODO: cvar name */) {
      this.m_pPlayer.someField_0x778 = 0.3; // 0x3e99999a — TODO: field meaning unclear
    }
    // fall through to default-path check below
  }

  let scaleSpread: { shouldScale: number; spread: number } | null = null;

  if (weaponType === 0x20) {
    const v = this.m_pPlayer.velocity as [number, number, number];
    const speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (speed <= CVars.sv_movespeed_threshold_0x20 /* TODO: cvar name */) {
      const shouldScale =
        ((this.m_pAmmoTracker.flag as number) & 1) &&
        !((this.m_pWeaponInfo.flag_0xe4 as number) & 1) ? 1 : 0;
      scaleSpread = {
        shouldScale,
        spread: (CVars.spread_multiplier_0x20 as number) *
                (this.m_pWeaponInfo.spreadValue as number),
      };
    }
    // else: skip ScaleSpread entirely
  } else if ((this.m_pWeaponInfo.flag_0x2c as number) !== 0) {
    // Default path (covers weaponType == 0x12 and any type != 0x20)
    const shouldScale =
      ((this.m_pAmmoTracker.flag as number) & 1) &&
      !((this.m_pWeaponInfo.flag_0xe4 as number) & 1) ? 1 : 0;
    scaleSpread = {
      shouldScale,
      spread: this.m_pWeaponInfo.spreadValue as number,
    };
  }

  // === 6. Call ScaleSpread to fold the multiplier into the spread vec ===
  if (scaleSpread !== null) {
    // Demangled signature is `ScaleSpread(r ?, float, float, int)` but the asm
    // pushes3 explicit args (+ this). The middle ref arg is unclear.
    // TODO(asm-ambiguous): arg count and mapping may differ from demangling
    this.ScaleSpread(
      CVars.m_flBulletDamage_ref, // &damage (reference)
      0,                          // unknown ref arg
      scaleSpread.spread,
      scaleSpread.shouldScale,
    );
  }

  // === 7. Apply crouching/running multiplier to weapon_info.baseSpread ===
  let finalSpread = this.m_pWeaponInfo.baseSpread as number;
  if (
    ((this.m_pAmmoTracker.flag as number) & 1) &&
    !((this.m_pWeaponInfo.flag_0xe4 as number) & 1)
  ) {
    finalSpread *= CVars.spread_modifier_crouching as number; // TODO: cvar name
  }

  // === 8. Call ShootBulletsPlayer ===
  // Sets up 3 Vector3 refs on stack from cached state, then calls
  // shootBulletsPlayer with damage + spread + weapon_info fields. The 12-byte
  // return is later copied to m_vecRecoil.
  // TODO(asm-ambiguous): exact arg order not derivable without full prototype
  this.m_pPlayer.shootBulletsPlayer({
    returnRecoil: CVars.m_vecRecoil_ref,          // output (12 bytes written)
    damageVec:    CVars.m_flBulletDamage_ref,     // 3 floats all = m_flBulletDamage
    baseSpread:   CVars.m_vecSpreadBase_ref,      // [ebx+0x7cbc]
    currentSpread: CVars.m_vecSpreadCurrent_ref,  // [ebx+0x7cb0]
    finalSpread,
    weaponByte: this.m_pWeaponInfo.weaponByte,    // byte at 0x8
    ammoCount:   this.m_pWeaponInfo.ammoCount,    // dword at 0x20
    tracerType:  this.m_pWeaponInfo.tracerType,   // byte at 0x24
    playerField: this.m_pPlayer.field_0x7ec,
  });

  // === 9. m_vecRecoil is already updated via the returnRecoil ref above ===

  // === 10. Optional VKickback for view kick ===
  const isShotgunType =
    (this.m_pWeaponInfo.kickbackMode as number) === 7 ||
    weaponType === 0x1f ||
    weaponType === 0x21;
  if (
    isShotgunType ||
    (this.m_pWeaponInfo.hasKickback as number) !== 0
  ) {
    const playerFlag =
      ((this.m_pAmmoTracker.flag as number) & 1) &&
      !((this.m_pWeaponInfo.flag_0xe4 as number) & 1) ? 1 : 0;
    this.VKickback(
      this.m_pWeaponInfo.kickbackAngle,           // float at 0x30
      this.m_pWeaponInfo.kickbackCount,           // byte at 0x348 (zext to int)
      playerFlag,
      (CVars.m_vecRecoil as [number, number, number])[0],
      (CVars.m_vecRecoil as [number, number, number])[1],
      isShotgunType ? 1 : 0,
    );
  }

  // === 11. Decrement ammo (unless InfiniteClips) ===
  if (!this.m_pPlayer.infiniteClips()) {
    this.m_pAmmoTracker.ammo--;
    const clipIndex = this.m_pWeaponInfo.clipIndex as number;
    if (clipIndex !== -1) {
      // m_rgAmmo entries have stride 56 (not 4 like standard HL1).
      // TODO(asm-ambiguous): custom CTS ammo struct layout, offset 0x18 between fields
      this.m_rgAmmo[clipIndex].ammo--;
      this.m_rgAmmo[clipIndex].lastAmmo = this.m_pAmmoTracker.ammo as number;
      if (this.m_rgAmmo[clipIndex].ammo < 0) {
        this.m_rgAmmo[clipIndex].ammo = 0;
      }
    }
  }

  // === 12. Set m_bIsEmpty flag ===
  CVars.m_bIsEmpty = (this.m_pAmmoTracker.ammo as number) === 0 ? 1 : 0;

  // === 13. Engine dispatch (anim/sound event) ===
  // 12-arg call to engine.vfunc_0x1ec; one arg is m_pPlayer[0][0x208] (likely a
  // function pointer passed through, not invoked here).
  // TODO(asm-ambiguous): exact prototype not derivable from asm alone
  EngineGlobals.dispatchFire(
    1, // bool flag (always 1)
    this.m_pPlayer.vtable_field_0x208,    // m_pPlayer[0][0x208] value
    this.m_usEvent,                       // word event id at this+0x964
    0,                                    // null
    EngineGlobals.vec_0x1888,             // pushed twice (origin/angles?)
    EngineGlobals.vec_0x1888,
    CVars.m_flBulletDamage,               // pushed twice (fparam1, fparam2)
    CVars.m_flBulletDamage,
    weaponType,                           // iparam1
    this.m_pAmmoTracker.ammoType,         // iparam2 (field at 0x10, LSB is flag)
    CVars.m_bIsEmpty,                     // bparam1
    this.m_pPlayer.field_0x7ec,          // bparam2
  );

  // === 14. Compute m_flNextPrimaryAttack delay ===
  let delay: number;
  if ((this.m_pAmmoTracker.mode as number) === 2) {
    delay = (this.m_pAmmoTracker.someField_8 as number) === 1
      ? (CVars.delay_cvar1 as number)    // TODO: cvar name
      : (CVars.delay_cvar2 as number); // TODO: cvar name
  } else if (
    (this.m_pAmmoTracker.mode as number) === 1 &&
    ((this.m_pWeaponInfo.flag_0xc as number) & 1)
  ) {
    delay = 0.1; // 0x3dcccccd
  } else {
    delay = this.m_pWeaponInfo.defaultDelay as number; // at 0x18
  }
  CVars.m_flNextPrimaryAttack_delay = delay;

  // === 15. Set m_flNextPrimaryAttack ===
  this.m_flNextPrimaryAttack =
    EngineUtil.weaponTimeBase() + (CVars.m_flNextPrimaryAttack_delay as number);

  // === 16. Compute and set m_flTimeWeaponIdle ===
  let idleDelay = CVars.idle_delay_default as number; // TODO: cvar name
  if (
    weaponType === 0x24 &&
    (this.m_pAmmoTracker.ammo as number) <= 0 &&
    !this.m_pPlayer.infiniteClips()
  ) {
    idleDelay = CVars.idle_delay_alt as number; // TODO: cvar name
  }
  this.m_flTimeWeaponIdle = EngineUtil.weaponTimeBase() + idleDelay;
}
```
