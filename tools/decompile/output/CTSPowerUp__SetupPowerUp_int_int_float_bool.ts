```typescript
/**
 * CTSPowerUp::SetupPowerUp — initializes a power-up entity, resolving the
 * type (random or explicit) and configuring its weapon, schedule, and amount.
 *
 * @param this        The CTSPowerUp entity.
 * @param powerupType Power-up selector. Positive values select an explicit
 *                    type (low byte is the type bitmask); values with bit
 *                    0x100 set (when the game rules allow) or bit 0x80 set
 *                    force a random pick from the full pool (filter 0x1ff).
 *                    Non-positive values pick random using the associated
 *                    weapon's filter field (falling back to 0x1ff on miss).
 * @param amount      If > 0, m_iAmount is set directly; otherwise it's
 *                    computed as (int)(m_iAmount * m_flAmountScale).
 * @param delay       Added to gpGlobals->time and stored in m_flStartTime.
 * @param someFlag    Stored as a byte in m_bSomeFlag.
 */
export function SetupPowerUp(
  this: CTSPowerUp,
  powerupType: number,
  amount: number,
  delay: number,
  someFlag: boolean,
): void {
  this.m_iAmount = 0;

  // Step 1: Resolve m_iPowerupType. m_bAutoSelect is set when the caller
  // passed a non-positive powerupType (asking for a default random pick).
  if (powerupType > 0) {
    const gameRules = gpGameRules;
    const forceRandom =
      (gameRules.field_0x5885 !== 0 && (powerupType & 0x100) !== 0) ||
      (powerupType & 0x80) !== 0;
    this.m_iPowerupType = forceRandom
      ? GetRandomPowerup(gameRules, 0x1ff)
      : powerupType;
    this.m_bAutoSelect = 0;
  } else {
    // powerupType <= 0: random pick using the associated weapon's filter.
    const filter = this.m_pWeapon.field_0x1a0; // TODO(asm-ambiguous): field meaning
    let resolved = GetRandomPowerup(gpGameRules, filter);
    if (resolved === 0) {
      resolved = GetRandomPowerup(gpGameRules, 0x1ff);
    }
    this.m_iPowerupType = resolved;
    this.m_bAutoSelect = 1;
  }

  // Step 2: Map the resolved power-up type to a weapon ID and default amount.
  const weaponPtr = this.m_pWeapon; // TODO(asm-ambiguous): which entity this points to
  switch (this.m_iPowerupType) {
    case 0x01: weaponPtr.m_iId = 4; this.m_iAmount = 3; break;
    case 0x02: weaponPtr.m_iId = 2; this.m_iAmount = 3; break;
    case 0x04: weaponPtr.m_iId = 0; break;
    case 0x08: weaponPtr.m_iId = 9; this.m_iAmount = 2; break;
    case 0x10: weaponPtr.m_iId = 1; this.m_iAmount = 3; break;
    case 0x20: weaponPtr.m_iId = 5; break;
    case 0x40: weaponPtr.m_iId = 6; break;
    case 0x80: weaponPtr.m_iId = 7; break;
    case 0x100: weaponPtr.m_iId = 8; break; // 9th type, stored in the second byte of the int.
  }

  // Step 3: Apply explicit amount or scale by per-instance multiplier.
  if (amount > 0) {
    this.m_iAmount = amount;
  } else {
    this.m_iAmount = Math.trunc(this.m_iAmount * this.m_flAmountScale);
  }

  // Step 4: Schedule activation and persist the bool flag.
  this.m_flStartTime = gpGlobals.time + delay;
  this.m_flDuration = 100.0;
  this.m_bSomeFlag = someFlag ? 1 : 0;
}

// ---- External runtime bindings (provided by the engine bindings module). ----

declare const gpGameRules: any;
declare const gpGlobals: { time: number };
declare function GetRandomPowerup(rules: any, filter: number): number;

// TODO(decompile): CTSPowerUp field layout is reconstructed from disassembly;
// some field names are educated guesses.
declare interface CTSPowerUp {
  m_pWeapon: { m_iId: number; field_0x1a0: number };
  m_iPowerupType: number;
  m_iAmount: number;
  m_bAutoSelect: number;
  m_flStartTime: number;
  m_flDuration: number;
  m_flAmountScale: number;
  m_bSomeFlag: number;
}
```
