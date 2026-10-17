/**
 * CTSWorldGun::Fall — per-physics-tick update for a thrown world gun.
 *
 * Accumulates gravity into the fall-velocity tracker, plays a bounce SFX
 * and grounds the entity when its current speed stays below a per-gun
 * threshold, expires the gun if its slow-motion timer has run out,
 * traces ahead in the velocity direction to detect entity impacts,
 * applies weapon damage scaled by impact speed when an entity is hit,
 * then defers to CTSPhysicObject::WaitThink for pickup/respawn work.
 *
 * NOTE: All external types and globals are typed `any` so this
 * function compiles in isolation. Field names flagged * `// TODO(asm-ambiguous)` are interpretive — see the comments
 * for the disassembly evidence and uncertainty.
 */
export function Fall(this: any): void {
  const pev: any = this.pev;

  // ---- 1. Accumulate gravity into pev->flFallVelocity. ----
  // Disassembly: fld QWORD [ebx-0x6ecd8]; fadd DWORD [eax];
  //              fstp DWORD [edx+0x104].
  // The QWORD load from a global is unusual — may be a double-precision
  // const + DWORD add rather than a plain increment. Interpreted as
  // the standard HL1 gravity accumulator pending D.7 cvar-id work.
  // TODO(asm-ambiguous): confirm [ebx-0x6ecd8] identity (sv_gravity
  //                      loaded as double?) and double-deref target.
  pev.flFallVelocity = pev.flFallVelocity + sv_gravity.value;

  // ---- 2. Bounce: only when the flag byte at +0x1a5 bit 0x2 is set. ----
  // TODO(asm-ambiguous): byte0x1a5 is read with mask 0x2 — its identity
  //                      (a custom TS field, an iuser3 bitfield, etc.)
  //                      is not confirmed. "Bounce flag" is interpretive.
  if ((pev.byte0x1a5 & 0x2) !== 0) {
    const speed = Math.sqrt(
      pev.velocity.x * pev.velocity.x +
      pev.velocity.y * pev.velocity.y +
      pev.velocity.z * pev.velocity.z,
    );
    // Bounce threshold = vtable method * cvar. The method at    // [this+0x60]+0x10 is unknown; it returns a per-gun scalar    // (perhaps a "bounce dampening" or "settle speed" baseline).
    // TODO(asm-ambiguous): [this+0x60] is a vtable-like table;
    //                      [this+0x60]+0x10 is the call target.
    // TODO(asm-ambiguous): identify the cvar at [ebx-0x6de98].
    const bounceThreshold = this.fnTable0x60.method_0x10() * tsBounceScale.value;
    if (speed < bounceThreshold) {
      // EMIT_SOUND_DYN call — disassembly has 8 pushes, but the
      // HLSDK signature is 7 args. Mapping below uses the HLSDK
      // 7-arg shape; the 8th push ([ebx-0x6ec2c], a cvar) is
      // unaccounted for and flagged.
      // TODO(asm-ambiguous): 8 pushes vs HLSDK 7-arg signature.
      //                      Either TS adds an 8th arg or a wrapper
      //                      consumes one push differently.
      // TODO(asm-ambiguous): identify cvars at [ebx-0x6f3fc]
      //                      (volume), [ebx-0x6e7e4] (attenuation),
      //                      [ebx-0x6ec2c] (extra).
      EMIT_SOUND_DYN(
        pev.pEdictField,                 // arg1: entity (+0x208)
        6,                               // arg2: channel
        "weapons/gun_bounce.wav",        // arg3: sample
        tsSndVolume.value,               // arg4: volume cvar ([ebx-0x6f3fc])
        tsSndAtten.value,                // arg5: attenuation cvar ([ebx-0x6e7e4])
        0,                               // arg6: fFlags = 0
100,                             // arg7: pitch = 100
        // arg8: extra cvar ([ebx-0x6ec2c]) — see TODO above
      );
      // Clear two of the three avelocity floats to stop spin on bounce.
      // In this build (velocity@0x20, no globalname): avelocity is at
      // +0x50 (x, y, z). Writes are +0x50 (x) and +0x58 (z); +0x54
      // (y) is deliberately left intact.
      pev.avelocity_x = 0; // +0x50
      pev.avelocity_z = 0;   // +0x58 (note: NOT +0x54 = avelocity.y)
      this.OnGround();
    }
  }

  // ---- 3. Slow-motion expiration. ----
  // fcomp [gpGlobals->flTime]; jae skip — compares this->+0xc4 to flTime.
  // TODO(asm-ambiguous): identify +0xc4 (likely m_flSlowmoTimer, but
  //                      unverified).
  if (this.m_flSlowmoTimer < gpGlobals.flTime) {
    RemoveEntityFromSlowedArray(this);
    UTIL_Remove(this);
    WaitThink_PhysicObject(this);  // CTSPhysicObject::WaitThink(this)
    return;
  }

  // ---- 4. Trace ahead along the velocity vector to detect impacts. ----
  // TODO(asm-ambiguous): identify the cvar at [ebx-0x6f078] (the
  //                      velocity scale used for the trace endpoint).
  const tr: any = UTIL_TraceLine(
    pev.origin,
    VectorAdd(pev.origin, VectorScale(pev.velocity, tsTraceScale.value)),
    IGNORE_MONSTERS,
    pev.pEdictField,
  );
  // fcomp 1.0; jae skip — if the trace completed (flFraction >= 1.0),
  // there was no hit; jump to WaitThink.
  if (tr.flFraction >= 1.0) {
    WaitThink_PhysicObject(this);
    return;
  }

  // ---- 5. Resolve the hit entity. ----
  // Prefer tr.pHit (offset into TraceResult). If null, fall back to
  // an engine lookup at engfuncs+0x114 (probably ENT_FROM_INDEX or
  // similar) with arg 0, then unwrap via [resolved+0x7c].
  // TODO(asm-ambiguous): identify [ebx+0x1aa8] (engfuncs ptr?) and
  //                      the function at +0x114.
  let hitEntity: any = tr.pHit;
  if (hitEntity === null) {
    const resolved = engfuncLookup(0);
    if (resolved !== null) {
      // TODO(asm-ambiguous): [resolved+0x7c] — possibly the
      //                      CBaseEntity* field of an edict wrapper.
      hitEntity = resolved.field0x7c;
    }
  }
  if (hitEntity === null) {
    WaitThink_PhysicObject(this);
    return;
  }

  // Take-damage check at [hitEntity+0x60]+0xc8 — if non-zero, the
  // victim is in a state where it refuses damage.
  if (hitEntity.fnTable0x60.method_0xc8() !== 0) {
    WaitThink_PhysicObject(this);
    return;
  }

  // ---- 6. Compute impact damage = speed × weapon damage byte × cvar. ----
  // get_weapon_info(this->+0x88) returns a struct with damage byte at +0xd0.
  // TODO(asm-ambiguous): identify +0x88 (likely m_iWeaponType, but the
  //                      tsweapon_t arg type for get_weapon_info is unverified).
  const wpnInfo: any = get_weapon_info(this.m_iWeaponType);
  const dmgByte: number = wpnInfo.damageByte0xd0;
  const impactSpeed = Math.sqrt(
    pev.velocity.x * pev.velocity.x +
    pev.velocity.y * pev.velocity.y +
    pev.velocity.z * pev.velocity.z,
  );
  const damage = impactSpeed * dmgByte * tsDmgScale.value;

  // Threshold guard: if damage < [hitEntity->pev+0x160], skip.
  // TODO(asm-ambiguous): meaning of [hitEntity->pev+0x160] — could be
  //                      a per-victim armor value, a damage cap, etc.
  if (damage < hitEntity.pev.field0x160) {
    WaitThink_PhysicObject(this);
    return;
  }

  // ---- 7. Apply damage to the hit entity. ----
  ClearMultiDamage();
  // Position struct (es1 = velocity copy, 12 bytes) and damage-ptr
  // arg (eax = &[stack+0x3c], points to a caller-supplied struct)
  // both pushed; TS collapses them as positional args.
  // TODO(asm-ambiguous): the 5th arg (eax) is a pointer into the
  //                      caller's stack — its identity is unclear.
  hitEntity.method_0x54( // CBaseEntity::TakeDamage (vtable +0x54)
    pev,                                  // arg1: inflictor
    damage,                               // arg2: damage (float)
    VectorScale(pev.velocity, 1.0),       // arg3: direction (esi = velocity copy)
    damagePosStruct,                      // arg4: position ptr (eax)
0x1080,                               // arg5: dmg bits (DMG_NERVEGAS | DMG_ACID)
  );
  ApplyMultiDamage(pev, pev);             // (pevInflictor = pevAttacker = self)

  // ---- 8. Defer to base-class WaitThink for pickup/respawn. ----
  WaitThink_PhysicObject(this);  // CTSPhysicObject::WaitThink(this), via PLT
}

