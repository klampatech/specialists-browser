```typescript
/**
 * CTSMapGlobals::KeyValue — stub key/value handler. Doesn't interpret
 * any keys; reports every key/value pair as unhandled by clearing
 * pkvd.fHandled to 0.
 *
 * @param this  The CTSMapGlobals entity instance (this in the original C++)
 * @param pkvd  Pointer to the engine's KeyValueData_s descriptor
 *              (szClassName, szKeyName, szValue, fHandled).
 *              On return, the engine inspects pkvd.fHandled: 0 means
 *              the entity didn't consume this pair.
 * @returns     void
 */
export function KeyValue(this: CTSMapGlobals, pkvd: /* TODO: KeyValueData_s */ any): void {
  // Base class dispatch is intentionally skipped: the assembly is just
  // `mov [eax+0xc], 0` with no call to CBaseEntity::KeyValue. So we
  // leave fHandled at 0 and let the engine move on.
  pkvd.fHandled = 0;
}
```
