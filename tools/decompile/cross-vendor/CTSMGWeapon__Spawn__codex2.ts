/**
 * CTSMGWeapon::Spawn — initializes the MG weapon entity by writing its
 * default-ammo (32) and max-clip (100) fields, then delegating to the
 * parent CTSGroundWeapon::Spawn.
 *
 * @param this  The CTSMGWeapon entity instance (this in the original C++)
 * @returns     void
 */

// Isolation stubs — full definitions arrive in D.4 (class reconstruction).
type CTSMGWeapon = any;
declare function Spawn__15CTSGroundWeapon(this: CTSMGWeapon): void;

export function Spawn(this: CTSMGWeapon): void {
  // TODO(asm-ambiguous): offsets 0xa4 / 0xa8 inferred as `m_iDefaultAmmo`
  //   and `m_iMaxClip` based on the constant values (32 / 100) and the
  //   GoldSrc CBasePlayerWeapon layout. Value100 is unusually large for
  //   a clip — could alternatively be `m_iMaxCarry`. Verify against the
  //   TS headers / class layout once D.4 reconstructs CTSMGWeapon.
  this.m_iDefaultAmmo = 0x20; // 32
  this.m_iMaxClip = 0x64;     // 100

  // Delegate to parent CTSGroundWeapon::Spawn.
  Spawn__15CTSGroundWeapon(this);
}
