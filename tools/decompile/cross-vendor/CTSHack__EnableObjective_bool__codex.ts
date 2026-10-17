```typescript
/**
 * CTSHack::EnableObjective — toggle the hack objective on this entity.
 *
 * Enabling: clear the inactive flag bit on pev+0x118, set three pev
 * visual/animation fields, OR a high-bit into pev+0x1a4, issue an
 * engine broadcast call, store a computed time-delta in m_flTimer,
 * and reset three dword counters to zero.
 *
 * Disabling: set the inactive flag bit on pev+0x118, zero the three
 * pev fields, and zero the timer + counters.
 *
 * @param this     The CTSHack entity instance (this in the original C++)
 * @param bEnable  True to enable the objective, false to disable it
 * @returns void
 */
export function EnableObjective(this: CTSHack, bEnable: boolean): void {
  // Mirror the bool into a 1-byte flag at this+0x64.
  this.m_bObjectiveEnabled = bEnable ? 1 : 0;

  const pev = this.pev;

  if (bEnable) {
    // Clear bit 7 of pev+0x118 — the "objective inactive" flag.
    pev.field_at_0x118 &= 0xffffff7f;

    // Set visual/animation state fields.
    pev.field_at_0x108 = 4;
    pev.field_at_0x10c = 7;

    // OR 0x2000000 into the high-bit flag at pev+0x1a4.
    pev.field_at_0x1a4 |= 0x2000000;

    // Engine broadcast call:
    //   ecx = [ebx+0x1aa8]                   (engine call table)
    //   esi = [ebx+0x1600]                   (engine state object)
    //   eax = (*esi).vtable[0x98]            (function pointer at idx 0x26)
    //   eax += pev->field_at_0xb8            (in-place offset tweak)
    //   push eax; push pev->field_at_0x208; call [ecx+0x8]
    // TODO(asm-ambiguous): exact call target — likely a pfnEmit* sound
    // or a MESSAGE_BEGIN broadcast. Without the strings-n5 cross-reference
    // the function index can't be pinned.
    engineBroadcastObjective(
      engineState.vtable_entry_at_0x98 + pev.field_at_0xb8,
      pev.field_at_0x208
    );

    // Timer:
    //   eax = [ebx+0x14f0]                   (entity A)
    //   edx = [esi] = [[ebx+0x1600]]         (entity B, deref'd once)
    //   t   = fld [eax+0x8] - fsub [edx]     ; t = A.field - B.field
    //   store t at this+0x6c.
    // TODO(asm-ambiguous): the two globals are presumably entity handles;
    // the resulting float is a time-delta (likely "time since the
    // objective was enabled" or a duration).
    this.m_flTimer =
      entityFromGlobal_0x14f0.field_at_0x8 -
      entityFromGlobal_0x1600.field_at_0x0;

    // Reset the 3 dword counters at this+0x70, +0x74, +0x78 to zero.
    this.m_iCount1 = 0;
    this.m_iCount2 = 0;
    this.m_iCount3 = 0;
  } else {
    // Set bit 7 of pev+0x118 — mark objective inactive.
    pev.field_at_0x118 = 0x80;

    // Clear the visual/animation state fields.
    pev.field_at_0x108 = 0;
    pev.field_at_0x10c = 0;
    pev.field_at_0x1a4 = 0;

    // Reset timer and counters.
    this.m_flTimer = 0;
    this.m_iCount1 = 0;
    this.m_iCount2 = 0;
    this.m_iCount3 = 0;
  }
}
```
