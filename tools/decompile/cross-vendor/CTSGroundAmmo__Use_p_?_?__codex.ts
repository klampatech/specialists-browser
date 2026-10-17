```typescript
/**
 * CTSGroundAmmo::Use — no-op override.
 *
 * The disassembly is a bare 1-byte `ret`, meaning this override deliberately
 * does nothing. Ground ammo is meant to be picked up via the Touch path
 * (`CTouchTrigger`/player contact), not via the generic `CBaseEntity::Use`
 * interaction, so the entity ignores USE_TYPE callbacks.
 *
 * @param this    The CTSGroundAmmo entity instance
 * @param pActivator  Entity that triggered the use (ignored)
 * @param useType     USE_TYPE classification (ignored)
 * @param value       Float value passed by the user (ignored)
 * @returns           void
 */
export function Use(
  this: CTSGroundAmmo,
  _pActivator: CBaseEntity,
  _useType: USE_TYPE,
  _value: number,
): void {
  // Intentionally empty: ground ammo pickups do not respond to Use.
}
```
