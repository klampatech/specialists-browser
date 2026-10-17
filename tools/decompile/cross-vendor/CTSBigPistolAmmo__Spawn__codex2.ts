/**
 * CTSBigPistolAmmo::Spawn — Spawns the big pistol ammo pickup.
 *
 * Calls CTSGroundAmmo::Spawn for base setup, then sets two ammo
 * amounts on this entity to half of their default values from
 * the ammo-info table. The two amounts correspond to two ammo
 * slots (5 and 11) — typical of TS "big" pickups that refill
 * multiple calibers in one entity.
 *
 * Field offsets0x7c and 0x94 are TS-specific; the field names
 * below are placeholders pending D.4 class-layout work.
 */

// Stub types so this snippet compiles in isolation.
type CTSBigPistolAmmo = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CTSGroundAmmo: any = (globalThis as any).CTSGroundAmmo
 ?? { Spawn: (/* as */ self: any) => { /* parent stub */ } };
declare function getAmmoInfo(slot: number): any;

export function Spawn(this: CTSBigPistolAmmo): void {
  // Parent: CTSGroundAmmo::Spawn — generic ammo-entity setup
  // (model, bounds, touch fn, etc.).
  CTSGroundAmmo.Spawn(this);

  // Pickup amount for ammo slot 5 = (ammoInfo[5].defaultAmount) / 2.
  // The MSVC signed-divide-by-2 idiom (shr sign-bit, add, sar 1)
  // round-trips to a JS `| 0` truncation-toward-zero.
  const amountA = getAmmoInfo(5)[0xc] as number;
  // TODO(D.4): field at this+0x7c — placeholder name; needs class layout
  this.m_iAmountA_TODO = (amountA / 2) | 0;

  // Pickup amount for ammo slot 11 = (ammoInfo[11].defaultAmount) / 2.
  const amountB = getAmmoInfo(11)[0xc] as number;
  // TODO(D.4): field at this+0x94 — placeholder name; needs class layout
  this.m_iAmountB_TODO = (amountB / 2) | 0;
}
