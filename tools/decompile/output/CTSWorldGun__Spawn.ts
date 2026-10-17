/**
 * CTSWorldGun::Spawn — initialize a dropped-weapon entity.
 *
 * Order of operations (per disassembly at 0x00090954, 433 B):
 *   1. parent::Spawn (CTSPhysicObject)
 *   2. virtual call on peer object at [this+0x60] vtable[10] — likely
 *      the player owner's "worldgun spawned" hook (TODO).
 *   3. pfnSetModel(edict, weaponInfo.vmodelName)
 *   4. pev->iuser3, iuser4, fuser4, fuser5
 *   5. UTIL_SetOrigin(pev, pev.origin)
 *   6. UTIL_SetSize(pev, mins, maxs) with mins = maxs = single const
 *   7. m_flFallTime = now + (MP5 ? cv_mp5 : clamp(cv_fall, min, max))
 *   8. m_vecVelocity = (sentinel, cv_velY, sentinel)
 *      m_vecAngularVelocity.x = cv_avelX
 *   9. pev->animtime = now + cv_animtime
 *  10. pev+0x250 = 0; pev+0x250 |= 0x2  (TS-specific pev field, NOT
 *      standard pev.flags — TODO: identify the real field name)
 *  11. m_bActive = 1
 *  12. m_flNextSoundTime = now + cv_soundDelay
 *  13. m_iSoundChannel = 0
 *
 * @param this  CTSWorldGun* (the "this" of the original C++ method)
 * @returns     void
 */
export function Spawn(this: any): void {
  // 1. Parent spawn.
  CTSPhysicObject.Spawn(this);

  // 2. Virtual call on the peer object at this+0x60.
  //    Disassembly:  mov eax, [ebp+0x60]
  //                  mov [esp], ebp           ; push this
  //                  call [eax+0x28]          ; vtable[10]
  //    Almost certainly the CBasePlayer owner — name it TODO until
  //    we identify the vtable slot.
  // TODO(asm-ambiguous): this->m_pOwner->vtable[10](this). What does
  // it do? Probably notifies the owner that this worldgun has spawned.
  this.m_pOwner_vtable_0x28?.(this);

  // 3. pfnSetModel with the weapon's view model string.
  const weaponInfo = get_weapon_info(this.m_iWeapon);  // [this+0x88]
  const vmodelName = weaponInfo.vmodelName;            // +0x1f2
  engineFuncs.pfnSetModel(this.pev.edict, vmodelName);  // [esi+0x8]

  // 4. Render / user fields.
  this.pev.iuser3 = 0xa; // pev+0x108
  this.pev.iuser4 = 0x2;       // pev+0x10c
  this.pev.fuser4 = 0.7;       // pev+0x11c  (0x3f333333)
  this.pev.fuser5 = 0.8;       // pev+0x120  (0x3f4ccccd)

  // 5. Sync origin.
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // 6. Bounds. Disassembly builds mins and maxs on the stack from a
  //    single GOT-relative float constant at [ebx-0x6f408]; mins =
  //    maxs = that constant (point-sized box).
  // TODO(asm-ambiguous): the float constant value isn't known without
  //    resolving the GOT-relative offset. Pull it from a cvar or
  //    lookup the data section.
  const boxSize: number = /* TODO: resolve [ebx-0x6f408] */ 0;
  const bounds = { x: boxSize, y: boxSize, z: boxSize };
  UTIL_SetSize(this.pev, bounds, bounds);

  // 7. Fall time.
  if (this.m_iWeapon === 0x1d /* MP5 */) {
    // [ebx-0x6e810] direct — could be a const, not a cvar.
    this.m_flFallTime = gpGlobals.time + cv_mp5FallDelay.value;
  } else {
    // [ebx+0x16a4]+0xc = cvar.value, clamped by [ebx-0x6d368] (min)
    // and [ebx-0x6e818] (max).
    let t = cv_worldgunFallDelay.value;
    if (t < cv_worldgunFallMin.value) t = cv_worldgunFallMin.value;
    if (t > cv_worldgunFallMax.value) t = cv_worldgunFallMax.value;
    this.m_flFallTime = gpGlobals.time + t;
  }

  // 8. Velocity / angular velocity. Disassembly writes:
  //      [this+0xc] = 0xffff0000          → m_vecVelocity.x
  //      [this+0x10] = cv_1d2c            → m_vecVelocity.y
  //      [this+0x14] = 0xffff0000          → m_vecVelocity.z
  //      [this+0x18] = cv_1d3c            → m_vecAngularVelocity.x
  // 0xffff0000 is the IEEE-754 signaling-NaN-like sentinel the TS
  //    engine uses to mean "let physics decide" for that component.
  this.m_vecVelocity.x        = 0xffff0000;
  this.m_vecVelocity.y        = cv_velY.value;
  this.m_vecVelocity.z        = 0xffff0000;
  this.m_vecAngularVelocity.x = cv_avelX.value;
  // m_vecAngularVelocity.y / .z left untouched (not in disassembly).

  // 9. Animation timer.
  this.pev.animtime = gpGlobals.time + cv_animtime.value;  // pev+0x104

  // 10. TS-specific pev extension field at +0x250. NOT pev->flags.
  //     Disassembly:  mov [eax+0x250], 0
  //                   or  [eax+0x250], 0x2
  // TODO(asm-ambiguous): identify this field. Could be a TS-added
  //     pev member (e.g., `m_tsFlags`, `m_respawnState`) that lives
  //     past the end of HLSDK's standard entvars_t.
  (this.pev as any).tsExtField_0x250 = 0;
  (this.pev as any).tsExtField_0x250 |= 0x2;

  // 11. Mark active.
  this.m_bActive = 1;        // [this+0xc8] BYTE

  // 12. Sound respawn timer.
  this.m_flNextSoundTime = gpGlobals.time + cv_soundDelay.value;  // [this+0xcc]

  // 13. Sound channel byte.
  this.m_iSoundChannel = 0;  // [this+0xd4] BYTE
}
