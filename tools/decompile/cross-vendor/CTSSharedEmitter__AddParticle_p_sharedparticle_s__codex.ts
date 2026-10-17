```typescript
/**
 * CTSSharedEmitter::AddParticle — register a particle into the emitter's slot table.
 *
 * Linear-scans the 512-entry sharedparticle_s* table at this+0x800 for the
 * first null slot. Stores the particle pointer in that slot, initializes
 * three particle-header fields, and returns the slot index. Returns -1 if
 * particle is null or no free slot exists.
 *
 * @param this      The CTSSharedEmitter instance
 * @param particle  Particle to register; null returns -1
 * @returns         Slot index 0..0x1ff on success; -1 if particle is null
 *                  or the slot table is full.
 */
export function AddParticle(
  this: CTSSharedEmitter,
  particle: sharedparticle_s | null,
): number {
  // The slot table is a 512-entry pointer array at this+0x800.
  // (The asm inlines ecx=0x800 and eax=this+0x800; the unrolled loop  // checks 8 slots per iteration and bounds-checks at i==0x1ff.)
  const NUM_SLOTS = 0x200;

  if (particle === null) {
    return -1;
  }

  // Linear scan for the first free (null) slot.
  let slot = 0;
  for (; slot < NUM_SLOTS; slot++) {
    if (this.particles[slot] === null) {
      break;
    }
  }

  if (slot >= NUM_SLOTS) {
    return -1; // table full
  }

  // Insert the particle into the free slot and initialize its header.
  // Field offsets come straight from the asm at e819c..e81aa.
  this.particles[slot] = particle;
  particle.inUse = 1;            // offset 0x4, byte  — slot-taken flag
  particle.unknown_dword_8 = 0;  // offset 0x8, dword — TODO(asm-ambiguous): purpose unclear
  particle.slotIndex = slot;     // offset 0x0, dword — back-pointer to slot

  return slot;
}
```
