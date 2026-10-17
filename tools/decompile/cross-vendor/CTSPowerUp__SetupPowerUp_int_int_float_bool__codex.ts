```typescript
/**
 * CTSPowerUp::SetupPowerUp — configure a CTSPowerUp entity with a powerup
 * type, charge count, expiration duration, and respawn behavior.
 *
 * Resolves the requested powerup type (random pick or direct bits), maps the
 * resulting bit pattern into a concrete powerup type ID stored on the parent
 * entity, computes the final charge count (override or scaled), and stamps
 * the entity with the expire time, max value, and respawn flag.
 *
 * @param this        The CTSPowerUp entity instance.
 * @param powerupType int — control word for selecting the powerup type:
 *                           - > 0 with bit 8 (& 0x100) AND a flag on
 *                             g_pGameRules set → forced random pick
 *                           - > 0 with bit 7 of the low byte set
 *                             → forced random pick
 *                           - > 0 otherwise → used directly as the
 *                             powerup type bits
 *                           - <= 0 → random pick using this entity's own
 *                                    category mask (mask 0x1ff fallback)
 * @param count       int — if > 0, override the count; else scale the
 *                          switch-assigned count by m_flCountMultiplier.
 * @param duration    float — seconds until expiration (added to
 *                            gpGlobals->time).
 * @param respawn     bool — stored in m_bRespawn.
 * @returns void
 */
export function SetupPowerUp(
  this: any, // CTSPowerUp
  powerupType: number,
  count: number,
  duration: number,
  respawn: boolean,
): void {
  // 1. Reset count; the switch below (or the explicit count arg) will set it.
  this.m_iCount = 0;

  // TODO(asm-ambiguous): [ebx+0x14f0] is a GOT entry pointing to
  // g_pGameRules (a CTSGameRules singleton). GetRandomPowerup takes
  // (CTSGameRules* gameRules, int categoryMask) and returns the chosen
  // powerup type bits (or 0 if no match).
  const gameRules: any = /* g_pGameRules */;

  // 2. Resolve the powerup type bits.
  if (powerupType > 0) {
    // TODO(asm-ambiguous): [gameRules+0x5885] is a flag byte whose
    // purpose is unclear (likely an "override" or admin toggle). When
    // set AND powerupType has bit 8 (& 0x100), it forces a random pick.
    const overrideFlag: boolean = /* gameRules.field_0x5885 */ !== 0;

    if (overrideFlag && (powerupType & 0x100) !== 0) {
      this.m_iPowerupBits = GetRandomPowerup(gameRules, 0x1ff);
    } else if ((powerupType & 0x80) !== 0) {
      // TODO(asm-ambiguous): the assembly uses `test al, al; jns` —
      // i.e. the SIGN BIT OF THE LOW BYTE of powerupType, not the full
      // int. When powerupType > 0, the only way `al & 0x80` is set is
      // if the low byte is 0x80..0xFF (e.g. powerupType = 0x80, 0x180,
      // 0x280, ...). The original C likely did
      // `(signed char)powerupType < 0` or checked a sub-byte range
      // explicitly. Preserved as-is from the asm.
      this.m_iPowerupBits = GetRandomPowerup(gameRules, 0x1ff);
    } else {
      // Use the bits directly as the powerup type mask.
      this.m_iPowerupBits = powerupType;
    }
    this.m_bIsRandom = false;
  } else {
    // powerupType <= 0: random pick based on this entity's own
    // category mask, falling back to "any powerup" if the masked roll
    // returned 0.
    // TODO(asm-ambiguous): [this->pev+0x1a0] is the entity-specific
    // category mask controlling which powerup types are valid here.
    const categoryMask: number = this.pev.field_0x1a0;
    let picked = GetRandomPowerup(gameRules, categoryMask);
    if (picked === 0) {
      picked = GetRandomPowerup(gameRules, 0x1ff);
    }
    this.m_iPowerupBits = picked;
    this.m_bIsRandom = true;
  }

  // 3. Translate the bit pattern into a concrete powerup type ID stored
  //    on the parent entity, and assign the default count for that type.
  // TODO(asm-ambiguous): [this+0] is the parent pointer — likely
  // this->pev (entvars_t*) in the GoldSrc HL1 model. The field at
  // pev+0x114 receives the resolved powerup type ID; in vanilla HL1
  // entvars_t that offset is fuser2, but TS may use a different
  // layout / iuser field.
  const parent: any = this.pev;
  const bits: number = this.m_iPowerupBits;

  // TODO(asm-ambiguous): the bit-to-type-id mapping is hand-coded and
  // presumably comes from a TS-internal powerup enum. Without the
  // header, the names of each type ID are unknown — they are written
  // here as raw integers to preserve behavior. Some branches also set
  // a default count; those that don't leave m_iCount to be resolved by
  // the override / scale path below.
  if      (bits & 0x01) { parent.powerupTypeId = 4; this.m_iCount = 3; }
  else if (bits & 0x02) { parent.powerupTypeId = 2; this.m_iCount = 3; }
  else if (bits & 0x04) { parent.powerupTypeId = 0; }
  else if (bits & 0x08) { parent.powerupTypeId = 9; this.m_iCount = 2; }
  else if (bits & 0x10) { parent.powerupTypeId = 1; this.m_iCount = 3; }
  else if (bits & 0x20) { parent.powerupTypeId = 5; }
  else if (bits & 0x40) { parent.powerupTypeId = 6; }
  else if (bits & 0x80) { parent.powerupTypeId = 7; }
  else if ((bits >>> 8) & 0x01) { parent.powerupTypeId = 8; }
  // (Other bits of the high byte are ignored.)

  // 4. Resolve the final count.
  if (count > 0) {
    this.m_iCount = count;
  } else {
    // count <= 0: scale the switch-assigned count by the multiplier,
    // truncated to int. The asm uses explicit FPU round-toward-zero
    // mode via fnstcw/fldcw before fistp — equivalent to Math.trunc.
    this.m_iCount = Math.trunc(this.m_iCount * this.m_flCountMultiplier);
  }

  // 5. Stamp expiration time, max value, and respawn flag.
  // TODO(asm-ambiguous): [ebx+0x1600] = g_pGlobals (a globalvars_t**);
  // gpGlobals->time is the current server time as a float. The value
  // 0x42c80000 is the IEEE-754 bit pattern for 100.0f.
  const gpGlobals: any = /* g_pGlobals */;
  this.m_flExpireTime = gpGlobals.time + duration;
  this.m_flMaxValue = 100.0;
  this.m_bRespawn = respawn;
}
```
