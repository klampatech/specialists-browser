```typescript
/**
 * CTSSharedEmitter::KillEmitter — clear the emitter slot at the given index,
 * effectively killing (deactivating) the emitter stored there.
 *
 * @param this  The CTSSharedEmitter entity instance
 * @param slot  Index into the emitter slot array to clear
 * @returns     void
 */
export function KillEmitter(this: CTSSharedEmitter, slot: number): void {
  this.emitters[slot] = 0;
}
```
