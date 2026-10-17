// Forward-declared external. Real signature resolved in D.5.
declare function GetRandomPowerup(gameRules: any, categoryMask: number): number;

/**
 * CTSPowerUp::SetupPowerUp — configure a CTSPowerUp entity with a powerup
 * type, charge count, expiration duration, and respawn behavior.
 *
 * @param this        CTSPowerUp entity instance.
 * @param powerupType int — control word for selecting the powerup type:
 *                           - > 0 with g_pGameRules override flag AND
 *                             bit 8 (& 0x100) set → forced random pick
 *                           - > 0 with low-byte bit 7 (& 0x80) set
 *                             → forced random pick
 *                           - > 0 otherwise → used directly as the
 *                             powerup type bits
 *                           - <= 0 → random pick using this entity's own
 *                                    category mask (mask 0x1ff fallback)
 * @param count       int — if > 0, override the count; else scale the
 *                          switch-assigned count by m_flCountMultiplier
 *                          (truncated to int, like the asm's FPU cw trick).
 * @param duration    float — seconds until expiration (added to
 *                            gpGlobals->time).
 * @param respawn     bool — stored in m_bRespawn.
 */
export function SetupPowerUp(
  this: any, // CTSPowerUp
  powerupType: number,
  count: number,
  duration: number,
  respawn: boolean,
): void {
  // 1. Reset the count slot; the switch (or the explicit count arg) sets it.
  this.m_iCount = 0;

  // asm: edx = *(ebx+0x14f0)         // g_pGameRules (CTSGameRules*)
  const gameRules: any = /* g_pGameRules */;

  // 2. Resolve the powerup-type bits.
  if (powerupType > 0) {
    // asm: test byte ptr [edx+0x5885]; je skip
    //      test eax, 0x100;           je skip
    // TODO(asm-ambiguous): [gameRules+0x5885] is an unknown flag byte
    // (likely an "override" / admin toggle). When set AND powerupType has
    // bit 8 set, it forces a random pick.
    const overrideFlag: boolean = /* gameRules.field_0x5885 */ !== 0;
    if (overrideFlag && (powerupType & 0x100) !== 0) {
      this.m_iPowerupBits = GetRandomPowerup(gameRules, 0x1ff);
    } else if ((powerupType & 0x80) !== 0) {
      // asm: test al,al; jns — sign of the LOW BYTE of powerupType.
      // powerupType & 0x80 tests the same bit (bit 7 of low byte ≡ bit 7 of int).
      this.m_iPowerupBits = GetRandomPowerup(gameRules, 0x1ff);
    } else {
      this.m_iPowerupBits = powerupType;
    }
    this.m_bIsRandom = false;
  } else {
    // asm: picked = GetRandomPowerup(g_pGameRules, this->pev+0x1a0)
    //      if (picked == 0) picked = GetRandomPowerup(g_pGameRules, 0x1ff)
    // TODO(asm-ambiguous): [pev+0x1a0] is the entity-specific category mask
    // controlling which powerup types are valid here.
    const categoryMask: number = this.pev.field_0x1a0;
    let picked = GetRandomPowerup(gameRules, categoryMask);
    if (picked === 0) {
      picked = GetRandomPowerup(gameRules, 0x1ff);
    }
    this.m_iPowerupBits = picked;
    this.m_bIsRandom = true;
  }

  // 3. Translate the bit pattern into a concrete powerup-type ID stored on
  //    the parent entvar, and assign the default count for that type.
  // asm: eax = *(esi+0)  // this->pev (entvars_t*)
  // TODO(asm-ambiguous): [pev+0x114] is a TS-specific entvar slot (not the
  // vanilla HL1 fuser2). The bit→ID mapping below is hand-coded and reflects
  // the assembly's 9-way test (lowest set bit wins, count set only on bits
  // 0x01, 0x02, 0x08, 0x10).
  const bits: number = this.m_iPowerupBits;
  if      (bits & 0x001) { this.pev.powerupTypeId = 4; this.m_iCount = 3; }
  else if (bits & 0x002) { this.pev.powerupTypeId = 2; this.m_iCount = 3; }
  else if (bits & 0x004) { this.pev.powerupTypeId = 0;                    }
  else if (bits & 0x008) { this.pev.powerupTypeId = 9; this.m_iCount = 2; }
  else if (bits & 0x010) { this.pev.powerupTypeId = 1; this.m_iCount = 3; }
  else if (bits & 0x020) { this.pev.powerupTypeId = 5;                    }
  else if (bits & 0x040) { this.pev.powerupTypeId = 6;                    }
  else if (bits & 0x080) { this.pev.powerupTypeId = 7;                    }
  else if (bits & 0x100) { this.pev.powerupTypeId = 8;                    }
  // Other bits of the high byte are ignored.

  // 4. Resolve the final count.
  if (count > 0) {
    this.m_iCount = count;
  } else {
    // asm: explicit fldcw / 0xc (truncate) / fistp / fldcw restore — equivalent to Math.trunc.
    this.m_iCount = Math.trunc(this.m_iCount * this.m_flCountMultiplier);
  }

  // 5. Stamp expiration time, max value, and respawn flag.
  // asm: eax = *(*(ebx+0x1600))         // gpGlobals (one indirection
  //                                       //   for the GOT entry, one for
  //                                       //   the actual globalvars_t*)
  //      fadd DWORD PTR [eax]            // gpGlobals->time
  const gpGlobals: any = /* g_pGlobals */;
  this.m_flExpireTime = gpGlobals.time + duration;
  this.m_flMaxValue = 100.0; // 0x42c80000
  this.m_bRespawn = respawn;
}
