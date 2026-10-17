```typescript
/**
 * CTSFlag::Destroy — marks the flag as being removed, deregisters it
 * from the slow-motion entity array, and removes it from the world.
 *
 * @param this  The CTSFlag entity instance (this in the original C++)
 * @returns     void
 */
export function Destroy(this: CTSFlag): void {
  // Mark this entity as being removed (m_fInProcessOfBeingRemoved at
  // offset 0xac on CBaseEntity) so other systems skip / queue cleanup.
  this.m_fInProcessOfBeingRemoved = 1;

  // Detach from the slow-motion entity bookkeeping array.
  RemoveEntityFromSlowedArray(this);

  // Actually remove the entity from the world.
  UTIL_Remove(this);
}
```
