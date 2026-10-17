/**
 * CTSGroundAmmo::Fall — falling/landing tick for a ground ammo
 * pickup. Decompiled from Fall__13CTSGroundAmmo @ 0x00092d6c
 * (229 B). The high-level behavior is preserved; field names
 * that touch non-standard entvars bits are intentionally left as
 * offset reads until D.4 ties them to the original TS source.
 *
 * @param this  CTSGroundAmmo instance (this in C++)
 */
export function Fall(this: CTSGroundAmmo): void {
  // (1) Schedule the next fall tick.
  // [ebx-0x6f010] is a small float constant (likely the per-tick
  // interval, on the order of 0.1s). TODO(asm-ambiguous): confirm
  // the value via tools/decompile/analysis.
  // [edx+0x104] is being written with `gpGlobals->time + constant`,
  // which is the nextthink write pattern. The exact offset depends
  // on the HL1 entvars layout in the SDK TS was built against.
  this.pev.nextthink = gpGlobals.time + FALL_TICK;

  // (2) Bit-test pev+0x1a0. In standard HL1 entvars_t, offset
  // 0x1a0 sits inside vuser2 (a vec3_t at ~0x19c). The TS build
  // is using vuser2.y as a bitfield — bit 4 (mask 0x10) means
  // "ground contact". TODO(asm-ambiguous): confirm whether TS
  // added explicit TS flag fields or is just abusing vuser2.
  const pevAny = this.pev as any;
  if ((pevAny[0x1a0] & 0x10) !== 0) {
    // Ground case: snap to wall (one-shot, guarded by m_fOnWall),
    // then play landing sound.
    // TODO(asm-ambiguous): m_fOnWall name unverified.
    if (this.m_fOnWall === 0) {
      this.PutOnWall();
    }
    // Sample string at [ebx-0x6c1ba]. TODO(asm-ambiguous): look up
    // in tools/decompile/analysis/strings-n5.txt.
    // cvar_d ([ebx-0x6ec2c]) is a data-segment float, not 0.0;
    // placeholder below pending D.4 lookup.
    EMIT_SOUND_DYN(
      this.pev.pContainingEntity, // pev+0x208
      CHAN_BODY,                 // 6
      "weapons/ammo_fall.wav",   // [ebx-0x6c1ba]
      ATTN_NORM,                 // [ebx-0x6f3fc]
      VOL_NORM,                  // [ebx-0x6e7e4]
      0,                         // fFlags
      PITCH_NORM,                // 100 (0x64)
      0.0                        // TODO(asm-ambiguous): [ebx-0x6ec2c]
    );
  } else if (
    // (3) Floating condition (pev+0x1a5 bit 1) OR already locked
    // to a wall. [pev+0x1a5] is also a vuser2 bit test (likely
    // vuser2.z). TODO(asm-ambiguous): confirm field.
    (pevAny[0x1a5] & 0x2) !== 0 ||
    this.m_fOnWall !== 0
  ) {
    EMIT_SOUND_DYN(
      this.pev.pContainingEntity,
      CHAN_BODY,
      "weapons/ammo_fall.wav",
      ATTN_NORM,
      VOL_NORM,
      0,
      PITCH_NORM,
      0.0 // TODO(asm-ambiguous): [ebx-0x6ec2c]
    );
    // Dampen the tumble: clear pitch and roll, leave yaw alone.
    this.pev.angles.x = 0; // pev+0x50
    this.pev.angles.z = 0; // pev+0x58
  } else {
    // (4) No special state — jump to epilogue, skipping the
    // common tail (no next-think call, no m_fOnWall set).
    return;
  }

  // (5) Common tail. [esi+0x60] is a pointer to some object whose
  // function-pointer field (or vtable slot) at offset 0x114 is
  // called with `this` as its sole argument. Index 0x114/4 = 69
  // is unusually high for a vtable, so this is more likely a
  // function-pointer field. The exact type is unknown — D.4 needs
  // to determine whether it is a CTask, CSchedule, or other TS
  // helper. TODO(asm-ambiguous): name and signature.
  const scheduler = (this as any)[0x60] as any;
  scheduler[0x114](this);
  // Mark on-wall so the PutOnWall snap only runs once.
  this.m_fOnWall = 1;
}
