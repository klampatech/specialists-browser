/**
 * CTSKnife::Use — handle a player trying to pick up a knife weapon entity.
 *
 * @param this       The CTSKnife entity (the knife pickup in the world)
 * @param pActivator The entity that triggered Use() (typically a CBasePlayer)
 * @param useType    USE_TYPE (unused in this function)
 * @param value      Float value (unused in this function)
 */
export function Use(this: any, pActivator: any, useType: any, value: number): void {
  // [edi+0x90]: byte flag — if nonzero, bail. Probably "picked up" / "inactive".
  if (this.m_bPickedUp) {
    return;
  }

  // [esi+0x60] is treated as pActivator's vtable (at the unusual offset 0x60).
  // `push esi` before each call is the implicit `this` per the GCC Itanium  // ABI on i386 (this is the first stack arg, not in ECX).
  // TODO(asm-ambiguous): exact vtable methods at offsets 0xc8 (slot 50) and
  //   0xb4 (slot 45) — likely player state checks (IsAlive / IsPlayer /
  //   CanPickup / etc.).
  if (!pActivator.vmethod0xC8?.()) return;
  if (!pActivator.vmethod0xB4?.()) return;

  // [esi] is pActivator->pev (first field of CBaseEntity). Byte at [pev+0x118];
  // sign bit set (byte < 0) → bail.
  // TODO(asm-ambiguous): which pev field — possibly button (high byte) or a
  //   TS-specific flag.
  if (pActivator.pev.SomePevFlagAt0x118 < 0) {
    return;
  }

  // [edi+0x91]: byte flag — if nonzero, the player must have the KungFu ability.
  if (this.m_bRequiresKungFu) {
    if (!KungFu(pActivator)) {
      return;
    }
  }

  // [edi+0x88] float vs threshold (***[ebx+0x1600]).
  // FPU: fcomp + test ah,0x41 + jne → cleanup when field >= threshold.
  // TODO(asm-ambiguous): the 3-deref chain — threshold identity is unclear
  //   (gpGlobals.time is a guess, not confirmed). Field name `m_flExpireTime`
  //   is likely wrong given the >= direction — more likely `m_flSpawnTime`
  //   or `m_flRespawnTime`. Add a TODO at the call site too.
  const threshold: number = (gpGlobals as any)?.time;
  if (this.m_flExpireTime >= threshold) {
    this.m_flExpireTime = threshold;
    RemoveEntityFromSlowedArray(this);
    UTIL_Remove(this);
    return;
  }

  // [edi+0xa0] int — weapon type selector.
  let weaponId: number;
  switch (this.m_iWeaponType) {
    case 8:  weaponId = 0x22; break;
    case 6:  weaponId = 0x19; break;
    default: weaponId = 0x23; break;
  }

  // PickUpWeapon(this, weaponId, pWeapon, ammo, bNotify, T4). The demangled
  // signature lists 5 trailing args; the assembly pushes 5 zero values.
  // Passing 5 zeros as a best-effort approximation; exact types unknown.
  // TODO(asm-ambiguous): types of the trailing args.
  const picked: number = pActivator.PickUpWeapon(weaponId, null, 0, false, false, 0);

  // test edx, edx; je → if PickUpWeapon returned 0, bail (don't remove entity).
  if (picked === 0) {
    return;
  }

  // Pickup succeeded — same cleanup as the "expired" branch.
  this.m_flExpireTime = threshold;
  RemoveEntityFromSlowedArray(this);
  UTIL_Remove(this);
}
