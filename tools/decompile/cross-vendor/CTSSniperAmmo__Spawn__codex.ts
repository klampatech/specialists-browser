```typescript
/**
 * CTSSniperAmmo::Spawn — Spawns a sniper-rifle ammo pickup entity.
 *
 * Forwards to the parent CTSGroundAmmo::Spawn() to set up the standard
 * ground-ammo properties (model, pickup bounds, sound), then sets the
 * two per-pickup give amounts by halving the cached ammo-info "max"
 * field (struct +0xc):
 *   - ammo id 0x8  (primary sniper)   → this[ +0x88 ]
 *   - ammo id 0xd  (secondary sniper) → this[ +0x9c ]
 *
 * Halving the max carry is the classic TS pattern for ground ammo
 * pickups: a player must grab multiple packs to fully refill.
 *
 * @param this  The CTSSniperAmmo entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSSniperAmmo): void {
  // Parent class: CTSGroundAmmo::Spawn() — handles model, sounds, bounds.
  CTSGroundAmmo.Spawn(this);

  // Primary sniper ammo (id 8): give half the max carry per pickup.
  const primary = get_ammo_info(8);
  // The shr/add/sar sequence is the MSVC "signed divide by 2 with
  // round-toward-zero" trick; Math.trunc(x / 2) reproduces it for
  // the (positive) max-carry values used by TS ammo info.
  this.primaryGive = Math.trunc(primary.maxCarry / 2);
  // TODO(asm-ambiguous): confirm offset 0x88 in CTSSniperAmmo maps to
  // the primary-ammo give count vs. some other related field.

  // Secondary sniper ammo (id 0xd): give half the max carry per pickup.
  const secondary = get_ammo_info(0xd);
  this.secondaryGive = Math.trunc(secondary.maxCarry / 2);
  // TODO(asm-ambiguous): confirm offset 0x9c in CTSSniperAmmo maps to
  // the secondary-ammo give count vs. some other related field.
}
```
