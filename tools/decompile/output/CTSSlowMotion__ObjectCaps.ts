/**
 * CTSSlowMotion::ObjectCaps — returns 0 (FCAP_NONE).
 *
 * Overrides the parent class's default (FCAP_ACROSS_TRANSITION) to opt
 * this entity out of the engine's automatic save/restore capability.
 * Persistence for this class still flows through its explicit
 * Save/Restore/KeyValue overloads (see class siblings), not through
 * ObjectCaps-driven transitions.
 *
 * Server-side only — clients never query ObjectCaps.
 *
 * @param this  The CTSSlowMotion entity instance (unused here)
 * @returns     0 (FCAP_NONE)
 */
export function ObjectCaps(this: any): number {
  return 0;
}
