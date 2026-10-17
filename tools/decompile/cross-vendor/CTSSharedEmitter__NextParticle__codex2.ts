/**
 * CTSSharedEmitter::NextParticle — find the index of the
 * first null slot in the 512-entry pointer table at
 * `this + 0x800`, or `-1` if all slots are in use.
 *
 * The MSVC compiler unrolls the linear scan 8 slots per
 * iteration; we mirror that in TS for a one-to-one
 * correspondence with the disassembly.
 *
 * @returns Index of the first free slot in [0..511], or -1
 *          if the table is full.
 */
export function NextParticle(this: any): number {
  // TODO(asm-ambiguous): `s_Emitter` matches the BSS symbol
  // at 0x0018f480 (4096 B = 1024 slots), but the asm only
  // scans 512 slots starting at this + 0x800. Reconcile in
  // D.4 when the full CTSSharedEmitter class layout is
  // reconstructed.
  const table = (this as { s_Emitter?: ArrayLike<number> })
    .s_Emitter as ArrayLike<number>;

  for (let base = 0; base < 512; base += 8) {
    if (table[base + 0] === 0) return base + 0;
    if (table[base + 1] === 0) return base + 1;
    if (table[base + 2] === 0) return base + 2;
    if (table[base + 3] === 0) return base + 3;
    if (table[base + 4] === 0) return base + 4;
    if (table[base + 5] === 0) return base + 5;
    if (table[base + 6] === 0) return base + 6;
    if (table[base + 7] === 0) return base + 7;
  }
  return -1;
}
