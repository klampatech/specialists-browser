```typescript
/**
 * CTSBigPistolAmmo::Spawn — Spawns the big pistol ammo pickup entity.
 * Calls the parent CTSGroundAmmo::Spawn() for base initialization, then
 * sets the pickup amounts for two ammo slots (types 5 and 11) to half
 * of their respective default amounts (read from getAmmoInfo()).
 *
 * @param this  The CTSBigPistolAmmo entity instance
 */
export function Spawn(this: CTSBigPistolAmmo): void {
  // Base-class spawn — generic ammo entity setup (model, bounds, touch, etc.)
  CTSGroundAmmo.Spawn(this);

  // Pickup amount for ammo slot 5: half of its default amount.
  // The assembly uses the MSVC signed-divide-by-2 pattern
  // (shr sign-bit, add for round-toward-zero, sar 1).
  // TODO(asm-ambiguous): purpose of getAmmoInfo()+0xc — likely defaultAmount / maxCarry
  // TODO: offset 0x7c on this — purpose unclear without class layout
  // TODO: getAmmoInfo() not yet declared in TS port
  this.m_iAmountAmmo5 = ((getAmmoInfo as any)(5))[0xc] / 2 | 0;

  // Pickup amount for ammo slot 11: half of its default amount.
  // TODO: offset 0x94 on this — purpose unclear without class layout
  this.m_iAmountAmmo11 = ((getAmmoInfo as any)(11))[0xc] / 2 | 0;
}
```
