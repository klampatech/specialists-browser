/**
 * CTSHack::EnableObjective — toggle the hack objective on this entity.
 *
 * Reference: tools/decompile/chunks/EnableObjective__7CTSHackb.chunk.md
 *   (NOT the HLSDK engine↔mod interface — this is a TS gameplay method.)
 *
 * @param this     The CTSHack entity instance
 * @param bEnable  True to enable the objective, false to disable it
 * @returns void
 */
export function EnableObjective(this: any /* TODO(asm-ambiguous): CTSHack */, bEnable: boolean): void {
  // [edi+0x64] = al  — mirror the bool into a 1-byte flag at this+0x64.
  this.m_bObjectiveEnabled = bEnable ? 1 : 0;

  const pev: any = this.pev;

  if (bEnable) {
    // [eax+0x118] &= 0xffffff7f  — clear bit 7.
    // TODO(asm-ambiguous): bit 7 of pev->flags. Cross-reference FL_*
    // in HLSDK + ts_i386.so's flag-bit usage to give this a name.
    pev.flags &= 0xffffff7f;

    // [eax+0x10c] = 4, [eax+0x108] = 7  — visual/animation state.
    // NOTE: the prior decomp had these offsets/values swapped; the
    // disasm is authoritative here.
    pev.field_at_0x10c = 4;
    pev.field_at_0x108 = 7;

    // [eax+0x1a4] |= 0x2000000  — set bit 25 (likely iuser4).
    // TODO(asm-ambiguous): purpose of this TS-specific bit.
    pev.field_at_0x1a4 |= 0x2000000;

    // Engine broadcast via [ebx+0x1aa8] (engine call table) and
    // [ebx+0x1600] (engine state). Resolves to:
    //   arg1 = state[0][0x98/4] + pev.field_at_0xb8
    //   arg2 = pev.field_at_0x208
    //   call state_table[0x8/4](arg1, arg2)
    // TODO(asm-ambiguous): exact engine function — pfnEmit* sound,
    // MESSAGE_BEGIN broadcast, or particle/sprite emit. Without a
    // strings-n5 cross-reference the vtable index can't be pinned.
    const engineCallTable: any = undefined; // [ebx+0x1aa8]
    const engineStatePtr: any = undefined;  // [ebx+0x1600]
    const engineState: any = engineStatePtr ? engineStatePtr[0] : undefined;
    const fnPtr: any = engineState ? engineState[0x98 / 4] : undefined;
    const arg1: any = fnPtr !== undefined ? fnPtr + pev.field_at_0xb8 : undefined;
    const arg2: any = pev.field_at_0x208;
    if (engineCallTable && fnPtr !== undefined) {
      engineCallTable[0x8 / 4](arg1, arg2);
    }

    // Timer:  this+0x6c = [ebx+0x14f0].field_0x8 - [[ebx+0x1600]].field_0x0
    //   (note: the second operand is double-deref'd, not single — esi
    //   holds the pointer, and the asm re-derefs it via `mov edx, [esi]`.)
    // TODO(asm-ambiguous): the two globals are likely an engine time
    // singleton and a player/client entity; the float is a duration
    // or "time-since" value.
    const globalA: any = undefined;    // [ebx+0x14f0]  (entity)
    const globalBPtr: any = undefined;  // [ebx+0x1600]  (ptr to entity)
    const globalB: any = globalBPtr ? globalBPtr[0] : undefined;
    this.m_flTimer = (globalA ? globalA.field_at_0x8 : 0) -
                     (globalB ? globalB.field_at_0x0 : 0);

    // Reset the 3 dword counters at this+0x70, +0x74, +0x78 to zero.
    this.m_iCount1 = 0;
    this.m_iCount2 = 0;
    this.m_iCount3 = 0;
  } else {
    // [eax+0x118] = 0x80  — mark objective inactive.
    // NOTE: this writes 0x80 to the *whole* field, zeroing all other
    // bits (asymmetric vs. the enable path's `&= 0xffffff7f`).
    pev.flags = 0x80;

    // Zero the visual/animation state fields. Order matches the
    // disasm; the fact that they're all 0 is why the prior decomp's
    // offset swap didn't visibly break the disable path.
    pev.field_at_0x10c = 0;
    pev.field_at_0x1a4 = 0;
    pev.field_at_0x108 = 0;

    // Reset timer and counters.
    this.m_flTimer = 0;
    this.m_iCount1 = 0;
    this.m_iCount2 = 0;
    this.m_iCount3 = 0;
  }
}
