```typescript
/**
 * CTSTimer::Use — entity-use callback. Forwards to ToggleTimer().
 *
 * Triggered when the engine "uses" this timer entity (e.g. a player
 * pressing +use on it). CTSTimer doesn't care about the activator,
 * USE_TYPE, or the carried float value — it just toggles.
 *
 * @param this        The CTSTimer entity instance (this in C++)
 * @param pActivator  The entity that initiated the use
 * @param useType     USE_TYPE enum (USE_OFF / USE_ON / USE_TOGGLE / ...)
 * @param value       Float value carried with the use event (unused)
 * @returns           void
 */
export function Use(
  this: CTSTimer,
  pActivator: CBaseEntity,
  useType: USE_TYPE,
  value: number,
): void {
  this.ToggleTimer();
}
```
