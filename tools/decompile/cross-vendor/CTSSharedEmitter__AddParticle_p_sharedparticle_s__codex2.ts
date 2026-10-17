/**
 * CTSSharedEmitter::AddParticle — register a particle into the emitter's slot table.
 *
 * Linear-scans the 512-entry sharedparticle_s* table at this+0x800 for the
 * first null slot. Stores the particle pointer in that slot, initializes
 * three particle-header fields, and returns the slot index. Returns -1 if
 * particle is null or no free slot exists.
 *
 * Decompiled from ts/dlls/ts_i386.so @ 0x000e8178 (171 B).
 */

// TS-internal types — not part of HLSDK. Stubbed as `any` so this file
// compiles in isolation; real layouts are cross-referenced from disassembly
// in D.5.
type CTSSharedEmitter = any;
type sharedparticle_s = any;

export function AddParticle(
  this: CTSSharedEmitter,
  particle: sharedparticle_s | null,
): number {
  // Asm at e8188/e818d: ecx=0x800, eax=this+0x800; loop body is unrolled 8
  // slots per iteration and bounded at i==0x1ff (signed ≤ 0x1ff, i.e. 512
  // total slots).
  const NUM_SLOTS = 0x200;
  const SLOTS_BASE_OFFSET = 0x800;

  if (particle == null) {
    return -1;
  }

  // Linear scan for the first free (null) slot.
  // Inferred name: TS source likely spells this as `particles` or similar
  // pointer-array field at this+0x800. TODO(asm-ambiguous): confirm in D.4.
  let slot = 0;
  for (; slot < NUM_SLOTS; slot++) {
    if (this[SLOTS_BASE_OFFSET + slot * 4] === 0) {
      break;
    }
  }

  if (slot >= NUM_SLOTS) {
    return -1; // table full (asm: fall-through at e8212, ret -1 at e821a)
  }

  // Insert the particle into the free slot and initialize its header.
  // Field offsets come straight from the asm at e819c..e81aa.
  this[SLOTS_BASE_OFFSET + slot * 4] = particle;

  // Inferred name `inUse`: asm writes byte 1 to [edi+0x4] on insertion — a
  // typical "slot taken" flag for a managed table. TODO(asm-ambiguous):
  // confirm flag semantics in D.4.
  particle._byte_0x4 = 1;

  // asm only: [edi+0x8] = 0 (dword). Purpose unknown — D.4 cross-reference.
  // TODO(asm-ambiguous): likely an age/elapsed counter or a free-list next ptr.
  particle._dword_0x8 = 0;

  // Inferred name `slotIndex`: asm writes the slot index back to [edi+0x0].
  // TODO(asm-ambiguous): confirm this is a back-pointer in D.4.
  particle._dword_0x0 = slot;

  return slot; // asm: eax = esi at e81ac
}
