```typescript
/**
 * CTSSharedEmitter::AddEmitter — Finds the first free slot in the shared
 * emitter pool, registers `p` there, marks it active, and stores the slot
 * index back into the emitter. Returns the slot index, or -1 if no slot was
 * available (including when `p` is null).
 *
 * @param this  The CTSSharedEmitter instance (owns the slots table)
 * @param p     The emitter to add
 * @returns     The slot index used, or -1 on failure
 */
export function AddEmitter(this: any, p: any): number {
  // TODO: define CTSSharedEmitter and sharedemitter_s types
  // Slots table lives at offset 0 of `this`, 512 entries of 32-bit pointers.
  const SLOTS_COUNT = 0x200;

  if (!p) {
    return -1;
  }

  for (let slot = 0; slot < SLOTS_COUNT; slot++) {
    if (this.slots[slot] === null) {
      // Found a free slot — register the emitter and flag it active.
      this.slots[slot] = p;
      p.slotIndex = slot;   // offset 0x00 of sharedemitter_s (int slot index)
      p.active = 1;         // offset 0x10 of sharedemitter_s (byte flag)
      return slot;
    }
  }

  // Table full.
  return -1;
}
```
