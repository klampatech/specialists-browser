```typescript
/**
 * CTSTimer::ToggleTimer — toggle the CTSTimer entity active/inactive.
 *
 * Reads m_flWait (offset 0x64). If non-positive the timer is fully reset
 * and the function returns. Otherwise m_bActive (offset 0x68) is flipped.
 * On transitions to active, state dwords m_iStateA/B (offsets 0xc / 0x10)
 * are primed and the next-think time is scheduled as
 * gpGlobals->time + m_flWait into the entity's engine scheduler slot at
 * *(this[0]) + 0x104.
 *
 * @param this  The CTSTimer entity instance.
 */
export function ToggleTimer(this: CTSTimer): void {
  // Configured wait, in seconds. Stored as a 32-bit dword — int-compared
  // for the >0 check, then reinterpreted via fild for the FPU add.
  const wait = this.m_flWait;

  if (wait <= 0) {
    // Non-positive duration: drop state, force inactive.
    this.m_iStateA = 0;
    this.m_iStateB = 0;
    this.m_bActive = false;
    return;
  }

  // XOR with 1 → flip the active flag at offset 0x68.
  this.m_bActive = !this.m_bActive;

  if (!this.m_bActive) {
    // Just transitioned to inactive: clear state.
    this.m_iStateA = 0;
    this.m_iStateB = 0;
    return;
  }

  // Just transitioned to active: prime state dwords.
  this.m_iStateA = 0xffff0000;
  // TODO(asm-ambiguous): identify this GOT+0x1710 global — likely a tracked
  // handle or saved timestamp; resolve via tools/decompile/analysis/strings-n5.txt.
  this.m_iStateB = (engineGlobals as any)[0x1710];

  // Schedule next-think at gpGlobals->time + wait, written into the
  // entity's engine scheduler slot.
  //   edx = *this                  (this[0] — pev-style pointer)
  //   eax = *(*(GOT + 0x1600))     (double-deref → gpGlobals)
  //   FPU: ST(0) = wait + gpGlobals->time
  //   store to *(this[0]) + 0x104.
  // TODO(asm-ambiguous): 0x104 is non-standard for entvars_t (nextthink is
  // normally at 0x0C); most likely pev->fuser4 repurposed by TS as a
  // custom next-think slot — verify against the original C++ source.
  this.pev.fuser4 = (gpGlobals as any).time + wait;
}
```
