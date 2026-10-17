```typescript
/**
 * CTSSharedEmitter::KillAll — Kill all emitters and all particles by zeroing
 * the entire 4096-byte shared pool. The pool is laid out as two contiguous
 * 2048-byte regions of 32-byte (8-dword) entries, 64 entries per region:
 *
 *   Region A: [this + 0x000 .. this + 0x7ff]   (e.g. sharedemitter_s slots)
 *   Region B: [this + 0x800 .. this + 0xfff]   (e.g. sharedparticle_s slots)
 *
 * Total = 64 × 32 × 2 = 4096 bytes, matching the BSS static `s_Emitter`
 * (0x0018f480, 4096 bytes).
 */
export function KillAll(this: any): void {
  // The MSVC codegen merges both regions into a single loop with a shared
  // 0x20-byte stride. The counter `ecx` walks 0, 8, 16, ..., 0x1f8 (64
  // iterations; loop exits when `cmp ecx, 0x1ff; jle` fails). Each
  // iteration clears 8 dwords at [eax + 0x800 + 0..0x1c] and at
  // [edx + 0..0x1c]; `eax` and `edx` are both initialised to `this` and
  // both advance by 0x20 per iteration.
  for (let i = 0; i < 64; i++) {
    const baseA = i * 0x20;          // offset into Region A (emitter slot i)
    const baseB = 0x800 + i * 0x20;  // offset into Region B (particle slot i)
    // TODO(asm-ambiguous): the disassembly of KillAll alone does not label
    //   which region is sharedemitter_s vs sharedparticle_s — both share
    //   the same 8-dword zero-fill shape. Field layouts will be resolved
    //   when AddEmitter / AddParticle are decoded (separate D.4 sub-tasks).
    for (let j = 0; j < 8; j++) {
      this.pool.setUint32(baseA + j * 4, 0, true); // 32-bit zero store
      this.pool.setUint32(baseB + j * 4, 0, true); // 32-bit zero store
    }
  }
}
```
