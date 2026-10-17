/**
 * CTSSharedEmitter::AddParticle — register a sharedparticle_s into the
 * emitter's 512-slot pointer table at this+0x800.
 *
 * The asm unrolls the scan 8 slots per iteration with a slightly off-by-one
 * esi counter; the TS uses a clean linear scan that does not reproduce that
 * bookkeeping quirk (per the "don't 1:1 translate asm" conversion rule).
 *
 * @param this      The CTSSharedEmitter instance
 * @param particle  Particle to register; null returns -1
 * @returns         Slot index 0..511 on success; -1 if particle is null
 *                  or the slot table is full.
 */
export function AddParticle(
  this: CTSSharedEmitter,
  particle: sharedparticle_s | null,
): number {
  // Slot table is a 512-entry pointer array at this+0x800 (asm lea eax,[ebp+0x800]).
  const NUM_SLOTS = 0x200;

  if (particle === null) {
    return -1; // asm: test edi,edi; jmp to "mov eax,0xffffffff"
  }

  // Linear scan for the first free (null) slot.
  let slot = 0;
  for (; slot < NUM_SLOTS; slot++) {
    if (this.particles[slot] === null) {
      break;
    }
  }

  if (slot >= NUM_SLOTS) {
    return -1; // asm: fall-through to "mov eax,0xffffffff"
  }

  // Insert + initialize particle header. Offsets come straight from
  // the asm at e819c..e81aa, in the same order.
  this.particles[slot] = particle;   // [edx+ebp*1] = edi
  particle.inUse = 1;                // [edi+0x4] byte = 1
  particle.unknown_dword_8 = 0;      // [edi+0x8] dword = 0  (purpose TBD)
  particle.slotIndex = slot;         // [edi+0x0] dword = esi

  return slot;                       // eax = esi
}
