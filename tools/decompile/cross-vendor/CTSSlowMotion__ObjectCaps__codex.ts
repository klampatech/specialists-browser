```typescript
/**
 * CTSSlowMotion::ObjectCaps — returns 0 (FCAP_NONE).
 *
 * The entity exposes no engine capabilities: no save/restore transition,
 * no think override, no use-traversal, etc. Server-side only — clients
 * never query ObjectCaps for this class.
 *
 * @param this  The CTSSlowMotion entity instance (this in the original C++)
 * @returns     0 (FCAP_NONE)
 */
export function ObjectCaps(this: CTSSlowMotion): number {
  return 0;
}
```
