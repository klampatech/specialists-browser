/**
 * CTSSharedEmitter::KillAll — Zero the entire 4096-byte shared pool.
 *
 * The pool is laid out as two contiguous 2048-byte regions of 32-byte
 * (8-dword) entries, 64 entries per region:
 *   Lower: [this + 0x000 .. this + 0x7ff]
 *   Upper: [this + 0x800 .. this + 0xfff]
 *
 * Total: 64 × 32 × 2 = 4096 bytes (matches the BSS static
 * `s_Emitter` at 0x0018f480, 4096 B — likely a file-static copy
 * that AddEmitter writes through).
 *
 * MSVC codegen merges both clears into a single loop with a shared
 * 0x20-byte stride. The counter `ecx` walks 0, 8, 16, …, 0x1f8
 * (64 iterations; loop exits when `cmp ecx, 0x1ff; jle` fails at
 * 0x200). Each iteration clears 8 dwords at [eax + 0x800 + 0..0x1c]
 * and 8 dwords at [edx + 0..0x1c]; `eax` and `edx` are both
 * initialised to `this` and both advance by 0x20 per iteration.
 *
 * TODO(asm-ambiguous): which region is sharedemitter_s vs
 *   sharedparticle_s — both share the same 8-dword zero-fill shape.
 *   Field layouts will be resolved when AddEmitter / AddParticle are
 *   decoded (separate D.4 sub-tasks).
 *
 * NOTE: `view` is a decompiler abstraction over the class's flat
 *   memory layout. The C++ class has no `view` field; this is a
 *   representational choice so we can address offsets as a
 *   DataView. It will be replaced by direct field accesses once D.4
 *   resolves the class's actual member layout.
 */
export function KillAll(this: { view: DataView }): void {
  for (let i = 0; i < 64; i++) {
    const lo = i * 0x20;            // offset into lower region (edx path)
    const hi = 0x800 + i * 0x20;    // offset into upper region (eax+0x800 path)
    // Per-iteration order swapped vs. asm (asm writes eax+0x800 first,
    // then edx) — no aliasing, so behaviour is identical.
    for (let j = 0; j < 8; j++) {
      this.view.setUint32(lo + j * 4, 0, true); // 32-bit zero store
      this.view.setUint32(hi + j * 4, 0, true); // 32-bit zero store
    }
  }
}
