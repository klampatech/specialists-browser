```typescript
/**
 * CTSKatanaWeapon::Spawn — stamps the katana weapon ID and chains
 * to CTSGroundWeapon::Spawn for base entity initialization.
 *
 * @param this  The CTSKatanaWeapon entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSKatanaWeapon): void {
  // m_iId lives at offset 0xa4 in the CBasePlayerItem chain; 0x22
  // is the katana-specific weapon identifier used by TS.
  this.m_iId = 0x22;

  // Chain to CTSGroundWeapon::Spawn for base engine-driven setup.
  CTSGroundWeapon.Spawn(this);
}
```
