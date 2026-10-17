```typescript
/**
 * CTSShotgunAmmo::Spawn — Initializes a shotgun-shell ammo pickup entity.
 * Forwards to CTSGroundAmmo::Spawn for shared ground-ammo setup, then sets
 * this pickup's ammo count to half the shotgun-shell carry maximum.
 *
 * @param this  The CTSShotgunAmmo entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSShotgunAmmo): void {
  // Base CTSGroundAmmo::Spawn handles default ground-ammo initialization.
  CTSGroundAmmo.spawn(this);

  // Look up the shotgun-shell ammo info (ammo type 3) and set the
  // pickup count to half the carry maximum.
  const info = getAmmoInfo(3);
  this.ammoCount = Math.floor(info.max / 2);
}
```
