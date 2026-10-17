/**
 * CTSTimer::Use — entity-use callback. Forwards pActivator to ToggleTimer().
 *
 * Triggered when the engine "uses" this timer entity (e.g. a player
 * pressing +use on it). CTSTimer doesn't use useType or value — it
 * just passes the activator on to ToggleTimer().
 *
 * @param this        The CTSTimer entity instance (this in C++)
 * @param pActivator  The entity that initiated the use (forwarded to ToggleTimer)
 * @param useType     USE_TYPE enum (USE_OFF / USE_ON / USE_TOGGLE / ...) — unused
 * @param value       Float value carried with the use event — unused
 * @returns           void
 */
export function Use(
  this: any,
  pActivator: any,
  useType: any,
  value: number,
): void {
  this.ToggleTimer(pActivator);
}
