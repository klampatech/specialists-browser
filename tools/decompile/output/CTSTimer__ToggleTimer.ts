/**
 * CTSTimer::ToggleTimer — toggle the CTSTimer entity active/inactive.
 *
 * Reads m_iWait (offset 0x64, int dword). If non-positive the timer is
 * fully reset and the function returns. Otherwise m_bActive (offset
 * 0x68, byte) is XOR-flipped. On transitions to active, state dwords
 * m_iStateA / m_iStateB (offsets 0xc / 0x10) are primed and the
 * next-think time is scheduled as gpGlobals->time + m_iWait into the
 * entity's engine scheduler slot at pev + 0x104 (controller[0]).
 *
 * @param this  The CTSTimer entity instance.
 */

// ---- Compile-isolated declarations ------------------------------------
// TODO(decompile): replace these with real types once engine bindings land (D.5).
declare const gpGlobals: any;

// GOT + 0x1710 — unknown global (likely a tracked handle or saved timestamp).
// TODO(decompile): resolve via tools/decompile/analysis/strings-n5.txt and
//                  tools/decompile/analysis/nm-D-size.txt.
declare const TS_TIMER_GOT_0x1710: any;

type CTSTimer = any;
// ------------------------------------------------------------------------

export function ToggleTimer(this: CTSTimer): void {
  // Wait duration. Disassembly evidence: `cmp dword ptr [ecx+0x64],0` (signed)
  // followed by `fild dword ptr [ecx+0x64]` — so this is stored as a 32-bit
  // signed int and converted to float just before the FPU add. The original
  // C++ may still have named it `m_flWait`; the binary treats it as int.
  const wait = this.m_iWait;

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
  // Disassembly: `mov edx, DWORD PTR [ebx+0x1710]; mov [ecx+0x10], edx`.
  // ebx is the PIC-computed GOT base, so this reads a *GOT-resident global*,
  // not an offset into any struct. See TS_TIMER_GOT_0x1710 above.
  this.m_iStateB = TS_TIMER_GOT_0x1710;

  // Schedule next-think at gpGlobals->time + wait, written into pev+0x104.
  //   Disassembly:
  //     edx = *this            (this->pev)
  //     eax = *(GOT + 0x1600)  (gpGlobals pointer)
  //     eax = *eax             (gpGlobals->time — first dword)
  //     FPU: ST(0) = wait + gpGlobals->time   (fild + fadd)
  //     fstp [edx+0x104]       (store to pev + 0x104)
  //
  // TODO(decompile): pev + 0x104 is `controller[0]` in standard GoldSrc
  //   entvars_t (controller[4] lives at 0x104..0x114). Standard `nextthink`
  //   is at offset **0x120**, NOT 0x0C — the original review comment had
  //   that wrong. `fuser1..fuser4` aren't standard entvars fields at all,
  //   so writing here is a TS-specific repurposing — verify against the
  //   original C++ source.
  this.pev.controller = (gpGlobals as any).time + wait;
}
