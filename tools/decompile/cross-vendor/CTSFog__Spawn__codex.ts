```typescript
/**
 * CTSFog::Spawn — Spawn handler that immediately removes the CTSFog entity
 * itself. CTSFog is a self-consuming config entity; any fog setup is
 * delivered elsewhere (e.g. a KeyValue handler or static initializer) before
 * Spawn runs.
 *
 * @param this  The CTSFog entity instance (this in the original C++)
 * @returns     void
 */
export function Spawn(this: CTSFog): void {
  // The compiler emits the PIC/GOT base setup at function entry even though
  // nothing in the body reads [ebx+...]; UTIL_Remove is reached through the
  // PLT and resolves its own GOT slot, so the base is effectively unused.
  UTIL_Remove(this);
}
```