// ---- External symbol stubs (to be removed in D.5 wiring) ----
//
// In a real build these come from engine + TS-mod bindings.
// `any`-typed so the function compiles in isolation per checklist #8.
declare const sv_gravity: any;
declare const gpGlobals: any;
declare const tsBounceScale: any;
declare const tsSndVolume: any;
declare const tsSndAtten: any;
declare const tsTraceScale: any;
declare const tsDmgScale: any;
declare const IGNORE_MONSTERS: any;
declare const damagePosStruct: any;

declare function EMIT_SOUND_DYN(
  ent: any, channel: number, sample: string,
  volume: number, attn: number, fFlags: number, pitch: number,
  extra?: any,  // see TODO above — disassembly has 8 pushes
): void;
declare function RemoveEntityFromSlowedArray(e: any): void;
declare function UTIL_Remove(e: any): void;
declare function UTIL_TraceLine(
  start: any, end: any, igmon: any, ent: any,
): any;
declare function engfuncLookup(arg: any): any;
declare function get_weapon_info(t: any): any;
declare function ClearMultiDamage(): void;
declare function ApplyMultiDamage(inflictor: any, attacker: any): void;
declare function VectorAdd(a: any, b: any): any;
declare function VectorScale(v: any, s: number): any;
declare function WaitThink_PhysicObject(e: any): void;
