/**
 * CTSSlowMotionPoint::DeactivateSlow — For each entity currently being slowed
 * by this point, restore its normal scale (1.0) via a per-entity vtable
 * dispatch and null the tracking slot. Then zero the entire 132-byte
 * tracking buffer.
 *
 * @param this  The CTSSlowMotionPoint entity instance
 * @returns     void
 */
export function DeactivateSlow(this: any): void {
  // Per-point tracking layout (inferred from asm offsets + loop bounds):
  //   this+0x60:   4 bytes  -- header / count field (untouched in this fn)
  //   this+0x64: 132 bytes  -- array of 33 entity pointers (33 * 4 = 0x84)
  //
  // TODO(asm-ambiguous): the slot count (33) is inferred from the asm loop
  // counter (init 0, +=3 per iteration, jle 0x20 -> 11 iterations * 3 slots)
  // and cross-checked with the trailing rep stosd length of 0x21 dwords.
  // TODO(asm-ambiguous): the field name `affectedEntities` is an inferred
  // convenience name; the actual C struct field is at offset 0x64 and
  // contains 33 entity pointers (edict_t*).
  const NUM_SLOTS = 33;

  // The compiler unrolls 3 slots per iteration (esi/edi/ebp all walk the
  // same array in lockstep, advancing by 0xc per pass). We just iterate
  // once per slot — the unroll is a perf choice, not behavior.
  for (let i = 0; i < NUM_SLOTS; i++) {
    const ent = this.affectedEntities[i];

    if (ent) {
      // Per-entity dispatch (asm):
      //   edx = *(ent + 0x60)             // per-entity method table
      //   eax = ent
      //   push 0                          // arg3
      //   push 0x3f800000                 // arg2 == 1.0f
      //   push eax                        // arg1 (ent)
      //   call DWORD PTR [edx + 0x14]     // table[5]
      //   then [this->slot] = 0
      //
      // TODO(asm-ambiguous): the meaning of the table at ent+0x60 and the
      // specific target of the call at index 0x14 are engine-specific and
      // not visible in this slice. The (ent, 1.0f, 0) signature strongly
      // suggests "restore normal scale immediately" — likely a SlowMotion-
      // aware SetSpeed / RestoreTimeScale / SetNextThink — but the exact
      // method name is inferred, not confirmed.
      const fn: (self: any, scale: number, delay: number) => void =
        ent[0x60][0x14];
      fn(ent, 1.0, 0);

      // Clear the tracking slot — asm writes 0 to [ebp+0x4] after the call.
      this.affectedEntities[i] = 0;
    }
  }

  // Final memset: 0x21 dwords (132 bytes) of zero starting at this+0x64.
  // Translates to `memset(this+0x64, 0, 132)`. The per-slot clears above
  // already nulled the previously-non-null entries; this catches null-on-
  // entry slots too and ensures the buffer is clean.
  for (let i = 0; i < NUM_SLOTS; i++) {
    this.affectedEntities[i] = 0;
  }
}
