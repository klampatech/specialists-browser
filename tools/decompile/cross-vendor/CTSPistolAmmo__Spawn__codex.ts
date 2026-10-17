```typescript
/**
 * CTSPistolAmmo::Spawn — initializes a pistol ammo pickup. Calls
 * the base class CTSGroundAmmo::Spawn, then fills five ammo-count
 * fields with half the default amount of five ammo types the TS
 * pistol can use.
 *
 * @param this  The CTSPistolAmmo entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSPistolAmmo): void {
  // Base class init first.
  CTSGroundAmmo.Spawn.call(this);

  // Pistol ammo distributes half the default amount of each of five
  // ammo types the TS pistol can use. The asm implements floor(x/2)
  // via the "add sign bit, then arith-shift right" trick; for the
  // always-non-negative ammo counts, this collapses to x/2.
  // TODO(asm-ambiguous): ammo index → ammo-type name mapping
  //   (1=9mm, 2=.357, 7/9/0xa = TS pistol alt-mode ammo types).
  // TODO(asm-ambiguous): the ammo_info_t field at +0xc is the
  //   default/cap amount — actual name (m_iDefaultAmount vs
  //   m_iMaxCarry etc.) needs the ammo_info_t layout (D.4).
  // TODO(asm-ambiguous): +0x6c/+0x70/+0x84/+0x8c/+0x90 are five
  //   distinct ammo-count fields on `this`; which maps to which
  //   ammo type depends on the CTSPistolAmmo class layout (D.4).
  this.m_iAmmoCount_1  = (getAmmoInfo(0x1) as any).ammoAmount >> 1;  // +0x6c
  this.m_iAmmoCount_2  = (getAmmoInfo(0x2) as any).ammoAmount >> 1;  // +0x70
  this.m_iAmmoCount_7  = (getAmmoInfo(0x7) as any).ammoAmount >> 1;  // +0x84
  this.m_iAmmoCount_9  = (getAmmoInfo(0x9) as any).ammoAmount >> 1;  // +0x8c
  this.m_iAmmoCount_10 = (getAmmoInfo(0xa) as any).ammoAmount >> 1;  // +0x90
}
```
